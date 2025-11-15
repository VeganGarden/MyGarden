const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 食材管理云函数
 * 支持食材的查询、列表等操作
 */
exports.main = async (event, context) => {
  const { action, ingredientId, keyword, category, page = 1, pageSize = 100 } = event
  const ingredientCollection = db.collection('ingredients')

  try {
    switch (action) {
      case 'get':
        // 获取单个食材详情
        return await getIngredient(ingredientCollection, ingredientId)

      case 'list':
        // 获取食材列表
        return await listIngredients(ingredientCollection, keyword, category, page, pageSize)

      case 'search':
        // 搜索食材
        return await searchIngredients(ingredientCollection, keyword, page, pageSize)

      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('食材操作失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试',
      error: error.message
    }
  }
}

/**
 * 获取单个食材详情
 */
async function getIngredient(ingredientCollection, ingredientId) {
  if (!ingredientId) {
    return {
      code: 400,
      message: '食材ID不能为空'
    }
  }

  try {
    const result = await ingredientCollection.doc(ingredientId).get()
    if (!result.data) {
      return {
        code: 404,
        message: '食材不存在'
      }
    }

    return {
      code: 0,
      data: result.data
    }
  } catch (error) {
    console.error('获取食材失败:', error)
    return {
      code: 500,
      message: '获取食材失败',
      error: error.message
    }
  }
}

/**
 * 获取食材列表
 */
async function listIngredients(ingredientCollection, keyword, category, page, pageSize) {
  try {
    // 构建查询条件
    let query = ingredientCollection

    // 如果有关键词，添加搜索条件
    if (keyword && keyword.trim()) {
      query = query.where({
        name: db.RegExp({
          regexp: keyword.trim(),
          options: 'i'
        })
      })
    }

    // 如果有分类，添加分类条件
    if (category) {
      query = query.where({
        category: category
      })
    }

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total

    // 分页查询
    const result = await query
      .orderBy('name', 'asc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        data: result.data || [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    }
  } catch (error) {
    console.error('获取食材列表失败:', error)
    return {
      code: 500,
      message: '获取食材列表失败',
      error: error.message
    }
  }
}

/**
 * 搜索食材
 */
async function searchIngredients(ingredientCollection, keyword, page, pageSize) {
  if (!keyword || !keyword.trim()) {
    return {
      code: 400,
      message: '搜索关键词不能为空'
    }
  }

  try {
    // 构建搜索条件（支持名称和英文名称搜索）
    const query = ingredientCollection.where(
      _.or([
        {
          name: db.RegExp({
            regexp: keyword.trim(),
            options: 'i'
          })
        },
        {
          nameEn: db.RegExp({
            regexp: keyword.trim(),
            options: 'i'
          })
        }
      ])
    )

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total

    // 分页查询
    const result = await query
      .orderBy('name', 'asc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        data: result.data || [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    }
  } catch (error) {
    console.error('搜索食材失败:', error)
    return {
      code: 500,
      message: '搜索食材失败',
      error: error.message
    }
  }
}

