/**
 * 数据库 v4.0 初始化脚本 - 气候餐厅版
 * 
 * 功能:
 * 1. 创建 8 个餐厅域集合
 * 2. 创建 4 个碳普惠域集合
 * 3. 创建 3 个政府合作域集合
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"init-v4"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 主函数
 */
async function initV4Collections() {
  console.log('===== 开始初始化 v4.0 数据库 - 气候餐厅版 =====');
  
  const results = [];
  
  try {
    // ===== 第一部分: 创建餐厅域集合 (8个) =====
    console.log('\n--- 创建餐厅域集合 ---');
    
    // 1. restaurants - 餐厅主表
    await createRestaurantsCollection();
    results.push({ collection: 'restaurants', status: 'success' });
    
    // 2. restaurant_menus - 餐厅菜单
    await createRestaurantMenusCollection();
    results.push({ collection: 'restaurant_menus', status: 'success' });
    
    // 3. restaurant_menu_items - 菜品明细
    await createRestaurantMenuItemsCollection();
    results.push({ collection: 'restaurant_menu_items', status: 'success' });
    
    // 4. restaurant_orders - 餐厅订单
    await createRestaurantOrdersCollection();
    results.push({ collection: 'restaurant_orders', status: 'success' });
    
    // 5. restaurant_reservations - 餐厅预订
    await createRestaurantReservationsCollection();
    results.push({ collection: 'restaurant_reservations', status: 'success' });
    
    // 6. restaurant_members - 餐厅会员
    await createRestaurantMembersCollection();
    results.push({ collection: 'restaurant_members', status: 'success' });
    
    // 7. restaurant_campaigns - 餐厅营销活动
    await createRestaurantCampaignsCollection();
    results.push({ collection: 'restaurant_campaigns', status: 'success' });
    
    // 8. restaurant_reviews - 餐厅评价
    await createRestaurantReviewsCollection();
    results.push({ collection: 'restaurant_reviews', status: 'success' });
    
    // ===== 第二部分: 创建碳普惠域集合 (4个) =====
    console.log('\n--- 创建碳普惠域集合 ---');
    
    // 1. carbon_credits - 碳积分账户
    await createCarbonCreditsCollection();
    results.push({ collection: 'carbon_credits', status: 'success' });
    
    // 2. carbon_transactions - 碳积分交易
    await createCarbonTransactionsCollection();
    results.push({ collection: 'carbon_transactions', status: 'success' });
    
    // 3. carbon_exchange_records - 碳交易所对接
    await createCarbonExchangeRecordsCollection();
    results.push({ collection: 'carbon_exchange_records', status: 'success' });
    
    // 4. carbon_milestones - 碳减排里程碑
    await createCarbonMilestonesCollection();
    results.push({ collection: 'carbon_milestones', status: 'success' });
    
    // ===== 第三部分: 创建政府合作域集合 (3个) =====
    console.log('\n--- 创建政府合作域集合 ---');
    
    // 1. government_programs - 政府激励项目
    await createGovernmentProgramsCollection();
    results.push({ collection: 'government_programs', status: 'success' });
    
    // 2. public_participation - 公众参与记录
    await createPublicParticipationCollection();
    results.push({ collection: 'public_participation', status: 'success' });
    
    // 3. esg_reports - ESG 影响力报告
    await createEsgReportsCollection();
    results.push({ collection: 'esg_reports', status: 'success' });
    
    console.log('\n===== v4.0 数据库初始化完成 =====');
    console.log(`\n✅ 成功创建 ${results.length} 个新集合\n`);
    console.log('📋 新增域:');
    console.log('   - 餐厅域: 8个集合');
    console.log('   - 碳普惠域: 4个集合');
    console.log('   - 政府合作域: 3个集合');
    console.log('\n⚠️  注意: 索引需要在云开发控制台手动创建');
    console.log('📖 参考: Docs/数据库索引配置v4.0.md\n');
    
    return {
      code: 0,
      message: `v4.0 数据库初始化成功 - 创建 ${results.length} 个新集合`,
      results,
      summary: {
        total: results.length,
        restaurantDomain: 8,
        carbonInclusiveDomain: 4,
        governmentDomain: 3
      }
    };
    
  } catch (error) {
    console.error('初始化失败:', error);
    return {
      code: 500,
      message: 'v4.0 数据库初始化失败',
      error: error.message,
      results
    };
  }
}

// ==================== 餐厅域集合创建函数 ====================

/**
 * 创建 restaurants 集合
 */
async function createRestaurantsCollection() {
  console.log('创建 restaurants 集合...');
  
  try {
    await db.createCollection('restaurants');
  } catch (e) {
    console.log('restaurants 集合可能已存在');
  }
  
  console.log('✓ restaurants 集合创建完成');
}

/**
 * 创建 restaurant_menus 集合
 */
async function createRestaurantMenusCollection() {
  console.log('创建 restaurant_menus 集合...');
  
  try {
    await db.createCollection('restaurant_menus');
  } catch (e) {
    console.log('restaurant_menus 集合可能已存在');
  }
  
  console.log('✓ restaurant_menus 集合创建完成');
}

/**
 * 创建 restaurant_menu_items 集合
 */
async function createRestaurantMenuItemsCollection() {
  console.log('创建 restaurant_menu_items 集合...');
  
  try {
    await db.createCollection('restaurant_menu_items');
  } catch (e) {
    console.log('restaurant_menu_items 集合可能已存在');
  }
  
  console.log('✓ restaurant_menu_items 集合创建完成');
}

/**
 * 创建 restaurant_orders 集合
 */
async function createRestaurantOrdersCollection() {
  console.log('创建 restaurant_orders 集合...');
  
  try {
    await db.createCollection('restaurant_orders');
  } catch (e) {
    console.log('restaurant_orders 集合可能已存在');
  }
  
  console.log('✓ restaurant_orders 集合创建完成');
}

/**
 * 创建 restaurant_reservations 集合
 */
async function createRestaurantReservationsCollection() {
  console.log('创建 restaurant_reservations 集合...');
  
  try {
    await db.createCollection('restaurant_reservations');
  } catch (e) {
    console.log('restaurant_reservations 集合可能已存在');
  }
  
  console.log('✓ restaurant_reservations 集合创建完成');
}

/**
 * 创建 restaurant_members 集合
 */
async function createRestaurantMembersCollection() {
  console.log('创建 restaurant_members 集合...');
  
  try {
    await db.createCollection('restaurant_members');
  } catch (e) {
    console.log('restaurant_members 集合可能已存在');
  }
  
  console.log('✓ restaurant_members 集合创建完成');
}

/**
 * 创建 restaurant_campaigns 集合
 */
async function createRestaurantCampaignsCollection() {
  console.log('创建 restaurant_campaigns 集合...');
  
  try {
    await db.createCollection('restaurant_campaigns');
  } catch (e) {
    console.log('restaurant_campaigns 集合可能已存在');
  }
  
  console.log('✓ restaurant_campaigns 集合创建完成');
}

/**
 * 创建 restaurant_reviews 集合
 */
async function createRestaurantReviewsCollection() {
  console.log('创建 restaurant_reviews 集合...');
  
  try {
    await db.createCollection('restaurant_reviews');
  } catch (e) {
    console.log('restaurant_reviews 集合可能已存在');
  }
  
  console.log('✓ restaurant_reviews 集合创建完成');
}

// ==================== 碳普惠域集合创建函数 ====================

/**
 * 创建 carbon_credits 集合
 */
async function createCarbonCreditsCollection() {
  console.log('创建 carbon_credits 集合...');
  
  try {
    await db.createCollection('carbon_credits');
  } catch (e) {
    console.log('carbon_credits 集合可能已存在');
  }
  
  console.log('✓ carbon_credits 集合创建完成');
}

/**
 * 创建 carbon_transactions 集合
 */
async function createCarbonTransactionsCollection() {
  console.log('创建 carbon_transactions 集合...');
  
  try {
    await db.createCollection('carbon_transactions');
  } catch (e) {
    console.log('carbon_transactions 集合可能已存在');
  }
  
  console.log('✓ carbon_transactions 集合创建完成');
}

/**
 * 创建 carbon_exchange_records 集合
 */
async function createCarbonExchangeRecordsCollection() {
  console.log('创建 carbon_exchange_records 集合...');
  
  try {
    await db.createCollection('carbon_exchange_records');
  } catch (e) {
    console.log('carbon_exchange_records 集合可能已存在');
  }
  
  console.log('✓ carbon_exchange_records 集合创建完成');
}

/**
 * 创建 carbon_milestones 集合
 */
async function createCarbonMilestonesCollection() {
  console.log('创建 carbon_milestones 集合...');
  
  try {
    await db.createCollection('carbon_milestones');
  } catch (e) {
    console.log('carbon_milestones 集合可能已存在');
  }
  
  console.log('✓ carbon_milestones 集合创建完成');
}

// ==================== 政府合作域集合创建函数 ====================

/**
 * 创建 government_programs 集合
 */
async function createGovernmentProgramsCollection() {
  console.log('创建 government_programs 集合...');
  
  try {
    await db.createCollection('government_programs');
  } catch (e) {
    console.log('government_programs 集合可能已存在');
  }
  
  console.log('✓ government_programs 集合创建完成');
}

/**
 * 创建 public_participation 集合
 */
async function createPublicParticipationCollection() {
  console.log('创建 public_participation 集合...');
  
  try {
    await db.createCollection('public_participation');
  } catch (e) {
    console.log('public_participation 集合可能已存在');
  }
  
  console.log('✓ public_participation 集合创建完成');
}

/**
 * 创建 esg_reports 集合
 */
async function createEsgReportsCollection() {
  console.log('创建 esg_reports 集合...');
  
  try {
    await db.createCollection('esg_reports');
  } catch (e) {
    console.log('esg_reports 集合可能已存在');
  }
  
  console.log('✓ esg_reports 集合创建完成');
}

module.exports = {
  initV4Collections
};

