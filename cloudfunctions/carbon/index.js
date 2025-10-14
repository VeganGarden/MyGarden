const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 引入高级碳计算器
const CarbonCalculator = require('./carbon-calculator')

// 碳足迹计算系数（kg CO2e/kg 食材）
const CARBON_FACTORS = {
  // 蔬菜类
  vegetables: {
    leafy: 0.4,      // 叶菜类
    root: 0.3,       // 根茎类
    fruit: 0.5,      // 果菜类
    mushroom: 0.6     // 菌菇类
  },
  // 豆制品
  beans: {
    tofu: 1.2,       // 豆腐
    soy_milk: 0.8,   // 豆浆
    tempeh: 1.5      // 天贝
  },
  // 谷物
  grains: {
    rice: 1.4,       // 大米
    wheat: 1.2,      // 小麦
    corn: 1.1        // 玉米
  }
}

// 烹饪方式调整系数
const COOKING_FACTORS = {
  raw: 1.0,          // 生食
  steamed: 1.1,      // 蒸
  boiled: 1.2,       // 煮
  stir_fried: 1.5,   // 炒
  fried: 2.0,        // 炸
  baked: 1.8         // 烤
}

/**
 * 碳足迹计算云函数
 */
exports.main = async (event, context) => {
  const { action, data } = event

  try {
    switch (action) {
      case 'calculateMealCarbon':
        // 计算餐食碳足迹
        const carbonResult = calculateCarbonFootprint(data.ingredients, data.cookingMethod)
        
        // 计算经验值（基于碳减排量）
        const experience = Math.floor(carbonResult.reduction * 10)
        
        return {
          code: 0,
          data: {
            carbonFootprint: carbonResult.footprint,
            carbonReduction: carbonResult.reduction,
            experienceGained: experience,
            details: carbonResult.details
          }
        }

      case 'getUserStats':
        // 获取用户碳足迹统计
        const db = cloud.database()
        const userCollection = db.collection('users')
        const mealCollection = db.collection('meals')
        
        const userResult = await userCollection.doc(data.userId).get()
        if (!userResult.data) {
          return {
            code: 404,
            message: '用户不存在'
          }
        }
        
        // 获取最近30天的餐食记录
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const mealsResult = await mealCollection.where({
          userId: data.userId,
          recordedAt: db.command.gte(thirtyDaysAgo)
        }).orderBy('recordedAt', 'desc').get()
        
        const stats = {
          totalReduction: userResult.data.carbonStats?.totalReduction || 0,
          totalMeals: userResult.data.carbonStats?.totalMeals || 0,
          currentStreak: userResult.data.carbonStats?.currentStreak || 0,
          recentMeals: mealsResult.data,
          monthlyReduction: mealsResult.data.reduce((sum, meal) => sum + meal.carbonReduction, 0)
        }
        
        return {
          code: 0,
          data: stats
        }

      case 'compareWithMeat':
        // 素食vs肉食对比计算
        return await compareWithMeat(event)

      case 'calculateMealAdvanced':
        // 高级多因子碳排放计算
        return await calculateMealAdvanced(event)

      case 'getDetailedReport':
        // 获取详细分解报告
        return await getDetailedReport(event)

      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('碳足迹计算失败:', error)
    return {
      code: 500,
      message: '计算失败，请重试'
    }
  }
}

/**
 * 计算餐食碳足迹
 * @param {Array} ingredients 食材列表
 * @param {string} cookingMethod 烹饪方式
 */
function calculateCarbonFootprint(ingredients, cookingMethod) {
  let totalFootprint = 0
  let details = []
  
  // 计算基准碳足迹（假设非素食餐食的平均碳足迹）
  const baselineCarbon = 2.5 // kg CO2e per meal
  
  ingredients.forEach(ingredient => {
    const { type, category, weight } = ingredient
    const factor = CARBON_FACTORS[type]?.[category] || 0.5
    const carbon = factor * (weight / 1000) // 转换为kg
    
    totalFootprint += carbon
    details.push({
      name: ingredient.name,
      type: type,
      category: category,
      weight: weight,
      carbon: carbon
    })
  })
  
  // 应用烹饪方式调整
  const cookingFactor = COOKING_FACTORS[cookingMethod] || 1.0
  totalFootprint *= cookingFactor
  
  // 计算碳减排量（相对于非素食餐食）
  const reduction = baselineCarbon - totalFootprint
  
  return {
    footprint: totalFootprint,
    reduction: Math.max(0, reduction), // 确保不为负数
    details: details
  }
}

/**
 * 素食vs肉食对比计算
 * @param {Object} event 包含素食餐和肉食餐的数据
 */
async function compareWithMeat(event) {
  const { veganIngredients, meatIngredients, cookingMethod } = event;

  if (!veganIngredients || !meatIngredients) {
    return {
      code: 400,
      message: '请提供素食餐和肉食餐的食材列表'
    };
  }

  const db = cloud.database();

  try {
    // 计算素食餐碳足迹
    let veganCarbon = 0;
    const veganDetails = [];

    for (const item of veganIngredients) {
      const ingredient = await db.collection('ingredients')
        .where({ name: item.name })
        .get();
      
      if (ingredient.data.length > 0) {
        const carbon = ingredient.data[0].carbonFootprint * (item.amount / 1000);
        veganCarbon += carbon;
        veganDetails.push({
          name: item.name,
          amount: item.amount,
          carbonFootprint: ingredient.data[0].carbonFootprint,
          carbon: carbon
        });
      }
    }

    // 计算肉食餐碳足迹
    let meatCarbon = 0;
    const meatDetails = [];

    for (const item of meatIngredients) {
      // 先查询肉类数据库
      let product = await db.collection('meat_products')
        .where({ name: item.name })
        .get();
      
      // 如果肉类库没有，查ingredients（可能是蛋奶类）
      if (product.data.length === 0) {
        product = await db.collection('ingredients')
          .where({ name: item.name })
          .get();
      }
      
      if (product.data.length > 0) {
        const carbon = product.data[0].carbonFootprint * (item.amount / 1000);
        meatCarbon += carbon;
        meatDetails.push({
          name: item.name,
          amount: item.amount,
          carbonFootprint: product.data[0].carbonFootprint,
          carbon: carbon
        });
      }
    }

    // 应用烹饪方式调整
    const cookingFactor = COOKING_FACTORS[cookingMethod] || 1.0;
    veganCarbon *= cookingFactor;
    meatCarbon *= cookingFactor;

    // 计算减排量
    const reduction = meatCarbon - veganCarbon;
    const reductionPercent = meatCarbon > 0 ? (reduction / meatCarbon * 100) : 0;

    // 计算等效说明
    const equivalents = calculateEquivalents(reduction);

    console.log('对比计算结果:');
    console.log('素食餐碳足迹:', veganCarbon.toFixed(2), 'kg');
    console.log('肉食餐碳足迹:', meatCarbon.toFixed(2), 'kg');
    console.log('减排量:', reduction.toFixed(2), 'kg');
    console.log('减排比例:', reductionPercent.toFixed(1), '%');

    return {
      code: 0,
      data: {
        veganMeal: {
          carbon: parseFloat(veganCarbon.toFixed(2)),
          details: veganDetails
        },
        meatMeal: {
          carbon: parseFloat(meatCarbon.toFixed(2)),
          details: meatDetails
        },
        comparison: {
          reduction: parseFloat(reduction.toFixed(2)),
          reductionPercent: parseFloat(reductionPercent.toFixed(1)),
          equivalents: equivalents
        }
      }
    };

  } catch (error) {
    console.error('对比计算失败:', error);
    return {
      code: 500,
      message: '对比计算失败',
      error: error.message
    };
  }
}

/**
 * 计算碳减排的等效说明
 * @param {number} carbonKg 减排的碳量（kg）
 */
function calculateEquivalents(carbonKg) {
  return {
    trees: parseFloat((carbonKg / 21).toFixed(2)),  // 1棵树年吸收约21kg CO₂
    treeDesc: `种植${(carbonKg / 21).toFixed(1)}棵树一年的吸碳量`,
    
    driving: parseFloat((carbonKg * 4.2).toFixed(1)),  // 1升汽油排放约2.3kg，行驶约10km
    drivingDesc: `少开车${(carbonKg * 4.2).toFixed(0)}公里`,
    
    electricity: parseFloat((carbonKg / 0.785).toFixed(0)),  // 1度电约0.785kg CO₂
    electricityDesc: `节约${(carbonKg / 0.785).toFixed(0)}度电`,
    
    plastic: parseFloat((carbonKg / 6).toFixed(1)),  // 1kg塑料约6kg CO₂
    plasticDesc: `少用${(carbonKg / 6).toFixed(1)}kg塑料`
  };
}

/**
 * 高级多因子碳排放计算
 * @param {Object} event 餐食数据
 */
async function calculateMealAdvanced(event) {
  const {
    ingredients,
    cookingMethod = '炒',
    mealDate,
    userLocation = 'domestic',
    mealType = '素食简餐'
  } = event;

  if (!ingredients || ingredients.length === 0) {
    return {
      code: 400,
      message: '请提供食材列表'
    };
  }

  const db = cloud.database();
  const calculator = new CarbonCalculator();

  try {
    // 查询食材详细信息
    const enrichedIngredients = [];

    for (const item of ingredients) {
      const ingredientResult = await db.collection('ingredients')
        .where({ name: item.name })
        .limit(1)
        .get();

      if (ingredientResult.data.length > 0) {
        const ingredientData = ingredientResult.data[0];
        enrichedIngredients.push({
          name: item.name,
          amount: item.amount || 100,
          carbonFootprint: ingredientData.carbonFootprint,
          origin: item.origin || 'domestic',
          preservation: item.preservation || 'fresh'
        });
      } else {
        // 如果找不到食材，使用默认值
        enrichedIngredients.push({
          name: item.name,
          amount: item.amount || 100,
          carbonFootprint: 1.0,
          origin: 'domestic',
          preservation: 'fresh'
        });
      }
    }

    // 执行高级计算
    const calculationResult = calculator.calculateAdvanced({
      ingredients: enrichedIngredients,
      cookingMethod,
      mealDate: mealDate ? new Date(mealDate) : new Date(),
      userLocation,
      mealType
    });

    // 生成详细报告
    const report = calculator.generateReport(calculationResult);

    // 计算等效说明
    const equivalents = calculator.calculateEquivalents(calculationResult.totalCarbon);

    console.log('高级计算完成:');
    console.log('总碳足迹:', calculationResult.totalCarbon, 'kg');
    console.log('详细分解:', calculationResult.breakdown);

    return {
      code: 0,
      data: {
        totalCarbon: calculationResult.totalCarbon,
        breakdown: calculationResult.breakdown,
        ingredients: calculationResult.ingredients,
        vsBaseline: calculationResult.vsBaseline,
        tips: calculationResult.tips,
        savingsPotential: report.savingsPotential,
        equivalents,
        cookingMethod: calculationResult.cookingMethod
      }
    };

  } catch (error) {
    console.error('高级计算失败:', error);
    return {
      code: 500,
      message: '计算失败',
      error: error.message
    };
  }
}

/**
 * 获取详细分解报告
 * @param {Object} event 包含计算结果的事件
 */
async function getDetailedReport(event) {
  const { totalCarbon, breakdown, vsBaseline, tips, cookingMethod } = event;

  if (!totalCarbon) {
    return {
      code: 400,
      message: '请提供计算结果'
    };
  }

  const calculator = new CarbonCalculator();

  try {
    const report = calculator.generateReport({
      totalCarbon,
      breakdown,
      vsBaseline,
      tips,
      cookingMethod
    });

    return {
      code: 0,
      data: report
    };

  } catch (error) {
    console.error('生成报告失败:', error);
    return {
      code: 500,
      message: '生成报告失败',
      error: error.message
    };
  }
}