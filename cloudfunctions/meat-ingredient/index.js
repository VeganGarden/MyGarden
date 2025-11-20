const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 引入权限验证模块（本地文件）
const { checkPermission } = require('./permission')

/**
 * 基础荤食食材管理云函数
 * 支持荤食食材的查询、列表等操作（基础功能，所有用户可访问）
 * 支持基础荤食食材的创建、更新、删除（仅平台运营者）
 * 集合：meat_products
 */
exports.main = async (event, context) => {
  const { action, ingredientId, keyword, category, page = 1, pageSize = 100, data } = event
  const meatCollection = db.collection('meat_products')

  try {
    switch (action) {
      case 'get':
        // 获取单个荤食食材详情（所有用户可访问）
        return await getMeatIngredient(meatCollection, ingredientId)

      case 'list':
        // 获取荤食食材列表（所有用户可访问）
        return await listMeatIngredients(meatCollection, keyword, category, page, pageSize)

      case 'search':
        // 搜索荤食食材（所有用户可访问）
        return await searchMeatIngredients(meatCollection, keyword, page, pageSize)

      case 'createBaseMeatIngredient':
        // 创建基础荤食食材（仅平台运营者）
        const user1 = await checkPermission(event, context, 'base_data:manage')
        return await createBaseMeatIngredient(meatCollection, data, user1)

      case 'updateBaseMeatIngredient':
        // 更新基础荤食食材（仅平台运营者）
        const user2 = await checkPermission(event, context, 'base_data:manage')
        return await updateBaseMeatIngredient(meatCollection, ingredientId, data, user2)

      case 'deleteBaseMeatIngredient':
        // 删除基础荤食食材（仅平台运营者）
        const user3 = await checkPermission(event, context, 'base_data:manage')
        return await deleteBaseMeatIngredient(meatCollection, ingredientId, user3)

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

    console.error('荤食食材操作失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试',
      error: error.message
    }
  }
}

/**
 * 获取单个荤食食材详情
 */
async function getMeatIngredient(meatCollection, ingredientId) {
  if (!ingredientId) {
    return {
      code: 400,
      message: '荤食食材ID不能为空'
    }
  }

  try {
    const result = await meatCollection.doc(ingredientId).get()
    if (!result.data) {
      return {
        code: 404,
        message: '荤食食材不存在'
      }
    }

    return {
      code: 0,
      data: result.data
    }
  } catch (error) {
    console.error('获取荤食食材失败:', error)
    return {
      code: 500,
      message: '获取荤食食材失败',
      error: error.message
    }
  }
}

/**
 * 获取荤食食材列表
 */
async function listMeatIngredients(meatCollection, keyword, category, page, pageSize) {
  try {
    // 构建查询条件
    let query = meatCollection

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
    console.error('获取荤食食材列表失败:', error)
    return {
      code: 500,
      message: '获取荤食食材列表失败',
      error: error.message
    }
  }
}

/**
 * 搜索荤食食材
 */
async function searchMeatIngredients(meatCollection, keyword, page, pageSize) {
  if (!keyword || !keyword.trim()) {
    return {
      code: 400,
      message: '搜索关键词不能为空'
    }
  }

  try {
    // 构建搜索条件（支持名称和英文名称搜索）
    const query = meatCollection.where(
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
    console.error('搜索荤食食材失败:', error)
    return {
      code: 500,
      message: '搜索荤食食材失败',
      error: error.message
    }
  }
}

/**
 * 创建基础荤食食材（仅平台运营者）
 * @param {Object} meatCollection - 荤食食材集合
 * @param {Object} data - 荤食食材数据
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function createBaseMeatIngredient(meatCollection, data, user) {
  // 验证必填字段
  if (!data || !data.name || !data.category || data.carbonFootprint === undefined) {
    return {
      code: 400,
      message: '荤食食材名称、分类和碳足迹为必填项'
    }
  }

  // 检查名称是否已存在
  const existingResult = await meatCollection
    .where({
      name: data.name
    })
    .get()

  if (existingResult.data.length > 0) {
    return {
      code: 409,
      message: '荤食食材名称已存在'
    }
  }

  try {
    // 准备荤食食材数据
    const meatData = {
      name: data.name,
      nameEn: data.nameEn || '',
      category: data.category, // red_meat, poultry, seafood, processed_meat
      subcategory: data.subcategory || '',
      description: data.description || '',
      
      // 碳足迹信息（必填）
      carbonFootprint: data.carbonFootprint,
      carbonFootprintSource: data.carbonFootprintSource || null,
      verifiedAt: data.verifiedAt ? new Date(data.verifiedAt) : null,
      
      // 营养信息
      nutrition: data.nutrition || null,
      
      // 生产方式
      productionMethod: data.productionMethod || null,
      
      // 产地信息
      region: data.region || null,
      
      // 素食替代品（关联 ingredients 集合）
      veganAlternatives: data.veganAlternatives || [],
      
      // 对比组
      comparisonGroup: data.comparisonGroup || null,
      
      // 系统字段
      status: data.status || 'draft', // draft, published, archived
      createdBy: user._id || user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    }

    // 创建荤食食材
    const result = await meatCollection.add({
      data: meatData
    })

    // 记录操作日志
    await db.collection('audit_logs').add({
      data: {
        userId: user._id || user.id,
        username: user.username,
        role: user.role,
        action: 'create',
        resource: 'base_meat_ingredient',
        resourceId: result._id,
        description: `创建基础荤食食材: ${data.name}`,
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
        ...meatData
      }
    }
  } catch (error) {
    console.error('创建荤食食材失败:', error)
    return {
      code: 500,
      message: '创建荤食食材失败',
      error: error.message
    }
  }
}

/**
 * 更新基础荤食食材（仅平台运营者）
 * @param {Object} meatCollection - 荤食食材集合
 * @param {string} ingredientId - 荤食食材ID
 * @param {Object} data - 更新数据
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function updateBaseMeatIngredient(meatCollection, ingredientId, data, user) {
  if (!ingredientId) {
    return {
      code: 400,
      message: '荤食食材ID不能为空'
    }
  }

  try {
    // 检查荤食食材是否存在
    const existingResult = await meatCollection.doc(ingredientId).get()
    if (!existingResult.data) {
      return {
        code: 404,
        message: '荤食食材不存在'
      }
    }

    const existingMeat = existingResult.data

    // 如果更新名称，检查是否与其他荤食食材重复
    if (data.name && data.name !== existingMeat.name) {
      const duplicateResult = await meatCollection
        .where({
          name: data.name,
          _id: _.neq(ingredientId)
        })
        .get()

      if (duplicateResult.data.length > 0) {
        return {
          code: 409,
          message: '荤食食材名称已存在'
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
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status

    // 碳足迹信息
    if (data.carbonFootprint !== undefined) updateData.carbonFootprint = data.carbonFootprint
    if (data.carbonFootprintSource !== undefined) updateData.carbonFootprintSource = data.carbonFootprintSource
    if (data.verifiedAt !== undefined) updateData.verifiedAt = data.verifiedAt ? new Date(data.verifiedAt) : null

    // 营养信息
    if (data.nutrition !== undefined) updateData.nutrition = data.nutrition

    // 生产方式
    if (data.productionMethod !== undefined) updateData.productionMethod = data.productionMethod

    // 产地信息
    if (data.region !== undefined) updateData.region = data.region

    // 素食替代品
    if (data.veganAlternatives !== undefined) updateData.veganAlternatives = data.veganAlternatives

    // 对比组
    if (data.comparisonGroup !== undefined) updateData.comparisonGroup = data.comparisonGroup

    // 版本号递增
    if (existingMeat.version) {
      updateData.version = existingMeat.version + 1
    } else {
      updateData.version = 1
    }

    // 更新荤食食材
    await meatCollection.doc(ingredientId).update({
      data: updateData
    })

    // 记录操作日志
    await db.collection('audit_logs').add({
      data: {
        userId: user._id || user.id,
        username: user.username,
        role: user.role,
        action: 'update',
        resource: 'base_meat_ingredient',
        resourceId: ingredientId,
        description: `更新基础荤食食材: ${existingMeat.name}`,
        tenantId: user.tenantId || null,
        status: 'success',
        createdAt: new Date()
      }
    })

    // 获取更新后的数据
    const updatedResult = await meatCollection.doc(ingredientId).get()

    return {
      code: 0,
      message: '更新成功',
      data: updatedResult.data
    }
  } catch (error) {
    console.error('更新荤食食材失败:', error)
    return {
      code: 500,
      message: '更新荤食食材失败',
      error: error.message
    }
  }
}

/**
 * 删除基础荤食食材（仅平台运营者）
 * @param {Object} meatCollection - 荤食食材集合
 * @param {string} ingredientId - 荤食食材ID
 * @param {Object} user - 用户信息（已通过权限验证）
 */
async function deleteBaseMeatIngredient(meatCollection, ingredientId, user) {
  if (!ingredientId) {
    return {
      code: 400,
      message: '荤食食材ID不能为空'
    }
  }

  try {
    // 检查荤食食材是否存在
    const existingResult = await meatCollection.doc(ingredientId).get()
    if (!existingResult.data) {
      return {
        code: 404,
        message: '荤食食材不存在'
      }
    }

    const meat = existingResult.data

    // 删除荤食食材（软删除：修改状态为archived）
    await meatCollection.doc(ingredientId).update({
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
        resource: 'base_meat_ingredient',
        resourceId: ingredientId,
        description: `删除基础荤食食材: ${meat.name}`,
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
    console.error('删除荤食食材失败:', error)
    return {
      code: 500,
      message: '删除荤食食材失败',
      error: error.message
    }
  }
}

