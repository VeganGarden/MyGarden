/**
 * 数据库 v3.0 迁移脚本 - 九悦融合版
 * 
 * 功能:
 * 1. 扩展现有集合的字段 (users, user_profiles_extended, ingredients, recipes, practitioners, daily_stats, orders)
 * 2. 配置新增索引
 * 3. 数据预览和回滚支持
 * 
 * 执行方式:
 * - 预览: tcb fn invoke database --params '{"action":"migrate-v3","params":{"action":"preview"}}'
 * - 执行: tcb fn invoke database --params '{"action":"migrate-v3","params":{"action":"migrate"}}'
 * - 回滚: tcb fn invoke database --params '{"action":"migrate-v3","params":{"action":"rollback"}}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 主函数
 */
async function migrateV3Collections(params = {}) {
  const action = params.action || 'preview';
  
  console.log(`===== v3.0 数据迁移: ${action} =====`);
  
  try {
    switch (action) {
      case 'preview':
        return await previewMigration();
      case 'migrate':
        return await executeMigration();
      case 'rollback':
        return await rollbackMigration();
      default:
        return {
          code: 400,
          message: '无效的操作,支持: preview/migrate/rollback'
        };
    }
  } catch (error) {
    console.error('迁移失败:', error);
    return {
      code: 500,
      message: '迁移失败',
      error: error.message
    };
  }
}

/**
 * 预览迁移 - 显示将要进行的更改
 */
async function previewMigration() {
  console.log('\n--- 预览迁移计划 ---\n');
  
  const plan = {
    collections: [
      {
        name: 'users',
        changes: [
          '+ ecommerce (商城关联数据)',
          '+ pointsSystem (积分互通)',
          '+ jiuyue (九悦特有字段)'
        ],
        newIndexes: 3
      },
      {
        name: 'user_profiles_extended',
        changes: [
          '+ jiuyueProfile (九悦客户画像)'
        ],
        newIndexes: 0
      },
      {
        name: 'ingredients',
        changes: [
          '+ ecommerceLink (关联商城商品)'
        ],
        newIndexes: 1
      },
      {
        name: 'recipes',
        changes: [
          '+ shoppingFeature (一键购买功能)',
          '+ monetization (商业化)'
        ],
        newIndexes: 2
      },
      {
        name: 'practitioners',
        changes: [
          '+ commercialization (商业化能力)'
        ],
        newIndexes: 1
      },
      {
        name: 'daily_stats',
        changes: [
          '+ shopping (购物数据)'
        ],
        newIndexes: 0
      },
      {
        name: 'orders',
        changes: [
          '+ gardenIntegration (与花园积分互通)',
          '+ recommendation (个性化推荐相关)',
          '+ userFeedback (用户偏好记录)'
        ],
        newIndexes: 2
      }
    ],
    totalIndexes: 9,
    affectedDocuments: 'all'
  };
  
  return {
    code: 0,
    message: '迁移预览',
    action: 'preview',
    plan,
    note: '这只是预览,未做任何修改。执行 action=migrate 来应用更改。'
  };
}

/**
 * 执行迁移
 */
async function executeMigration() {
  console.log('\n--- 开始执行迁移 ---\n');
  
  const results = [];
  
  // 1. 扩展 users 集合
  console.log('1. 扩展 users 集合...');
  await migrateUsers();
  results.push({ collection: 'users', status: 'success' });
  
  // 2. 扩展 user_profiles_extended 集合
  console.log('2. 扩展 user_profiles_extended 集合...');
  await migrateUserProfilesExtended();
  results.push({ collection: 'user_profiles_extended', status: 'success' });
  
  // 3. 扩展 ingredients 集合
  console.log('3. 扩展 ingredients 集合...');
  await migrateIngredients();
  results.push({ collection: 'ingredients', status: 'success' });
  
  // 4. 扩展 recipes 集合
  console.log('4. 扩展 recipes 集合...');
  await migrateRecipes();
  results.push({ collection: 'recipes', status: 'success' });
  
  // 5. 扩展 practitioners 集合
  console.log('5. 扩展 practitioners 集合...');
  await migratePractitioners();
  results.push({ collection: 'practitioners', status: 'success' });
  
  // 6. 扩展 daily_stats 集合
  console.log('6. 扩展 daily_stats 集合...');
  await migrateDailyStats();
  results.push({ collection: 'daily_stats', status: 'success' });
  
  // 7. 扩展 orders 集合
  console.log('7. 扩展 orders 集合...');
  await migrateOrders();
  results.push({ collection: 'orders', status: 'success' });
  
  console.log('\n--- 迁移完成 ---\n');
  
  return {
    code: 0,
    message: 'v3.0 迁移成功完成',
    action: 'migrate',
    results,
    timestamp: new Date(),
    note: '所有集合已成功扩展。如需回滚,请执行 action=rollback'
  };
}

/**
 * 回滚迁移
 */
async function rollbackMigration() {
  console.log('\n--- 开始回滚迁移 ---\n');
  
  const results = [];
  
  // 注意: 回滚只删除新增字段,不删除集合
  
  try {
    // 1. 回滚 users
    console.log('1. 回滚 users...');
    await db.collection('users').where({}).update({
      data: {
        ecommerce: _.remove(),
        pointsSystem: _.remove(),
        jiuyue: _.remove()
      }
    });
    results.push({ collection: 'users', status: 'rolled back' });
    
    // 2. 回滚 user_profiles_extended
    console.log('2. 回滚 user_profiles_extended...');
    await db.collection('user_profiles_extended').where({}).update({
      data: {
        jiuyueProfile: _.remove()
      }
    });
    results.push({ collection: 'user_profiles_extended', status: 'rolled back' });
    
    // 3. 回滚 ingredients
    console.log('3. 回滚 ingredients...');
    await db.collection('ingredients').where({}).update({
      data: {
        ecommerceLink: _.remove()
      }
    });
    results.push({ collection: 'ingredients', status: 'rolled back' });
    
    // 4. 回滚 recipes
    console.log('4. 回滚 recipes...');
    await db.collection('recipes').where({}).update({
      data: {
        shoppingFeature: _.remove(),
        monetization: _.remove()
      }
    });
    results.push({ collection: 'recipes', status: 'rolled back' });
    
    // 5. 回滚 practitioners
    console.log('5. 回滚 practitioners...');
    await db.collection('practitioners').where({}).update({
      data: {
        commercialization: _.remove()
      }
    });
    results.push({ collection: 'practitioners', status: 'rolled back' });
    
    // 6. 回滚 daily_stats
    console.log('6. 回滚 daily_stats...');
    await db.collection('daily_stats').where({}).update({
      data: {
        shopping: _.remove()
      }
    });
    results.push({ collection: 'daily_stats', status: 'rolled back' });
    
    // 7. 回滚 orders
    console.log('7. 回滚 orders...');
    await db.collection('orders').where({}).update({
      data: {
        gardenIntegration: _.remove(),
        recommendation: _.remove(),
        userFeedback: _.remove()
      }
    });
    results.push({ collection: 'orders', status: 'rolled back' });
    
    console.log('\n--- 回滚完成 ---\n');
    
    return {
      code: 0,
      message: 'v3.0 迁移已回滚',
      action: 'rollback',
      results,
      timestamp: new Date()
    };
    
  } catch (error) {
    return {
      code: 500,
      message: '回滚失败',
      error: error.message,
      results
    };
  }
}

// ==================== 各集合迁移函数 ====================

/**
 * 迁移 users 集合
 */
async function migrateUsers() {
  // 为所有用户添加新字段(初始值为空对象)
  await db.collection('users').where({}).update({
    data: {
      ecommerce: {
        customerLevel: 'new',
        rfm: {
          recency: 999,
          frequency: 0,
          monetary: 0
        },
        purchasePreferences: {
          topCategories: [],
          avgOrderValue: 0,
          preferredBrands: [],
          priceSensitivity: 'medium'
        },
        vipLevel: 'normal',
        vipExpireDate: null,
        totalSavings: 0,
        defaultShippingAddress: null,
        addressCount: 0
      },
      pointsSystem: {
        gardenPoints: 0,
        shopPoints: 0,
        totalPoints: 0,
        pointsUsedInGarden: 0,
        pointsUsedInShop: 0
      },
      jiuyue: {
        dietaryNeeds: {
          veganType: 'unknown',
          allergies: [],
          healthGoals: []
        },
        purchaseScenarios: [],
        customerServiceRecords: [],
        referralInfo: {
          referrerId: null,
          referralCode: null,
          referredUsers: [],
          referralRewards: 0
        }
      }
    }
  });
  
  // 注意: 新增索引需要在云开发控制台手动创建
  // 参考: 数据库v3.0升级-执行指南.md
  
  console.log('✓ users 集合迁移完成');
}

/**
 * 迁移 user_profiles_extended 集合
 */
async function migrateUserProfilesExtended() {
  await db.collection('user_profiles_extended').where({}).update({
    data: {
      jiuyueProfile: {
        consumerPersona: {
          lifestage: 'unknown',
          occupation: null,
          income: null,
          location: {
            province: null,
            city: null,
            district: null
          }
        },
        valueLabels: {
          primaryMotivation: null,
          contentInterests: [],
          socialInfluence: null
        },
        shoppingHabits: {
          preferredChannel: 'miniprogram',
          preferredPayment: 'wechat',
          avgOrderFrequency: 'monthly',
          stockupItems: [],
          impulseItems: []
        }
      }
    }
  });
  
  console.log('✓ user_profiles_extended 集合迁移完成');
}

/**
 * 迁移 ingredients 集合
 */
async function migrateIngredients() {
  await db.collection('ingredients').where({}).update({
    data: {
      ecommerceLink: {
        availableProducts: [],
        priceHistory: [],
        purchaseStats: {
          totalSales: 0,
          avgMonthSales: 0,
          peakSeasonMonths: []
        }
      }
    }
  });
  
  console.log('✓ ingredients 集合迁移完成');
}

/**
 * 迁移 recipes 集合
 */
async function migrateRecipes() {
  await db.collection('recipes').where({}).update({
    data: {
      shoppingFeature: {
        purchaseList: [],
        oneClickBuy: {
          totalCost: 0,
          estimatedCarbonFootprint: 0,
          availableInStock: false,
          cartTemplateId: null
        }
      },
      monetization: {
        isSponsored: false,
        sponsorBrand: null,
        affiliateProducts: [],
        commissionRate: 0
      }
    }
  });
  
  console.log('✓ recipes 集合迁移完成');
}

/**
 * 迁移 practitioners 集合
 */
async function migratePractitioners() {
  await db.collection('practitioners').where({}).update({
    data: {
      commercialization: {
        recommendedProducts: [],
        earnings: {
          totalCommission: 0,
          monthCommission: 0,
          referralBonus: 0,
          courseIncome: 0
        },
        influence: {
          followerCount: 0,
          avgEngagementRate: 0,
          trustScore: 5.0
        }
      }
    }
  });
  
  console.log('✓ practitioners 集合迁移完成');
}

/**
 * 迁移 daily_stats 集合
 */
async function migrateDailyStats() {
  await db.collection('daily_stats').where({}).update({
    data: {
      shopping: {
        ordersCount: 0,
        totalSpent: 0,
        productsPurchased: 0,
        shoppingCarbonFootprint: 0,
        totalCarbonFromFood: 0,
        totalCarbonFromShopping: 0,
        netCarbonReduction: 0
      }
    }
  });
  
  console.log('✓ daily_stats 集合迁移完成');
}

/**
 * 迁移 orders 集合
 */
async function migrateOrders() {
  await db.collection('orders').where({}).update({
    data: {
      gardenIntegration: {
        carbonReductionEarned: 0,
        pointsEarned: 0,
        pointsUsed: 0,
        discountByCarbonPoints: 0,
        syncedToGarden: false,
        syncedMealId: null,
        syncedDailyStatsDate: null
      },
      recommendation: {
        triggeredBy: null,
        practitionerReferralId: null,
        recipeId: null,
        fromRecommendation: false,
        recommendationAccuracy: 0
      },
      userFeedback: {
        satisfaction: 0,
        willRepurchase: false,
        tags: [],
        complaint: null
      }
    }
  });
  
  console.log('✓ orders 集合迁移完成');
}

module.exports = {
  migrateV3Collections
};

