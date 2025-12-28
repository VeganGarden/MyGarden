/**
 * 菜谱分类常量定义
 * 用于统一管理平台基础菜谱分类体系
 */

/**
 * 菜谱分类选项
 */
export interface RecipeCategory {
  value: string
  label: string
}

/**
 * 标准菜谱分类列表
 */
export const RECIPE_CATEGORIES: RecipeCategory[] = [
  { value: 'hot', label: '热菜' },
  { value: 'cold', label: '凉菜' },
  { value: 'soup', label: '汤品' },
  { value: 'staple', label: '主食' },
  { value: 'dessert', label: '甜品' },
  { value: 'drink', label: '饮品' },
  { value: 'asian_fusion', label: '亚洲融合' },
  { value: 'western', label: '西式' },
  { value: 'other', label: '其他' },
]

/**
 * 基础分类列表（不包含扩展分类）
 * 用于基础菜谱筛选等场景
 */
export const BASE_RECIPE_CATEGORIES: RecipeCategory[] = [
  { value: 'hot', label: '热菜' },
  { value: 'cold', label: '凉菜' },
  { value: 'soup', label: '汤品' },
  { value: 'staple', label: '主食' },
  { value: 'dessert', label: '甜品' },
  { value: 'drink', label: '饮品' },
]

/**
 * 分类值到标签的映射
 */
export const RECIPE_CATEGORY_MAP: Record<string, string> = RECIPE_CATEGORIES.reduce(
  (map, category) => {
    map[category.value] = category.label
    return map
  },
  {} as Record<string, string>
)

/**
 * 根据分类值获取标签
 * @param category 分类值
 * @param defaultValue 默认值，当分类不存在时返回
 * @returns 分类标签
 */
export function getRecipeCategoryLabel(category?: string, defaultValue: string = '-'): string {
  if (!category) return defaultValue
  return RECIPE_CATEGORY_MAP[category] || category || defaultValue
}

/**
 * 获取所有分类值
 */
export function getRecipeCategoryValues(): string[] {
  return RECIPE_CATEGORIES.map(cat => cat.value)
}

/**
 * 获取基础分类值
 */
export function getBaseRecipeCategoryValues(): string[] {
  return BASE_RECIPE_CATEGORIES.map(cat => cat.value)
}

