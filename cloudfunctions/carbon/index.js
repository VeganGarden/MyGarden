const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 引入高级碳计算器
const CarbonCalculator = require('./carbon-calculator')

const db = cloud.database()
const _ = db.command

// 烹饪方式调整系数（保留，仍在使用）
const COOKING_FACTORS = {
  raw: 1.0,          // 生食
  steamed: 1.1,      // 蒸
  boiled: 1.2,       // 煮
  stir_fried: 1.5,   // 炒
  fried: 2.0,        // 炸
  baked: 1.8         // 烤
}

/**
 * 映射ingredients的category到因子库的subCategory
 */
function mapIngredientCategoryToSubCategory(category) {
  const categoryMap = {
    vegetables: 'vegetable',
    beans: 'bean_product',
    grains: 'grain',
    fruits: 'fruit',
    nuts: 'nut',
    mushrooms: 'mushroom',
    seafood: 'seafood',
    dairy: 'dairy',
    spices: 'spice',
    others: 'other'
  };
  return categoryMap[category] || category || 'other';
}

/**
 * 匹配因子（多级匹配算法）
 * @param {string} inputName - 食材名称
 * @param {string} category - 食材类别（可选）
 * @param {string} region - 地区（默认'national_average'，统一使用新格式）
 * @returns {Promise<Object|null>} 匹配到的因子对象，或null
 */
async function matchFactor(inputName, category, region = 'national_average') {
  if (!inputName) return null;

  // 统一使用新格式（national_average, east_china等）
  const factorRegion = region || 'national_average';

  // Level 1: 精确区域匹配
  let factor = await db.collection('carbon_emission_factors')
    .where({
      name: inputName,
      region: factorRegion,
      status: 'active'
    })
    .get();

  if (factor.data.length > 0) {
    const matched = factor.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return matched;
    }
  }

  // Level 2: 国家级匹配
  factor = await db.collection('carbon_emission_factors')
    .where({
      name: inputName,
      region: 'national_average',
      status: 'active'
    })
    .get();

  if (factor.data.length > 0) {
    const matched = factor.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return matched;
    }
  }

  // Level 3: 别名匹配
  let aliasMatch = await db.collection('carbon_emission_factors')
    .where({
      alias: inputName,
      status: 'active'
    })
    .get();

  if (aliasMatch.data.length > 0) {
    const matched = aliasMatch.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return matched;
    }
  }

  // Level 4: 类别兜底
  if (category) {
    const subCategory = mapIngredientCategoryToSubCategory(category);
    const categoryFactor = await db.collection('carbon_emission_factors')
      .where({
        category: 'ingredient',
        subCategory: subCategory,
        region: _.or(['national_average', factorRegion]),
        status: 'active'
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (categoryFactor.data.length > 0) {
      const matched = categoryFactor.data[0];
      if (matched.factorValue !== null && matched.factorValue !== undefined) {
        return matched;
      }
    }
  }

  return null;
}

/**
 * 碳足迹计算云函数
 */
exports.main = async (event, context) => {
  const { action, data } = event

  try {
    const db = cloud.database()
    const { addAudit } = require('./audit')
    switch (action) {
      case 'calculateMealCarbon':
        // 计算餐食碳足迹
        const carbonResult = await calculateCarbonFootprint(
          data.ingredients, 
          data.cookingMethod,
          data.mealType,      // 餐食类型（可选）
          data.region,        // 地区（可选）
          data.energyType     // 用能方式（可选）
        )
        
        // 计算经验值（基于碳减排量）
        const experience = Math.floor(carbonResult.reduction * 10)
        // 审计
        await addAudit(db, {
          module: 'carbon',
          action: 'calculateMealCarbon',
          resource: 'meal',
          description: '计算餐食碳足迹',
          status: 'success',
          ip: context.requestIp || '',
          userAgent: context.userAgent || '',
        })
        return {
          code: 0,
          data: {
            carbonFootprint: carbonResult.footprint,
            baselineCarbon: carbonResult.baseline,
            carbonReduction: carbonResult.reduction,
            experienceGained: experience,
            details: carbonResult.details
          }
        }

      case 'getUserStats':
        // 获取用户碳足迹统计
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
        
        await addAudit(db, {
          module: 'carbon',
          action: 'getUserStats',
          resource: 'user',
          description: '获取用户碳足迹统计',
          status: 'success',
          ip: context.requestIp || '',
          userAgent: context.userAgent || '',
        })
        return {
          code: 0,
          data: stats
        }

      case 'compareWithMeat':
        // 素食vs肉食对比计算
        {
          const res = await compareWithMeat(event)
          await addAudit(db, {
            module: 'carbon',
            action: 'compareWithMeat',
            resource: 'meal',
            description: '素食与肉食对比计算',
            status: res.code === 0 ? 'success' : 'failed',
          })
          return res
        }

      case 'calculateMealAdvanced':
        // 高级多因子碳排放计算
        {
          const res = await calculateMealAdvanced(event)
          await addAudit(db, {
            module: 'carbon',
            action: 'calculateMealAdvanced',
            resource: 'meal',
            description: '高级多因子碳排放计算',
            status: res.code === 0 ? 'success' : 'failed',
          })
          return res
        }

      case 'getDetailedReport':
        // 获取详细分解报告
        {
          const res = await getDetailedReport(event)
          await addAudit(db, {
            module: 'carbon',
            action: 'getDetailedReport',
            resource: 'report',
            description: '获取碳排放详细报告',
            status: res.code === 0 ? 'success' : 'failed',
          })
          return res
        }

      case 'calculateRecipe':
        // 计算菜谱碳足迹
        {
          const res = await calculateRecipeCarbon(event)
          await addAudit(db, {
            module: 'carbon',
            action: 'calculateRecipe',
            resource: 'recipe',
            description: '计算菜谱碳足迹',
            status: res.code === 0 ? 'success' : 'failed',
          })
          return res
        }

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
 * 查询基准值
 * @param {string} mealType 餐食类型
 * @param {string} region 地区
 * @param {string} energyType 用能方式
 * @returns {Promise<number>} 基准值（kg CO₂e），失败时返回默认值 2.5
 */
async function queryBaseline(mealType, region, energyType) {
  try {
    const baselineResult = await cloud.callFunction({
      name: 'carbon-baseline-query',
      data: {
        mealType: mealType || 'meat_simple',
        region: region || 'national_average',
        energyType: energyType || 'electric'
      }
    })
    
    if (baselineResult.result && baselineResult.result.success) {
      return baselineResult.result.data.carbonFootprint.value
    }
  } catch (error) {
    console.error('基准值查询失败:', error.message)
  }
  
  // 降级到默认值
  return 2.5
}

/**
 * 计算餐食碳足迹
 * @param {Array} ingredients 食材列表
 * @param {string} cookingMethod 烹饪方式
 * @param {string} mealType 餐食类型（可选）
 * @param {string} region 地区（可选）
 * @param {string} energyType 用能方式（可选）
 */
async function calculateCarbonFootprint(ingredients, cookingMethod, mealType, region, energyType) {
  let totalFootprint = 0
  let details = []
  
  // 查询基准碳足迹
  const baselineCarbon = await queryBaseline(mealType, region, energyType)
  
  // 使用因子库查询每个食材的因子
  for (const ingredient of ingredients) {
    const { name, type, category, weight } = ingredient
    let factor = null
    let factorSource = 'not_found'

    // 从因子库查询因子
    try {
      const matchedFactor = await matchFactor(name, category, region || 'national_average')
      if (matchedFactor && matchedFactor.factorValue !== null && matchedFactor.factorValue !== undefined) {
        factor = matchedFactor.factorValue
        factorSource = matchedFactor.matchLevel || 'factor_library'
      }
    } catch (error) {
      console.error(`查询因子失败 ${name}:`, error)
    }

    // 如果因子库中没有找到，使用默认值（向后兼容）
    if (factor === null) {
      // 使用类别默认值（保留向后兼容）
      const defaultFactors = {
        vegetables: { leafy: 0.4, root: 0.3, fruit: 0.5, mushroom: 0.6 },
        beans: { tofu: 1.2, soy_milk: 0.8, tempeh: 1.5 },
        grains: { rice: 1.4, wheat: 1.2, corn: 1.1 }
      }
      factor = defaultFactors[type]?.[category] || 0.5
      factorSource = 'default_fallback'
      console.warn(`因子库中未找到 ${name}，使用默认值: ${factor}`)
    }

    const carbon = factor * (weight / 1000) // 转换为kg
    
    totalFootprint += carbon
    details.push({
      name: name,
      type: type,
      category: category,
      weight: weight,
      carbon: carbon,
      factor: factor,
      factorSource: factorSource
    })
  }
  
  // 应用烹饪方式调整
  const cookingFactor = COOKING_FACTORS[cookingMethod] || 1.0
  totalFootprint *= cookingFactor
  
  // 计算碳减排量（相对于非素食餐食）
  const reduction = baselineCarbon - totalFootprint
  
  return {
    footprint: totalFootprint,
    baseline: baselineCarbon,
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
    // 计算素食餐碳足迹（使用因子库）
    let veganCarbon = 0;
    const veganDetails = [];

    for (const item of veganIngredients) {
      try {
        // 从因子库查询因子
        const factor = await matchFactor(item.name, null, 'CN');
      
        if (factor && factor.factorValue !== null && factor.factorValue !== undefined) {
          const carbon = factor.factorValue * (item.amount / 1000);
        veganCarbon += carbon;
        veganDetails.push({
          name: item.name,
          amount: item.amount,
            carbonFootprint: factor.factorValue,
          carbon: carbon
        });
        } else {
          console.warn(`无法匹配因子: ${item.name}`);
        }
      } catch (error) {
        console.error(`获取食材 ${item.name} 的因子失败:`, error);
      }
    }

    // 计算肉食餐碳足迹（使用因子库）
    let meatCarbon = 0;
    const meatDetails = [];

    for (const item of meatIngredients) {
      try {
        // 从因子库查询因子（优先匹配meat类别）
        let factor = await matchFactor(item.name, 'meat', 'CN');
      
        // 如果没找到，尝试不指定类别
        if (!factor || factor.factorValue === null || factor.factorValue === undefined) {
          factor = await matchFactor(item.name, null, 'CN');
      }
      
        if (factor && factor.factorValue !== null && factor.factorValue !== undefined) {
          const carbon = factor.factorValue * (item.amount / 1000);
        meatCarbon += carbon;
        meatDetails.push({
          name: item.name,
          amount: item.amount,
            carbonFootprint: factor.factorValue,
          carbon: carbon
        });
        } else {
          console.warn(`无法匹配因子: ${item.name}`);
        }
      } catch (error) {
        console.error(`获取食材 ${item.name} 的因子失败:`, error);
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

/**
 * 计算菜谱碳足迹
 * @param {Object} event 包含食材列表的事件
 */
async function calculateRecipeCarbon(event) {
  const { ingredients, cookingMethod } = event.data || event;
  
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return {
      code: 400,
      message: '请提供食材列表'
    };
  }

  const db = cloud.database();
  
  try {
    let totalCarbon = 0;
    const ingredientDetails = [];

    // 遍历食材列表，查询每个食材的碳系数
    for (const ingredient of ingredients) {
      const { ingredientId, quantity, unit } = ingredient;
      
      // 查询食材信息
      const ingredientResult = await db.collection('ingredients')
        .doc(ingredientId)
        .get();

      if (ingredientResult.data) {
        const ingredientData = ingredientResult.data;
        // 获取碳系数（kg CO₂e/kg）
        const carbonCoefficient = ingredientData.carbonCoefficient || 
                                   ingredientData.carbonFootprint || 
                                   1.0; // 默认值
        
        // 转换单位：将数量转换为千克
        let quantityInKg = quantity;
        if (unit === 'g' || unit === '克') {
          quantityInKg = quantity / 1000;
        } else if (unit === 'kg' || unit === '千克') {
          quantityInKg = quantity;
        } else if (unit === 'ml' || unit === '毫升') {
          // 液体类食材，假设密度为1（即1ml = 1g）
          quantityInKg = quantity / 1000;
        } else if (unit === 'l' || unit === '升') {
          quantityInKg = quantity;
        }

        // 计算该食材的碳足迹
        const carbonFootprint = carbonCoefficient * quantityInKg;
        totalCarbon += carbonFootprint;

        ingredientDetails.push({
          ingredientId,
          name: ingredientData.name || '未知食材',
          quantity,
          unit,
          carbonCoefficient,
          carbonFootprint: parseFloat(carbonFootprint.toFixed(4))
        });
      } else {
        // 如果找不到食材，使用默认值
        const defaultCarbonCoefficient = 1.0;
        let quantityInKg = quantity;
        if (unit === 'g' || unit === '克') {
          quantityInKg = quantity / 1000;
        }
        const carbonFootprint = defaultCarbonCoefficient * quantityInKg;
        totalCarbon += carbonFootprint;

        ingredientDetails.push({
          ingredientId,
          name: '未知食材',
          quantity,
          unit,
          carbonCoefficient: defaultCarbonCoefficient,
          carbonFootprint: parseFloat(carbonFootprint.toFixed(4))
        });
      }
    }

    // 应用烹饪方式调整系数
    const cookingFactor = COOKING_FACTORS[cookingMethod] || 1.0;
    totalCarbon *= cookingFactor;

    // 计算碳标签（超低碳/低碳/中碳/高碳）
    // 超低碳：< 0.5 kg CO₂e (🟢 绿色，90-100分)
    // 低碳：0.5 - 1.0 kg CO₂e (🟡 黄色，70-89分)
    // 中碳：1.0 - 2.0 kg CO₂e (🟠 橙色，50-69分)
    // 高碳：> 2.0 kg CO₂e (🔴 红色，0-49分)
    let carbonLabel = 'medium';
    let carbonScore = 0;
    
    if (totalCarbon < 0.5) {
      carbonLabel = 'ultraLow';
      // 超低碳：90-100分，线性映射 0-0.5 kg → 100-90分
      carbonScore = Math.max(90, Math.min(100, Math.round(100 - (totalCarbon / 0.5) * 10)));
    } else if (totalCarbon < 1.0) {
      carbonLabel = 'low';
      // 低碳：70-89分，线性映射 0.5-1.0 kg → 89-70分
      carbonScore = Math.max(70, Math.min(89, Math.round(89 - ((totalCarbon - 0.5) / 0.5) * 19)));
    } else if (totalCarbon <= 2.0) {
      carbonLabel = 'medium';
      // 中碳：50-69分，线性映射 1.0-2.0 kg → 69-50分
      carbonScore = Math.max(50, Math.min(69, Math.round(69 - ((totalCarbon - 1.0) / 1.0) * 19)));
    } else {
      carbonLabel = 'high';
      // 高碳：0-49分，线性映射 2.0+ kg → 49-0分（2.0-4.0 kg范围）
      const excessCarbon = Math.min(totalCarbon - 2.0, 2.0); // 限制在2.0-4.0 kg范围内
      carbonScore = Math.max(0, Math.min(49, Math.round(49 - (excessCarbon / 2.0) * 49)));
    }

    console.log('菜谱碳足迹计算结果:');
    console.log('总碳足迹:', totalCarbon.toFixed(2), 'kg CO₂e');
    console.log('碳标签:', carbonLabel);
    console.log('碳评分:', carbonScore);

    return {
      code: 0,
      data: {
        carbonFootprint: parseFloat(totalCarbon.toFixed(2)),
        carbonLabel: carbonLabel,
        carbonScore: carbonScore,
        cookingFactor: cookingFactor,
        ingredientDetails: ingredientDetails
      }
    };
  } catch (error) {
    console.error('计算菜谱碳足迹失败:', error);
    return {
      code: 500,
      message: '计算菜谱碳足迹失败',
      error: error.message
    };
  }
}