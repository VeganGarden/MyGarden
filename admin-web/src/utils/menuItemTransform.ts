/**
 * 菜单项数据转换工具函数
 */
import type { MenuItem, CarbonFootprintData } from '@/types/menuItem'

/**
 * 转换API返回的菜单项数据为统一格式
 */
export function transformMenuItemData(data: any): MenuItem {
  // 处理碳足迹数据
  let carbonFootprint: number | CarbonFootprintData | undefined
  if (data.carbonFootprint !== undefined && data.carbonFootprint !== null) {
    if (typeof data.carbonFootprint === 'number') {
      carbonFootprint = data.carbonFootprint
    } else if (typeof data.carbonFootprint === 'object') {
      carbonFootprint = {
        value: data.carbonFootprint.value ?? 0,
        baseline: data.carbonFootprint.baseline ?? 0,
        reduction: data.carbonFootprint.reduction ?? 0,
        breakdown: data.carbonFootprint.breakdown,
      }
    }
  }

  // 处理食材列表
  let ingredients: any[] = []
  if (Array.isArray(data.ingredients)) {
    ingredients = data.ingredients
  } else if (data.ingredients) {
    // 如果是字符串，尝试解析
    try {
      ingredients = typeof data.ingredients === 'string' ? JSON.parse(data.ingredients) : [data.ingredients]
    } catch {
      ingredients = []
    }
  }

  return {
    _id: data._id,
    id: data.id || data._id || '',
    name: data.name || data.dishName || '',
    description: data.description,
    price: data.price,
    category: data.category,
    status: data.status || 'draft',
    isAvailable: data.isAvailable !== false,
    baseRecipeId: data.baseRecipeId,
    restaurantId: data.restaurantId || '',
    // 以下字段如果缺失，使用缺省值（用于向后兼容旧数据）
    mealType: data.mealType || 'meat_simple',
    energyType: data.energyType || 'electric',
    // calculationLevel 和 restaurantRegion 允许为空
    calculationLevel: data.calculationLevel !== undefined && data.calculationLevel !== null ? data.calculationLevel : undefined,
    cookingMethod: data.cookingMethod,
    cookingTime: data.cookingTime,
    restaurantRegion: data.restaurantRegion !== undefined && data.restaurantRegion !== null ? data.restaurantRegion : undefined,
    ingredients,
    carbonFootprint,
    carbonLabel: data.carbonLabel || data.carbonLevel,
    carbonScore: data.carbonScore,
    baselineInfo: data.baselineInfo,
    factorMatchInfo: data.factorMatchInfo,
  }
}

/**
 * 批量转换菜单项数据
 */
export function transformMenuItemList(dataList: any[]): MenuItem[] {
  return dataList.map(transformMenuItemData)
}

/**
 * 获取碳足迹值（统一处理number和object类型）
 */
export function getCarbonFootprintValue(carbonFootprint?: number | CarbonFootprintData): number | null {
  if (carbonFootprint === undefined || carbonFootprint === null) {
    return null
  }
  if (typeof carbonFootprint === 'number') {
    return carbonFootprint
  }
  return carbonFootprint.value ?? null
}

/**
 * 格式化碳足迹值显示
 */
export function formatCarbonFootprintValue(value: number | null | undefined, unit: string = 'kg CO₂e', includeUnit: boolean = true): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '-'
  }
  const formattedValue = Number(value).toFixed(2)
  return includeUnit ? `${formattedValue} ${unit}` : formattedValue
}

