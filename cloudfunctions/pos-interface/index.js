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
    // 认证（除了某些公开接口，其他都需要认证）
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
      restaurantId: data?.restaurantId,
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

