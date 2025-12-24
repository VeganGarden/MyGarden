/**
 * 同步日志记录模块
 * 
 * 功能：
 * 1. 记录同步操作日志
 * 2. 记录错误日志
 * 3. 记录性能指标
 */

/**
 * 记录同步操作日志
 * @param {Object} logData - 日志数据
 * @param {string} logData.type - 日志类型: success/error/info
 * @param {string} logData.action - 操作类型: pushMenu/syncOrder/batchSyncOrders
 * @param {string} logData.restaurantId - 餐厅ID
 * @param {string} logData.posSystem - 收银系统类型
 * @param {Object} logData.requestData - 请求数据
 * @param {Object} logData.responseData - 响应数据
 * @param {string} logData.error - 错误信息
 * @param {string} logData.stack - 错误堆栈
 * @param {number} logData.duration - 执行时长（毫秒）
 * @param {Object} db - 数据库实例
 * @returns {Promise<void>}
 */
async function logSyncOperation(logData, db) {
  try {
    const logCollection = db.collection('pos_sync_logs');
    
    const logRecord = {
      type: logData.type || 'info',
      action: logData.action,
      restaurantId: logData.restaurantId,
      posSystem: logData.posSystem,
      requestData: logData.requestData || null,
      responseData: logData.responseData || null,
      error: logData.error || null,
      stack: logData.stack || null,
      duration: logData.duration || null,
      createdAt: new Date(),
      timestamp: Date.now()
    };

    await logCollection.add({
      data: logRecord
    });
  } catch (error) {
    // 日志记录失败不应影响主流程
    console.error('记录同步日志失败:', error);
  }
}

/**
 * 记录同步成功日志
 * @param {Object} params - 参数
 * @param {Object} db - 数据库实例
 */
async function logSuccess(params, db) {
  await logSyncOperation({
    type: 'success',
    ...params
  }, db);
}

/**
 * 记录同步错误日志
 * @param {Object} params - 参数
 * @param {Object} db - 数据库实例
 */
async function logError(params, db) {
  await logSyncOperation({
    type: 'error',
    ...params
  }, db);
}

/**
 * 记录同步信息日志
 * @param {Object} params - 参数
 * @param {Object} db - 数据库实例
 */
async function logInfo(params, db) {
  await logSyncOperation({
    type: 'info',
    ...params
  }, db);
}

module.exports = {
  logSyncOperation,
  logSuccess,
  logError,
  logInfo
};

