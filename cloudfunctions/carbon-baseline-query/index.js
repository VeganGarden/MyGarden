/**
 * 碳足迹基准值查询云函数
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
 * 单条查询
 */
async function querySingle(params) {
  const { mealType, region, energyType, city, restaurantType, date } = params
  
  if (!mealType || !region || !energyType) {
    return {
      success: false,
      error: '缺少必填参数：mealType, region, energyType'
    }
  }

  const category = {
    mealType,
    region,
    energyType,
    city,
    restaurantType
  }

  const baselineId = generateBaselineId(category)
  const queryDate = date ? new Date(date) : new Date()

  try {
    // 先尝试查询活跃状态的基准值（不包含日期范围）
    let result = await db.collection('carbon_baselines')
      .where({
        baselineId: baselineId,
        status: 'active'
      })
      .orderBy('version', 'desc')
      .limit(1)
      .get()

    // 如果没找到，尝试包含日期范围
    if (result.data.length === 0) {
      result = await db.collection('carbon_baselines')
        .where({
          baselineId: baselineId,
          status: 'active',
          effectiveDate: db.command.lte(queryDate),
          expiryDate: db.command.gte(queryDate)
        })
        .orderBy('version', 'desc')
        .limit(1)
        .get()
    }

    // 如果还是没找到，尝试查询所有状态（包括草稿）
    if (result.data.length === 0) {
      result = await db.collection('carbon_baselines')
        .where({
          baselineId: baselineId
        })
        .orderBy('version', 'desc')
        .limit(1)
        .get()
    }

    if (result.data.length === 0) {
      return {
        success: false,
        error: '未找到匹配的基准值',
        baselineId
      }
    }

    const baseline = result.data[0]
    
    return {
      success: true,
      data: {
        baselineId: baseline.baselineId,
        category: baseline.category,
        carbonFootprint: baseline.carbonFootprint,
        breakdown: baseline.breakdown,
        source: baseline.source,
        version: baseline.version
      },
      isDefault: false
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || '查询失败'
    }
  }
}

/**
 * 批量查询
 */
async function queryBatch(queries) {
  if (!Array.isArray(queries) || queries.length === 0) {
    return {
      success: false,
      error: 'queries 必须是非空数组'
    }
  }

  const results = []
  for (const query of queries) {
    const result = await querySingle(query)
    results.push(result)
  }

  return {
    success: true,
    data: results,
    count: results.length
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  try {
    const { action, queries, ...queryParams } = event

    // 如果没有指定action，根据是否有queries数组自动判断
    if (!action) {
      if (queries && Array.isArray(queries)) {
        return await queryBatch(queries)
      } else {
        return await querySingle(queryParams)
      }
    }

    // 根据action执行相应操作
    switch (action) {
      case 'query':
        return await querySingle(queryParams)
      case 'batch':
        return await queryBatch(queries)
      default:
        return {
          success: false,
          error: `未知的 action: ${action}`,
          supportedActions: ['query', 'batch']
        }
    }
  } catch (error) {
    console.error('❌ 查询失败:', error)
    return {
      success: false,
      error: error.message || '查询失败',
      stack: error.stack
    }
  }
}

