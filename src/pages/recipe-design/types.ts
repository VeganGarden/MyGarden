// 菜谱状态枚举
export enum RecipeStatus {
  DRAFT = 'draft',        // 草稿
  PUBLISHED = 'published', // 已发布
  ARCHIVED = 'archived'   // 已归档
}

// 渠道类型枚举
export enum ChannelType {
  DINE_IN = 'dine_in',      // 堂食
  TAKE_OUT = 'take_out',    // 外卖
  PROMOTION = 'promotion'   // 宣传物料
}

// 菜谱接口定义
export interface Recipe {
  _id?: string
  name: string
  description?: string
  category: string
  ingredients: RecipeIngredient[]
  cookingMethod: string
  carbonFootprint?: number  // 碳足迹 (kg CO₂e)
  carbonLabel?: string      // 碳标签 (low/medium/high)
  carbonScore?: number      // 碳评分 (0-100)
  status: RecipeStatus
  channels: ChannelType[]
  version: number
  tenantId?: string
  createdAt?: Date
  updatedAt?: Date
}

// 菜谱食材接口
export interface RecipeIngredient {
  ingredientId: string
  name: string
  quantity: number  // 重量 (克)
  unit: string      // 单位
  carbonCoefficient?: number  // 碳系数
}

