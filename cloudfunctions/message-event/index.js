const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 消息事件处理云函数
 * 功能：业务事件监听和处理
 * 
 * 支持的 actions:
 * - handleTenantCertApply: 处理租户认证申请事件
 * - handleRestaurantCertApply: 处理餐厅认证申请事件
 * - handleAuditTaskThreshold: 处理待审核任务阈值事件
 * - checkAuditTasks: 检查待审核任务数量（定时任务）
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      case 'handleTenantCertApply':
        return await handleTenantCertApply(data);
      
      case 'handleRestaurantCertApply':
        return await handleRestaurantCertApply(data);
      
      case 'handleAuditTaskThreshold':
        return await handleAuditTaskThreshold(data);
      
      case 'checkAuditTasks':
        return await checkAuditTasks(data);
      
      default:
        return {
          code: 400,
          message: '未知的操作类型',
          action
        };
    }
  } catch (error) {
    console.error('消息事件处理失败:', error);
    return {
      code: 500,
      message: '事件处理失败，请重试',
      error: error.message
    };
  }
};

/**
 * 处理租户认证申请事件
 */
async function handleTenantCertApply(data) {
  const { tenantId, tenantName, applyTime } = data;

  if (!tenantId || !tenantName) {
    return {
      code: 400,
      message: '租户ID和名称不能为空'
    };
  }

  try {
    // 1. 查找事件规则
    const ruleResult = await db.collection('message_event_rules')
      .where({
        eventType: 'tenant_cert_apply',
        enabled: true
      })
      .get();

    if (ruleResult.data.length === 0) {
      return {
        code: 0,
        message: '事件规则未启用，跳过消息发送'
      };
    }

    const rule = ruleResult.data[0];

    // 2. 创建消息
    const messageData = {
      title: `新租户认证申请：${tenantName}`,
      content: `租户"${tenantName}"提交了认证申请，请及时审核。`,
      type: 'business',
      priority: rule.priority || 'important',
      status: 'pending',
      sendType: 'event_triggered',
      eventType: 'tenant_cert_apply',
      targetType: 'role',
      targetRoles: rule.targetRoles || ['platform_operator'],
      link: `/admin/tenants/${tenantId}/certification`,
      relatedEntityId: tenantId,
      relatedEntityType: 'tenant_cert',
      creatorId: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const messageResult = await db.collection('messages').add({ data: messageData });

    // 3. 调用message-push云函数发送消息
    await cloud.callFunction({
      name: 'message-push',
      data: {
        action: 'pushMessage',
        data: {
          messageId: messageResult._id,
          targetType: 'role',
          targetRoles: rule.targetRoles
        }
      }
    });

    return {
      code: 0,
      message: '租户认证申请消息已发送',
      data: {
        messageId: messageResult._id
      }
    };
  } catch (error) {
    console.error('处理租户认证申请事件失败:', error);
    return {
      code: 500,
      message: '处理事件失败',
      error: error.message
    };
  }
}

/**
 * 处理餐厅认证申请事件
 */
async function handleRestaurantCertApply(data) {
  const { restaurantId, restaurantName, tenantId, applyTime } = data;

  if (!restaurantId || !restaurantName) {
    return {
      code: 400,
      message: '餐厅ID和名称不能为空'
    };
  }

  try {
    // 1. 查找事件规则
    const ruleResult = await db.collection('message_event_rules')
      .where({
        eventType: 'restaurant_cert_apply',
        enabled: true
      })
      .get();

    if (ruleResult.data.length === 0) {
      return {
        code: 0,
        message: '事件规则未启用，跳过消息发送'
      };
    }

    const rule = ruleResult.data[0];

    // 2. 创建消息
    const messageData = {
      title: `新餐厅认证申请：${restaurantName}`,
      content: `餐厅"${restaurantName}"提交了认证申请，请及时审核。`,
      type: 'business',
      priority: rule.priority || 'important',
      status: 'pending',
      sendType: 'event_triggered',
      eventType: 'restaurant_cert_apply',
      targetType: 'role',
      targetRoles: rule.targetRoles || ['platform_operator'],
      link: `/admin/restaurants/${restaurantId}/certification`,
      relatedEntityId: restaurantId,
      relatedEntityType: 'restaurant_cert',
      creatorId: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const messageResult = await db.collection('messages').add({ data: messageData });

    // 3. 调用message-push云函数发送消息
    await cloud.callFunction({
      name: 'message-push',
      data: {
        action: 'pushMessage',
        data: {
          messageId: messageResult._id,
          targetType: 'role',
          targetRoles: rule.targetRoles
        }
      }
    });

    return {
      code: 0,
      message: '餐厅认证申请消息已发送',
      data: {
        messageId: messageResult._id
      }
    };
  } catch (error) {
    console.error('处理餐厅认证申请事件失败:', error);
    return {
      code: 500,
      message: '处理事件失败',
      error: error.message
    };
  }
}

/**
 * 处理待审核任务阈值事件
 */
async function handleAuditTaskThreshold(data) {
  const { pendingCount, threshold = 10 } = data;

  if (pendingCount === undefined) {
    return {
      code: 400,
      message: '待审核任务数量不能为空'
    };
  }

  if (pendingCount < threshold) {
    return {
      code: 0,
      message: '待审核任务数量未达到阈值，跳过消息发送'
    };
  }

  try {
    // 1. 查找事件规则
    const ruleResult = await db.collection('message_event_rules')
      .where({
        eventType: 'audit_task_threshold',
        enabled: true
      })
      .get();

    if (ruleResult.data.length === 0) {
      return {
        code: 0,
        message: '事件规则未启用，跳过消息发送'
      };
    }

    const rule = ruleResult.data[0];

    // 2. 创建消息
    const messageData = {
      title: `待审核任务提醒`,
      content: `当前有 ${pendingCount} 个认证申请待审核，请及时处理。`,
      type: 'business',
      priority: rule.priority || 'normal',
      status: 'pending',
      sendType: 'event_triggered',
      eventType: 'audit_task_threshold',
      targetType: 'role',
      targetRoles: rule.targetRoles || ['platform_operator'],
      link: `/admin/audit/pending`,
      creatorId: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const messageResult = await db.collection('messages').add({ data: messageData });

    // 3. 调用message-push云函数发送消息
    await cloud.callFunction({
      name: 'message-push',
      data: {
        action: 'pushMessage',
        data: {
          messageId: messageResult._id,
          targetType: 'role',
          targetRoles: rule.targetRoles
        }
      }
    });

    return {
      code: 0,
      message: '待审核任务提醒消息已发送',
      data: {
        messageId: messageResult._id,
        pendingCount
      }
    };
  } catch (error) {
    console.error('处理待审核任务阈值事件失败:', error);
    return {
      code: 500,
      message: '处理事件失败',
      error: error.message
    };
  }
}

/**
 * 检查待审核任务数量（定时任务调用）
 * 统计租户申请和餐厅认证申请中状态为 pending 的数量
 */
async function checkAuditTasks(data) {
  const { threshold = 10 } = data || {};

  try {
    // 1. 统计待审核的租户申请数量
    const tenantAppsResult = await db.collection('tenant_applications')
      .where({
        status: 'pending'
      })
      .count();

    const pendingTenantCount = tenantAppsResult.total || 0;

    // 2. 统计待审核的餐厅认证申请数量
    const restaurantsResult = await db.collection('restaurants')
      .where({
        certificationStatus: 'pending'
      })
      .count();

    const pendingRestaurantCount = restaurantsResult.total || 0;

    // 3. 计算总待审核任务数
    const totalPendingCount = pendingTenantCount + pendingRestaurantCount;

    console.log(`待审核任务统计: 租户申请=${pendingTenantCount}, 餐厅认证=${pendingRestaurantCount}, 总计=${totalPendingCount}`);

    // 4. 如果达到阈值，触发消息
    if (totalPendingCount >= threshold) {
      return await handleAuditTaskThreshold({
        pendingCount: totalPendingCount,
        threshold: threshold,
        tenantCount: pendingTenantCount,
        restaurantCount: pendingRestaurantCount
      });
    }

    return {
      code: 0,
      message: '待审核任务数量未达到阈值',
      data: {
        totalPendingCount,
        tenantCount: pendingTenantCount,
        restaurantCount: pendingRestaurantCount,
        threshold
      }
    };
  } catch (error) {
    console.error('检查待审核任务失败:', error);
    return {
      code: 500,
      message: '检查待审核任务失败',
      error: error.message
    };
  }
}

