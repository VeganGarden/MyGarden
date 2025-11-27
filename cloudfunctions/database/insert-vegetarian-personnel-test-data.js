/**
 * 为素食人员管理模块插入测试数据
 * 
 * 插入内容:
 * 1. 餐厅员工数据 (restaurant_staff) - 包含素食和非素食员工
 * 2. 餐厅客户数据 (restaurant_customers) - 包含素食和非素食客户
 * 
 * 执行方式:
 * 在云开发控制台调用 database 云函数，action 设置为 "insertVegetarianPersonnelTestData"
 * 
 * 参数说明:
 * - restaurantId (可选): 指定餐厅ID，如果不提供则查找"素开心"和"素欢乐"餐厅
 * - tenantId (可选): 指定租户ID，如果不提供则从餐厅数据中获取
 * - staffCount (可选): 要插入的员工数量，默认 10
 * - customerCount (可选): 要插入的客户数量，默认 20
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 生成员工ID
 */
function generateStaffId(index) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `STAFF-${dateStr}-${random}-${index}`;
}

/**
 * 生成客户ID
 */
function generateCustomerId(index) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(6, '0');
  return `CUST-${dateStr}-${random}-${index}`;
}

/**
 * 素食类型列表
 */
const VEGETARIAN_TYPES = [
  'pure',           // 纯素
  'lacto_vegetarian',  // 奶素
  'ovo_vegetarian',    // 蛋素
  'lacto_ovo_vegetarian', // 蛋奶素
  'pollo_vegetarian',  // 禽素
  'pescetarian',     // 鱼素
  'flexitarian',     // 弹性素食
  'regular',         // 常态素食
  'occasional'       // 偶尔素食
];

/**
 * 素食原因列表
 */
const VEGETARIAN_REASONS = [
  'health',        // 健康
  'environment',   // 环保
  'religion',      // 宗教
  'ethics',        // 伦理
  'taste',         // 口味偏好
  'other'          // 其他
];

/**
 * 岗位列表
 */
const POSITIONS = [
  '服务员',
  '收银员',
  '厨师',
  '助理厨师',
  '店长',
  '副店长',
  '采购员',
  '清洁工',
  '配送员',
  '经理'
];

/**
 * 生成员工测试数据
 */
function generateStaffData(restaurantId, tenantId, index, isVegetarian = null) {
  // 随机决定是否为素食者（如果不是强制指定）
  const shouldBeVegetarian = isVegetarian !== null 
    ? isVegetarian 
    : Math.random() > 0.5;
  
  const staffId = generateStaffId(index);
  const joinDate = new Date();
  joinDate.setMonth(joinDate.getMonth() - Math.floor(Math.random() * 24)); // 0-24个月前入职
  
  const staffData = {
    staffId,
    restaurantId,
    tenantId,
    basicInfo: {
      name: `员工${index + 1}`,
      position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      joinDate: joinDate.toISOString().slice(0, 10),
      phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      email: `staff${index + 1}@example.com`
    },
    vegetarianInfo: {
      isVegetarian: shouldBeVegetarian
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false
  };
  
  // 如果是素食者，添加素食相关信息
  if (shouldBeVegetarian) {
    const vegetarianStartYear = 2020 + Math.floor(Math.random() * 5); // 2020-2024年开始素食
    staffData.vegetarianInfo = {
      ...staffData.vegetarianInfo,
      vegetarianType: VEGETARIAN_TYPES[Math.floor(Math.random() * VEGETARIAN_TYPES.length)],
      vegetarianStartYear,
      vegetarianReason: VEGETARIAN_REASONS[Math.floor(Math.random() * VEGETARIAN_REASONS.length)],
      notes: `素食年限: ${new Date().getFullYear() - vegetarianStartYear} 年`
    };
  }
  
  return staffData;
}

/**
 * 生成客户测试数据
 */
function generateCustomerData(restaurantId, tenantId, index, isVegetarian = null) {
  // 随机决定是否为素食者（如果不是强制指定）
  const shouldBeVegetarian = isVegetarian !== null 
    ? isVegetarian 
    : Math.random() > 0.6; // 60% 概率是素食者
  
  const customerId = generateCustomerId(index);
  const createdAt = new Date();
  createdAt.setMonth(createdAt.getMonth() - Math.floor(Math.random() * 12)); // 0-12个月前注册
  
  const customerData = {
    customerId,
    tenantId,
    restaurantId: restaurantId || undefined,
    basicInfo: {
      nickname: `客户${index + 1}`,
      phone: `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      wechatOpenId: `wx_openid_${Math.random().toString(36).substring(7)}`
    },
    vegetarianInfo: {
      isVegetarian: shouldBeVegetarian,
      totalOrders: Math.floor(Math.random() * 50) + 1,
      totalVegetarianOrders: 0
    },
    createdAt,
    updatedAt: createdAt
  };
  
  // 如果是素食者，添加素食相关信息
  if (shouldBeVegetarian) {
    const vegetarianStartYear = 2018 + Math.floor(Math.random() * 7); // 2018-2024年开始素食
    const vegetarianYears = new Date().getFullYear() - vegetarianStartYear;
    const vegetarianYearsRange = 
      vegetarianYears <= 1 ? '0_1' :
      vegetarianYears <= 3 ? '1_3' :
      vegetarianYears <= 5 ? '3_5' :
      vegetarianYears <= 10 ? '5_10' : '10_plus';
    
    customerData.vegetarianInfo = {
      ...customerData.vegetarianInfo,
      vegetarianType: VEGETARIAN_TYPES[Math.floor(Math.random() * VEGETARIAN_TYPES.length)],
      vegetarianStartYear,
      vegetarianYears: vegetarianYearsRange,
      vegetarianReason: VEGETARIAN_REASONS[Math.floor(Math.random() * VEGETARIAN_REASONS.length)],
      totalVegetarianOrders: Math.floor(customerData.vegetarianInfo.totalOrders * (0.7 + Math.random() * 0.3)),
      lastOrderDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // 0-30天前
    };
  } else {
    // 非素食者也可能有部分素食订单
    customerData.vegetarianInfo.totalVegetarianOrders = Math.floor(
      customerData.vegetarianInfo.totalOrders * Math.random() * 0.3
    );
    customerData.vegetarianInfo.lastOrderDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
  }
  
  return customerData;
}

/**
 * 插入素食人员测试数据
 */
async function insertVegetarianPersonnelTestData(event = {}) {
  const {
    restaurantId,
    tenantId,
    staffCount = 10,
    customerCount = 20
  } = event;
  
  console.log('========================================');
  console.log('开始插入素食人员管理模块测试数据...');
  console.log('========================================\n');
  console.log(`配置:`);
  console.log(`  - 员工数量: ${staffCount}`);
  console.log(`  - 客户数量: ${customerCount}`);
  console.log(`  - 餐厅ID: ${restaurantId || '自动查找'}`);
  console.log(`  - 租户ID: ${tenantId || '自动获取'}`);
  console.log('');
  
  const results = {
    staff: [],
    customers: [],
    restaurants: []
  };
  
  try {
    // 1. 查找或确定餐厅信息
    let restaurants = [];
    if (restaurantId) {
      console.log(`[1/3] 查找指定餐厅 (ID: ${restaurantId})...`);
      const restaurantResult = await db.collection('restaurants')
        .doc(restaurantId)
        .get();
      
      if (!restaurantResult.data) {
        return {
          code: 404,
          message: `未找到餐厅 (ID: ${restaurantId})`
        };
      }
      
      restaurants = [restaurantResult.data];
      console.log(`  ✓ 找到餐厅: ${restaurantResult.data.name || restaurantId}`);
    } else {
      console.log('[1/3] 查找餐厅（素开心、素欢乐）...');
      const restaurantsResult = await db.collection('restaurants')
        .where({
          name: _.in(['素开心', '素欢乐'])
        })
        .get();
      
      if (restaurantsResult.data.length === 0) {
        return {
          code: 404,
          message: '未找到"素开心"或"素欢乐"餐厅，请先创建餐厅或指定 restaurantId'
        };
      }
      
      restaurants = restaurantsResult.data;
      console.log(`  ✓ 找到 ${restaurants.length} 个餐厅`);
      restaurants.forEach(r => {
        console.log(`    - ${r.name} (ID: ${r._id}, 租户: ${r.tenantId})`);
      });
    }
    
    // 处理每个餐厅
    for (const restaurant of restaurants) {
      const currentRestaurantId = restaurant._id || restaurantId;
      const currentTenantId = tenantId || restaurant.tenantId;
      
      if (!currentTenantId) {
        console.log(`  ⚠️  跳过餐厅 ${restaurant.name || currentRestaurantId}，缺少租户ID`);
        continue;
      }
      
      console.log(`\n处理餐厅: ${restaurant.name || currentRestaurantId}`);
      console.log(`租户ID: ${currentTenantId}`);
      
      // 2. 插入员工数据
      console.log(`\n[2/3] 为餐厅插入 ${staffCount} 个员工...`);
      const staffBatch = [];
      
      // 确保有素食和非素食员工
      for (let i = 0; i < staffCount; i++) {
        let isVegetarian = null;
        if (i === 0) {
          isVegetarian = true;  // 第一个员工是素食者
        } else if (i === 1) {
          isVegetarian = false; // 第二个员工是非素食者
        }
        // 其他随机
        
        const staffData = generateStaffData(currentRestaurantId, currentTenantId, i, isVegetarian);
        staffBatch.push(staffData);
      }
      
      try {
        const staffResult = await db.collection('restaurant_staff').add({
          data: staffBatch
        });
        console.log(`  ✓ 成功插入 ${staffBatch.length} 个员工`);
        results.staff.push({
          restaurantId: currentRestaurantId,
          restaurantName: restaurant.name,
          count: staffBatch.length
        });
      } catch (error) {
        console.error(`  ❌ 插入员工失败:`, error.message);
        // 尝试逐个插入
        let successCount = 0;
        for (const staff of staffBatch) {
          try {
            await db.collection('restaurant_staff').add({ data: staff });
            successCount++;
          } catch (e) {
            console.error(`    失败: ${staff.staffId} - ${e.message}`);
          }
        }
        console.log(`  ✓ 逐个插入: ${successCount}/${staffBatch.length} 个成功`);
        if (successCount > 0) {
          results.staff.push({
            restaurantId: currentRestaurantId,
            restaurantName: restaurant.name,
            count: successCount
          });
        }
      }
      
      // 3. 插入客户数据
      console.log(`\n[3/3] 为餐厅插入 ${customerCount} 个客户...`);
      const customerBatch = [];
      
      // 确保有素食和非素食客户
      for (let i = 0; i < customerCount; i++) {
        let isVegetarian = null;
        if (i === 0) {
          isVegetarian = true;  // 第一个客户是素食者
        } else if (i === 1) {
          isVegetarian = false; // 第二个客户是非素食者
        }
        // 其他随机
        
        const customerData = generateCustomerData(currentRestaurantId, currentTenantId, i, isVegetarian);
        customerBatch.push(customerData);
      }
      
      try {
        const customerResult = await db.collection('restaurant_customers').add({
          data: customerBatch
        });
        console.log(`  ✓ 成功插入 ${customerBatch.length} 个客户`);
        results.customers.push({
          restaurantId: currentRestaurantId,
          restaurantName: restaurant.name,
          count: customerBatch.length
        });
      } catch (error) {
        console.error(`  ❌ 插入客户失败:`, error.message);
        // 尝试逐个插入
        let successCount = 0;
        for (const customer of customerBatch) {
          try {
            await db.collection('restaurant_customers').add({ data: customer });
            successCount++;
          } catch (e) {
            console.error(`    失败: ${customer.customerId} - ${e.message}`);
          }
        }
        console.log(`  ✓ 逐个插入: ${successCount}/${customerBatch.length} 个成功`);
        if (successCount > 0) {
          results.customers.push({
            restaurantId: currentRestaurantId,
            restaurantName: restaurant.name,
            count: successCount
          });
        }
      }
      
      results.restaurants.push({
        restaurantId: currentRestaurantId,
        restaurantName: restaurant.name,
        tenantId: currentTenantId
      });
    }
    
    // 汇总结果
    const totalStaff = results.staff.reduce((sum, r) => sum + r.count, 0);
    const totalCustomers = results.customers.reduce((sum, r) => sum + r.count, 0);
    
    console.log('\n========================================');
    console.log('✅ 测试数据插入完成！');
    console.log('========================================\n');
    console.log('插入结果:');
    console.log(`  餐厅数量: ${results.restaurants.length}`);
    console.log(`  员工总数: ${totalStaff}`);
    console.log(`  客户总数: ${totalCustomers}\n`);
    
    results.restaurants.forEach(r => {
      const staffCount = results.staff.find(s => s.restaurantId === r.restaurantId)?.count || 0;
      const customerCount = results.customers.find(c => c.restaurantId === r.restaurantId)?.count || 0;
      console.log(`  ${r.restaurantName || r.restaurantId}:`);
      console.log(`    - 员工: ${staffCount} 个`);
      console.log(`    - 客户: ${customerCount} 个`);
    });
    
    return {
      code: 0,
      message: '测试数据插入成功',
      results: {
        restaurants: results.restaurants.length,
        staff: totalStaff,
        customers: totalCustomers,
        details: results
      }
    };
    
  } catch (error) {
    console.error('❌ 插入测试数据失败:', error);
    return {
      code: 500,
      message: '插入测试数据失败',
      error: error.message
    };
  }
}

exports.main = insertVegetarianPersonnelTestData;

