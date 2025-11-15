/**
 * 碳足迹基准值相关类型定义
 */

// 餐食类型
export enum MealType {
  MEAT_SIMPLE = 'meat_simple', // 肉食简餐
  MEAT_FULL = 'meat_full',     // 肉食正餐
}

// 地区类型
export enum Region {
  NORTH_CHINA = 'north_china',     // 华北区域
  NORTHEAST = 'northeast',         // 东北区域
  EAST_CHINA = 'east_china',       // 华东区域
  CENTRAL_CHINA = 'central_china', // 华中区域
  NORTHWEST = 'northwest',         // 西北区域
  SOUTH_CHINA = 'south_china',      // 南方区域
  NATIONAL_AVERAGE = 'national_average', // 全国平均
}

// 用能方式
export enum EnergyType {
  ELECTRIC = 'electric', // 全电厨房
  GAS = 'gas',           // 燃气厨房
  MIXED = 'mixed',       // 混合用能
}

// 数据来源类型
export enum SourceType {
  INDUSTRY_STATISTICS = 'industry_statistics', // 行业统计
  ACADEMIC_RESEARCH = 'academic_research',     // 学术研究
  THIRD_PARTY = 'third_party',                 // 第三方机构
  ESTIMATION = 'estimation',                    // 估算
}

// 状态类型
export enum BaselineStatus {
  ACTIVE = 'active',     // 活跃
  ARCHIVED = 'archived', // 已归档
  DRAFT = 'draft',       // 草稿
}

// 分类信息
export interface BaselineCategory {
  mealType: MealType
  region: Region
  energyType: EnergyType
  city?: string
  restaurantType?: string
}

// 碳足迹数据
export interface CarbonFootprint {
  value: number
  uncertainty: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  unit: 'kg CO₂e'
}

// 分解数据
export interface Breakdown {
  ingredients: number      // 食材
  cookingEnergy: number    // 烹饪能耗
  packaging: number         // 包装
  other: number            // 其他
}

// 数据来源
export interface BaselineSource {
  type: SourceType
  organization: string
  report: string
  year: number
  methodology: string
}

// 基准值完整数据结构
export interface CarbonBaseline {
  _id?: string
  baselineId: string
  category: BaselineCategory
  carbonFootprint: CarbonFootprint
  breakdown: Breakdown
  source: BaselineSource
  version: string
  effectiveDate: Date | string
  expiryDate: Date | string
  status: BaselineStatus
  notes?: string
  usageCount?: number
  lastUsedAt?: Date | string
  createdAt?: Date | string
  updatedAt?: Date | string
  createdBy?: string
  updatedBy?: string
}

// 查询参数
export interface BaselineQueryParams {
  mealType?: MealType
  region?: Region
  energyType?: EnergyType
  city?: string
  restaurantType?: string
  status?: BaselineStatus
  version?: string
  keyword?: string
  page?: number
  pageSize?: number
}

// 创建/更新基准值表单数据
export interface BaselineFormData {
  category: {
    mealType: MealType
    region: Region
    energyType: EnergyType
    city?: string
    restaurantType?: string
  }
  carbonFootprint: {
    value: number
    uncertainty: number
    confidenceInterval?: {
      lower: number
      upper: number
    }
  }
  breakdown: {
    ingredients: number
    cookingEnergy: number
    packaging: number
    other: number
  }
  source: {
    type: SourceType
    organization: string
    report: string
    year: number
    methodology: string
  }
  version: string
  effectiveDate: string
  expiryDate: string
  notes?: string
}

// 批量导入结果
export interface ImportResult {
  success: number
  failed: number
  skipped: number
  errors: Array<{
    baselineId?: string
    error: string
  }>
}

