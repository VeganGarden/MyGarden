/**
 * 用户角色与权限类型定义
 * 用于气候餐厅平台管理后台
 */

// 角色枚举
export enum UserRole {
  RESTAURANT_ADMIN = 'restaurant_admin',      // 餐厅管理员
  PLATFORM_OPERATOR = 'platform_operator',    // 平台运营
  CARBON_SPECIALIST = 'carbon_specialist',    // 碳核算专员
  GOVERNMENT_PARTNER = 'government_partner',  // 政府/外部合作方
  SYSTEM_ADMIN = 'system_admin',              // 系统管理员
}

// 权限枚举
export enum Permission {
  // 餐厅认证
  CERTIFICATION_APPLY = 'certification:apply',
  CERTIFICATION_REVIEW = 'certification:review',
  CERTIFICATION_VIEW = 'certification:view',
  CERTIFICATION_MANAGE = 'certification:manage',
  
  // 碳足迹核算
  CARBON_VIEW = 'carbon:view',
  CARBON_MAINTAIN = 'carbon:maintain',
  CARBON_EXPORT = 'carbon:export',
  BASELINE_MANAGE = 'carbon:baseline:manage',
  
  // 供应链溯源
  TRACEABILITY_VIEW = 'traceability:view',
  TRACEABILITY_MANAGE = 'traceability:manage',
  
  // 餐厅运营
  OPERATION_VIEW = 'operation:view',
  OPERATION_MANAGE = 'operation:manage',
  
  // 报表与生态
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',
  ESG_REPORT = 'report:esg',
  API_ACCESS = 'report:api',
  
  // 菜谱管理
  RECIPE_VIEW = 'recipe:view',
  RECIPE_MANAGE = 'recipe:manage',
  
  // 平台管理
  PLATFORM_MANAGE = 'platform:manage',
  
  // 系统管理
  SYSTEM_MANAGE = 'system:manage',
  USER_MANAGE = 'system:user:manage',
  ROLE_MANAGE = 'system:role:manage',
}

// 角色名称映射
export const RoleNameMap: Record<UserRole, string> = {
  [UserRole.RESTAURANT_ADMIN]: '餐厅管理员',
  [UserRole.PLATFORM_OPERATOR]: '平台运营',
  [UserRole.CARBON_SPECIALIST]: '碳核算专员',
  [UserRole.GOVERNMENT_PARTNER]: '政府/外部合作方',
  [UserRole.SYSTEM_ADMIN]: '系统管理员',
}

// 权限名称映射
export const PermissionNameMap: Record<Permission, string> = {
  [Permission.CERTIFICATION_APPLY]: '认证申请',
  [Permission.CERTIFICATION_REVIEW]: '认证审核',
  [Permission.CERTIFICATION_VIEW]: '查看认证',
  [Permission.CERTIFICATION_MANAGE]: '管理认证',
  [Permission.CARBON_VIEW]: '查看碳数据',
  [Permission.CARBON_MAINTAIN]: '维护碳数据',
  [Permission.CARBON_EXPORT]: '导出碳数据',
  [Permission.BASELINE_MANAGE]: '管理基准值',
  [Permission.TRACEABILITY_VIEW]: '查看溯源',
  [Permission.TRACEABILITY_MANAGE]: '管理溯源',
  [Permission.OPERATION_VIEW]: '查看运营',
  [Permission.OPERATION_MANAGE]: '管理运营',
  [Permission.REPORT_VIEW]: '查看报表',
  [Permission.REPORT_EXPORT]: '导出报表',
  [Permission.ESG_REPORT]: 'ESG报告',
  [Permission.API_ACCESS]: 'API访问',
  [Permission.RECIPE_VIEW]: '查看菜谱',
  [Permission.RECIPE_MANAGE]: '管理菜谱',
  [Permission.PLATFORM_MANAGE]: '平台管理',
  [Permission.SYSTEM_MANAGE]: '系统管理',
  [Permission.USER_MANAGE]: '用户管理',
  [Permission.ROLE_MANAGE]: '角色管理',
}

// 用户信息接口
export interface AdminUser {
  id: string
  username: string
  name: string
  email?: string
  phone?: string
  role: UserRole
  roleName: string
  tenantId?: string | null
  restaurantIds?: string[]
  permissions: Permission[]
  status: 'active' | 'inactive' | 'suspended'
  lastLoginAt?: Date
}

// 角色配置接口
export interface RoleConfig {
  roleCode: UserRole
  roleName: string
  roleNameEn: string
  description: string
  permissions: Permission[]
  moduleAccess: Record<string, ModuleAccess>
}

// 模块访问配置接口
export interface ModuleAccess {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  scope: 'self' | 'tenant' | 'all'  // 数据范围
}

// 登录响应接口
export interface LoginResponse {
  token: string
  user: AdminUser
  expiresIn: number
}

