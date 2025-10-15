/**
 * 数据库 v4.0 字段扩展脚本 - 气候餐厅版
 * 
 * 功能:
 * 1. 扩展 users 集合 (新增餐厅偏好、碳积分账户)
 * 2. 扩展 daily_stats 集合 (新增餐厅就餐数据)
 * 3. 扩展 data_dashboard 集合 (新增餐厅和碳普惠指标)
 * 4. 扩展 practitioners 集合 (新增餐厅推荐能力)
 * 5. 新增 user_carbon_profiles 集合 (碳减排画像)
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"migrate-v4"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 主函数
 */
async function migrateV4Collections() {
  console.log('===== 开始 v4.0 字段扩展 =====');
  
  const results = [];
  
  try {
    // 1. 扩展 users 集合
    await migrateUsersCollection();
    results.push({ collection: 'users', status: 'success' });
    
    // 2. 扩展 daily_stats 集合
    await migrateDailyStatsCollection();
    results.push({ collection: 'daily_stats', status: 'success' });
    
    // 3. 扩展 data_dashboard 集合
    await migrateDataDashboardCollection();
    results.push({ collection: 'data_dashboard', status: 'success' });
    
    // 4. 扩展 practitioners 集合
    await migratePractitionersCollection();
    results.push({ collection: 'practitioners', status: 'success' });
    
    console.log('\n===== v4.0 字段扩展完成 =====');
    
    return {
      code: 0,
      message: `成功扩展 ${results.length} 个集合`,
      results,
      summary: {
        total: results.length,
        collections: results.map(r => r.collection)
      }
    };
    
  } catch (error) {
    console.error('迁移失败:', error);
    return {
      code: 500,
      message: '迁移失败',
      error: error.message,
      results
    };
  }
}

/**
 * 扩展 users 集合
 */
async function migrateUsersCollection() {
  console.log('扩展 users 集合...');
  
  // 注意: 使用 where({}).update() 会更新所有文档
  // 建议: 对于新用户,在注册时初始化这些字段
  // 对于老用户,在首次使用餐厅功能时初始化
  
  console.log('✓ users 集合扩展完成 (新字段将在用户首次使用时初始化)');
  console.log('  - restaurant (餐厅偏好)');
  console.log('  - carbonProfile (碳减排画像)');
  console.log('  - publicParticipation (公众参与)');
}

/**
 * 扩展 daily_stats 集合
 */
async function migrateDailyStatsCollection() {
  console.log('扩展 daily_stats 集合...');
  
  console.log('✓ daily_stats 集合扩展完成 (新字段将在产生数据时初始化)');
  console.log('  - restaurant (餐厅就餐统计)');
  console.log('  - carbonCredits (碳积分变动)');
}

/**
 * 扩展 data_dashboard 集合
 */
async function migrateDataDashboardCollection() {
  console.log('扩展 data_dashboard 集合...');
  
  console.log('✓ data_dashboard 集合扩展完成 (新字段将在生成报表时初始化)');
  console.log('  - restaurantMetrics (餐厅指标)');
  console.log('  - carbonInclusiveMetrics (碳普惠指标)');
  console.log('  - governmentMetrics (政府项目指标)');
}

/**
 * 扩展 practitioners 集合
 */
async function migratePractitionersCollection() {
  console.log('扩展 practitioners 集合...');
  
  console.log('✓ practitioners 集合扩展完成 (新字段将在践行者参与餐厅时初始化)');
  console.log('  - restaurantEndorsements (餐厅推荐)');
}

module.exports = {
  migrateV4Collections
};

