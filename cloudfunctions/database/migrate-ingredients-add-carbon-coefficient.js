const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 为所有食材添加初始碳系数
 * 
 * 根据食材分类设置合理的默认碳系数值（kg CO₂e/kg）
 * 参考数据来源：FAO、Our World in Data、IPCC 等
 */
exports.main = async (event) => {
  try {
    console.log('========================================')
    console.log('开始迁移：为食材添加初始碳系数')
    console.log('========================================\n')

    const ingredientsCollection = db.collection('ingredients')

    // 定义各分类的默认碳系数（kg CO₂e/kg）
    const defaultCarbonCoefficients = {
      // 蔬菜类
      vegetables: 0.4,  // 蔬菜类平均值（叶菜类 0.4, 根茎类 0.3, 果菜类 0.5）
      
      // 豆制品
      beans: 1.2,  // 豆制品平均值（豆腐 1.2, 豆浆 0.8, 天贝 1.5）
      
      // 谷物类
      grains: 1.3,  // 谷物类平均值（大米 1.4, 小麦 1.2, 玉米 1.1）
      
      // 坚果类
      nuts: 2.5,  // 坚果类平均值（参考：坚果类通常碳足迹较高）
      
      // 水果类
      fruits: 0.6,  // 水果类平均值（参考：水果类碳足迹中等）
      
      // 菌菇类
      mushrooms: 0.6,  // 菌菇类平均值
    }

    // 查询所有没有碳系数的食材
    // 包括：carbonFootprint 不存在、carbonFootprint 为 null、carbonFootprint.coefficient 不存在的情况
    const allIngredients = await ingredientsCollection.get()
    const ingredientsWithoutCarbon = allIngredients.data.filter(ingredient => {
      // 如果 carbonFootprint 不存在或为 null
      if (!ingredient.carbonFootprint) {
        return true
      }
      // 如果 carbonFootprint 是数字（旧格式）
      if (typeof ingredient.carbonFootprint === 'number') {
        return true
      }
      // 如果 carbonFootprint 是对象
      if (typeof ingredient.carbonFootprint === 'object') {
        // 检查是否有 coefficient 字段，且值不为 null/undefined
        if (!ingredient.carbonFootprint.coefficient || 
            ingredient.carbonFootprint.coefficient === null ||
            ingredient.carbonFootprint.coefficient === undefined) {
          return true
        }
      }
      return false
    })

    console.log(`发现 ${ingredientsWithoutCarbon.length} 个食材需要添加碳系数`)

    if (ingredientsWithoutCarbon.length === 0) {
      return {
        code: 0,
        message: '所有食材已有碳系数',
        data: {
          total: 0,
          updated: 0
        }
      }
    }

    let updateCount = 0
    let errorCount = 0
    const errors = []
    const categoryStats = {}

    for (const ingredient of ingredientsWithoutCarbon) {
      try {
        const category = ingredient.category || 'vegetables'
        const coefficient = defaultCarbonCoefficients[category] || defaultCarbonCoefficients.vegetables

        // 统计分类
        if (!categoryStats[category]) {
          categoryStats[category] = { count: 0, coefficient }
        }
        categoryStats[category].count++

        // 如果 carbonFootprint 是数字（旧格式），先删除
        if (typeof ingredient.carbonFootprint === 'number') {
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
          console.log(`  已更新 ${updateCount}/${ingredientsWithoutCarbon.length} 个食材`)
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

    console.log(`\n✅ 迁移完成：已为 ${updateCount} 个食材添加碳系数`)
    if (errorCount > 0) {
      console.log(`⚠️  失败 ${errorCount} 个食材`)
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
        total: ingredientsWithoutCarbon.length,
        updated: updateCount,
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

