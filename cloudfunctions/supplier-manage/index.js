/**
 * 供应商管理云函数
 * 
 * 功能:
 * 1. 创建供应商
 * 2. 查询供应商列表
 * 3. 更新供应商信息
 * 4. 审核供应商
 * 5. 删除供应商（软删除）
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

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
 * 创建供应商
 */
async function createSupplier(supplierData) {
  try {
    const now = new Date()
    const supplierId = generateSupplierId()

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
        restaurantIds: [],
        startDate: null,
        lastOrderDate: null,
        totalOrders: 0,
        totalAmount: 0,
        status: 'pending'
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
      createdBy: supplierData.createdBy || 'system',
      updatedAt: now,
      updatedBy: supplierData.updatedBy || 'system',
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
async function listSuppliers(params) {
  try {
    const { page = 1, pageSize = 20, keyword, type, status, riskLevel, tenantId } = params

    let query = db.collection('suppliers').where({
      tenantId: tenantId,
      isDeleted: false
    })

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
        return await createSupplier(event.supplier)
      case 'list':
        return await listSuppliers(event)
      case 'get':
        return await getSupplier(event.supplierId, event.tenantId)
      case 'update':
        return await updateSupplier(event.supplierId, event.tenantId, event.supplier)
      case 'audit':
        return await auditSupplier(event.supplierId, event.tenantId, event.audit)
      case 'delete':
        return await deleteSupplier(event.supplierId, event.tenantId)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['create', 'list', 'get', 'update', 'audit', 'delete']
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

