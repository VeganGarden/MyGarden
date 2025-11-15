/**
 * 导入"素开心"餐厅的菜谱数据
 * 
 * 使用方法：
 * 1. 在云开发控制台调用 recipe 云函数
 * 2. action: "importSukuaixinRecipes"
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

// 素开心餐厅ID
const RESTAURANT_ID = 'restaurant_sukuaixin'

// 菜谱数据
const RECIPES = [
  // ========== 饺包类 (13款) ==========
  {
    name: '蒸饺',
    category: 'staple',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '传统蒸饺',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '成品',
  },
  {
    name: '小笼包',
    category: 'staple',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '经典小笼包',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: 'g1x成品',
  },
  {
    name: '锅贴',
    category: 'staple',
    cookingMethod: 'fried',
    status: 'draft',
    restaurantId: RESTAURANT_ID,
    description: '香脆锅贴',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '待研发',
  },
  {
    name: '叉烧包',
    category: 'staple',
    cookingMethod: 'steamed',
    status: 'draft',
    restaurantId: RESTAURANT_ID,
    description: '港式叉烧包',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '待研发',
  },
  {
    name: '水晶饺',
    category: 'staple',
    cookingMethod: 'steamed',
    status: 'draft',
    restaurantId: RESTAURANT_ID,
    description: '透明水晶饺',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '待研发',
  },
  {
    name: '奶黄包',
    category: 'dessert',
    cookingMethod: 'steamed',
    status: 'draft',
    restaurantId: RESTAURANT_ID,
    description: '香甜奶黄包',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '待研发',
  },
  {
    name: '烧麦',
    category: 'staple',
    cookingMethod: 'steamed',
    status: 'draft',
    restaurantId: RESTAURANT_ID,
    description: '传统烧麦',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '待研发',
  },
  {
    name: '松茸汤包',
    category: 'staple',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '松茸汤包',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '干挑馄饨',
    category: 'staple',
    cookingMethod: 'boiled',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '干挑馄饨',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '生煎包',
    category: 'staple',
    cookingMethod: 'fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '上海生煎包',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '春卷',
    category: 'staple',
    cookingMethod: 'fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '香脆春卷',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '象形核桃包',
    category: 'dessert',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '象形核桃包',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '甜',
  },
  {
    name: '豆沙包',
    category: 'dessert',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '豆沙包',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '甜, g1x成品',
  },

  // ========== 小食类 (14款) ==========
  {
    name: '香芋卷',
    category: 'dessert',
    cookingMethod: 'fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '香芋卷',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '茹成品',
  },
  {
    name: '萝卜糕',
    category: 'staple',
    cookingMethod: 'stir_fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '萝卜糕',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: 'g1x成品',
  },
  {
    name: '黄金薯球',
    category: 'staple',
    cookingMethod: 'fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '黄金薯球',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '茹成品',
  },
  {
    name: '芋头糕',
    category: 'staple',
    cookingMethod: 'stir_fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '芋头糕',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: 'g1x成品',
  },
  {
    name: '香酥芋泥卷',
    category: 'dessert',
    cookingMethod: 'fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '香酥芋泥卷',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: 'g1x成品',
  },
  {
    name: '马蹄糕',
    category: 'dessert',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '马蹄糕',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '椰香糯米滋',
    category: 'dessert',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '椰香糯米滋',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '木薯糕',
    category: 'dessert',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '木薯糕',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '麻球',
    category: 'dessert',
    cookingMethod: 'fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '麻球',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: 'g1x成品',
  },
  {
    name: '煎年糕',
    category: 'staple',
    cookingMethod: 'fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '煎年糕',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '菠萝包',
    category: 'dessert',
    cookingMethod: 'baked',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '菠萝包',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '烘焙成品',
  },
  {
    name: '腐皮卷',
    category: 'staple',
    cookingMethod: 'fried',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '腐皮卷',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '榴莲酥',
    category: 'dessert',
    cookingMethod: 'baked',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '榴莲酥',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '烘焙成品',
  },
  {
    name: '素塔',
    category: 'dessert',
    cookingMethod: 'baked',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '素塔',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '烘焙成品',
  },

  // ========== 主食粥汤 (9款) ==========
  {
    name: '小汤圆',
    category: 'dessert',
    cookingMethod: 'boiled',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '小汤圆',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '肠粉',
    category: 'staple',
    cookingMethod: 'steamed',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '肠粉',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '陈皮红豆沙',
    category: 'soup',
    cookingMethod: 'boiled',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '陈皮红豆沙',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '汤馄饨',
    category: 'soup',
    cookingMethod: 'boiled',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '汤馄饨',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '烧仙草',
    category: 'dessert',
    cookingMethod: 'boiled',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '烧仙草',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '麻油姜汤面',
    category: 'soup',
    cookingMethod: 'boiled',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '麻油姜汤面',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '成品',
  },
  {
    name: '珍菌养生粥',
    category: 'soup',
    cookingMethod: 'boiled',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '珍菌养生粥（咸）',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '咸',
  },
  {
    name: '粉汤饺',
    category: 'soup',
    cookingMethod: 'boiled',
    status: 'published',
    restaurantId: RESTAURANT_ID,
    description: '粉汤饺',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
  },
  {
    name: '过桥米线',
    category: 'soup',
    cookingMethod: 'boiled',
    status: 'draft',
    restaurantId: RESTAURANT_ID,
    description: '过桥米线',
    ingredients: [],
    channels: ['dine_in', 'take_out'],
    version: 1,
    notes: '待研发',
  },
]

/**
 * 导入菜谱数据
 */
async function importSukuaixinRecipes() {
  try {
    console.log('===== 开始导入"素开心"餐厅菜谱 =====\n')
    console.log(`餐厅ID: ${RESTAURANT_ID}`)
    console.log(`菜谱数量: ${RECIPES.length}\n`)

    // 检查餐厅是否存在
    const restaurantCheck = await db.collection('restaurants').doc(RESTAURANT_ID).get()
    if (!restaurantCheck.data) {
      return {
        code: 404,
        success: false,
        message: `餐厅 ${RESTAURANT_ID} 不存在，请先创建餐厅`,
        error: `餐厅 ${RESTAURANT_ID} 不存在`,
      }
    }

    const results = {
      created: [],
      updated: [],
      failed: [],
    }

    // 批量导入菜谱
    for (const recipe of RECIPES) {
      try {
        // 检查菜谱是否已存在（根据名称和餐厅ID）
        const existing = await db
          .collection('recipes')
          .where({
            name: recipe.name,
            restaurantId: RESTAURANT_ID,
          })
          .get()

        // 准备菜谱数据
        const recipeData = {
          name: recipe.name,
          description: recipe.description || '',
          category: recipe.category,
          cookingMethod: recipe.cookingMethod,
          ingredients: recipe.ingredients || [],
          carbonFootprint: recipe.carbonFootprint || 0,
          carbonLabel: recipe.carbonLabel || null,
          carbonScore: recipe.carbonScore || 0,
          status: recipe.status || 'draft',
          channels: recipe.channels || ['dine_in', 'take_out'],
          version: recipe.version || 1,
          restaurantId: RESTAURANT_ID,
          tenantId: RESTAURANT_ID, // 使用餐厅ID作为租户ID
          notes: recipe.notes || '',
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        }

        if (existing.data && existing.data.length > 0) {
          // 更新现有菜谱
          const recipeId = existing.data[0]._id
          await db.collection('recipes').doc(recipeId).update({
            data: {
              name: recipeData.name,
              description: recipeData.description,
              category: recipeData.category,
              cookingMethod: recipeData.cookingMethod,
              ingredients: recipeData.ingredients,
              carbonFootprint: recipeData.carbonFootprint,
              carbonLabel: recipeData.carbonLabel,
              carbonScore: recipeData.carbonScore,
              status: recipeData.status,
              channels: recipeData.channels,
              version: recipeData.version,
              notes: recipeData.notes,
              updatedAt: db.serverDate(),
            },
          })
          results.updated.push(recipe.name)
          console.log(`✅ 更新: ${recipe.name}`)
        } else {
          // 创建新菜谱
          const result = await db.collection('recipes').add({
            data: recipeData,
          })
          results.created.push(recipe.name)
          console.log(`✅ 创建: ${recipe.name} (ID: ${result._id})`)
        }
      } catch (error) {
        console.error(`❌ 失败: ${recipe.name}`, error)
        results.failed.push({ name: recipe.name, error: error.message })
      }
    }

    console.log('\n===== 导入完成 =====')
    console.log(`✅ 创建: ${results.created.length} 个`)
    console.log(`🔄 更新: ${results.updated.length} 个`)
    console.log(`❌ 失败: ${results.failed.length} 个`)

    return {
      code: 0,
      success: true,
      message: `成功导入 ${results.created.length + results.updated.length} 个菜谱`,
      data: results,
    }
  } catch (error) {
    console.error('导入失败:', error)
    return {
      code: 500,
      success: false,
      message: '导入失败',
      error: error.message || '导入失败',
    }
  }
}

// 如果作为云函数调用
exports.main = async (event, context) => {
  return await importSukuaixinRecipes()
}

// 如果直接运行（用于测试）
if (require.main === module) {
  importSukuaixinRecipes()
    .then((result) => {
      console.log('\n执行结果:', JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('执行失败:', error)
      process.exit(1)
    })
}

