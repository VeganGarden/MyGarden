/**
 * 商品推荐云函数 - v3.0
 * 
 * 功能: 基于用户画像提供精准商品推荐
 * - 体质匹配推荐
 * - 节气推荐
 * - 践行者推荐
 * - 个性化推荐
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { userId, scene = 'home' } = event;
  
  console.log(`商品推荐 - 用户: ${userId}, 场景: ${scene}`);
  
  try {
    // 1. 获取用户完整画像
    const userProfile = await getUserFullProfile(userId);
    
    if (!userProfile) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }
    
    // 2. 生成多维度推荐
    const recommendations = [];
    
    // 维度1: 体质匹配推荐
    if (userProfile.bodyType) {
      const bodyTypeRec = await getBodyTypeRecommendations(userProfile.bodyType);
      if (bodyTypeRec.length > 0) {
        recommendations.push({
          type: 'bodyType',
          title: `适合${userProfile.bodyType}体质`,
          description: `根据您的${userProfile.bodyType}体质特点精心挑选`,
          products: bodyTypeRec,
          priority: 1
        });
      }
    }
    
    // 维度2: 节气推荐
    const currentSolarTerm = getCurrentSolarTerm();
    const solarTermRec = await getSolarTermRecommendations(currentSolarTerm);
    if (solarTermRec.length > 0) {
      recommendations.push({
        type: 'solarTerm',
        title: `${currentSolarTerm}养生推荐`,
        description: `${currentSolarTerm}时节,顺应自然的饮食选择`,
        products: solarTermRec,
        priority: 2
      });
    }
    
    // 维度3: 践行者推荐
    const practitionerRec = await getPractitionerRecommendations();
    if (practitionerRec.length > 0) {
      recommendations.push({
        type: 'practitioner',
        title: '践行者力荐',
        description: '经过10年+素食践行者认证的优质商品',
        products: practitionerRec,
        priority: 3
      });
    }
    
    // 维度4: 个性化推荐 (基于购买历史)
    if (userProfile.purchaseHistory && userProfile.purchaseHistory.length > 0) {
      const personalRec = await getPersonalizedRecommendations(userId, userProfile);
      if (personalRec.length > 0) {
        recommendations.push({
          type: 'personal',
          title: '猜你喜欢',
          description: '根据您的购物偏好推荐',
          products: personalRec,
          priority: 4
        });
      }
    }
    
    // 维度5: 热销推荐
    const hotSales = await getHotSalesRecommendations();
    if (hotSales.length > 0) {
      recommendations.push({
        type: 'hotSales',
        title: '热销榜单',
        description: '大家都在买的优质素食',
        products: hotSales,
        priority: 5
      });
    }
    
    // 3. 按优先级排序
    recommendations.sort((a, b) => a.priority - b.priority);
    
    return {
      code: 0,
      message: '推荐成功',
      data: {
        user: {
          nickname: userProfile.nickname || '用户',
          bodyType: userProfile.bodyType,
          veganType: userProfile.veganType,
          currentSolarTerm
        },
        recommendations,
        totalProducts: recommendations.reduce((sum, r) => sum + r.products.length, 0)
      }
    };
    
  } catch (error) {
    console.error('推荐失败:', error);
    return {
      code: 500,
      message: '推荐失败',
      error: error.message
    };
  }
};

/**
 * 获取用户完整画像
 */
async function getUserFullProfile(userId) {
  try {
    // 获取用户基础信息
    const user = await db.collection('users').doc(userId).get();
    if (!user.data) return null;
    
    // 获取扩展档案
    const profile = await db.collection('user_profiles_extended')
      .where({ userId })
      .get();
    
    // 获取购买历史
    const orders = await db.collection('orders')
      .where({ userId })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    return {
      ...user.data,
      bodyType: profile.data[0]?.tcmProfile?.bodyType || null,
      veganType: user.data.jiuyue?.dietaryNeeds?.veganType || 'unknown',
      purchaseHistory: orders.data || []
    };
  } catch (error) {
    console.error('获取用户画像失败:', error);
    return null;
  }
}

/**
 * 体质匹配推荐
 */
async function getBodyTypeRecommendations(bodyType) {
  try {
    const products = await db.collection('products')
      .where({
        'recommendTags.bodyTypes': bodyType,
        status: 'on_sale'
      })
      .orderBy('salesData.rating', 'desc')
      .limit(10)
      .get();
    
    return products.data || [];
  } catch (error) {
    console.error('体质推荐失败:', error);
    return [];
  }
}

/**
 * 节气推荐
 */
async function getSolarTermRecommendations(solarTerm) {
  try {
    const products = await db.collection('products')
      .where({
        'recommendTags.solarTerms': solarTerm,
        status: 'on_sale'
      })
      .orderBy('salesData.totalSales', 'desc')
      .limit(10)
      .get();
    
    return products.data || [];
  } catch (error) {
    console.error('节气推荐失败:', error);
    return [];
  }
}

/**
 * 践行者推荐
 */
async function getPractitionerRecommendations() {
  try {
    const products = await db.collection('products')
      .where({
        'linkedData.certifiedByPractitioners.0': _.exists(true),
        status: 'on_sale'
      })
      .limit(10)
      .get();
    
    return products.data || [];
  } catch (error) {
    console.error('践行者推荐失败:', error);
    return [];
  }
}

/**
 * 个性化推荐 (基于购买历史)
 */
async function getPersonalizedRecommendations(userId, userProfile) {
  try {
    // 简化版: 基于购买历史的品类推荐
    const topCategories = userProfile.ecommerce?.purchasePreferences?.topCategories || [];
    
    if (topCategories.length === 0) {
      return [];
    }
    
    const products = await db.collection('products')
      .where({
        category: _.in(topCategories),
        status: 'on_sale'
      })
      .orderBy('salesData.rating', 'desc')
      .limit(10)
      .get();
    
    return products.data || [];
  } catch (error) {
    console.error('个性化推荐失败:', error);
    return [];
  }
}

/**
 * 热销推荐
 */
async function getHotSalesRecommendations() {
  try {
    const products = await db.collection('products')
      .where({
        status: 'on_sale'
      })
      .orderBy('salesData.totalSales', 'desc')
      .limit(10)
      .get();
    
    return products.data || [];
  } catch (error) {
    console.error('热销推荐失败:', error);
    return [];
  }
}

/**
 * 获取当前节气
 */
function getCurrentSolarTerm() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // 简化版节气判断 (实际应使用精确算法)
  const solarTerms = [
    { name: '立春', month: 2, day: [3, 5] },
    { name: '雨水', month: 2, day: [18, 20] },
    { name: '惊蛰', month: 3, day: [5, 7] },
    { name: '春分', month: 3, day: [20, 22] },
    { name: '清明', month: 4, day: [4, 6] },
    { name: '谷雨', month: 4, day: [19, 21] },
    { name: '立夏', month: 5, day: [5, 7] },
    { name: '小满', month: 5, day: [20, 22] },
    { name: '芒种', month: 6, day: [5, 7] },
    { name: '夏至', month: 6, day: [21, 22] },
    { name: '小暑', month: 7, day: [6, 8] },
    { name: '大暑', month: 7, day: [22, 24] },
    { name: '立秋', month: 8, day: [7, 9] },
    { name: '处暑', month: 8, day: [22, 24] },
    { name: '白露', month: 9, day: [7, 9] },
    { name: '秋分', month: 9, day: [22, 24] },
    { name: '寒露', month: 10, day: [8, 9] },
    { name: '霜降', month: 10, day: [23, 24] },
    { name: '立冬', month: 11, day: [7, 8] },
    { name: '小雪', month: 11, day: [22, 23] },
    { name: '大雪', month: 12, day: [6, 8] },
    { name: '冬至', month: 12, day: [21, 23] },
    { name: '小寒', month: 1, day: [5, 7] },
    { name: '大寒', month: 1, day: [20, 21] }
  ];
  
  // 找到当前节气
  for (const term of solarTerms) {
    if (term.month === month && day >= term.day[0] && day <= term.day[1]) {
      return term.name;
    }
  }
  
  return '立春'; // 默认返回
}

