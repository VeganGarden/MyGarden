/**
 * 检查 recipes 集合的数据结构和内容
 * 
 * 使用方法：
 * 在云开发控制台调用 recipe 云函数
 * action: "checkRecipes"
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

// 素开心餐厅ID
const RESTAURANT_ID = 'restaurant_sukuaixin'

/**
 * 检查 recipes 集合
 */
async function checkRecipes() {
  try {
    const recipeCollection = db.collection('recipes')
    
    // 1. 检查集合是否存在（通过查询总数）
    const totalCount = await recipeCollection.count()
    console.log('recipes 集合总记录数:', totalCount.total)
    
    // 2. 检查素开心餐厅的菜谱数量
    const sukuaixinCount = await recipeCollection
      .where({
        restaurantId: RESTAURANT_ID,
      })
      .count()
    console.log(`素开心餐厅(restaurantId=${RESTAURANT_ID})的菜谱数量:`, sukuaixinCount.total)
    
    // 3. 检查使用 tenantId 字段的菜谱数量
    const tenantIdCount = await recipeCollection
      .where({
        tenantId: RESTAURANT_ID,
      })
      .count()
    console.log(`使用 tenantId=${RESTAURANT_ID} 的菜谱数量:`, tenantIdCount.total)
    
    // 4. 获取前5条记录，检查数据结构
    const sampleRecipes = await recipeCollection
      .where({
        restaurantId: RESTAURANT_ID,
      })
      .limit(5)
      .get()
    
    console.log('样本数据（前5条）:')
    sampleRecipes.data.forEach((recipe, index) => {
      console.log(`\n[${index + 1}] 菜谱: ${recipe.name}`)
      console.log('  字段列表:', Object.keys(recipe))
      console.log('  _id:', recipe._id)
      console.log('  name:', recipe.name)
      console.log('  restaurantId:', recipe.restaurantId)
      console.log('  tenantId:', recipe.tenantId)
      console.log('  status:', recipe.status)
      console.log('  category:', recipe.category)
      console.log('  cookingMethod:', recipe.cookingMethod)
      console.log('  ingredients:', Array.isArray(recipe.ingredients) ? `${recipe.ingredients.length} 个` : recipe.ingredients)
      console.log('  carbonFootprint:', recipe.carbonFootprint)
      console.log('  carbonLabel:', recipe.carbonLabel)
      console.log('  channels:', recipe.channels)
      console.log('  createdAt:', recipe.createdAt)
      console.log('  updatedAt:', recipe.updatedAt)
    })
    
    // 5. 检查必需字段
    const requiredFields = [
      'name',
      'restaurantId',
      'tenantId',
      'status',
      'category',
      'cookingMethod',
      'ingredients',
      'channels',
      'createdAt',
      'updatedAt',
    ]
    
    console.log('\n检查必需字段完整性:')
    const fieldStats = {}
    requiredFields.forEach(field => {
      fieldStats[field] = {
        exists: 0,
        missing: 0,
      }
    })
    
    // 检查所有素开心餐厅的菜谱
    const allSukuaixinRecipes = await recipeCollection
      .where({
        restaurantId: RESTAURANT_ID,
      })
      .get()
    
    allSukuaixinRecipes.data.forEach(recipe => {
      requiredFields.forEach(field => {
        if (recipe[field] !== undefined && recipe[field] !== null) {
          fieldStats[field].exists++
        } else {
          fieldStats[field].missing++
        }
      })
    })
    
    Object.keys(fieldStats).forEach(field => {
      const stats = fieldStats[field]
      const total = stats.exists + stats.missing
      const percentage = total > 0 ? ((stats.exists / total) * 100).toFixed(1) : 0
      console.log(`  ${field}: ${stats.exists}/${total} (${percentage}%)`)
    })
    
    // 6. 检查状态分布（手动统计）
    const allRecipes = await recipeCollection
      .where({
        restaurantId: RESTAURANT_ID,
      })
      .get()
    
    const statusStats = {}
    const categoryStats = {}
    
    allRecipes.data.forEach(recipe => {
      // 统计状态
      const status = recipe.status || 'null'
      statusStats[status] = (statusStats[status] || 0) + 1
      
      // 统计分类
      const category = recipe.category || 'null'
      categoryStats[category] = (categoryStats[category] || 0) + 1
    })
    
    console.log('\n状态分布:')
    Object.keys(statusStats).forEach(status => {
      console.log(`  ${status}: ${statusStats[status]} 个`)
    })
    
    console.log('\n分类分布:')
    Object.keys(categoryStats).forEach(category => {
      console.log(`  ${category}: ${categoryStats[category]} 个`)
    })
    
    // 8. 总结
    const summary = {
      totalRecipes: totalCount.total,
      sukuaixinRecipes: sukuaixinCount.total,
      tenantIdRecipes: tenantIdCount.total,
      expectedCount: 36,
      needsImport: sukuaixinCount.total < 36,
      sampleCount: sampleRecipes.data.length,
      statusDistribution: statusStats,
      categoryDistribution: categoryStats,
      fieldCompleteness: {},
    }
    
    Object.keys(fieldStats).forEach(field => {
      const stats = fieldStats[field]
      const total = stats.exists + stats.missing
      summary.fieldCompleteness[field] = total > 0 ? ((stats.exists / total) * 100).toFixed(1) + '%' : 'N/A'
    })
    
    return {
      code: 0,
      message: '检查完成',
      data: {
        summary,
        details: {
          totalCount: totalCount.total,
          sukuaixinCount: sukuaixinCount.total,
          tenantIdCount: tenantIdCount.total,
          sampleRecipes: sampleRecipes.data.map(r => ({
            _id: r._id,
            name: r.name,
            restaurantId: r.restaurantId,
            tenantId: r.tenantId,
            status: r.status,
            category: r.category,
            fields: Object.keys(r),
          })),
          fieldStats,
          statusDistribution: statusStats,
          categoryDistribution: categoryStats,
        },
      },
    }
  } catch (error) {
    console.error('检查 recipes 集合失败:', error)
    return {
      code: 500,
      message: '检查失败',
      error: error.message,
    }
  }
}

exports.main = async (event, context) => {
  return await checkRecipes()
}

