/**
 * 区域配置管理云函数
 * 
 * 功能：
 * 1. 创建区域配置（直接执行，无需审核）
 * 2. 更新区域配置（直接执行，无需审核）
 * 3. 归档区域配置（直接执行，无需审核）
 * 4. 激活区域配置
 * 5. 查询区域配置列表
 * 6. 获取单个区域配置详情
 * 
 * 调用示例：
 * wx.cloud.callFunction({
 *   name: 'region-config-manage',
 *   data: {
 *     action: 'create',
 *     region: { ... }
 *   }
 * })
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const { checkPermission } = require('./permission');

/**
 * 验证区域配置数据
 */
function validateRegion(region) {
  const errors = [];
  
  if (!region.configType) {
    errors.push('configType 必填');
  } else if (!['factor_region', 'baseline_region'].includes(region.configType)) {
    errors.push('configType 必须是 factor_region 或 baseline_region');
  }
  
  if (!region.code) {
    errors.push('code 必填');
  }
  
  if (!region.name) {
    errors.push('name 必填');
  }
  
  // 基准值区域的父级验证在创建/更新时进行
  
  if (region.level !== undefined && ![1, 2].includes(region.level)) {
    errors.push('level 必须是 1（国家）或 2（子区域）');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 检查区域代码是否唯一
 */
async function checkCodeUnique(configType, code, excludeId = null) {
  const query = {
    configType: configType,
    code: code
  };
  
  const result = await db.collection('region_configs')
    .where(query)
    .get();
  
  if (result.data.length === 0) {
    return { unique: true };
  }
  
  // 如果提供了排除ID，检查是否是同一个记录
  if (excludeId && result.data[0]._id === excludeId) {
    return { unique: true };
  }
  
  return {
    unique: false,
    existing: result.data[0]
  };
}

/**
 * 检查父级区域是否存在
 */
async function checkParentExists(parentCode, configType) {
  if (!parentCode) {
    return { exists: true }; // 允许没有父级
  }
  
  const result = await db.collection('region_configs')
    .where({
      configType: configType === 'baseline_region' ? 'factor_region' : configType,
      code: parentCode,
      status: 'active'
    })
    .get();
  
  return {
    exists: result.data.length > 0,
    parent: result.data[0] || null
  };
}

/**
 * 检查区域是否有依赖数据
 */
async function checkDependencies(configType, code) {
  const warnings = [];
  
  if (configType === 'factor_region') {
    // 检查是否有因子使用此区域
    const factors = await db.collection('carbon_emission_factors')
      .where({
        region: code,
        status: 'active'
      })
      .count();
    
    if (factors.total > 0) {
      warnings.push(`有 ${factors.total} 个碳足迹因子使用此区域`);
    }
    
    // 检查是否有基准值区域使用此区域作为父级
    const baselineRegions = await db.collection('region_configs')
      .where({
        configType: 'baseline_region',
        parentCode: code,
        status: 'active'
      })
      .count();
    
    if (baselineRegions.total > 0) {
      warnings.push(`有 ${baselineRegions.total} 个基准值区域使用此区域作为父级`);
    }
  } else if (configType === 'baseline_region') {
    // 检查是否有基准值使用此区域
    const baselines = await db.collection('carbon_baselines')
      .where({
        'category.region': code,
        status: 'active'
      })
      .count();
    
    if (baselines.total > 0) {
      warnings.push(`有 ${baselines.total} 个基准值使用此区域`);
    }
  }
  
  return {
    hasDependencies: warnings.length > 0,
    warnings
  };
}

/**
 * 创建区域配置
 */
async function createRegion(region, user) {
  // 验证数据
  const validation = validateRegion(region);
  if (!validation.valid) {
    return {
      code: 1,
      success: false,
      error: '数据验证失败',
      errors: validation.errors,
      message: validation.errors.join('; ')
    };
  }
  
  // 检查代码唯一性
  const codeCheck = await checkCodeUnique(region.configType, region.code);
  if (!codeCheck.unique) {
    return {
      code: 1,
      success: false,
      error: '区域代码已存在',
      message: `区域代码 ${region.code} 已存在`
    };
  }
  
  // 如果是基准值区域且有父级，检查父级是否存在
  if (region.configType === 'baseline_region' && region.parentCode) {
    const parentCheck = await checkParentExists(region.parentCode, region.configType);
    if (!parentCheck.exists) {
      return {
        code: 1,
        success: false,
        error: '父级区域不存在',
        message: `父级区域 ${region.parentCode} 不存在或已归档`
      };
    }
  }
  
  // 准备数据
  const now = new Date();
  const regionData = {
    configType: region.configType,
    code: region.code,
    name: region.name,
    nameEn: region.nameEn || region.name,
    country: region.country || '',
    countryName: region.countryName || '',
    parentCode: region.parentCode || '',
    level: region.level || (region.parentCode ? 2 : 1),
    status: region.status || 'active',
    sortOrder: region.sortOrder || 0,
    description: region.description || '',
    createdAt: now,
    updatedAt: now,
    createdBy: user._id || user.username || 'system',
    updatedBy: user._id || user.username || 'system'
  };
  
  try {
    const result = await db.collection('region_configs').add({
      data: regionData
    });
    
    // 记录审计日志
    const { addAudit } = require('../tenant/audit');
    await addAudit(db, {
      module: 'region_config',
      action: 'create',
      resource: 'region_config',
      resourceId: result._id,
      description: `创建区域配置: ${region.name} (${region.code})`,
      status: 'success',
      userId: user._id,
      username: user.username,
      role: user.role
    });
    
    return {
      code: 0,
      success: true,
      data: {
        _id: result._id,
        code: region.code
      },
      message: '创建成功'
    };
  } catch (error) {
    console.error('创建区域配置失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '创建失败',
      message: error.message || '创建失败'
    };
  }
}

/**
 * 更新区域配置
 */
async function updateRegion(regionId, updates, user) {
  // 查找现有区域配置
  const existing = await db.collection('region_configs')
    .doc(regionId)
    .get();
  
  if (!existing.data) {
    return {
      code: 1,
      success: false,
      error: '区域配置不存在',
      message: '区域配置不存在'
    };
  }
  
  const currentRegion = existing.data;
  
  // 如果更新了代码，检查唯一性
  if (updates.code && updates.code !== currentRegion.code) {
    const codeCheck = await checkCodeUnique(currentRegion.configType, updates.code, regionId);
    if (!codeCheck.unique) {
      return {
        code: 1,
        success: false,
        error: '区域代码已存在',
        message: `区域代码 ${updates.code} 已存在`
      };
    }
  }
  
  // 如果更新了父级，检查父级是否存在
  if (updates.parentCode !== undefined && updates.parentCode !== currentRegion.parentCode) {
    if (updates.parentCode) {
      const parentCheck = await checkParentExists(updates.parentCode, currentRegion.configType);
      if (!parentCheck.exists) {
        return {
          code: 1,
          success: false,
          error: '父级区域不存在',
          message: `父级区域 ${updates.parentCode} 不存在或已归档`
        };
      }
    }
  }
  
  // 过滤系统字段
  const allowedFields = [
    'code', 'name', 'nameEn', 'country', 'countryName', 'parentCode',
    'level', 'status', 'sortOrder', 'description'
  ];
  
  const updateData = {
    updatedAt: new Date(),
    updatedBy: user._id || user.username || 'system'
  };
  
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      updateData[key] = updates[key];
    }
  }
  
  try {
    await db.collection('region_configs')
      .doc(regionId)
      .update({
        data: updateData
      });
    
    // 记录审计日志
    const { addAudit } = require('../tenant/audit');
    await addAudit(db, {
      module: 'region_config',
      action: 'update',
      resource: 'region_config',
      resourceId: regionId,
      description: `更新区域配置: ${currentRegion.name} (${currentRegion.code})`,
      status: 'success',
      userId: user._id,
      username: user.username,
      role: user.role
    });
    
    return {
      code: 0,
      success: true,
      data: {
        _id: regionId
      },
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新区域配置失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '更新失败',
      message: error.message || '更新失败'
    };
  }
}

/**
 * 归档区域配置
 */
async function archiveRegion(regionId, user) {
  // 查找现有区域配置
  const existing = await db.collection('region_configs')
    .doc(regionId)
    .get();
  
  if (!existing.data) {
    return {
      code: 1,
      success: false,
      error: '区域配置不存在',
      message: '区域配置不存在'
    };
  }
  
  const currentRegion = existing.data;
  
  if (currentRegion.status === 'archived') {
    return {
      code: 1,
      success: false,
      error: '区域配置已归档',
      message: '区域配置已归档'
    };
  }
  
  // 检查依赖关系（仅警告，不阻止归档）
  const dependencies = await checkDependencies(currentRegion.configType, currentRegion.code);
  
  try {
    await db.collection('region_configs')
      .doc(regionId)
      .update({
        data: {
          status: 'archived',
          updatedAt: new Date(),
          updatedBy: user._id || user.username || 'system'
        }
      });
    
    // 记录审计日志
    const { addAudit } = require('../tenant/audit');
    await addAudit(db, {
      module: 'region_config',
      action: 'archive',
      resource: 'region_config',
      resourceId: regionId,
      description: `归档区域配置: ${currentRegion.name} (${currentRegion.code})${dependencies.hasDependencies ? ' - 警告: ' + dependencies.warnings.join('; ') : ''}`,
      status: 'success',
      userId: user._id,
      username: user.username,
      role: user.role
    });
    
    return {
      code: 0,
      success: true,
      data: {
        _id: regionId,
        warnings: dependencies.warnings
      },
      message: dependencies.hasDependencies ? `归档成功，但存在依赖关系: ${dependencies.warnings.join('; ')}` : '归档成功'
    };
  } catch (error) {
    console.error('归档区域配置失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '归档失败',
      message: error.message || '归档失败'
    };
  }
}

/**
 * 激活区域配置
 */
async function activateRegion(regionId, user) {
  // 查找现有区域配置
  const existing = await db.collection('region_configs')
    .doc(regionId)
    .get();
  
  if (!existing.data) {
    return {
      code: 1,
      success: false,
      error: '区域配置不存在',
      message: '区域配置不存在'
    };
  }
  
  const currentRegion = existing.data;
  
  if (currentRegion.status === 'active') {
    return {
      code: 1,
      success: false,
      error: '区域配置已激活',
      message: '区域配置已激活'
    };
  }
  
  try {
    await db.collection('region_configs')
      .doc(regionId)
      .update({
        data: {
          status: 'active',
          updatedAt: new Date(),
          updatedBy: user._id || user.username || 'system'
        }
      });
    
    // 记录审计日志
    const { addAudit } = require('../tenant/audit');
    await addAudit(db, {
      module: 'region_config',
      action: 'activate',
      resource: 'region_config',
      resourceId: regionId,
      description: `激活区域配置: ${currentRegion.name} (${currentRegion.code})`,
      status: 'success',
      userId: user._id,
      username: user.username,
      role: user.role
    });
    
    return {
      code: 0,
      success: true,
      data: {
        _id: regionId
      },
      message: '激活成功'
    };
  } catch (error) {
    console.error('激活区域配置失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '激活失败',
      message: error.message || '激活失败'
    };
  }
}

/**
 * 获取区域配置详情
 */
async function getRegion(regionId) {
  try {
    const result = await db.collection('region_configs')
      .doc(regionId)
      .get();
    
    if (!result.data) {
      return {
        code: 1,
        success: false,
        error: '区域配置不存在',
        message: '区域配置不存在'
      };
    }
    
    return {
      code: 0,
      success: true,
      data: result.data,
      message: '查询成功'
    };
  } catch (error) {
    console.error('查询区域配置失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '查询失败',
      message: error.message || '查询失败'
    };
  }
}

/**
 * 获取区域配置列表
 */
async function listRegions(params) {
  const {
    configType,
    country,
    status,
    parentCode,
    keyword,
    page = 1,
    pageSize = 20
  } = params;
  
  try {
    // 构建查询条件
    const query = {};
    if (configType) query.configType = configType;
    if (country) query.country = country;
    if (status) query.status = status;
    if (parentCode !== undefined) {
      if (parentCode === '') {
        query.parentCode = _.or([_.eq(''), _.eq(null)]);
      } else {
        query.parentCode = parentCode;
      }
    }
    
    let queryBuilder = db.collection('region_configs').where(query);
    
    // 如果有关键词，需要组合搜索条件
    if (keyword && keyword.trim()) {
      const keywordTrimmed = keyword.trim();
      const keywordConditions = _.or([
        { name: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { nameEn: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { code: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) }
      ]);
      
      if (Object.keys(query).length > 0) {
        queryBuilder = db.collection('region_configs').where(
          _.and([
            query,
            keywordConditions
          ])
        );
      } else {
        queryBuilder = db.collection('region_configs').where(keywordConditions);
      }
    }
    
    // 执行查询
    const result = await queryBuilder
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    
    // 统计总数
    let countQueryBuilder;
    if (keyword && keyword.trim()) {
      const keywordTrimmed = keyword.trim();
      const keywordConditions = _.or([
        { name: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { nameEn: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { code: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) }
      ]);
      
      if (Object.keys(query).length > 0) {
        countQueryBuilder = db.collection('region_configs').where(
          _.and([
            query,
            keywordConditions
          ])
        );
      } else {
        countQueryBuilder = db.collection('region_configs').where(keywordConditions);
      }
    } else {
      countQueryBuilder = db.collection('region_configs').where(query);
    }
    
    const countResult = await countQueryBuilder.count();
    const total = countResult.total;
    
    return {
      code: 0,
      success: true,
      data: result.data,
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      message: '查询成功'
    };
  } catch (error) {
    console.error('查询区域配置列表失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '查询失败',
      message: error.message || '查询失败',
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0
      }
    };
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action, ...params } = event;
  
  try {
    // 获取用户信息（用于权限检查和审计日志）
    let user = null;
    
    // 对于需要权限的操作，检查token
    if (action !== 'list' && action !== 'get') {
      try {
        user = await checkPermission(event, context);
        
        // 检查角色权限：仅 platform_operator 和 system_admin 可操作
        if (user.role !== 'platform_operator' && user.role !== 'system_admin') {
          return {
            code: 403,
            success: false,
            error: '权限不足',
            message: '只有平台运营人员和系统管理员可以执行此操作'
          };
        }
      } catch (err) {
        const errorCode = err.code || 401;
        const errorMessage = err.message || '未授权访问，请先登录';
        
        return {
          code: errorCode,
          success: false,
          error: errorMessage,
          message: errorMessage
        };
      }
    } else {
      // 对于查询操作，尝试获取用户信息（但不强制）
      try {
        user = await checkPermission(event, context);
      } catch (err) {
        // 静默处理，不影响查询操作
        user = { _id: 'system', username: 'system', role: 'guest' };
      }
    }
    
    switch (action) {
      case 'create':
        return await createRegion(params.region, user);
      
      case 'update':
        return await updateRegion(params.regionId, params.region, user);
      
      case 'archive':
        return await archiveRegion(params.regionId, user);
      
      case 'activate':
        return await activateRegion(params.regionId, user);
      
      case 'get':
        return await getRegion(params.regionId);
      
      case 'list':
        return await listRegions(params);
        
      default:
        return {
          code: 400,
          success: false,
          error: '未知的 action 参数',
          message: '支持的 action: create, update, archive, activate, get, list'
        };
    }
  } catch (error) {
    console.error('区域配置管理失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '操作失败',
      message: error.message || '操作失败',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

