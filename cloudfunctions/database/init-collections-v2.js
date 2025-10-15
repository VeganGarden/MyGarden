const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 数据库升级脚本 v2.0
 * 
 * 升级内容：
 * 1. 新增6个集合（practitioners、practitioner_certifications、tcm_wisdom、
 *    wisdom_quotes、mentorship、user_profiles_extended、knowledge_graph）
 * 2. 为现有集合添加新字段（见 migrate-collections-v2.js）
 * 
 * 注意：索引需要在云开发控制台手动创建（见《数据库索引配置v2.0.md》）
 */

exports.main = async (event) => {
  const results = [];
  
  console.log('========================================');
  console.log('数据库升级 v2.0 - 新增集合');
  console.log('========================================\n');

  try {
    // 1. 创建 practitioners 集合（践行者档案库）
    console.log('[1/6] 创建 practitioners 集合...');
    const result1 = await createCollection('practitioners');
    results.push(result1);

    // 2. 创建 practitioner_certifications 集合（践行者认证）
    console.log('[2/6] 创建 practitioner_certifications 集合...');
    const result2 = await createCollection('practitioner_certifications');
    results.push(result2);

    // 3. 创建 tcm_wisdom 集合（中医智慧库）
    console.log('[3/6] 创建 tcm_wisdom 集合...');
    const result3 = await createCollection('tcm_wisdom');
    results.push(result3);

    // 4. 创建 wisdom_quotes 集合（智慧语录库）
    console.log('[4/6] 创建 wisdom_quotes 集合...');
    const result4 = await createCollection('wisdom_quotes');
    results.push(result4);

    // 5. 创建 mentorship 集合（导师陪伴关系）
    console.log('[5/6] 创建 mentorship 集合...');
    const result5 = await createCollection('mentorship');
    results.push(result5);

    // 6. 创建 user_profiles_extended 集合（用户扩展档案）
    console.log('[6/6] 创建 user_profiles_extended 集合...');
    const result6 = await createCollection('user_profiles_extended');
    results.push(result6);

    // 7. 创建 knowledge_graph 集合（知识图谱）
    console.log('[7/7] 创建 knowledge_graph 集合...');
    const result7 = await createCollection('knowledge_graph');
    results.push(result7);

    const successCount = results.filter(r => r.status === 'success' || r.status === 'exists').length;

    console.log('\n========================================');
    console.log('✅ 数据库升级 v2.0 - 集合创建完成！');
    console.log('========================================');
    console.log(`成功: ${successCount}/7 个新集合`);
    console.log('========================================\n');
    console.log('📋 下一步操作：');
    console.log('1. 在云开发控制台创建索引（见文档）');
    console.log('2. 执行数据迁移脚本（migrate-collections-v2）');
    console.log('3. 开始录入践行者档案数据');
    console.log('========================================\n');

    return {
      code: 0,
      message: 'v2.0 新集合创建成功',
      version: '2.0',
      summary: {
        totalNewCollections: 7,
        successfulCollections: successCount,
        collections: results
      },
      nextSteps: [
        '在云开发控制台创建索引',
        '执行 migrate-collections-v2 迁移脚本',
        '开始录入践行者档案'
      ]
    };

  } catch (error) {
    console.error('❌ 数据库升级失败:', error);
    return {
      code: 500,
      message: '数据库升级失败',
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
    console.log(`  ✅ ${collectionName} 创建成功`);
    return {
      collection: collectionName,
      status: 'success',
      message: '创建成功'
    };
  } catch (error) {
    // 如果集合已存在，不算错误
    if (error.message && (error.message.includes('already exists') || error.message.includes('已存在'))) {
      console.log(`  ℹ️  ${collectionName} 已存在，跳过创建`);
      return {
        collection: collectionName,
        status: 'exists',
        message: '集合已存在'
      };
    }
    
    console.error(`  ❌ ${collectionName} 创建失败:`, error.message);
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
    process.exit(0);
  }).catch(err => {
    console.error('\n执行失败:', err);
    process.exit(1);
  });
}

