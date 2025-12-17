const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 引入权限验证模块（本地文件）
const { checkPermission } = require('./permission')

/**
 * 菜谱管理云函数
 * 支持菜谱的创建、查询、更新、删除等操作
 * 支持多租户隔离（通过tenantId，即餐厅ID）
 * 支持基础食谱的创建、更新、删除（仅平台运营者）
 */
exports.main = async (event, context) => {
  const { action, recipeId, recipe, keyword, page = 1, pageSize = 20, restaurantId, data } = event
  const recipeCollection = db.collection('recipes')

  try {
    // 特殊 action 不需要租户ID和权限验证，直接处理
    if (action === 'checkRecipes' || action === 'importSukuaixinRecipes') {
      switch (action) {
        case 'checkRecipes':
          // 检查 recipes 集合的数据结构和内容
          const checkScript = require('./check-recipes')
          return await checkScript.main(event, context)

        case 'importSukuaixinRecipes':
          // 导入"素开心"餐厅的菜谱数据
          const importScript = require('./import-sukuaixin-recipes')
          return await importScript.main(event, context)
      }
    }

    // 基础食谱管理（仅平台运营者）
    if (action === 'createBaseRecipe' || action === 'updateBaseRecipe' || action === 'deleteBaseRecipe') {
      try {
        const user = await checkPermission(event, context, 'base_data:manage')
        switch (action) {
          case 'createBaseRecipe':
            return await createBaseRecipe(recipeCollection, data, user)
          case 'updateBaseRecipe':
            return await updateBaseRecipe(recipeCollection, recipeId, data, user)
          case 'deleteBaseRecipe':
            return await deleteBaseRecipe(recipeCollection, recipeId, user)
        }
      } catch (error) {
        // 权限错误单独处理
        if (error.code === 401 || error.code === 403) {
          return {
            code: error.code,
            message: error.message
          }
        }
        throw error
      }
    }

    // 获取用户openid（用于权限控制）
    // 注意：Web端调用时可能没有openid，需要处理这种情况
    let openid = null
    try {
      const wxContext = cloud.getWXContext()
      openid = wxContext.OPENID
    } catch (error) {
      console.warn('无法获取openid（可能是Web端调用）:', error)
      // Web端调用时，openid可能为空，使用默认值
      openid = event.openid || 'web_user'
    }

    // 获取餐厅ID（租户ID）
    // 优先使用请求参数中的restaurantId，否则从用户信息中获取
    // 注意：restaurantId 和 tenantId 可能不同（数据迁移后）
    const requestedRestaurantId = restaurantId || recipe?.restaurantId
    const tenantId = await getRestaurantId(requestedRestaurantId, openid)
    
    // 如果提供了 restaurantId，也传递给 listRecipes 函数
    if (action === 'list' && requestedRestaurantId) {
      event.restaurantId = requestedRestaurantId
    }

    switch (action) {
      case 'create':
        // 创建菜谱（租户隔离）
        return await createRecipe(recipeCollection, recipe, openid, tenantId)

      case 'update':
        // 更新菜谱（租户隔离）
        return await updateRecipe(recipeCollection, recipeId, recipe, openid, tenantId)

      case 'delete':
        // 删除菜谱（租户隔离）
        return await deleteRecipe(recipeCollection, recipeId, openid, tenantId)

      case 'get':
        // 获取单个菜谱详情
        return await getRecipe(recipeCollection, recipeId, tenantId)

      case 'list':
        // 获取菜谱列表
        // 支持更多筛选参数
        const { status, category, carbonLabel, isBaseRecipe } = event
        // 优先使用前端传入的 restaurantId（如果提供了的话）
        // 如果前端没有提供 restaurantId，才使用从用户信息中获取的 tenantId
        // 这样可以确保前端选择的餐厅ID能够正确传递到查询逻辑中
        const queryRestaurantId = event.restaurantId || tenantId
        console.log('菜谱列表查询参数:', {
          eventRestaurantId: event.restaurantId,
          tenantId: tenantId,
          queryRestaurantId: queryRestaurantId,
          keyword: keyword
        })
        return await listRecipes(recipeCollection, keyword, page, pageSize, queryRestaurantId, {
          status,
          category,
          carbonLabel,
          isBaseRecipe, // 新增：是否为基础食谱
        })

      case 'batchImport':
        // 批量导入菜谱
        return await batchImportRecipes(recipeCollection, event.recipes, openid, tenantId)

      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('菜谱操作失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试',
      error: error.message
    }
  }
}

/**
 * 获取餐厅ID（租户ID）
 * @param {string} restaurantId - 请求参数中的餐厅ID
 * @param {string} openid - 用户openid
 * @returns {Promise<string>} 餐厅ID
 */
async function getRestaurantId(restaurantId, openid) {
  // 如果请求参数中提供了餐厅ID，直接使用
  if (restaurantId) {
    return restaurantId
  }

  // 否则从用户信息中获取用户所属的餐厅ID
  try {
    const userCollection = db.collection('users')
    const userResult = await userCollection.where({ openid }).get()
    
    if (userResult.data.length > 0) {
      const user = userResult.data[0]
      // 如果用户是餐厅管理员，从用户信息中获取餐厅ID
      if (user.restaurantId) {
        return user.restaurantId
      }
      // 如果用户有角色信息，尝试从角色中获取
      if (user.role === 'restaurant_admin' && user.restaurantId) {
        return user.restaurantId
      }
    }
  } catch (error) {
    console.error('获取用户餐厅ID失败:', error)
  }

  // 如果无法获取餐厅ID，返回null（允许查询所有餐厅的数据，由业务逻辑决定）
  // 注意：在生产环境中，可能需要更严格的权限控制
  return null
}

/**
 * 创建菜谱
 * @param {Object} recipeCollection - 菜谱集合
 * @param {Object} recipe - 菜谱数据
 * @param {string} openid - 用户openid
 * @param {string} tenantId - 租户ID（餐厅ID）
 */
async function createRecipe(recipeCollection, recipe, openid, tenantId) {
  // 验证必填字段
  if (!recipe.name || !recipe.category || !recipe.cookingMethod) {
    return {
      code: 400,
      message: '菜谱名称、分类和烹饪方式为必填项'
    }
  }

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return {
      code: 400,
      message: '至少需要添加一种食材'
    }
  }

  // 验证租户ID（餐厅ID）
  if (!tenantId) {
    return {
      code: 400,
      message: '缺少餐厅ID（restaurantId），无法创建菜谱'
    }
  }

  // 准备菜谱数据
  const recipeData = {
    name: recipe.name,
    description: recipe.description || '',
    category: recipe.category,
    cookingMethod: recipe.cookingMethod,
    ingredients: recipe.ingredients,
    carbonFootprint: recipe.carbonFootprint || 0,
    carbonLabel: recipe.carbonLabel || null,
    carbonScore: recipe.carbonScore || 0,
    status: recipe.status || 'draft',
    channels: recipe.channels || [],
    version: recipe.version || 1,
    isBaseRecipe: recipe.isBaseRecipe !== undefined ? recipe.isBaseRecipe : false, // 保留前端传递的 isBaseRecipe 值
    tenantId: tenantId, // 使用餐厅ID作为租户ID
    restaurantId: tenantId, // 同时保存餐厅ID字段，便于查询
    createdBy: openid,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  try {
    const result = await recipeCollection.add({
      data: recipeData
    })

    return {
      code: 0,
      message: '菜谱创建成功',
      data: {
        _id: result._id,
        ...recipeData
      }
    }
  } catch (error) {
    console.error('创建菜谱失败:', error)
    return {
      code: 500,
      message: '创建菜谱失败',
      error: error.message
    }
  }
}

/**
 * 更新菜谱
 * @param {Object} recipeCollection - 菜谱集合
 * @param {string} recipeId - 菜谱ID
 * @param {Object} recipe - 菜谱数据
 * @param {string} openid - 用户openid
 * @param {string} tenantId - 租户ID（餐厅ID）
 */
async function updateRecipe(recipeCollection, recipeId, recipe, openid, tenantId) {
  if (!recipeId) {
    return {
      code: 400,
      message: '菜谱ID不能为空'
    }
  }

  if (!tenantId) {
    return {
      code: 400,
      message: '缺少餐厅ID（restaurantId），无法更新菜谱'
    }
  }

  try {
    // 检查菜谱是否存在
    const existingRecipe = await recipeCollection.doc(recipeId).get()
    if (!existingRecipe.data) {
      return {
        code: 404,
        message: '菜谱不存在'
      }
    }

    // 检查租户隔离：只能更新本餐厅的菜谱
    if (existingRecipe.data.tenantId !== tenantId) {
      return {
        code: 403,
        message: '无权限更新此菜谱：不属于当前餐厅'
      }
    }

    // 检查权限（只有创建者可以更新）
    if (existingRecipe.data.createdBy !== openid) {
      return {
        code: 403,
        message: '无权限更新此菜谱'
      }
    }

    // 准备更新数据
    const updateData = {
      updatedAt: new Date()
    }

    if (recipe.name) updateData.name = recipe.name
    if (recipe.description !== undefined) updateData.description = recipe.description
    if (recipe.category) updateData.category = recipe.category
    if (recipe.cookingMethod) updateData.cookingMethod = recipe.cookingMethod
    if (recipe.ingredients) updateData.ingredients = recipe.ingredients
    if (recipe.carbonFootprint !== undefined) updateData.carbonFootprint = recipe.carbonFootprint
    if (recipe.carbonLabel !== undefined) updateData.carbonLabel = recipe.carbonLabel
    if (recipe.carbonScore !== undefined) updateData.carbonScore = recipe.carbonScore
    if (recipe.status) updateData.status = recipe.status
    if (recipe.channels) updateData.channels = recipe.channels
    if (recipe.version) updateData.version = recipe.version + 1

    // 更新菜谱
    await recipeCollection.doc(recipeId).update({
      data: updateData
    })

    // 获取更新后的菜谱
    const updatedRecipe = await recipeCollection.doc(recipeId).get()

    return {
      code: 0,
      message: '菜谱更新成功',
      data: updatedRecipe.data
    }
  } catch (error) {
    console.error('更新菜谱失败:', error)
    return {
      code: 500,
      message: '更新菜谱失败',
      error: error.message
    }
  }
}

/**
 * 删除菜谱
 * @param {Object} recipeCollection - 菜谱集合
 * @param {string} recipeId - 菜谱ID
 * @param {string} openid - 用户openid
 * @param {string} tenantId - 租户ID（餐厅ID）
 */
async function deleteRecipe(recipeCollection, recipeId, openid, tenantId) {
  if (!recipeId) {
    return {
      code: 400,
      message: '菜谱ID不能为空'
    }
  }

  if (!tenantId) {
    return {
      code: 400,
      message: '缺少餐厅ID（restaurantId），无法删除菜谱'
    }
  }

  try {
    // 检查菜谱是否存在
    const existingRecipe = await recipeCollection.doc(recipeId).get()
    if (!existingRecipe.data) {
      return {
        code: 404,
        message: '菜谱不存在'
      }
    }

    // 检查租户隔离：只能删除本餐厅的菜谱
    if (existingRecipe.data.tenantId !== tenantId) {
      return {
        code: 403,
        message: '无权限删除此菜谱：不属于当前餐厅'
      }
    }

    // 检查权限（只有创建者可以删除）
    if (existingRecipe.data.createdBy !== openid) {
      return {
        code: 403,
        message: '无权限删除此菜谱'
      }
    }

    // 删除菜谱（软删除：更新状态为archived）
    await recipeCollection.doc(recipeId).update({
      data: {
        status: 'archived',
        updatedAt: new Date()
      }
    })

    return {
      code: 0,
      message: '菜谱删除成功'
    }
  } catch (error) {
    console.error('删除菜谱失败:', error)
    return {
      code: 500,
      message: '删除菜谱失败',
      error: error.message
    }
  }
}

/**
 * 获取单个菜谱详情
 * @param {Object} recipeCollection - 菜谱集合
 * @param {string} recipeId - 菜谱ID
 * @param {string} tenantId - 租户ID（餐厅ID），可选，如果提供则进行租户隔离检查
 */
async function getRecipe(recipeCollection, recipeId, tenantId) {
  if (!recipeId) {
    return {
      code: 400,
      message: '菜谱ID不能为空'
    }
  }

  try {
    const result = await recipeCollection.doc(recipeId).get()
    if (!result.data) {
      return {
        code: 404,
        message: '菜谱不存在'
      }
    }

    // 如果提供了tenantId，进行租户隔离检查
    if (tenantId && result.data.tenantId !== tenantId) {
      return {
        code: 403,
        message: '无权限访问此菜谱：不属于当前餐厅'
      }
    }

    return {
      code: 0,
      data: result.data
    }
  } catch (error) {
    console.error('获取菜谱失败:', error)
    return {
      code: 500,
      message: '获取菜谱失败',
      error: error.message
    }
  }
}

/**
 * 获取菜谱列表
 * @param {Object} recipeCollection - 菜谱集合
 * @param {string} keyword - 搜索关键词
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} tenantId - 租户ID（可能是餐厅ID或租户ID），用于多租户数据隔离
 * @param {Object} filters - 筛选条件 { status, category, carbonLabel, isBaseRecipe }
 */
async function listRecipes(recipeCollection, keyword, page, pageSize, tenantId, filters = {}) {
  try {
    // 如果指定了 isBaseRecipe，则只查询基础食谱（不进行租户隔离）
    if (filters.isBaseRecipe === true) {
      // 构建基础食谱查询条件
      // 注意：真正的平台基础菜谱应该 tenantId 和 restaurantId 都为 null
      // 手工创建的菜谱虽然 isBaseRecipe 也为 true，但它们有 tenantId/restaurantId，不应该出现在基础菜谱库中
      let query = recipeCollection.where({
        isBaseRecipe: true, // 只查询基础食谱
        tenantId: null, // 平台基础菜谱无租户ID
        restaurantId: null, // 平台基础菜谱无餐厅ID
        status: _.neq('archived') // 排除已归档的菜谱
      })

      // 添加状态筛选
      if (filters.status && filters.status !== 'all') {
        query = query.where({
          status: filters.status
        })
      }

      // 添加分类筛选
      if (filters.category && filters.category !== 'all') {
        query = query.where({
          category: filters.category
        })
      }

      // 如果有关键词，添加搜索条件
      if (keyword && keyword.trim()) {
        query = query.where({
          name: db.RegExp({
            regexp: keyword.trim(),
            options: 'i'
          })
        })
      }

      // 获取总数
      const countResult = await query.count()
      const total = countResult.total

      // 分页查询
      const result = await query
        .orderBy('createdAt', 'desc')
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
    }
    
    // 如果提供了 tenantId，先尝试获取餐厅信息，确定实际的 tenantId
    let actualTenantId = null
    let queryRestaurantId = null
    
    if (tenantId) {
      if (tenantId.startsWith('tenant_')) {
        // 如果传入的是租户ID，直接使用
        actualTenantId = tenantId
      } else {
        // 如果传入的是餐厅ID（不是租户ID），查询餐厅信息获取租户ID
        queryRestaurantId = tenantId
        try {
          const restaurantResult = await db.collection('restaurants').doc(tenantId).get()
          if (restaurantResult.data && restaurantResult.data.tenantId) {
            actualTenantId = restaurantResult.data.tenantId
          }
        } catch (error) {
          // 如果查询餐厅信息失败，只使用 restaurantId 查询
          console.warn('获取餐厅信息失败，仅使用 restaurantId 查询:', error)
        }
      }
    }
    
    console.log('listRecipes 查询参数:', {
      tenantId: tenantId,
      actualTenantId: actualTenantId,
      queryRestaurantId: queryRestaurantId,
      keyword: keyword
    })
    
    // 构建基础查询条件
    let query = recipeCollection.where({
      status: _.neq('archived') // 排除已归档的菜谱
    })

    // 多租户隔离：查询菜谱
    // 当选择餐厅时，应该同时显示：
    // 1. 基础菜谱（isBaseRecipe: true，restaurantId 为 null 或不存在）
    // 2. 该餐厅的菜谱（restaurantId 匹配）
    if (queryRestaurantId) {
      // 如果提供了 restaurantId，使用 $or 条件同时查询基础菜谱和该餐厅的菜谱
      query = query.where(_.or([
        {
          isBaseRecipe: true // 基础菜谱（平台级，所有餐厅可用）
        },
        {
          restaurantId: queryRestaurantId // 该餐厅的菜谱
        }
      ]))
      console.log('添加餐厅过滤条件（包含基础菜谱）: restaurantId =', queryRestaurantId)
    } else if (actualTenantId) {
      // 如果没有 restaurantId，使用 tenantId 查询（可能返回多个餐厅的数据）
      // 同时也包含基础菜谱
      query = query.where(_.or([
        {
          isBaseRecipe: true // 基础菜谱
        },
        {
          tenantId: actualTenantId // 该租户的菜谱
        }
      ]))
      console.log('添加租户过滤条件（包含基础菜谱）: tenantId =', actualTenantId)
    } else {
      // 如果没有提供 tenantId 或 restaurantId，查询所有菜谱（包括基础菜谱和所有餐厅的菜谱）
      console.warn('未提供 tenantId 或 restaurantId，将查询所有菜谱（包括基础菜谱）')
    }

    // 添加状态筛选
    if (filters.status && filters.status !== 'all') {
      query = query.where({
        status: filters.status
      })
    }

    // 添加分类筛选
    if (filters.category && filters.category !== 'all') {
      query = query.where({
        category: filters.category
      })
    }

    // 添加碳标签筛选
    if (filters.carbonLabel && filters.carbonLabel !== 'all') {
      query = query.where({
        carbonLabel: filters.carbonLabel
      })
    }

    // 如果有关键词，添加搜索条件
    if (keyword && keyword.trim()) {
      query = query.where({
        name: db.RegExp({
          regexp: keyword.trim(),
          options: 'i'
        })
      })
    }

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total

    // 分页查询
    const result = await query
      .orderBy('createdAt', 'desc')
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
    console.error('获取菜谱列表失败:', error)
    return {
      code: 500,
      message: '获取菜谱列表失败',
      error: error.message
    }
  }
}

/**
 * 批量导入菜谱
 * @param {Object} recipeCollection - 菜谱集合
 * @param {Array} recipes - 菜谱数据数组
 * @param {string} openid - 用户openid
 * @param {string} tenantId - 租户ID（餐厅ID）
 */
async function batchImportRecipes(recipeCollection, recipes, openid, tenantId) {
  if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
    return {
      code: 400,
      message: '菜谱数据不能为空'
    }
  }

  if (!tenantId) {
    return {
      code: 400,
      message: '缺少餐厅ID（restaurantId），无法批量导入菜谱'
    }
  }

  try {
    const results = {
      success: [],
      failed: []
    }

    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i]
      try {
        // 验证必填字段
        if (!recipe.name || !recipe.category || !recipe.cookingMethod) {
          results.failed.push({
            index: i,
            recipe: recipe.name || '未知',
            error: '菜谱名称、分类和烹饪方式为必填项'
          })
          continue
        }

        if (!recipe.ingredients || recipe.ingredients.length === 0) {
          results.failed.push({
            index: i,
            recipe: recipe.name,
            error: '至少需要添加一种食材'
          })
          continue
        }

        // 准备菜谱数据
        const recipeData = {
          name: recipe.name,
          description: recipe.description || '',
          category: recipe.category,
          cookingMethod: recipe.cookingMethod,
          ingredients: recipe.ingredients,
          carbonFootprint: recipe.carbonFootprint || 0,
          carbonLabel: recipe.carbonLabel || null,
          carbonScore: recipe.carbonScore || 0,
          status: recipe.status || 'draft',
          channels: recipe.channels || [],
          version: 1,
          tenantId: tenantId, // 使用餐厅ID作为租户ID
          restaurantId: tenantId, // 同时保存餐厅ID字段，便于查询
          createdBy: openid,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // 创建菜谱
        const result = await recipeCollection.add({
          data: recipeData
        })

        results.success.push({
          index: i,
          recipe: recipe.name,
          _id: result._id
        })
      } catch (error) {
        results.failed.push({
          index: i,
          recipe: recipe.name || '未知',
          error: error.message
        })
      }
    }

    return {
      code: 0,
      message: `批量导入完成：成功 ${results.success.length} 条，失败 ${results.failed.length} 条`,
      data: results
    }
  } catch (error) {
    console.error('批量导入菜谱失败:', error)
    return {
      code: 500,
      message: '批量导入菜谱失败',
      error: error.message
    }
  }
}

/**
 * 创建基础食谱（仅平台运营者）
 * @param {Object} recipeCollection - 食谱集合
 * @param {Object} data - 食谱数据
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function createBaseRecipe(recipeCollection, data, user) {
  // 验证必填字段
  if (!data || !data.name || !data.category) {
    return {
      code: 400,
      message: '食谱名称和分类为必填项'
    }
  }

  // 检查名称是否已存在（基础食谱无租户限制，检查全局）
  const existingResult = await recipeCollection
    .where({
      name: data.name,
      isBaseRecipe: true // 只检查基础食谱
    })
    .get()

  if (existingResult.data.length > 0) {
    return {
      code: 409,
      message: '食谱名称已存在'
    }
  }

  try {
    // 准备食谱数据（基础食谱结构）
    const recipeData = {
      name: data.name,
      nameEn: data.nameEn || '',
      category: data.category,
      description: data.description || '',
      
      // 基础字段
      ingredients: data.ingredients || [],
      cookingMethod: data.cookingMethod || '',
      cookingTime: data.cookingTime || null,
      servings: data.servings || null,
      
      // 碳足迹信息
      carbonFootprint: data.carbonFootprint || null,
      carbonLabel: data.carbonLabel || null,
      carbonScore: data.carbonScore || null,
      
      // 扩展字段（服务于C端）
      practitionerCertifications: data.practitionerCertifications || [],
      certificationCount: (data.practitionerCertifications || []).length,
      practiceData: data.practiceData || null,
      suitableScenarios: data.suitableScenarios || null,
      culturalStory: data.culturalStory || null,
      evolutionHistory: data.evolutionHistory || null,
      videoTutorial: data.videoTutorial || null,
      
      // 系统字段
      isBaseRecipe: true, // 标记为基础食谱
      status: data.status || 'draft', // draft, published, archived
      version: 1,
      tenantId: null, // 基础食谱无租户
      restaurantId: null, // 基础食谱无餐厅
      createdBy: user._id || user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // 创建食谱
    const result = await recipeCollection.add({
      data: recipeData
    })

    // 记录操作日志
    await db.collection('audit_logs').add({
      data: {
        userId: user._id || user.id,
        username: user.username,
        role: user.role,
        action: 'create',
        resource: 'base_recipe',
        resourceId: result._id,
        description: `创建基础食谱: ${data.name}`,
        tenantId: user.tenantId || null,
        status: 'success',
        createdAt: new Date()
      }
    })

    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: result._id,
        ...recipeData
      }
    }
  } catch (error) {
    console.error('创建基础食谱失败:', error)
    return {
      code: 500,
      message: '创建基础食谱失败',
      error: error.message
    }
  }
}

/**
 * 更新基础食谱（仅平台运营者）
 * @param {Object} recipeCollection - 食谱集合
 * @param {string} recipeId - 食谱ID
 * @param {Object} data - 更新数据
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function updateBaseRecipe(recipeCollection, recipeId, data, user) {
  if (!recipeId) {
    return {
      code: 400,
      message: '食谱ID不能为空'
    }
  }

  try {
    // 检查食谱是否存在且为基础食谱
    const existingResult = await recipeCollection.doc(recipeId).get()
    if (!existingResult.data) {
      return {
        code: 404,
        message: '食谱不存在'
      }
    }

    const existingRecipe = existingResult.data

    // 检查是否为基础食谱
    if (!existingRecipe.isBaseRecipe) {
      return {
        code: 403,
        message: '只能更新基础食谱'
      }
    }

    // 如果更新名称，检查是否与其他基础食谱重复
    if (data.name && data.name !== existingRecipe.name) {
      const duplicateResult = await recipeCollection
        .where({
          name: data.name,
          isBaseRecipe: true,
          _id: _.neq(recipeId)
        })
        .get()

      if (duplicateResult.data.length > 0) {
        return {
          code: 409,
          message: '食谱名称已存在'
        }
      }
    }

    // 准备更新数据（只更新提供的字段）
    const updateData = {
      updatedBy: user._id || user.id,
      updatedAt: new Date()
    }

    // 基础字段
    if (data.name !== undefined) updateData.name = data.name
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn
    if (data.category !== undefined) updateData.category = data.category
    if (data.description !== undefined) updateData.description = data.description
    if (data.cookingMethod !== undefined) updateData.cookingMethod = data.cookingMethod
    if (data.cookingTime !== undefined) updateData.cookingTime = data.cookingTime
    if (data.servings !== undefined) updateData.servings = data.servings
    if (data.status !== undefined) updateData.status = data.status

    // 食材和扩展字段
    if (data.ingredients !== undefined) updateData.ingredients = data.ingredients
    if (data.carbonFootprint !== undefined) updateData.carbonFootprint = data.carbonFootprint
    if (data.carbonLabel !== undefined) updateData.carbonLabel = data.carbonLabel
    if (data.carbonScore !== undefined) updateData.carbonScore = data.carbonScore
    
    // 扩展字段
    if (data.practitionerCertifications !== undefined) {
      updateData.practitionerCertifications = data.practitionerCertifications
      updateData.certificationCount = data.practitionerCertifications.length
    }
    if (data.practiceData !== undefined) updateData.practiceData = data.practiceData
    if (data.suitableScenarios !== undefined) updateData.suitableScenarios = data.suitableScenarios
    if (data.culturalStory !== undefined) updateData.culturalStory = data.culturalStory
    if (data.evolutionHistory !== undefined) updateData.evolutionHistory = data.evolutionHistory
    if (data.videoTutorial !== undefined) updateData.videoTutorial = data.videoTutorial

    // 版本号自增
    if (existingRecipe.version) {
      updateData.version = existingRecipe.version + 1
    } else {
      updateData.version = 1
    }

    // 更新食谱
    await recipeCollection.doc(recipeId).update({
      data: updateData
    })

    // 记录操作日志
    await db.collection('audit_logs').add({
      data: {
        userId: user._id || user.id,
        username: user.username,
        role: user.role,
        action: 'update',
        resource: 'base_recipe',
        resourceId: recipeId,
        description: `更新基础食谱: ${existingRecipe.name}`,
        tenantId: user.tenantId || null,
        status: 'success',
        createdAt: new Date()
      }
    })

    // 获取更新后的数据
    const updatedResult = await recipeCollection.doc(recipeId).get()

    return {
      code: 0,
      message: '更新成功',
      data: updatedResult.data
    }
  } catch (error) {
    console.error('更新基础食谱失败:', error)
    return {
      code: 500,
      message: '更新基础食谱失败',
      error: error.message
    }
  }
}

/**
 * 删除基础食谱（仅平台运营者）
 * @param {Object} recipeCollection - 食谱集合
 * @param {string} recipeId - 食谱ID
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function deleteBaseRecipe(recipeCollection, recipeId, user) {
  if (!recipeId) {
    return {
      code: 400,
      message: '食谱ID不能为空'
    }
  }

  try {
    // 检查食谱是否存在且为基础食谱
    const existingResult = await recipeCollection.doc(recipeId).get()
    if (!existingResult.data) {
      return {
        code: 404,
        message: '食谱不存在'
      }
    }

    const recipe = existingResult.data

    // 检查是否为基础食谱
    if (!recipe.isBaseRecipe) {
      return {
        code: 403,
        message: '只能删除基础食谱'
      }
    }

    // 检查是否有依赖关系（被餐厅菜单使用）
    const menuItemsUsingRecipe = await db.collection('restaurant_menu_items')
      .where({
        'baseRecipeId': recipeId
      })
      .count()

    if (menuItemsUsingRecipe.total > 0) {
      return {
        code: 409,
        message: `无法删除：该食谱被 ${menuItemsUsingRecipe.total} 个餐厅菜单项使用`,
        data: {
          dependencyCount: menuItemsUsingRecipe.total
        }
      }
    }

    // 删除食谱（软删除：修改状态为archived）
    await recipeCollection.doc(recipeId).update({
      data: {
        status: 'archived',
        updatedBy: user._id || user.id,
        updatedAt: new Date()
      }
    })

    // 记录操作日志
    await db.collection('audit_logs').add({
      data: {
        userId: user._id || user.id,
        username: user.username,
        role: user.role,
        action: 'delete',
        resource: 'base_recipe',
        resourceId: recipeId,
        description: `删除基础食谱: ${recipe.name}`,
        tenantId: user.tenantId || null,
        status: 'success',
        createdAt: new Date()
      }
    })

    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除基础食谱失败:', error)
    return {
      code: 500,
      message: '删除基础食谱失败',
      error: error.message
    }
  }
}

