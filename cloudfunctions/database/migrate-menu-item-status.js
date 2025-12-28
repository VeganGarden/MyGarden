/**
 * 数据库迁移脚本：将菜单项的 status 字段转换为 isAvailable 字段并彻底清理
 * 
 * 迁移规则：
 * - status: 'active', 'published', 'available' -> isAvailable: true (存储在 availability.isAvailable)
 * - status: 'inactive', 'unavailable', 'draft' -> isAvailable: false (存储在 availability.isAvailable)
 * - 如果 status 不存在，默认 isAvailable: true
 * - 迁移后立即删除 status 字段，不做保留（彻底优化）
 * 
 * 执行方法：
 * 1. 在云开发控制台调用 database 云函数，action: 'migrateMenuItemStatus'
 * 2. 或直接调用此脚本
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 将 status 值转换为 isAvailable 布尔值
 */
function convertStatusToIsAvailable(status) {
  if (!status) {
    return true // 默认上架
  }
  
  const statusLower = status.toLowerCase()
  
  // 上架状态
  if (statusLower === 'active' || statusLower === 'published' || statusLower === 'available') {
    return true
  }
  
  // 下架状态
  if (statusLower === 'inactive' || statusLower === 'unavailable' || statusLower === 'draft') {
    return false
  }
  
  // 其他未知状态，默认上架
  return true
}

/**
 * 迁移菜单项状态字段
 */
async function migrateMenuItemStatus() {
  const db = cloud.database()
  const _ = db.command
  const collection = db.collection('restaurant_menu_items')
  
  try {
    console.log('开始迁移菜单项状态字段...')
    
    // 1. 查询所有有 status 字段的菜单项
    const queryResult = await collection
      .where({
        status: _.exists(true)
      })
      .get()
    
    const items = queryResult.data || []
    console.log(`找到 ${items.length} 个需要迁移的菜单项`)
    
    if (items.length === 0) {
      return {
        code: 0,
        message: '没有需要迁移的菜单项',
        data: {
          total: 0,
          migrated: 0,
          skipped: 0
        }
      }
    }
    
    // 2. 批量更新
    let migrated = 0
    let skipped = 0
    const batchSize = 100 // 每批处理 100 条
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      
      const updatePromises = batch.map(async (item) => {
        try {
          const isAvailable = convertStatusToIsAvailable(item.status)
          
          // 检查是否已经存在 isAvailable 字段
          if (item.isAvailable !== undefined || 
              (item.availability && item.availability.isAvailable !== undefined)) {
            // 如果已经存在，只删除 status 字段
            await collection.doc(item._id).update({
              data: {
                status: _.remove() // 删除 status 字段
              }
            })
            skipped++
            return { skipped: true, cleaned: true }
          }
          
          // 更新数据：设置 availability.isAvailable，同时删除 status 字段（彻底清理，不做保留）
          await collection.doc(item._id).update({
            data: {
              'availability.isAvailable': isAvailable,
              status: _.remove(), // 立即删除 status 字段，不保留
              _migrated: true,
              _migratedAt: db.serverDate()
            }
          })
          
          migrated++
          return { migrated: true, isAvailable }
        } catch (error) {
          console.error(`迁移菜单项 ${item._id} 失败:`, error)
          return { error: error.message }
        }
      })
      
      await Promise.all(updatePromises)
      console.log(`已处理 ${Math.min(i + batchSize, items.length)} / ${items.length} 条记录`)
    }
    
    console.log('迁移完成！')
    return {
      code: 0,
      message: '迁移完成',
      data: {
        total: items.length,
        migrated,
        skipped
      }
    }
  } catch (error) {
    console.error('迁移失败:', error)
    return {
      code: 500,
      message: '迁移失败',
      error: error.message
    }
  }
}

/**
 * 清理已迁移的 status 字段（已废弃，迁移时已自动清理）
 * 保留此函数仅为向后兼容，实际不再需要单独调用
 */
async function cleanupStatusField() {
  console.warn('⚠️ cleanupStatusField 已废弃，迁移时已自动清理 status 字段')
  return {
    code: 0,
    message: '此操作已废弃，迁移时已自动清理 status 字段',
    data: {
      total: 0,
      cleaned: 0
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateMenuItemStatus()
    .then(result => {
      console.log('迁移结果:', JSON.stringify(result, null, 2))
      process.exit(result.code === 0 ? 0 : 1)
    })
    .catch(error => {
      console.error('迁移异常:', error)
      process.exit(1)
    })
}

module.exports = {
  migrateMenuItemStatus,
  cleanupStatusField,
  convertStatusToIsAvailable
}
