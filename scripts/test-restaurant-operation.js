/**
 * 餐厅运营模块功能测试脚本
 * 
 * 测试内容：
 * 1. 创建运营台账记录
 * 2. 查询运营台账列表
 * 3. 更新运营台账记录
 * 4. 删除运营台账记录
 * 5. 获取运营台账统计
 * 6. 批量导入运营台账
 */

// 测试配置
const TEST_CONFIG = {
  tenantId: 'default',
  restaurantId: 'caed3c76691d1262007f0bc3128b940d', // 素喜悦餐厅ID
  createdBy: 'test_user'
}

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
}

/**
 * 调用云函数
 */
async function callCloudFunction(action, params) {
  try {
    // 使用云函数目录下的依赖
    const path = require('path')
    const cloudFunctionPath = path.join(__dirname, '../cloudfunctions/restaurant-operation')
    const indexPath = path.join(cloudFunctionPath, 'index.js')
    
    const { main } = require(indexPath)
    const result = await main({ action, ...params }, {})
    
    return result
  } catch (error) {
    console.error(`调用云函数失败 (${action}):`, error)
    return {
      code: 500,
      message: error.message
    }
  }
}

/**
 * 测试创建运营台账记录
 */
async function testCreateLedger() {
  console.log('\n📝 测试1: 创建运营台账记录')
  console.log('='.repeat(50))
  
  const testCases = [
    {
      name: '创建能源台账',
      data: {
        restaurantId: TEST_CONFIG.restaurantId,
        tenantId: TEST_CONFIG.tenantId,
        type: 'energy',
        date: new Date().toISOString().slice(0, 10),
        period: 'daily',
        description: '测试能源使用记录',
        value: 100.5,
        unit: 'kWh',
        energyType: 'electricity',
        createdBy: TEST_CONFIG.createdBy
      }
    },
    {
      name: '创建浪费台账',
      data: {
        restaurantId: TEST_CONFIG.restaurantId,
        tenantId: TEST_CONFIG.tenantId,
        type: 'waste',
        date: new Date().toISOString().slice(0, 10),
        period: 'daily',
        description: '测试食物浪费记录',
        value: 5.2,
        unit: 'kg',
        wasteType: 'kitchen_waste',
        createdBy: TEST_CONFIG.createdBy
      }
    },
    {
      name: '创建培训台账',
      data: {
        restaurantId: TEST_CONFIG.restaurantId,
        tenantId: TEST_CONFIG.tenantId,
        type: 'training',
        date: new Date().toISOString().slice(0, 10),
        period: 'daily',
        description: '测试培训活动记录',
        value: 1,
        unit: '次',
        trainingType: 'staff',
        participants: 10,
        createdBy: TEST_CONFIG.createdBy
      }
    }
  ]

  const createdLedgerIds = []

  for (const testCase of testCases) {
    try {
      console.log(`\n测试: ${testCase.name}`)
      const result = await callCloudFunction('createLedger', testCase.data)
      
      if (result.code === 0 && result.data && result.data.ledgerId) {
        console.log(`✅ 成功: ${testCase.name}`)
        console.log(`   台账ID: ${result.data.ledgerId}`)
        createdLedgerIds.push(result.data.ledgerId)
        testResults.passed++
      } else {
        console.log(`❌ 失败: ${testCase.name}`)
        console.log(`   错误: ${result.message || '未知错误'}`)
        testResults.failed++
        testResults.errors.push({ test: testCase.name, error: result.message })
      }
    } catch (error) {
      console.log(`❌ 异常: ${testCase.name}`)
      console.log(`   错误: ${error.message}`)
      testResults.failed++
      testResults.errors.push({ test: testCase.name, error: error.message })
    }
  }

  return createdLedgerIds
}

/**
 * 测试查询运营台账列表
 */
async function testListLedger() {
  console.log('\n📋 测试2: 查询运营台账列表')
  console.log('='.repeat(50))

  const testCases = [
    {
      name: '查询所有台账',
      params: {
        restaurantId: TEST_CONFIG.restaurantId,
        tenantId: TEST_CONFIG.tenantId,
        page: 1,
        pageSize: 10
      }
    },
    {
      name: '按类型筛选（能源）',
      params: {
        restaurantId: TEST_CONFIG.restaurantId,
        tenantId: TEST_CONFIG.tenantId,
        type: 'energy',
        page: 1,
        pageSize: 10
      }
    },
    {
      name: '按日期范围筛选',
      params: {
        restaurantId: TEST_CONFIG.restaurantId,
        tenantId: TEST_CONFIG.tenantId,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        page: 1,
        pageSize: 10
      }
    }
  ]

  for (const testCase of testCases) {
    try {
      console.log(`\n测试: ${testCase.name}`)
      const result = await callCloudFunction('listLedger', testCase.params)
      
      if (result.code === 0 && Array.isArray(result.data)) {
        console.log(`✅ 成功: ${testCase.name}`)
        console.log(`   返回记录数: ${result.data.length}`)
        console.log(`   总记录数: ${result.pagination?.total || 0}`)
        testResults.passed++
      } else {
        console.log(`❌ 失败: ${testCase.name}`)
        console.log(`   错误: ${result.message || '未知错误'}`)
        testResults.failed++
        testResults.errors.push({ test: testCase.name, error: result.message })
      }
    } catch (error) {
      console.log(`❌ 异常: ${testCase.name}`)
      console.log(`   错误: ${error.message}`)
      testResults.failed++
      testResults.errors.push({ test: testCase.name, error: error.message })
    }
  }
}

/**
 * 测试更新运营台账记录
 */
async function testUpdateLedger(ledgerId) {
  console.log('\n✏️  测试3: 更新运营台账记录')
  console.log('='.repeat(50))

  if (!ledgerId) {
    console.log('⚠️  跳过：没有可用的台账ID')
    return
  }

  try {
    const updateData = {
      ledgerId: ledgerId,
      restaurantId: TEST_CONFIG.restaurantId,
      tenantId: TEST_CONFIG.tenantId,
      description: '更新后的描述',
      value: 200.5,
      updatedBy: TEST_CONFIG.createdBy
    }

    console.log(`\n更新台账: ${ledgerId}`)
    const result = await callCloudFunction('updateLedger', updateData)
    
    if (result.code === 0) {
      console.log(`✅ 成功: 更新运营台账记录`)
      testResults.passed++
    } else {
      console.log(`❌ 失败: 更新运营台账记录`)
      console.log(`   错误: ${result.message || '未知错误'}`)
      testResults.failed++
      testResults.errors.push({ test: '更新运营台账记录', error: result.message })
    }
  } catch (error) {
    console.log(`❌ 异常: 更新运营台账记录`)
    console.log(`   错误: ${error.message}`)
    testResults.failed++
    testResults.errors.push({ test: '更新运营台账记录', error: error.message })
  }
}

/**
 * 测试删除运营台账记录
 */
async function testDeleteLedger(ledgerId) {
  console.log('\n🗑️  测试4: 删除运营台账记录')
  console.log('='.repeat(50))

  if (!ledgerId) {
    console.log('⚠️  跳过：没有可用的台账ID')
    return
  }

  try {
    console.log(`\n删除台账: ${ledgerId}`)
    const result = await callCloudFunction('deleteLedger', {
      ledgerId: ledgerId,
      tenantId: TEST_CONFIG.tenantId
    })
    
    if (result.code === 0) {
      console.log(`✅ 成功: 删除运营台账记录`)
      testResults.passed++
    } else {
      console.log(`❌ 失败: 删除运营台账记录`)
      console.log(`   错误: ${result.message || '未知错误'}`)
      testResults.failed++
      testResults.errors.push({ test: '删除运营台账记录', error: result.message })
    }
  } catch (error) {
    console.log(`❌ 异常: 删除运营台账记录`)
    console.log(`   错误: ${error.message}`)
    testResults.failed++
    testResults.errors.push({ test: '删除运营台账记录', error: error.message })
  }
}

/**
 * 测试获取运营台账统计
 */
async function testGetLedgerStats() {
  console.log('\n📊 测试5: 获取运营台账统计')
  console.log('='.repeat(50))

  const testCases = [
    {
      name: '获取月度统计',
      params: {
        restaurantId: TEST_CONFIG.restaurantId,
        tenantId: TEST_CONFIG.tenantId,
        period: 'monthly',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10)
      }
    },
    {
      name: '按类型统计（能源）',
      params: {
        restaurantId: TEST_CONFIG.restaurantId,
        tenantId: TEST_CONFIG.tenantId,
        type: 'energy',
        period: 'monthly'
      }
    }
  ]

  for (const testCase of testCases) {
    try {
      console.log(`\n测试: ${testCase.name}`)
      const result = await callCloudFunction('getLedgerStats', testCase.params)
      
      if (result.code === 0 && result.data) {
        console.log(`✅ 成功: ${testCase.name}`)
        console.log(`   总记录数: ${result.data.total || 0}`)
        console.log(`   总值: ${result.data.totalValue || 0}`)
        console.log(`   平均值: ${result.data.avgValue || 0}`)
        console.log(`   趋势数据点: ${result.data.trend?.length || 0}`)
        console.log(`   分布数据点: ${result.data.distribution?.length || 0}`)
        testResults.passed++
      } else {
        console.log(`❌ 失败: ${testCase.name}`)
        console.log(`   错误: ${result.message || '未知错误'}`)
        testResults.failed++
        testResults.errors.push({ test: testCase.name, error: result.message })
      }
    } catch (error) {
      console.log(`❌ 异常: ${testCase.name}`)
      console.log(`   错误: ${error.message}`)
      testResults.failed++
      testResults.errors.push({ test: testCase.name, error: error.message })
    }
  }
}

/**
 * 测试批量导入运营台账
 */
async function testBatchImportLedger() {
  console.log('\n📦 测试6: 批量导入运营台账')
  console.log('='.repeat(50))

  // 模拟批量导入数据
  const ledgerData = [
    {
      type: 'energy',
      date: new Date().toISOString().slice(0, 10),
      period: 'daily',
      description: '批量导入测试 - 能源1',
      value: 150,
      unit: 'kWh',
      energyType: 'electricity',
      status: 'draft'
    },
    {
      type: 'waste',
      date: new Date().toISOString().slice(0, 10),
      period: 'daily',
      description: '批量导入测试 - 浪费1',
      value: 3.5,
      unit: 'kg',
      wasteType: 'kitchen_waste',
      status: 'draft'
    },
    {
      type: 'training',
      date: new Date().toISOString().slice(0, 10),
      period: 'daily',
      description: '批量导入测试 - 培训1',
      value: 1,
      unit: '次',
      trainingType: 'customer',
      participants: 15,
      status: 'draft'
    }
  ]

  try {
    console.log(`\n批量导入 ${ledgerData.length} 条记录`)
    const result = await callCloudFunction('batchImportLedger', {
      restaurantId: TEST_CONFIG.restaurantId,
      tenantId: TEST_CONFIG.tenantId,
      ledgerData: ledgerData,
      createdBy: TEST_CONFIG.createdBy
    })
    
    if (result.code === 0 && result.data) {
      console.log(`✅ 成功: 批量导入运营台账`)
      console.log(`   成功: ${result.data.successCount || 0} 条`)
      console.log(`   失败: ${result.data.failCount || 0} 条`)
      if (result.data.errors && result.data.errors.length > 0) {
        console.log(`   错误详情:`)
        result.data.errors.forEach((err, index) => {
          console.log(`     [${index + 1}] ${err.error}`)
        })
      }
      testResults.passed++
    } else {
      console.log(`❌ 失败: 批量导入运营台账`)
      console.log(`   错误: ${result.message || '未知错误'}`)
      testResults.failed++
      testResults.errors.push({ test: '批量导入运营台账', error: result.message })
    }
  } catch (error) {
    console.log(`❌ 异常: 批量导入运营台账`)
    console.log(`   错误: ${error.message}`)
    testResults.failed++
    testResults.errors.push({ test: '批量导入运营台账', error: error.message })
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n' + '='.repeat(50))
  console.log('🧪 餐厅运营模块功能测试')
  console.log('='.repeat(50))
  console.log(`租户ID: ${TEST_CONFIG.tenantId}`)
  console.log(`餐厅ID: ${TEST_CONFIG.restaurantId}`)
  console.log('='.repeat(50))

  try {
    // 1. 测试创建
    const createdLedgerIds = await testCreateLedger()
    
    // 等待一下，确保数据已写入
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 2. 测试查询
    await testListLedger()
    
    // 3. 测试更新（使用第一个创建的ID）
    if (createdLedgerIds.length > 0) {
      await testUpdateLedger(createdLedgerIds[0])
    }
    
    // 4. 测试统计
    await testGetLedgerStats()
    
    // 5. 测试批量导入
    await testBatchImportLedger()
    
    // 6. 测试删除（使用最后一个创建的ID，保留其他用于查看）
    if (createdLedgerIds.length > 1) {
      await testDeleteLedger(createdLedgerIds[createdLedgerIds.length - 1])
    }
    
  } catch (error) {
    console.error('\n❌ 测试执行异常:', error)
    testResults.failed++
    testResults.errors.push({ test: '测试执行', error: error.message })
  }

  // 输出测试结果
  console.log('\n' + '='.repeat(50))
  console.log('📊 测试结果汇总')
  console.log('='.repeat(50))
  console.log(`✅ 通过: ${testResults.passed} 项`)
  console.log(`❌ 失败: ${testResults.failed} 项`)
  console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`)
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ 错误详情:')
    testResults.errors.forEach((err, index) => {
      console.log(`   [${index + 1}] ${err.test}: ${err.error}`)
    })
  }
  
  console.log('='.repeat(50))
  
  return testResults.failed === 0
}

// 执行测试
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('测试失败:', error)
      process.exit(1)
    })
}

module.exports = { runTests }

