/**
 * 供应链溯源系统 API 服务
 */

import { callCloudFunction } from './cloudbase'
import type {
  Supplier,
  IngredientLot,
  TraceChain,
  SupplierQueryParams,
  IngredientLotQueryParams,
  TraceChainQueryParams,
  SupplierFormData,
  IngredientLotFormData,
  TraceChainFormData,
  PaginatedResponse
} from '@/types/traceability'

/**
 * 供应商管理 API
 */
export const supplierAPI = {
  /**
   * 创建供应商
   */
  create: async (data: SupplierFormData & { tenantId: string; createdBy?: string }) => {
    const result = await callCloudFunction('supplier-manage', {
      action: 'create',
      supplier: data
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
        message: result.message || '创建成功'
      }
    }
    return {
      success: false,
      error: result.message || '创建失败'
    }
  },

  /**
   * 查询供应商列表
   */
  list: async (params: SupplierQueryParams): Promise<PaginatedResponse<Supplier> & { success: boolean; error?: string }> => {
    try {
      const result = await callCloudFunction('supplier-manage', {
        action: 'list',
        ...params
      })
      if (result && result.code === 0) {
        return {
          success: true,
          data: result.data || [],
          pagination: result.pagination || {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / (params.pageSize || 20))
          }
        }
      }
      return {
        success: false,
        error: result?.message || '查询失败',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0
        }
      }
    } catch (error: any) {
      console.error('调用 supplier-manage 云函数失败:', error)
      return {
        success: false,
        error: error.message || '网络错误',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0
        }
      }
    }
  },

  /**
   * 获取供应商详情
   */
  get: async (supplierId: string, tenantId: string) => {
    const result = await callCloudFunction('supplier-manage', {
      action: 'get',
      supplierId,
      tenantId
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data as Supplier
      }
    }
    return {
      success: false,
      error: result.message || '查询失败'
    }
  },

  /**
   * 更新供应商
   */
  update: async (supplierId: string, tenantId: string, data: Partial<SupplierFormData>) => {
    const result = await callCloudFunction('supplier-manage', {
      action: 'update',
      supplierId,
      tenantId,
      supplier: data
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '更新成功'
      }
    }
    return {
      success: false,
      error: result.message || '更新失败'
    }
  },

  /**
   * 审核供应商
   */
  audit: async (supplierId: string, tenantId: string, auditData: {
    status: 'approved' | 'rejected'
    reviewedBy: string
    reviewComments?: string
  }) => {
    const result = await callCloudFunction('supplier-manage', {
      action: 'audit',
      supplierId,
      tenantId,
      audit: auditData
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '审核成功'
      }
    }
    return {
      success: false,
      error: result.message || '审核失败'
    }
  },

  /**
   * 删除供应商
   */
  delete: async (supplierId: string, tenantId: string) => {
    const result = await callCloudFunction('supplier-manage', {
      action: 'delete',
      supplierId,
      tenantId
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '删除成功'
      }
    }
    return {
      success: false,
      error: result.message || '删除失败'
    }
  }
}

/**
 * 食材批次管理 API
 */
export const ingredientLotAPI = {
  /**
   * 创建食材批次
   */
  create: async (data: IngredientLotFormData & { tenantId: string; createdBy?: string }) => {
    const result = await callCloudFunction('ingredient-lot-manage', {
      action: 'create',
      lot: data
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
        message: result.message || '创建成功'
      }
    }
    return {
      success: false,
      error: result.message || '创建失败'
    }
  },

  /**
   * 查询批次列表
   */
  list: async (params: IngredientLotQueryParams): Promise<PaginatedResponse<IngredientLot> & { success: boolean; error?: string }> => {
    try {
      const result = await callCloudFunction('ingredient-lot-manage', {
        action: 'list',
        ...params
      })
      
      // 检查返回结果格式
      if (result && result.code === 0) {
        return {
          success: true,
          data: result.data || [],
          pagination: result.pagination || {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / (params.pageSize || 20))
          }
        }
      }
      
      // 如果返回格式不对，尝试从 result.result 中获取
      if (result && result.result && result.result.code === 0) {
        return {
          success: true,
          data: result.result.data || [],
          pagination: result.result.pagination || {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: result.result.total || 0,
            totalPages: Math.ceil((result.result.total || 0) / (params.pageSize || 20))
          }
        }
      }
      
      return {
        success: false,
        error: result?.message || result?.result?.message || '查询失败',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0
        }
      }
    } catch (error: any) {
      console.error('调用 ingredient-lot-manage 云函数失败:', error)
      return {
        success: false,
        error: error.message || '网络错误',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0
        }
      }
    }
  },

  /**
   * 获取批次详情
   */
  get: async (lotId: string, tenantId: string) => {
    const result = await callCloudFunction('ingredient-lot-manage', {
      action: 'get',
      lotId,
      tenantId
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data as IngredientLot
      }
    }
    return {
      success: false,
      error: result.message || '查询失败'
    }
  },

  /**
   * 更新批次
   */
  update: async (lotId: string, tenantId: string, data: Partial<IngredientLotFormData>) => {
    const result = await callCloudFunction('ingredient-lot-manage', {
      action: 'update',
      lotId,
      tenantId,
      lot: data
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '更新成功'
      }
    }
    return {
      success: false,
      error: result.message || '更新失败'
    }
  },

  /**
   * 更新库存
   */
  updateInventory: async (lotId: string, tenantId: string, inventoryData: {
    restaurantId: string
    quantity: number
    operation: 'in' | 'out' | 'use'
    menuItemId?: string
    menuItemName?: string
    orderId?: string
  }) => {
    const result = await callCloudFunction('ingredient-lot-manage', {
      action: 'updateInventory',
      lotId,
      tenantId,
      inventory: inventoryData
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
        message: result.message || '库存更新成功'
      }
    }
    return {
      success: false,
      error: result.message || '库存更新失败'
    }
  },

  /**
   * 删除批次
   */
  delete: async (lotId: string, tenantId: string) => {
    const result = await callCloudFunction('ingredient-lot-manage', {
      action: 'delete',
      lotId,
      tenantId
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '删除成功'
      }
    }
    return {
      success: false,
      error: result.message || '删除失败'
    }
  }
}

/**
 * 溯源链管理 API
 */
export const traceChainAPI = {
  /**
   * 构建溯源链
   */
  build: async (data: TraceChainFormData & { tenantId: string; createdBy?: string }) => {
    const result = await callCloudFunction('trace-chain-build', {
      action: 'build',
      traceChain: data
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
        message: result.message || '构建成功'
      }
    }
    return {
      success: false,
      error: result.message || '构建失败'
    }
  },

  /**
   * 验证溯源链
   */
  verify: async (traceId: string, tenantId: string, verificationData: {
    verificationResult: 'verified' | 'rejected'
    verifiedBy: string
    comments?: string
  }) => {
    const result = await callCloudFunction('trace-chain-build', {
      action: 'verify',
      traceId,
      tenantId,
      verification: verificationData
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '验证成功'
      }
    }
    return {
      success: false,
      error: result.message || '验证失败'
    }
  },

  /**
   * 更新溯源链
   */
  update: async (traceId: string, tenantId: string, data: Partial<TraceChainFormData>) => {
    const result = await callCloudFunction('trace-chain-build', {
      action: 'update',
      traceId,
      tenantId,
      traceChain: data
    })
    if (result.code === 0) {
      return {
        success: true,
        message: result.message || '更新成功'
      }
    }
    return {
      success: false,
      error: result.message || '更新失败'
    }
  },

  /**
   * 查询溯源链列表
   */
  list: async (params: TraceChainQueryParams): Promise<PaginatedResponse<TraceChain> & { success: boolean; error?: string }> => {
    try {
      const result = await callCloudFunction('trace-chain-query', {
        action: 'list',
        ...params
      })
      if (result && result.code === 0) {
        return {
          success: true,
          data: result.data || [],
          pagination: result.pagination || {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / (params.pageSize || 20))
          }
        }
      }
      return {
        success: false,
        error: result?.message || '查询失败',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0
        }
      }
    }
  },

  /**
   * 查询溯源链详情
   */
  get: async (traceId: string, tenantId: string) => {
    const result = await callCloudFunction('trace-chain-query', {
      action: 'get',
      traceId,
      tenantId
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data
      }
    }
    return {
      success: false,
      error: result.message || '查询失败'
    }
  },

  /**
   * 通过菜品查询溯源链
   */
  queryByMenuItem: async (menuItemId: string, tenantId: string, date?: Date | string) => {
    const result = await callCloudFunction('trace-chain-query', {
      action: 'queryByMenuItem',
      menuItemId,
      tenantId,
      date: date ? (typeof date === 'string' ? date : date.toISOString()) : undefined
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data
      }
    }
    return {
      success: false,
      error: result.message || '查询失败'
    }
  },

  /**
   * 生成分享链接
   */
  generateShare: async (traceId: string, tenantId: string) => {
    const result = await callCloudFunction('trace-chain-query', {
      action: 'generateShare',
      traceId,
      tenantId
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data
      }
    }
    return {
      success: false,
      error: result.message || '生成失败'
    }
  }
}

/**
 * 溯源证书 API
 */
export const traceCertificateAPI = {
  /**
   * 生成证书
   */
  generate: async (traceId: string, tenantId: string, templateId?: string, format: 'pdf' | 'image' = 'pdf') => {
    const result = await callCloudFunction('trace-certificate', {
      action: 'generate',
      traceId,
      tenantId,
      templateId,
      format
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
        message: result.message || '生成成功'
      }
    }
    return {
      success: false,
      error: result.message || '生成失败'
    }
  },

  /**
   * 查询证书
   */
  get: async (certificateId: string, tenantId: string) => {
    const result = await callCloudFunction('trace-certificate', {
      action: 'get',
      certificateId,
      tenantId
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data
      }
    }
    return {
      success: false,
      error: result.message || '查询失败'
    }
  },

  /**
   * 查询证书列表
   */
  list: async (params: {
    tenantId: string
    page?: number
    pageSize?: number
    status?: string
    keyword?: string
    traceId?: string
  }): Promise<PaginatedResponse<any> & { success: boolean; error?: string }> => {
    try {
      const result = await callCloudFunction('trace-certificate', {
        action: 'list',
        ...params
      })
      
      // 检查返回结果格式
      if (result && result.code === 0) {
        return {
          success: true,
          data: result.data || [],
          pagination: result.pagination || {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: result.total || 0,
            totalPages: Math.ceil((result.total || 0) / (params.pageSize || 20))
          }
        }
      }
      
      // 如果返回格式不对，尝试从 result.result 中获取
      if (result && result.result && result.result.code === 0) {
        return {
          success: true,
          data: result.result.data || [],
          pagination: result.result.pagination || {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: result.result.total || 0,
            totalPages: Math.ceil((result.result.total || 0) / (params.pageSize || 20))
          }
        }
      }
      
      return {
        success: false,
        error: result?.message || result?.result?.message || '查询失败',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0
        }
      }
    } catch (error: any) {
      console.error('调用 trace-certificate 云函数失败:', error)
      return {
        success: false,
        error: error.message || '网络错误',
        data: [],
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total: 0,
          totalPages: 0
        }
      }
    }
  },

  /**
   * 通过编号查询证书
   */
  queryByNumber: async (certificateNumber: string) => {
    const result = await callCloudFunction('trace-certificate', {
      action: 'queryByNumber',
      certificateNumber
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data
      }
    }
    return {
      success: false,
      error: result.message || '查询失败'
    }
  }
}

