/**
 * 素食人员管理云函数
 * 
 * 功能:
 * 1. 员工管理（创建、查询、更新、删除、批量导入）
 * 2. 客户管理（创建/更新、查询、列表）
 * 3. 统计接口（员工统计、客户统计、减碳效应分析）
 * 4. 报表接口（导出Excel/PDF、ESG报告）
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { checkPermission, checkDataScope } = require('./permission')

/**
 * 生成员工ID
 */
function generateStaffId() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `STAFF-${dateStr}-${random}`
}

/**
 * 生成客户ID
 */
function generateCustomerId(userId) {
  if (userId) {
    return `CUST-${userId}`
  }
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 100000).toString().padStart(6, '0')
  return `CUST-${dateStr}-${random}`
}

/**
 * 创建员工
 */
async function createStaff(staffData, user) {
  try {
    const now = new Date()
    const staffId = generateStaffId()

    const staff = {
      staffId: staffId,
      restaurantId: staffData.restaurantId,
      tenantId: staffData.tenantId || user.tenantId,
      basicInfo: {
        name: staffData.basicInfo.name,
        position: staffData.basicInfo.position || '',
        joinDate: staffData.basicInfo.joinDate ? new Date(staffData.basicInfo.joinDate) : now,
        phone: staffData.basicInfo.phone || '',
        email: staffData.basicInfo.email || '',
      },
      vegetarianInfo: {
        isVegetarian: staffData.vegetarianInfo.isVegetarian || false,
        vegetarianType: staffData.vegetarianInfo.vegetarianType || 'other',
        vegetarianStartYear: staffData.vegetarianInfo.vegetarianStartYear || null,
        vegetarianReason: staffData.vegetarianInfo.vegetarianReason || '',
        notes: staffData.vegetarianInfo.notes || '',
      },
      createdBy: user._id || user.id,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    }

    const result = await db.collection('restaurant_staff').add({ data: staff })

    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: result._id,
        staffId: staffId
      }
    }
  } catch (error) {
    console.error('创建员工失败:', error)
    return {
      code: 500,
      message: '创建失败',
      error: error.message
    }
  }
}

/**
 * 更新员工
 */
async function updateStaff(staffId, updateData, user) {
  try {
    const now = new Date()
    
    // 构建更新数据
    const update = {
      updatedAt: now,
    }

    if (updateData.basicInfo) {
      if (updateData.basicInfo.name !== undefined) update['basicInfo.name'] = updateData.basicInfo.name
      if (updateData.basicInfo.position !== undefined) update['basicInfo.position'] = updateData.basicInfo.position
      if (updateData.basicInfo.joinDate !== undefined) update['basicInfo.joinDate'] = new Date(updateData.basicInfo.joinDate)
      if (updateData.basicInfo.phone !== undefined) update['basicInfo.phone'] = updateData.basicInfo.phone
      if (updateData.basicInfo.email !== undefined) update['basicInfo.email'] = updateData.basicInfo.email
    }

    if (updateData.vegetarianInfo) {
      if (updateData.vegetarianInfo.isVegetarian !== undefined) update['vegetarianInfo.isVegetarian'] = updateData.vegetarianInfo.isVegetarian
      if (updateData.vegetarianInfo.vegetarianType !== undefined) update['vegetarianInfo.vegetarianType'] = updateData.vegetarianInfo.vegetarianType
      if (updateData.vegetarianInfo.vegetarianStartYear !== undefined) update['vegetarianInfo.vegetarianStartYear'] = updateData.vegetarianInfo.vegetarianStartYear
      if (updateData.vegetarianInfo.vegetarianReason !== undefined) update['vegetarianInfo.vegetarianReason'] = updateData.vegetarianInfo.vegetarianReason
      if (updateData.vegetarianInfo.notes !== undefined) update['vegetarianInfo.notes'] = updateData.vegetarianInfo.notes
    }

    await db.collection('restaurant_staff').doc(staffId).update({
      data: update
    })

    return {
      code: 0,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新员工失败:', error)
    return {
      code: 500,
      message: '更新失败',
      error: error.message
    }
  }
}

/**
 * 查询员工列表
 */
async function listStaff(params, user) {
  try {
    const { restaurantId, tenantId, page = 1, pageSize = 20, filters = {}, search, sortBy = 'createdAt', sortOrder = 'desc' } = params

    // 构建查询条件
    let query = db.collection('restaurant_staff').where({
      isDeleted: false
    })

    // 租户隔离
    const queryTenantId = tenantId || user.tenantId
    if (queryTenantId) {
      query = query.where({ tenantId: queryTenantId })
    }

    if (restaurantId) {
      query = query.where({ restaurantId: restaurantId })
    }

    // 筛选条件
    if (filters.isVegetarian !== undefined) {
      query = query.where({ 'vegetarianInfo.isVegetarian': filters.isVegetarian })
    }

    if (filters.vegetarianType) {
      query = query.where({ 'vegetarianInfo.vegetarianType': filters.vegetarianType })
    }

    if (filters.position) {
      query = query.where({ 'basicInfo.position': db.RegExp({ regexp: filters.position, options: 'i' }) })
    }

    // 搜索条件
    if (search) {
      query = query.where(_.or([
        { 'basicInfo.name': db.RegExp({ regexp: search, options: 'i' }) },
        { staffId: db.RegExp({ regexp: search, options: 'i' }) }
      ]))
    }

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total

    // 分页查询
    const skip = (page - 1) * pageSize
    const result = await query
      .orderBy(sortBy, sortOrder)
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        list: result.data,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    console.error('查询员工列表失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message,
      data: { list: [], total: 0 }
    }
  }
}

/**
 * 删除员工（软删除）
 */
async function deleteStaff(staffId, user) {
  try {
    const now = new Date()
    
    await db.collection('restaurant_staff').doc(staffId).update({
      data: {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now
      }
    })

    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除员工失败:', error)
    return {
      code: 500,
      message: '删除失败',
      error: error.message
    }
  }
}

/**
 * 创建或更新客户
 */
async function createOrUpdateCustomer(customerData, user) {
  try {
    const now = new Date()
    const customerId = customerData.customerId || generateCustomerId(customerData.userId)
    
    // 检查客户是否已存在
    const existingResult = await db.collection('restaurant_customers')
      .where({
        customerId: customerId,
        restaurantId: customerData.restaurantId,
        isDeleted: false
      })
      .get()

    const vegetarianInfo = {
      isVegetarian: customerData.vegetarianInfo.isVegetarian || false,
      vegetarianType: customerData.vegetarianInfo.vegetarianType || 'other',
      vegetarianYears: customerData.vegetarianInfo.vegetarianYears || '',
      vegetarianStartYear: customerData.vegetarianInfo.vegetarianStartYear || null,
      lastUpdateDate: now
    }

    if (existingResult.data.length > 0) {
      // 更新现有客户
      const existing = existingResult.data[0]
      
      // 保存历史版本
      const history = existing.history || []
      if (existing.vegetarianInfo) {
        history.push({
          vegetarianInfo: existing.vegetarianInfo,
          updatedAt: existing.vegetarianInfo.lastUpdateDate || existing.updatedAt,
          updatedBy: 'customer'
        })
      }

      await db.collection('restaurant_customers').doc(existing._id).update({
        data: {
          vegetarianInfo: vegetarianInfo,
          history: history,
          updatedAt: now
        }
      })

      return {
        code: 0,
        message: '更新成功',
        data: {
          customerId: customerId,
          updatedAt: now
        }
      }
    } else {
      // 创建新客户
      const customer = {
        customerId: customerId,
        userId: customerData.userId || null,
        restaurantId: customerData.restaurantId,
        tenantId: customerData.tenantId || user.tenantId,
        basicInfo: {
          nickname: (customerData.basicInfo && customerData.basicInfo.nickname) || '',
          avatar: (customerData.basicInfo && customerData.basicInfo.avatar) || '',
          phone: (customerData.basicInfo && customerData.basicInfo.phone) || '',
        },
        vegetarianInfo: {
          ...vegetarianInfo,
          firstRecordDate: now
        },
        consumptionStats: {
          totalOrders: 0,
          totalAmount: 0,
          firstOrderDate: null,
          lastOrderDate: null,
          averageOrderAmount: 0,
        },
        history: [],
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
        deletedAt: null,
      }

      const result = await db.collection('restaurant_customers').add({ data: customer })

      return {
        code: 0,
        message: '创建成功',
        data: {
          _id: result._id,
          customerId: customerId,
          createdAt: now
        }
      }
    }
  } catch (error) {
    console.error('创建/更新客户失败:', error)
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}

/**
 * 获取客户信息
 */
async function getCustomerInfo(customerId, restaurantId) {
  try {
    let query = db.collection('restaurant_customers').where({
      customerId: customerId,
      isDeleted: false
    })

    if (restaurantId) {
      query = query.where({ restaurantId: restaurantId })
    }

    const result = await query.get()
    
    if (result.data.length === 0) {
      return {
        code: 404,
        message: '客户不存在'
      }
    }

    return {
      code: 0,
      data: result.data[0]
    }
  } catch (error) {
    console.error('获取客户信息失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}

/**
 * 查询客户列表
 */
async function listCustomers(params, user) {
  try {
    const { restaurantId, tenantId, page = 1, pageSize = 20, filters = {}, search, sortBy = 'createdAt', sortOrder = 'desc' } = params

    // 构建查询条件
    let query = db.collection('restaurant_customers').where({
      isDeleted: false
    })

    // 租户隔离
    const queryTenantId = tenantId || user.tenantId
    if (queryTenantId) {
      query = query.where({ tenantId: queryTenantId })
    }

    if (restaurantId) {
      query = query.where({ restaurantId: restaurantId })
    }

    // 筛选条件
    if (filters.isVegetarian !== undefined) {
      query = query.where({ 'vegetarianInfo.isVegetarian': filters.isVegetarian })
    }

    if (filters.vegetarianType) {
      query = query.where({ 'vegetarianInfo.vegetarianType': filters.vegetarianType })
    }

    if (filters.vegetarianYears) {
      query = query.where({ 'vegetarianInfo.vegetarianYears': filters.vegetarianYears })
    }

    // 搜索条件
    if (search) {
      query = query.where(_.or([
        { 'basicInfo.nickname': db.RegExp({ regexp: search, options: 'i' }) },
        { customerId: db.RegExp({ regexp: search, options: 'i' }) },
        { 'basicInfo.phone': db.RegExp({ regexp: search, options: 'i' }) }
      ]))
    }

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total

    // 分页查询
    const skip = (page - 1) * pageSize
    const result = await query
      .orderBy(sortBy, sortOrder)
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        list: result.data,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    console.error('查询客户列表失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message,
      data: { list: [], total: 0 }
    }
  }
}

/**
 * 获取员工统计
 */
async function getStaffStats(params, user) {
  try {
    const { restaurantId, tenantId, startDate, endDate } = params

    // 构建查询条件
    let query = db.collection('restaurant_staff').where({
      isDeleted: false
    })

    const queryTenantId = tenantId || user.tenantId
    if (queryTenantId) {
      query = query.where({ tenantId: queryTenantId })
    }

    if (restaurantId) {
      query = query.where({ restaurantId: restaurantId })
    }

    const result = await query.get()
    const staffList = result.data

    // 计算统计
    const totalStaff = staffList.length
    const vegetarianStaff = staffList.filter(s => s.vegetarianInfo.isVegetarian).length
    const vegetarianRatio = totalStaff > 0 ? (vegetarianStaff / totalStaff * 100).toFixed(2) : 0

    // 素食类型分布
    const vegetarianTypeDistribution = {
      pure: 0,
      ovo_lacto: 0,
      flexible: 0,
      other: 0
    }

    staffList.forEach(staff => {
      if (staff.vegetarianInfo.isVegetarian) {
        const type = staff.vegetarianInfo.vegetarianType || 'other'
        if (vegetarianTypeDistribution.hasOwnProperty(type)) {
          vegetarianTypeDistribution[type]++
        } else {
          vegetarianTypeDistribution.other++
        }
      }
    })

    // 计算平均素食年限
    const currentYear = new Date().getFullYear()
    const vegetarianYearsList = staffList
      .filter(s => s.vegetarianInfo.isVegetarian && s.vegetarianInfo.vegetarianStartYear)
      .map(s => currentYear - s.vegetarianInfo.vegetarianStartYear)
    
    const averageVegetarianYears = vegetarianYearsList.length > 0
      ? (vegetarianYearsList.reduce((a, b) => a + b, 0) / vegetarianYearsList.length).toFixed(1)
      : 0

    return {
      code: 0,
      data: {
        totalStaff: totalStaff,
        vegetarianStaff: vegetarianStaff,
        vegetarianRatio: parseFloat(vegetarianRatio),
        vegetarianTypeDistribution: vegetarianTypeDistribution,
        averageVegetarianYears: parseFloat(averageVegetarianYears)
      }
    }
  } catch (error) {
    console.error('获取员工统计失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}

/**
 * 获取客户统计
 */
async function getCustomerStats(params, user) {
  try {
    const { restaurantId, tenantId, startDate, endDate } = params

    // 构建查询条件
    let query = db.collection('restaurant_customers').where({
      isDeleted: false
    })

    const queryTenantId = tenantId || user.tenantId
    if (queryTenantId) {
      query = query.where({ tenantId: queryTenantId })
    }

    if (restaurantId) {
      query = query.where({ restaurantId: restaurantId })
    }

    const result = await query.get()
    const customerList = result.data

    // 计算统计
    const totalCustomers = customerList.length
    const vegetarianCustomers = customerList.filter(c => c.vegetarianInfo.isVegetarian).length
    const vegetarianRatio = totalCustomers > 0 ? (vegetarianCustomers / totalCustomers * 100).toFixed(2) : 0

    // 素食类型分布
    const vegetarianTypeDistribution = {
      regular: 0,
      occasional: 0,
      ovo_lacto: 0,
      pure: 0,
      other: 0
    }

    // 素食年限分布
    const vegetarianYearsDistribution = {
      less_than_1: 0,
      '1_2': 0,
      '3_5': 0,
      '5_10': 0,
      more_than_10: 0
    }

    customerList.forEach(customer => {
      if (customer.vegetarianInfo.isVegetarian) {
        const type = customer.vegetarianInfo.vegetarianType || 'other'
        if (vegetarianTypeDistribution.hasOwnProperty(type)) {
          vegetarianTypeDistribution[type]++
        } else {
          vegetarianTypeDistribution.other++
        }

        const years = customer.vegetarianInfo.vegetarianYears || ''
        if (vegetarianYearsDistribution.hasOwnProperty(years)) {
          vegetarianYearsDistribution[years]++
        }
      }
    })

    return {
      code: 0,
      data: {
        totalCustomers: totalCustomers,
        vegetarianCustomers: vegetarianCustomers,
        vegetarianRatio: parseFloat(vegetarianRatio),
        vegetarianTypeDistribution: vegetarianTypeDistribution,
        vegetarianYearsDistribution: vegetarianYearsDistribution,
        newCustomers: 0, // TODO: 根据日期范围计算
        newVegetarianCustomers: 0 // TODO: 根据日期范围计算
      }
    }
  } catch (error) {
    console.error('获取客户统计失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action, data } = event

  try {
    // 大部分操作需要权限验证（除了C端客户录入）
    let user = null
    if (action !== 'submitVegetarianInfo' && action !== 'getMyVegetarianInfo') {
      try {
        user = await checkPermission(event, context)
      } catch (error) {
        return error
      }
    }

    switch (action) {
      // 员工管理
      case 'createStaff':
        return await createStaff(data, user)
      
      case 'updateStaff':
        {
          // 检查权限：只能更新自己租户的数据
          const staffResult = await db.collection('restaurant_staff').doc(data.staffId).get()
          if (!staffResult.data) {
            return { code: 404, message: '员工不存在' }
          }
          if (user.role !== 'system_admin' && staffResult.data.tenantId !== user.tenantId) {
            return { code: 403, message: '无权限操作' }
          }
          return await updateStaff(data.staffId, data, user)
        }

      case 'listStaff':
        return await listStaff(data, user)

      case 'deleteStaff':
        {
          // 检查权限
          const staffResult = await db.collection('restaurant_staff').doc(data.staffId).get()
          if (!staffResult.data) {
            return { code: 404, message: '员工不存在' }
          }
          if (user.role !== 'system_admin' && staffResult.data.tenantId !== user.tenantId) {
            return { code: 403, message: '无权限操作' }
          }
          return await deleteStaff(data.staffId, user)
        }

      // 客户管理
      case 'createOrUpdateCustomer':
        // C端调用时user可能为null，使用传入的tenantId
        return await createOrUpdateCustomer(data, user || { tenantId: data.tenantId })

      case 'getCustomerInfo':
        return await getCustomerInfo(data.customerId, data.restaurantId)

      case 'listCustomers':
        return await listCustomers(data, user)

      // 统计接口
      case 'getStaffStats':
        return await getStaffStats(data, user)

      case 'getCustomerStats':
        return await getCustomerStats(data, user)

      // C端接口（客户自助录入）
      case 'submitVegetarianInfo':
        {
          // C端调用，验证微信用户
          const wxContext = cloud.getWXContext()
          const openid = wxContext.OPENID
          if (!openid) {
            return { code: 401, message: '未授权访问' }
          }
          // 从users集合获取userId
          const userResult = await db.collection('users').where({ openid }).get()
          const userId = userResult.data.length > 0 ? userResult.data[0]._id : null
          data.userId = userId
          data.customerId = generateCustomerId(userId)
          return await createOrUpdateCustomer(data, {})
        }

      case 'getMyVegetarianInfo':
        {
          // C端调用，验证微信用户
          const wxContext = cloud.getWXContext()
          const openid = wxContext.OPENID
          if (!openid) {
            return { code: 401, message: '未授权访问' }
          }
          // 从users集合获取userId
          const userResult = await db.collection('users').where({ openid }).get()
          const userId = userResult.data.length > 0 ? userResult.data[0]._id : null
          const customerId = generateCustomerId(userId)
          return await getCustomerInfo(customerId, data.restaurantId)
        }

      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('云函数执行失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试',
      error: error.message
    }
  }
}

