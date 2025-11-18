const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入测试数据插入函数
const { insertRestaurantTestData } = require('./insert-restaurant-test-data');

/**
 * 数据库管理云函数 - 统一入口
 * 
 * 支持的 actions:
 * - init-v1: 初始化 v1.0 数据库（14个核心集合）
 * - init-v2: 创建 v2.0 新集合（7个集合）
 * - migrate-v2: 迁移现有集合（添加新字段）
 * - init-v3: 创建 v3.0 新集合（10个电商+运营域集合）
 * - migrate-v3: 迁移现有集合为 v3.0（扩展6个集合）
 * - seed-v3-data: 导入 v3.0 示例数据
 * - init-v4: 创建 v4.0 新集合（15个餐厅+碳普惠+政府域集合）✨
 * - migrate-v4: 迁移现有集合为 v4.0（扩展字段）✨
 * - seed-v4-data: 导入 v4.0 示例数据 ✨
 * - test-upgrade: 测试升级结果
 * - get-status: 查看数据库状态
 * - initAdminCollections: 初始化管理后台集合（admin_users, role_configs, permissions, audit_logs）
 * - initAdminData: 初始化管理后台数据（角色和权限配置）
 * - initMessageCollections: 初始化消息管理集合（messages, user_messages, message_event_rules）
 * - insertRestaurantTestData: 为"素开心"和"素欢乐"餐厅插入测试数据（订单、评价、优惠券、行为统计）
 */
exports.main = async (event) => {
  const { action = 'init-v1' } = event;
  
  console.log('========================================');
  console.log(`数据库管理云函数 - Action: ${action}`);
  console.log('========================================\n');

  try {
    switch (action) {
      case 'init-v1':
        return await initCollectionsV1(event);
      case 'init-v2':
        return await initCollectionsV2(event);
      case 'migrate-v2':
        return await migrateCollectionsV2(event);
      case 'init-v3':
        return await initCollectionsV3(event);
      case 'migrate-v3':
        return await migrateCollectionsV3(event);
      case 'seed-v3-data':
        return await seedV3Data(event);
      case 'init-v4':
        return await initCollectionsV4(event);
      case 'migrate-v4':
        return await migrateCollectionsV4(event);
      case 'seed-v4-data':
        return await seedV4Data(event);
      case 'test-upgrade':
        return await testUpgrade(event);
      case 'get-status':
        return await getDatabaseStatus(event);
      case 'seed-sample-data':
        return await seedSampleData(event);
      case 'initAdminCollections':
        return await initAdminCollections(event);
      case 'initAdminData':
        return await initAdminData(event);
      case 'initMessageCollections':
        return await initMessageCollections(event);
      case 'initMessageEventRules':
        return await initMessageEventRules(event);
      case 'insertRestaurantTestData':
        return await insertRestaurantTestData(event);
      default:
        return await initCollectionsV1(event);
    }
  } catch (error) {
    console.error('❌ 云函数执行失败:', error);
    return {
      code: 500,
      message: '云函数执行失败',
      error: error.message
    };
  }
};

/**
 * 初始化 v1.0 数据库（原有逻辑）
 */
async function initCollectionsV1(event) {
  const results = [];
  
  console.log('========================================');
  console.log('开始初始化数据库集合...');
  console.log('========================================\n');

  try {
    // 1. 创建users集合
    console.log('[1/14] 创建users集合...');
    const result1 = await createCollection('users');
    results.push(result1);

    // 2. 创建user_sessions集合
    console.log('[2/14] 创建user_sessions集合...');
    const result2 = await createCollection('user_sessions');
    results.push(result2);

    // 3. 创建meals集合
    console.log('[3/14] 创建meals集合...');
    const result3 = await createCollection('meals');
    results.push(result3);

    // 4. 创建daily_stats集合
    console.log('[4/14] 创建daily_stats集合...');
    const result4 = await createCollection('daily_stats');
    results.push(result4);

    // 5. 创建gardens集合
    console.log('[5/14] 创建gardens集合...');
    const result5 = await createCollection('gardens');
    results.push(result5);

    // 6. 创建ingredients集合
    console.log('[6/14] 创建ingredients集合...');
    const result6 = await createCollection('ingredients');
    results.push(result6);

    // 7. 创建recipes集合
    console.log('[7/14] 创建recipes集合...');
    const result7 = await createCollection('recipes');
    results.push(result7);

    // 8. 创建sync_tasks集合
    console.log('[8/14] 创建sync_tasks集合...');
    const result8 = await createCollection('sync_tasks');
    results.push(result8);

    // 9. 创建platform_configs集合
    console.log('[9/14] 创建platform_configs集合...');
    const result9 = await createCollection('platform_configs');
    results.push(result9);

    // 10. 创建friends集合
    console.log('[10/14] 创建friends集合...');
    const result10 = await createCollection('friends');
    results.push(result10);

    // 11. 创建posts集合
    console.log('[11/14] 创建posts集合...');
    const result11 = await createCollection('posts');
    results.push(result11);

    // 12. 创建orders集合
    console.log('[12/14] 创建orders集合...');
    const result12 = await createCollection('orders');
    results.push(result12);

    // 13. 创建meat_products集合（肉类碳足迹数据）
    console.log('[13/14] 创建meat_products集合...');
    const result13 = await createCollection('meat_products');
    results.push(result13);

    // 14. 创建plant_templates集合（植物模板数据）
    console.log('[14/14] 创建plant_templates集合...');
    const result14 = await createCollection('plant_templates');
    results.push(result14);

    const successCount = results.filter(r => r.status === 'success').length;

    console.log('\n========================================');
    console.log('🎉 数据库集合创建完成！');
    console.log('========================================');
    console.log(`成功创建: ${successCount}/14 个集合`);
    console.log('========================================\n');
    console.log('⚠️  重要提示：');
    console.log('索引需要在云开发控制台手动创建');
    console.log('请参考文档：Docs/数据库索引创建手册.md');
    console.log('总计需要创建: 28 个索引');
    console.log('========================================\n');

    return {
      code: 0,
      message: '数据库集合创建成功',
      summary: {
        totalCollections: 14,
        successfulCollections: successCount,
        failedCollections: 14 - successCount,
        collections: results
      },
      nextSteps: {
        action: '手动创建索引',
        guide: 'Docs/数据库索引创建手册.md',
        totalIndexes: 28,
        newCollections: ['meat_products - 肉类碳足迹数据', 'plant_templates - 植物模板数据']
      }
    };

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return {
      code: 500,
      message: '数据库初始化失败',
      error: error.message,
      results
    };
  }
};

/**
 * 创建单个集合的通用函数
 */
async function createCollection(collectionName) {
  try {
    await db.createCollection(collectionName);
    console.log(`  ✅ ${collectionName} 集合创建成功`);
    return {
      collection: collectionName,
      status: 'success',
      message: '创建成功'
    };
  } catch (error) {
    // 如果集合已存在，不算错误
    if (error.message && error.message.includes('already exists')) {
      console.log(`  ℹ️  ${collectionName} 集合已存在，跳过创建`);
      return {
        collection: collectionName,
        status: 'exists',
        message: '集合已存在'
      };
    }
    
    console.error(`  ❌ ${collectionName} 集合创建失败:`, error.message);
    return {
      collection: collectionName,
      status: 'failed',
      message: error.message
    };
  }
}

/**
 * 初始化 v2.0 新集合
 */
async function initCollectionsV2(event) {
  const initV2 = require('./init-collections-v2.js');
  return await initV2.main(event);
}

/**
 * 迁移现有集合
 */
async function migrateCollectionsV2(event) {
  const migrate = require('./migrate-collections-v2.js');
  // 正确传递参数
  const { params = {} } = event;
  return await migrate.main(params);
}

/**
 * 测试升级结果
 */
async function testUpgrade(event) {
  const test = require('./test-upgrade.js');
  return await test.main(event);
}

/**
 * 导入示例数据
 */
async function seedSampleData(event) {
  const seed = require('./seed-sample-data.js');
  return await seed.main(event);
}

/**
 * 初始化 v3.0 新集合
 */
async function initCollectionsV3(event) {
  const initV3 = require('./init-collections-v3.js');
  return await initV3.initV3Collections();
}

/**
 * 迁移现有集合为 v3.0
 */
async function migrateCollectionsV3(event) {
  const migrate = require('./migrate-collections-v3.js');
  const { params = {} } = event;
  return await migrate.migrateV3Collections(params);
}

/**
 * 导入 v3.0 示例数据
 */
async function seedV3Data(event) {
  const seed = require('./seed-sample-data-v3.js');
  return await seed.seedV3SampleData();
}

/**
 * 初始化 v4.0 新集合
 */
async function initCollectionsV4(event) {
  const initV4 = require('./init-collections-v4.js');
  return await initV4.initV4Collections();
}

/**
 * 迁移现有集合为 v4.0
 */
async function migrateCollectionsV4(event) {
  const migrate = require('./migrate-collections-v4.js');
  const { params = {} } = event;
  return await migrate.migrateV4Collections(params);
}

/**
 * 导入 v4.0 示例数据
 */
async function seedV4Data(event) {
  const seed = require('./seed-sample-data-v4.js');
  return await seed.seedV4SampleData();
}

/**
 * 初始化管理后台集合
 */
async function initAdminCollections(event) {
  const initAdmin = require('./init-admin-collections.js');
  return await initAdmin.main(event);
}

/**
 * 初始化管理后台数据
 */
async function initAdminData(event) {
  const initAdminData = require('./init-admin-data.js');
  return await initAdminData.main(event);
}

async function initMessageCollections(event) {
  const initMessageCollections = require('./init-message-collections.js');
  return await initMessageCollections.main(event);
}

async function initMessageEventRules(event) {
  const initMessageEventRules = require('./init-message-event-rules.js');
  return await initMessageEventRules.main(event);
}

/**
 * 查看数据库状态
 */
async function getDatabaseStatus(event) {
  try {
    const v1Collections = [
      'users', 'user_sessions', 'meals', 'daily_stats', 'gardens',
      'ingredients', 'recipes', 'sync_tasks', 'platform_configs',
      'friends', 'posts', 'orders', 'meat_products', 'plant_templates'
    ];
    
    const v2Collections = [
      'practitioners', 'practitioner_certifications', 'tcm_wisdom',
      'wisdom_quotes', 'mentorship', 'user_profiles_extended', 'knowledge_graph'
    ];
    
    const v3Collections = [
      'products', 'shopping_cart', 'product_reviews', 'inventory',
      'promotions', 'coupons', 'user_coupons', 
      'data_dashboard', 'business_rules'
    ];
    
    const v4Collections = [
      'restaurants', 'restaurant_menus', 'restaurant_menu_items', 
      'restaurant_orders', 'restaurant_reservations', 'restaurant_members',
      'restaurant_campaigns', 'restaurant_reviews',
      'carbon_credits', 'carbon_transactions', 'carbon_exchange_records', 'carbon_milestones',
      'government_programs', 'public_participation', 'esg_reports'
    ];
    
    const allCollections = [...v1Collections, ...v2Collections, ...v3Collections, ...v4Collections];
    const status = {};
    
    for (const collectionName of allCollections) {
      try {
        const countResult = await db.collection(collectionName).count();
        status[collectionName] = {
          exists: true,
          count: countResult.total
        };
      } catch (error) {
        status[collectionName] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    // 判断版本
    let version = 'v1.0';
    const v1Complete = v1Collections.every(c => status[c]?.exists);
    const v2Complete = v2Collections.every(c => status[c]?.exists);
    const v3Complete = v3Collections.every(c => status[c]?.exists);
    const v4Complete = v4Collections.every(c => status[c]?.exists);
    
    if (v1Complete && v2Complete && v3Complete && v4Complete) {
      version = 'v4.0';
    } else if (v1Complete && v2Complete && v3Complete) {
      version = 'v3.0';
    } else if (v1Complete && v2Complete) {
      version = 'v2.0';
    } else if (v1Complete) {
      version = 'v1.2';
    }
    
    console.log(`\n数据库状态： ${version}`);
    console.log(`v1.0 集合： ${v1Complete ? '完整' : '不完整'}`);
    console.log(`v2.0 集合： ${v2Complete ? '完整' : '不完整'}`);
    console.log(`v3.0 集合： ${v3Complete ? '完整' : '不完整'}`);
    console.log(`v4.0 集合： ${v4Complete ? '完整' : '不完整'}`);
    
    return {
      code: 0,
      message: '数据库状态查询成功',
      data: {
        timestamp: new Date(),
        version,
        collections: status,
        summary: {
          v1: { total: v1Collections.length, complete: v1Complete },
          v2: { total: v2Collections.length, complete: v2Complete },
          v3: { total: v3Collections.length, complete: v3Complete },
          v4: { total: v4Collections.length, complete: v4Complete }
        }
      }
    };
  } catch (error) {
    console.error('❌ 状态查询失败:', error);
    return {
      code: 500,
      message: '状态查询失败',
      error: error.message
    };
  }
}

// 支持本地测试
if (require.main === module) {
  exports.main({}).then(result => {
    console.log('\n最终结果:', JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('\n执行失败:', err);
  });
}
