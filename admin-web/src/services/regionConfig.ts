import { callCloudFunction } from './cloudbase'

export interface RegionConfig {
  _id?: string
  configType: 'factor_region' | 'baseline_region'
  code: string
  name: string
  nameEn?: string
  country?: string
  countryName?: string
  parentCode?: string
  level: number
  status: 'active' | 'archived'
  sortOrder?: number
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface RegionConfigListParams {
  configType?: 'factor_region' | 'baseline_region'
  country?: string
  status?: 'active' | 'archived'
  parentCode?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export const regionConfigAPI = {
  /**
   * 获取区域配置列表
   */
  list: async (params?: RegionConfigListParams) => {
    return callCloudFunction('region-config-manage', {
      action: 'list',
      ...(params || {})
    })
  },

  /**
   * 获取单个区域配置详情
   */
  get: async (regionId: string) => {
    return callCloudFunction('region-config-manage', {
      action: 'get',
      regionId
    })
  },

  /**
   * 创建区域配置
   */
  create: async (region: Partial<RegionConfig>) => {
    return callCloudFunction('region-config-manage', {
      action: 'create',
      region
    })
  },

  /**
   * 更新区域配置
   */
  update: async (regionId: string, region: Partial<RegionConfig>) => {
    return callCloudFunction('region-config-manage', {
      action: 'update',
      regionId,
      region
    })
  },

  /**
   * 归档区域配置
   */
  archive: async (regionId: string) => {
    return callCloudFunction('region-config-manage', {
      action: 'archive',
      regionId
    })
  },

  /**
   * 激活区域配置
   */
  activate: async (regionId: string) => {
    return callCloudFunction('region-config-manage', {
      action: 'activate',
      regionId
    })
  }
}

