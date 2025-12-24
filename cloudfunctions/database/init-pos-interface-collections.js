/**
 * 收银系统接口数据库集合初始化脚本
 * 
 * 功能：创建收银系统接口相关的数据库集合
 * 
 * 集合列表：
 * 1. pos_integrations - 收银系统接入配置
 * 2. pos_sync_logs - 同步操作日志
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化收银系统接口集合
 */
exports.main = async (event) => {
  const results = [];

  console.log('========================================');
  console.log('开始初始化收银系统接口数据库集合...');
  console.log('========================================\n');

  try {
    // 1. 创建 pos_integrations 集合
    console.log('[1/2] 创建 pos_integrations 集合...');
    const result1 = await createCollection('pos_integrations');
    results.push(result1);

    // 2. 创建 pos_sync_logs 集合
    console.log('[2/2] 创建 pos_sync_logs 集合...');
    const result2 = await createCollection('pos_sync_logs');
    results.push(result2);

    const successCount = results.filter(r => r.status === 'success' || r.status === 'exists').length;

    console.log('\n========================================');
    console.log('🎉 收银系统接口数据库集合创建完成！');
    console.log('========================================');
    console.log(`成功创建: ${successCount}/2 个集合`);
    console.log('========================================\n');
    console.log('⚠️  重要提示：');
    console.log('索引需要在云开发控制台手动创建');
    console.log('请参考文档：Docs/索引配置表.csv');
    console.log('需要创建的索引：');
    console.log('  - pos_integrations: 2 个索引');
    console.log('  - pos_sync_logs: 3 个索引（含TTL索引）');
    console.log('========================================\n');

    return {
      code: 0,
      message: '收银系统接口数据库集合创建成功',
      summary: {
        totalCollections: 2,
        successfulCollections: successCount,
        failedCollections: 2 - successCount,
        collections: results
      },
      nextSteps: {
        action: '手动创建索引',
        guide: 'Docs/索引配置表.csv',
        totalIndexes: 5
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
    if (error.message && (error.message.includes('already exists') || error.message.includes('已存在'))) {
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

