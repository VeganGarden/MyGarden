/**
 * 碳足迹基准值管理云函数
 * 
 * 功能：
 * 1. 创建基准值
 * 2. 更新基准值
 * 3. 归档基准值
 * 4. 权限验证
 * 
 * 调用示例：
 * wx.cloud.callFunction({
 *   name: 'carbon-baseline-manage',
 *   data: {
 *     action: 'create',
 *     baseline: { ... }
 *   }
 * })
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 生成基准值ID
 */
function generateBaselineId(category) {
  const { mealType, region, energyType, city, restaurantType } = category;
  const parts = [
    mealType,
    region,
    energyType,
    city || 'default',
    restaurantType || 'default'
  ];
  return parts.join('_');
}

/**
 * 验证基准值数据
 */
function validateBaseline(baseline) {
  const errors = [];
  
  if (!baseline.category || !baseline.category.mealType) {
    errors.push('category.mealType 必填');
  }
  if (!baseline.category || !baseline.category.region) {
    errors.push('category.region 必填');
  }
  if (!baseline.category || !baseline.category.energyType) {
    errors.push('category.energyType 必填');
  }
  if (!baseline.carbonFootprint || !baseline.carbonFootprint.value) {
    errors.push('carbonFootprint.value 必填');
  }
  
  if (baseline.carbonFootprint && baseline.carbonFootprint.value < 0) {
    errors.push('carbonFootprint.value 必须 >= 0');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 检查权限（仅管理员可操作）
 */
async function checkPermission(openid) {
  // TODO: 实现权限检查逻辑
  // 这里简化处理，实际应该查询用户权限表
  // 暂时允许所有操作，生产环境需要添加权限验证
  return true;
}

/**
 * 创建基准值
 */
async function createBaseline(baseline, openid) {
  // 验证数据
  const validation = validateBaseline(baseline);
  if (!validation.valid) {
    return {
      success: false,
      error: '数据验证失败',
      errors: validation.errors
    };
  }
  
  // 生成baselineId
  const baselineId = generateBaselineId(baseline.category);
  
  // 检查是否已存在
  const existing = await db.collection('carbon_baselines')
    .where({
      baselineId: baselineId,
      status: 'active'
    })
    .get();
  
  if (existing.data.length > 0) {
    return {
      success: false,
      error: '基准值已存在',
      baselineId
    };
  }
  
  // 添加元数据
  const now = new Date();
  const baselineData = {
    ...baseline,
    baselineId,
    createdAt: now,
    updatedAt: now,
    createdBy: openid || 'system',
    updatedBy: openid || 'system',
    usageCount: 0
  };
  
  // 插入数据库
  try {
    const result = await db.collection('carbon_baselines').add(baselineData);
    return {
      success: true,
      data: {
        _id: result._id,
        baselineId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '创建失败'
    };
  }
}

/**
 * 更新基准值
 */
async function updateBaseline(baselineId, updates, openid) {
  // 查找现有基准值
  const existing = await db.collection('carbon_baselines')
    .where({
      baselineId: baselineId,
      status: 'active'
    })
    .get();
  
  if (existing.data.length === 0) {
    return {
      success: false,
      error: '基准值不存在'
    };
  }
  
  // 更新数据
  const updateData = {
    ...updates,
    updatedAt: new Date(),
    updatedBy: openid || 'system'
  };
  
  try {
    await db.collection('carbon_baselines')
      .doc(existing.data[0]._id)
      .update(updateData);
    
    return {
      success: true,
      data: {
        baselineId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '更新失败'
    };
  }
}

/**
 * 归档基准值
 */
async function archiveBaseline(baselineId, openid) {
  // 查找现有基准值
  const existing = await db.collection('carbon_baselines')
    .where({
      baselineId: baselineId,
      status: 'active'
    })
    .get();
  
  if (existing.data.length === 0) {
    return {
      success: false,
      error: '基准值不存在'
    };
  }
  
  try {
    await db.collection('carbon_baselines')
      .doc(existing.data[0]._id)
      .update({
        status: 'archived',
        updatedAt: new Date(),
        updatedBy: openid || 'system'
      });
    
    return {
      success: true,
      data: {
        baselineId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '归档失败'
    };
  }
}

/**
 * 获取基准值列表
 */
async function listBaselines(params) {
  const { mealType, region, status, page = 1, pageSize = 20 } = params;
  
  const query = {};
  if (mealType) query['category.mealType'] = mealType;
  if (region) query['category.region'] = region;
  if (status) query.status = status;
  
  try {
    const result = await db.collection('carbon_baselines')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    
    const count = await db.collection('carbon_baselines')
      .where(query)
      .count();
    
    return {
      success: true,
      data: result.data,
      pagination: {
        page,
        pageSize,
        total: count.total,
        totalPages: Math.ceil(count.total / pageSize)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '查询失败'
    };
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action, ...params } = event;
  const { OPENID } = cloud.getWXContext();
  
  try {
    // 权限检查（除查询外都需要权限）
    if (action !== 'list' && action !== 'query') {
      const hasPermission = await checkPermission(OPENID);
      if (!hasPermission) {
        return {
          success: false,
          error: '权限不足',
          message: '只有管理员可以执行此操作'
        };
      }
    }
    
    switch (action) {
      case 'create':
        return await createBaseline(params.baseline, OPENID);
        
      case 'update':
        return await updateBaseline(params.baselineId, params.updates, OPENID);
        
      case 'archive':
        return await archiveBaseline(params.baselineId, OPENID);
        
      case 'list':
        return await listBaselines(params);
        
      default:
        return {
          success: false,
          error: '未知的 action 参数',
          message: '支持的 action: create, update, archive, list'
        };
    }
  } catch (error) {
    console.error('基准值管理失败:', error);
    return {
      success: false,
      error: error.message || '操作失败',
      stack: error.stack
    };
  }
};

