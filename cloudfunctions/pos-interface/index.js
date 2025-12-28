/**
 * 收银系统接口云函数
 * 
 * 功能：
 * 1. 菜单数据推送（气候餐厅平台 → 收银系统）
 * 2. 订单数据同步（收银系统 → 气候餐厅平台 → 收银系统）
 * 3. 批量订单同步
 * 4. Webhook回调处理
 * 
 * 支持的 actions:
 * - pushMenu: 推送菜单数据到收银系统
 * - syncOrder: 同步订单数据（收银系统 → 气候餐厅平台）
 * - batchSyncOrders: 批量同步订单数据
 * - handleWebhook: 处理Webhook回调
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入模块
const { authenticate } = require('./auth');
const menuSyncHandler = require('./menu-sync');
const orderSyncHandler = require('./order-sync');
const webhookHandler = require('./webhook');
const { logSyncOperation } = require('./logging');
const integrationManage = require('./integration-manage');

/**
 * 云函数主入口
 * @param {Object} event - 事件对象
 * @param {Object} context - 上下文对象
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  // 请求信息（用于认证）
  const requestInfo = {
    method: event.httpMethod || 'POST',
    path: event.path || '/',
    headers: event.headers || {},
    body: typeof data === 'string' ? data : JSON.stringify(data || {})
  };

  try {
    // 集成配置管理和同步历史相关的 action 不需要认证（由前端token控制）
    const integrationActions = [
      'getIntegrations',
      'createIntegration',
      'updateIntegration',
      'deleteIntegration',
      'testConnection',
      'getSyncHistory',
      'getSyncLog',
    ];

    if (integrationActions.includes(action)) {
      // 集成配置管理和同步历史操作
      switch (action) {
        case 'getIntegrations':
          return await integrationManage.getIntegrations(
            data && data.restaurantId ? data.restaurantId : undefined,
            db
          );

        case 'createIntegration':
          return await integrationManage.createIntegration(data, db);

        case 'updateIntegration':
          return await integrationManage.updateIntegration(
            data && data.id ? data.id : undefined,
            data && data.data ? data.data : undefined,
            db
          );

        case 'deleteIntegration':
          return await integrationManage.deleteIntegration(
            data && data.id ? data.id : undefined,
            db
          );

        case 'testConnection':
          return await integrationManage.testConnection(
            data && data.id ? data.id : undefined,
            db
          );

        case 'getSyncHistory':
          return await integrationManage.getSyncHistory(data, db);

        case 'getSyncLog':
          return await integrationManage.getSyncLog(
            data && data.id ? data.id : undefined,
            db
          );

        default:
          return {
            code: 400,
            message: `未知的 action: ${action}`,
            requestId: context.requestId,
          };
      }
    }

    // pushMenu 操作：如果提供了 integrationId，直接使用；否则需要外部认证
    if (action === 'pushMenu' && data && data.integrationId) {
      // 从 integrationId 获取配置（内部调用，不需要外部认证）
      const integrationDoc = await db.collection('pos_integrations').doc(data.integrationId).get();
      if (!integrationDoc.data || integrationDoc.data.status !== 'active') {
        return {
          code: 404,
          message: '集成配置不存在或未激活',
          requestId: context.requestId
        };
      }
      const integrationConfig = integrationDoc.data;
      return await menuSyncHandler.pushMenu(data, integrationConfig, db, cloud);
    }

    // 其他操作需要认证
    const authResult = await authenticate(requestInfo, db);
    if (!authResult.success) {
      return {
        code: 401,
        message: authResult.error || '认证失败',
        requestId: context.requestId
      };
    }

    const integrationConfig = authResult.integrationConfig;

    // 根据action分发到不同的处理器
    switch (action) {
      case 'pushMenu':
        // 如果已经通过 integrationId 处理，不会到达这里
        return await menuSyncHandler.pushMenu(data, integrationConfig, db, cloud);

      case 'syncOrder':
        return await orderSyncHandler.syncOrder(data, integrationConfig, db, cloud);

      case 'batchSyncOrders':
        return await orderSyncHandler.batchSyncOrders(data, integrationConfig, db, cloud);

      case 'handleWebhook':
        return await webhookHandler.handleWebhook(data, integrationConfig, db, cloud);

      default:
        return {
          code: 400,
          message: `未知的 action: ${action}`,
          requestId: context.requestId
        };
    }

  } catch (error) {
    console.error('POS接口云函数执行失败:', error);
    
    // 记录错误日志
    await logSyncOperation({
      type: 'error',
      action: action || 'unknown',
      restaurantId: data && data.restaurantId ? data.restaurantId : undefined,
      error: error.message,
      stack: error.stack
    }, db).catch(err => {
      console.error('记录日志失败:', err);
    });

    return {
      code: 500,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: context.requestId
    };
  }
};

