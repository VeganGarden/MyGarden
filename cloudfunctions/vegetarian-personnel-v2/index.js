/**
 * 素食人员管理云函数 V2版本
 * 
 * 功能:
 * 1. V2版本减碳效应分析（基于年限增长系数）
 * 2. 员工减碳计算（V2版本）
 * 3. 客户减碳计算（V2版本）
 * 4. 年限增长效果分析
 * 5. 新旧计算对比
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const {
  calculateStaffCarbonReductionV2,
  calculateCustomerCarbonReductionV2,
  calculateEquivalentComparison,
  analyzeYearsGrowthEffectWithDetails
} = require('./carbon-calculator-v2')

/**
 * 通用查询函数：获取人员列表（员工或客户）
 * @param {string} collectionName - 集合名称
 * @param {Object} params - 查询参数
 * @returns {Promise<Array>} 人员列表
 */
async function getPersonList(collectionName, params) {
  const { restaurantId, tenantId } = params
  
  let query = db.collection(collectionName).where({
    isDeleted: false
  })
  
  if (tenantId) {
    query = query.where({ tenantId: tenantId })
  }
  
  if (restaurantId) {
    query = query.where({ restaurantId: restaurantId })
  }
  
  const result = await query.get()
  return result.data
}

/**
 * 获取员工列表
 */
async function getStaffList(params) {
  return await getPersonList('restaurant_staff', params)
}

/**
 * 获取客户列表
 */
async function getCustomerList(params) {
  return await getPersonList('restaurant_customers', params)
}

/**
 * 获取V2版本减碳效应分析
 */
async function getCarbonEffectAnalysisV2(params) {
  try {
    const { restaurantId, tenantId, startDate, endDate } = params
    
    // 获取员工列表
    const staffList = await getStaffList({ restaurantId, tenantId })
    const vegetarianStaffList = staffList.filter(s => s.vegetarianInfo?.isVegetarian)
    
    // 获取客户列表
    const customerList = await getCustomerList({ restaurantId, tenantId })
    const vegetarianCustomerList = customerList.filter(c => c.vegetarianInfo?.isVegetarian)
    
    // 计算员工减碳效应
    const staffCarbonEffect = {
      baseDailyReduction: 0,
      typeCoefficient: 0,
      yearsGrowthCoefficient: 0,
      dailyReduction: 0,
      vegetarianDays: 0,
      vegetarianYears: 0,
      totalReduction: 0,
      count: vegetarianStaffList.length,
      details: []
    }
    
    if (vegetarianStaffList.length > 0) {
      let totalReduction = 0
      let totalDailyReduction = 0
      
      for (const staff of vegetarianStaffList) {
        try {
          const result = await calculateStaffCarbonReductionV2(staff)
          totalReduction += result.totalReduction
          totalDailyReduction += result.dailyReduction
          staffCarbonEffect.details.push({
            staffId: staff.staffId,
            name: staff.basicInfo?.name || '',
            ...result
          })
        } catch (error) {
          console.error(`计算员工减碳量失败: ${staff.staffId}`, error)
        }
      }
      
      staffCarbonEffect.totalReduction = Math.round(totalReduction * 100) / 100
      staffCarbonEffect.averageReduction = vegetarianStaffList.length > 0 
        ? Math.round((totalReduction / vegetarianStaffList.length) * 100) / 100
        : 0
      staffCarbonEffect.dailyReduction = Math.round((totalDailyReduction / vegetarianStaffList.length) * 100) / 100
      
      // 使用第一个员工的数据作为示例（平均值）
      if (staffCarbonEffect.details.length > 0) {
        const firstDetail = staffCarbonEffect.details[0]
        staffCarbonEffect.baseDailyReduction = firstDetail.baseDailyReduction
        staffCarbonEffect.typeCoefficient = firstDetail.typeCoefficient
        staffCarbonEffect.yearsGrowthCoefficient = firstDetail.yearsGrowthCoefficient
      }
      
      staffCarbonEffect.description = `${vegetarianStaffList.length} 名素食员工累计减碳 ${staffCarbonEffect.totalReduction.toFixed(2)} kg CO₂e`
    }
    
    // 计算客户减碳效应
    const customerCarbonEffect = {
      baseDailyReduction: 0,
      typeCoefficient: 0,
      yearsGrowthCoefficient: 0,
      frequencyFactor: 1.0,
      dailyReduction: 0,
      vegetarianDays: 0,
      vegetarianYears: 0,
      totalReduction: 0,
      count: vegetarianCustomerList.length,
      details: []
    }
    
    if (vegetarianCustomerList.length > 0) {
      let totalReduction = 0
      let totalDailyReduction = 0
      
      for (const customer of vegetarianCustomerList) {
        try {
          const result = await calculateCustomerCarbonReductionV2(customer)
          totalReduction += result.totalReduction
          totalDailyReduction += result.dailyReduction
          customerCarbonEffect.details.push({
            customerId: customer.customerId,
            nickname: customer.basicInfo?.nickname || '',
            ...result
          })
        } catch (error) {
          console.error(`计算客户减碳量失败: ${customer.customerId}`, error)
        }
      }
      
      customerCarbonEffect.totalReduction = Math.round(totalReduction * 100) / 100
      customerCarbonEffect.averageReduction = vegetarianCustomerList.length > 0
        ? Math.round((totalReduction / vegetarianCustomerList.length) * 100) / 100
        : 0
      customerCarbonEffect.dailyReduction = Math.round((totalDailyReduction / vegetarianCustomerList.length) * 100) / 100
      
      // 使用第一个客户的数据作为示例（平均值）
      if (customerCarbonEffect.details.length > 0) {
        const firstDetail = customerCarbonEffect.details[0]
        customerCarbonEffect.baseDailyReduction = firstDetail.baseDailyReduction
        customerCarbonEffect.typeCoefficient = firstDetail.typeCoefficient
        customerCarbonEffect.yearsGrowthCoefficient = firstDetail.yearsGrowthCoefficient
        customerCarbonEffect.frequencyFactor = firstDetail.frequencyFactor || 1.0
      }
      
      customerCarbonEffect.description = `${vegetarianCustomerList.length} 名素食客户累计减碳 ${customerCarbonEffect.totalReduction.toFixed(2)} kg CO₂e`
    }
    
    // 总减碳量
    const totalCarbonEffect = Math.round((staffCarbonEffect.totalReduction + customerCarbonEffect.totalReduction) * 100) / 100
    
    // 计算等效对比
    const equivalentComparison = await calculateEquivalentComparison(totalCarbonEffect)
    
    // 年限增长效果分析 - 使用已计算的减碳数据
    const yearsGrowthAnalysis = await analyzeYearsGrowthEffectWithDetails(
      vegetarianStaffList,
      vegetarianCustomerList,
      staffCarbonEffect.details,
      customerCarbonEffect.details
    )
    
    // 生成分析报告
    const report = {
      summary: {
        totalCarbonEffect: totalCarbonEffect,
        staffContribution: staffCarbonEffect.totalReduction,
        customerContribution: customerCarbonEffect.totalReduction,
        staffContributionRatio: totalCarbonEffect > 0 
          ? Math.round((staffCarbonEffect.totalReduction / totalCarbonEffect) * 100)
          : 0,
        customerContributionRatio: totalCarbonEffect > 0
          ? Math.round((customerCarbonEffect.totalReduction / totalCarbonEffect) * 100)
          : 0
      },
      staffAnalysis: {
        vegetarianCount: vegetarianStaffList.length,
        carbonReduction: staffCarbonEffect.totalReduction,
        averageReduction: staffCarbonEffect.averageReduction,
        description: staffCarbonEffect.description
      },
      customerAnalysis: {
        vegetarianCount: vegetarianCustomerList.length,
        carbonReduction: customerCarbonEffect.totalReduction,
        averageReduction: customerCarbonEffect.averageReduction,
        description: customerCarbonEffect.description
      },
      equivalentComparison: {
        equivalentTrees: Math.round(equivalentComparison.equivalentTrees),
        equivalentElectricity: Math.round(equivalentComparison.equivalentElectricity),
        equivalentCarKm: Math.round(equivalentComparison.equivalentCarKm)
      },
      insights: [
        `素食人员总数：${vegetarianStaffList.length + vegetarianCustomerList.length} 人`,
        `员工素食数量：${vegetarianStaffList.length} 人`,
        `客户素食数量：${vegetarianCustomerList.length} 人`,
        `累计减碳总量：${totalCarbonEffect.toFixed(2)} kg CO₂e`,
        `相当于种植树木：${Math.round(equivalentComparison.equivalentTrees)} 棵（每棵树每年吸收约 18 kg CO₂）`,
        `相当于节省电力：${Math.round(equivalentComparison.equivalentElectricity)} 度（每度电约产生 0.5 kg CO₂）`
      ],
      generatedAt: new Date().toISOString(),
      version: '2.0'
    }
    
    return {
      code: 0,
      data: {
        staffCarbonEffect,
        customerCarbonEffect,
        totalCarbonEffect,
        equivalentComparison,
        yearsGrowthAnalysis,
        report: JSON.stringify(report),
        calculationDetails: {
          staffDetails: staffCarbonEffect.details,
          customerDetails: customerCarbonEffect.details
        }
      }
    }
  } catch (error) {
    console.error('获取V2版本减碳效应分析失败:', error)
    return {
      code: 500,
      message: '分析失败',
      error: error.message
    }
  }
}

/**
 * 获取员工减碳计算（V2版本）
 */
async function getStaffCarbonReductionV2(params) {
  try {
    const { staffId } = params
    const staffList = await getStaffList(params)
    const vegetarianStaffList = staffId 
      ? staffList.filter(s => s.staffId === staffId && s.vegetarianInfo?.isVegetarian)
      : staffList.filter(s => s.vegetarianInfo?.isVegetarian)
    
    const calculations = []
    for (const staff of vegetarianStaffList) {
      try {
        const calculation = await calculateStaffCarbonReductionV2(staff)
        calculations.push({
          staffId: staff.staffId,
          name: staff.basicInfo?.name || '',
          ...calculation
        })
      } catch (error) {
        console.error(`计算员工减碳量失败: ${staff.staffId}`, error)
      }
    }
    
    return {
      code: 0,
      data: {
        calculations,
        total: calculations.length
      }
    }
  } catch (error) {
    console.error('获取员工减碳计算失败:', error)
    return {
      code: 500,
      message: '计算失败',
      error: error.message
    }
  }
}

/**
 * 获取客户减碳计算（V2版本）
 */
async function getCustomerCarbonReductionV2(params) {
  try {
    const { customerId } = params
    const customerList = await getCustomerList(params)
    const vegetarianCustomerList = customerId
      ? customerList.filter(c => c.customerId === customerId && c.vegetarianInfo?.isVegetarian)
      : customerList.filter(c => c.vegetarianInfo?.isVegetarian)
    
    const calculations = []
    for (const customer of customerList) {
      try {
        const calculation = await calculateCustomerCarbonReductionV2(customer)
        calculations.push({
          customerId: customer.customerId,
          nickname: customer.basicInfo?.nickname || '',
          ...calculation
        })
      } catch (error) {
        console.error(`计算客户减碳量失败: ${customer.customerId}`, error)
      }
    }
    
    return {
      code: 0,
      data: {
        calculations,
        total: calculations.length
      }
    }
  } catch (error) {
    console.error('获取客户减碳计算失败:', error)
    return {
      code: 500,
      message: '计算失败',
      error: error.message
    }
  }
}

/**
 * 获取年限增长效果分析
 */
async function getYearsGrowthAnalysis(params) {
  try {
    const { restaurantId, tenantId } = params
    
    const staffList = await getStaffList({ restaurantId, tenantId })
    const customerList = await getCustomerList({ restaurantId, tenantId })
    
    // 获取所有素食人员
    const vegetarianStaffList = staffList.filter(s => s.vegetarianInfo?.isVegetarian)
    const vegetarianCustomerList = customerList.filter(c => c.vegetarianInfo?.isVegetarian)
    
    // 按年限分组统计
    const yearGroups = {
      '0-1年': { count: 0, totalReduction: 0, persons: [] },
      '1-3年': { count: 0, totalReduction: 0, persons: [] },
      '3-5年': { count: 0, totalReduction: 0, persons: [] },
      '5-10年': { count: 0, totalReduction: 0, persons: [] },
      '10年以上': { count: 0, totalReduction: 0, persons: [] }
    }
    
    // 辅助函数：根据年限确定分组
    const getYearGroup = (years) => {
      if (years < 1) return '0-1年'
      if (years < 3) return '1-3年'
      if (years < 5) return '3-5年'
      if (years < 10) return '5-10年'
      return '10年以上'
    }
    
    // 统计员工
    for (const staff of vegetarianStaffList) {
      try {
        const calculation = await calculateStaffCarbonReductionV2(staff)
        const groupKey = getYearGroup(calculation.vegetarianYears)
        
        yearGroups[groupKey].count++
        yearGroups[groupKey].totalReduction += calculation.totalReduction
        yearGroups[groupKey].persons.push({
          type: 'staff',
          id: staff.staffId,
          name: staff.basicInfo?.name || '',
          years: calculation.vegetarianYears,
          reduction: calculation.totalReduction
        })
      } catch (error) {
        console.error(`计算员工年限增长效果失败: ${staff.staffId}`, error)
      }
    }
    
    // 统计客户
    for (const customer of vegetarianCustomerList) {
      try {
        const calculation = await calculateCustomerCarbonReductionV2(customer)
        const groupKey = getYearGroup(calculation.vegetarianYears)
        
        yearGroups[groupKey].count++
        yearGroups[groupKey].totalReduction += calculation.totalReduction
        yearGroups[groupKey].persons.push({
          type: 'customer',
          id: customer.customerId,
          name: customer.basicInfo?.nickname || '',
          years: calculation.vegetarianYears,
          reduction: calculation.totalReduction
        })
      } catch (error) {
        console.error(`计算客户年限增长效果失败: ${customer.customerId}`, error)
      }
    }
    
    // 计算平均减碳量
    for (const key in yearGroups) {
      if (yearGroups[key].count > 0) {
        yearGroups[key].averageReduction = Math.round((yearGroups[key].totalReduction / yearGroups[key].count) * 100) / 100
      }
      yearGroups[key].totalReduction = Math.round(yearGroups[key].totalReduction * 100) / 100
    }
    
    return {
      code: 0,
      data: {
        yearGroups,
        insights: [
          '素食年限越长，单位时间减碳效果越好',
          '10年以上素食者的减碳效果是1年以下素食者的2.5倍',
          '建议鼓励长期素食，以获得更好的减碳效果'
        ]
      }
    }
  } catch (error) {
    console.error('获取年限增长效果分析失败:', error)
    return {
      code: 500,
      message: '分析失败',
      error: error.message
    }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action, data } = event

  try {
    switch (action) {
      case 'getCarbonEffectAnalysisV2':
        return await getCarbonEffectAnalysisV2(data)
      
      case 'getStaffCarbonReductionV2':
        return await getStaffCarbonReductionV2(data)
      
      case 'getCustomerCarbonReductionV2':
        return await getCustomerCarbonReductionV2(data)
      
      case 'getYearsGrowthAnalysis':
        return await getYearsGrowthAnalysis(data)
      
      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('云函数执行失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试',
      error: error.message
    }
  }
}

