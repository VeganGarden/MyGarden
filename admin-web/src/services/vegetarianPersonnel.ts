/**
 * 素食人员管理 API 服务
 */

import { callCloudFunction } from './cloudbase'
import type {
  Staff,
  Customer,
  StaffFormData,
  CustomerFormData,
  StaffQueryParams,
  CustomerQueryParams,
  StaffStats,
  CustomerStats,
  PaginatedResponse
} from '@/types/vegetarianPersonnel'

/**
 * 员工管理 API
 */
export const staffAPI = {
  /**
   * 创建员工
   */
  create: async (data: StaffFormData) => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'createStaff',
        data
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误'
      }
    }
  },

  /**
   * 更新员工
   */
  update: async (staffId: string, data: Partial<StaffFormData>) => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'updateStaff',
        data: {
          staffId,
          ...data
        }
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误'
      }
    }
  },

  /**
   * 查询员工列表
   */
  list: async (params: StaffQueryParams): Promise<{ success: boolean; data?: PaginatedResponse<Staff>; error?: string }> => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'listStaff',
        data: params
      })
      if (result.code === 0) {
        return {
          success: true,
          data: result.data
        }
      }
      return {
        success: false,
        error: result.message || '查询失败',
        data: { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误',
        data: { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
      }
    }
  },

  /**
   * 删除员工
   */
  delete: async (staffId: string) => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'deleteStaff',
        data: { staffId }
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误'
      }
    }
  },

  /**
   * 获取员工统计
   */
  getStats: async (params: { restaurantId?: string; tenantId?: string; startDate?: Date; endDate?: Date }): Promise<{ success: boolean; data?: StaffStats; error?: string }> => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'getStaffStats',
        data: params
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误'
      }
    }
  }
}

/**
 * 客户管理 API
 */
export const customerAPI = {
  /**
   * 创建或更新客户
   */
  createOrUpdate: async (data: CustomerFormData) => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'createOrUpdateCustomer',
        data
      })
      if (result.code === 0) {
        return {
          success: true,
          data: result.data,
          message: result.message || '操作成功'
        }
      }
      return {
        success: false,
        error: result.message || '操作失败'
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误'
      }
    }
  },

  /**
   * 获取客户信息
   */
  get: async (customerId: string, restaurantId?: string) => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'getCustomerInfo',
        data: { customerId, restaurantId }
      })
      if (result.code === 0) {
        return {
          success: true,
          data: result.data as Customer
        }
      }
      return {
        success: false,
        error: result.message || '查询失败'
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误'
      }
    }
  },

  /**
   * 查询客户列表
   */
  list: async (params: CustomerQueryParams): Promise<{ success: boolean; data?: PaginatedResponse<Customer>; error?: string }> => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'listCustomers',
        data: params
      })
      if (result.code === 0) {
        return {
          success: true,
          data: result.data
        }
      }
      return {
        success: false,
        error: result.message || '查询失败',
        data: { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误',
        data: { list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
      }
    }
  },

  /**
   * 获取客户统计
   */
  getStats: async (params: { restaurantId?: string; tenantId?: string; startDate?: Date; endDate?: Date }): Promise<{ success: boolean; data?: CustomerStats; error?: string }> => {
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'getCustomerStats',
        data: params
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络错误'
      }
    }
  }
}

/**
 * 素食人员统计 API
 */
export const vegetarianPersonnelStatsAPI = {
  /**
   * 获取员工统计
   */
  getStaffStats: async (params: { restaurantId?: string; tenantId?: string; startDate?: Date; endDate?: Date }) => {
    return staffAPI.getStats(params)
  },

  /**
   * 获取客户统计
   */
  getCustomerStats: async (params: { restaurantId?: string; tenantId?: string; startDate?: Date; endDate?: Date }) => {
    return customerAPI.getStats(params)
  }
}

export default {
  staffAPI,
  customerAPI,
  vegetarianPersonnelStatsAPI
}

