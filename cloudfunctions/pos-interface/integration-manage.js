/**
 * 收银系统集成配置管理模块
 */

/**
 * 获取同步历史记录
 */
async function getSyncHistory(params, db) {
  try {
    const {
      restaurantId,
      page = 1,
      pageSize = 20,
      status,
      action,
      startDate,
      endDate,
    } = params;

    // 构建查询条件
    const where = {
      restaurantId,
    };

    if (status) {
      where.status = status;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.$gte = startDate;
      }
      if (endDate) {
        where.createdAt.$lte = endDate;
      }
    }

    // 查询总数
    const countResult = await db
      .collection('pos_sync_logs')
      .where(where)
      .count();

    // 查询数据
    const result = await db
      .collection('pos_sync_logs')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      message: '获取成功',
      data: {
        list: result.data || [],
        total: countResult.total || 0,
      },
    };
  } catch (error) {
    console.error('获取同步历史失败:', error);
    return {
      code: 500,
      message: '获取同步历史失败',
      error: error.message,
    };
  }
}

/**
 * 获取单个同步记录
 */
async function getSyncLog(id, db) {
  try {
    const result = await db.collection('pos_sync_logs').doc(id).get();

    if (!result.data) {
      return {
        code: 404,
        message: '同步记录不存在',
      };
    }

    return {
      code: 0,
      message: '获取成功',
      data: result.data,
    };
  } catch (error) {
    console.error('获取同步记录失败:', error);
    return {
      code: 500,
      message: '获取同步记录失败',
      error: error.message,
    };
  }
}

/**
 * 获取集成配置列表
 */
async function getIntegrations(restaurantId, db) {
  try {
    const result = await db
      .collection('pos_integrations')
      .where({
        restaurantId: restaurantId,
      })
      .orderBy('createdAt', 'desc')
      .get();

    return {
      code: 0,
      message: '获取成功',
      data: result.data || [],
    };
  } catch (error) {
    console.error('获取集成配置失败:', error);
    return {
      code: 500,
      message: '获取集成配置失败',
      error: error.message,
    };
  }
}

/**
 * 创建集成配置
 */
async function createIntegration(data, db) {
  try {
    const now = new Date().toISOString();
    const integrationData = {
      restaurantId: data.restaurantId,
      posSystem: data.posSystem,
      // 接口名称：如果提供了且不为空，则保存；否则不保存该字段
      ...(data.name && data.name.trim() ? { name: data.name.trim() } : {}),
      apiUrl: data.apiUrl,
      apiKey: data.apiKey,
      secretKey: data.secretKey,
      webhookUrl: data.webhookUrl || '',
      status: data.status || 'active',
      syncStats: {
        totalSyncs: 0,
        successSyncs: 0,
        failedSyncs: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('pos_integrations').add({
      data: integrationData,
    });

    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: result._id,
        ...integrationData,
      },
    };
  } catch (error) {
    console.error('创建集成配置失败:', error);
    return {
      code: 500,
      message: '创建集成配置失败',
      error: error.message,
    };
  }
}

/**
 * 更新集成配置
 */
async function updateIntegration(id, data, db) {
  try {
    const _ = db.command;
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    // 支持更新 name 字段：如果提供了且不为空，则更新；如果为空字符串，则不更新该字段
    if (data.name !== undefined) {
      if (data.name && data.name.trim()) {
        updateData.name = data.name.trim();
      }
      // 如果name为空字符串，不更新该字段（保持原值或不存在）
    }
    if (data.apiUrl !== undefined) updateData.apiUrl = data.apiUrl;
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
    if (data.secretKey !== undefined && data.secretKey !== '') {
      updateData.secretKey = data.secretKey;
    }
    if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
    if (data.status !== undefined) updateData.status = data.status;

    const result = await db
      .collection('pos_integrations')
      .doc(id)
      .update({
        data: updateData,
      });

    // 获取更新后的数据
    const updatedDoc = await db.collection('pos_integrations').doc(id).get();

    return {
      code: 0,
      message: '更新成功',
      data: updatedDoc.data,
    };
  } catch (error) {
    console.error('更新集成配置失败:', error);
    return {
      code: 500,
      message: '更新集成配置失败',
      error: error.message,
    };
  }
}

/**
 * 删除集成配置
 */
async function deleteIntegration(id, db) {
  try {
    await db.collection('pos_integrations').doc(id).remove();

    return {
      code: 0,
      message: '删除成功',
    };
  } catch (error) {
    console.error('删除集成配置失败:', error);
    return {
      code: 500,
      message: '删除集成配置失败',
      error: error.message,
    };
  }
}

/**
 * 测试连接
 */
/**
 * 测试连接
 * 发送一个简单的测试请求到收银系统的API，验证配置是否正确
 */
async function testConnection(id, db) {
  try {
    const doc = await db.collection('pos_integrations').doc(id).get();
    if (!doc.data) {
      return {
        code: 404,
        message: '集成配置不存在',
      };
    }

    const config = doc.data;

    // 验证必要字段
    if (!config.apiUrl) {
      return {
        code: 400,
        message: 'API地址未配置',
      };
    }

    // 尝试发送一个简单的测试请求
    // 注意：由于云函数环境限制，这里只做基本验证
    // 实际连接测试需要根据具体的收银系统API实现
    try {
      const https = require('https');
      const url = require('url');
      
      const parsedUrl = url.parse(config.apiUrl);
      
      // 基本验证：检查URL格式
      if (!parsedUrl.hostname) {
        return {
          code: 400,
          message: 'API地址格式不正确',
        };
      }

      // 如果配置了API Key，验证格式
      if (config.apiKey && config.apiKey.length < 8) {
        return {
          code: 400,
          message: 'API密钥格式可能不正确（长度过短）',
        };
      }

      // 返回成功（实际HTTP请求测试需要根据具体API实现）
      return {
        code: 0,
        message: '配置验证通过（注意：未进行实际HTTP连接测试）',
      };
    } catch (parseError) {
      return {
        code: 400,
        message: 'API地址解析失败',
        error: parseError.message,
      };
    }
  } catch (error) {
    return {
      code: 500,
      message: '测试连接失败',
      error: error.message,
    };
  }
}

module.exports = {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testConnection,
  getSyncHistory,
  getSyncLog,
};

