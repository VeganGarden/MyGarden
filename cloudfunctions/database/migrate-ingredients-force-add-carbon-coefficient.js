const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 强制为所有食材补全碳系数
 * 
 * 这个脚本会检查所有食材，如果 carbonFootprint.coefficient 不存在或为 null/undefined，
 * 就强制设置为默认值
 */
exports.main = async (event) => {
  try {
    console.log('========================================')
    console.log('开始强制迁移：为所有食材补全碳系数')
    console.log('========================================\n')

    const ingredientsCollection = db.collection('ingredients')

    // 定义各分类的默认碳系数（kg CO₂e/kg）
    const defaultCarbonCoefficients = {
      vegetables: 0.4,
      beans: 1.2,
      grains: 1.3,
      nuts: 2.5,
      fruits: 0.6,
      mushrooms: 0.6,
    }

    // 获取所有食材
    const allIngredients = await ingredientsCollection.get()
    console.log(`总共查询到 ${allIngredients.data.length} 个食材`)

    let updateCount = 0
    let skipCount = 0
    let errorCount = 0
    const errors = []
    const categoryStats = {}

    for (const ingredient of allIngredients.data) {
      try {
        // 检查是否需要更新
        let needsUpdate = false
        let shouldRemoveOld = false

        // 如果 carbonFootprint 不存在或为 null
        if (!ingredient.carbonFootprint) {
          needsUpdate = true
        }
        // 如果 carbonFootprint 是数字（旧格式）
        else if (typeof ingredient.carbonFootprint === 'number') {
          needsUpdate = true
          shouldRemoveOld = true
        }
        // 如果 carbonFootprint 是对象
        else if (typeof ingredient.carbonFootprint === 'object') {
          // 检查 coefficient 字段
          const coeff = ingredient.carbonFootprint.coefficient
          // 如果 coefficient 不存在、为 null、undefined、空字符串、0，都需要更新
          if (coeff === null || 
              coeff === undefined || 
              coeff === '' || 
              (typeof coeff === 'number' && coeff <= 0) ||
              !ingredient.carbonFootprint.hasOwnProperty('coefficient')) {
            needsUpdate = true
          }
        }

        if (!needsUpdate) {
          skipCount++
          continue
        }

        const category = ingredient.category || 'vegetables'
        const coefficient = defaultCarbonCoefficients[category] || defaultCarbonCoefficients.vegetables

        // 统计分类
        if (!categoryStats[category]) {
          categoryStats[category] = { count: 0, coefficient }
        }
        categoryStats[category].count++

        // 如果需要删除旧格式
        if (shouldRemoveOld) {
          await ingredientsCollection.doc(ingredient._id).update({
            data: {
              carbonFootprint: _.remove()
            }
          })
        }

        // 更新食材
        await ingredientsCollection.doc(ingredient._id).update({
          data: {
            carbonFootprint: {
              coefficient: coefficient,
              source: '系统默认值（基于分类平均值）',
              verifiedAt: new Date(),
              unit: 'kg'
            }
          }
        })

        updateCount++

        if (updateCount % 10 === 0) {
          console.log(`  已更新 ${updateCount}/${allIngredients.data.length} 个食材`)
        }
      } catch (error) {
        console.error(`更新食材 ${ingredient._id} (${ingredient.name}) 失败:`, error)
        errorCount++
        errors.push({
          ingredientId: ingredient._id,
          ingredientName: ingredient.name || '未知',
          category: ingredient.category || '未知',
          error: error.message
        })
      }
    }

    console.log(`\n✅ 迁移完成：`)
    console.log(`  已更新: ${updateCount} 个食材`)
    console.log(`  已跳过: ${skipCount} 个食材（已有有效碳系数）`)
    if (errorCount > 0) {
      console.log(`  失败: ${errorCount} 个食材`)
    }

    console.log('\n分类统计：')
    Object.keys(categoryStats).forEach(category => {
      const stat = categoryStats[category]
      console.log(`  ${category}: ${stat.count} 个食材，默认碳系数 ${stat.coefficient} kg CO₂e/kg`)
    })

    return {
      code: 0,
      message: '迁移完成',
      data: {
        total: allIngredients.data.length,
        updated: updateCount,
        skipped: skipCount,
        failed: errorCount,
        categoryStats: categoryStats,
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

