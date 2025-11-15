/**
 * 碳足迹基准值初始化云函数
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
 * 生成所有核心基准值数据（24条）
 */
function generateAllBaselines() {
  const regions = ['north_china', 'northeast', 'east_china', 'central_china', 'northwest', 'south_china']
  const mealTypes = ['meat_simple', 'meat_full']
  const energyTypes = ['electric', 'gas']

  const baselines = []
  const now = new Date()

  // 基础基准值（示例数据，实际应从权威数据源获取）
  const baseValues = {
    meat_simple: {
      electric: 4.5,
      gas: 5.0
    },
    meat_full: {
      electric: 6.5,
      gas: 7.5
    }
  }

  // 地区调整系数
  const regionFactors = {
    north_china: 1.0,
    northeast: 1.0,
    east_china: 1.0,
    central_china: 0.95,
    northwest: 0.9,
    south_china: 0.95
  }

  for (const mealType of mealTypes) {
    for (const region of regions) {
      for (const energyType of energyTypes) {
        const baseValue = baseValues[mealType][energyType]
        const factor = regionFactors[region] || 1.0
        const value = Math.round(baseValue * factor * 10) / 10

        const category = {
          mealType,
          region,
          energyType
        }

        const baselineId = generateBaselineId(category)
        const uncertainty = Math.round(value * 0.1 * 10) / 10

        const baseline = {
          baselineId,
          category,
          carbonFootprint: {
            value,
            uncertainty,
            confidenceInterval: {
              lower: Math.round((value - uncertainty) * 10) / 10,
              upper: Math.round((value + uncertainty) * 10) / 10
            },
            unit: 'kg CO₂e'
          },
          breakdown: {
            ingredients: Math.round(value * 0.7 * 10) / 10,
            cookingEnergy: Math.round(value * 0.2 * 10) / 10,
            packaging: Math.round(value * 0.08 * 10) / 10,
            other: Math.round(value * 0.02 * 10) / 10
          },
          source: {
            type: 'estimation',
            organization: '平台估算',
            report: '2024年度餐饮行业碳足迹基准值（估算）',
            year: 2024,
            methodology: '基于行业统计数据估算'
          },
          version: '2024.01',
          effectiveDate: new Date('2024-01-01'),
          expiryDate: new Date('2024-12-31'),
          status: 'active',
          notes: `${region}地区${mealType === 'meat_simple' ? '肉食简餐' : '肉食正餐'}（${energyType === 'electric' ? '全电' : '燃气'}）基准值`,
          usageCount: 0,
          createdAt: now,
          updatedAt: now
        }

        baselines.push(baseline)
      }
    }
  }

  return baselines
}

/**
 * 创建集合
 */
async function createCollection() {
  try {
    await db.createCollection('carbon_baselines')
    return { success: true, message: '集合创建成功' }
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      return { success: true, message: '集合已存在' }
    }
    return {
      success: false,
      error: error.message || '集合创建失败',
      errCode: error.errCode
    }
  }
}

/**
 * 清理不完整数据（只有_id的数据）
 */
async function cleanIncompleteData() {
  try {
    // 查询所有数据
    const allData = await db.collection('carbon_baselines').get()
    let deletedCount = 0
    
    for (const item of allData.data) {
      // 检查数据是否完整（至少要有baselineId和category）
      if (!item.baselineId || !item.category) {
        try {
          await db.collection('carbon_baselines').doc(item._id).remove()
          deletedCount++
        } catch (deleteError) {
          // 静默处理删除错误
        }
      }
    }
    
    return {
      success: true,
      deletedCount,
      message: `清理了 ${deletedCount} 条不完整数据`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 导入基准值数据
 */
async function importBaselines() {
  const baselines = generateAllBaselines()
  const results = { success: 0, failed: 0, skipped: 0, errors: [] }

  for (const baseline of baselines) {
    try {
      let existing = { data: [] }
      try {
        existing = await db.collection('carbon_baselines')
          .where({ baselineId: baseline.baselineId, status: 'active' })
          .get()
      } catch (checkError) {
        if (checkError.errCode !== -502005) { // -502005 means collection not exists
          throw checkError
        }
      }

      if (existing.data && existing.data.length > 0) {
        // 检查现有数据是否完整
        const existingItem = existing.data[0]
        if (existingItem.baselineId && existingItem.category && existingItem.carbonFootprint) {
          results.skipped++
          continue
        } else {
          // 如果数据不完整，删除后重新插入
          try {
            await db.collection('carbon_baselines').doc(existingItem._id).remove()
          } catch (deleteError) {
            // 静默处理删除错误
          }
        }
      }
      
      // 插入新数据
      await db.collection('carbon_baselines').add({
        data: baseline
      })
      results.success++
    } catch (error) {
      results.failed++
      results.errors.push({
        baselineId: baseline.baselineId,
        error: error.message,
        errCode: error.errCode
      })
    }
  }
  return results
}

/**
 * 检查数据完整性
 */
async function checkDataIntegrity() {
  try {
    const regions = ['north_china', 'northeast', 'east_china', 'central_china', 'northwest', 'south_china']
    const mealTypes = ['meat_simple', 'meat_full']
    const energyTypes = ['electric', 'gas']

    let total = 0
    let found = 0
    const missing = []

    for (const region of regions) {
      for (const mealType of mealTypes) {
        for (const energyType of energyTypes) {
          total++
          const category = { mealType, region, energyType }
          const baselineId = generateBaselineId(category)

          let result = await db.collection('carbon_baselines')
            .where({ baselineId: baselineId })
            .get()

          if (result.data.length === 0) {
            result = await db.collection('carbon_baselines')
              .where({ baselineId: baselineId, status: 'active' })
              .get()
          }

          if (result.data && result.data.length > 0) {
            found++
          } else {
            missing.push({ mealType, region, energyType, baselineId })
          }
        }
      }
    }
    return { total, found, missing: missing.length, missingDetails: missing, isComplete: found === total }
  } catch (error) {
    if (error.errCode === -502005) {
      return { total: 24, found: 0, missing: 24, missingDetails: [], isComplete: false, error: '集合不存在，请先执行初始化' }
    }
    throw error
  }
}

/**
 * 完整初始化
 */
async function fullInit() {
  const collectionResult = await createCollection()
  const cleanResult = await cleanIncompleteData()
  const importResult = await importBaselines()
  const checkResult = await checkDataIntegrity()

  return {
    code: 0,
    message: '初始化完成',
    results: {
      collection: collectionResult,
      clean: cleanResult,
      import: importResult,
      check: checkResult
    }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action = 'init' } = event

  try {
    switch (action) {
      case 'init':
        return await fullInit()
      case 'import':
        return await importBaselines()
      case 'check':
        return await checkDataIntegrity()
      case 'clean':
        return await cleanIncompleteData()
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['init', 'import', 'check', 'clean']
        }
    }
  } catch (error) {
    return {
      code: 500,
      message: '初始化失败',
      error: error.message
    }
  }
}

