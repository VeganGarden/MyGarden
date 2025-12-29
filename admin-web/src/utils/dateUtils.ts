/**
 * 日期工具函数
 */

import { DataQuality } from '@/types/vegetarianPersonnel';

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param date - 日期对象或字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return '-'
  if (typeof date === 'string') {
    return date.split('T')[0]
  }
  return new Date(date).toISOString().split('T')[0]
}

/**
 * 格式化日期并显示数据质量标识
 * @param date - 日期对象或字符串
 * @param dataQuality - 数据质量等级
 * @param showQualityTag - 是否显示质量标签
 * @returns 格式化后的日期字符串或带标签的组件数据
 */
export function formatDateWithQuality(
  date: Date | string | undefined,
  dataQuality?: string,
  showQualityTag: boolean = true
): { dateStr: string; isPrecise: boolean } {
  const dateStr = formatDate(date)
  const isPrecise = showQualityTag && dataQuality === DataQuality.PRECISE_DATE
  return { dateStr, isPrecise }
}

