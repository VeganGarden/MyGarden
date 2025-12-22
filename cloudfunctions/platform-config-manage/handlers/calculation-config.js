/**
 * 计算参数配置管理 Handler
 * 
 * 功能已从 carbon-calculation-config-manage 迁移并整合到 platform-config-manage
 */

const cloud = require('wx-server-sdk');
const db = cloud.database();
const _ = db.command;
const { checkPermission } = require('../utils/permission');
const { createErrorResponse, createSuccessResponse } = require('../utils/error-handler');

/**
 * 查询配置列表
 */
async function listConfigs(data) {
  try {
    const {
      configType,
      configKey,
      category,
      status = 'active',
      page = 1,
      pageSize = 100
    } = data;

    let query = {};

    if (configType) {
      query.configType = configType;
    }

    if (configKey) {
      query.configKey = configKey;
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const result = await db.collection('carbon_calculation_configs')
      .where(query)
      .orderBy('configKey', 'asc')
      .orderBy('category', 'asc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const totalResult = await db.collection('carbon_calculation_configs')
      .where(query)
      .count();

    return createSuccessResponse({
      data: result.data,
      total: totalResult.total,
      pagination: {
        page,
        pageSize,
        total: totalResult.total
      }
    }, '查询成功');
  } catch (error) {
    console.error('查询配置列表失败:', error);
    return createErrorResponse(500, '查询失败', error);
  }
}

/**
 * 获取单个配置详情
 */
async function getConfig(data) {
  try {
    const { id, configKey, category } = data;

    let query = {};

    if (id) {
      query._id = id;
    } else if (configKey && category) {
      query.configKey = configKey;
      query.category = category;
      query.status = 'active';
    } else {
      return createErrorResponse(400, '缺少必要参数：id 或 (configKey + category)');
    }

    const result = await db.collection('carbon_calculation_configs')
      .where(query)
      .get();

    if (result.data.length === 0) {
      return createErrorResponse(404, '配置不存在');
    }

    return createSuccessResponse(result.data[0], '查询成功');
  } catch (error) {
    console.error('获取配置详情失败:', error);
    return createErrorResponse(500, '查询失败', error);
  }
}

/**
 * 更新单个配置
 */
async function updateConfig(data, user) {
  try {
    const { id, configKey, category, value, description, source, version } = data;

    if (value === undefined && !description && !source && !version) {
      return createErrorResponse(400, '缺少更新字段');
    }

    let query = {};

    if (id) {
      query._id = id;
    } else if (configKey && category) {
      query.configKey = configKey;
      query.category = category;
      query.status = 'active';
    } else {
      return createErrorResponse(400, '缺少必要参数：id 或 (configKey + category)');
    }

    const existing = await db.collection('carbon_calculation_configs')
      .where(query)
      .get();

    if (existing.data.length === 0) {
      return createErrorResponse(404, '配置不存在');
    }

    const existingConfig = existing.data[0];

    const updateData = {
      updatedAt: new Date()
    };

    if (value !== undefined) {
      updateData.value = value;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (source !== undefined) {
      updateData.source = source;
    }

    if (version !== undefined) {
      updateData.version = version;
    }

    await db.collection('carbon_calculation_configs')
      .doc(existingConfig._id)
      .update({
        data: updateData
      });

    const updated = await db.collection('carbon_calculation_configs')
      .doc(existingConfig._id)
      .get();

    return createSuccessResponse(updated.data, '更新成功');
  } catch (error) {
    console.error('更新配置失败:', error);
    return createErrorResponse(500, error.message || '更新失败', error);
  }
}

/**
 * 批量更新配置
 */
async function batchUpdateConfigs(data, user) {
  try {
    const { updates } = data;

    if (!Array.isArray(updates) || updates.length === 0) {
      return createErrorResponse(400, '缺少更新数据（updates数组）');
    }

    const results = {
      success: [],
      failed: []
    };

    for (const update of updates) {
      try {
        const { id, configKey, category, value, description, source, version } = update;

        let query = {};

        if (id) {
          query._id = id;
        } else if (configKey && category) {
          query.configKey = configKey;
          query.category = category;
          query.status = 'active';
        } else {
          results.failed.push({
            update,
            error: '缺少必要参数：id 或 (configKey + category)'
          });
          continue;
        }

        const existing = await db.collection('carbon_calculation_configs')
          .where(query)
          .get();

        if (existing.data.length === 0) {
          results.failed.push({
            update,
            error: '配置不存在'
          });
          continue;
        }

        const existingConfig = existing.data[0];

        const updateData = {
          updatedAt: new Date()
        };

        if (value !== undefined) {
          updateData.value = value;
        }

        if (description !== undefined) {
          updateData.description = description;
        }

        if (source !== undefined) {
          updateData.source = source;
        }

        if (version !== undefined) {
          updateData.version = version;
        }

        await db.collection('carbon_calculation_configs')
          .doc(existingConfig._id)
          .update({
            data: updateData
          });

        results.success.push({
          id: existingConfig._id,
          configKey: existingConfig.configKey,
          category: existingConfig.category
        });
      } catch (error) {
        results.failed.push({
          update,
          error: error.message
        });
      }
    }

    return createSuccessResponse(results, '批量更新完成');
  } catch (error) {
    console.error('批量更新配置失败:', error);
    return createErrorResponse(500, error.message || '批量更新失败', error);
  }
}

/**
 * 获取所有配置类型分组
 */
async function getConfigGroups(data) {
  try {
    const result = await db.collection('carbon_calculation_configs')
      .where({
        status: 'active'
      })
      .get();

    const groups = {};
    for (const config of result.data) {
      if (!groups[config.configKey]) {
        groups[config.configKey] = {
          configKey: config.configKey,
          configType: config.configType,
          description: config.description || '',
          items: []
        };
      }
      groups[config.configKey].items.push(config);
    }

    return createSuccessResponse(Object.values(groups), '查询成功');
  } catch (error) {
    console.error('获取配置分组失败:', error);
    return createErrorResponse(500, '查询失败', error);
  }
}

/**
 * 计算参数配置路由处理
 */
async function handleCalculationConfig(event, context) {
  const { action, ...data } = event;
  
  // 获取用户信息
  let user = null;
  
  // 对于需要权限的操作，检查token
  if (action !== 'list' && action !== 'get' && action !== 'getGroups') {
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
    case 'list':
      return await listConfigs(data);
    case 'get':
      return await getConfig(data);
    case 'update':
      return await updateConfig(data, user);
    case 'batchUpdate':
      return await batchUpdateConfigs(data, user);
    case 'getGroups':
      return await getConfigGroups(data);
    default:
      return createErrorResponse(400, `未知的 action: ${action}`);
  }
}

module.exports = {
  handleCalculationConfig
};

