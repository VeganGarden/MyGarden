/**
 * 素食人员管理模块类型定义
 */

// 素食类型（员工）
export enum StaffVegetarianType {
  PURE = 'pure',              // 纯素
  OVO_LACTO = 'ovo_lacto',    // 蛋奶素
  FLEXIBLE = 'flexible',      // 弹性素
  OTHER = 'other'             // 其他
}

// 素食类型（客户）
export enum CustomerVegetarianType {
  REGULAR = 'regular',        // 常态素食
  OCCASIONAL = 'occasional',  // 偶尔素食
  OVO_LACTO = 'ovo_lacto',    // 蛋奶素
  PURE = 'pure',              // 纯素
  OTHER = 'other'             // 其他
}

// 素食年限
export enum VegetarianYears {
  LESS_THAN_1 = 'less_than_1',  // 1年以下
  YEAR_1_2 = '1_2',             // 1-2年
  YEAR_3_5 = '3_5',             // 3-5年
  YEAR_5_10 = '5_10',           // 5-10年
  MORE_THAN_10 = 'more_than_10' // 10年以上
}

// 素食原因
export enum VegetarianReason {
  HEALTH = 'health',          // 健康
  ENVIRONMENT = 'environment', // 环保
  FAITH = 'faith',            // 信仰
  OTHER = 'other'             // 其他
}

// 员工接口
export interface Staff {
  _id?: string
  staffId: string
  restaurantId: string
  tenantId: string
  basicInfo: {
    name: string
    position: string
    joinDate: Date | string
    phone?: string
    email?: string
  }
  vegetarianInfo: {
    isVegetarian: boolean
    vegetarianType: StaffVegetarianType | string
    vegetarianStartYear?: number
    vegetarianReason?: VegetarianReason | string
    notes?: string
  }
  createdBy?: string
  createdAt: Date | string
  updatedAt: Date | string
  isDeleted: boolean
  deletedAt?: Date | string
}

// 客户接口
export interface Customer {
  _id?: string
  customerId: string
  userId?: string
  restaurantId: string
  tenantId: string
  basicInfo: {
    nickname?: string
    avatar?: string
    phone?: string
  }
  vegetarianInfo: {
    isVegetarian: boolean
    vegetarianType: CustomerVegetarianType | string
    vegetarianYears: VegetarianYears | string
    vegetarianStartYear?: number
    firstRecordDate: Date | string
    lastUpdateDate: Date | string
  }
  consumptionStats: {
    totalOrders: number
    totalAmount: number
    firstOrderDate?: Date | string
    lastOrderDate?: Date | string
    averageOrderAmount: number
  }
  history?: Array<{
    vegetarianInfo: any
    updatedAt: Date | string
    updatedBy: string
  }>
  createdAt: Date | string
  updatedAt: Date | string
  isDeleted: boolean
  deletedAt?: Date | string
}

// 员工表单数据
export interface StaffFormData {
  restaurantId: string
  tenantId?: string
  basicInfo: {
    name: string
    position: string
    joinDate: Date | string
    phone?: string
    email?: string
  }
  vegetarianInfo: {
    isVegetarian: boolean
    vegetarianType?: StaffVegetarianType | string
    vegetarianStartYear?: number
    vegetarianReason?: VegetarianReason | string
    notes?: string
  }
}

// 客户表单数据
export interface CustomerFormData {
  restaurantId: string
  tenantId?: string
  userId?: string
  basicInfo?: {
    nickname?: string
    avatar?: string
    phone?: string
  }
  vegetarianInfo: {
    isVegetarian: boolean
    vegetarianType: CustomerVegetarianType | string
    vegetarianYears: VegetarianYears | string
    vegetarianStartYear?: number
  }
}

// 员工查询参数
export interface StaffQueryParams {
  restaurantId?: string
  tenantId?: string
  page?: number
  pageSize?: number
  filters?: {
    isVegetarian?: boolean
    vegetarianType?: string
    position?: string
  }
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 客户查询参数
export interface CustomerQueryParams {
  restaurantId?: string
  tenantId?: string
  page?: number
  pageSize?: number
  filters?: {
    isVegetarian?: boolean
    vegetarianType?: string
    vegetarianYears?: string
  }
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 员工统计数据
export interface StaffStats {
  totalStaff: number
  vegetarianStaff: number
  vegetarianRatio: number
  vegetarianTypeDistribution: {
    pure: number
    ovo_lacto: number
    flexible: number
    other: number
  }
  averageVegetarianYears: number
}

// 客户统计数据
export interface CustomerStats {
  totalCustomers: number
  vegetarianCustomers: number
  vegetarianRatio: number
  vegetarianTypeDistribution: {
    regular: number
    occasional: number
    ovo_lacto: number
    pure: number
    other: number
  }
  vegetarianYearsDistribution: {
    less_than_1: number
    '1_2': number
    '3_5': number
    '5_10': number
    more_than_10: number
  }
  newCustomers: number
  newVegetarianCustomers: number
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

