/**
 * 食材批次管理云函数
 * 
 * 功能:
 * 1. 创建食材批次
 * 2. 查询批次列表
 * 3. 更新批次信息
 * 4. 更新库存
 * 5. 删除批次（软删除）
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 生成批次ID
 */
function generateLotId() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `LOT-${dateStr}-${random}`
}

/**
 * 创建食材批次
 */
async function createLot(lotData) {
  try {
    const now = new Date()
    const lotId = generateLotId()

    // 获取食材信息（用于冗余字段）
    let ingredientName = lotData.ingredientName || ''
    let ingredientCategory = lotData.ingredientCategory || ''
    if (lotData.ingredientId && !ingredientName) {
      const ingredientResult = await db.collection('ingredients')
        .doc(lotData.ingredientId)
        .get()
      if (ingredientResult.data) {
        ingredientName = ingredientResult.data.name || ''
        ingredientCategory = ingredientResult.data.category || ''
      }
    }

    // 获取供应商信息（用于冗余字段）
    let supplierName = lotData.supplierName || ''
    if (lotData.supplierId && !supplierName) {
      const supplierResult = await db.collection('suppliers')
        .where({
          supplierId: lotData.supplierId,
          tenantId: lotData.tenantId
        })
        .get()
      if (supplierResult.data.length > 0) {
        supplierName = supplierResult.data[0].name || ''
      }
    }

    const lot = {
      tenantId: lotData.tenantId,
      lotId: lotId,
      ingredientId: lotData.ingredientId,
      ingredientName: ingredientName,
      ingredientCategory: ingredientCategory,
      supplierId: lotData.supplierId,
      supplierName: supplierName,
      batchNumber: lotData.batchNumber,
      harvestDate: new Date(lotData.harvestDate),
      productionDate: lotData.productionDate ? new Date(lotData.productionDate) : null,
      expiryDate: lotData.expiryDate ? new Date(lotData.expiryDate) : null,
      quantity: lotData.quantity,
      unit: lotData.unit || 'kg',
      origin: lotData.origin || {},
      quality: lotData.quality || {
        inspectionResult: 'pending'
      },
      logistics: lotData.logistics || {},
      inventory: lotData.inventory || {
        restaurantId: lotData.restaurantId || '',
        currentStock: lotData.quantity || 0,
        unit: lotData.unit || 'kg',
        location: '',
        lastUsedDate: null,
        status: 'in_stock'
      },
      usageRecords: [],
      createdAt: now,
      createdBy: lotData.createdBy || 'system',
      updatedAt: now,
      updatedBy: lotData.updatedBy || 'system',
      version: 1,
      isDeleted: false
    }

    const result = await db.collection('ingredient_lots').add({ data: lot })

    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: result._id,
        lotId: lotId
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '创建失败',
      error: error.message
    }
  }
}

/**
 * 查询批次列表
 */
async function listLots(params) {
  try {
    const { page = 1, pageSize = 20, ingredientId, supplierId, status, harvestDateStart, harvestDateEnd, tenantId } = params

    let query = db.collection('ingredient_lots').where({
      tenantId: tenantId,
      isDeleted: false
    })

    if (ingredientId) {
      query = query.where({ ingredientId: ingredientId })
    }

    if (supplierId) {
      query = query.where({ supplierId: supplierId })
    }

    if (status) {
      query = query.where({ 'inventory.status': status })
    }

    if (harvestDateStart || harvestDateEnd) {
      const dateQuery = {}
      if (harvestDateStart) {
        dateQuery['$gte'] = new Date(harvestDateStart)
      }
      if (harvestDateEnd) {
        dateQuery['$lte'] = new Date(harvestDateEnd)
      }
      query = query.where({ harvestDate: dateQuery })
    }

    const countResult = await query.count()
    const total = countResult.total

    const skip = (page - 1) * pageSize
    const result = await query
      .orderBy('harvestDate', 'desc')
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
 * 获取批次详情
 */
async function getLot(lotId, tenantId) {
  try {
    const result = await db.collection('ingredient_lots')
      .where({
        lotId: lotId,
        tenantId: tenantId,
        isDeleted: false
      })
      .get()

    if (result.data.length === 0) {
      return {
        code: 404,
        message: '批次不存在'
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
 * 更新库存
 */
async function updateInventory(lotId, tenantId, inventoryData) {
  try {
    const now = new Date()
    const { restaurantId, quantity, operation } = inventoryData

    // 获取当前批次信息
    const lotResult = await db.collection('ingredient_lots')
      .where({
        lotId: lotId,
        tenantId: tenantId,
        isDeleted: false
      })
      .get()

    if (lotResult.data.length === 0) {
      return {
        code: 404,
        message: '批次不存在'
      }
    }

    const lot = lotResult.data[0]
    let newStock = lot.inventory.currentStock || 0

    // 计算新库存
    if (operation === 'in') {
      newStock += quantity
    } else if (operation === 'out' || operation === 'use') {
      newStock -= quantity
      if (newStock < 0) {
        return {
          code: 400,
          message: '库存不足'
        }
      }
    }

    // 更新库存状态
    let status = 'in_stock'
    if (newStock === 0) {
      status = 'out_of_stock'
    } else if (newStock < lot.quantity * 0.2) {
      status = 'low_stock'
    }

    // 检查是否过期
    if (lot.expiryDate && new Date() > new Date(lot.expiryDate)) {
      status = 'expired'
    }

    const updateFields = {
      'inventory.currentStock': newStock,
      'inventory.status': status,
      'inventory.lastUsedDate': operation === 'use' ? now : lot.inventory.lastUsedDate,
      updatedAt: now
    }

    if (restaurantId) {
      updateFields['inventory.restaurantId'] = restaurantId
    }

    // 如果是使用操作，记录使用记录
    if (operation === 'use' && inventoryData.menuItemId) {
      const usageRecord = {
        menuItemId: inventoryData.menuItemId,
        menuItemName: inventoryData.menuItemName || '',
        quantity: quantity,
        usedDate: now,
        orderId: inventoryData.orderId || ''
      }

      await db.collection('ingredient_lots')
        .where({
          lotId: lotId,
          tenantId: tenantId
        })
        .update({
          data: {
            usageRecords: _.push([usageRecord])
          }
        })
    }

    const result = await db.collection('ingredient_lots')
      .where({
        lotId: lotId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: updateFields
      })

    return {
      code: 0,
      message: '库存更新成功',
      data: {
        currentStock: newStock,
        status: status
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '库存更新失败',
      error: error.message
    }
  }
}

/**
 * 更新批次信息
 */
async function updateLot(lotId, tenantId, updateData) {
  try {
    const now = new Date()

    const updateFields = {
      ...updateData,
      updatedAt: now,
      version: _.inc(1)
    }

    // 处理日期字段
    if (updateData.harvestDate) {
      updateFields.harvestDate = new Date(updateData.harvestDate)
    }
    if (updateData.productionDate) {
      updateFields.productionDate = new Date(updateData.productionDate)
    }
    if (updateData.expiryDate) {
      updateFields.expiryDate = new Date(updateData.expiryDate)
    }

    const result = await db.collection('ingredient_lots')
      .where({
        lotId: lotId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: updateFields
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '批次不存在'
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
 * 删除批次（软删除）
 */
async function deleteLot(lotId, tenantId) {
  try {
    const now = new Date()

    const result = await db.collection('ingredient_lots')
      .where({
        lotId: lotId,
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
        message: '批次不存在'
      }
    }

    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    return {
      code: 500,
      message: '删除失败',
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
      case 'create':
        return await createLot(event.lot)
      case 'list':
        return await listLots(event)
      case 'get':
        return await getLot(event.lotId, event.tenantId)
      case 'update':
        return await updateLot(event.lotId, event.tenantId, event.lot)
      case 'updateInventory':
        return await updateInventory(event.lotId, event.tenantId, event.inventory)
      case 'delete':
        return await deleteLot(event.lotId, event.tenantId)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['create', 'list', 'get', 'update', 'updateInventory', 'delete']
        }
    }
  } catch (error) {
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}

