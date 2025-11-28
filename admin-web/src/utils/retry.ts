/**
 * 重试工具函数
 * 用于网络请求失败时自动重试
 */

export interface RetryOptions {
  maxRetries?: number // 最大重试次数，默认3次
  retryDelay?: number // 重试延迟（毫秒），默认1000ms
  retryCondition?: (error: any) => boolean // 判断是否应该重试的函数
}

/**
 * 执行带重试的异步函数
 * @param fn 要执行的异步函数
 * @param options 重试配置选项
 * @returns Promise<T>
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = (error: any) => {
      // 默认重试条件：网络错误或5xx错误
      if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') {
        return true
      }
      if (error?.response?.status >= 500) {
        return true
      }
      return false
    }
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        break
      }

      // 检查是否应该重试
      if (!retryCondition(error)) {
        throw error
      }

      // 计算延迟时间（指数退避）
      const delay = retryDelay * Math.pow(2, attempt)
      
      console.warn(`请求失败，${delay}ms 后进行第 ${attempt + 1} 次重试...`, error.message)
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * 判断是否为网络错误
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  // 检查错误码
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return true
  }
  
  // 检查错误消息
  const message = error.message || ''
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('Network') ||
    message.includes('Failed to fetch') ||
    message.includes('网络错误')
  ) {
    return true
  }
  
  return false
}

/**
 * 判断是否为权限错误
 */
export function isPermissionError(error: any): boolean {
  if (!error) return false
  
  // 检查错误码
  if (error.code === 401 || error.code === 403 || error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
    return true
  }
  
  // 检查响应状态码
  if (error.response?.status === 401 || error.response?.status === 403) {
    return true
  }
  
  // 检查错误消息
  const message = error.message || ''
  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('未授权') ||
    message.includes('无权限')
  ) {
    return true
  }
  
  return false
}

