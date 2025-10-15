/**
 * 订单同步云函数 - v3.0
 * 
 * 功能: 将商城订单同步到花园系统
 * - 订单商品 → meals 餐食记录
 * - 计算碳足迹
 * - 更新积分
 * - 更新花园统计
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { orderId } = event;
  
  console.log(`订单同步 - 订单ID: ${orderId}`);
  
  try {
    // 1. 获取订单详情
    const order = await db.collection('orders').doc(orderId).get();
    
    if (!order.data) {
      return {
        code: 404,
        message: '订单不存在'
      };
    }
    
    const orderData = order.data;
    
    // 检查是否已同步
    if (orderData.gardenIntegration?.syncedToGarden) {
      return {
        code: 0,
        message: '订单已同步',
        data: {
          mealId: orderData.gardenIntegration.syncedMealId
        }
      };
    }
    
    // 2. 获取订单商品详情并计算碳足迹
    const ingredients = [];
    let totalCarbon = 0;
    
    for (const item of orderData.items || []) {
      const product = await db.collection('products').doc(item.productId).get();
      
      if (!product.data) continue;
      
      const productData = product.data;
      
      // 如果商品关联了食材
      if (productData.linkedData?.ingredientId) {
        const ingredient = await db.collection('ingredients')
          .doc(productData.linkedData.ingredientId)
          .get();
        
        if (ingredient.data) {
          const itemCarbon = (productData.linkedData.carbonFootprint || 0) * item.quantity;
          
          ingredients.push({
            ingredientId: ingredient.data._id,
            name: ingredient.data.name,
            quantity: item.quantity * (product.data.specs[0]?.weight || 100),
            carbonFootprint: itemCarbon
          });
          
          totalCarbon += itemCarbon;
        }
      } else {
        // 没有关联食材,使用商品名称
        const itemCarbon = (productData.linkedData?.carbonFootprint || 0.5) * item.quantity;
        
        ingredients.push({
          name: productData.name,
          quantity: item.quantity * 100, // 默认100g
          carbonFootprint: itemCarbon
        });
        
        totalCarbon += itemCarbon;
      }
    }
    
    // 3. 计算碳减排 (对比肉食基准)
    const carbonReduction = Math.max(0, 2.5 - totalCarbon); // 基准2.5kg
    
    // 4. 创建 meals 记录
    const mealResult = await db.collection('meals').add({
      data: {
        userId: orderData.userId,
        mealType: determineMealTypeByTime(new Date()),
        mealDate: orderData.createdAt || new Date(),
        ingredients,
        totalCarbonFootprint: totalCarbon,
        carbonReduction,
        source: 'shopping',
        sourceOrderId: orderId,
        isPublic: false,
        createdAt: new Date()
      }
    });
    
    // 5. 计算积分奖励
    const pointsEarned = Math.floor(orderData.totalAmount * 0.1); // 消费10元=1积分
    const carbonPoints = Math.floor(carbonReduction * 10); // 1kg碳减排=10积分
    const totalPoints = pointsEarned + carbonPoints;
    
    // 6. 更新用户积分
    await db.collection('users')
      .doc(orderData.userId)
      .update({
        data: {
          'pointsSystem.shopPoints': _.inc(pointsEarned),
          'pointsSystem.totalPoints': _.inc(totalPoints),
          'stats.totalCarbonReduction': _.inc(carbonReduction),
          updatedAt: new Date()
        }
      });
    
    // 7. 更新 daily_stats
    await updateDailyStats(orderData.userId, orderData.createdAt || new Date(), {
      ordersCount: 1,
      totalSpent: orderData.totalAmount,
      shoppingCarbonFootprint: totalCarbon,
      carbonReduction
    });
    
    // 8. 更新订单状态
    await db.collection('orders')
      .doc(orderId)
      .update({
        data: {
          'gardenIntegration.syncedToGarden': true,
          'gardenIntegration.syncedMealId': mealResult._id,
          'gardenIntegration.carbonReductionEarned': carbonReduction,
          'gardenIntegration.pointsEarned': totalPoints,
          'gardenIntegration.syncedDailyStatsDate': new Date(),
          updatedAt: new Date()
        }
      });
    
    return {
      code: 0,
      message: '订单同步成功',
      data: {
        mealId: mealResult._id,
        carbonReduction,
        pointsEarned: totalPoints,
        breakdown: {
          shopPoints: pointsEarned,
          carbonPoints: carbonPoints
        }
      }
    };
    
  } catch (error) {
    console.error('订单同步失败:', error);
    return {
      code: 500,
      message: '同步失败',
      error: error.message
    };
  }
};

/**
 * 更新每日统计
 */
async function updateDailyStats(userId, date, updates) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  try {
    // 查询是否已有记录
    const existing = await db.collection('daily_stats')
      .where({
        userId,
        date: dayStart
      })
      .get();
    
    if (existing.data.length > 0) {
      // 更新现有记录
      await db.collection('daily_stats')
        .doc(existing.data[0]._id)
        .update({
          data: {
            'shopping.ordersCount': _.inc(updates.ordersCount || 0),
            'shopping.totalSpent': _.inc(updates.totalSpent || 0),
            'shopping.shoppingCarbonFootprint': _.inc(updates.shoppingCarbonFootprint || 0),
            totalCarbonReduction: _.inc(updates.carbonReduction || 0),
            updatedAt: new Date()
          }
        });
    } else {
      // 创建新记录
      await db.collection('daily_stats').add({
        data: {
          userId,
          date: dayStart,
          totalMeals: 0,
          totalCarbonReduction: updates.carbonReduction || 0,
          mealTypes: {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            snack: 0
          },
          shopping: {
            ordersCount: updates.ordersCount || 0,
            totalSpent: updates.totalSpent || 0,
            productsPurchased: 0,
            shoppingCarbonFootprint: updates.shoppingCarbonFootprint || 0,
            totalCarbonFromFood: 0,
            totalCarbonFromShopping: updates.shoppingCarbonFootprint || 0,
            netCarbonReduction: updates.carbonReduction || 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('更新每日统计失败:', error);
  }
}

/**
 * 根据时间判断餐类型
 */
function determineMealTypeByTime(date) {
  const hour = date.getHours();
  
  if (hour >= 6 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

