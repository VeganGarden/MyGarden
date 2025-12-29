/**
 * 素食人员管理 V2 版本类型定义
 */

/**
 * V2版本员工减碳计算结果
 */
export interface StaffCarbonReductionV2 {
  baseDailyReduction: number        // 基础减碳量
  typeCoefficient: number           // 类型系数
  yearsGrowthCoefficient: number    // 年限增长系数
  dailyReduction: number            // 日均减碳量
  vegetarianDays: number            // 素食天数
  vegetarianYears: number           // 素食年限
  totalReduction: number            // 总减碳量
}

/**
 * V2版本客户减碳计算结果
 */
export interface CustomerCarbonReductionV2 {
  baseDailyReduction: number        // 基础减碳量
  typeCoefficient: number           // 类型系数
  yearsGrowthCoefficient: number    // 年限增长系数
  frequencyFactor: number           // 频率系数
  dailyReduction: number            // 日均减碳量
  vegetarianDays: number            // 素食天数
  vegetarianYears: number           // 素食年限
  totalReduction: number            // 总减碳量
}

/**
 * V2版本员工减碳效应
 */
export interface StaffCarbonEffectV2 {
  baseDailyReduction: number
  typeCoefficient: number
  yearsGrowthCoefficient: number
  dailyReduction: number
  vegetarianDays: number
  vegetarianYears: number
  totalReduction: number
  count: number
  averageReduction: number
  description: string
  details: Array<{
    staffId: string
    name: string
    baseDailyReduction: number
    typeCoefficient: number
    yearsGrowthCoefficient: number
    dailyReduction: number
    vegetarianDays: number
    vegetarianYears: number
    totalReduction: number
  }>
}

/**
 * V2版本客户减碳效应
 */
export interface CustomerCarbonEffectV2 {
  baseDailyReduction: number
  typeCoefficient: number
  yearsGrowthCoefficient: number
  frequencyFactor: number
  dailyReduction: number
  vegetarianDays: number
  vegetarianYears: number
  totalReduction: number
  count: number
  averageReduction: number
  description: string
  details: Array<{
    customerId: string
    nickname: string
    baseDailyReduction: number
    typeCoefficient: number
    yearsGrowthCoefficient: number
    frequencyFactor: number
    dailyReduction: number
    vegetarianDays: number
    vegetarianYears: number
    totalReduction: number
  }>
}

/**
 * 等效对比结果
 */
export interface EquivalentComparison {
  totalReduction: number
  equivalentTrees: number          // 相当于种植树木数量
  equivalentElectricity: number    // 相当于节省电力度数
  equivalentCarKm: number          // 相当于减少汽车行驶里程（km）
}

/**
 * 年限增长效果分析
 */
export interface YearsGrowthAnalysis {
  yearGroups: {
    '0-1年': {
      count: number
      totalReduction: number
      averageReduction?: number
      persons: Array<{
        type: 'staff' | 'customer'
        id: string
        name: string
        years: number
        reduction: number
      }>
    }
    '1-3年': {
      count: number
      totalReduction: number
      averageReduction?: number
      persons: Array<{
        type: 'staff' | 'customer'
        id: string
        name: string
        years: number
        reduction: number
      }>
    }
    '3-5年': {
      count: number
      totalReduction: number
      averageReduction?: number
      persons: Array<{
        type: 'staff' | 'customer'
        id: string
        name: string
        years: number
        reduction: number
      }>
    }
    '5-10年': {
      count: number
      totalReduction: number
      averageReduction?: number
      persons: Array<{
        type: 'staff' | 'customer'
        id: string
        name: string
        years: number
        reduction: number
      }>
    }
    '10年以上': {
      count: number
      totalReduction: number
      averageReduction?: number
      persons: Array<{
        type: 'staff' | 'customer'
        id: string
        name: string
        years: number
        reduction: number
      }>
    }
  }
  insights: string[]
}

/**
 * V2版本减碳效应分析结果
 */
export interface CarbonEffectAnalysisV2 {
  staffCarbonEffect: StaffCarbonEffectV2
  customerCarbonEffect: CustomerCarbonEffectV2
  totalCarbonEffect: number
  equivalentComparison: EquivalentComparison
  yearsGrowthAnalysis: YearsGrowthAnalysis
  report: string  // JSON字符串
  calculationDetails: {
    staffDetails: Array<StaffCarbonReductionV2 & { staffId: string; name: string }>
    customerDetails: Array<CustomerCarbonReductionV2 & { customerId: string; nickname: string }>
  }
}

/**
 * 新旧计算对比结果
 */
export interface CalculationComparison {
  v1: {
    totalCarbonEffect: number
    staffCarbonEffect: number
    customerCarbonEffect: number
  }
  v2: {
    totalCarbonEffect: number
    staffCarbonEffect: number
    customerCarbonEffect: number
  }
  difference: {
    totalCarbonEffect: number
    staffCarbonEffect: number
    customerCarbonEffect: number
    percentage: {
      totalCarbonEffect: number
      staffCarbonEffect: number
      customerCarbonEffect: number
    }
  }
}

