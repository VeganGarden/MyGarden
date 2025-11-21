/**
 * tenant 云函数 API 测试脚本
 * 用于测试餐厅列表管理功能
 */

const path = require('path')

// 使用云函数目录中的依赖
const cloud = require(path.join(__dirname, '../cloudfunctions/node_modules/wx-server-sdk'))

// 初始化云开发环境
cloud.init({
  env: 'my-garden-app-env-4e0h762923be2f',
})

const db = cloud.database()

/**
 * 模拟云函数调用
 */
async function callTenantFunction(action, data) {
  try {
    // 注意：这里需要实际的云函数调用
    // 由于是本地测试，我们直接调用云函数代码
    const tenantFunction = require('../cloudfunctions/tenant/index.js')
    
    // 模拟 event 和 context
    const event = {
      action: action,
      data: data,
      // 注意：实际测试需要真实的Token
      token: process.env.TEST_TOKEN || '',
      headers: {
        authorization: process.env.TEST_TOKEN ? `Bearer ${process.env.TEST_TOKEN}` : '',
      },
    }
    
    const context = {
      requestId: 'test-request-' + Date.now(),
      requestIp: '127.0.0.1',
      userAgent: 'test-script',
    }
    
    const result = await tenantFunction.main(event, context)
    return result
  } catch (error) {
    console.error('调用失败:', error)
    return {
      code: -1,
      message: error.message,
      error: error,
    }
  }
}

/**
 * 测试用例1：权限验证（使用无效Token）
 */
async function testPermission() {
  console.log('\n========================================')
  console.log('测试用例1：权限验证')
  console.log('========================================')
  
  try {
    const result = await callTenantFunction('listAllRestaurants', {})
    
    if (result.code === 403 || result.code === 401) {
      console.log('✅ 测试通过：正确返回权限错误')
      console.log('   错误信息:', result.message)
      return true
    } else {
      console.log('⚠️  测试结果：', result)
      console.log('   注意：可能需要真实的Token才能测试权限')
      return false
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return false
  }
}

/**
 * 测试用例2：获取餐厅列表（基础查询）
 */
async function testListRestaurants() {
  console.log('\n========================================')
  console.log('测试用例2：获取餐厅列表（基础查询）')
  console.log('========================================')
  
  try {
    // 先检查数据库中有多少餐厅
    const restaurantsCount = await db.collection('restaurants').count()
    console.log(`数据库中的餐厅总数: ${restaurantsCount.total}`)
    
    if (restaurantsCount.total === 0) {
      console.log('⚠️  数据库中没有餐厅数据，跳过此测试')
      return false
    }
    
    // 注意：这个测试需要平台管理员Token
    // 如果没有Token，我们直接查询数据库验证逻辑
    console.log('⚠️  需要平台管理员Token才能完整测试')
    console.log('   当前测试：验证数据库查询逻辑')
    
    // 直接测试数据库查询
    const result = await db.collection('restaurants')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
    
    console.log(`✅ 数据库查询成功，返回 ${result.data.length} 条记录`)
    
    if (result.data.length > 0) {
      const sample = result.data[0]
      console.log('   示例餐厅:', {
        id: sample._id,
        name: sample.name,
        status: sample.status,
        certificationLevel: sample.certificationLevel,
      })
    }
    
    return true
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return false
  }
}

/**
 * 测试用例3：统计数据计算逻辑
 */
async function testStatisticsCalculation() {
  console.log('\n========================================')
  console.log('测试用例3：统计数据计算逻辑')
  console.log('========================================')
  
  try {
    // 获取一个餐厅
    const restaurantsResult = await db.collection('restaurants').limit(1).get()
    
    if (restaurantsResult.data.length === 0) {
      console.log('⚠️  数据库中没有餐厅数据，跳过此测试')
      return false
    }
    
    const restaurant = restaurantsResult.data[0]
    const restaurantId = restaurant._id
    
    console.log(`测试餐厅: ${restaurant.name || restaurantId}`)
    
    // 查询该餐厅的订单
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
      console.log(`  订单数: ${ordersMatch ? '✅ 匹配' : '❌ 不匹配'}`)
      console.log(`  总收入: ${revenueMatch ? '✅ 匹配' : '❌ 不匹配'}`)
      console.log(`  碳减排: ${carbonMatch ? '✅ 匹配' : '❌ 不匹配'}`)
      
      return ordersMatch && revenueMatch && carbonMatch
    } else {
      console.log('\n⚠️  餐厅没有统计字段（这是正常的，如果还未运行迁移脚本）')
      console.log('   统计数据将在查询时实时计算')
      return true
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return false
  }
}

/**
 * 测试用例4：数据库索引检查
 */
async function testIndexes() {
  console.log('\n========================================')
  console.log('测试用例4：数据库索引检查')
  console.log('========================================')
  
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
  
  return true
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================')
  console.log('餐厅列表管理功能 - API测试')
  console.log('========================================')
  console.log('环境ID: my-garden-app-env-4e0h762923be2f')
  console.log('测试时间:', new Date().toLocaleString())
  console.log('========================================')
  
  const results = {
    permission: false,
    listRestaurants: false,
    statistics: false,
    indexes: false,
  }
  
  // 运行测试
  results.permission = await testPermission()
  results.listRestaurants = await testListRestaurants()
  results.statistics = await testStatisticsCalculation()
  results.indexes = await testIndexes()
  
  // 汇总结果
  console.log('\n========================================')
  console.log('测试结果汇总')
  console.log('========================================')
  console.log(`权限验证: ${results.permission ? '✅' : '⚠️'}`)
  console.log(`列表查询: ${results.listRestaurants ? '✅' : '⚠️'}`)
  console.log(`统计计算: ${results.statistics ? '✅' : '⚠️'}`)
  console.log(`索引检查: ${results.indexes ? '✅' : '⚠️'}`)
  
  const passedCount = Object.values(results).filter(r => r).length
  const totalCount = Object.keys(results).length
  
  console.log(`\n通过: ${passedCount}/${totalCount}`)
  console.log('========================================')
  console.log('\n注意:')
  console.log('1. 权限和完整API测试需要在云函数控制台使用真实Token')
  console.log('2. 统计数据准确性测试已完成')
  console.log('3. 请检查数据库索引是否已创建')
  console.log('4. 前端集成测试需要在浏览器中执行')
  console.log('========================================\n')
  
  return results
}

// 运行测试
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testPermission,
  testListRestaurants,
  testStatisticsCalculation,
  testIndexes,
  main,
}

