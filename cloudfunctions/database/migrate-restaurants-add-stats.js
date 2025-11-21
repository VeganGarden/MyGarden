/**
 * 数据库迁移：为餐厅添加统计字段
 * 
 * 此脚本为 restaurants 集合中的所有餐厅添加统计字段：
 * - stats.totalOrders - 总订单数
 * - stats.totalRevenue - 总收入
 * - stats.totalCarbonReduction - 总碳减排量
 * - stats.lastUpdatedAt - 最后更新时间
 * 
 * 使用方法：
 * 在 database 云函数中调用：
 * {
 *   "action": "migrate-restaurants-add-stats"
 * }
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  console.log('========================================')
  console.log('开始迁移：为餐厅添加统计字段')
  console.log('========================================\n')

  try {
    // 1. 获取所有餐厅
    console.log('[1/3] 获取所有餐厅...')
    const restaurantsResult = await db.collection('restaurants').get()
    const restaurants = restaurantsResult.data || []
    console.log(`✅ 找到 ${restaurants.length} 个餐厅\n`)

    if (restaurants.length === 0) {
      return {
        code: 0,
        message: '没有餐厅需要迁移',
        data: {
          total: 0,
          updated: 0,
        },
      }
    }

    // 2. 为每个餐厅计算统计数据
    console.log('[2/3] 计算统计数据...')
    let updatedCount = 0
    let errorCount = 0

    for (const restaurant of restaurants) {
      const restaurantId = restaurant._id
      console.log(`  处理餐厅: ${restaurant.name || restaurantId}`)

      try {
        // 查询该餐厅的所有订单
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

        // 更新餐厅统计字段
        await db.collection('restaurants').doc(restaurantId).update({
          data: {
            'stats.totalOrders': totalOrders,
            'stats.totalRevenue': Math.round(totalRevenue * 100) / 100,
            'stats.totalCarbonReduction': Math.round(totalCarbonReduction * 100) / 100,
            'stats.lastUpdatedAt': db.serverDate(),
          },
        })

        console.log(`    ✅ 已更新: 订单数=${totalOrders}, 收入=${totalRevenue.toFixed(2)}, 碳减排=${totalCarbonReduction.toFixed(2)}`)
        updatedCount++
      } catch (error) {
        console.error(`    ❌ 更新失败: ${error.message}`)
        errorCount++
      }
    }

    console.log(`\n✅ 统计计算完成: 成功 ${updatedCount} 个, 失败 ${errorCount} 个\n`)

    // 3. 完成
    console.log('[3/3] 迁移完成')
    console.log('========================================\n')

    return {
      code: 0,
      message: '迁移成功',
      data: {
        total: restaurants.length,
        updated: updatedCount,
        errors: errorCount,
      },
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    return {
      code: -1,
      message: '迁移失败',
      error: error.message,
    }
  }
}

