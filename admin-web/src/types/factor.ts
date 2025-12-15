/**
 * 碳排放因子相关类型定义
 */

// 因子分类
export enum FactorCategory {
  INGREDIENT = 'ingredient', // 食材
  ENERGY = 'energy',         // 能源
  MATERIAL = 'material',     // 材料
  TRANSPORT = 'transport',   // 运输
}

// 数据来源
export enum FactorSource {
  CLCD = 'CLCD',           // 中国生命周期基础数据库
  IPCC = 'IPCC',           // 政府间气候变化专门委员会
  CPCD = 'CPCD',           // 中国产品碳足迹数据库
  ECOINVENT = 'Ecoinvent', // Ecoinvent数据库
}

// 边界定义
export enum FactorBoundary {
  CRADLE_TO_GATE = 'cradle-to-gate',   // 从摇篮到大门
  CRADLE_TO_FARM = 'cradle-to-farm',   // 从摇篮到农场
}

// 状态类型
export enum FactorStatus {
  ACTIVE = 'active',     // 活跃
  ARCHIVED = 'archived', // 已归档
  DRAFT = 'draft',       // 草稿
}

// 碳排放因子完整数据结构
export interface CarbonEmissionFactor {
  _id?: string
  factorId: string                 // 唯一标识，如 "ef_beef_cn_2024"
  name: string                     // 标准名称，如 "去骨牛肉"
  alias: string[]                  // 别名/搜索关键词，如 ["牛肉", "黄牛肉", "beef"]
  category: FactorCategory         // 一级分类
  subCategory: string              // 二级分类，如 "meat", "grain", "electricity"
  factorValue: number              // 排放因子数值，如 27.5
  unit: string                     // 单位，如 "kgCO2e/kg", "kgCO2e/kWh"
  uncertainty?: number             // 不确定性百分比 (±%)
  region: string                   // 适用区域代码，如 "CN", "CN-East", "Global"
  source: FactorSource             // 数据来源库
  year: number                     // 数据年份/发布年份
  version: string                  // 版本号，如 "v3.0.1"
  boundary: FactorBoundary         // LCA边界定义
  status: FactorStatus             // 状态
  notes?: string                   // 备注
  createdAt?: Date | string
  updatedAt?: Date | string
  createdBy?: string
  updatedBy?: string
}

// 查询参数
export interface FactorQueryParams {
  category?: FactorCategory
  subCategory?: string
  source?: FactorSource
  year?: number
  region?: string
  status?: FactorStatus
  keyword?: string
  page?: number
  pageSize?: number
}

// 创建/更新因子表单数据
export interface FactorFormData {
  name: string
  alias: string[]
  category: FactorCategory
  subCategory: string
  factorValue: number
  unit: string
  uncertainty?: number
  region: string
  source: FactorSource
  year: number
  version: string
  boundary: FactorBoundary
  status: FactorStatus
  notes?: string
}

// 批量导入结果
export interface FactorImportResult {
  success: number
  failed: number
  skipped: number
  errors: Array<{
    factorId?: string
    error: string
  }>
}

