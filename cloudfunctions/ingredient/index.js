const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 引入权限验证模块（本地文件）
const { checkPermission } = require('./permission')

/**
 * 食材管理云函数
 * 支持食材的查询、列表等操作（基础功能，所有用户可访问）
 * 支持基础食材的创建、更新、删除（仅平台运营者）
 */
exports.main = async (event, context) => {
  const { action, ingredientId, keyword, category, page = 1, pageSize = 100, data } = event
  const ingredientCollection = db.collection('ingredients')

  try {
    switch (action) {
      case 'get':
        // 获取单个食材详情（所有用户可访问）
        return await getIngredient(ingredientCollection, ingredientId)

      case 'list':
        // 获取食材列表（所有用户可访问）
        return await listIngredients(ingredientCollection, keyword, category, page, pageSize)

      case 'search':
        // 搜索食材（所有用户可访问）
        return await searchIngredients(ingredientCollection, keyword, page, pageSize)

      case 'createBaseIngredient':
        // 创建基础食材（仅平台运营者）
        const user1 = await checkPermission(event, context, 'base_data:manage')
        return await createBaseIngredient(ingredientCollection, data, user1)

      case 'updateBaseIngredient':
        // 更新基础食材（仅平台运营者）
        const user2 = await checkPermission(event, context, 'base_data:manage')
        return await updateBaseIngredient(ingredientCollection, ingredientId, data, user2)

      case 'deleteBaseIngredient':
        // 删除基础食材（仅平台运营者）
        const user3 = await checkPermission(event, context, 'base_data:manage')
        return await deleteBaseIngredient(ingredientCollection, ingredientId, user3)

      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    // 权限错误单独处理
    if (error.code === 401 || error.code === 403) {
      return {
        code: error.code,
        message: error.message
      }
    }

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

/**
 * 创建基础食材（仅平台运营者）
 * @param {Object} ingredientCollection - 食材集合
 * @param {Object} data - 食材数据
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function createBaseIngredient(ingredientCollection, data, user) {
  // 验证必填字段
  if (!data || !data.name || !data.category) {
    return {
      code: 400,
      message: '食材名称和分类为必填项'
    }
  }

  // 检查名称是否已存在
  const existingResult = await ingredientCollection
    .where({
      name: data.name
    })
    .get()

  if (existingResult.data.length > 0) {
    return {
      code: 409,
      message: '食材名称已存在'
    }
  }

  try {
    // 准备食材数据
    const ingredientData = {
      name: data.name,
      nameEn: data.nameEn || '',
      category: data.category,
      description: data.description || '',
      
      // 碳足迹信息
      carbonFootprint: data.carbonFootprint || null,
      
      // 营养信息
      nutrition: data.nutrition || null,
      
      // 扩展字段（可选）
      tcmProperties: data.tcmProperties || null,
      bodyTypeSuitability: data.bodyTypeSuitability || null,
      solarTermRecommendations: data.solarTermRecommendations || null,
      practitionerCertifications: data.practitionerCertifications || [],
      certificationCount: (data.practitionerCertifications || []).length,
      practiceWisdom: data.practiceWisdom || null,
      socialAttributes: data.socialAttributes || null,
      usageStats: data.usageStats || null,
      
      // 系统字段
      status: data.status || 'draft', // draft, published, archived
      createdBy: user._id || user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // 创建食材
    const result = await ingredientCollection.add({
      data: ingredientData
    })

    // 记录操作日志
    await db.collection('audit_logs').add({
      data: {
        userId: user._id || user.id,
        username: user.username,
        role: user.role,
        action: 'create',
        resource: 'base_ingredient',
        resourceId: result._id,
        description: `创建基础食材: ${data.name}`,
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
        ...ingredientData
      }
    }
  } catch (error) {
    console.error('创建食材失败:', error)
    return {
      code: 500,
      message: '创建食材失败',
      error: error.message
    }
  }
}

/**
 * 更新基础食材（仅平台运营者）
 * @param {Object} ingredientCollection - 食材集合
 * @param {string} ingredientId - 食材ID
 * @param {Object} data - 更新数据
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function updateBaseIngredient(ingredientCollection, ingredientId, data, user) {
  if (!ingredientId) {
    return {
      code: 400,
      message: '食材ID不能为空'
    }
  }

  try {
    // 检查食材是否存在
    const existingResult = await ingredientCollection.doc(ingredientId).get()
    if (!existingResult.data) {
      return {
        code: 404,
        message: '食材不存在'
      }
    }

    const existingIngredient = existingResult.data

    // 如果更新名称，检查是否与其他食材重复
    if (data.name && data.name !== existingIngredient.name) {
      const duplicateResult = await ingredientCollection
        .where({
          name: data.name,
          _id: _.neq(ingredientId)
        })
        .get()

      if (duplicateResult.data.length > 0) {
        return {
          code: 409,
          message: '食材名称已存在'
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
    if (data.status !== undefined) updateData.status = data.status

    // 扩展字段
    if (data.carbonFootprint !== undefined) updateData.carbonFootprint = data.carbonFootprint
    if (data.nutrition !== undefined) updateData.nutrition = data.nutrition
    if (data.tcmProperties !== undefined) updateData.tcmProperties = data.tcmProperties
    if (data.bodyTypeSuitability !== undefined) updateData.bodyTypeSuitability = data.bodyTypeSuitability
    if (data.solarTermRecommendations !== undefined) updateData.solarTermRecommendations = data.solarTermRecommendations
    if (data.practitionerCertifications !== undefined) {
      updateData.practitionerCertifications = data.practitionerCertifications
      updateData.certificationCount = data.practitionerCertifications.length
    }
    if (data.practiceWisdom !== undefined) updateData.practiceWisdom = data.practiceWisdom
    if (data.socialAttributes !== undefined) updateData.socialAttributes = data.socialAttributes
    if (data.usageStats !== undefined) updateData.usageStats = data.usageStats

    // 更新食材
    await ingredientCollection.doc(ingredientId).update({
      data: updateData
    })

    // 记录操作日志
    await db.collection('audit_logs').add({
      data: {
        userId: user._id || user.id,
        username: user.username,
        role: user.role,
        action: 'update',
        resource: 'base_ingredient',
        resourceId: ingredientId,
        description: `更新基础食材: ${existingIngredient.name}`,
        tenantId: user.tenantId || null,
        status: 'success',
        createdAt: new Date()
      }
    })

    // 获取更新后的数据
    const updatedResult = await ingredientCollection.doc(ingredientId).get()

    return {
      code: 0,
      message: '更新成功',
      data: updatedResult.data
    }
  } catch (error) {
    console.error('更新食材失败:', error)
    return {
      code: 500,
      message: '更新食材失败',
      error: error.message
    }
  }
}

/**
 * 删除基础食材（仅平台运营者）
 * @param {Object} ingredientCollection - 食材集合
 * @param {string} ingredientId - 食材ID
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function deleteBaseIngredient(ingredientCollection, ingredientId, user) {
  if (!ingredientId) {
    return {
      code: 400,
      message: '食材ID不能为空'
    }
  }

  try {
    // 检查食材是否存在
    const existingResult = await ingredientCollection.doc(ingredientId).get()
    if (!existingResult.data) {
      return {
        code: 404,
        message: '食材不存在'
      }
    }

    const ingredient = existingResult.data

    // 检查是否有依赖关系（被食谱使用）
    const recipesUsingIngredient = await db.collection('recipes')
      .where({
        'ingredients.ingredientId': ingredientId
      })
      .count()

    if (recipesUsingIngredient.total > 0) {
      return {
        code: 409,
        message: `无法删除：该食材被 ${recipesUsingIngredient.total} 个食谱使用`,
        data: {
          dependencyCount: recipesUsingIngredient.total
        }
      }
    }

    // 检查是否被餐厅菜单使用（通过restaurant_menu_items）
    const menuItemsUsingIngredient = await db.collection('restaurant_menu_items')
      .where({
        'ingredients.ingredientId': ingredientId
      })
      .count()

    if (menuItemsUsingIngredient.total > 0) {
      return {
        code: 409,
        message: `无法删除：该食材被 ${menuItemsUsingIngredient.total} 个餐厅菜单项使用`,
        data: {
          dependencyCount: menuItemsUsingIngredient.total
        }
      }
    }

    // 删除食材（软删除：修改状态为archived）
    await ingredientCollection.doc(ingredientId).update({
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
        resource: 'base_ingredient',
        resourceId: ingredientId,
        description: `删除基础食材: ${ingredient.name}`,
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
    console.error('删除食材失败:', error)
    return {
      code: 500,
      message: '删除食材失败',
      error: error.message
    }
  }
}

