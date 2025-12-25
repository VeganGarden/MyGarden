/**
 * 食材类别类型定义
 */

export interface IngredientCategory {
  _id?: string
  categoryCode: string
  categoryName: string
  categoryNameEn?: string
  parentCategoryCode?: string | null
  level: number
  sortOrder: number
  mapping: {
    factorSubCategory: string
    keywords: string[]
  }
  description?: string
  status: 'active' | 'deprecated'
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface CategoryMapping {
  factorSubCategory: string
  keywords: string[]
}

