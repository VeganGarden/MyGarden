/**
 * 区域配置管理 Handler
 * 
 * 功能已从 region-config-manage 迁移并整合到 platform-config-manage
 */

const cloud = require('wx-server-sdk');
const db = cloud.database();
const _ = db.command;
const { checkPermission } = require('../utils/permission');
const { createErrorResponse, createSuccessResponse } = require('../utils/error-handler');

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
    return { exists: true };
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
    const factors = await db.collection('carbon_emission_factors')
      .where({
        region: code,
        status: 'active'
      })
      .count();
    
    if (factors.total > 0) {
      warnings.push(`有 ${factors.total} 个碳足迹因子使用此区域`);
    }
    
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
 * 添加审计日志
 */
async function addAuditLog(action, resourceId, description, user, status = 'success') {
  try {
    // 尝试从common或tenant目录加载audit模块
    let addAudit;
    try {
      addAudit = require('../../common/audit').addAudit;
    } catch (e) {
      try {
        addAudit = require('../../tenant/audit').addAudit;
      } catch (e2) {
        // 如果都找不到，使用简单的数据库记录
        await db.collection('audit_logs').add({
          data: {
            module: 'region_config',
            action,
            resource: 'region_config',
            resourceId,
            description,
            status,
            userId: user._id,
            username: user.username,
            role: user.role,
            createdAt: new Date()
          }
        });
        return;
      }
    }
    
    await addAudit(db, {
      module: 'region_config',
      action,
      resource: 'region_config',
      resourceId,
      description,
      status,
      userId: user._id,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    // 审计日志失败不影响主操作
    console.warn('添加审计日志失败:', error);
  }
}

/**
 * 创建区域配置
 */
async function createRegion(data, user) {
  const { region } = data;
  
  const validation = validateRegion(region);
  if (!validation.valid) {
    return createErrorResponse(400, validation.errors.join('; '));
  }
  
  const codeCheck = await checkCodeUnique(region.configType, region.code);
  if (!codeCheck.unique) {
    return createErrorResponse(400, `区域代码 ${region.code} 已存在`);
  }
  
  if (region.configType === 'baseline_region' && region.parentCode) {
    const parentCheck = await checkParentExists(region.parentCode, region.configType);
    if (!parentCheck.exists) {
      return createErrorResponse(400, `父级区域 ${region.parentCode} 不存在或已归档`);
    }
  }
  
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
    
    await addAuditLog('create', result._id, `创建区域配置: ${region.name} (${region.code})`, user);
    
    return createSuccessResponse({
      _id: result._id,
      code: region.code
    }, '创建成功');
  } catch (error) {
    console.error('创建区域配置失败:', error);
    return createErrorResponse(500, error.message || '创建失败', error);
  }
}

/**
 * 更新区域配置
 */
async function updateRegion(data, user) {
  const { regionId, region: updates } = data;
  
  const existing = await db.collection('region_configs')
    .doc(regionId)
    .get();
  
  if (!existing.data) {
    return createErrorResponse(404, '区域配置不存在');
  }
  
  const currentRegion = existing.data;
  
  if (updates.code && updates.code !== currentRegion.code) {
    const codeCheck = await checkCodeUnique(currentRegion.configType, updates.code, regionId);
    if (!codeCheck.unique) {
      return createErrorResponse(400, `区域代码 ${updates.code} 已存在`);
    }
  }
  
  if (updates.parentCode !== undefined && updates.parentCode !== currentRegion.parentCode) {
    if (updates.parentCode) {
      const parentCheck = await checkParentExists(updates.parentCode, currentRegion.configType);
      if (!parentCheck.exists) {
        return createErrorResponse(400, `父级区域 ${updates.parentCode} 不存在或已归档`);
      }
    }
  }
  
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
    
    await addAuditLog('update', regionId, `更新区域配置: ${currentRegion.name} (${currentRegion.code})`, user);
    
    return createSuccessResponse({ _id: regionId }, '更新成功');
  } catch (error) {
    console.error('更新区域配置失败:', error);
    return createErrorResponse(500, error.message || '更新失败', error);
  }
}

/**
 * 归档区域配置
 */
async function archiveRegion(data, user) {
  const { regionId } = data;
  
  const existing = await db.collection('region_configs')
    .doc(regionId)
    .get();
  
  if (!existing.data) {
    return createErrorResponse(404, '区域配置不存在');
  }
  
  const currentRegion = existing.data;
  
  if (currentRegion.status === 'archived') {
    return createErrorResponse(400, '区域配置已归档');
  }
  
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
    
    const description = `归档区域配置: ${currentRegion.name} (${currentRegion.code})${dependencies.hasDependencies ? ' - 警告: ' + dependencies.warnings.join('; ') : ''}`;
    await addAuditLog('archive', regionId, description, user);
    
    const message = dependencies.hasDependencies 
      ? `归档成功，但存在依赖关系: ${dependencies.warnings.join('; ')}` 
      : '归档成功';
    
    return createSuccessResponse({
      _id: regionId,
      warnings: dependencies.warnings
    }, message);
  } catch (error) {
    console.error('归档区域配置失败:', error);
    return createErrorResponse(500, error.message || '归档失败', error);
  }
}

/**
 * 激活区域配置
 */
async function activateRegion(data, user) {
  const { regionId } = data;
  
  const existing = await db.collection('region_configs')
    .doc(regionId)
    .get();
  
  if (!existing.data) {
    return createErrorResponse(404, '区域配置不存在');
  }
  
  const currentRegion = existing.data;
  
  if (currentRegion.status === 'active') {
    return createErrorResponse(400, '区域配置已激活');
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
    
    await addAuditLog('activate', regionId, `激活区域配置: ${currentRegion.name} (${currentRegion.code})`, user);
    
    return createSuccessResponse({ _id: regionId }, '激活成功');
  } catch (error) {
    console.error('激活区域配置失败:', error);
    return createErrorResponse(500, error.message || '激活失败', error);
  }
}

/**
 * 获取区域配置详情
 */
async function getRegion(data) {
  const { regionId } = data;
  
  try {
    const result = await db.collection('region_configs')
      .doc(regionId)
      .get();
    
    if (!result.data) {
      return createErrorResponse(404, '区域配置不存在');
    }
    
    // 返回格式需要与前端期望一致：data 直接是对象
    return {
      code: 0,
      success: true,
      message: '查询成功',
      data: result.data
    };
  } catch (error) {
    console.error('查询区域配置失败:', error);
    return createErrorResponse(500, error.message || '查询失败', error);
  }
}

/**
 * 获取区域配置列表
 */
async function listRegions(data) {
  const {
    configType,
    country,
    status,
    parentCode,
    keyword,
    page = 1,
    pageSize = 20
  } = data;
  
  try {
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
    
    if (keyword && keyword.trim()) {
      const keywordTrimmed = keyword.trim();
      const keywordConditions = _.or([
        { name: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { nameEn: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { code: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) }
      ]);
      
      if (Object.keys(query).length > 0) {
        queryBuilder = db.collection('region_configs').where(
          _.and([query, keywordConditions])
        );
      } else {
        queryBuilder = db.collection('region_configs').where(keywordConditions);
      }
    }
    
    const result = await queryBuilder
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    
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
          _.and([query, keywordConditions])
        );
      } else {
        countQueryBuilder = db.collection('region_configs').where(keywordConditions);
      }
    } else {
      countQueryBuilder = db.collection('region_configs').where(query);
    }
    
    const countResult = await countQueryBuilder.count();
    const total = countResult.total;
    
    // 返回格式需要与前端期望一致：data 直接是数组，total 和 pagination 在顶层
    return {
      code: 0,
      success: true,
      message: '查询成功',
      data: result.data,
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error) {
    console.error('查询区域配置列表失败:', error);
    return createErrorResponse(500, error.message || '查询失败', error);
  }
}

/**
 * 区域配置路由处理
 */
async function handleRegionConfig(event, context) {
  const { action, ...data } = event;
  
  // 获取用户信息
  let user = null;
  
  // 对于需要权限的操作，检查token
  if (action !== 'list' && action !== 'get') {
    try {
      user = await checkPermission(event, context, 'operation:manage');
      
      if (user.role !== 'platform_operator' && user.role !== 'system_admin') {
        return createErrorResponse(403, '只有平台运营人员和系统管理员可以执行此操作');
      }
    } catch (err) {
      return createErrorResponse(err.code || 401, err.message || '未授权访问，请先登录');
    }
  } else {
    try {
      user = await checkPermission(event, context);
    } catch (err) {
      user = { _id: 'system', username: 'system', role: 'guest' };
    }
  }
  
  switch (action) {
    case 'create':
      return await createRegion(data, user);
    case 'update':
      return await updateRegion(data, user);
    case 'archive':
      return await archiveRegion(data, user);
    case 'activate':
      return await activateRegion(data, user);
    case 'get':
      return await getRegion(data);
    case 'list':
      return await listRegions(data);
    default:
      return createErrorResponse(400, `未知的 action: ${action}`);
  }
}

module.exports = {
  handleRegionConfig
};

