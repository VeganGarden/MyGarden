/**
 * 统一错误处理工具
 */

/**
 * 创建标准错误响应
 * @param {number} code 错误代码
 * @param {string} message 错误消息
 * @param {any} error 原始错误对象
 * @returns {object} 标准错误响应
 */
function createErrorResponse(code, message, error = null) {
  const response = {
    code,
    success: false,
    message,
  }

  if (error) {
    response.error = error.message || error
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack
    }
  }

  return response
}

/**
 * 创建成功响应
 * @param {any} data 响应数据
 * @param {string} message 成功消息
 * @returns {object} 标准成功响应
 */
function createSuccessResponse(data, message = '操作成功') {
  return {
    code: 0,
    success: true,
    message,
    data,
  }
}

/**
 * 包装异步函数，自动处理错误
 * @param {Function} fn 异步函数
 * @returns {Function} 包装后的函数
 */
function asyncHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      console.error('异步函数执行失败:', error)
      
      // 如果是已知的错误对象（包含code和message）
      if (error.code && error.message) {
        return createErrorResponse(error.code, error.message, error)
      }
      
      // 未知错误
      return createErrorResponse(500, error.message || '操作失败', error)
    }
  }
}

module.exports = {
  createErrorResponse,
  createSuccessResponse,
  asyncHandler,
}

