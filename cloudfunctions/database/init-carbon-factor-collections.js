/**
 * 碳排放因子数据库集合初始化脚本
 * 
 * 功能:
 * 1. 创建 carbon_emission_factors 集合
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"initCarbonFactorCollections"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 创建 carbon_emission_factors 集合
 */
async function createCarbonEmissionFactorsCollection() {
  try {
    // 使用 db.createCollection() 创建集合（与其他初始化脚本一致）
    await db.createCollection('carbon_emission_factors');
    console.log('✅ carbon_emission_factors 集合创建成功');
    return { collection: 'carbon_emission_factors', status: 'success' };
  } catch (error) {
    // 如果集合已存在，不算错误
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️  carbon_emission_factors 集合已存在，跳过创建');
      return { collection: 'carbon_emission_factors', status: 'exists', message: '集合已存在' };
    }
    
    console.error('❌ carbon_emission_factors 集合创建失败:', error);
    return { collection: 'carbon_emission_factors', status: 'failed', error: error.message };
  }
}

/**
 * 主函数
 */
exports.main = async (event) => {
  console.log('===== 开始初始化碳排放因子数据库集合 =====\n');
  
  const results = [];
  
  try {
    // 创建 carbon_emission_factors 集合
    const result1 = await createCarbonEmissionFactorsCollection();
    results.push(result1);
    
    console.log('\n===== 碳排放因子数据库集合初始化完成 =====');
    console.log(`\n✅ 成功创建 ${results.filter(r => r.status === 'success').length} 个集合\n`);
    
    console.log('📋 创建的集合:');
    console.log('   - carbon_emission_factors: 碳排放因子库');
    console.log('\n⚠️  注意: 索引需要在控制台手动创建，建议创建以下索引:');
    console.log('   - factorId (唯一索引)');
    console.log('   - category, subCategory');
    console.log('   - source, year');
    console.log('   - region');
    console.log('   - status');
    console.log('   - name (文本索引，用于搜索)');
    console.log('   - createdAt (用于排序)');
    
    return {
      success: true,
      results,
      message: '初始化完成'
    };
  } catch (error) {
    console.error('初始化失败:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
};

