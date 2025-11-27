/**
 * 素食人员管理模块 API 功能测试脚本
 * 
 * 使用方法：
 * node scripts/test-vegetarian-personnel-api.js
 */

const { execSync } = require('child_process')

const ENV_ID = process.env.CLOUDBASE_ENVID || 'my-garden-app-env-4e0h762923be2f'
const TENANT_ID = process.env.TENANT_ID || 'test-tenant-001'
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'test-restaurant-001'

// 测试结果统计
let passed = 0
let failed = 0
let total = 0

// 测试函数
function testAPI(testName, action, data, expectedCode = 0) {
  total++
  console.log(`\n[${total}] 测试: ${testName}`)
  
  try {
    const params = JSON.stringify({
      action,
      data: {
        ...data,
        tenantId: TENANT_ID,
        restaurantId: RESTAURANT_ID,
      }
    })
    
    const result = execSync(
      `tcb fn invoke vegetarian-personnel --params '${params}' --envId ${ENV_ID}`,
      { encoding: 'utf-8', stdio: 'pipe' }
    )
    
    // 解析返回结果
    const resultMatch = result.match(/"返回结果":\s*({[^}]+})/)
    if (resultMatch) {
      const resultData = JSON.parse(resultMatch[1])
      if (resultData.code === expectedCode) {
        console.log(`  ✅ 通过 (code: ${resultData.code})`)
        passed++
        return true
      } else {
        console.log(`  ❌ 失败: 期望 code=${expectedCode}, 实际 code=${resultData.code}`)
        console.log(`     消息: ${resultData.message || '无'}`)
        failed++
        return false
      }
    } else {
      console.log(`  ⚠️  无法解析返回结果`)
      failed++
      return false
    }
  } catch (error) {
    console.log(`  ❌ 失败: ${error.message}`)
    failed++
    return false
  }
}

// 主测试流程
async function runTests() {
  console.log('========================================')
  console.log('素食人员管理模块 - API 功能测试')
  console.log('========================================')
  console.log(`环境ID: ${ENV_ID}`)
  console.log(`租户ID: ${TENANT_ID}`)
  console.log(`餐厅ID: ${RESTAURANT_ID}`)
  console.log('========================================\n')

  // 1. 员工管理接口测试
  console.log('1. 员工管理接口测试')
  console.log('========================================')
  
  // 创建非素食员工
  testAPI('创建非素食员工', 'createStaff', {
    basicInfo: {
      name: '测试员工1',
      position: '服务员',
      joinDate: '2024-01-01',
      phone: '13800138001'
    },
    vegetarianInfo: {
      isVegetarian: false
    }
  })

  // 创建素食员工（纯素）
  testAPI('创建素食员工（纯素）', 'createStaff', {
    basicInfo: {
      name: '测试员工2',
      position: '厨师',
      joinDate: '2024-01-01',
      phone: '13800138002'
    },
    vegetarianInfo: {
      isVegetarian: true,
      vegetarianType: 'pure',
      vegetarianStartYear: 2020,
      vegetarianReason: 'health'
    }
  })

  // 查询员工列表
  testAPI('查询员工列表', 'listStaff', {
    page: 1,
    pageSize: 10
  })

  // 获取员工统计
  testAPI('获取员工统计', 'getStaffStats', {})

  // 2. 客户管理接口测试
  console.log('\n\n2. 客户管理接口测试')
  console.log('========================================')
  
  // 创建/更新客户
  testAPI('创建/更新客户', 'createOrUpdateCustomer', {
    customerId: 'test-customer-001',
    basicInfo: {
      nickname: '测试客户',
      phone: '13800138000'
    },
    vegetarianInfo: {
      isVegetarian: true,
      vegetarianType: 'regular',
      vegetarianYears: '3_5',
      vegetarianStartYear: 2020
    }
  })

  // 查询客户列表
  testAPI('查询客户列表', 'listCustomers', {
    page: 1,
    pageSize: 10
  })

  // 获取客户统计
  testAPI('获取客户统计', 'getCustomerStats', {})

  // 测试结果汇总
  console.log('\n\n========================================')
  console.log('测试结果汇总')
  console.log('========================================')
  console.log(`  总测试数: ${total}`)
  console.log(`  通过: ${passed}`)
  console.log(`  失败: ${failed}`)
  console.log(`  通过率: ${total > 0 ? ((passed / total) * 100).toFixed(2) : 0}%`)
  console.log('========================================\n')

  if (failed === 0) {
    console.log('✅ 所有测试通过！')
    process.exit(0)
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败，请检查云函数日志`)
    process.exit(1)
  }
}

// 执行测试
runTests().catch(error => {
  console.error('测试执行失败:', error)
  process.exit(1)
})

