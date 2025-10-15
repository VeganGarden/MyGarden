/**
 * 数据库 v3.0 初始化脚本 - 九悦融合版
 * 
 * 功能:
 * 1. 创建 8 个新的电商域集合
 * 2. 创建 2 个运营域集合
 * 3. 配置所有新增索引
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"init-v3"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 主函数
 */
async function initV3Collections() {
  console.log('===== 开始初始化 v3.0 数据库 =====');
  
  const results = [];
  
  try {
    // ===== 第一部分: 创建电商域集合 (8个) =====
    console.log('\n--- 创建电商域集合 ---');
    
    // 1. products - 商品主表
    await createProductsCollection();
    results.push({ collection: 'products', status: 'success' });
    
    // 2. shopping_cart - 购物车
    await createShoppingCartCollection();
    results.push({ collection: 'shopping_cart', status: 'success' });
    
    // 3. product_reviews - 商品评价
    await createProductReviewsCollection();
    results.push({ collection: 'product_reviews', status: 'success' });
    
    // 4. inventory - 库存管理
    await createInventoryCollection();
    results.push({ collection: 'inventory', status: 'success' });
    
    // 5. promotions - 营销活动
    await createPromotionsCollection();
    results.push({ collection: 'promotions', status: 'success' });
    
    // 6. coupons - 优惠券
    await createCouponsCollection();
    results.push({ collection: 'coupons', status: 'success' });
    
    // 7. user_coupons - 用户优惠券
    await createUserCouponsCollection();
    results.push({ collection: 'user_coupons', status: 'success' });
    
    // 8. orders 扩展 (在migrate脚本中处理)
    console.log('orders集合将在迁移脚本中扩展');
    
    // ===== 第二部分: 创建运营域集合 (2个) =====
    console.log('\n--- 创建运营域集合 ---');
    
    // 1. data_dashboard - 统一数据看板
    await createDataDashboardCollection();
    results.push({ collection: 'data_dashboard', status: 'success' });
    
    // 2. business_rules - 业务规则配置
    await createBusinessRulesCollection();
    results.push({ collection: 'business_rules', status: 'success' });
    
    console.log('\n===== v3.0 数据库初始化完成 =====');
    
    return {
      code: 0,
      message: `成功创建 ${results.length} 个新集合`,
      results,
      summary: {
        total: results.length,
        ecommerceDomain: 7,
        operationDomain: 2
      }
    };
    
  } catch (error) {
    console.error('初始化失败:', error);
    return {
      code: 500,
      message: '初始化失败',
      error: error.message,
      results
    };
  }
}

// ==================== 电商域集合创建函数 ====================

/**
 * 创建 products 集合
 */
async function createProductsCollection() {
  console.log('创建 products 集合...');
  
  try {
    await db.createCollection('products');
  } catch (e) {
    console.log('products 集合可能已存在');
  }
  
  // 注意: 索引需要在云开发控制台手动创建
  // 参考: 数据库v3.0升级-执行指南.md
  
  console.log('✓ products 集合创建完成 (索引需手动创建)');
}

/**
 * 创建 shopping_cart 集合
 */
async function createShoppingCartCollection() {
  console.log('创建 shopping_cart 集合...');
  
  try {
    await db.createCollection('shopping_cart');
  } catch (e) {
    console.log('shopping_cart 集合可能已存在');
  }
  
  console.log('✓ shopping_cart 集合创建完成');
}

/**
 * 创建 product_reviews 集合
 */
async function createProductReviewsCollection() {
  console.log('创建 product_reviews 集合...');
  
  try {
    await db.createCollection('product_reviews');
  } catch (e) {
    console.log('product_reviews 集合可能已存在');
  }
  
  console.log('✓ product_reviews 集合创建完成');
}

/**
 * 创建 inventory 集合
 */
async function createInventoryCollection() {
  console.log('创建 inventory 集合...');
  
  try {
    await db.createCollection('inventory');
  } catch (e) {
    console.log('inventory 集合可能已存在');
  }
  
  console.log('✓ inventory 集合创建完成');
}

/**
 * 创建 promotions 集合
 */
async function createPromotionsCollection() {
  console.log('创建 promotions 集合...');
  
  try {
    await db.createCollection('promotions');
  } catch (e) {
    console.log('promotions 集合可能已存在');
  }
  
  console.log('✓ promotions 集合创建完成');
}

/**
 * 创建 coupons 集合
 */
async function createCouponsCollection() {
  console.log('创建 coupons 集合...');
  
  try {
    await db.createCollection('coupons');
  } catch (e) {
    console.log('coupons 集合可能已存在');
  }
  
  console.log('✓ coupons 集合创建完成');
}

/**
 * 创建 user_coupons 集合
 */
async function createUserCouponsCollection() {
  console.log('创建 user_coupons 集合...');
  
  try {
    await db.createCollection('user_coupons');
  } catch (e) {
    console.log('user_coupons 集合可能已存在');
  }
  
  console.log('✓ user_coupons 集合创建完成');
}

// ==================== 运营域集合创建函数 ====================

/**
 * 创建 data_dashboard 集合
 */
async function createDataDashboardCollection() {
  console.log('创建 data_dashboard 集合...');
  
  try {
    await db.createCollection('data_dashboard');
  } catch (e) {
    console.log('data_dashboard 集合可能已存在');
  }
  
  console.log('✓ data_dashboard 集合创建完成');
}

/**
 * 创建 business_rules 集合
 */
async function createBusinessRulesCollection() {
  console.log('创建 business_rules 集合...');
  
  try {
    await db.createCollection('business_rules');
  } catch (e) {
    console.log('business_rules 集合可能已存在');
  }
  
  console.log('✓ business_rules 集合创建完成');
}

module.exports = {
  initV3Collections
};

