/**
 * 碳足迹基准值管理云函数
 */
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 生成 baselineId
 */
function generateBaselineId(category) {
  const parts = [
    category.mealType,
    category.region,
    category.energyType,
    category.city || 'default',
    category.restaurantType || 'default'
  ]
  return parts.join('_')
}

/**
 * 创建基准值
 */
async function createBaseline(baseline) {
  try {
    const baselineId = generateBaselineId(baseline.category)

    // 检查是否已存在
    const existing = await db.collection('carbon_baselines')
      .where({
        baselineId: baselineId,
        status: 'active'
      })
      .get()

    if (existing.data.length > 0) {
      return {
        code: 400,
        message: '该基准值已存在',
        data: existing.data[0]
      }
    }

    // 创建新记录
    const now = new Date()
    const baselineData = {
      baselineId,
      category: baseline.category,
      carbonFootprint: {
        ...baseline.carbonFootprint,
        unit: 'kg CO₂e'
      },
      breakdown: baseline.breakdown,
      source: baseline.source,
      version: baseline.version,
      effectiveDate: new Date(baseline.effectiveDate),
      expiryDate: new Date(baseline.expiryDate),
      status: 'active',
      notes: baseline.notes || '',
      usageCount: 0,
      createdAt: now,
      updatedAt: now
    }

    const result = await db.collection('carbon_baselines').add({
      data: baselineData
    })

    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: result._id,
        ...baselineData
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
 * 更新基准值
 */
async function updateBaseline(baselineId, baseline, createNewVersion = false) {
  try {
    // 获取现有记录
    const existing = await db.collection('carbon_baselines')
      .where({
        baselineId: baselineId
      })
      .orderBy('version', 'desc')
      .limit(1)
      .get()

    if (existing.data.length === 0) {
      return {
        code: 404,
        message: '基准值不存在'
      }
    }

    const current = existing.data[0]

    if (createNewVersion) {
      // 创建新版本
      const versionParts = current.version.split('.')
      const year = parseInt(versionParts[0])
      const month = parseInt(versionParts[1])
      let newMonth = month + 1
      let newYear = year
      if (newMonth > 12) {
        newMonth = 1
        newYear = year + 1
      }
      const newVersion = `${newYear}.${String(newMonth).padStart(2, '0')}`

      const now = new Date()
      const baselineData = {
        baselineId,
        category: baseline.category || current.category,
        carbonFootprint: {
          ...(baseline.carbonFootprint || current.carbonFootprint),
          unit: 'kg CO₂e'
        },
        breakdown: baseline.breakdown || current.breakdown,
        source: baseline.source || current.source,
        version: newVersion,
        effectiveDate: baseline.effectiveDate ? new Date(baseline.effectiveDate) : current.effectiveDate,
        expiryDate: baseline.expiryDate ? new Date(baseline.expiryDate) : current.expiryDate,
        status: 'active',
        notes: baseline.notes || current.notes || '',
        usageCount: 0,
        createdAt: now,
        updatedAt: now
      }

      const result = await db.collection('carbon_baselines').add({
        data: baselineData
      })

      return {
        code: 0,
        message: '新版本创建成功',
        data: {
          _id: result._id,
          ...baselineData
        }
      }
    } else {
      // 更新当前版本
      const updateData = {
        updatedAt: new Date()
      }

      if (baseline.category) updateData.category = baseline.category
      if (baseline.carbonFootprint) {
        updateData.carbonFootprint = {
          ...baseline.carbonFootprint,
          unit: 'kg CO₂e'
        }
      }
      if (baseline.breakdown) updateData.breakdown = baseline.breakdown
      if (baseline.source) updateData.source = baseline.source
      if (baseline.version) updateData.version = baseline.version
      if (baseline.effectiveDate) updateData.effectiveDate = new Date(baseline.effectiveDate)
      if (baseline.expiryDate) updateData.expiryDate = new Date(baseline.expiryDate)
      if (baseline.notes !== undefined) updateData.notes = baseline.notes

      await db.collection('carbon_baselines').doc(current._id).update({
        data: updateData
      })

      return {
        code: 0,
        message: '更新成功',
        data: {
          _id: current._id,
          ...current,
          ...updateData
        }
      }
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
 * 归档基准值
 */
async function archiveBaseline(baselineId) {
  try {
    const result = await db.collection('carbon_baselines')
      .where({
        baselineId: baselineId,
        status: 'active'
      })
      .update({
        data: {
          status: 'archived',
          updatedAt: new Date()
        }
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '未找到活跃状态的基准值'
      }
    }

    return {
      code: 0,
      message: '归档成功'
    }
  } catch (error) {
    return {
      code: 500,
      message: '归档失败',
      error: error.message
    }
  }
}

/**
 * 激活基准值
 */
async function activateBaseline(baselineId) {
  try {
    const result = await db.collection('carbon_baselines')
      .where({
        baselineId: baselineId,
        status: 'archived'
      })
      .update({
        data: {
          status: 'active',
          updatedAt: new Date()
        }
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '未找到归档状态的基准值'
      }
    }

    return {
      code: 0,
      message: '激活成功'
    }
  } catch (error) {
    return {
      code: 500,
      message: '激活失败',
      error: error.message
    }
  }
}

/**
 * 获取基准值详情
 */
async function getBaseline(baselineId) {
  try {
    const result = await db.collection('carbon_baselines')
      .where({
        baselineId: baselineId
      })
      .orderBy('version', 'desc')
      .limit(1)
      .get()

    if (result.data.length === 0) {
      return {
        code: 404,
        message: '基准值不存在'
      }
    }

    return {
      code: 0,
      data: result.data[0]
    }
  } catch (error) {
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 获取基准值列表
 */
async function listBaselines(params) {
  try {
    const {
      mealType,
      region,
      energyType,
      status,
      version,
      keyword,
      page = 1,
      pageSize = 20
    } = params

    let query = db.collection('carbon_baselines')

    // 构建查询条件
    const where = {}
    if (mealType) where['category.mealType'] = mealType
    if (region) where['category.region'] = region
    if (energyType) where['category.energyType'] = energyType
    if (status) where.status = status
    if (version) where.version = version

    if (Object.keys(where).length > 0) {
      query = query.where(where)
    }

    // 关键词搜索
    if (keyword) {
      query = query.where({
        $or: [
          { baselineId: db.RegExp(keyword, 'i') },
          { version: db.RegExp(keyword, 'i') },
          { 'source.organization': db.RegExp(keyword, 'i') }
        ]
      })
    }

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total

    // 分页查询
    const skip = (page - 1) * pageSize
    const result = await query
      .orderBy('updatedAt', 'desc')
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
      message: '获取列表失败',
      error: error.message,
      data: [],
      total: 0
    }
  }
}

/**
 * 批量导入
 */
async function batchImport(baselines) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  }

  for (const baseline of baselines) {
    try {
      const baselineId = generateBaselineId(baseline.category)

      // 检查是否已存在
      const existing = await db.collection('carbon_baselines')
        .where({
          baselineId: baselineId,
          status: 'active'
        })
        .get()

      if (existing.data.length > 0) {
        results.skipped++
        continue
      }

      // 创建新记录
      const now = new Date()
      const baselineData = {
        baselineId,
        category: baseline.category,
        carbonFootprint: {
          ...baseline.carbonFootprint,
          unit: 'kg CO₂e'
        },
        breakdown: baseline.breakdown,
        source: baseline.source,
        version: baseline.version,
        effectiveDate: new Date(baseline.effectiveDate),
        expiryDate: new Date(baseline.expiryDate),
        status: 'active',
        notes: baseline.notes || '',
        usageCount: 0,
        createdAt: now,
        updatedAt: now
      }

      await db.collection('carbon_baselines').add({
        data: baselineData
      })

      results.success++
    } catch (error) {
      results.failed++
      results.errors.push({
        baselineId: baseline.baselineId || generateBaselineId(baseline.category),
        error: error.message
      })
    }
  }

  return {
    code: 0,
    ...results
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
        return await createBaseline(event.baseline)
      case 'update':
        return await updateBaseline(
          event.baselineId,
          event.baseline,
          event.createNewVersion || false
        )
      case 'archive':
        return await archiveBaseline(event.baselineId)
      case 'activate':
        return await activateBaseline(event.baselineId)
      case 'get':
        return await getBaseline(event.baselineId)
      case 'list':
        return await listBaselines(event)
      case 'batchImport':
        return await batchImport(event.baselines || [])
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['create', 'update', 'archive', 'activate', 'get', 'list', 'batchImport']
        }
    }
  } catch (error) {
    console.error('❌ 操作失败:', error)
    return {
      code: 500,
      message: '操作失败',
      error: error.message,
      stack: error.stack
    }
  }
}

