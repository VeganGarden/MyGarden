/**
 * 一餐饭基准值相关类型定义
 */

// 复用现有的基础类型
import { Region, EnergyType, SourceType, BaselineStatus, BaselineSource } from './baseline'

// 餐次类型
export enum MealTime {
  BREAKFAST = 'breakfast',  // 早餐
  LUNCH = 'lunch',          // 午餐
  DINNER = 'dinner'         // 晚餐
}

// 一餐饭结构类型
export enum MealStructure {
  SIMPLE = 'simple',        // 简餐
  STANDARD = 'standard',    // 标准餐
  FULL = 'full',            // 正餐
  BANQUET = 'banquet'       // 宴席
}

// 是否有汤
export enum HasSoup {
  WITH_SOUP = 'with_soup',
  WITHOUT_SOUP = 'without_soup',
  OPTIONAL = 'optional'     // 可选
}

// 餐厅类型
export enum RestaurantType {
  FAST_FOOD = 'fast_food',   // 快餐店
  FORMAL = 'formal',         // 正餐厅
  BUFFET = 'buffet',         // 自助餐
  HOTPOT = 'hotpot',         // 火锅店
  OTHER = 'other'            // 其他
}

// 消费场景
export enum ConsumptionScenario {
  DINE_IN = 'dine_in',      // 堂食
  TAKEAWAY = 'takeaway',    // 外卖
  PACKAGED = 'packaged'     // 打包
}

// 季节类型
export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter',
  ALL_YEAR = 'all_year'     // 全年适用
}

// 人均消费水平
export enum ConsumptionLevel {
  LOW = 'low',              // 低
  MEDIUM = 'medium',        // 中
  HIGH = 'high'             // 高
}

// 研究状态
export enum ResearchStatus {
  RESEARCHING = 'researching',  // 研究中
  COMPLETED = 'completed',      // 已完成
  VALIDATED = 'validated'       // 已验证
}

// 一餐饭基准值分类信息（包含所有可能维度）
export interface MealSetBaselineCategory {
  // 核心维度（必填）
  mealTime: MealTime                    // 餐次类型（必填）
  region: Region                        // 区域（必填）
  energyType: EnergyType                // 用能方式（必填）
  
  // 扩展维度（可选，但建议填写以提高数据可信度）
  mealStructure?: MealStructure         // 一餐饭结构类型（可选）
  hasSoup?: HasSoup                     // 是否有汤（可选，默认根据区域判断）
  restaurantType?: RestaurantType       // 餐厅类型（可选）
  consumptionScenario?: ConsumptionScenario  // 消费场景（可选）
  city?: string                         // 城市（可选，用于进一步细分）
  season?: Season                       // 季节（可选）
  consumptionLevel?: ConsumptionLevel   // 人均消费水平（可选）
}

// 一餐饭基准值分解数据（更详细）
export interface MealSetBreakdown {
  // 主要组成部分
  mainDishes: number          // 主菜碳排放（kg CO₂e）
  stapleFood: number          // 主食碳排放（kg CO₂e）
  soup: number                // 汤类碳排放（kg CO₂e）
  dessert: number             // 甜点碳排放（kg CO₂e）
  beverage: number            // 饮品碳排放（kg CO₂e）
  
  // 其他组成部分
  sideDishes: number          // 配菜碳排放（kg CO₂e）
  condiments: number          // 调料碳排放（kg CO₂e）
  
  // 加工环节
  cookingEnergy: number       // 烹饪能耗碳排放（kg CO₂e）
  packaging: number           // 包装碳排放（kg CO₂e）
  transport: number           // 运输碳排放（kg CO₂e，外卖场景）
  other: number               // 其他碳排放（kg CO₂e）
}

// 碳足迹数据
export interface CarbonFootprint {
  value: number             // 总基准值（kg CO₂e）
  uncertainty: number       // 不确定性（±kg CO₂e）
  confidenceInterval: {
    lower: number
    upper: number
  }
  unit: 'kg CO₂e'
}

// 一餐饭典型结构描述
export interface TypicalStructure {
  mainDishesCount: number   // 主菜数量
  stapleFoodType: string    // 主食类型（米饭/面食等）
  hasSoup: boolean          // 是否有汤
  hasDessert: boolean       // 是否有甜点
  totalItems: number        // 总菜品数量
  description: string       // 结构描述（如："2道主菜+米饭+汤"）
}

// 观察期信息
export interface ObservationPeriod {
  startDate: Date | string            // 观察期开始时间
  endDate?: Date | string             // 观察期结束时间（如果已完成观察）
  notes: string                       // 观察期说明
}

// 使用说明
export interface UsageInfo {
  isForCalculation: boolean           // 是否用于计算（默认false，仅参考）
  enabledAt?: Date | string           // 启用计算的时间（当isForCalculation=true时）
  enabledBy?: string                  // 启用计算的操作人
  notes: string                       // 使用说明
  researchStatus: ResearchStatus      // 研究状态
  observationPeriod?: ObservationPeriod  // 观察期信息
}

// 完整的一餐饭基准值数据结构
export interface MealSetBaseline {
  _id?: string
  baselineId: string                  // 唯一标识，包含所有维度
  
  // 分类信息（包含所有可能维度）
  category: MealSetBaselineCategory
  
  // 基准值数据
  carbonFootprint: CarbonFootprint
  
  // 分解数据（更详细的一餐饭结构）
  breakdown: MealSetBreakdown
  
  // 一餐饭典型结构描述（用于展示和参考）
  typicalStructure: TypicalStructure
  
  // 数据来源
  source: BaselineSource
  
  // 版本管理
  version: string
  effectiveDate: Date | string
  expiryDate: Date | string
  status: BaselineStatus
  
  // 使用说明（重要：默认不用于计算）
  usage: UsageInfo
  
  // 元数据
  createdAt?: Date | string
  updatedAt?: Date | string
  createdBy?: string
  updatedBy?: string
  notes?: string
  
  // 使用统计
  usageCount?: number
  lastUsedAt?: Date | string
}

// 查询参数
export interface MealSetBaselineQueryParams {
  mealTime?: MealTime
  region?: Region
  energyType?: EnergyType
  mealStructure?: MealStructure
  hasSoup?: HasSoup
  restaurantType?: RestaurantType
  consumptionScenario?: ConsumptionScenario
  city?: string
  season?: Season
  consumptionLevel?: ConsumptionLevel
  status?: BaselineStatus
  version?: string
  keyword?: string
  page?: number
  pageSize?: number
}

// 创建/更新一餐饭基准值表单数据
export interface MealSetBaselineFormData {
  category: {
    mealTime: MealTime
    region: Region
    energyType: EnergyType
    mealStructure?: MealStructure
    hasSoup?: HasSoup
    restaurantType?: RestaurantType
    consumptionScenario?: ConsumptionScenario
    city?: string
    season?: Season
    consumptionLevel?: ConsumptionLevel
  }
  carbonFootprint: {
    value: number
    uncertainty: number
    confidenceInterval?: {
      lower: number
      upper: number
    }
  }
  breakdown: {
    mainDishes: number
    stapleFood: number
    soup: number
    dessert: number
    beverage: number
    sideDishes: number
    condiments: number
    cookingEnergy: number
    packaging: number
    transport: number
    other: number
  }
  typicalStructure: {
    mainDishesCount: number
    stapleFoodType: string
    hasSoup: boolean
    hasDessert: boolean
    totalItems: number
    description: string
  }
  source: {
    type: SourceType
    organization: string
    report: string
    year: number
    methodology: string
  }
  version: string
  effectiveDate: string
  expiryDate: string
  usage: {
    isForCalculation: boolean
    notes: string
    researchStatus: ResearchStatus
    observationPeriod?: {
      startDate: string
      endDate?: string
      notes: string
    }
  }
  notes?: string
}

// 批量导入结果
export interface MealSetBaselineImportResult {
  success: number
  failed: number
  skipped: number
  errors: Array<{
    baselineId?: string
    error: string
  }>
}

