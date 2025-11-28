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
const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')

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
    
    // 先通过 staffId 查找文档，获取 _id
    const staffResult = await db.collection('restaurant_staff')
      .where({
        staffId: staffId,
        isDeleted: false
      })
      .get()
    
    if (!staffResult.data || staffResult.data.length === 0) {
      return {
        code: 404,
        message: '员工不存在'
      }
    }
    
    const staffDoc = staffResult.data[0]
    const staffDocId = staffDoc._id
    
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

    // 使用 _id 更新文档
    await db.collection('restaurant_staff').doc(staffDocId).update({
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
    
    // 先通过 staffId 查找文档，获取 _id
    const staffResult = await db.collection('restaurant_staff')
      .where({
        staffId: staffId,
        isDeleted: false
      })
      .get()
    
    if (!staffResult.data || staffResult.data.length === 0) {
      return {
        code: 404,
        message: '员工不存在'
      }
    }
    
    const staffDoc = staffResult.data[0]
    const staffDocId = staffDoc._id
    
    // 使用 _id 更新文档
    await db.collection('restaurant_staff').doc(staffDocId).update({
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
    // 构建查询条件
    const queryCondition = {
      customerId: customerId,
      isDeleted: false
    }

    // 如果提供了 restaurantId，添加到查询条件中
    if (restaurantId) {
      queryCondition.restaurantId = restaurantId
    }

    const result = await db.collection('restaurant_customers')
      .where(queryCondition)
      .get()
    
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
        newCustomers: 0, // 根据日期范围计算（后续扩展功能）
        newVegetarianCustomers: 0 // 根据日期范围计算（后续扩展功能）
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
 * 生成统计数据快照
 */
async function generateStatsSnapshot(params, user) {
  try {
    const { restaurantId, tenantId, statDate, statType = 'daily' } = params
    
    const queryTenantId = tenantId || user.tenantId
    const snapshotDate = statDate ? new Date(statDate) : new Date()
    
    // 获取员工统计
    const staffStatsResult = await getStaffStats({ restaurantId, tenantId: queryTenantId }, user)
    if (staffStatsResult.code !== 0) {
      throw new Error('获取员工统计失败')
    }
    
    // 获取客户统计
    const customerStatsResult = await getCustomerStats({ restaurantId, tenantId: queryTenantId }, user)
    if (customerStatsResult.code !== 0) {
      throw new Error('获取客户统计失败')
    }
    
    // 构建快照数据
    const snapshot = {
      restaurantId: restaurantId || null,
      tenantId: queryTenantId,
      statDate: snapshotDate,
      statType: statType, // daily, monthly, yearly
      staffStats: staffStatsResult.data,
      customerStats: customerStatsResult.data,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 检查是否已存在同一天/月的快照
    const existingQuery = {
      tenantId: queryTenantId,
      statType: statType
    }
    
    if (restaurantId) {
      existingQuery.restaurantId = restaurantId
    }
    
    // 根据统计类型设置日期查询范围
    const dateStr = snapshotDate.toISOString().slice(0, statType === 'daily' ? 10 : (statType === 'monthly' ? 7 : 4))
    const existingResult = await db.collection('vegetarian_personnel_stats')
      .where(existingQuery)
      .get()
    
    const existing = existingResult.data.find(item => {
      const itemDateStr = new Date(item.statDate).toISOString().slice(0, statType === 'daily' ? 10 : (statType === 'monthly' ? 7 : 4))
      return itemDateStr === dateStr
    })
    
    if (existing) {
      // 更新现有快照
      await db.collection('vegetarian_personnel_stats').doc(existing._id).update({
        data: {
          staffStats: snapshot.staffStats,
          customerStats: snapshot.customerStats,
          updatedAt: new Date()
        }
      })
      
      return {
        code: 0,
        message: '统计数据快照更新成功',
        data: {
          _id: existing._id,
          statDate: snapshotDate,
          statType: statType
        }
      }
    } else {
      // 创建新快照
      const result = await db.collection('vegetarian_personnel_stats').add({
        data: snapshot
      })
      
      return {
        code: 0,
        message: '统计数据快照生成成功',
        data: {
          _id: result._id,
          statDate: snapshotDate,
          statType: statType
        }
      }
    }
  } catch (error) {
    console.error('生成统计数据快照失败:', error)
    return {
      code: 500,
      message: '生成快照失败',
      error: error.message
    }
  }
}

/**
 * 获取减碳效应分析
 */
async function getCarbonEffectAnalysis(params, user) {
  try {
    const { restaurantId, tenantId, startDate, endDate } = params
    
    const queryTenantId = tenantId || user.tenantId
    
    // 获取员工统计
    const staffStatsResult = await getStaffStats({ restaurantId, tenantId: queryTenantId }, user)
    if (staffStatsResult.code !== 0) {
      throw new Error('获取员工统计失败')
    }
    
    // 获取客户统计
    const customerStatsResult = await getCustomerStats({ restaurantId, tenantId: queryTenantId }, user)
    if (customerStatsResult.code !== 0) {
      throw new Error('获取客户统计失败')
    }
    
    const staffStats = staffStatsResult.data
    const customerStats = customerStatsResult.data
    
    // 减碳计算参数
    // 参考：一个素食者每天可减少约 1.5-2.5 kg CO2e 的碳排放
    const DAILY_CARBON_REDUCTION_PER_VEGETARIAN = 2.0 // kg CO2e/天/人
    
    // 计算员工减碳效应
    const staffCarbonEffect = {
      totalReduction: 0,
      averageReduction: 0,
      description: ''
    }
    
    if (staffStats.vegetarianStaff > 0) {
      // 基于素食年限计算总减碳量
      const currentYear = new Date().getFullYear()
      
      // 获取员工列表计算总减碳天数
      let query = db.collection('restaurant_staff').where({
        isDeleted: false,
        tenantId: queryTenantId,
        'vegetarianInfo.isVegetarian': true
      })
      
      if (restaurantId) {
        query = query.where({ restaurantId: restaurantId })
      }
      
      const staffResult = await query.get()
      const vegetarianStaffList = staffResult.data
      
      let totalReductionDays = 0
      vegetarianStaffList.forEach(staff => {
        if (staff.vegetarianInfo.vegetarianStartYear) {
          const vegetarianYears = currentYear - staff.vegetarianInfo.vegetarianStartYear
          totalReductionDays += vegetarianYears * 365
        } else {
          // 如果没有起始年份，假设为1年
          totalReductionDays += 365
        }
      })
      
      staffCarbonEffect.totalReduction = Math.round(totalReductionDays * DAILY_CARBON_REDUCTION_PER_VEGETARIAN * 100) / 100
      staffCarbonEffect.averageReduction = staffStats.vegetarianStaff > 0 
        ? Math.round((staffCarbonEffect.totalReduction / staffStats.vegetarianStaff) * 100) / 100
        : 0
      staffCarbonEffect.description = `${staffStats.vegetarianStaff} 名素食员工累计减碳 ${staffCarbonEffect.totalReduction.toFixed(2)} kg CO₂e`
    }
    
    // 计算客户减碳效应
    const customerCarbonEffect = {
      totalReduction: 0,
      averageReduction: 0,
      description: ''
    }
    
    if (customerStats.vegetarianCustomers > 0) {
      // 获取客户列表计算减碳量
      let query = db.collection('restaurant_customers').where({
        isDeleted: false,
        tenantId: queryTenantId,
        'vegetarianInfo.isVegetarian': true
      })
      
      if (restaurantId) {
        query = query.where({ restaurantId: restaurantId })
      }
      
      const customerResult = await query.get()
      const vegetarianCustomerList = customerResult.data
      
      // 基于素食年限和订单数量计算减碳量
      let totalReduction = 0
      const currentYear = new Date().getFullYear()
      
      vegetarianCustomerList.forEach(customer => {
        let reductionDays = 0
        
        // 根据素食年限范围估算天数
        if (customer.vegetarianInfo.vegetarianYears) {
          const yearsRange = customer.vegetarianInfo.vegetarianYears
          if (yearsRange === 'less_than_1') {
            reductionDays = 180 // 约6个月
          } else if (yearsRange === '1_2') {
            reductionDays = 547.5 // 约1.5年（(1+2)/2 * 365）
          } else if (yearsRange === '3_5') {
            reductionDays = 1460 // 约4年（(3+5)/2 * 365）
          } else if (yearsRange === '5_10') {
            reductionDays = 2737.5 // 约7.5年（(5+10)/2 * 365）
          } else if (yearsRange === 'more_than_10') {
            reductionDays = 5475 // 约15年（假设10年以上平均为15年）
          } else if (customer.vegetarianInfo.vegetarianStartYear) {
            reductionDays = (currentYear - customer.vegetarianInfo.vegetarianStartYear) * 365
          } else {
            reductionDays = 365 // 默认1年
          }
        } else if (customer.vegetarianInfo.vegetarianStartYear) {
          reductionDays = (currentYear - customer.vegetarianInfo.vegetarianStartYear) * 365
        } else {
          reductionDays = 365 // 默认1年
        }
        
        // 根据订单数量调整（客户可能不是每天在餐厅就餐）
        // 使用 consumptionStats 中的 totalOrders 字段
        const orderCount = (customer.consumptionStats && customer.consumptionStats.totalOrders) || 0
        
        // 如果客户有订单记录，按订单数量调整减碳天数
        // 假设每次订单影响30天，但不超过素食年限对应的天数
        // 如果没有订单记录或订单很少，则使用完整的素食年限天数
        let orderAdjustedDays = reductionDays
        if (orderCount > 0) {
          // 订单调整天数：假设每订单影响30天，但不超过素食年限天数
          const orderBasedDays = orderCount * 30
          // 如果订单天数较少，使用订单天数；否则使用素食年限天数
          // 但客户减碳按50%计算（非全职素食），所以最终使用较小的值
          orderAdjustedDays = Math.min(reductionDays, orderBasedDays)
        }
        
        totalReduction += orderAdjustedDays * DAILY_CARBON_REDUCTION_PER_VEGETARIAN * 0.5 // 客户减碳贡献按50%计算（非全职素食）
      })
      
      customerCarbonEffect.totalReduction = Math.round(totalReduction * 100) / 100
      customerCarbonEffect.averageReduction = customerStats.vegetarianCustomers > 0
        ? Math.round((customerCarbonEffect.totalReduction / customerStats.vegetarianCustomers) * 100) / 100
        : 0
      customerCarbonEffect.description = `${customerStats.vegetarianCustomers} 名素食客户累计减碳 ${customerCarbonEffect.totalReduction.toFixed(2)} kg CO₂e`
    }
    
    // 总减碳量
    const totalCarbonEffect = Math.round((staffCarbonEffect.totalReduction + customerCarbonEffect.totalReduction) * 100) / 100
    
    // 生成分析报告
    const report = {
      summary: {
        totalCarbonEffect: totalCarbonEffect,
        staffContribution: staffCarbonEffect.totalReduction,
        customerContribution: customerCarbonEffect.totalReduction,
        staffContributionRatio: totalCarbonEffect > 0 
          ? Math.round((staffCarbonEffect.totalReduction / totalCarbonEffect) * 100)
          : 0,
        customerContributionRatio: totalCarbonEffect > 0
          ? Math.round((customerCarbonEffect.totalReduction / totalCarbonEffect) * 100)
          : 0
      },
      staffAnalysis: {
        vegetarianCount: staffStats.vegetarianStaff,
        vegetarianRatio: staffStats.vegetarianRatio,
        averageYears: staffStats.averageVegetarianYears,
        carbonReduction: staffCarbonEffect.totalReduction,
        description: staffCarbonEffect.description
      },
      customerAnalysis: {
        vegetarianCount: customerStats.vegetarianCustomers,
        vegetarianRatio: customerStats.vegetarianRatio,
        carbonReduction: customerCarbonEffect.totalReduction,
        description: customerCarbonEffect.description
      },
      insights: [
        `素食人员总数：${staffStats.vegetarianStaff + customerStats.vegetarianCustomers} 人`,
        `员工素食比例：${staffStats.vegetarianRatio.toFixed(1)}%`,
        `客户素食比例：${customerStats.vegetarianRatio.toFixed(1)}%`,
        `累计减碳总量：${totalCarbonEffect.toFixed(2)} kg CO₂e`,
        `相当于种植树木：${Math.round(totalCarbonEffect / 18)} 棵（每棵树每年吸收约 18 kg CO₂）`,
        `相当于节省电力：${Math.round(totalCarbonEffect / 0.5)} 度（每度电约产生 0.5 kg CO₂）`
      ],
      generatedAt: new Date().toISOString()
    }
    
    return {
      code: 0,
      data: {
        staffCarbonEffect: staffCarbonEffect,
        customerCarbonEffect: customerCarbonEffect,
        totalCarbonEffect: totalCarbonEffect,
        report: JSON.stringify(report)
      }
    }
  } catch (error) {
    console.error('获取减碳效应分析失败:', error)
    return {
      code: 500,
      message: '分析失败',
      error: error.message
    }
  }
}

/**
 * 生成员工数据 Excel 文件
 */
async function generateStaffExcel(staffList) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('员工数据')

  // 设置列
  worksheet.columns = [
    { header: '员工ID', key: 'staffId', width: 20 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '职位', key: 'position', width: 15 },
    { header: '电话', key: 'phone', width: 15 },
    { header: '邮箱', key: 'email', width: 25 },
    { header: '入职日期', key: 'joinDate', width: 15 },
    { header: '是否素食', key: 'isVegetarian', width: 12 },
    { header: '素食类型', key: 'vegetarianType', width: 15 },
    { header: '素食起始年份', key: 'vegetarianStartYear', width: 15 },
    { header: '创建时间', key: 'createdAt', width: 20 }
  ]

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  // 添加数据行
  staffList.forEach((staff) => {
    worksheet.addRow({
      staffId: staff.staffId || '',
      name: (staff.basicInfo && staff.basicInfo.name) || '',
      position: (staff.basicInfo && staff.basicInfo.position) || '',
      phone: (staff.basicInfo && staff.basicInfo.phone) || '',
      email: (staff.basicInfo && staff.basicInfo.email) || '',
      joinDate: (staff.basicInfo && staff.basicInfo.joinDate) ? new Date(staff.basicInfo.joinDate).toISOString().slice(0, 10) : '',
      isVegetarian: (staff.vegetarianInfo && staff.vegetarianInfo.isVegetarian) ? '是' : '否',
      vegetarianType: (staff.vegetarianInfo && staff.vegetarianInfo.vegetarianType) || '',
      vegetarianStartYear: (staff.vegetarianInfo && staff.vegetarianInfo.vegetarianStartYear) || '',
      createdAt: staff.createdAt ? new Date(staff.createdAt).toISOString().slice(0, 19) : ''
    })
  })

  // 生成 buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

/**
 * 上传文件到云存储并返回下载链接
 */
async function uploadFileToCloudStorage(buffer, fileName, folder = 'vegetarian-personnel') {
  try {
    const timestamp = Date.now()
    const cloudPath = `${folder}/${timestamp}_${fileName}`
    
    // 上传文件
    const uploadRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    })

    const fileID = uploadRes.fileID

    // 获取临时访问URL（有效期24小时）
    let downloadUrl = fileID
    try {
      const urlRes = await cloud.getTempFileURL({ fileList: [fileID] })
      downloadUrl = urlRes && urlRes.fileList && urlRes.fileList[0] ? urlRes.fileList[0].tempFileURL : fileID
    } catch (err) {
      console.warn('获取临时URL失败:', err)
    }

    // 计算过期时间（24小时后）
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    return {
      fileId: fileID,
      downloadUrl: downloadUrl,
      expiresAt: expiresAt
    }
  } catch (error) {
    console.error('上传文件到云存储失败:', error)
    throw error
  }
}

/**
 * 生成员工数据 Excel 文件
 */
async function generateStaffExcel(staffList) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('员工数据')

  // 设置列
  worksheet.columns = [
    { header: '员工ID', key: 'staffId', width: 20 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '职位', key: 'position', width: 15 },
    { header: '电话', key: 'phone', width: 15 },
    { header: '是否素食', key: 'isVegetarian', width: 12 },
    { header: '素食类型', key: 'vegetarianType', width: 15 },
    { header: '素食起始年份', key: 'vegetarianStartYear', width: 15 }
  ]

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  // 添加数据行
  staffList.forEach((staff) => {
    worksheet.addRow({
      staffId: staff.staffId || '',
      name: (staff.basicInfo && staff.basicInfo.name) || '',
      position: (staff.basicInfo && staff.basicInfo.position) || '',
      phone: (staff.basicInfo && staff.basicInfo.phone) || '',
      isVegetarian: (staff.vegetarianInfo && staff.vegetarianInfo.isVegetarian) ? '是' : '否',
      vegetarianType: (staff.vegetarianInfo && staff.vegetarianInfo.vegetarianType) || '',
      vegetarianStartYear: (staff.vegetarianInfo && staff.vegetarianInfo.vegetarianStartYear) || ''
    })
  })

  // 生成 buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

/**
 * 生成客户数据 Excel 文件
 */
async function generateCustomerExcel(customerList) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('客户数据')

  worksheet.columns = [
    { header: '客户ID', key: 'customerId', width: 20 },
    { header: '昵称', key: 'nickname', width: 15 },
    { header: '电话', key: 'phone', width: 15 },
    { header: '是否素食', key: 'isVegetarian', width: 12 },
    { header: '素食类型', key: 'vegetarianType', width: 15 },
    { header: '素食年限', key: 'vegetarianYears', width: 15 },
    { header: '总订单数', key: 'totalOrders', width: 12 },
    { header: '总消费金额', key: 'totalAmount', width: 15 }
  ]

  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  customerList.forEach((customer) => {
    worksheet.addRow({
      customerId: customer.customerId || '',
      nickname: (customer.basicInfo && customer.basicInfo.nickname) || '',
      phone: (customer.basicInfo && customer.basicInfo.phone) || '',
      isVegetarian: (customer.vegetarianInfo && customer.vegetarianInfo.isVegetarian) ? '是' : '否',
      vegetarianType: (customer.vegetarianInfo && customer.vegetarianInfo.vegetarianType) || '',
      vegetarianYears: (customer.vegetarianInfo && customer.vegetarianInfo.vegetarianYears) || '',
      totalOrders: (customer.consumptionStats && customer.consumptionStats.totalOrders) || 0,
      totalAmount: (customer.consumptionStats && customer.consumptionStats.totalAmount) || 0
    })
  })

  return await workbook.xlsx.writeBuffer()
}

/**
 * 生成 ESG 报告 Excel 文件
 */
async function generateESGExcel(esgReportData) {
  const workbook = new ExcelJS.Workbook()

  // 员工统计
  const staffSheet = workbook.addWorksheet('员工统计')
  staffSheet.columns = [
    { header: '指标', key: 'metric', width: 20 },
    { header: '数值', key: 'value', width: 20 }
  ]
  staffSheet.getRow(1).font = { bold: true }
  staffSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

  const staffStats = esgReportData.staffStats || {}
  staffSheet.addRow({ metric: '总员工数', value: staffStats.totalStaff || 0 })
  staffSheet.addRow({ metric: '素食员工数', value: staffStats.vegetarianStaff || 0 })
  staffSheet.addRow({ metric: '素食比例', value: staffStats.vegetarianRatio ? `${Number(staffStats.vegetarianRatio).toFixed(2)}%` : '0%' })
  staffSheet.addRow({ metric: '平均素食年限', value: staffStats.averageVegetarianYears ? `${staffStats.averageVegetarianYears}年` : '0年' })

  // 客户统计
  const customerSheet = workbook.addWorksheet('客户统计')
  customerSheet.columns = [
    { header: '指标', key: 'metric', width: 20 },
    { header: '数值', key: 'value', width: 20 }
  ]
  customerSheet.getRow(1).font = { bold: true }
  customerSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

  const customerStats = esgReportData.customerStats || {}
  customerSheet.addRow({ metric: '总客户数', value: customerStats.totalCustomers || 0 })
  customerSheet.addRow({ metric: '素食客户数', value: customerStats.vegetarianCustomers || 0 })
  customerSheet.addRow({ metric: '素食比例', value: customerStats.vegetarianRatio ? `${Number(customerStats.vegetarianRatio).toFixed(2)}%` : '0%' })

  // 减碳效应
  const carbonSheet = workbook.addWorksheet('减碳效应')
  carbonSheet.columns = [
    { header: '指标', key: 'metric', width: 25 },
    { header: '数值', key: 'value', width: 20 }
  ]
  carbonSheet.getRow(1).font = { bold: true }
  carbonSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

  const carbonEffect = esgReportData.carbonEffect || {}
  carbonSheet.addRow({ metric: '员工减碳总量', value: carbonEffect.staffCarbonEffect?.totalReduction || 0 })
  carbonSheet.addRow({ metric: '客户减碳总量', value: carbonEffect.customerCarbonEffect?.totalReduction || 0 })
  carbonSheet.addRow({ metric: '总减碳量 (kg CO₂e)', value: carbonEffect.totalCarbonEffect || 0 })

  return await workbook.xlsx.writeBuffer()
}

/**
 * 生成员工数据 PDF 文件
 */
async function generateStaffPDF(staffList) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      })

      // 加载中文字体
      const { loadChineseFont, getChineseFont, getChineseBoldFont } = require('./font-loader')
      const hasChineseFont = loadChineseFont(doc)
      const chineseFont = getChineseFont(hasChineseFont)
      const chineseBoldFont = getChineseBoldFont(hasChineseFont)

      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // 标题
      doc.fontSize(20)
        .font(chineseBoldFont)
        .text('员工素食情况数据', { align: 'center' })
        .moveDown()

      // 生成时间
      doc.fontSize(10)
        .font(chineseFont)
        .fillColor('#666666')
        .text(`生成时间：${new Date().toLocaleString('zh-CN')}`, { align: 'right' })
        .moveDown(0.5)

      // 表格
      const tableTop = doc.y
      const itemHeight = 25
      const colWidths = {
        name: 80,
        position: 80,
        phone: 100,
        isVegetarian: 70,
        type: 100,
        startYear: 80
      }

      // 表头
      doc.fontSize(10)
        .font(chineseBoldFont)
        .fillColor('#000000')
      doc.text('姓名', 50, tableTop, { width: colWidths.name })
      doc.text('职位', 50 + colWidths.name, tableTop, { width: colWidths.position })
      doc.text('电话', 50 + colWidths.name + colWidths.position, tableTop, { width: colWidths.phone })
      doc.text('是否素食', 50 + colWidths.name + colWidths.position + colWidths.phone, tableTop, { width: colWidths.isVegetarian })
      doc.text('素食类型', 50 + colWidths.name + colWidths.position + colWidths.phone + colWidths.isVegetarian, tableTop, { width: colWidths.type })
      doc.text('起始年份', 50 + colWidths.name + colWidths.position + colWidths.phone + colWidths.isVegetarian + colWidths.type, tableTop, { width: colWidths.startYear })

      // 表头下划线
      doc.moveTo(50, tableTop + 20)
        .lineTo(550, tableTop + 20)
        .stroke()

      // 数据行
      doc.fontSize(9)
        .font(chineseFont)
      let currentY = tableTop + 30
      staffList.forEach((staff, index) => {
        if (currentY > 750) {
          // 新页面
          doc.addPage()
          currentY = 50
        }

        const name = (staff.basicInfo && staff.basicInfo.name) || '-'
        const position = (staff.basicInfo && staff.basicInfo.position) || '-'
        const phone = (staff.basicInfo && staff.basicInfo.phone) || '-'
        const isVegetarian = (staff.vegetarianInfo && staff.vegetarianInfo.isVegetarian) ? '是' : '否'
        const type = (staff.vegetarianInfo && staff.vegetarianInfo.vegetarianType) || '-'
        const startYear = (staff.vegetarianInfo && staff.vegetarianInfo.vegetarianStartYear) || '-'

        doc.text(name || '-', 50, currentY, { width: colWidths.name })
        doc.text(position || '-', 50 + colWidths.name, currentY, { width: colWidths.position })
        doc.text(phone || '-', 50 + colWidths.name + colWidths.position, currentY, { width: colWidths.phone })
        doc.text(isVegetarian, 50 + colWidths.name + colWidths.position + colWidths.phone, currentY, { width: colWidths.isVegetarian })
        doc.text(type || '-', 50 + colWidths.name + colWidths.position + colWidths.phone + colWidths.isVegetarian, currentY, { width: colWidths.type })
        doc.text(startYear ? startYear.toString() : '-', 50 + colWidths.name + colWidths.position + colWidths.phone + colWidths.isVegetarian + colWidths.type, currentY, { width: colWidths.startYear })

        currentY += itemHeight
      })

      // 统计信息
      const statsY = currentY + 20
      doc.fontSize(10)
        .font(chineseBoldFont)
        .text('统计信息', 50, statsY)
        .moveDown(0.5)

      doc.fontSize(9)
        .font(chineseFont)
      const totalStaff = staffList.length
      const vegetarianStaff = staffList.filter(s => s.vegetarianInfo && s.vegetarianInfo.isVegetarian).length
      const vegetarianRatio = totalStaff > 0 ? ((vegetarianStaff / totalStaff) * 100).toFixed(2) : 0

      doc.text(`总员工数：${totalStaff}`)
      doc.text(`素食员工数：${vegetarianStaff}`)
      doc.text(`素食比例：${vegetarianRatio}%`)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 生成客户数据 PDF 文件
 */
async function generateCustomerPDF(customerList) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      })

      // 加载中文字体
      const { loadChineseFont, getChineseFont, getChineseBoldFont } = require('./font-loader')
      const hasChineseFont = loadChineseFont(doc)
      const chineseFont = getChineseFont(hasChineseFont)
      const chineseBoldFont = getChineseBoldFont(hasChineseFont)

      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // 标题
      doc.fontSize(20)
        .font(chineseBoldFont)
        .text('客户素食情况数据', { align: 'center' })
        .moveDown()

      // 生成时间
      doc.fontSize(10)
        .font(chineseFont)
        .fillColor('#666666')
        .text(`生成时间：${new Date().toLocaleString('zh-CN')}`, { align: 'right' })
        .moveDown(0.5)

      // 表格
      const tableTop = doc.y
      const itemHeight = 25
      const colWidths = {
        customerId: 100,
        nickname: 80,
        phone: 100,
        isVegetarian: 70,
        type: 100,
        years: 80
      }

      // 表头
      doc.fontSize(10)
        .font(chineseBoldFont)
        .fillColor('#000000')
      doc.text('客户ID', 50, tableTop, { width: colWidths.customerId })
      doc.text('昵称', 50 + colWidths.customerId, tableTop, { width: colWidths.nickname })
      doc.text('电话', 50 + colWidths.customerId + colWidths.nickname, tableTop, { width: colWidths.phone })
      doc.text('是否素食', 50 + colWidths.customerId + colWidths.nickname + colWidths.phone, tableTop, { width: colWidths.isVegetarian })
      doc.text('素食类型', 50 + colWidths.customerId + colWidths.nickname + colWidths.phone + colWidths.isVegetarian, tableTop, { width: colWidths.type })
      doc.text('素食年限', 50 + colWidths.customerId + colWidths.nickname + colWidths.phone + colWidths.isVegetarian + colWidths.type, tableTop, { width: colWidths.years })

      // 表头下划线
      doc.moveTo(50, tableTop + 20)
        .lineTo(550, tableTop + 20)
        .stroke()

      // 数据行
      doc.fontSize(9)
        .font(chineseFont)
      let currentY = tableTop + 30
      customerList.forEach((customer) => {
        if (currentY > 750) {
          doc.addPage()
          currentY = 50
        }

        const customerId = customer.customerId || '-'
        const nickname = (customer.basicInfo && customer.basicInfo.nickname) || '-'
        const phone = (customer.basicInfo && customer.basicInfo.phone) || '-'
        const isVegetarian = (customer.vegetarianInfo && customer.vegetarianInfo.isVegetarian) ? '是' : '否'
        const type = (customer.vegetarianInfo && customer.vegetarianInfo.vegetarianType) || '-'
        const years = (customer.vegetarianInfo && customer.vegetarianInfo.vegetarianYears) || '-'

        doc.text(customerId, 50, currentY, { width: colWidths.customerId })
        doc.text(nickname || '-', 50 + colWidths.customerId, currentY, { width: colWidths.nickname })
        doc.text(phone || '-', 50 + colWidths.customerId + colWidths.nickname, currentY, { width: colWidths.phone })
        doc.text(isVegetarian, 50 + colWidths.customerId + colWidths.nickname + colWidths.phone, currentY, { width: colWidths.isVegetarian })
        doc.text(type || '-', 50 + colWidths.customerId + colWidths.nickname + colWidths.phone + colWidths.isVegetarian, currentY, { width: colWidths.type })
        doc.text(years || '-', 50 + colWidths.customerId + colWidths.nickname + colWidths.phone + colWidths.isVegetarian + colWidths.type, currentY, { width: colWidths.years })

        currentY += itemHeight
      })

      // 统计信息
      const statsY = currentY + 20
      doc.fontSize(10)
        .font(chineseBoldFont)
        .text('统计信息', 50, statsY)
        .moveDown(0.5)

      doc.fontSize(9)
        .font(chineseFont)
      const totalCustomers = customerList.length
      const vegetarianCustomers = customerList.filter(c => c.vegetarianInfo && c.vegetarianInfo.isVegetarian).length
      const vegetarianRatio = totalCustomers > 0 ? ((vegetarianCustomers / totalCustomers) * 100).toFixed(2) : 0

      doc.text(`总客户数：${totalCustomers}`)
      doc.text(`素食客户数：${vegetarianCustomers}`)
      doc.text(`素食比例：${vegetarianRatio}%`)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 生成 ESG 报告 PDF 文件
 */
async function generateESGPDF(esgReportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      })

      // 加载中文字体
      const { loadChineseFont, getChineseFont, getChineseBoldFont } = require('./font-loader')
      const hasChineseFont = loadChineseFont(doc)
      const chineseFont = getChineseFont(hasChineseFont)
      const chineseBoldFont = getChineseBoldFont(hasChineseFont)

      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // 标题
      doc.fontSize(24)
        .font(chineseBoldFont)
        .text('素食人员 ESG 报告', { align: 'center' })
        .moveDown()

      // 报告期间
      if (esgReportData.period && (esgReportData.period.startDate || esgReportData.period.endDate)) {
        doc.fontSize(12)
          .font(chineseFont)
          .fillColor('#666666')
          .text(
            `报告期间：${esgReportData.period.startDate || '开始'} 至 ${esgReportData.period.endDate || '结束'}`,
            { align: 'center' }
          )
          .moveDown(0.5)
      }

      // 生成时间
      doc.fontSize(10)
        .font(chineseFont)
        .fillColor('#666666')
        .text(`生成时间：${new Date().toLocaleString('zh-CN')}`, { align: 'right' })
        .moveDown()

      // 员工统计
      doc.fontSize(16)
        .font(chineseBoldFont)
        .fillColor('#000000')
        .text('一、员工统计', 50, doc.y)
        .moveDown()

      const staffStats = esgReportData.staffStats || {}
      doc.fontSize(11)
        .font(chineseFont)
      doc.text(`总员工数：${staffStats.totalStaff || 0}`)
      doc.text(`素食员工数：${staffStats.vegetarianStaff || 0}`)
      doc.text(`素食比例：${staffStats.vegetarianRatio ? Number(staffStats.vegetarianRatio).toFixed(2) + '%' : '0%'}`)
      doc.text(`平均素食年限：${staffStats.averageVegetarianYears ? staffStats.averageVegetarianYears.toFixed(1) + '年' : '0年'}`)
      doc.moveDown()

      // 客户统计
      doc.fontSize(16)
        .font(chineseBoldFont)
        .text('二、客户统计', 50, doc.y)
        .moveDown()

      const customerStats = esgReportData.customerStats || {}
      doc.fontSize(11)
        .font(chineseFont)
      doc.text(`总客户数：${customerStats.totalCustomers || 0}`)
      doc.text(`素食客户数：${customerStats.vegetarianCustomers || 0}`)
      doc.text(`素食比例：${customerStats.vegetarianRatio ? Number(customerStats.vegetarianRatio).toFixed(2) + '%' : '0%'}`)
      doc.moveDown()

      // 减碳效应
      doc.fontSize(16)
        .font(chineseBoldFont)
        .text('三、减碳效应分析', 50, doc.y)
        .moveDown()

      const carbonEffect = esgReportData.carbonEffect || {}
      doc.fontSize(11)
        .font(chineseFont)
      doc.text(`员工减碳总量：${carbonEffect.staffCarbonEffect?.totalReduction || 0} kg CO₂e`)
      doc.text(`客户减碳总量：${carbonEffect.customerCarbonEffect?.totalReduction || 0} kg CO₂e`)
      doc.text(`总减碳量：${carbonEffect.totalCarbonEffect || 0} kg CO₂e`)
      doc.moveDown()

      // 分析报告
      if (carbonEffect.report) {
        doc.fontSize(16)
          .font(chineseBoldFont)
          .text('四、分析报告', 50, doc.y)
          .moveDown()

        doc.fontSize(11)
          .font(chineseFont)
        try {
          const report = JSON.parse(carbonEffect.report)
          if (report.insights && Array.isArray(report.insights)) {
            report.insights.forEach((insight) => {
              doc.text(`• ${insight}`, { indent: 20 })
              doc.moveDown(0.3)
            })
          } else {
            doc.text(carbonEffect.report, { indent: 20 })
          }
        } catch (e) {
          doc.text(carbonEffect.report, { indent: 20 })
        }
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 上传文件到云存储并返回下载链接
 */
async function uploadFileToCloudStorage(buffer, fileName, folder = 'vegetarian-personnel') {
  try {
    const timestamp = Date.now()
    const cloudPath = `${folder}/${timestamp}_${fileName}`
    
    const uploadRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    })

    const fileID = uploadRes.fileID

    // 获取临时访问URL
    let downloadUrl = fileID
    try {
      const urlRes = await cloud.getTempFileURL({ fileList: [fileID] })
      downloadUrl = urlRes && urlRes.fileList && urlRes.fileList[0] ? urlRes.fileList[0].tempFileURL : fileID
    } catch (err) {
      console.warn('获取临时URL失败:', err)
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    return {
      fileId: fileID,
      downloadUrl: downloadUrl,
      expiresAt: expiresAt
    }
  } catch (error) {
    console.error('上传文件到云存储失败:', error)
    throw error
  }
}

/**
 * 导出员工数据
 */
async function exportStaffData(params, user) {
  try {
    const { restaurantId, format = 'excel', filters } = params
    const tenantId = params.tenantId || user.tenantId

    // 获取员工列表
    const listResult = await listStaff({ restaurantId, tenantId, ...filters }, user)
    if (listResult.code !== 0) {
      throw new Error('获取员工列表失败')
    }

    const staffList = listResult.data || []

    // 根据格式返回数据
    if (format === 'excel') {
      // 生成 Excel 文件
      const excelBuffer = await generateStaffExcel(staffList)
      const fileName = `员工数据_${new Date().toISOString().slice(0, 10)}.xlsx`
      
      // 上传到云存储
      const uploadResult = await uploadFileToCloudStorage(excelBuffer, fileName, 'vegetarian-personnel/exports/staff')
      
      return {
        code: 0,
        message: '导出成功',
        data: {
          fileId: uploadResult.fileId,
          downloadUrl: uploadResult.downloadUrl,
          expiresAt: uploadResult.expiresAt,
          format: 'excel',
          total: listResult.total || 0
        }
      }
    } else if (format === 'pdf') {
      // 生成 PDF 文件
      const pdfBuffer = await generateStaffPDF(staffList)
      const fileName = `员工数据_${new Date().toISOString().slice(0, 10)}.pdf`
      const uploadResult = await uploadFileToCloudStorage(pdfBuffer, fileName, 'vegetarian-personnel/exports/staff')
      
      return {
        code: 0,
        message: '导出成功',
        data: {
          fileId: uploadResult.fileId,
          downloadUrl: uploadResult.downloadUrl,
          expiresAt: uploadResult.expiresAt,
          format: 'pdf',
          total: listResult.total || 0
        }
      }
    } else {
      return {
        code: 0,
        message: '导出成功',
        data: {
          exportData: staffList,
          format: 'json',
          total: listResult.total || 0
        }
      }
    }
  } catch (error) {
    console.error('导出员工数据失败:', error)
    return {
      code: 500,
      message: '导出失败',
      error: error.message
    }
  }
}

/**
 * 导出客户数据
 */
async function exportCustomerData(params, user) {
  try {
    const { restaurantId, format = 'excel', filters } = params
    const tenantId = params.tenantId || user.tenantId

    // 获取客户列表
    const listResult = await listCustomers({ restaurantId, tenantId, ...filters }, user)
    if (listResult.code !== 0) {
      throw new Error('获取客户列表失败')
    }

    const customerList = listResult.data || []

    // 根据格式返回数据
    if (format === 'excel') {
      // 生成 Excel 文件
      const excelBuffer = await generateCustomerExcel(customerList)
      const fileName = `客户数据_${new Date().toISOString().slice(0, 10)}.xlsx`
      const uploadResult = await uploadFileToCloudStorage(excelBuffer, fileName, 'vegetarian-personnel/exports/customers')
      
      return {
        code: 0,
        message: '导出成功',
        data: {
          fileId: uploadResult.fileId,
          downloadUrl: uploadResult.downloadUrl,
          expiresAt: uploadResult.expiresAt,
          format: 'excel',
          total: listResult.total || 0
        }
      }
    } else if (format === 'pdf') {
      // 生成 PDF 文件
      const pdfBuffer = await generateCustomerPDF(customerList)
      const fileName = `客户数据_${new Date().toISOString().slice(0, 10)}.pdf`
      const uploadResult = await uploadFileToCloudStorage(pdfBuffer, fileName, 'vegetarian-personnel/exports/customers')
      
      return {
        code: 0,
        message: '导出成功',
        data: {
          fileId: uploadResult.fileId,
          downloadUrl: uploadResult.downloadUrl,
          expiresAt: uploadResult.expiresAt,
          format: 'pdf',
          total: listResult.total || 0
        }
      }
    } else {
      return {
        code: 0,
        message: '导出成功',
        data: {
          exportData: customerList,
          format: 'json',
          total: listResult.total || 0
        }
      }
    }
  } catch (error) {
    console.error('导出客户数据失败:', error)
    return {
      code: 500,
      message: '导出失败',
      error: error.message
    }
  }
}

/**
 * 导出 ESG 报告
 */
async function exportESGReport(params, user) {
  try {
    const { restaurantId, startDate, endDate, format = 'excel' } = params
    const tenantId = params.tenantId || user.tenantId

    // 获取统计数据
    const staffStatsResult = await getStaffStats({ restaurantId, tenantId, startDate, endDate }, user)
    const customerStatsResult = await getCustomerStats({ restaurantId, tenantId, startDate, endDate }, user)
    const carbonEffectResult = await getCarbonEffectAnalysis({ restaurantId, tenantId, startDate, endDate }, user)

    if (staffStatsResult.code !== 0 || customerStatsResult.code !== 0 || carbonEffectResult.code !== 0) {
      throw new Error('获取统计数据失败')
    }

    // 构建 ESG 报告数据
    const esgReportData = {
      period: {
        startDate: startDate ? new Date(startDate).toISOString().slice(0, 10) : '',
        endDate: endDate ? new Date(endDate).toISOString().slice(0, 10) : ''
      },
      staffStats: staffStatsResult.data,
      customerStats: customerStatsResult.data,
      carbonEffect: carbonEffectResult.data,
      generatedAt: new Date().toISOString()
    }

    // 根据格式返回数据
    if (format === 'excel') {
      // 生成 Excel 文件
      const excelBuffer = await generateESGExcel(esgReportData)
      const dateStr = esgReportData.period.startDate && esgReportData.period.endDate
        ? `${esgReportData.period.startDate}_${esgReportData.period.endDate}`
        : new Date().toISOString().slice(0, 10)
      const fileName = `ESG报告_${dateStr}.xlsx`
      const uploadResult = await uploadFileToCloudStorage(excelBuffer, fileName, 'vegetarian-personnel/exports/esg')
      
      return {
        code: 0,
        message: '导出成功',
        data: {
          fileId: uploadResult.fileId,
          downloadUrl: uploadResult.downloadUrl,
          expiresAt: uploadResult.expiresAt,
          format: 'excel'
        }
      }
    } else if (format === 'pdf') {
      // 生成 PDF 文件
      const pdfBuffer = await generateESGPDF(esgReportData)
      const dateStr = esgReportData.period.startDate && esgReportData.period.endDate
        ? `${esgReportData.period.startDate}_${esgReportData.period.endDate}`
        : new Date().toISOString().slice(0, 10)
      const fileName = `ESG报告_${dateStr}.pdf`
      const uploadResult = await uploadFileToCloudStorage(pdfBuffer, fileName, 'vegetarian-personnel/exports/esg')
      
      return {
        code: 0,
        message: '导出成功',
        data: {
          fileId: uploadResult.fileId,
          downloadUrl: uploadResult.downloadUrl,
          expiresAt: uploadResult.expiresAt,
          format: 'pdf'
        }
      }
    } else {
      return {
        code: 0,
        message: 'ESG 报告导出成功',
        data: {
          exportData: esgReportData,
          format: 'json'
        }
      }
    }
  } catch (error) {
    console.error('导出 ESG 报告失败:', error)
    return {
      code: 500,
      message: '导出失败',
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
    if (action !== 'submitVegetarianInfo' && action !== 'getMyVegetarianInfo' && action !== 'generateStatsSnapshot') {
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
          // 先通过 staffId 查找文档（获取 _id 和权限信息）
          const staffResult = await db.collection('restaurant_staff')
            .where({
              staffId: data.staffId,
              isDeleted: false
            })
            .get()
          
          if (!staffResult.data || staffResult.data.length === 0) {
            return { code: 404, message: '员工不存在' }
          }
          
          const staffDoc = staffResult.data[0]
          if (user.role !== 'system_admin' && staffDoc.tenantId !== user.tenantId) {
            return { code: 403, message: '无权限操作' }
          }
          
          return await updateStaff(data.staffId, data, user)
        }

      case 'listStaff':
        return await listStaff(data, user)

      case 'deleteStaff':
        {
          // 检查权限
          // 先通过 staffId 查找文档（获取 _id 和权限信息）
          const staffResult = await db.collection('restaurant_staff')
            .where({
              staffId: data.staffId,
              isDeleted: false
            })
            .get()
          
          if (!staffResult.data || staffResult.data.length === 0) {
            return { code: 404, message: '员工不存在' }
          }
          
          const staffDoc = staffResult.data[0]
          if (user.role !== 'system_admin' && staffDoc.tenantId !== user.tenantId) {
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

      case 'getCarbonEffectAnalysis':
        return await getCarbonEffectAnalysis(data, user)

      // 统计数据快照
      case 'generateStatsSnapshot':
        // 定时任务调用时可能没有用户，需要传入 tenantId
        if (!user && data.tenantId) {
          user = { tenantId: data.tenantId }
        }
        return await generateStatsSnapshot(data, user || {})

      // 报表导出接口
      case 'exportStaffData':
        return await exportStaffData(data, user)

      case 'exportCustomerData':
        return await exportCustomerData(data, user)

      case 'exportESGReport':
        return await exportESGReport(data, user)

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

