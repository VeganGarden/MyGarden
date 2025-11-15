// 菜谱相关类型
export enum RecipeStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ChannelType {
  DINE_IN = 'dine_in',
  TAKE_OUT = 'take_out',
  PROMOTION = 'promotion',
}

export interface RecipeIngredient {
  ingredientId: string
  name: string
  quantity: number
  unit: string
  carbonCoefficient?: number
}

export interface Recipe {
  _id?: string
  name: string
  description?: string
  category: string
  cookingMethod: string
  ingredients: RecipeIngredient[]
  carbonFootprint?: number
  carbonLabel?: 'ultra_low' | 'low' | 'medium' | 'high'
  carbonScore?: number
  status: RecipeStatus
  channels: ChannelType[]
  version: number
  tenantId?: string
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

// 食材相关类型
export interface Ingredient {
  _id: string
  name: string
  nameEn?: string
  category: string
  carbonCoefficient?: number
  carbonFootprint?: number
  unit?: string
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number
  message?: string
  data?: T
  error?: string
}

// 分页类型
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

