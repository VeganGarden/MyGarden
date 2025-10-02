const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

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