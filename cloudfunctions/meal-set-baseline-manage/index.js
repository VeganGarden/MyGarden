/**
 * 一餐饭基准值管理云函数
 * 
 * 功能：
 * 1. 创建一餐饭基准值
 * 2. 更新一餐饭基准值
 * 3. 归档一餐饭基准值
 * 4. 权限验证
 * 5. 支持审核流程
 * 
 * 调用示例：
 * wx.cloud.callFunction({
 *   name: 'meal-set-baseline-manage',
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
function generateMealSetBaselineId(category) {
  const parts = [
    'meal_set',
    category.mealTime,
    category.region,
    category.energyType,
    category.mealStructure || 'default',
    category.hasSoup || 'default',
    category.restaurantType || 'default',
    category.consumptionScenario || 'default',
    category.city || 'default',
    category.season || 'default',
    category.consumptionLevel || 'default'
  ];
  return parts.join('_');
}

/**
 * 验证基准值数据
 */
function validateMealSetBaseline(baseline) {
  const errors = [];
  
  // 验证必填字段
  if (!baseline.category || !baseline.category.mealTime) {
    errors.push('category.mealTime 必填');
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
  if (!baseline.breakdown) {
    errors.push('breakdown 必填');
  }
  if (!baseline.typicalStructure) {
    errors.push('typicalStructure 必填');
  }
  if (!baseline.source) {
    errors.push('source 必填');
  }
  
  // 验证数值
  if (baseline.carbonFootprint && baseline.carbonFootprint.value < 0) {
    errors.push('carbonFootprint.value 必须 >= 0');
  }
  
  // 验证分解数据总和是否等于基准值
  if (baseline.breakdown && baseline.carbonFootprint) {
    const breakdownSum = 
      (baseline.breakdown.mainDishes || 0) +
      (baseline.breakdown.stapleFood || 0) +
      (baseline.breakdown.soup || 0) +
      (baseline.breakdown.dessert || 0) +
      (baseline.breakdown.beverage || 0) +
      (baseline.breakdown.sideDishes || 0) +
      (baseline.breakdown.condiments || 0) +
      (baseline.breakdown.cookingEnergy || 0) +
      (baseline.breakdown.packaging || 0) +
      (baseline.breakdown.transport || 0) +
      (baseline.breakdown.other || 0);
    
    const totalValue = baseline.carbonFootprint.value;
    const diff = Math.abs(breakdownSum - totalValue);
    if (diff > 0.01) { // 允许0.01的误差
      errors.push(`分解数据总和(${breakdownSum})应与基准值(${totalValue})一致，差异: ${diff}`);
    }
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
 * 创建一餐饭基准值（需要审核）
 */
async function createMealSetBaseline(baseline, openid, user) {
  // 验证数据
  const validation = validateMealSetBaseline(baseline);
  if (!validation.valid) {
    return {
      success: false,
      error: '数据验证失败',
      errors: validation.errors
    };
  }
  
  // 生成baselineId
  const baselineId = generateMealSetBaselineId(baseline.category);
  
  // 检查是否已存在
  const existing = await db.collection('meal_set_baselines')
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
  
  // 创建审核申请
  try {
    const approvalResult = await cloud.callFunction({
      name: 'approval-manage',
      data: {
        action: 'createRequest',
        businessType: 'meal_set_baseline',
        operationType: 'create',
        title: `创建一餐饭基准值：${baselineId}`,
        description: `申请创建新的一餐饭基准值：${baselineId}`,
        newData: baseline,
        currentData: null
      }
    });
    
    if (approvalResult.result && approvalResult.result.success) {
      return {
        success: true,
        code: 0,
        data: {
          requestId: approvalResult.result.data.requestId,
          baselineId,
          approvalRequired: true
        },
        message: '审核申请已提交，请等待审核'
      };
    } else {
      throw new Error(approvalResult.result?.error || '创建审核申请失败');
    }
  } catch (error) {
    console.error('创建审核申请失败:', error);
    return {
      success: false,
      error: error.message || '创建审核申请失败'
    };
  }
}

/**
 * 执行已审核通过的创建操作
 */
async function executeApprovedCreate(baseline) {
  // 验证数据
  const validation = validateMealSetBaseline(baseline);
  if (!validation.valid) {
    return {
      success: false,
      error: '数据验证失败',
      errors: validation.errors
    };
  }
  
  // 生成baselineId
  const baselineId = generateMealSetBaselineId(baseline.category);
  
  // 检查是否已存在
  const existing = await db.collection('meal_set_baselines')
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
  
  // 过滤系统字段，避免被插入
  const {
    _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    createdBy: _createdBy,
    updatedBy: _updatedBy,
    ...cleanBaseline
  } = baseline;
  
  // 添加元数据
  const now = new Date();
  const baselineData = {
    ...cleanBaseline,
    baselineId,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system',
    usageCount: 0,
    // 默认使用设置：不用于计算
    usage: {
      ...baseline.usage,
      isForCalculation: baseline.usage?.isForCalculation || false
    }
  };
  
  // 插入数据库
  try {
    const result = await db.collection('meal_set_baselines').add({
      data: baselineData
    });
    return {
      success: true,
      code: 0,
      data: {
        _id: result._id,
        baselineId
      }
    };
  } catch (error) {
    console.error('创建一餐饭基准值失败:', error);
    return {
      success: false,
      code: 1,
      error: error.message || '创建失败'
    };
  }
}

/**
 * 更新一餐饭基准值（需要审核）
 */
async function updateMealSetBaseline(baselineId, updates, openid, user) {
  // 查找现有基准值
  const existing = await db.collection('meal_set_baselines')
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
  
  const currentBaseline = existing.data[0];
  const newBaselineData = { ...currentBaseline, ...updates };
  
  // 验证新数据
  const validation = validateMealSetBaseline(newBaselineData);
  if (!validation.valid) {
    return {
      success: false,
      error: '数据验证失败',
      errors: validation.errors
    };
  }
  
  // 创建审核申请
  try {
    const approvalResult = await cloud.callFunction({
      name: 'approval-manage',
      data: {
        action: 'createRequest',
        businessType: 'meal_set_baseline',
        businessId: baselineId,
        operationType: 'update',
        title: `更新一餐饭基准值：${baselineId}`,
        description: `申请更新一餐饭基准值：${baselineId}`,
        currentData: currentBaseline,
        newData: newBaselineData
      }
    });
    
    if (approvalResult.result && approvalResult.result.success) {
      return {
        success: true,
        code: 0,
        data: {
          requestId: approvalResult.result.data.requestId,
          baselineId,
          approvalRequired: true
        },
        message: '审核申请已提交，请等待审核'
      };
    } else {
      throw new Error(approvalResult.result?.error || '创建审核申请失败');
    }
  } catch (error) {
    console.error('创建审核申请失败:', error);
    return {
      success: false,
      error: error.message || '创建审核申请失败'
    };
  }
}

/**
 * 执行已审核通过的更新操作
 */
async function executeApprovedUpdate(baselineId, updates) {
  // 过滤系统字段
  if (updates && typeof updates === 'object') {
    delete updates._id;
    delete updates.createdAt;
    delete updates.createdBy;
  }
  
  // 查找现有基准值
  const existing = await db.collection('meal_set_baselines')
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
  
  // 定义允许更新的字段白名单
  const allowedFields = [
    'category', 'carbonFootprint', 'breakdown', 'typicalStructure',
    'source', 'status', 'version', 'effectiveDate', 'expiryDate',
    'usage', 'notes'
  ];
  
  // 构建更新对象
  const updateData = {
    updatedAt: new Date(),
    updatedBy: 'system'
  };
  
  // 只添加允许的字段
  for (const key of allowedFields) {
    if (updates && updates[key] !== undefined && updates[key] !== null) {
      updateData[key] = updates[key];
    }
  }
  
  try {
    await db.collection('meal_set_baselines')
      .doc(existing.data[0]._id)
      .update({
        data: updateData
      });
    
    return {
      success: true,
      code: 0,
      data: {
        baselineId
      }
    };
  } catch (error) {
    console.error('更新一餐饭基准值失败:', error);
    return {
      success: false,
      code: 1,
      error: error.message || '更新失败'
    };
  }
}

/**
 * 归档一餐饭基准值（需要审核）
 */
async function archiveMealSetBaseline(baselineId, openid, user) {
  // 查找现有基准值
  const existing = await db.collection('meal_set_baselines')
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
  
  const currentBaseline = existing.data[0];
  const newBaselineData = { ...currentBaseline, status: 'archived' };
  
  // 创建审核申请
  try {
    const approvalResult = await cloud.callFunction({
      name: 'approval-manage',
      data: {
        action: 'createRequest',
        businessType: 'meal_set_baseline',
        businessId: baselineId,
        operationType: 'archive',
        title: `归档一餐饭基准值：${baselineId}`,
        description: `申请归档一餐饭基准值：${baselineId}`,
        currentData: currentBaseline,
        newData: newBaselineData
      }
    });
    
    if (approvalResult.result && approvalResult.result.success) {
      return {
        success: true,
        code: 0,
        data: {
          requestId: approvalResult.result.data.requestId,
          baselineId,
          approvalRequired: true
        },
        message: '审核申请已提交，请等待审核'
      };
    } else {
      throw new Error(approvalResult.result?.error || '创建审核申请失败');
    }
  } catch (error) {
    console.error('创建审核申请失败:', error);
    return {
      success: false,
      error: error.message || '创建审核申请失败'
    };
  }
}

/**
 * 执行已审核通过的归档操作
 */
async function executeApprovedArchive(baselineId) {
  // 查找现有基准值
  const existing = await db.collection('meal_set_baselines')
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
    await db.collection('meal_set_baselines')
      .doc(existing.data[0]._id)
      .update({
        data: {
          status: 'archived',
          updatedAt: new Date(),
          updatedBy: 'system'
        }
      });
    
    return {
      success: true,
      code: 0,
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
 * 启用/禁用计算功能
 */
async function toggleCalculationUsage(baselineId, enabled, enabledBy) {
  // 查找现有基准值
  const existing = await db.collection('meal_set_baselines')
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
  
  const currentBaseline = existing.data[0];
  const updateData = {
    'usage.isForCalculation': enabled,
    'usage.enabledAt': enabled ? new Date() : null,
    'usage.enabledBy': enabled ? enabledBy : null,
    updatedAt: new Date(),
    updatedBy: enabledBy || 'system'
  };
  
  try {
    await db.collection('meal_set_baselines')
      .doc(existing.data[0]._id)
      .update({
        data: updateData
      });
    
    return {
      success: true,
      code: 0,
      data: {
        baselineId,
        isForCalculation: enabled
      }
    };
  } catch (error) {
    console.error('更新计算使用状态失败:', error);
    return {
      success: false,
      error: error.message || '更新失败'
    };
  }
}

/**
 * 获取一餐饭基准值列表
 */
async function listMealSetBaselines(params) {
  const { 
    mealTime, 
    region, 
    energyType,
    mealStructure,
    hasSoup,
    restaurantType,
    consumptionScenario,
    status, 
    page = 1, 
    pageSize = 20 
  } = params;
  
  const query = {};
  if (mealTime) query['category.mealTime'] = mealTime;
  if (region) query['category.region'] = region;
  if (energyType) query['category.energyType'] = energyType;
  if (mealStructure) query['category.mealStructure'] = mealStructure;
  if (hasSoup) query['category.hasSoup'] = hasSoup;
  if (restaurantType) query['category.restaurantType'] = restaurantType;
  if (consumptionScenario) query['category.consumptionScenario'] = consumptionScenario;
  if (status) query.status = status;
  
  try {
    const result = await db.collection('meal_set_baselines')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    
    const count = await db.collection('meal_set_baselines')
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
    // 获取用户信息（用于审核流程）
    let user = null;
    try {
      const { checkPermission: checkPerm } = require('../common/permission');
      user = await checkPerm(event, context);
    } catch (err) {
      // 如果权限检查失败，继续执行（某些操作可能不需要权限）
    }
    
    // 权限检查（除查询和执行审核通过的操作外都需要权限）
    if (action !== 'list' && action !== 'query' && 
        !action.startsWith('executeApproved')) {
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
        return await createMealSetBaseline(params.baseline, OPENID, user);
      
      case 'executeApprovedCreate':
        // 执行已审核通过的创建操作（由审核系统调用）
        return await executeApprovedCreate(params.baseline);
        
      case 'update':
        return await updateMealSetBaseline(params.baselineId, params.updates || params.baseline, OPENID, user);
      
      case 'executeApprovedUpdate':
        // 执行已审核通过的更新操作（由审核系统调用）
        return await executeApprovedUpdate(params.baselineId, params.updates || params.baseline);
        
      case 'archive':
        return await archiveMealSetBaseline(params.baselineId, OPENID, user);
      
      case 'executeApprovedArchive':
        // 执行已审核通过的归档操作（由审核系统调用）
        return await executeApprovedArchive(params.baselineId);
        
      case 'toggleCalculationUsage':
        // 启用/禁用计算功能（需要管理员权限）
        return await toggleCalculationUsage(params.baselineId, params.enabled, OPENID);
        
      case 'list':
        return await listMealSetBaselines(params);
        
      default:
        return {
          success: false,
          error: '未知的 action 参数',
          message: '支持的 action: create, update, archive, list, toggleCalculationUsage, executeApprovedCreate, executeApprovedUpdate, executeApprovedArchive'
        };
    }
  } catch (error) {
    console.error('一餐饭基准值管理失败:', error);
    return {
      success: false,
      error: error.message || '操作失败',
      stack: error.stack
    };
  }
};

