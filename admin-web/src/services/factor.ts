/**
 * 碳排放因子API服务
 */
import { callCloudFunction } from './cloudbase'
import type {
  CarbonEmissionFactor,
  FactorQueryParams,
  FactorFormData,
  FactorImportResult,
} from '@/types/factor'

/**
 * 因子管理API
 */
export const factorManageAPI = {
  /**
   * 创建因子
   */
  create: async (data: FactorFormData) => {
    const result = await callCloudFunction('carbon-factor-manage', {
      action: 'create',
      factor: data,
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
   * 更新因子
   */
  update: async (factorId: string, data: Partial<FactorFormData>) => {
    const result = await callCloudFunction('carbon-factor-manage', {
      action: 'update',
      factorId,
      factor: data,
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
   * 归档因子
   */
  archive: async (factorId: string) => {
    const result = await callCloudFunction('carbon-factor-manage', {
      action: 'archive',
      factorId,
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
   * 激活因子
   */
  activate: async (factorId: string) => {
    const result = await callCloudFunction('carbon-factor-manage', {
      action: 'activate',
      factorId,
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
   * 获取因子详情
   */
  get: async (factorId: string) => {
    const result = await callCloudFunction('carbon-factor-manage', {
      action: 'get',
      factorId,
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
   * 获取因子列表
   */
  list: async (params: FactorQueryParams) => {
    try {
      const result = await callCloudFunction('carbon-factor-manage', {
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
  batchImport: async (factors: FactorFormData[]): Promise<FactorImportResult> => {
    const result = await callCloudFunction('carbon-factor-manage', {
      action: 'batchImport',
      factors,
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
      failed: factors.length,
      skipped: 0,
      errors: [{ error: result.message || '批量导入失败' }],
    }
  },
}

export default {
  manage: factorManageAPI,
}

