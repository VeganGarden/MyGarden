/**
 * 供应商管理云函数
 * 
 * 功能:
 * 1. 创建供应商
 * 2. 查询供应商列表
 * 3. 更新供应商信息
 * 4. 审核供应商
 * 5. 删除供应商（软删除）
 * 6. 添加餐厅关联
 * 7. 移除餐厅关联
 * 8. 批量更新餐厅关联
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { checkPermission, checkDataScope } = require('../common/permission')

/**
 * 生成供应商ID
 */
function generateSupplierId() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `SUP-${dateStr}-${random}`
}

/**
 * 验证餐厅是否存在且属于指定租户
 */
async function validateRestaurant(restaurantId, tenantId) {
  try {
    const restaurantResult = await db.collection('restaurants')
      .where({
        restaurantId: restaurantId,
        tenantId: tenantId
      })
      .get()

    return restaurantResult.data.length > 0
  } catch (error) {
    console.error('验证餐厅失败:', error)
    return false
  }
}

/**
 * 创建供应商
 */
async function createSupplier(supplierData, user) {
  try {
    const now = new Date()
    const supplierId = generateSupplierId()

    // 验证餐厅关联（如果提供了restaurantIds）
    const restaurantIds = supplierData.cooperation?.restaurantIds || []
    if (restaurantIds.length > 0) {
      // 验证所有餐厅是否存在且属于当前租户
      for (const restaurantId of restaurantIds) {
        const isValid = await validateRestaurant(restaurantId, supplierData.tenantId)
        if (!isValid) {
          return {
            code: 400,
            message: `餐厅 ${restaurantId} 不存在或不属于当前租户`
          }
        }
      }
    }

    // 设置合作开始日期（如果有餐厅关联）
    const startDate = restaurantIds.length > 0 ? now : null
    const cooperationStatus = restaurantIds.length > 0 ? 'active' : 'pending'

    const supplier = {
      tenantId: supplierData.tenantId,
      supplierId: supplierId,
      name: supplierData.name,
      type: supplierData.type || 'other',
      legalName: supplierData.legalName || '',
      registrationNumber: supplierData.registrationNumber || '',
      contact: supplierData.contact || {},
      certifications: supplierData.certifications || [],
      businessInfo: {
        ...supplierData.businessInfo,
        riskLevel: supplierData.businessInfo?.riskLevel || 'medium'
      },
      cooperation: {
        restaurantIds: restaurantIds,
        startDate: startDate,
        lastOrderDate: null,
        totalOrders: 0,
        totalAmount: 0,
        status: cooperationStatus
      },
      audit: {
        status: 'pending',
        submittedAt: now,
        reviewedAt: null,
        reviewedBy: null,
        reviewComments: '',
        version: 1
      },
      createdAt: now,
      createdBy: supplierData.createdBy || user?.username || 'system',
      updatedAt: now,
      updatedBy: supplierData.updatedBy || user?.username || 'system',
      version: 1,
      isDeleted: false
    }

    const result = await db.collection('suppliers').add({ data: supplier })

    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: result._id,
        supplierId: supplierId
      }
    }
  } catch (error) {
    console.error('创建供应商失败:', error)
    return {
      code: 500,
      message: '创建失败',
      error: error.message
    }
  }
}

/**
 * 查询供应商列表
 */
async function listSuppliers(params, user) {
  try {
    const { page = 1, pageSize = 20, keyword, type, status, riskLevel, tenantId, restaurantId } = params

    // 根据用户角色确定数据范围
    let queryTenantId = tenantId
    if (user.role === 'restaurant_admin') {
      // 餐厅管理员只能查询自己租户的数据
      queryTenantId = user.tenantId
    } else if (user.role === 'platform_operator') {
      // 平台运营可以查询所有租户的数据，如果指定了tenantId则按指定查询
      queryTenantId = tenantId || null
    } else {
      // 其他角色只能查询自己租户的数据
      queryTenantId = user.tenantId || tenantId
    }

    // 构建查询条件
    let queryConditions = {
      isDeleted: false
    }

    // 租户过滤（平台运营可能不指定tenantId，查询全部）
    if (queryTenantId) {
      queryConditions.tenantId = queryTenantId
    }

    // 按餐厅筛选
    if (restaurantId) {
      queryConditions['cooperation.restaurantIds'] = _.in([restaurantId])
    }

    let query = db.collection('suppliers').where(queryConditions)

    if (type) {
      query = query.where({ type: type })
    }

    if (status) {
      query = query.where({ 'audit.status': status })
    }

    if (riskLevel) {
      query = query.where({ 'businessInfo.riskLevel': riskLevel })
    }

    if (keyword) {
      query = query.where(_.or([
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { supplierId: db.RegExp({ regexp: keyword, options: 'i' }) },
        { registrationNumber: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]))
    }

    const countResult = await query.count()
    const total = countResult.total

    const skip = (page - 1) * pageSize
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: result.data,
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    console.error('查询供应商列表失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message,
      data: [],
      total: 0
    }
  }
}

/**
 * 获取供应商详情
 */
async function getSupplier(supplierId, tenantId) {
  try {
    const result = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .get()

    if (result.data.length === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    return {
      code: 0,
      data: result.data[0]
    }
  } catch (error) {
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}

/**
 * 更新供应商
 */
async function updateSupplier(supplierId, tenantId, updateData) {
  try {
    const now = new Date()

    const updateFields = {
      ...updateData,
      updatedAt: now,
      version: _.inc(1)
    }

    const result = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: updateFields
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    return {
      code: 0,
      message: '更新成功'
    }
  } catch (error) {
    return {
      code: 500,
      message: '更新失败',
      error: error.message
    }
  }
}

/**
 * 审核供应商
 */
async function auditSupplier(supplierId, tenantId, auditData) {
  try {
    const now = new Date()

    const updateFields = {
      'audit.status': auditData.status,
      'audit.reviewedAt': now,
      'audit.reviewedBy': auditData.reviewedBy,
      'audit.reviewComments': auditData.reviewComments || '',
      'audit.version': _.inc(1),
      updatedAt: now
    }

    const result = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: updateFields
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    return {
      code: 0,
      message: '审核成功'
    }
  } catch (error) {
    return {
      code: 500,
      message: '审核失败',
      error: error.message
    }
  }
}

/**
 * 删除供应商（软删除）
 */
async function deleteSupplier(supplierId, tenantId) {
  try {
    const now = new Date()

    const result = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: {
          isDeleted: true,
          updatedAt: now
        }
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除供应商失败:', error)
    return {
      code: 500,
      message: '删除失败',
      error: error.message
    }
  }
}

/**
 * 添加餐厅关联
 */
async function addRestaurant(supplierId, tenantId, restaurantId, user) {
  try {
    // 验证供应商存在
    const supplierResult = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .get()

    if (supplierResult.data.length === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    const supplier = supplierResult.data[0]

    // 验证餐厅存在且属于当前租户
    const isValidRestaurant = await validateRestaurant(restaurantId, tenantId)
    if (!isValidRestaurant) {
      return {
        code: 400,
        message: '餐厅不存在或不属于当前租户'
      }
    }

    // 检查餐厅是否已在关联列表中
    const currentRestaurantIds = supplier.cooperation?.restaurantIds || []
    if (currentRestaurantIds.includes(restaurantId)) {
      return {
        code: 400,
        message: '餐厅已在关联列表中'
      }
    }

    // 更新餐厅关联列表
    const now = new Date()
    const newRestaurantIds = [...currentRestaurantIds, restaurantId]
    const updateData = {
      'cooperation.restaurantIds': newRestaurantIds,
      updatedAt: now,
      updatedBy: user?.username || 'system'
    }

    // 如果之前没有餐厅关联，设置合作开始日期和状态
    if (currentRestaurantIds.length === 0) {
      updateData['cooperation.startDate'] = now
      updateData['cooperation.status'] = 'active'
    }

    const result = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: updateData
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    return {
      code: 0,
      message: '添加餐厅关联成功',
      data: {
        restaurantIds: newRestaurantIds
      }
    }
  } catch (error) {
    console.error('添加餐厅关联失败:', error)
    return {
      code: 500,
      message: '添加餐厅关联失败',
      error: error.message
    }
  }
}

/**
 * 移除餐厅关联
 */
async function removeRestaurant(supplierId, tenantId, restaurantId, user) {
  try {
    // 验证供应商存在
    const supplierResult = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .get()

    if (supplierResult.data.length === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    const supplier = supplierResult.data[0]

    // 检查餐厅是否在关联列表中
    const currentRestaurantIds = supplier.cooperation?.restaurantIds || []
    if (!currentRestaurantIds.includes(restaurantId)) {
      return {
        code: 400,
        message: '餐厅不在关联列表中'
      }
    }

    // 从数组中移除餐厅ID
    const newRestaurantIds = currentRestaurantIds.filter(id => id !== restaurantId)
    const now = new Date()
    const updateData = {
      'cooperation.restaurantIds': newRestaurantIds,
      updatedAt: now,
      updatedBy: user?.username || 'system'
    }

    // 如果移除后没有餐厅关联了，更新状态为pending
    if (newRestaurantIds.length === 0) {
      updateData['cooperation.status'] = 'pending'
      updateData['cooperation.startDate'] = null
    }

    const result = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: updateData
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    return {
      code: 0,
      message: '移除餐厅关联成功',
      data: {
        restaurantIds: newRestaurantIds
      }
    }
  } catch (error) {
    console.error('移除餐厅关联失败:', error)
    return {
      code: 500,
      message: '移除餐厅关联失败',
      error: error.message
    }
  }
}

/**
 * 批量更新餐厅关联
 */
async function updateRestaurants(supplierId, tenantId, restaurantIds, user) {
  try {
    // 验证供应商存在
    const supplierResult = await db.collection('suppliers')
      .where({
        supplierId: supplierId,
        tenantId: tenantId,
        isDeleted: false
      })
      .get()

    if (supplierResult.data.length === 0) {
      return {
        code: 404,
        message: '供应商不存在'
      }
    }

    // 验证所有餐厅是否存在且属于当前租户
    if (restaurantIds && restaurantIds.length > 0) {
      // 去重
      const uniqueRestaurantIds = [...new Set(restaurantIds)]
      
      for (const restaurantId of uniqueRestaurantIds) {
        const isValid = await validateRestaurant(restaurantId, tenantId)
        if (!isValid) {
          return {
            code: 400,
            message: `餐厅 ${restaurantId} 不存在或不属于当前租户`
          }
        }
      }

      // 更新餐厅关联列表
      const now = new Date()
      const updateData = {
        'cooperation.restaurantIds': uniqueRestaurantIds,
        updatedAt: now,
        updatedBy: user?.username || 'system'
      }

      // 如果之前没有餐厅关联，设置合作开始日期和状态
      const currentRestaurantIds = supplierResult.data[0].cooperation?.restaurantIds || []
      if (currentRestaurantIds.length === 0 && uniqueRestaurantIds.length > 0) {
        updateData['cooperation.startDate'] = now
        updateData['cooperation.status'] = 'active'
      } else if (uniqueRestaurantIds.length === 0) {
        // 如果清空了所有餐厅关联，重置状态
        updateData['cooperation.status'] = 'pending'
        updateData['cooperation.startDate'] = null
      }

      const result = await db.collection('suppliers')
        .where({
          supplierId: supplierId,
          tenantId: tenantId,
          isDeleted: false
        })
        .update({
          data: updateData
        })

      if (result.stats.updated === 0) {
        return {
          code: 404,
          message: '供应商不存在'
        }
      }

      return {
        code: 0,
        message: '更新餐厅关联成功',
        data: {
          restaurantIds: uniqueRestaurantIds
        }
      }
    } else {
      // 清空餐厅关联
      const now = new Date()
      const result = await db.collection('suppliers')
        .where({
          supplierId: supplierId,
          tenantId: tenantId,
          isDeleted: false
        })
        .update({
          data: {
            'cooperation.restaurantIds': [],
            'cooperation.status': 'pending',
            'cooperation.startDate': null,
            updatedAt: now,
            updatedBy: user?.username || 'system'
          }
        })

      if (result.stats.updated === 0) {
        return {
          code: 404,
          message: '供应商不存在'
        }
      }

      return {
        code: 0,
        message: '更新餐厅关联成功',
        data: {
          restaurantIds: []
        }
      }
    }
  } catch (error) {
    console.error('批量更新餐厅关联失败:', error)
    return {
      code: 500,
      message: '批量更新餐厅关联失败',
      error: error.message
    }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  try {
    const { action } = event

    // 权限验证（除了list和get，其他操作都需要登录）
    let user = null
    if (action !== 'list' && action !== 'get') {
      try {
        user = await checkPermission(event, context, 'traceability:manage', 'tenant')
      } catch (permissionError) {
        return permissionError
      }
    } else {
      // list和get也需要验证权限，但允许查看
      try {
        user = await checkPermission(event, context, 'traceability:view', 'tenant')
      } catch (permissionError) {
        // 如果权限验证失败，返回错误
        return permissionError
      }
    }

    // 权限控制：平台运营只能审核，不能创建/编辑/删除
    if (user.role === 'platform_operator') {
      if (action === 'create' || action === 'update' || action === 'delete' || 
          action === 'addRestaurant' || action === 'removeRestaurant' || action === 'updateRestaurants') {
        return {
          code: 403,
          message: '平台运营只能审核供应商，不能创建或修改'
        }
      }
    }

    // 权限控制：餐厅管理员只能操作自己租户的数据
    if (user.role === 'restaurant_admin') {
      // 确保tenantId是用户自己的租户
      if (event.tenantId && event.tenantId !== user.tenantId) {
        return {
          code: 403,
          message: '无权限访问其他租户的数据'
        }
      }
      // 如果没有提供tenantId，使用用户的tenantId
      if (!event.tenantId && event.supplier) {
        event.supplier.tenantId = user.tenantId
      }
      if (!event.tenantId && action !== 'list') {
        event.tenantId = user.tenantId
      }
    }

    switch (action) {
      case 'create':
        return await createSupplier(event.supplier, user)
      case 'list':
        return await listSuppliers(event, user)
      case 'get':
        return await getSupplier(event.supplierId, event.tenantId || user?.tenantId)
      case 'update':
        // 餐厅管理员只能更新自己租户的供应商
        if (user.role === 'restaurant_admin') {
          const supplier = await getSupplier(event.supplierId, user.tenantId)
          if (supplier.code !== 0) {
            return {
              code: 403,
              message: '无权限修改此供应商'
            }
          }
        }
        return await updateSupplier(event.supplierId, event.tenantId || user.tenantId, event.supplier)
      case 'audit':
        // 只有平台运营可以审核
        if (user.role !== 'platform_operator' && user.role !== 'system_admin') {
          return {
            code: 403,
            message: '只有平台运营可以审核供应商'
          }
        }
        // 平台运营可以审核所有租户的供应商
        return await auditSupplier(event.supplierId, event.tenantId, event.audit)
      case 'delete':
        // 餐厅管理员只能删除自己租户的供应商
        if (user.role === 'restaurant_admin') {
          const supplier = await getSupplier(event.supplierId, user.tenantId)
          if (supplier.code !== 0) {
            return {
              code: 403,
              message: '无权限删除此供应商'
            }
          }
        }
        return await deleteSupplier(event.supplierId, event.tenantId || user.tenantId)
      case 'addRestaurant':
        // 只有餐厅管理员可以添加餐厅关联
        if (user.role !== 'restaurant_admin') {
          return {
            code: 403,
            message: '只有餐厅管理员可以管理餐厅关联'
          }
        }
        return await addRestaurant(event.supplierId, event.tenantId || user.tenantId, event.restaurantId, user)
      case 'removeRestaurant':
        // 只有餐厅管理员可以移除餐厅关联
        if (user.role !== 'restaurant_admin') {
          return {
            code: 403,
            message: '只有餐厅管理员可以管理餐厅关联'
          }
        }
        return await removeRestaurant(event.supplierId, event.tenantId || user.tenantId, event.restaurantId, user)
      case 'updateRestaurants':
        // 只有餐厅管理员可以批量更新餐厅关联
        if (user.role !== 'restaurant_admin') {
          return {
            code: 403,
            message: '只有餐厅管理员可以管理餐厅关联'
          }
        }
        return await updateRestaurants(event.supplierId, event.tenantId || user.tenantId, event.restaurantIds, user)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['create', 'list', 'get', 'update', 'audit', 'delete', 'addRestaurant', 'removeRestaurant', 'updateRestaurants']
        }
    }
  } catch (error) {
    console.error('供应商管理操作失败:', error)
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}

