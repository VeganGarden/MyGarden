/**
 * 菜单环保信息展示配置数据库集合初始化脚本
 * 
 * 功能：创建菜单环保信息展示配置相关的数据库集合
 * 
 * 集合列表：
 * 1. restaurant_menu_display_configs - 餐厅菜单展示配置
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化菜单展示配置集合
 */
exports.main = async (event) => {
  const results = [];

  console.log('========================================');
  console.log('开始初始化菜单展示配置数据库集合...');
  console.log('========================================\n');

  try {
    // 1. 创建 restaurant_menu_display_configs 集合
    console.log('[1/1] 创建 restaurant_menu_display_configs 集合...');
    const result1 = await createCollection('restaurant_menu_display_configs');
    results.push(result1);

    const successCount = results.filter(r => r.status === 'success' || r.status === 'exists').length;

    console.log('\n========================================');
    console.log('🎉 菜单展示配置数据库集合创建完成！');
    console.log('========================================');
    console.log(`成功创建: ${successCount}/1 个集合`);
    console.log('========================================\n');
    console.log('⚠️  重要提示：');
    console.log('索引需要在云开发控制台手动创建');
    console.log('请参考文档：Docs/索引配置表.csv');
    console.log('需要创建的索引：');
    console.log('  - restaurant_menu_display_configs: 3 个索引');
    console.log('    1. restaurantId_unique (唯一索引)');
    console.log('    2. tenantId_restaurantId_index (复合索引)');
    console.log('    3. status_updatedAt_index (复合索引)');
    console.log('========================================\n');

    return {
      code: 0,
      message: '菜单展示配置数据库集合创建成功',
      summary: {
        totalCollections: 1,
        successfulCollections: successCount,
        failedCollections: 1 - successCount,
        collections: results
      },
      nextSteps: {
        action: '手动创建索引',
        guide: 'Docs/索引配置表.csv',
        totalIndexes: 3
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

