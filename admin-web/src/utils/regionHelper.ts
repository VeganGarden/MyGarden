/**
 * 区域辅助工具
 * 从区域配置中获取区域显示名称
 */

import { regionConfigAPI, type RegionConfig } from '@/services/regionConfig'

// 区域配置缓存（避免重复查询）
let regionConfigCache: Map<string, RegionConfig> | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * 加载区域配置到缓存
 */
async function loadRegionConfigs(): Promise<Map<string, RegionConfig>> {
  const now = Date.now()
  
  // 如果缓存有效，直接返回
  if (regionConfigCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return regionConfigCache
  }
  
  try {
    // 加载所有激活的区域配置
    const factorRegions = await regionConfigAPI.list({
      configType: 'factor_region',
      status: 'active',
      pageSize: 100
    })
    
    const baselineRegions = await regionConfigAPI.list({
      configType: 'baseline_region',
      status: 'active',
      pageSize: 100
    })
    
    const cache = new Map<string, RegionConfig>()
    
    // 缓存因子区域
    // 云函数返回的 data 是数组，不是 { list: [...] }
    const factorRegionsList = Array.isArray(factorRegions.data) 
      ? factorRegions.data 
      : factorRegions.data?.list || []
    
    factorRegionsList.forEach((region: RegionConfig) => {
      if (region && region.code) {
        cache.set(region.code, region)
      }
    })
    
    // 缓存基准值区域
    const baselineRegionsList = Array.isArray(baselineRegions.data) 
      ? baselineRegions.data 
      : baselineRegions.data?.list || []
    
    baselineRegionsList.forEach((region: RegionConfig) => {
      if (region && region.code) {
        cache.set(region.code, region)
      }
    })
    
    regionConfigCache = cache
    cacheTimestamp = now
    
    return cache
  } catch (error) {
    console.error('加载区域配置失败:', error)
    return new Map()
  }
}

/**
 * 获取区域显示名称
 * @param regionCode 区域代码（如 'CN', 'US', 'north_china' 等）
 * @param configType 区域类型（'factor_region' 或 'baseline_region'），如果不指定则自动判断
 * @returns 区域显示名称，如果找不到则返回原代码
 */
export async function getRegionDisplayName(
  regionCode: string | undefined | null,
  configType?: 'factor_region' | 'baseline_region'
): Promise<string> {
  if (!regionCode) {
    return '-'
  }
  
  const cache = await loadRegionConfigs()
  const region = cache.get(regionCode)
  
  if (region) {
    return region.name
  }
  
  // 如果找不到，返回原代码
  return regionCode
}

/**
 * 同步版本：获取区域显示名称（使用缓存）
 * 注意：区域配置缓存会在应用启动时预加载，因此通常可以直接使用
 * @param regionCode 区域代码
 * @returns 区域显示名称，如果缓存未加载则返回原代码
 */
export function getRegionDisplayNameSync(regionCode: string | undefined | null): string {
  if (!regionCode) {
    return '-'
  }
  
  if (regionConfigCache) {
    const region = regionConfigCache.get(regionCode)
    if (region) {
      return region.name
    }
  }
  
  // 如果缓存未加载，返回原代码
  return regionCode
}

/**
 * 验证区域代码是否有效
 * @param regionCode 区域代码
 * @param configType 区域类型
 * @returns 是否有效
 */
export async function isValidRegionCode(
  regionCode: string,
  configType?: 'factor_region' | 'baseline_region'
): Promise<boolean> {
  const cache = await loadRegionConfigs()
  const region = cache.get(regionCode)
  
  if (!region) {
    return false
  }
  
  if (configType && region.configType !== configType) {
    return false
  }
  
  return region.status === 'active'
}

/**
 * 清除区域配置缓存（用于强制刷新）
 */
export function clearRegionConfigCache(): void {
  regionConfigCache = null
  cacheTimestamp = 0
}

