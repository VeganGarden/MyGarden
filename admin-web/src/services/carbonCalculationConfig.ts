/**
 * 碳足迹计算配置管理 API
 */
import { callCloudFunction } from './cloudbase'

export interface CarbonCalculationConfig {
  _id?: string
  configKey: string
  configType: 'waste_rate' | 'energy_factor' | 'cooking_time' | 'cooking_power' | 'packaging'
  category: string
  value: number
  unit: string
  description?: string
  source?: string
  version?: string
  status: 'active' | 'archived'
  createdAt?: Date
  updatedAt?: Date
}

export interface ConfigGroup {
  configKey: string
  configType: string
  description: string
  items: CarbonCalculationConfig[]
}

export interface ListConfigsParams {
  configType?: string
  configKey?: string
  category?: string
  status?: 'active' | 'archived'
  page?: number
  pageSize?: number
}

export interface UpdateConfigParams {
  id?: string
  configKey?: string
  category?: string
  value?: number
  description?: string
  source?: string
  version?: string
}

export interface BatchUpdateConfigParams {
  updates: UpdateConfigParams[]
}

export const carbonCalculationConfigAPI = {
  /**
   * 查询配置列表
   */
  list: async (params: ListConfigsParams = {}) => {
    return callCloudFunction('platform-config-manage', {
      action: 'calculation.list',
      ...params
    })
  },

  /**
   * 获取单个配置详情
   */
  get: async (params: { id?: string; configKey?: string; category?: string }) => {
    return callCloudFunction('platform-config-manage', {
      action: 'calculation.get',
      ...params
    })
  },

  /**
   * 更新单个配置
   */
  update: async (params: UpdateConfigParams) => {
    return callCloudFunction('platform-config-manage', {
      action: 'calculation.update',
      ...params
    })
  },

  /**
   * 批量更新配置
   */
  batchUpdate: async (params: BatchUpdateConfigParams) => {
    return callCloudFunction('platform-config-manage', {
      action: 'calculation.batchUpdate',
      ...params
    })
  },

  /**
   * 获取所有配置分组
   */
  getGroups: async () => {
    return callCloudFunction('platform-config-manage', {
      action: 'calculation.getGroups'
    })
  }
}

