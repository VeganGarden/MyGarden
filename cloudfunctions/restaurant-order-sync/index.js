/**
 * 餐厅订单同步到花园云函数
 * 
 * 功能:
 * 1. 将餐厅订单转换为 meals 记录
 * 2. 计算碳减排量
 * 3. 更新碳积分账户
 * 4. 更新 daily_stats
 * 5. 浇灌虚拟植物
 * 
 * 调用方式:
 * tcb fn invoke restaurant-order-sync --params '{"orderId":"RO-xxx"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { orderId } = event;
  
  if (!orderId) {
    return {
      code: 400,
      message: '缺少订单ID参数'
    };
  }
  
  try {
    console.log(`开始处理餐厅订单: ${orderId}`);
    
    // 1. 获取订单信息
    const orderRes = await db.collection('restaurant_orders')
      .where({ orderId })
      .get();
    
    if (orderRes.data.length === 0) {
      return {
        code: 404,
        message: '订单不存在'
      };
    }
    
    const order = orderRes.data[0];
    
    // 检查是否已同步
    if (order.gardenSync?.isSynced) {
      return {
        code: 200,
        message: '订单已同步过',
        data: {
          alreadySynced: true,
          syncedAt: order.gardenSync.syncedAt
        }
      };
    }
    
    const userId = order.userId || order.userInfo?.userId;
    
    if (!userId) {
      return {
        code: 400,
        message: '订单缺少用户ID'
      };
    }
    
    // 2. 创建 meals 记录
    const mealData = {
      userId: userId,
      date: order.createdAt || new Date(),
      mealType: 'restaurant',  // 餐厅就餐
      
      // 餐厅信息
      restaurant: {
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName,
        orderId: order.orderId
      },
      
      // 食材列表 (简化)
      ingredients: order.items.map(item => ({
        name: item.menuItemName,
        amount: item.quantity,
        unit: '份',
        category: 'restaurant_meal',
        carbonFootprint: item.carbonFootprint || 0
      })),
      
      // 碳足迹
      totalCarbonFootprint: order.carbonImpact.totalCarbonFootprint,
      comparedToMeat: {
        meatCarbonFootprint: order.carbonImpact.totalCarbonFootprint + order.carbonImpact.carbonSavingsVsMeat,
        reduction: order.carbonImpact.carbonSavingsVsMeat,
        reductionPercent: (order.carbonImpact.carbonSavingsVsMeat / (order.carbonImpact.totalCarbonFootprint + order.carbonImpact.carbonSavingsVsMeat) * 100).toFixed(1)
      },
      
      createdAt: new Date(),
      syncedFromRestaurant: true
    };
    
    const mealRes = await db.collection('meals').add({ data: mealData });
    const mealId = mealRes._id;
    
    console.log(`✓ 创建 meals 记录: ${mealId}`);
    
    // 3. 更新碳积分账户
    const carbonReduction = order.carbonImpact.carbonSavingsVsMeat;
    const carbonCreditsEarned = Math.floor(carbonReduction * 10); // 1kg = 10积分
    
    // 获取或创建碳积分账户
    const creditRes = await db.collection('carbon_credits')
      .where({ userId })
      .get();
    
    if (creditRes.data.length === 0) {
      // 创建新账户
      await db.collection('carbon_credits').add({
        data: {
          userId,
          account: {
            totalCredits: carbonCreditsEarned,
            availableCredits: carbonCreditsEarned,
            usedCredits: 0,
            expiredCredits: 0,
            breakdown: {
              gardenCredits: 0,
              shopCredits: 0,
              restaurantCredits: carbonCreditsEarned,
              referralCredits: 0,
              eventCredits: 0
            }
          },
          level: {
            currentLevel: 'beginner',
            levelBenefits: [],
            nextLevelThreshold: 100,
            progressToNextLevel: carbonReduction / 100
          },
          achievements: {
            totalCarbonReduction: carbonReduction,
            byScene: {
              homeCooking: 0,
              shopping: 0,
              diningOut: carbonReduction,
              other: 0
            },
            milestones: [],
            impactEquivalent: {
              treesPlanted: carbonReduction * 0.05,
              carKmReduced: carbonReduction * 5.4,
              waterSaved: carbonReduction * 30,
              landSaved: carbonReduction
            }
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // 更新现有账户
      await db.collection('carbon_credits')
        .where({ userId })
        .update({
          data: {
            'account.totalCredits': _.inc(carbonCreditsEarned),
            'account.availableCredits': _.inc(carbonCreditsEarned),
            'account.breakdown.restaurantCredits': _.inc(carbonCreditsEarned),
            'achievements.totalCarbonReduction': _.inc(carbonReduction),
            'achievements.byScene.diningOut': _.inc(carbonReduction),
            'achievements.impactEquivalent.treesPlanted': _.inc(carbonReduction * 0.05),
            'achievements.impactEquivalent.carKmReduced': _.inc(carbonReduction * 5.4),
            'achievements.impactEquivalent.waterSaved': _.inc(carbonReduction * 30),
            'achievements.impactEquivalent.landSaved': _.inc(carbonReduction),
            updatedAt: new Date()
          }
        });
    }
    
    console.log(`✓ 更新碳积分账户: +${carbonCreditsEarned} 积分`);
    
    // 4. 记录碳积分交易
    await db.collection('carbon_transactions').add({
      data: {
        transactionId: `TR-${Date.now()}`,
        userId,
        transactionType: 'earn',
        amount: carbonCreditsEarned,
        source: 'restaurant',
        relatedOrderId: order._id,
        relatedRestaurantId: order.restaurantId,
        carbonReduction: carbonReduction,
        carbonSource: 'restaurant_dining',
        transactionDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000), // 1年有效期
        status: 'completed',
        createdAt: new Date()
      }
    });
    
    console.log(`✓ 记录碳积分交易`);
    
    // 5. 更新 daily_stats (如果存在)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await db.collection('daily_stats')
      .where({
        userId,
        date: today
      })
      .update({
        data: {
          'restaurant.orders': _.inc(1),
          'restaurant.spending': _.inc(order.pricing.total),
          'restaurant.carbonReduction': _.inc(carbonReduction),
          'carbonCredits.earned': _.inc(carbonCreditsEarned),
          updatedAt: new Date()
        }
      });
    
    console.log(`✓ 更新 daily_stats`);
    
    // 6. 更新用户碳统计 (gardens表中的植物成长)
    const plantGrowthPoints = Math.floor(carbonCreditsEarned / 10);
    
    await db.collection('users')
      .doc(userId)
      .update({
        data: {
          'carbonStats.totalReduction': _.inc(carbonReduction),
          'pointsSystem.totalPoints': _.inc(carbonCreditsEarned),
          updatedAt: new Date()
        }
      });
    
    console.log(`✓ 更新用户碳统计`);
    
    // 7. 标记订单已同步
    await db.collection('restaurant_orders')
      .doc(order._id)
      .update({
        data: {
          'gardenSync.isSynced': true,
          'gardenSync.syncedAt': new Date(),
          'gardenSync.mealId': mealId,
          'gardenSync.plantGrowthPoints': plantGrowthPoints
        }
      });
    
    console.log(`✓ 标记订单已同步`);
    
    // 8. 记录公众参与
    await db.collection('public_participation').add({
      data: {
        recordId: `PUB-${Date.now()}`,
        userId,
        actionType: 'restaurant_dining',
        actionDetails: {
          relatedOrderId: order._id,
          relatedRestaurantId: order.restaurantId,
          carbonReduction: carbonReduction,
          carbonCreditsEarned: carbonCreditsEarned,
          description: `在 ${order.restaurantName} 就餐`
        },
        governmentProgramId: null,  // 后续关联政府项目
        socialImpact: {
          isPubliclyShared: false,
          shareCount: 0,
          likeCount: 0,
          commentCount: 0,
          inspiredCount: 0
        },
        verification: {
          isVerified: true,
          verifiedBy: 'system',
          verifiedAt: new Date()
        },
        actionDate: order.createdAt || new Date(),
        createdAt: new Date()
      }
    });
    
    console.log(`✓ 记录公众参与`);
    
    return {
      code: 0,
      message: '餐厅订单同步成功',
      data: {
        orderId: order.orderId,
        carbonReduction: carbonReduction,
        carbonCreditsEarned: carbonCreditsEarned,
        mealId: mealId,
        plantGrowthPoints: plantGrowthPoints,
        impactEquivalent: order.carbonImpact.impactEquivalent
      }
    };
    
  } catch (error) {
    console.error('❌ 订单同步失败:', error);
    return {
      code: 500,
      message: '订单同步失败',
      error: error.message
    };
  }
};

