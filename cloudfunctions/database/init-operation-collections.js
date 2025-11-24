/**
 * 初始化餐厅运营域集合
 * 
 * 功能:
 * 1. 创建 restaurant_operation_ledgers - 运营台账表
 * 2. 创建 restaurant_behavior_metrics - 行为指标快照表
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"initOperationCollections"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 主函数
 */
async function initOperationCollections() {
  console.log('===== 开始初始化餐厅运营域集合 =====');
  
  const results = [];
  
  try {
    // 1. 创建 restaurant_operation_ledgers 集合
    console.log('\n[1/2] 创建 restaurant_operation_ledgers 集合...');
    try {
      await db.createCollection('restaurant_operation_ledgers');
      console.log('✓ restaurant_operation_ledgers 集合创建成功');
      results.push({ collection: 'restaurant_operation_ledgers', status: 'success' });
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log('ℹ️  restaurant_operation_ledgers 集合已存在，跳过创建');
        results.push({ collection: 'restaurant_operation_ledgers', status: 'exists' });
      } else {
        throw e;
      }
    }
    
    // 2. 创建 restaurant_behavior_metrics 集合
    console.log('[2/2] 创建 restaurant_behavior_metrics 集合...');
    try {
      await db.createCollection('restaurant_behavior_metrics');
      console.log('✓ restaurant_behavior_metrics 集合创建成功');
      results.push({ collection: 'restaurant_behavior_metrics', status: 'success' });
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log('ℹ️  restaurant_behavior_metrics 集合已存在，跳过创建');
        results.push({ collection: 'restaurant_behavior_metrics', status: 'exists' });
      } else {
        throw e;
      }
    }
    
    console.log('\n===== 餐厅运营域集合初始化完成 =====');
    console.log(`\n✅ 成功处理 ${results.length} 个集合\n`);
    console.log('📋 新增集合:');
    console.log('   - restaurant_operation_ledgers: 运营台账表');
    console.log('   - restaurant_behavior_metrics: 行为指标快照表');
    console.log('\n⚠️  注意: 索引需要在云开发控制台手动创建');
    console.log('📖 参考索引配置:');
    console.log('   - restaurant_operation_ledgers:');
    console.log('     * restaurantId + date (复合索引)');
    console.log('     * restaurantId + type + date (复合索引)');
    console.log('     * tenantId + date (复合索引)');
    console.log('   - restaurant_behavior_metrics:');
    console.log('     * restaurantId + snapshotDate (复合索引)');
    console.log('     * tenantId + snapshotDate (复合索引)\n');
    
    return {
      code: 0,
      message: `餐厅运营域集合初始化成功 - 处理 ${results.length} 个集合`,
      results,
      summary: {
        total: results.length,
        collections: results.map(r => r.collection)
      }
    };
    
  } catch (error) {
    console.error('初始化失败:', error);
    return {
      code: 500,
      message: '餐厅运营域集合初始化失败',
      error: error.message,
      results
    };
  }
}

module.exports = {
  initOperationCollections
};

