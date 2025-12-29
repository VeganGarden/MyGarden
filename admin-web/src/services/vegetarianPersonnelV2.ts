/**
 * 素食人员管理 API 服务 V2版本
 */

import type {
  CarbonEffectAnalysisV2,
  CustomerCarbonReductionV2,
  StaffCarbonReductionV2,
  YearsGrowthAnalysis
} from '@/types/vegetarianPersonnelV2';
import { callCloudFunction } from './cloudbase';

/**
 * V2版本减碳效应分析 API
 */
export const vegetarianPersonnelV2API = {
  /**
   * 获取V2版本减碳效应分析
   */
  getCarbonEffectAnalysisV2: async (
    tenantId?: string,
    restaurantId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ success: boolean; data?: CarbonEffectAnalysisV2; error?: string }> => {
    try {
      const result = await callCloudFunction('vegetarian-personnel-v2', {
        action: 'getCarbonEffectAnalysisV2',
        data: { tenantId, restaurantId, startDate, endDate }
      })
      if (result.code === 0) {
        return {
          success: true,
          data: result.data as CarbonEffectAnalysisV2
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
   * 获取员工减碳计算（V2版本）
   */
  getStaffCarbonReductionV2: async (
    tenantId?: string,
    restaurantId?: string,
    staffId?: string
  ): Promise<{ success: boolean; data?: { calculations: Array<StaffCarbonReductionV2 & { staffId: string; name: string }>; total: number }; error?: string }> => {
    try {
      const result = await callCloudFunction('vegetarian-personnel-v2', {
        action: 'getStaffCarbonReductionV2',
        data: { tenantId, restaurantId, staffId }
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
  },

  /**
   * 获取客户减碳计算（V2版本）
   */
  getCustomerCarbonReductionV2: async (
    tenantId?: string,
    restaurantId?: string,
    customerId?: string
  ): Promise<{ success: boolean; data?: { calculations: Array<CustomerCarbonReductionV2 & { customerId: string; nickname: string }>; total: number }; error?: string }> => {
    try {
      const result = await callCloudFunction('vegetarian-personnel-v2', {
        action: 'getCustomerCarbonReductionV2',
        data: { tenantId, restaurantId, customerId }
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
  },

  /**
   * 获取年限增长效果分析
   */
  getYearsGrowthAnalysis: async (
    tenantId?: string,
    restaurantId?: string
  ): Promise<{ success: boolean; data?: YearsGrowthAnalysis; error?: string }> => {
    try {
      const result = await callCloudFunction('vegetarian-personnel-v2', {
        action: 'getYearsGrowthAnalysis',
        data: { tenantId, restaurantId }
      })
      if (result.code === 0) {
        return {
          success: true,
          data: result.data as YearsGrowthAnalysis
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

export default vegetarianPersonnelV2API

