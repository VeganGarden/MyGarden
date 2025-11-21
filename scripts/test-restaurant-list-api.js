/**
 * 餐厅列表管理功能测试脚本
 * 
 * 使用方法：
 * node scripts/test-restaurant-list-api.js
 * 
 * 注意：需要先设置环境变量或修改代码中的环境ID和Token
 */

const cloud = require('wx-server-sdk')

// 配置环境
const ENV_ID = process.env.CLOUDBASE_ENVID || 'my-garden-app-env-4e0h762923be2f'
cloud.init({
  env: ENV_ID,
})

const db = cloud.database()

/**
 * 测试用例1：权限验证
 */
async function testPermission() {
  console.log('\n=== 测试用例1：权限验证 ===')
  
  // 注意：这里需要实际的Token，实际测试时应该从登录接口获取
  // 这里只是示例，实际测试需要在管理后台获取Token
  console.log('⚠️  需要实际的平台管理员Token才能测试')
  console.log('   请在管理后台登录后，从浏览器开发者工具中获取Token')
}

/**
 * 测试用例2：获取餐厅列表
 */
async function testListRestaurants() {
  console.log('\n=== 测试用例2：获取餐厅列表 ===')
  
  try {
    // 直接调用云函数（需要Token）
    // 这里只是示例结构
    console.log('测试参数:')
    console.log({
      action: 'listAllRestaurants',
      data: {
        page: 1,
        pageSize: 10,
      },
    })
    console.log('\n⚠️  需要在云函数控制台或使用实际Token测试')
  } catch (error) {
    console.error('测试失败:', error)
  }
}

/**
 * 测试用例3：统计数据准确性
 */
async function testStatisticsAccuracy() {
  console.log('\n=== 测试用例3：统计数据准确性 ===')
  
  try {
    // 获取一个餐厅
    const restaurantsResult = await db.collection('restaurants').limit(1).get()
    
    if (restaurantsResult.data.length === 0) {
      console.log('⚠️  数据库中没有餐厅数据')
      return
    }
    
    const restaurant = restaurantsResult.data[0]
    const restaurantId = restaurant._id
    
    console.log(`测试餐厅: ${restaurant.name || restaurantId}`)
    
    // 手动计算统计数据
    const ordersResult = await db
      .collection('restaurant_orders')
      .where({
        restaurantId: restaurantId,
      })
      .field({
        'pricing.total': true,
        'carbonFootprint.reduction': true,
      })
      .get()
    
    const orders = ordersResult.data || []
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.pricing?.total || 0)
    }, 0)
    const totalCarbonReduction = orders.reduce((sum, order) => {
      return sum + (order.carbonFootprint?.reduction || 0)
    }, 0)
    
    console.log('\n手动计算结果:')
    console.log(`  订单数: ${totalOrders}`)
    console.log(`  总收入: ${totalRevenue.toFixed(2)}`)
    console.log(`  碳减排: ${totalCarbonReduction.toFixed(2)}`)
    
    // 检查餐厅是否有统计字段
    if (restaurant.stats) {
      console.log('\n数据库中的统计字段:')
      console.log(`  订单数: ${restaurant.stats.totalOrders || 0}`)
      console.log(`  总收入: ${restaurant.stats.totalRevenue || 0}`)
      console.log(`  碳减排: ${restaurant.stats.totalCarbonReduction || 0}`)
      
      // 对比
      const ordersMatch = totalOrders === (restaurant.stats.totalOrders || 0)
      const revenueMatch = Math.abs(totalRevenue - (restaurant.stats.totalRevenue || 0)) < 0.01
      const carbonMatch = Math.abs(totalCarbonReduction - (restaurant.stats.totalCarbonReduction || 0)) < 0.01
      
      console.log('\n对比结果:')
      console.log(`  订单数: ${ordersMatch ? '✅' : '❌'}`)
      console.log(`  总收入: ${revenueMatch ? '✅' : '❌'}`)
      console.log(`  碳减排: ${carbonMatch ? '✅' : '❌'}`)
    } else {
      console.log('\n⚠️  餐厅没有统计字段，需要运行迁移脚本')
    }
  } catch (error) {
    console.error('测试失败:', error)
  }
}

/**
 * 测试用例4：数据库索引检查
 */
async function testIndexes() {
  console.log('\n=== 测试用例4：数据库索引检查 ===')
  
  console.log('建议的索引:')
  console.log('1. restaurants 集合:')
  console.log('   - status (升序)')
  console.log('   - certificationLevel (升序)')
  console.log('   - name (文本索引，用于搜索)')
  console.log('   - 复合索引: { status: 1, certificationLevel: 1 }')
  console.log('\n2. restaurant_orders 集合:')
  console.log('   - restaurantId (升序)')
  console.log('   - 复合索引: { restaurantId: 1, createdAt: -1 }')
  
  console.log('\n⚠️  索引需要在云开发控制台手动创建')
  console.log('   请参考: Docs/数据库索引创建手册.md')
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================')
  console.log('餐厅列表管理功能测试脚本')
  console.log('========================================')
  console.log(`环境ID: ${ENV_ID}`)
  console.log('========================================')
  
  // 运行测试
  await testPermission()
  await testListRestaurants()
  await testStatisticsAccuracy()
  await testIndexes()
  
  console.log('\n========================================')
  console.log('测试脚本执行完成')
  console.log('========================================')
  console.log('\n注意:')
  console.log('1. 权限和API测试需要在云函数控制台或使用实际Token')
  console.log('2. 统计数据准确性测试已完成')
  console.log('3. 请检查数据库索引是否已创建')
  console.log('========================================\n')
}

// 运行
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testPermission,
  testListRestaurants,
  testStatisticsAccuracy,
  testIndexes,
}

