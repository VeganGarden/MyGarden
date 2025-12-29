/**
 * V2版本减碳计算模块
 * 基于年限增长系数的科学计算模型
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { getConfigValue, getVegetarianCoefficient, getYearsGrowthCoefficient } = require('./config-manager')

/**
 * 根据年限范围估算天数（用于客户）
 * @param {string} vegetarianYears - 年限范围字符串
 * @returns {number} 估算的天数
 */
function estimateDaysFromYearRange(vegetarianYears) {
  const yearRangeMap = {
    'less_than_1': 180,      // 约6个月
    '1_2': 547.5,            // 约1.5年（(1+2)/2 * 365）
    '3_5': 1460,            // 约4年（(3+5)/2 * 365）
    '5_10': 2737.5,         // 约7.5年（(5+10)/2 * 365）
    'more_than_10': 5475    // 约15年（假设10年以上平均为15年）
  }
  
  return yearRangeMap[vegetarianYears] || 365 // 默认1年
}

/**
 * 计算素食天数和年限（公共函数）
 * @param {Object} vegetarianInfo - 素食信息对象
 * @param {Function} getDefaultYears - 获取默认年限的异步函数
 * @returns {Promise<{vegetarianDays: number, vegetarianYears: number}>}
 */
async function calculateVegetarianDaysAndYears(vegetarianInfo, getDefaultYears) {
  let vegetarianDays = 0
  let vegetarianYears = 0
  
  if (vegetarianInfo?.vegetarianStartDate) {
    // 优先使用精确日期
    const startDate = new Date(vegetarianInfo.vegetarianStartDate)
    const now = new Date()
    vegetarianDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
    vegetarianYears = vegetarianDays / 365
  } else if (vegetarianInfo?.vegetarianStartYear) {
    // 使用年份（年初）
    const startDate = new Date(vegetarianInfo.vegetarianStartYear, 0, 1)
    const now = new Date()
    vegetarianDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
    vegetarianYears = vegetarianDays / 365
  } else if (vegetarianInfo?.vegetarianYears) {
    // 使用年限范围估算（仅客户）
    vegetarianDays = estimateDaysFromYearRange(vegetarianInfo.vegetarianYears)
    vegetarianYears = vegetarianDays / 365
  } else {
    // 默认值
    const defaultYears = await getDefaultYears()
    vegetarianYears = defaultYears
    vegetarianDays = defaultYears * 365
  }
  
  // 确保天数不为负数
  if (vegetarianDays < 0) {
    vegetarianDays = 0
    vegetarianYears = 0
  }
  
  return { vegetarianDays, vegetarianYears }
}

/**
 * 计算员工减碳量（V2版本）
 * @param {Object} staff - 员工对象
 * @returns {Promise<Object>} 减碳计算结果
 */
async function calculateStaffCarbonReductionV2(staff) {
  try {
    // 1. 获取基础减碳量（kg CO₂e/天/人）
    const baseDailyReduction = await getConfigValue('base_daily_reduction', 2.0)
    
    // 2. 获取素食类型系数
    const vegetarianType = staff.vegetarianInfo?.vegetarianType || 'other'
    const typeCoefficient = await getVegetarianCoefficient(vegetarianType)
    
    // 3. 计算素食天数和年限
    const { vegetarianDays, vegetarianYears } = await calculateVegetarianDaysAndYears(
      staff.vegetarianInfo,
      () => getConfigValue('default_vegetarian_years', 1)
    )
    
    // 4. 获取年限增长系数（年限越长，系数越大）
    const yearsGrowthCoefficient = await getYearsGrowthCoefficient(vegetarianYears)
    
    // 5. 计算日均减碳量（考虑年限增长系数）
    const dailyReduction = baseDailyReduction * typeCoefficient * yearsGrowthCoefficient
    
    // 6. 计算总减碳量
    const totalReduction = dailyReduction * vegetarianDays
    
    return {
      baseDailyReduction,
      typeCoefficient,
      yearsGrowthCoefficient,
      dailyReduction,
      vegetarianDays,
      vegetarianYears,
      totalReduction
    }
  } catch (error) {
    console.error('计算员工减碳量失败:', error)
    throw error
  }
}

/**
 * 计算客户减碳量（V2版本）
 * @param {Object} customer - 客户对象
 * @returns {Promise<Object>} 减碳计算结果
 */
async function calculateCustomerCarbonReductionV2(customer) {
  try {
    // 1. 获取基础减碳量
    const baseDailyReduction = await getConfigValue('base_daily_reduction', 2.0)
    
    // 2. 获取素食类型系数
    const vegetarianType = customer.vegetarianInfo?.vegetarianType || 'other'
    const typeCoefficient = await getVegetarianCoefficient(vegetarianType)
    
    // 3. 计算素食天数和年限
    const { vegetarianDays, vegetarianYears } = await calculateVegetarianDaysAndYears(
      customer.vegetarianInfo,
      () => getConfigValue('default_vegetarian_years', 1)
    )
    
    // 4. 获取年限增长系数
    const yearsGrowthCoefficient = await getYearsGrowthCoefficient(vegetarianYears)
    
    // 5. 客户素食频率调整（可选）
    let frequencyFactor = 1.0
    if (customer.vegetarianInfo?.vegetarianFrequency) {
      const frequencyFactors = {
        'daily': 1.0,
        'weekly': 0.5,
        'occasional': 0.3
      }
      frequencyFactor = frequencyFactors[customer.vegetarianInfo.vegetarianFrequency] || 1.0
    }
    
    // 6. 计算日均减碳量（考虑年限增长系数和频率）
    const dailyReduction = baseDailyReduction * typeCoefficient * yearsGrowthCoefficient * frequencyFactor
    
    // 7. 计算总减碳量
    const totalReduction = dailyReduction * vegetarianDays
    
    return {
      baseDailyReduction,
      typeCoefficient,
      yearsGrowthCoefficient,
      frequencyFactor,
      dailyReduction,
      vegetarianDays,
      vegetarianYears,
      totalReduction
    }
  } catch (error) {
    console.error('计算客户减碳量失败:', error)
    throw error
  }
}

/**
 * 计算等效对比值（不使用标准饮食对比）
 * @param {number} totalReduction - 总减碳量（kg CO₂e）
 * @returns {Promise<Object>} 等效对比结果
 */
async function calculateEquivalentComparison(totalReduction) {
  try {
    // 等效对比参数
    const treeAbsorption = await getConfigValue('equivalent_tree_absorption', 18) // 每棵树年吸收 CO₂ 量（kg）
    const electricityEmission = await getConfigValue('equivalent_electricity_emission', 0.5) // 每度电产生 CO₂ 量（kg）
    
    // 相当于种植树木数量（年吸收量）
    const equivalentTrees = totalReduction / treeAbsorption
    
    // 相当于节省电力度数
    const equivalentElectricity = totalReduction / electricityEmission
    
    // 相当于减少汽车行驶里程（每km约0.2kg CO₂）
    const equivalentCarKm = totalReduction / 0.2
    
    return {
      totalReduction,
      equivalentTrees,
      equivalentElectricity,
      equivalentCarKm
    }
  } catch (error) {
    console.error('计算等效对比失败:', error)
    throw error
  }
}

/**
 * 分析年限增长效果（使用已计算的减碳数据）
 * @param {Array} staffList - 员工列表
 * @param {Array} customerList - 客户列表
 * @param {Array} staffDetails - 员工减碳计算详情（包含 vegetarianYears 和 totalReduction）
 * @param {Array} customerDetails - 客户减碳计算详情（包含 vegetarianYears 和 totalReduction）
 * @returns {Promise<Object>} 年限增长效果分析
 */
async function analyzeYearsGrowthEffectWithDetails(staffList, customerList, staffDetails, customerDetails) {
  // 按年限分组统计
  const yearGroups = {
    '0-1年': { count: 0, totalReduction: 0, averageDailyReduction: 0, persons: [] },
    '1-3年': { count: 0, totalReduction: 0, averageDailyReduction: 0, persons: [] },
    '3-5年': { count: 0, totalReduction: 0, averageDailyReduction: 0, persons: [] },
    '5-10年': { count: 0, totalReduction: 0, averageDailyReduction: 0, persons: [] },
    '10年以上': { count: 0, totalReduction: 0, averageDailyReduction: 0, persons: [] }
  }
  
  // 辅助函数：根据年限确定分组
  function getYearGroup(vegetarianYears) {
    if (vegetarianYears < 1) return '0-1年'
    if (vegetarianYears < 3) return '1-3年'
    if (vegetarianYears < 5) return '3-5年'
    if (vegetarianYears < 10) return '5-10年'
    return '10年以上'
  }
  
  // 处理员工数据
  if (staffDetails && Array.isArray(staffDetails)) {
    for (const detail of staffDetails) {
      const vegetarianYears = detail.vegetarianYears || 0
      const group = getYearGroup(vegetarianYears)
      yearGroups[group].count++
      yearGroups[group].totalReduction += detail.totalReduction || 0
      yearGroups[group].persons.push({
        type: 'staff',
        id: detail.staffId,
        name: detail.name || '',
        years: vegetarianYears,
        reduction: detail.totalReduction || 0
      })
    }
  }
  
  // 处理客户数据
  if (customerDetails && Array.isArray(customerDetails)) {
    for (const detail of customerDetails) {
      const vegetarianYears = detail.vegetarianYears || 0
      const group = getYearGroup(vegetarianYears)
      yearGroups[group].count++
      yearGroups[group].totalReduction += detail.totalReduction || 0
      yearGroups[group].persons.push({
        type: 'customer',
        id: detail.customerId,
        name: detail.nickname || '',
        years: vegetarianYears,
        reduction: detail.totalReduction || 0
      })
    }
  }
  
  // 计算平均日均减碳量
  for (const groupKey in yearGroups) {
    const group = yearGroups[groupKey]
    if (group.count > 0) {
      group.averageDailyReduction = Math.round((group.totalReduction / group.count / 365) * 100) / 100
      group.totalReduction = Math.round(group.totalReduction * 100) / 100
    }
  }
  
  const totalPersons = Object.values(yearGroups).reduce((sum, group) => sum + group.count, 0)
  
  return {
    yearGroups,
    totalPersons,
    insights: [
      '素食年限越长，单位时间减碳效果越好',
      '10年以上素食者的减碳效果是1年以下素食者的2.5倍',
      '建议鼓励长期素食，以获得更好的减碳效果'
    ]
  }
}

module.exports = {
  calculateStaffCarbonReductionV2,
  calculateCustomerCarbonReductionV2,
  calculateEquivalentComparison,
  analyzeYearsGrowthEffectWithDetails,
  estimateDaysFromYearRange,
  calculateVegetarianDaysAndYears
}

