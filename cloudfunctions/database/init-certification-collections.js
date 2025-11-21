/**
 * 认证域集合初始化脚本
 * 
 * 功能: 创建气候餐厅认证相关的数据库集合
 * 
 * 集合列表:
 * 1. certification_applications - 认证申请主表
 * 2. certification_stages - 认证阶段记录
 * 3. certification_badges - 认证证书
 * 4. certification_documents - 认证资料文件
 * 5. certification_materials - 认证资料维护记录
 * 6. certification_inspections - 人工抽检记录
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"initCertificationCollections"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 创建集合的通用函数
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
 * 主函数
 */
async function initCertificationCollections() {
  console.log('===== 开始初始化认证域集合 =====\n');
  
  const results = [];
  
  try {
    // 1. 创建 certification_applications 集合
    console.log('[1/5] 创建 certification_applications 集合...');
    const result1 = await createCollection('certification_applications');
    results.push(result1);
    
    // 2. 创建 certification_stages 集合
    console.log('[2/5] 创建 certification_stages 集合...');
    const result2 = await createCollection('certification_stages');
    results.push(result2);
    
    // 3. 创建 certification_badges 集合
    console.log('[3/5] 创建 certification_badges 集合...');
    const result3 = await createCollection('certification_badges');
    results.push(result3);
    
    // 4. 创建 certification_documents 集合
    console.log('[4/5] 创建 certification_documents 集合...');
    const result4 = await createCollection('certification_documents');
    results.push(result4);
    
    // 5. 创建 certification_materials 集合
    console.log('[5/6] 创建 certification_materials 集合...');
    const result5 = await createCollection('certification_materials');
    results.push(result5);
    
    // 6. 创建 certification_inspections 集合（人工抽检记录）
    console.log('[6/6] 创建 certification_inspections 集合...');
    const result6 = await createCollection('certification_inspections');
    results.push(result6);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const existsCount = results.filter(r => r.status === 'exists').length;
    
    console.log('\n===== 认证域集合初始化完成 =====');
    console.log(`✅ 成功创建: ${successCount} 个集合`);
    console.log(`ℹ️  已存在: ${existsCount} 个集合`);
    console.log(`❌ 失败: ${results.length - successCount - existsCount} 个集合`);
    console.log('========================================\n');
    console.log('⚠️  重要提示：');
    console.log('索引需要在云开发控制台手动创建');
    console.log('请参考文档：Docs/数据库索引配置v5.0.md');
    console.log('========================================\n');
    
    return {
      code: 0,
      message: '认证域集合初始化成功',
      summary: {
        totalCollections: 6,
        successfulCollections: successCount,
        existingCollections: existsCount,
        failedCollections: results.length - successCount - existsCount,
        collections: results
      },
      nextSteps: {
        action: '手动创建索引',
        guide: 'Docs/数据库索引配置v5.0.md',
        collections: [
          'certification_applications',
          'certification_stages',
          'certification_badges',
          'certification_documents',
          'certification_materials',
          'certification_inspections'
        ]
      }
    };
    
  } catch (error) {
    console.error('❌ 认证域集合初始化失败:', error);
    return {
      code: 500,
      message: '初始化失败',
      error: error.message,
      results
    };
  }
}

// 支持作为独立模块调用
if (require.main === module) {
  initCertificationCollections().then(result => {
    console.log('\n最终结果:', JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('\n执行失败:', err);
  });
}

// 导出主函数
exports.main = initCertificationCollections;

