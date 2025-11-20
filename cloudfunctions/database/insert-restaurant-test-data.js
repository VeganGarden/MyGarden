/**
 * 为"素开心"和"素欢乐"餐厅插入测试数据
 * 
 * 插入内容:
 * 1. 订单数据 (restaurant_orders)
 * 2. 评价数据 (restaurant_reviews)
 * 3. 优惠券数据 (restaurant_campaigns)
 * 4. 行为统计数据 (restaurant_behavior_metrics)
 * 
 * 执行方式:
 * 在云开发控制台调用 database 云函数，action 设置为 "insertRestaurantTestData"
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 插入餐厅测试数据
 * @param {Object} event - 事件对象（可选）
 */
async function insertRestaurantTestData(event = {}) {
  console.log('===== 开始为"素开心"和"素欢乐"餐厅插入测试数据 =====\n');
  
  const results = {
    orders: { sukuaixin: 0, suhuanle: 0 },
    reviews: { sukuaixin: 0, suhuanle: 0 },
    campaigns: { sukuaixin: 0, suhuanle: 0 },
    behaviorMetrics: { sukuaixin: 0, suhuanle: 0 }
  };
  
  try {
    // 1. 查找餐厅
    console.log('[1/4] 查找餐厅...');
    const restaurants = await db.collection('restaurants')
      .where({
        name: _.in(['素开心', '素欢乐'])
      })
      .get();
    
    if (restaurants.data.length === 0) {
      return {
        code: 404,
        message: '未找到"素开心"或"素欢乐"餐厅，请先创建餐厅'
      };
    }
    
    const restaurantMap = {};
    restaurants.data.forEach(r => {
      restaurantMap[r.name] = {
        id: r._id,
        tenantId: r.tenantId,
        name: r.name
      };
      console.log(`  ✓ 找到餐厅: ${r.name} (ID: ${r._id})`);
    });
    
    if (!restaurantMap['素开心'] || !restaurantMap['素欢乐']) {
      return {
        code: 404,
        message: '未找到完整的餐厅信息，请确保"素开心"和"素欢乐"餐厅都已创建'
      };
    }
    
    // 2. 插入订单数据
    console.log('\n[2/4] 插入订单数据...');
    const ordersResult = await insertOrders(restaurantMap);
    results.orders = ordersResult;
    
    // 3. 插入评价数据
    console.log('\n[3/4] 插入评价数据...');
    const reviewsResult = await insertReviews(restaurantMap);
    results.reviews = reviewsResult;
    
    // 4. 插入优惠券数据
    console.log('\n[4/4] 插入优惠券数据...');
    const campaignsResult = await insertCampaigns(restaurantMap);
    results.campaigns = campaignsResult;
    
    // 5. 插入行为统计数据
    console.log('\n[5/5] 插入行为统计数据...');
    const behaviorResult = await insertBehaviorMetrics(restaurantMap);
    results.behaviorMetrics = behaviorResult;
    
    console.log('\n===== 测试数据插入完成 =====\n');
    console.log('插入结果:');
    console.log(`  订单 - 素开心: ${results.orders.sukuaixin} 条, 素欢乐: ${results.orders.suhuanle} 条`);
    console.log(`  评价 - 素开心: ${results.reviews.sukuaixin} 条, 素欢乐: ${results.reviews.suhuanle} 条`);
    console.log(`  优惠券 - 素开心: ${results.campaigns.sukuaixin} 条, 素欢乐: ${results.campaigns.suhuanle} 条`);
    console.log(`  行为统计 - 素开心: ${results.behaviorMetrics.sukuaixin} 条, 素欢乐: ${results.behaviorMetrics.suhuanle} 条`);
    
    return {
      code: 0,
      message: '测试数据插入成功',
      results
    };
    
  } catch (error) {
    console.error('❌ 插入测试数据失败:', error);
    return {
      code: 500,
      message: '插入测试数据失败',
      error: error.message,
      results
    };
  }
}

/**
 * 插入订单数据
 */
async function insertOrders(restaurantMap) {
  const results = { sukuaixin: 0, suhuanle: 0 };
  
  // 生成订单数据
  const orders = [];
  const now = new Date();
  
  // 素开心餐厅订单 (15条)
  for (let i = 1; i <= 15; i++) {
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30)); // 过去30天内
    orderDate.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
    
    const totalAmount = 50 + Math.random() * 150; // 50-200元
    const carbonFootprint = 0.5 + Math.random() * 1.5; // 0.5-2.0 kg CO₂e
    const carbonReduction = 1.0 + Math.random() * 2.0; // 1.0-3.0 kg CO₂e
    
    orders.push({
      orderId: `ORD-SKX-${Date.now()}-${i}`,
      tenantId: restaurantMap['素开心'].tenantId,
      restaurantId: restaurantMap['素开心'].id,
      restaurantName: '素开心',
      userId: `user_${Math.floor(Math.random() * 100)}`,
      userInfo: {
        nickname: `用户${i}`,
        avatar: ''
      },
      orderNo: `SKX${String(i).padStart(4, '0')}`,
      mealType: ['breakfast', 'lunch', 'dinner'][Math.floor(Math.random() * 3)],
      items: [
        {
          menuItemId: `item_${i}_1`,
          menuItemName: ['素开心招牌面', '素炒时蔬', '豆腐汤', '素包子'][Math.floor(Math.random() * 4)],
          quantity: 1 + Math.floor(Math.random() * 3),
          unitPrice: totalAmount / (1 + Math.floor(Math.random() * 3)),
          carbonFootprint: carbonFootprint / 2
        }
      ],
      pricing: {
        subtotal: totalAmount,
        discount: Math.random() * 10,
        total: totalAmount - Math.random() * 10,
        currency: 'CNY'
      },
      carbonImpact: {
        totalCarbonFootprint: carbonFootprint,
        carbonSavingsVsMeat: carbonReduction,
        baselineCarbon: carbonFootprint + carbonReduction,
        impactEquivalent: {
          treesPlanted: carbonReduction * 0.05,
          drivingKmSaved: carbonReduction * 5.4,
          showerMinutesSaved: carbonReduction * 30
        }
      },
      diningDetails: {
        tableNumber: `A${String(Math.floor(Math.random() * 20)).padStart(2, '0')}`,
        numberOfGuests: 1 + Math.floor(Math.random() * 4)
      },
      payment: {
        paymentMethod: ['wechat_pay', 'alipay', 'cash'][Math.floor(Math.random() * 3)],
        paymentStatus: 'paid',
        paidAt: orderDate,
        carbonCreditsUsed: Math.floor(Math.random() * 50)
      },
      gardenSync: {
        isSynced: Math.random() > 0.3,
        syncedAt: Math.random() > 0.3 ? orderDate : null
      },
      status: ['pending', 'processing', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
      createdAt: orderDate,
      completedAt: orderDate,
      region: 'shanghai',
      energyType: 'electric'
    });
  }
  
  // 素欢乐餐厅订单 (12条)
  for (let i = 1; i <= 12; i++) {
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));
    orderDate.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
    
    const totalAmount = 40 + Math.random() * 120;
    const carbonFootprint = 0.4 + Math.random() * 1.2;
    const carbonReduction = 0.8 + Math.random() * 1.8;
    
    orders.push({
      orderId: `ORD-SHL-${Date.now()}-${i}`,
      tenantId: restaurantMap['素欢乐'].tenantId,
      restaurantId: restaurantMap['素欢乐'].id,
      restaurantName: '素欢乐',
      userId: `user_${Math.floor(Math.random() * 100)}`,
      userInfo: {
        nickname: `用户${i + 15}`,
        avatar: ''
      },
      orderNo: `SHL${String(i).padStart(4, '0')}`,
      mealType: ['breakfast', 'lunch', 'dinner'][Math.floor(Math.random() * 3)],
      items: [
        {
          menuItemId: `item_${i + 15}_1`,
          menuItemName: ['素欢乐特色菜', '素炒饭', '素汤', '素饺子'][Math.floor(Math.random() * 4)],
          quantity: 1 + Math.floor(Math.random() * 3),
          unitPrice: totalAmount / (1 + Math.floor(Math.random() * 3)),
          carbonFootprint: carbonFootprint / 2
        }
      ],
      pricing: {
        subtotal: totalAmount,
        discount: Math.random() * 8,
        total: totalAmount - Math.random() * 8,
        currency: 'CNY'
      },
      carbonImpact: {
        totalCarbonFootprint: carbonFootprint,
        carbonSavingsVsMeat: carbonReduction,
        baselineCarbon: carbonFootprint + carbonReduction,
        impactEquivalent: {
          treesPlanted: carbonReduction * 0.05,
          drivingKmSaved: carbonReduction * 5.4,
          showerMinutesSaved: carbonReduction * 30
        }
      },
      diningDetails: {
        tableNumber: `B${String(Math.floor(Math.random() * 15)).padStart(2, '0')}`,
        numberOfGuests: 1 + Math.floor(Math.random() * 4)
      },
      payment: {
        paymentMethod: ['wechat_pay', 'alipay', 'cash'][Math.floor(Math.random() * 3)],
        paymentStatus: 'paid',
        paidAt: orderDate,
        carbonCreditsUsed: Math.floor(Math.random() * 40)
      },
      gardenSync: {
        isSynced: Math.random() > 0.3,
        syncedAt: Math.random() > 0.3 ? orderDate : null
      },
      status: ['pending', 'processing', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
      createdAt: orderDate,
      completedAt: orderDate,
      region: 'shanghai',
      energyType: 'electric'
    });
  }
  
  // 批量插入
  for (const order of orders) {
    try {
      await db.collection('restaurant_orders').add({ data: order });
      if (order.restaurantName === '素开心') {
        results.sukuaixin++;
      } else {
        results.suhuanle++;
      }
      console.log(`  ✓ 插入订单: ${order.orderNo} (${order.restaurantName})`);
    } catch (error) {
      console.error(`  ✗ 插入订单失败: ${order.orderNo}`, error.message);
    }
  }
  
  return results;
}

/**
 * 插入评价数据
 */
async function insertReviews(restaurantMap) {
  const results = { sukuaixin: 0, suhuanle: 0 };
  
  const reviews = [];
  const now = new Date();
  const comments = [
    '菜品很新鲜，味道不错！',
    '低碳环保，支持！',
    '服务态度很好，会再来',
    '素食也能这么好吃，赞！',
    '环境干净整洁，推荐',
    '碳足迹标识很清晰，很有意义',
    '价格合理，性价比高',
    '素食健康，适合长期食用'
  ];
  
  // 素开心餐厅评价 (10条)
  for (let i = 1; i <= 10; i++) {
    const reviewDate = new Date(now);
    reviewDate.setDate(reviewDate.getDate() - Math.floor(Math.random() * 30));
    
    const rating = 3 + Math.floor(Math.random() * 3); // 3-5星
    const carbonSatisfaction = 3 + Math.floor(Math.random() * 2); // 3-5分
    
    reviews.push({
      reviewId: `REV-SKX-${Date.now()}-${i}`,
      tenantId: restaurantMap['素开心'].tenantId,
      restaurantId: restaurantMap['素开心'].id,
      restaurantName: '素开心',
      orderNo: `SKX${String(i).padStart(4, '0')}`,
      userId: `user_${Math.floor(Math.random() * 100)}`,
      customerName: `顾客${i}`,
      rating: rating,
      content: comments[Math.floor(Math.random() * comments.length)],
      carbonSatisfaction: carbonSatisfaction,
      reviewDate: reviewDate,
      reply: Math.random() > 0.5 ? '感谢您的支持，我们会继续努力！' : null,
      replyDate: Math.random() > 0.5 ? reviewDate : null,
      status: 'published',
      createdAt: reviewDate
    });
  }
  
  // 素欢乐餐厅评价 (8条)
  for (let i = 1; i <= 8; i++) {
    const reviewDate = new Date(now);
    reviewDate.setDate(reviewDate.getDate() - Math.floor(Math.random() * 30));
    
    const rating = 3 + Math.floor(Math.random() * 3);
    const carbonSatisfaction = 3 + Math.floor(Math.random() * 2);
    
    reviews.push({
      reviewId: `REV-SHL-${Date.now()}-${i}`,
      tenantId: restaurantMap['素欢乐'].tenantId,
      restaurantId: restaurantMap['素欢乐'].id,
      restaurantName: '素欢乐',
      orderNo: `SHL${String(i).padStart(4, '0')}`,
      userId: `user_${Math.floor(Math.random() * 100)}`,
      customerName: `顾客${i + 10}`,
      rating: rating,
      content: comments[Math.floor(Math.random() * comments.length)],
      carbonSatisfaction: carbonSatisfaction,
      reviewDate: reviewDate,
      reply: Math.random() > 0.5 ? '谢谢您的反馈，我们会改进的！' : null,
      replyDate: Math.random() > 0.5 ? reviewDate : null,
      status: 'published',
      createdAt: reviewDate
    });
  }
  
  // 批量插入
  for (const review of reviews) {
    try {
      await db.collection('restaurant_reviews').add({ data: review });
      if (review.restaurantName === '素开心') {
        results.sukuaixin++;
      } else {
        results.suhuanle++;
      }
      console.log(`  ✓ 插入评价: ${review.reviewId} (${review.restaurantName}, ${review.rating}星)`);
    } catch (error) {
      console.error(`  ✗ 插入评价失败: ${review.reviewId}`, error.message);
    }
  }
  
  return results;
}

/**
 * 插入优惠券数据
 */
async function insertCampaigns(restaurantMap) {
  const results = { sukuaixin: 0, suhuanle: 0 };
  
  const campaigns = [];
  const now = new Date();
  
  // 素开心餐厅优惠券 (5条)
  const sukuaixinCampaigns = [
    { name: '新用户专享', type: 'discount', value: 20, minAmount: 50 },
    { name: '满减优惠', type: 'cash', value: 15, minAmount: 100 },
    { name: '周末特惠', type: 'discount', value: 15, minAmount: 80 },
    { name: '低碳奖励', type: 'cash', value: 10, minAmount: 60 },
    { name: '会员专享', type: 'discount', value: 10, minAmount: 0 }
  ];
  
  sukuaixinCampaigns.forEach((campaign, index) => {
    const validFrom = new Date(now);
    validFrom.setDate(validFrom.getDate() - 10 + index * 5);
    const validTo = new Date(validFrom);
    validTo.setDate(validTo.getDate() + 30);
    
    campaigns.push({
      campaignId: `CAM-SKX-${Date.now()}-${index + 1}`,
      tenantId: restaurantMap['素开心'].tenantId,
      restaurantId: restaurantMap['素开心'].id,
      restaurantName: '素开心',
      name: campaign.name,
      type: campaign.type,
      value: campaign.value,
      minAmount: campaign.minAmount,
      totalCount: 100 + Math.floor(Math.random() * 200),
      usedCount: Math.floor(Math.random() * 50),
      validFrom: validFrom,
      validTo: validTo,
      status: validTo > now ? 'active' : 'expired',
      description: `${campaign.name}优惠券`,
      createdAt: validFrom
    });
  });
  
  // 素欢乐餐厅优惠券 (4条)
  const suhuanleCampaigns = [
    { name: '开业特惠', type: 'discount', value: 25, minAmount: 50 },
    { name: '满减活动', type: 'cash', value: 20, minAmount: 100 },
    { name: '环保奖励', type: 'cash', value: 12, minAmount: 70 },
    { name: '会员折扣', type: 'discount', value: 12, minAmount: 0 }
  ];
  
  suhuanleCampaigns.forEach((campaign, index) => {
    const validFrom = new Date(now);
    validFrom.setDate(validFrom.getDate() - 8 + index * 6);
    const validTo = new Date(validFrom);
    validTo.setDate(validTo.getDate() + 25);
    
    campaigns.push({
      campaignId: `CAM-SHL-${Date.now()}-${index + 1}`,
      tenantId: restaurantMap['素欢乐'].tenantId,
      restaurantId: restaurantMap['素欢乐'].id,
      restaurantName: '素欢乐',
      name: campaign.name,
      type: campaign.type,
      value: campaign.value,
      minAmount: campaign.minAmount,
      totalCount: 80 + Math.floor(Math.random() * 150),
      usedCount: Math.floor(Math.random() * 40),
      validFrom: validFrom,
      validTo: validTo,
      status: validTo > now ? 'active' : 'expired',
      description: `${campaign.name}优惠券`,
      createdAt: validFrom
    });
  });
  
  // 批量插入
  for (const campaign of campaigns) {
    try {
      await db.collection('restaurant_campaigns').add({ data: campaign });
      if (campaign.restaurantName === '素开心') {
        results.sukuaixin++;
      } else {
        results.suhuanle++;
      }
      console.log(`  ✓ 插入优惠券: ${campaign.name} (${campaign.restaurantName})`);
    } catch (error) {
      console.error(`  ✗ 插入优惠券失败: ${campaign.name}`, error.message);
    }
  }
  
  return results;
}

/**
 * 插入行为统计数据
 */
async function insertBehaviorMetrics(restaurantMap) {
  const results = { sukuaixin: 0, suhuanle: 0 };
  
  const metrics = [];
  const now = new Date();
  
  // 为每个餐厅生成过去30天的行为统计数据
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    
    // 素开心餐厅
    const sukuaixinMetric = {
      metricId: `MET-SKX-${date.getTime()}`,
      restaurantId: restaurantMap['素开心'].id,
      restaurantName: '素开心',
      period: 'daily',
      periodValue: date.toISOString().split('T')[0],
      metrics: {
        lowCarbonRatio: 0.65 + Math.random() * 0.15, // 65%-80%
        monthlyCarbonReduction: 1000 + Math.random() * 500, // 1000-1500 kg
        customerLowCarbonChoiceRate: 0.70 + Math.random() * 0.15, // 70%-85%
        behaviorRecordCount: 50 + Math.floor(Math.random() * 50), // 50-100
        totalOrders: 20 + Math.floor(Math.random() * 15), // 20-35
        totalRevenue: 2000 + Math.random() * 1500, // 2000-3500
        avgOrderValue: 80 + Math.random() * 40 // 80-120
      },
      createdAt: date,
      updatedAt: date
    };
    
    // 素欢乐餐厅
    const suhuanleMetric = {
      metricId: `MET-SHL-${date.getTime()}`,
      restaurantId: restaurantMap['素欢乐'].id,
      restaurantName: '素欢乐',
      period: 'daily',
      periodValue: date.toISOString().split('T')[0],
      metrics: {
        lowCarbonRatio: 0.60 + Math.random() * 0.15, // 60%-75%
        monthlyCarbonReduction: 800 + Math.random() * 400, // 800-1200 kg
        customerLowCarbonChoiceRate: 0.65 + Math.random() * 0.15, // 65%-80%
        behaviorRecordCount: 40 + Math.floor(Math.random() * 40), // 40-80
        totalOrders: 15 + Math.floor(Math.random() * 12), // 15-27
        totalRevenue: 1500 + Math.random() * 1200, // 1500-2700
        avgOrderValue: 70 + Math.random() * 35 // 70-105
      },
      createdAt: date,
      updatedAt: date
    };
    
    metrics.push(sukuaixinMetric, suhuanleMetric);
  }
  
  // 批量插入
  for (const metric of metrics) {
    try {
      await db.collection('restaurant_behavior_metrics').add({ data: metric });
      if (metric.restaurantName === '素开心') {
        results.sukuaixin++;
      } else {
        results.suhuanle++;
      }
      if (metric.periodValue === now.toISOString().split('T')[0]) {
        console.log(`  ✓ 插入行为统计: ${metric.restaurantName} (${metric.periodValue})`);
      }
    } catch (error) {
      console.error(`  ✗ 插入行为统计失败: ${metric.metricId}`, error.message);
    }
  }
  
  return results;
}

module.exports = {
  insertRestaurantTestData
};

