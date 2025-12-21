/**
 * 菜单项统一类型定义
 */

export interface MenuItem {
  _id?: string
  id: string
  name: string
  description?: string
  price?: number
  category?: string
  status?: string
  isAvailable?: boolean
  baseRecipeId?: string
  restaurantId: string
  mealType?: 'meat_simple' | 'meat_full'
  energyType?: 'electric' | 'gas' | 'mixed'
  calculationLevel?: 'L1' | 'L2' | 'L3'
  cookingMethod?: string
  cookingTime?: number
  restaurantRegion?: string  // 基准值区域代码（如 'east_china'）
  factorRegion?: string  // 因子区域代码（如 'CN'）
  ingredients?: any[]
  carbonFootprint?: number | CarbonFootprintData
  carbonLabel?: 'ultra_low' | 'low' | 'medium' | 'high'
  carbonScore?: number
  baselineInfo?: BaselineInfo
  factorMatchInfo?: FactorMatchInfo[]
  calculationDetails?: CalculationDetails
}

export interface CarbonFootprintData {
  value: number
  baseline: number
  reduction: number
  breakdown?: {
    ingredients: number
    energy: number
    packaging: number
    transport: number
  }
}

export interface BaselineInfo {
  baselineId: string | null
  version: string | null
  source: string | null
}

export interface FactorMatchInfo {
  ingredientName: string
  matchedFactor?: {
    factorId: string
    factorValue: number
    matchLevel: string
    source: string
    year: number
  }
}

export interface CalculationDetails {
  ingredients: Array<{
    ingredientName: string
    category?: string
    quantity: number
    unit: string
    weightInKg: number
    wasteRate?: number
    factor?: {
      value: number
      unit: string
      matchLevel?: string
      source?: string
    } | null
    carbonFootprint: number
    calculation?: {
      formula: string
      values: {
        EF: number
        M: number
        W: number
        result: number
      }
    }
    warning?: string
  }>
  energy?: {
    method?: string
    time?: number
    energyType?: string
    carbonFootprint: number
  }
  packaging?: {
    carbonFootprint: number
  }
  transport?: {
    carbonFootprint: number
  }
  total: number
}

