const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 数据库初始化脚本（修复版 v1.2）
 * 创建14个核心集合，索引需要在控制台手动创建
 * 
 * 注意：腾讯云开发的MongoDB不支持通过代码创建索引
 * 请在执行此脚本后，参考《数据库索引创建手册.md》在控制台手动创建索引
 * 
 * 集合列表：
 * 1. users - 用户主表
 * 2. user_sessions - 会话表
 * 3. meals - 餐食记录表
 * 4. daily_stats - 每日统计表
 * 5. gardens - 花园表
 * 6. ingredients - 食材库
 * 7. recipes - 食谱库
 * 8. sync_tasks - 同步任务表
 * 9. platform_configs - 平台配置表
 * 10. friends - 好友关系表
 * 11. posts - 动态表
 * 12. orders - 订单表
 * 13. meat_products - 肉类碳足迹数据（v1.1新增）
 * 14. plant_templates - 植物模板数据（v1.2新增）
 */
exports.main = async (event) => {
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

// 支持本地测试
if (require.main === module) {
  exports.main({}).then(result => {
    console.log('\n最终结果:', JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('\n执行失败:', err);
  });
}
