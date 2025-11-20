const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 数据库迁移脚本 - 为所有食谱添加 isBaseRecipe 字段
 *
 * 功能：
 * 为 recipes 集合中所有没有 isBaseRecipe 字段的食谱添加该字段，默认值为 true
 *
 * 执行方式：
 * 在 database 云函数中调用：{ action: 'migrate-recipes-add-isbaserecipe' }
 */
exports.main = async (event) => {
  try {
    console.log('========================================')
    console.log('开始迁移：为食谱添加 isBaseRecipe 字段')
    console.log('========================================\n')

    const recipesCollection = db.collection('recipes')

    // 查询所有没有 isBaseRecipe 字段的食谱
    const recipesWithoutField = await recipesCollection
      .where({
        isBaseRecipe: _.exists(false)
      })
      .get()

    console.log(`发现 ${recipesWithoutField.data.length} 个食谱需要添加 isBaseRecipe 字段`)

    if (recipesWithoutField.data.length === 0) {
      return {
        code: 0,
        message: '所有食谱已有 isBaseRecipe 字段',
        data: {
          total: 0,
          updated: 0
        }
      }
    }

    // 逐个更新（腾讯云开发不支持 batch）
    let updateCount = 0
    let errorCount = 0
    const errors = []

    for (const recipe of recipesWithoutField.data) {
      try {
        await recipesCollection.doc(recipe._id).update({
          data: {
            isBaseRecipe: true // 默认值：所有已有食谱都标记为基础食谱
          }
        })
        updateCount++
        
        if (updateCount % 10 === 0) {
          console.log(`  已更新 ${updateCount}/${recipesWithoutField.data.length} 个食谱`)
        }
      } catch (error) {
        console.error(`更新食谱 ${recipe._id} 失败:`, error)
        errorCount++
        errors.push({
          recipeId: recipe._id,
          recipeName: recipe.name || '未知',
          error: error.message
        })
      }
    }

    console.log(`\n✅ 迁移完成：已为 ${updateCount} 个食谱添加 isBaseRecipe 字段`)
    if (errorCount > 0) {
      console.log(`⚠️  失败 ${errorCount} 个食谱`)
    }

    return {
      code: 0,
      message: '迁移完成',
      data: {
        total: recipesWithoutField.data.length,
        updated: updateCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    return {
      code: 500,
      message: '迁移失败',
      error: error.message
    }
  }
}

