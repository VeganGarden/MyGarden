// 用户相关类型定义
export interface UserInfo {
  id: string
  nickName: string
  avatarUrl: string
  gardenCount: number
  createdAt: string
}

export interface LoginCredentials {
  username: string
  password: string
}

// 花园相关类型定义
export interface Garden {
  id: string
  name: string
  description: string
  plantCount: number
  createdDate: string
  carbonFootprint: number
  location?: string
  area?: number
}

export interface Plant {
  id: string
  name: string
  type: string
  gardenId: string
  plantingDate: string
  carbonAbsorption: number
  status: 'healthy' | 'needs_water' | 'needs_care'
  lastWatered: string
}

// 碳足迹相关类型定义
export interface CarbonRecord {
  id: string
  gardenId: string
  date: string
  carbonAmount: number
  source: string
  description: string
}

// API响应类型定义
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}