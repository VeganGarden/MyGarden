const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 为 meat_products 集合补充系统字段
 * 为现有数据添加：status, createdBy, createdAt, updatedAt, version 等字段
 */
async function migrateMeatProductsAddFields() {
  console.log('========================================')
  console.log('开始迁移 meat_products 集合：补充系统字段')
  console.log('========================================\n')

  try {
    // 获取所有 meat_products 数据
    const result = await db.collection('meat_products')
      .where({})
      .get()

    const items = result.data || []
    console.log(`找到 ${items.length} 条荤食食材数据\n`)

    if (items.length === 0) {
      return {
        code: 0,
        message: '没有需要迁移的数据',
        summary: {
          total: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
      }
    }

    let updated = 0
    let skipped = 0
    let failed = 0
    const errors = []

    // 遍历每条数据
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const itemId = item._id

      try {
        // 检查是否需要更新（如果已有完整系统字段，则跳过）
        const needsUpdate = 
          !item.status || 
          !item.createdBy || 
          !item.createdAt || 
          !item.updatedAt || 
          item.version === undefined

        if (!needsUpdate) {
          console.log(`[${i + 1}/${items.length}] ⏭️  ${item.name} 已包含完整系统字段，跳过`)
          skipped++
          continue
        }

        // 准备更新数据
        const updateData = {}

        // 补充 status（如果缺失，默认为 published，因为现有数据都是已导入的）
        if (!item.status) {
          updateData.status = item.status || 'published'
        }

        // 补充 createdBy（如果缺失，使用系统标识）
        if (!item.createdBy) {
          updateData.createdBy = 'system_migration'
        }

        // 补充 createdAt（如果缺失，使用当前时间或 updatedAt）
        if (!item.createdAt) {
          updateData.createdAt = item.updatedAt ? new Date(item.updatedAt) : new Date()
        }

        // 补充 updatedAt（如果缺失，使用当前时间）
        if (!item.updatedAt) {
          updateData.updatedAt = new Date()
        }

        // 补充 version（如果缺失，默认为 1）
        if (item.version === undefined) {
          updateData.version = 1
        }

        // 执行更新
        await db.collection('meat_products')
          .doc(itemId)
          .update({
            data: updateData,
          })

        console.log(`[${i + 1}/${items.length}] ✅ ${item.name} 更新成功`)
        updated++

        // 每10条休息一下，避免超时
        if ((i + 1) % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`[${i + 1}/${items.length}] ❌ ${item.name} 更新失败:`, error.message)
        failed++
        errors.push({
          name: item.name,
          _id: itemId,
          error: error.message,
        })
      }
    }

    console.log('\n========================================')
    console.log('🎉 迁移完成！')
    console.log('========================================')
    console.log(`总计: ${items.length} 条`)
    console.log(`成功: ${updated} 条`)
    console.log(`跳过: ${skipped} 条（已包含完整字段）`)
    console.log(`失败: ${failed} 条`)
    console.log('========================================\n')

    return {
      code: 0,
      message: '迁移完成',
      summary: {
        total: items.length,
        updated,
        skipped,
        failed,
      },
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('迁移失败:', error)
    return {
      code: 500,
      message: '迁移失败',
      error: error.message,
    }
  }
}

module.exports = {
  main: migrateMeatProductsAddFields,
}

