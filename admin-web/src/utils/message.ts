import { message as antdMessage, theme } from 'antd'

/**
 * 消息提示工具函数
 * 统一消息提示样式和行为
 * 使用品牌色和优化的动画效果
 */

interface MessageOptions {
  duration?: number
  maxCount?: number
}

// 配置全局消息 - 优化样式和位置
antdMessage.config({
  top: 80,
  duration: 3,
  maxCount: 3,
  rtl: false,
  prefixCls: 'brand-message',
})

// 自定义消息样式（通过全局CSS实现）
// 消息使用品牌色，动画更流畅

/**
 * 成功消息
 */
export const showSuccess = (
  content: string,
  options?: MessageOptions
): void => {
  antdMessage.success({
    content,
    duration: options?.duration || 3,
  })
}

/**
 * 错误消息
 */
export const showError = (
  content: string,
  options?: MessageOptions
): void => {
  antdMessage.error({
    content,
    duration: options?.duration || 4,
  })
}

/**
 * 警告消息
 */
export const showWarning = (
  content: string,
  options?: MessageOptions
): void => {
  antdMessage.warning({
    content,
    duration: options?.duration || 3,
  })
}

/**
 * 信息消息
 */
export const showInfo = (
  content: string,
  options?: MessageOptions
): void => {
  antdMessage.info({
    content,
    duration: options?.duration || 3,
  })
}

/**
 * 加载消息
 */
export const showLoading = (
  content: string = '加载中...'
): (() => void) => {
  const hide = antdMessage.loading({
    content,
    duration: 0,
  })

  return () => {
    hide()
  }
}

/**
 * 自定义消息
 */
export const showMessage = (
  type: 'success' | 'error' | 'warning' | 'info' | 'loading',
  content: string,
  options?: MessageOptions
): (() => void) | void => {
  if (type === 'loading') {
    return showLoading(content)
  }

  const methods = {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
  }

  methods[type](content, options)
}

