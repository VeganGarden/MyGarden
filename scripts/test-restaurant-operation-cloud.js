/**
 * 餐厅运营模块功能测试脚本（调用云端云函数）
 * 
 * 使用方法：
 * tcb fn invoke restaurant-operation --params '{"action":"createLedger",...}'
 * 
 * 或者使用此脚本：
 * node scripts/test-restaurant-operation-cloud.js
 */

// 测试配置
const TEST_CONFIG = {
  tenantId: 'default',
  restaurantId: 'caed3c76691d1262007f0bc3128b940d', // 素喜悦餐厅ID
  createdBy: 'test_user'
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  console.log('\n' + '='.repeat(60))
  console.log('📋 餐厅运营模块功能测试报告')
  console.log('='.repeat(60))
  console.log('\n本测试脚本用于验证云函数的各项功能。')
  console.log('由于需要云开发环境配置，建议通过以下方式测试：\n')
  
  console.log('1️⃣  创建运营台账记录')
  console.log('─'.repeat(60))
  console.log(`tcb fn invoke restaurant-operation --params '{
  "action": "createLedger",
  "restaurantId": "${TEST_CONFIG.restaurantId}",
  "tenantId": "${TEST_CONFIG.tenantId}",
  "type": "energy",
  "date": "${new Date().toISOString().slice(0, 10)}",
  "period": "daily",
  "description": "测试能源使用记录",
  "value": 100.5,
  "unit": "kWh",
  "energyType": "electricity",
  "createdBy": "${TEST_CONFIG.createdBy}"
}'`)
  
  console.log('\n2️⃣  查询运营台账列表')
  console.log('─'.repeat(60))
  console.log(`tcb fn invoke restaurant-operation --params '{
  "action": "listLedger",
  "restaurantId": "${TEST_CONFIG.restaurantId}",
  "tenantId": "${TEST_CONFIG.tenantId}",
  "page": 1,
  "pageSize": 10
}'`)
  
  console.log('\n3️⃣  更新运营台账记录')
  console.log('─'.repeat(60))
  console.log(`tcb fn invoke restaurant-operation --params '{
  "action": "updateLedger",
  "ledgerId": "LED-20241124-0001",
  "restaurantId": "${TEST_CONFIG.restaurantId}",
  "tenantId": "${TEST_CONFIG.tenantId}",
  "description": "更新后的描述",
  "value": 200.5,
  "updatedBy": "${TEST_CONFIG.createdBy}"
}'`)
  
  console.log('\n4️⃣  删除运营台账记录')
  console.log('─'.repeat(60))
  console.log(`tcb fn invoke restaurant-operation --params '{
  "action": "deleteLedger",
  "ledgerId": "LED-20241124-0001",
  "tenantId": "${TEST_CONFIG.tenantId}"
}'`)
  
  console.log('\n5️⃣  获取运营台账统计')
  console.log('─'.repeat(60))
  console.log(`tcb fn invoke restaurant-operation --params '{
  "action": "getLedgerStats",
  "restaurantId": "${TEST_CONFIG.restaurantId}",
  "tenantId": "${TEST_CONFIG.tenantId}",
  "period": "monthly",
  "startDate": "${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}",
  "endDate": "${new Date().toISOString().slice(0, 10)}"
}'`)
  
  console.log('\n6️⃣  批量导入运营台账')
  console.log('─'.repeat(60))
  console.log(`tcb fn invoke restaurant-operation --params '{
  "action": "batchImportLedger",
  "restaurantId": "${TEST_CONFIG.restaurantId}",
  "tenantId": "${TEST_CONFIG.tenantId}",
  "ledgerData": [
    {
      "type": "energy",
      "date": "${new Date().toISOString().slice(0, 10)}",
      "period": "daily",
      "description": "批量导入测试 - 能源1",
      "value": 150,
      "unit": "kWh",
      "energyType": "electricity",
      "status": "draft"
    },
    {
      "type": "waste",
      "date": "${new Date().toISOString().slice(0, 10)}",
      "period": "daily",
      "description": "批量导入测试 - 浪费1",
      "value": 3.5,
      "unit": "kg",
      "wasteType": "kitchen_waste",
      "status": "draft"
    }
  ],
  "createdBy": "${TEST_CONFIG.createdBy}"
}'`)
  
  console.log('\n' + '='.repeat(60))
  console.log('💡 测试建议')
  console.log('='.repeat(60))
  console.log('1. 按顺序执行上述命令')
  console.log('2. 创建记录后，记录返回的 ledgerId 用于后续测试')
  console.log('3. 查询列表验证数据是否正确')
  console.log('4. 更新记录后，再次查询验证更新是否成功')
  console.log('5. 删除记录后，查询列表验证记录是否已删除')
  console.log('6. 统计功能需要先有数据才能看到结果')
  console.log('7. 批量导入可以一次性创建多条记录')
  console.log('='.repeat(60))
}

// 执行
generateTestReport()

