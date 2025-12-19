/**
 * 一餐饭基准值API服务
 */

import { callCloudFunction } from './cloudbase'
import type {
  MealSetBaseline,
  MealSetBaselineQueryParams,
  MealSetBaselineFormData,
  MealSetBaselineImportResult
} from '../types/meal-set-baseline'

/**
 * 一餐饭基准值查询API
 */
export async function queryMealSetBaseline(params: {
  mealTime: string
  region: string
  energyType: string
  mealStructure?: string
  hasSoup?: string
  restaurantType?: string
  consumptionScenario?: string
  city?: string
  season?: string
  consumptionLevel?: string
  date?: string
}): Promise<{
  success: boolean
  data?: MealSetBaseline
  error?: string
  isDefault?: boolean
  message?: string
}> {
  const result = await callCloudFunction('meal-set-baseline-query', {
    action: 'query',
    ...params
  })
  if (result.code === 0 && result.data) {
    return {
      success: true,
      data: result.data,
      isDefault: result.isDefault
    }
  }
  return {
    success: false,
    error: result.message || '查询失败'
  }
}

/**
 * 批量查询一餐饭基准值
 */
export async function batchQueryMealSetBaselines(queries: Array<{
  mealTime: string
  region: string
  energyType: string
  [key: string]: any
}>): Promise<{
  success: boolean
  data?: Array<{
    success: boolean
    data?: MealSetBaseline
    error?: string
  }>
  count?: number
  error?: string
}> {
  const result = await callCloudFunction('meal-set-baseline-query', {
    action: 'batch',
    queries
  })
  if (result.code === 0 && result.data) {
    return {
      success: true,
      data: result.data,
      count: result.count
    }
  }
  return {
    success: false,
    error: result.message || '批量查询失败'
  }
}

/**
 * 一餐饭基准值管理API
 */

/**
 * 创建一餐饭基准值
 */
export async function createMealSetBaseline(
  baseline: MealSetBaselineFormData
): Promise<{
  success: boolean
  code?: number
  data?: {
    requestId?: string
    baselineId: string
    approvalRequired?: boolean
  }
  error?: string
  errors?: string[]
  message?: string
}> {
  const result = await callCloudFunction('meal-set-baseline-manage', {
    action: 'create',
    baseline
  })
  return {
    success: result.success || result.code === 0,
    code: result.code,
    data: result.data,
    error: result.error,
    errors: result.errors,
    message: result.message
  }
}

/**
 * 更新一餐饭基准值
 */
export async function updateMealSetBaseline(
  baselineId: string,
  updates: Partial<MealSetBaselineFormData>
): Promise<{
  success: boolean
  code?: number
  data?: {
    requestId?: string
    baselineId: string
    approvalRequired?: boolean
  }
  error?: string
  message?: string
}> {
  const result = await callCloudFunction('meal-set-baseline-manage', {
    action: 'update',
    baselineId,
    updates
  })
  return {
    success: result.success || result.code === 0,
    code: result.code,
    data: result.data,
    error: result.error,
    message: result.message
  }
}

/**
 * 归档一餐饭基准值
 */
export async function archiveMealSetBaseline(
  baselineId: string
): Promise<{
  success: boolean
  code?: number
  data?: {
    requestId?: string
    baselineId: string
    approvalRequired?: boolean
  }
  error?: string
  message?: string
}> {
  const result = await callCloudFunction('meal-set-baseline-manage', {
    action: 'archive',
    baselineId
  })
  return {
    success: result.success || result.code === 0,
    code: result.code,
    data: result.data,
    error: result.error,
    message: result.message
  }
}

/**
 * 激活一餐饭基准值
 */
export async function activateMealSetBaseline(
  baselineId: string
): Promise<{
  success: boolean
  code?: number
  data?: {
    baselineId: string
  }
  error?: string
}> {
  const result = await callCloudFunction('meal-set-baseline-manage', {
    action: 'update',
    baselineId,
    updates: { status: 'active' }
  })
  return {
    success: result.success || result.code === 0,
    code: result.code,
    data: result.data,
    error: result.error
  }
}

/**
 * 启用/禁用计算功能
 */
export async function toggleCalculationUsage(
  baselineId: string,
  enabled: boolean
): Promise<{
  success: boolean
  code?: number
  data?: {
    baselineId: string
    isForCalculation: boolean
  }
  error?: string
}> {
  const result = await callCloudFunction('meal-set-baseline-manage', {
    action: 'toggleCalculationUsage',
    baselineId,
    enabled
  })
  return {
    success: result.success || result.code === 0,
    code: result.code,
    data: result.data,
    error: result.error
  }
}

/**
 * 获取一餐饭基准值详情
 */
export async function getMealSetBaselineDetail(
  baselineId: string
): Promise<{
  success: boolean
  data?: MealSetBaseline
  error?: string
}> {
  // 通过列表查询，使用baselineId作为关键词
  const result = await getMealSetBaselineList({
    keyword: baselineId,
    page: 1,
    pageSize: 1
  })
  if (result.success && result.data && result.data.length > 0) {
    const found = result.data.find(item => item.baselineId === baselineId)
    if (found) {
      return {
        success: true,
        data: found
      }
    }
  }
  return {
    success: false,
    error: '未找到该基准值'
  }
}

/**
 * 获取一餐饭基准值列表
 */
export async function getMealSetBaselineList(
  params: MealSetBaselineQueryParams
): Promise<{
  success: boolean
  data?: MealSetBaseline[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  error?: string
}> {
  const result = await callCloudFunction('meal-set-baseline-manage', {
    action: 'list',
    ...params
  })
  if (result.success || result.code === 0) {
    return {
      success: true,
      data: result.data || [],
      pagination: result.pagination
    }
  }
  return {
    success: false,
    error: result.error || '查询失败'
  }
}

/**
 * 批量导入一餐饭基准值
 */
export async function importMealSetBaselines(
  file: File | Blob
): Promise<MealSetBaselineImportResult> {
  // TODO: 实现批量导入功能
  // 可能需要使用云存储上传文件，然后调用导入云函数
  throw new Error('批量导入功能待实现')
}

