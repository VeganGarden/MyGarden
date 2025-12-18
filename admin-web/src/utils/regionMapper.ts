/**
 * 区域映射工具
 * 用于将旧格式的区域代码转换为新格式（统一使用基准值格式）
 */

import { Region } from '@/types/baseline'

/**
 * 区域映射表：旧格式 -> 新格式
 */
const REGION_MAPPING: Record<string, string> = {
  // 旧格式（因子库）
  'CN': Region.NATIONAL_AVERAGE,
  'CN-East': Region.EAST_CHINA,
  'CN-North': Region.NORTH_CHINA,
  'CN-South': Region.SOUTH_CHINA,
  'CN-West': Region.NORTHWEST,
  'Global': Region.NATIONAL_AVERAGE, // 全球映射到全国平均
  
  // 新格式（基准值格式，保持不变）
  [Region.NATIONAL_AVERAGE]: Region.NATIONAL_AVERAGE,
  [Region.NORTH_CHINA]: Region.NORTH_CHINA,
  [Region.NORTHEAST]: Region.NORTHEAST,
  [Region.EAST_CHINA]: Region.EAST_CHINA,
  [Region.CENTRAL_CHINA]: Region.CENTRAL_CHINA,
  [Region.NORTHWEST]: Region.NORTHWEST,
  [Region.SOUTH_CHINA]: Region.SOUTH_CHINA,
}

/**
 * 将区域代码转换为统一格式（基准值格式）
 * @param region 区域代码（可能是旧格式或新格式）
 * @returns 统一后的区域代码
 */
export function normalizeRegion(region: string | undefined | null): string {
  if (!region) {
    return Region.NATIONAL_AVERAGE
  }
  
  // 如果已经是新格式，直接返回
  if (REGION_MAPPING[region] === region) {
    return region
  }
  
  // 映射旧格式到新格式
  return REGION_MAPPING[region] || Region.NATIONAL_AVERAGE
}

/**
 * 获取区域显示名称
 */
export function getRegionDisplayName(region: string): string {
  const regionNames: Record<string, string> = {
    [Region.NATIONAL_AVERAGE]: '全国平均',
    [Region.NORTH_CHINA]: '华北区域',
    [Region.NORTHEAST]: '东北区域',
    [Region.EAST_CHINA]: '华东区域',
    [Region.CENTRAL_CHINA]: '华中区域',
    [Region.NORTHWEST]: '西北区域',
    [Region.SOUTH_CHINA]: '南方区域',
  }
  
  return regionNames[region] || region
}

/**
 * 检查区域代码是否有效
 */
export function isValidRegion(region: string): boolean {
  return Object.values(Region).includes(region as Region)
}

