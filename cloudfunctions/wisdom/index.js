const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 智慧相关云函数
 * 
 * Actions:
 * - getQuotes: 获取智慧语录
 * - getTcmWisdom: 获取中医智慧
 * - getBodyTypeGuidance: 获取体质饮食指南
 * - getSolarTermGuidance: 获取节气饮食指南
 * - getTherapyPlan: 获取食疗方案
 * - testBodyType: 体质测试
 */

exports.main = async (event, context) => {
  const { action, ...params } = event;
  
  try {
    switch (action) {
      case 'getQuotes':
        return await getQuotes(params);
      
      case 'getTcmWisdom':
        return await getTcmWisdom(params);
      
      case 'getBodyTypeGuidance':
        return await getBodyTypeGuidance(params);
      
      case 'getSolarTermGuidance':
        return await getSolarTermGuidance(params);
      
      case 'getTherapyPlan':
        return await getTherapyPlan(params);
      
      case 'testBodyType':
        return await testBodyType(params);
      
      case 'getDailyWisdom':
        return await getDailyWisdom(params);
      
      default:
        return {
          code: 400,
          message: '无效的action参数'
        };
    }
  } catch (error) {
    console.error('智慧云函数错误:', error);
    return {
      code: 500,
      message: '服务器错误',
      error: error.message
    };
  }
};

/**
 * 获取智慧语录
 */
async function getQuotes(params) {
  const {
    category = null,
    featured = null,
    page = 1,
    pageSize = 20
  } = params;
  
  try {
    let query = db.collection('wisdom_quotes')
      .where({ status: 'active' });
    
    if (category) {
      query = query.where({ category });
    }
    
    if (featured !== null) {
      query = query.where({ featured });
    }
    
    // 按点赞数排序
    const skip = (page - 1) * pageSize;
    const result = await query
      .orderBy('likes', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    // 补充践行者信息
    for (let quote of result.data) {
      const practitioner = await db.collection('practitioners')
        .doc(quote.practitionerId)
        .field({
          'profile.realName': true,
          'profile.avatar': true,
          'veganJourney.veganYears': true
        })
        .get();
      
      if (practitioner.data) {
        quote.practitionerInfo = practitioner.data;
      }
    }
    
    const countResult = await query.count();
    
    return {
      code: 0,
      data: {
        list: result.data,
        total: countResult.total,
        page,
        pageSize
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 获取体质饮食指南
 */
async function getBodyTypeGuidance(params) {
  const { bodyType } = params;
  
  if (!bodyType) {
    return { code: 400, message: '缺少bodyType参数' };
  }
  
  try {
    const result = await db.collection('tcm_wisdom')
      .where({
        wisdomType: 'body_type',
        'bodyType.type': bodyType,
        status: 'active'
      })
      .get();
    
    if (result.data.length === 0) {
      return { code: 404, message: '未找到该体质的指南' };
    }
    
    const wisdom = result.data[0];
    
    // 补充推荐食材的详细信息
    const recommendedIngredients = [];
    for (let item of wisdom.bodyType.dietGuidance.recommended) {
      const ingredient = await db.collection('ingredients')
        .doc(item.ingredientId)
        .field({
          name: true,
          carbonFootprint: true,
          'nutrition.protein': true
        })
        .get();
      
      if (ingredient.data) {
        recommendedIngredients.push({
          ...ingredient.data,
          reason: item.reason,
          frequency: item.frequency
        });
      }
    }
    
    // 补充推荐食谱
    const recommendedRecipes = [];
    for (let recipeId of wisdom.bodyType.dietGuidance.recommendedRecipes) {
      const recipe = await db.collection('recipes')
        .doc(recipeId)
        .field({
          name: true,
          difficulty: true,
          totalTime: true
        })
        .get();
      
      if (recipe.data) {
        recommendedRecipes.push(recipe.data);
      }
    }
    
    return {
      code: 0,
      data: {
        bodyType: wisdom.bodyType,
        recommendedIngredients,
        recommendedRecipes
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 获取节气饮食指南
 */
async function getSolarTermGuidance(params) {
  const { solarTerm = null } = params;
  
  try {
    // 如果没有指定节气，获取当前节气
    const currentTerm = solarTerm || getCurrentSolarTerm();
    
    const result = await db.collection('tcm_wisdom')
      .where({
        wisdomType: 'season',
        'solarTerm.term': currentTerm,
        status: 'active'
      })
      .get();
    
    if (result.data.length === 0) {
      return {
        code: 404,
        message: '未找到该节气的指南',
        tip: '数据正在完善中'
      };
    }
    
    const wisdom = result.data[0];
    
    // 补充应季食材详情
    const seasonalIngredients = [];
    for (let item of wisdom.solarTerm.dietGuidance.seasonalIngredients) {
      const ingredient = await db.collection('ingredients')
        .doc(item.ingredientId)
        .field({
          name: true,
          carbonFootprint: true
        })
        .get();
      
      if (ingredient.data) {
        seasonalIngredients.push({
          ...ingredient.data,
          reason: item.reason,
          carbonBenefit: item.carbonBenefit
        });
      }
    }
    
    return {
      code: 0,
      data: {
        solarTerm: wisdom.solarTerm,
        seasonalIngredients
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 获取食疗方案
 */
async function getTherapyPlan(params) {
  const { symptom } = params;
  
  if (!symptom) {
    return { code: 400, message: '缺少symptom参数' };
  }
  
  try {
    const result = await db.collection('tcm_wisdom')
      .where({
        wisdomType: 'therapy',
        'therapy.symptom': symptom,
        status: 'active'
      })
      .get();
    
    if (result.data.length === 0) {
      return {
        code: 404,
        message: '未找到该症状的食疗方案',
        tip: '建议咨询医生'
      };
    }
    
    const wisdom = result.data[0];
    
    // 补充食谱详情
    const therapyRecipes = [];
    for (let plan of wisdom.therapy.therapyPlan) {
      const recipe = await db.collection('recipes')
        .doc(plan.recipeId)
        .field({
          name: true,
          ingredients: true,
          cookingSteps: true
        })
        .get();
      
      if (recipe.data) {
        therapyRecipes.push({
          ...recipe.data,
          principle: plan.principle,
          frequency: plan.frequency,
          expectedEffect: plan.expectedEffect
        });
      }
    }
    
    return {
      code: 0,
      data: {
        symptom: wisdom.therapy.symptom,
        category: wisdom.therapy.category,
        therapyRecipes,
        realCases: wisdom.therapy.realCases,
        warnings: wisdom.therapy.warnings,
        disclaimer: wisdom.therapy.disclaimer
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 体质测试（简化版）
 */
async function testBodyType(params) {
  const { answers } = params;
  
  if (!answers || !Array.isArray(answers)) {
    return { code: 400, message: '缺少答案数据' };
  }
  
  // 简化的体质评分算法
  const scores = {
    '阳虚': 0,
    '阴虚': 0,
    '气虚': 0,
    '痰湿': 0,
    '湿热': 0,
    '血瘀': 0,
    '气郁': 0,
    '特禀': 0,
    '平和': 0
  };
  
  // 根据答案计算得分（这里需要实际的测试题和算法）
  // 简化示例
  answers.forEach(answer => {
    if (answer.bodyType) {
      scores[answer.bodyType] += answer.score || 1;
    }
  });
  
  // 找出得分最高的体质
  let maxScore = 0;
  let primaryBodyType = '平和';
  
  for (let [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      primaryBodyType = type;
    }
  }
  
  return {
    code: 0,
    data: {
      primaryBodyType,
      scores,
      testDate: new Date(),
      testVersion: '1.0',
      recommendation: `您的体质类型是${primaryBodyType}，建议查看对应的饮食指南。`
    }
  };
}

/**
 * 获取每日智慧（随机推送）
 */
async function getDailyWisdom(params) {
  try {
    // 随机获取一条精选语录
    const result = await db.collection('wisdom_quotes')
      .where({
        status: 'active',
        featured: true
      })
      .get();
    
    if (result.data.length === 0) {
      return { code: 404, message: '暂无智慧语录' };
    }
    
    // 随机选一条
    const randomIndex = Math.floor(Math.random() * result.data.length);
    const quote = result.data[randomIndex];
    
    // 补充践行者信息
    const practitioner = await db.collection('practitioners')
      .doc(quote.practitionerId)
      .field({
        'profile.realName': true,
        'profile.avatar': true,
        'veganJourney.veganYears': true
      })
      .get();
    
    return {
      code: 0,
      data: {
        ...quote,
        practitionerInfo: practitioner.data
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 获取当前节气（简化版）
 */
function getCurrentSolarTerm() {
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();
  
  // 简化映射（实际需要精确计算）
  if (month === 2 && day >= 3 && day <= 5) return '立春';
  if (month === 2 && day >= 18 && day <= 20) return '雨水';
  // ... 其他节气
  
  return '立春';  // 默认返回
}

