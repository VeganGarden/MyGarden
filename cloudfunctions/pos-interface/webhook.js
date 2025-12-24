/**
 * Webhook回调处理模块
 * 
 * 功能：
 * 1. 发送Webhook回调到收银系统
 * 2. 处理收银系统发送的Webhook
 */

const crypto = require('crypto');
const { logInfo, logError } = require('./logging');

/**
 * 发送Webhook回调到收银系统
 * @param {Object} eventData - 事件数据
 * @param {string} eventData.event - 事件类型
 * @param {string} eventData.restaurantId - 餐厅ID
 * @param {Object} eventData.data - 事件数据
 * @param {Object} integrationConfig - 收银系统配置
 * @returns {Promise<Object>} 发送结果
 */
async function sendWebhook(eventData, integrationConfig) {
  try {
    const { event, restaurantId, data } = eventData;

    // 检查是否配置了Webhook URL
    if (!integrationConfig.webhookUrl) {
      console.log('未配置Webhook URL，跳过发送');
      return { success: false, error: '未配置Webhook URL' };
    }

    // 构建Webhook请求数据
    const webhookData = {
      event: event,
      timestamp: new Date().toISOString(),
      data: {
        restaurantId: restaurantId,
        ...data
      }
    };

    // 生成签名
    const signature = generateWebhookSignature(webhookData, integrationConfig.secretKey);

    // 发送HTTP请求（这里使用云函数HTTP请求能力）
    // 注意：wx-server-sdk可能不支持直接的HTTP请求，需要根据实际情况调整
    // 可以通过调用其他支持HTTP的云函数或使用云开发的HTTP API
    
    // 简化实现：记录日志，实际发送需要根据云函数环境调整
    if (db) {
      await logInfo({
        action: 'sendWebhook',
        restaurantId,
        posSystem: integrationConfig.posSystem,
        requestData: {
          event,
          webhookUrl: integrationConfig.webhookUrl
        },
        responseData: webhookData
      }, db);
    }

    return { success: true };

  } catch (error) {
    console.error('发送Webhook失败:', error);
    if (db) {
      await logError({
        action: 'sendWebhook',
        restaurantId: eventData?.restaurantId,
        error: error.message,
        stack: error.stack
      }, db);
    }

    return { success: false, error: error.message };
  }
}

/**
 * 处理收银系统发送的Webhook
 * @param {Object} data - Webhook数据
 * @param {Object} integrationConfig - 收银系统配置
 * @param {Object} db - 数据库实例
 * @param {Object} cloud - 云服务实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleWebhook(data, integrationConfig, db, cloud) {
  try {
    const { event, timestamp, data: eventData, signature } = data;

    // 1. 验证签名
    if (!verifyWebhookSignature(data, integrationConfig.secretKey, signature)) {
      return {
        code: 401,
        message: 'Webhook签名验证失败'
      };
    }

    // 2. 根据事件类型处理
    switch (event) {
      case 'menu.received':
        // 菜单接收确认
        return await handleMenuReceived(eventData, integrationConfig, db);

      case 'order.status.updated':
        // 订单状态更新
        return await handleOrderStatusUpdated(eventData, integrationConfig, db);

      default:
        return {
          code: 400,
          message: `未知的事件类型: ${event}`
        };
    }

  } catch (error) {
    console.error('处理Webhook失败:', error);
    return {
      code: 500,
      message: '处理Webhook失败',
      error: error.message
    };
  }
}

/**
 * 处理菜单接收确认
 * @param {Object} eventData - 事件数据
 * @param {Object} integrationConfig - 收银系统配置
 * @param {Object} db - 数据库实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleMenuReceived(eventData, integrationConfig, db) {
  // 更新菜单同步状态
  // 实现逻辑根据需求确定
  return {
    code: 0,
    message: '菜单接收确认处理成功'
  };
}

/**
 * 处理订单状态更新
 * @param {Object} eventData - 事件数据
 * @param {Object} integrationConfig - 收银系统配置
 * @param {Object} db - 数据库实例
 * @returns {Promise<Object>} 处理结果
 */
async function handleOrderStatusUpdated(eventData, integrationConfig, db) {
  // 更新订单状态
  // 实现逻辑根据需求确定
  return {
    code: 0,
    message: '订单状态更新处理成功'
  };
}

/**
 * 生成Webhook签名
 * @param {Object} data - 数据对象
 * @param {string} secretKey - 密钥
 * @returns {string} 签名的十六进制字符串
 */
function generateWebhookSignature(data, secretKey) {
  const signString = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signString, 'utf8')
    .digest('hex');
  return signature;
}

/**
 * 验证Webhook签名
 * @param {Object} data - 数据对象（不包含signature字段）
 * @param {string} secretKey - 密钥
 * @param {string} providedSignature - 提供的签名
 * @returns {boolean} 签名是否有效
 */
function verifyWebhookSignature(data, secretKey, providedSignature) {
  // 构建用于签名的数据（排除signature字段）
  const { signature, ...dataForSign } = data;
  const expectedSignature = generateWebhookSignature(dataForSign, secretKey);
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

module.exports = {
  sendWebhook,
  handleWebhook
};

