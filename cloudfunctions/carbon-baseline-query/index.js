/**
 * 碳足迹基准值查询云函数
 * 
 * 功能：
 * 1. 根据查询条件返回基准值
 * 2. 支持单条查询和批量查询
 * 3. 自动选择有效版本
 * 
 * 调用示例：
 * wx.cloud.callFunction({
 *   name: 'carbon-baseline-query',
 *   data: {
 *     mealType: 'meat_simple',
 *     region: 'east_china',
 *     energyType: 'electric'
 *   }
 * })
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取默认基准值（当精确匹配失败时）
 */
async function getDefaultBaseline(mealType, region, energyType) {
  // 尝试使用全国平均
  const defaultQuery = {
    'category.mealType': mealType,
    'category.region': 'national_average',
    'category.energyType': energyType,
    status: 'active'
  };
  
  const queryDate = new Date();
  defaultQuery.effectiveDate = db.command.lte(queryDate);
  defaultQuery.expiryDate = db.command.gte(queryDate);
  
  const result = await db.collection('carbon_baselines')
    .where(defaultQuery)
    .orderBy('version', 'desc')
    .limit(1)
    .get();
  
  if (result.data.length > 0) {
    return {
      success: true,
      data: result.data[0],
      isDefault: true,
      message: '使用全国平均基准值'
    };
  }
  
  // 如果还是没有，返回错误
  return {
    success: false,
    error: '未找到匹配的基准值',
    message: `未找到 ${mealType} / ${region} / ${energyType} 的基准值`
  };
}

/**
 * 更新使用统计
 */
async function updateUsageStats(baselineId) {
  try {
    await db.collection('carbon_baselines')
      .doc(baselineId)
      .update({
        usageCount: db.command.inc(1),
        lastUsedAt: new Date()
      });
  } catch (error) {
    console.error('更新使用统计失败:', error);
    // 不影响主流程，只记录错误
  }
}

/**
 * 单条查询
 */
async function querySingle(params) {
  const { mealType, region, energyType, city, restaurantType, date } = params;
  
  // 构建查询条件
  const query = {
    'category.mealType': mealType,
    'category.region': region,
    'category.energyType': energyType,
    status: 'active'
  };
  
  if (city) {
    query['category.city'] = city;
  }
  
  if (restaurantType) {
    query['category.restaurantType'] = restaurantType;
  }
  
  // 日期范围查询（可选，如果数据没有设置日期范围则跳过）
  const queryDate = date ? new Date(date) : new Date();
  // 先尝试不包含日期范围的查询
  let result = await db.collection('carbon_baselines')
    .where(query)
    .limit(1)
    .get();
  
  // 如果没找到，尝试包含日期范围的查询
  if (result.data.length === 0) {
    const dateQuery = {
      ...query,
      effectiveDate: db.command.lte(queryDate),
      expiryDate: db.command.gte(queryDate)
    };
    result = await db.collection('carbon_baselines')
      .where(dateQuery)
      .limit(1)
      .get();
  }
  
  if (result.data.length === 0) {
    // 如果没有精确匹配，尝试使用默认值
    return await getDefaultBaseline(mealType, region, energyType);
  }
  
  const baseline = result.data[0];
  
  // 更新使用统计
  await updateUsageStats(baseline._id);
  
  return {
    success: true,
    data: baseline,
    isDefault: false
  };
}

/**
 * 批量查询
 */
async function queryBatch(queries) {
  const results = await Promise.all(
    queries.map(query => querySingle(query))
  );
  
  return {
    success: true,
    data: results,
    count: results.length
  };
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action, ...params } = event;
  
  try {
    // 如果没有指定action，但有queries参数，则使用batch
    // 否则使用单条查询
    let actualAction = action;
    if (!actualAction) {
      if (params.queries && Array.isArray(params.queries)) {
        actualAction = 'batch';
      } else {
        actualAction = 'query';
      }
    }
    
    switch (actualAction) {
      case 'query':
        // 单条查询
        return await querySingle(params);
        
      case 'batch':
        // 批量查询
        const { queries } = params;
        if (!Array.isArray(queries) || queries.length === 0) {
          return {
            success: false,
            error: 'queries 参数必须是非空数组'
          };
        }
        return await queryBatch(queries);
        
      default:
        return {
          success: false,
          error: '未知的 action 参数',
          message: '支持的 action: query, batch'
        };
    }
  } catch (error) {
    console.error('查询基准值失败:', error);
    return {
      success: false,
      error: error.message || '查询失败',
      stack: error.stack
    };
  }
};

