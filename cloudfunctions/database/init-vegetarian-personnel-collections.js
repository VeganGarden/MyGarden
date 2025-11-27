/**
 * 初始化素食人员管理模块的数据库集合
 * 
 * 创建的集合：
 * 1. restaurant_staff - 餐厅员工素食情况
 * 2. restaurant_customers - 餐厅客户素食行为记录
 * 3. vegetarian_personnel_stats - 统计数据快照
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 创建集合（如果不存在）
 */
async function createCollection(collectionName) {
  try {
    // 尝试创建集合
    const result = await db.createCollection(collectionName)
    console.log(`✅ 集合 ${collectionName} 创建成功`)
    return { success: true, collectionName }
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log(`ℹ️ 集合 ${collectionName} 已存在，跳过`)
      return { success: true, collectionName, existed: true }
    }
    console.error(`❌ 集合 ${collectionName} 创建失败:`, error.message)
    return { success: false, collectionName, error: error.message }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  console.log('========================================')
  console.log('开始初始化素食人员管理模块数据库集合...')
  console.log('========================================\n')

  const results = []

  try {
    // 1. 创建 restaurant_staff 集合
    console.log('[1/3] 创建 restaurant_staff 集合...')
    const result1 = await createCollection('restaurant_staff')
    results.push(result1)

    // 2. 创建 restaurant_customers 集合
    console.log('[2/3] 创建 restaurant_customers 集合...')
    const result2 = await createCollection('restaurant_customers')
    results.push(result2)

    // 3. 创建 vegetarian_personnel_stats 集合
    console.log('[3/3] 创建 vegetarian_personnel_stats 集合...')
    const result3 = await createCollection('vegetarian_personnel_stats')
    results.push(result3)

    console.log('\n========================================')
    console.log('素食人员管理模块数据库集合初始化完成')
    console.log('========================================\n')

    const summary = {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      existed: results.filter(r => r.existed).length,
      results
    }

    console.log('初始化结果:')
    console.log(`  总计: ${summary.total} 个集合`)
    console.log(`  成功: ${summary.success} 个`)
    console.log(`  失败: ${summary.failed} 个`)
    console.log(`  已存在: ${summary.existed} 个`)

    return {
      code: 0,
      message: '初始化完成',
      data: summary
    }
  } catch (error) {
    console.error('初始化失败:', error)
    return {
      code: 500,
      message: '初始化失败',
      error: error.message
    }
  }
}

