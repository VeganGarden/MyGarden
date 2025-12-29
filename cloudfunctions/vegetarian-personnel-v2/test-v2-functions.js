/**
 * V2版本云函数测试脚本
 * 用于本地测试V2版本功能
 * 
 * 注意：此文件仅用于开发测试，不会部署到生产环境
 * 
 * 使用方法：
 * node test-v2-functions.js
 */

const cloud = require('wx-server-sdk')

// 初始化云开发环境（需要设置环境变量或配置文件）
cloud.init({
  env: process.env.CLOUDBASE_ENVID || 'your-env-id'
})

const db = cloud.database()

/**
 * 测试配置获取
 */
async function testConfigManager() {
  console.log('===== 测试配置管理模块 =====\n')
  
  try {
    const { getConfigValue, getVegetarianCoefficient, getYearsGrowthCoefficient } = require('./config-manager')
    
    // 测试获取基础减碳量
    const baseReduction = await getConfigValue('base_daily_reduction', 2.0)
    console.log(`✅ 基础减碳量: ${baseReduction} kg CO₂e/天/人`)
    
    // 测试获取素食类型系数
    const pureCoeff = await getVegetarianCoefficient('pure')
    const ovoLactoCoeff = await getVegetarianCoefficient('ovo_lacto')
    console.log(`✅ 纯素系数: ${pureCoeff}`)
    console.log(`✅ 蛋奶素系数: ${ovoLactoCoeff}`)
    
    // 测试获取年限增长系数
    const coeff1 = await getYearsGrowthCoefficient(0.5) // 1年以下
    const coeff2 = await getYearsGrowthCoefficient(2)     // 1-3年
    const coeff3 = await getYearsGrowthCoefficient(4)    // 3-5年
    const coeff4 = await getYearsGrowthCoefficient(7)    // 5-10年
    const coeff5 = await getYearsGrowthCoefficient(12)   // 10年以上
    
    console.log(`✅ 年限增长系数测试:`)
    console.log(`   0.5年: ${coeff1}`)
    console.log(`   2年: ${coeff2}`)
    console.log(`   4年: ${coeff3}`)
    console.log(`   7年: ${coeff4}`)
    console.log(`   12年: ${coeff5}`)
    
    return true
  } catch (error) {
    console.error('❌ 配置管理测试失败:', error)
    return false
  }
}

/**
 * 测试减碳计算
 */
async function testCarbonCalculation() {
  console.log('\n===== 测试减碳计算模块 =====\n')
  
  try {
    const { calculateStaffCarbonReductionV2, calculateCustomerCarbonReductionV2 } = require('./carbon-calculator-v2')
    
    // 模拟员工数据
    const mockStaff = {
      staffId: 'TEST-STAFF-001',
      basicInfo: {
        name: '测试员工'
      },
      vegetarianInfo: {
        isVegetarian: true,
        vegetarianType: 'pure',
        vegetarianStartYear: 2020  // 约4年
      }
    }
    
    // 测试员工减碳计算
    const staffResult = await calculateStaffCarbonReductionV2(mockStaff)
    console.log('✅ 员工减碳计算结果:')
    console.log(`   基础减碳量: ${staffResult.baseDailyReduction} kg/天/人`)
    console.log(`   类型系数: ${staffResult.typeCoefficient}`)
    console.log(`   年限增长系数: ${staffResult.yearsGrowthCoefficient}`)
    console.log(`   日均减碳量: ${staffResult.dailyReduction.toFixed(2)} kg/天/人`)
    console.log(`   素食天数: ${staffResult.vegetarianDays}`)
    console.log(`   总减碳量: ${staffResult.totalReduction.toFixed(2)} kg CO₂e`)
    
    // 模拟客户数据
    const mockCustomer = {
      customerId: 'TEST-CUST-001',
      basicInfo: {
        nickname: '测试客户'
      },
      vegetarianInfo: {
        isVegetarian: true,
        vegetarianType: 'pure',
        vegetarianStartYear: 2018  // 约6年
      }
    }
    
    // 测试客户减碳计算
    const customerResult = await calculateCustomerCarbonReductionV2(mockCustomer)
    console.log('\n✅ 客户减碳计算结果:')
    console.log(`   基础减碳量: ${customerResult.baseDailyReduction} kg/天/人`)
    console.log(`   类型系数: ${customerResult.typeCoefficient}`)
    console.log(`   年限增长系数: ${customerResult.yearsGrowthCoefficient}`)
    console.log(`   频率系数: ${customerResult.frequencyFactor}`)
    console.log(`   日均减碳量: ${customerResult.dailyReduction.toFixed(2)} kg/天/人`)
    console.log(`   素食天数: ${customerResult.vegetarianDays}`)
    console.log(`   总减碳量: ${customerResult.totalReduction.toFixed(2)} kg CO₂e`)
    
    return true
  } catch (error) {
    console.error('❌ 减碳计算测试失败:', error)
    return false
  }
}

/**
 * 测试主函数
 */
async function testMainFunction() {
  console.log('\n===== 测试主函数接口 =====\n')
  
  try {
    const { main } = require('./index')
    
    // 测试 getCarbonEffectAnalysisV2
    console.log('测试 getCarbonEffectAnalysisV2...')
    const result1 = await main({
      action: 'getCarbonEffectAnalysisV2',
      data: {
        restaurantId: 'test-restaurant-id',
        tenantId: 'test-tenant-id'
      }
    })
    
    if (result1.code === 0) {
      console.log('✅ getCarbonEffectAnalysisV2 测试通过')
      console.log(`   总减碳量: ${result1.data.totalCarbonEffect} kg CO₂e`)
    } else {
      console.log(`⚠️ getCarbonEffectAnalysisV2 返回: ${result1.message}`)
    }
    
    return true
  } catch (error) {
    console.error('❌ 主函数测试失败:', error)
    return false
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('========================================')
  console.log('开始测试V2版本云函数')
  console.log('========================================\n')
  
  const results = {
    configManager: false,
    carbonCalculation: false,
    mainFunction: false
  }
  
  try {
    results.configManager = await testConfigManager()
    results.carbonCalculation = await testCarbonCalculation()
    results.mainFunction = await testMainFunction()
    
    console.log('\n========================================')
    console.log('测试结果汇总')
    console.log('========================================')
    console.log(`配置管理: ${results.configManager ? '✅ 通过' : '❌ 失败'}`)
    console.log(`减碳计算: ${results.carbonCalculation ? '✅ 通过' : '❌ 失败'}`)
    console.log(`主函数: ${results.mainFunction ? '✅ 通过' : '❌ 失败'}`)
    
    const allPassed = Object.values(results).every(r => r)
    console.log(`\n总体结果: ${allPassed ? '✅ 全部通过' : '⚠️ 部分失败'}`)
    console.log('========================================\n')
    
    return allPassed
  } catch (error) {
    console.error('测试执行失败:', error)
    return false
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('测试脚本执行失败:', error)
    process.exit(1)
  })
}

module.exports = {
  testConfigManager,
  testCarbonCalculation,
  testMainFunction,
  runAllTests
}

