/**
 * 碳足迹基准值API服务
 */
import { callCloudFunction } from './cloudbase'
import type {
  CarbonBaseline,
  BaselineQueryParams,
  BaselineFormData,
  ImportResult,
} from '@/types/baseline'

/**
 * 基准值查询API
 */
export const baselineQueryAPI = {
  /**
   * 单条查询
   */
  query: async (params: {
    mealType: string
    region: string
    energyType: string
    city?: string
    restaurantType?: string
    date?: string
  }) => {
    const result = await callCloudFunction('carbon-baseline-query', params)
    if (result.code === 0 && result.data) {
      return {
        success: true,
        data: result.data,
      }
    }
    return {
      success: false,
      error: result.message || '查询失败',
    }
  },

  /**
   * 批量查询
   */
  batch: async (queries: Array<{
    mealType: string
    region: string
    energyType: string
    city?: string
    restaurantType?: string
  }>) => {
    const result = await callCloudFunction('carbon-baseline-query', {
      action: 'batch',
      queries,
    })
    if (result.code === 0 && result.data) {
      return {
        success: true,
        data: result.data,
        count: result.count || queries.length,
      }
    }
    return {
      success: false,
      error: result.message || '批量查询失败',
    }
  },
}

/**
 * 基准值管理API
 */
export const baselineManageAPI = {
  /**
   * 创建基准值
   */
  create: async (data: BaselineFormData) => {
    const result = await callCloudFunction('carbon-baseline-manage', {
      action: 'create',
      baseline: data,
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
        message: result.message || '创建成功',
      }
    }
    return {
      success: false,
      error: result.message || '创建失败',
    }
  },

  /**
   * 更新基准值
   */
  update: async (baselineId: string, data: Partial<BaselineFormData>, createNewVersion = false) => {
    const result = await callCloudFunction('carbon-baseline-manage', {
      action: 'update',
      baselineId,
      baseline: data,
      createNewVersion,
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
        message: result.message || '更新成功',
      }
    }
    return {
      success: false,
      error: result.message || '更新失败',
    }
  },

  /**
   * 归档基准值
   */
  archive: async (baselineId: string) => {
    const result = await callCloudFunction('carbon-baseline-manage', {
      action: 'archive',
      baselineId,
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '归档成功',
      }
    }
    return {
      success: false,
      error: result.message || '归档失败',
    }
  },

  /**
   * 激活基准值
   */
  activate: async (baselineId: string) => {
    const result = await callCloudFunction('carbon-baseline-manage', {
      action: 'activate',
      baselineId,
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '激活成功',
      }
    }
    return {
      success: false,
      error: result.message || '激活失败',
    }
  },

  /**
   * 获取基准值详情
   */
  get: async (baselineId: string) => {
    const result = await callCloudFunction('carbon-baseline-manage', {
      action: 'get',
      baselineId,
    })
    if (result.code === 0 && result.data) {
      return {
        success: true,
        data: result.data,
      }
    }
    return {
      success: false,
      error: result.message || '获取失败',
    }
  },

  /**
   * 获取基准值列表
   */
  list: async (params: BaselineQueryParams) => {
    try {
      const result = await callCloudFunction('carbon-baseline-manage', {
        action: 'list',
        ...params,
      })
      
      if (result && result.code === 0) {
        return {
          success: true,
          data: result.data || [],
          pagination: result.pagination || {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / (params.pageSize || 20)),
          },
        }
      }
      
      if (result && result.data) {
        return {
          success: true,
          data: Array.isArray(result.data) ? result.data : [],
          pagination: result.pagination || {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / (params.pageSize || 20)),
          },
        }
      }
      
      return {
        success: false,
        error: result?.message || result?.error || '获取列表失败',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误，请检查云函数是否已部署',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0,
        },
      }
    }
  },

  /**
   * 批量导入
   */
  batchImport: async (baselines: BaselineFormData[]): Promise<ImportResult> => {
    const result = await callCloudFunction('carbon-baseline-manage', {
      action: 'batchImport',
      baselines,
    })
    if (result.code === 0) {
      return {
        success: result.success || 0,
        failed: result.failed || 0,
        skipped: result.skipped || 0,
        errors: result.errors || [],
      }
    }
    return {
      success: 0,
      failed: baselines.length,
      skipped: 0,
      errors: [{ error: result.message || '批量导入失败' }],
    }
  },
}

/**
 * 基准值初始化API
 */
export const baselineInitAPI = {
  /**
   * 检查数据完整性
   */
  check: async () => {
    const result = await callCloudFunction('carbon-baseline-init', {
      action: 'check',
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result,
      }
    }
    return {
      success: false,
      error: result.message || '检查失败',
    }
  },
}

export default {
  query: baselineQueryAPI,
  manage: baselineManageAPI,
  init: baselineInitAPI,
}

