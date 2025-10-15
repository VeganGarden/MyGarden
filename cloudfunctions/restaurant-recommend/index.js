/**
 * 气候餐厅智能推荐云函数
 * 
 * 功能:
 * 1. 基于用户体质推荐餐厅和菜品
 * 2. 基于当前节气推荐时令菜品
 * 3. 基于用户位置推荐附近餐厅
 * 4. 基于碳减排目标推荐低碳菜品
 * 5. 践行者认证餐厅优先推荐
 * 
 * 调用方式:
 * tcb fn invoke restaurant-recommend --params '{"userId":"xxx","scene":"nearby","latitude":30.27,"longitude":120.15}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { userId, scene = 'nearby', latitude, longitude } = event;
  
  try {
    console.log(`开始推荐餐厅 - 场景: ${scene}, 用户: ${userId}`);
    
    // 1. 获取用户信息
    let userProfile = null;
    if (userId) {
      const userRes = await db.collection('users').doc(userId).get();
      if (userRes.data) {
        userProfile = userRes.data;
      }
      
      // 获取用户扩展档案(体质信息)
      const profileRes = await db.collection('user_profiles_extended')
        .where({ userId })
        .get();
      if (profileRes.data.length > 0) {
        userProfile.extendedProfile = profileRes.data[0];
      }
    }
    
    // 2. 根据场景推荐
    let recommendations = [];
    
    switch (scene) {
      case 'nearby':
        recommendations = await recommendNearby(latitude, longitude, userProfile);
        break;
      case 'body_type':
        recommendations = await recommendByBodyType(userProfile);
        break;
      case 'solar_term':
        recommendations = await recommendBySolarTerm(userProfile);
        break;
      case 'low_carbon':
        recommendations = await recommendLowCarbon(userProfile);
        break;
      case 'practitioner':
        recommendations = await recommendByPractitioner(userProfile);
        break;
      default:
        recommendations = await recommendDefault(userProfile);
    }
    
    return {
      code: 0,
      message: '推荐成功',
      data: {
        scene,
        recommendations,
        totalCount: recommendations.length
      }
    };
    
  } catch (error) {
    console.error('❌ 推荐失败:', error);
    return {
      code: 500,
      message: '推荐失败',
      error: error.message
    };
  }
};

/**
 * 附近餐厅推荐
 */
async function recommendNearby(latitude, longitude, userProfile) {
  // 获取所有活跃餐厅
  const restaurantsRes = await db.collection('restaurants')
    .where({
      status: 'active',
      'climateCertification.isCertified': true
    })
    .orderBy('ratings.overallRating', 'desc')
    .limit(10)
    .get();
  
  return restaurantsRes.data.map(r => ({
    type: 'restaurant',
    restaurantId: r.restaurantId,
    name: r.name,
    category: r.category,
    certificationLevel: r.climateCertification.certificationLevel,
    rating: r.ratings.overallRating,
    carbonCommitment: r.ratings.carbonCommitment,
    avgPrice: r.business.avgPricePerPerson,
    distance: calculateDistance(latitude, longitude, 
      r.location.coordinates.latitude, 
      r.location.coordinates.longitude),
    recommendReason: `${getLevelName(r.climateCertification.certificationLevel)}气候餐厅`,
    score: r.ratings.overallRating * 20  // 转为100分制
  }));
}

/**
 * 基于体质推荐菜品
 */
async function recommendByBodyType(userProfile) {
  if (!userProfile?.extendedProfile?.bodyType) {
    return [];
  }
  
  const bodyType = userProfile.extendedProfile.bodyType;
  
  const menuItemsRes = await db.collection('restaurant_menu_items')
    .where({
      'tags.suitableBodyTypes': bodyType,
      status: 'available'
    })
    .orderBy('salesData.rating', 'desc')
    .limit(10)
    .get();
  
  return menuItemsRes.data.map(item => ({
    type: 'menu_item',
    menuItemId: item.menuItemId,
    restaurantId: item.restaurantId,
    name: item.name,
    price: item.price,
    carbonLabel: item.carbonData.carbonLabel,
    carbonScore: item.carbonData.carbonScore,
    rating: item.salesData.rating,
    recommendReason: `适合${bodyType}体质`,
    score: item.carbonData.carbonScore
  }));
}

/**
 * 基于节气推荐
 */
async function recommendBySolarTerm(userProfile) {
  // 获取当前节气 (简化版)
  const currentSolarTerm = getCurrentSolarTerm();
  
  const menuItemsRes = await db.collection('restaurant_menu_items')
    .where({
      'tags.solarTerms': currentSolarTerm,
      status: 'available'
    })
    .orderBy('carbonData.carbonScore', 'desc')
    .limit(10)
    .get();
  
  return menuItemsRes.data.map(item => ({
    type: 'menu_item',
    menuItemId: item.menuItemId,
    restaurantId: item.restaurantId,
    name: item.name,
    price: item.price,
    carbonLabel: item.carbonData.carbonLabel,
    carbonScore: item.carbonData.carbonScore,
    recommendReason: `${currentSolarTerm}时令推荐`,
    score: item.carbonData.carbonScore
  }));
}

/**
 * 低碳菜品推荐
 */
async function recommendLowCarbon(userProfile) {
  const menuItemsRes = await db.collection('restaurant_menu_items')
    .where({
      'carbonData.carbonLabel': _.in(['ultra_low', 'low']),
      status: 'available'
    })
    .orderBy('carbonData.carbonScore', 'desc')
    .limit(10)
    .get();
  
  return menuItemsRes.data.map(item => ({
    type: 'menu_item',
    menuItemId: item.menuItemId,
    restaurantId: item.restaurantId,
    name: item.name,
    price: item.price,
    carbonFootprint: item.carbonData.carbonFootprint,
    carbonSavings: item.carbonData.comparedToMeat.carbonSavings,
    carbonLabel: item.carbonData.carbonLabel,
    recommendReason: `相比肉类减排${item.carbonData.comparedToMeat.savingsPercent.toFixed(0)}%`,
    score: item.carbonData.carbonScore
  }));
}

/**
 * 践行者推荐
 */
async function recommendByPractitioner(userProfile) {
  const menuItemsRes = await db.collection('restaurant_menu_items')
    .where({
      'practitionerEndorsement.isPractitionerPick': true,
      status: 'available'
    })
    .orderBy('salesData.rating', 'desc')
    .limit(10)
    .get();
  
  return menuItemsRes.data.map(item => ({
    type: 'menu_item',
    menuItemId: item.menuItemId,
    restaurantId: item.restaurantId,
    name: item.name,
    price: item.price,
    carbonLabel: item.carbonData.carbonLabel,
    practitionerName: item.practitionerEndorsement.endorsements[0]?.practitionerName,
    endorsement: item.practitionerEndorsement.endorsements[0]?.endorsementText,
    recommendReason: '践行者认证推荐',
    score: item.salesData.rating * 20
  }));
}

/**
 * 默认推荐
 */
async function recommendDefault(userProfile) {
  // 综合推荐: 高评分 + 低碳 + 气候餐厅认证
  const restaurantsRes = await db.collection('restaurants')
    .where({
      status: 'active',
      'climateCertification.isCertified': true,
      'climateCertification.certificationLevel': _.in(['gold', 'diamond'])
    })
    .orderBy('ratings.overallRating', 'desc')
    .limit(5)
    .get();
  
  return restaurantsRes.data.map(r => ({
    type: 'restaurant',
    restaurantId: r.restaurantId,
    name: r.name,
    certificationLevel: r.climateCertification.certificationLevel,
    rating: r.ratings.overallRating,
    carbonImpact: r.carbonImpact.totalCarbonReduction,
    avgPrice: r.business.avgPricePerPerson,
    recommendReason: '高评分气候餐厅',
    score: r.ratings.overallRating * 20
  }));
}

// ==================== 辅助函数 ====================

/**
 * 计算距离 (简化版)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371; // 地球半径 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 保留1位小数
}

/**
 * 获取当前节气 (简化版)
 */
function getCurrentSolarTerm() {
  const month = new Date().getMonth() + 1;
  const date = new Date().getDate();
  
  // 简化映射
  if (month === 10 && date >= 8 && date <= 23) return '寒露';
  if (month === 10 && date >= 24) return '霜降';
  if (month === 11 && date <= 7) return '霜降';
  if (month === 11 && date >= 8 && date <= 22) return '立冬';
  
  return '寒露'; // 默认
}

/**
 * 获取认证等级名称
 */
function getLevelName(level) {
  const map = {
    'bronze': '铜牌',
    'silver': '银牌',
    'gold': '金牌',
    'diamond': '钻石'
  };
  return map[level] || '';
}

