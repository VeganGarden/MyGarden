/**
 * i18n 工具函数
 * 提供一些常用的翻译辅助函数
 */

import { TFunction } from 'i18next'
import i18n from '@/i18n'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'

/**
 * 格式化带参数的翻译文本
 * @param t - i18next 的 t 函数
 * @param key - 翻译键
 * @param params - 参数对象
 * @returns 格式化后的文本
 */
export const formatTranslation = (
  t: TFunction,
  key: string,
  params?: Record<string, string | number>
): string => {
  if (!params) {
    return t(key)
  }
  return t(key, params)
}

/**
 * 获取状态标签的翻译
 * @param t - i18next 的 t 函数
 * @param status - 状态值
 * @param namespace - 命名空间（可选，默认为 common）
 * @returns 状态文本
 */
export const getStatusText = (
  t: TFunction,
  status: string,
  namespace: string = 'common'
): string => {
  const key = `${namespace}.status.${status}`
  const translation = t(key)
  // 如果翻译不存在，返回原始状态值
  return translation === key ? status : translation
}

/**
 * 获取操作按钮的翻译
 * @param t - i18next 的 t 函数
 * @param action - 操作名称（如 'view', 'edit', 'delete'）
 * @returns 操作文本
 */
export const getActionText = (t: TFunction, action: string): string => {
  const key = `common.${action}`
  const translation = t(key)
  return translation === key ? action : translation
}

/**
 * 获取确认对话框的翻译
 * @param t - i18next 的 t 函数
 * @param action - 操作名称（如 'delete', 'archive'）
 * @returns 确认对话框配置
 */
export const getConfirmConfig = (
  t: TFunction,
  action: string
): { title: string; message: string } => {
  return {
    title: t(`common.confirm${action.charAt(0).toUpperCase() + action.slice(1)}`),
    message: t(`common.confirm${action.charAt(0).toUpperCase() + action.slice(1)}Message`),
  }
}

/**
 * 获取成功/失败消息的翻译
 * @param t - i18next 的 t 函数
 * @param action - 操作名称（如 'save', 'delete'）
 * @param success - 是否成功
 * @returns 消息文本
 */
export const getOperationMessage = (
  t: TFunction,
  action: string,
  success: boolean = true
): string => {
  const suffix = success ? 'Success' : 'Failed'
  const key = `common.${action}${suffix}`
  const translation = t(key)
  return translation === key ? `${action} ${success ? 'success' : 'failed'}` : translation
}

/**
 * 获取表格列名的翻译
 * @param t - i18next 的 t 函数
 * @param module - 模块名称（如 'carbon'）
 * @param page - 页面名称（如 'baselineList'）
 * @param columnKey - 列键名
 * @returns 列名文本
 */
export const getColumnTitle = (
  t: TFunction,
  module: string,
  page: string,
  columnKey: string
): string => {
  const key = `pages.${module}.${page}.table.columns.${columnKey}`
  const translation = t(key)
  // 如果翻译不存在，尝试使用 common
  if (translation === key) {
    const commonKey = `common.${columnKey}`
    const commonTranslation = t(commonKey)
    return commonTranslation === commonKey ? columnKey : commonTranslation
  }
  return translation
}

/**
 * 获取表单字段标签的翻译
 * @param t - i18next 的 t 函数
 * @param module - 模块名称
 * @param page - 页面名称
 * @param fieldKey - 字段键名
 * @returns 字段标签文本
 */
export const getFieldLabel = (
  t: TFunction,
  module: string,
  page: string,
  fieldKey: string
): string => {
  const key = `pages.${module}.${page}.form.fields.${fieldKey}`
  const translation = t(key)
  // 如果翻译不存在，尝试使用 common
  if (translation === key) {
    const commonKey = `common.${fieldKey}`
    const commonTranslation = t(commonKey)
    return commonTranslation === commonKey ? fieldKey : commonTranslation
  }
  return translation
}

/**
 * 获取占位符文本的翻译
 * @param t - i18next 的 t 函数
 * @param type - 占位符类型（如 'search', 'select', 'date'）
 * @param customKey - 自定义键名（可选）
 * @returns 占位符文本
 */
export const getPlaceholder = (
  t: TFunction,
  type: 'search' | 'select' | 'date' | 'time' | 'datetime' | 'input',
  customKey?: string
): string => {
  if (customKey) {
    const translation = t(customKey)
    return translation === customKey ? '' : translation
  }
  const key = `common.${type}Placeholder`
  return t(key)
}

/**
 * 根据当前语言格式化日期
 * @param date - 日期字符串或 Date 对象
 * @param format - 日期格式（可选，默认根据语言自动选择）
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: string | Date, format?: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '-'
  }
  
  const currentLanguage = i18n.language || 'zh'
  const locale = currentLanguage === 'en' ? 'en-US' : 'zh-CN'
  
  if (format) {
    // 使用 dayjs 格式化
    dayjs.locale(currentLanguage === 'en' ? 'en' : 'zh-cn')
    return dayjs(dateObj).format(format)
  }
  
  // 使用原生 toLocaleDateString
  return dateObj.toLocaleDateString(locale)
}

/**
 * 根据当前语言格式化日期时间
 * @param date - 日期字符串或 Date 对象
 * @param format - 日期时间格式（可选，默认根据语言自动选择）
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (date: string | Date, format?: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '-'
  }
  
  const currentLanguage = i18n.language || 'zh'
  const locale = currentLanguage === 'en' ? 'en-US' : 'zh-CN'
  
  if (format) {
    // 使用 dayjs 格式化
    dayjs.locale(currentLanguage === 'en' ? 'en' : 'zh-cn')
    return dayjs(dateObj).format(format)
  }
  
  // 使用原生 toLocaleString
  return dateObj.toLocaleString(locale)
}

/**
 * 根据当前语言格式化数字
 * @param value - 数字值
 * @param options - Intl.NumberFormat 选项（可选）
 * @returns 格式化后的数字字符串
 */
export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions
): string => {
  const currentLanguage = i18n.language || 'zh'
  const locale = currentLanguage === 'en' ? 'en-US' : 'zh-CN'
  
  return new Intl.NumberFormat(locale, options).format(value)
}

/**
 * 根据当前语言格式化货币
 * @param value - 金额数值
 * @param currency - 货币代码（可选，默认根据语言选择）
 * @returns 格式化后的货币字符串
 */
export const formatCurrency = (
  value: number,
  currency?: string
): string => {
  const currentLanguage = i18n.language || 'zh'
  const locale = currentLanguage === 'en' ? 'en-US' : 'zh-CN'
  
  // 如果没有指定货币，根据语言选择默认货币
  if (!currency) {
    currency = currentLanguage === 'en' ? 'USD' : 'CNY'
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(value)
}

/**
 * 根据当前语言格式化百分比
 * @param value - 百分比数值（0-1 之间的小数）
 * @param decimals - 小数位数（可选，默认2位）
 * @returns 格式化后的百分比字符串
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  const currentLanguage = i18n.language || 'zh'
  const locale = currentLanguage === 'en' ? 'en-US' : 'zh-CN'
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

