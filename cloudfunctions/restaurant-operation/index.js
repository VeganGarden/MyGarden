/**
 * 餐厅运营管理云函数
 * 
 * 功能:
 * 1. 运营台账管理（创建、查询、更新、删除、统计、批量导入）
 * 2. 行为指标统计（获取行为指标、生成快照）
 * 
 * 支持的 actions:
 * - listLedger: 获取运营台账列表
 * - createLedger: 创建运营台账记录
 * - updateLedger: 更新运营台账记录
 * - deleteLedger: 删除运营台账记录
 * - getLedgerStats: 获取运营台账统计
 * - batchImportLedger: 批量导入运营台账
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 生成台账记录ID
 */
function generateLedgerId() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `LED-${dateStr}-${random}`
}

/**
 * 获取运营台账列表
 */
async function listLedger(params) {
  try {
    const {
      restaurantId,
      tenantId,
      type,
      startDate,
      endDate,
      page = 1,
      pageSize = 20
    } = params

    if (!restaurantId || !tenantId) {
      return {
        code: 400,
        message: 'restaurantId 和 tenantId 不能为空'
      }
    }

    // 构建查询条件
    const queryConditions = {
      restaurantId: restaurantId,
      tenantId: tenantId
    }

    // 添加类型筛选
    if (type) {
      queryConditions.type = type
    }

    // 添加日期筛选
    if (startDate || endDate) {
      if (startDate && endDate) {
        // 同时有开始和结束日期，使用范围查询
        queryConditions.date = _.and([
          _.gte(new Date(startDate)),
          _.lte(new Date(endDate))
        ])
      } else if (startDate) {
        queryConditions.date = _.gte(new Date(startDate))
      } else if (endDate) {
        queryConditions.date = _.lte(new Date(endDate))
      }
    }

    // 查询总数
    const countResult = await db.collection('restaurant_operation_ledgers')
      .where(queryConditions)
      .count()
    const total = countResult.total

    // 查询数据
    const result = await db.collection('restaurant_operation_ledgers')
      .where(queryConditions)
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      message: '获取成功',
      data: result.data.map(item => ({
        id: item._id,
        ledgerId: item.ledgerId,
        restaurantId: item.restaurantId,
        tenantId: item.tenantId,
        type: item.type,
        date: item.date,
        period: item.period,
        description: item.description,
        value: item.value,
        unit: item.unit,
        energyType: item.energyType,
        wasteType: item.wasteType,
        trainingType: item.trainingType,
        participants: item.participants,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    console.error('获取运营台账列表失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 创建运营台账记录
 */
async function createLedger(ledgerData) {
  try {
    const now = new Date()
    const ledgerId = generateLedgerId()

    // 验证必填字段
    if (!ledgerData.restaurantId || !ledgerData.tenantId || !ledgerData.type || !ledgerData.date) {
      return {
        code: 400,
        message: 'restaurantId、tenantId、type、date 为必填字段'
      }
    }

    const ledger = {
      ledgerId: ledgerId,
      restaurantId: ledgerData.restaurantId,
      tenantId: ledgerData.tenantId,
      type: ledgerData.type, // energy, waste, training, other
      date: new Date(ledgerData.date),
      period: ledgerData.period || 'daily', // daily, weekly, monthly, yearly
      description: ledgerData.description || '',
      value: ledgerData.value,
      unit: ledgerData.unit || '',
      // 扩展字段（根据类型不同）
      energyType: ledgerData.energyType || null, // electricity, gas, water, other
      wasteType: ledgerData.wasteType || null, // kitchen_waste, expired, processing_loss, other
      trainingType: ledgerData.trainingType || null, // staff, customer, public, other
      participants: ledgerData.participants || null,
      // 关联数据
      relatedOrderId: ledgerData.relatedOrderId || null,
      relatedSupplierId: ledgerData.relatedSupplierId || null,
      // 审核与状态
      status: ledgerData.status || 'draft', // draft, submitted, verified, rejected
      verifiedBy: null,
      verifiedAt: null,
      verificationNotes: null,
      // 系统字段
      createdBy: ledgerData.createdBy || 'system',
      createdAt: now,
      updatedBy: ledgerData.updatedBy || 'system',
      updatedAt: now,
      version: 1
    }

    const result = await db.collection('restaurant_operation_ledgers').add({ data: ledger })

    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: result._id,
        ledgerId: ledgerId
      }
    }
  } catch (error) {
    console.error('创建运营台账记录失败:', error)
    return {
      code: 500,
      message: '创建失败',
      error: error.message
    }
  }
}

/**
 * 更新运营台账记录
 */
async function updateLedger(ledgerId, ledgerData) {
  try {
    const now = new Date()

    // 构建更新字段
    const updateFields = {
      updatedAt: now,
      updatedBy: ledgerData.updatedBy || 'system'
    }

    if (ledgerData.type !== undefined) updateFields.type = ledgerData.type
    if (ledgerData.date !== undefined) updateFields.date = new Date(ledgerData.date)
    if (ledgerData.period !== undefined) updateFields.period = ledgerData.period
    if (ledgerData.description !== undefined) updateFields.description = ledgerData.description
    if (ledgerData.value !== undefined) updateFields.value = ledgerData.value
    if (ledgerData.unit !== undefined) updateFields.unit = ledgerData.unit
    if (ledgerData.energyType !== undefined) updateFields.energyType = ledgerData.energyType
    if (ledgerData.wasteType !== undefined) updateFields.wasteType = ledgerData.wasteType
    if (ledgerData.trainingType !== undefined) updateFields.trainingType = ledgerData.trainingType
    if (ledgerData.participants !== undefined) updateFields.participants = ledgerData.participants
    if (ledgerData.status !== undefined) updateFields.status = ledgerData.status
    if (ledgerData.verificationNotes !== undefined) updateFields.verificationNotes = ledgerData.verificationNotes

    // 版本号自增
    const currentDoc = await db.collection('restaurant_operation_ledgers')
      .where({ ledgerId: ledgerId })
      .get()

    if (currentDoc.data.length === 0) {
      return {
        code: 404,
        message: '台账记录不存在'
      }
    }

    updateFields.version = (currentDoc.data[0].version || 1) + 1

    const result = await db.collection('restaurant_operation_ledgers')
      .where({
        ledgerId: ledgerId,
        tenantId: ledgerData.tenantId
      })
      .update({
        data: updateFields
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '台账记录不存在'
      }
    }

    return {
      code: 0,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新运营台账记录失败:', error)
    return {
      code: 500,
      message: '更新失败',
      error: error.message
    }
  }
}

/**
 * 删除运营台账记录
 */
async function deleteLedger(ledgerId, tenantId) {
  try {
    const result = await db.collection('restaurant_operation_ledgers')
      .where({
        ledgerId: ledgerId,
        tenantId: tenantId
      })
      .remove()

    if (result.stats.removed === 0) {
      return {
        code: 404,
        message: '台账记录不存在'
      }
    }

    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除运营台账记录失败:', error)
    return {
      code: 500,
      message: '删除失败',
      error: error.message
    }
  }
}

/**
 * 获取运营台账统计
 */
async function getLedgerStats(params) {
  try {
    const {
      restaurantId,
      tenantId,
      type,
      startDate,
      endDate,
      period = 'monthly' // daily, weekly, monthly, yearly
    } = params

    if (!restaurantId || !tenantId) {
      return {
        code: 400,
        message: 'restaurantId 和 tenantId 不能为空'
      }
    }

    // 构建查询条件
    const queryConditions = {
      restaurantId: restaurantId,
      tenantId: tenantId
    }

    if (type) {
      queryConditions.type = type
    }

    if (startDate || endDate) {
      if (startDate && endDate) {
        // 同时有开始和结束日期，使用范围查询
        queryConditions.date = _.and([
          _.gte(new Date(startDate)),
          _.lte(new Date(endDate))
        ])
      } else if (startDate) {
        queryConditions.date = _.gte(new Date(startDate))
      } else if (endDate) {
        queryConditions.date = _.lte(new Date(endDate))
      }
    }

    // 查询所有记录
    const result = await db.collection('restaurant_operation_ledgers')
      .where(queryConditions)
      .orderBy('date', 'asc')
      .get()

    const ledgers = result.data || []

    if (ledgers.length === 0) {
      return {
        code: 0,
        message: '获取成功',
        data: {
          total: 0,
          totalValue: 0,
          avgValue: 0,
          maxValue: 0,
          minValue: 0,
          trend: [],
          distribution: []
        }
      }
    }

    // 计算统计值
    const values = ledgers.map(l => l.value || 0).filter(v => v > 0)
    const totalValue = values.reduce((sum, v) => sum + v, 0)
    const avgValue = values.length > 0 ? totalValue / values.length : 0
    const maxValue = values.length > 0 ? Math.max(...values) : 0
    const minValue = values.length > 0 ? Math.min(...values) : 0

    // 构建趋势数据（按周期分组）
    const trendMap = new Map()
    ledgers.forEach(ledger => {
      const date = new Date(ledger.date)
      let key = ''
      
      if (period === 'daily') {
        key = date.toISOString().slice(0, 10)
      } else if (period === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().slice(0, 10)
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else if (period === 'yearly') {
        key = String(date.getFullYear())
      }

      if (!trendMap.has(key)) {
        trendMap.set(key, { period: key, value: 0, count: 0 })
      }
      const trendItem = trendMap.get(key)
      trendItem.value += (ledger.value || 0)
      trendItem.count += 1
    })

    const trend = Array.from(trendMap.values())
      .map(item => ({
        period: item.period,
        value: item.value,
        avgValue: item.count > 0 ? item.value / item.count : 0,
        count: item.count
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    // 构建分布数据（按类型分组）
    const distributionMap = new Map()
    ledgers.forEach(ledger => {
      const distKey = ledger.type || 'other'
      if (!distributionMap.has(distKey)) {
        distributionMap.set(distKey, { type: distKey, value: 0, count: 0 })
      }
      const distItem = distributionMap.get(distKey)
      distItem.value += (ledger.value || 0)
      distItem.count += 1
    })

    const distribution = Array.from(distributionMap.values())
      .map(item => ({
        type: item.type,
        value: item.value,
        avgValue: item.count > 0 ? item.value / item.count : 0,
        count: item.count,
        percentage: totalValue > 0 ? (item.value / totalValue * 100).toFixed(2) : 0
      }))

    return {
      code: 0,
      message: '获取成功',
      data: {
        total: ledgers.length,
        totalValue,
        avgValue: Number(avgValue.toFixed(2)),
        maxValue,
        minValue,
        trend,
        distribution
      }
    }
  } catch (error) {
    console.error('获取运营台账统计失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 批量导入运营台账
 */
async function batchImportLedger(params) {
  try {
    const {
      restaurantId,
      tenantId,
      fileData, // Base64编码的文件数据
      fileName,
      fileType // excel, csv
    } = params

    if (!restaurantId || !tenantId || !fileData) {
      return {
        code: 400,
        message: 'restaurantId、tenantId、fileData 为必填字段'
      }
    }

    // TODO: 实现文件解析逻辑
    // 这里需要解析Excel/CSV文件，提取台账数据
    // 暂时返回占位响应

    return {
      code: 0,
      message: '批量导入功能开发中',
      data: {
        successCount: 0,
        failCount: 0,
        errors: []
      }
    }
  } catch (error) {
    console.error('批量导入运营台账失败:', error)
    return {
      code: 500,
      message: '导入失败',
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

    switch (action) {
      case 'listLedger':
        return await listLedger(event)
      case 'createLedger':
        return await createLedger(event)
      case 'updateLedger':
        return await updateLedger(event.ledgerId, event)
      case 'deleteLedger':
        return await deleteLedger(event.ledgerId, event.tenantId)
      case 'getLedgerStats':
        return await getLedgerStats(event)
      case 'batchImportLedger':
        return await batchImportLedger(event)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['listLedger', 'createLedger', 'updateLedger', 'deleteLedger', 'getLedgerStats', 'batchImportLedger']
        }
    }
  } catch (error) {
    console.error('操作失败:', error)
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}

