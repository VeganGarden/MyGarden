/**
 * 测试基准值查询功能（通过云函数）
 * 
 * 使用方法：
 * node scripts/test-baseline-cloud.js
 * 
 * 或通过云开发CLI：
 * tcb fn invoke carbon-baseline-query --params '{"mealType":"meat_simple","region":"east_china","energyType":"electric"}'
 */

const { execSync } = require('child_process');

/**
 * 调用云函数
 */
function invokeFunction(functionName, params) {
  try {
    const paramsStr = JSON.stringify(params);
    const command = `tcb fn invoke ${functionName} --params '${paramsStr}'`;
    const result = execSync(command, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    console.error(`调用云函数失败: ${functionName}`, error.message);
    return null;
  }
}

/**
 * 测试单条查询
 */
async function testSingleQuery() {
  console.log('\n=== 测试单条查询 ===');
  
  const testCases = [
    {
      mealType: 'meat_simple',
      region: 'east_china',
      energyType: 'electric'
    },
    {
      mealType: 'meat_full',
      region: 'north_china',
      energyType: 'gas'
    }
  ];
  
  for (const testCase of testCases) {
    const result = invokeFunction('carbon-baseline-query', testCase);
    if (result && result.success) {
      console.log(`✅ 查询成功: ${testCase.mealType} / ${testCase.region} / ${testCase.energyType}`);
      console.log(`   基准值: ${result.data.carbonFootprint.value} kg CO₂e`);
    } else {
      console.log(`❌ 查询失败: ${testCase.mealType} / ${testCase.region} / ${testCase.energyType}`);
    }
  }
}

/**
 * 测试批量查询
 */
async function testBatchQuery() {
  console.log('\n=== 测试批量查询 ===');
  
  const params = {
    action: 'batch',
    queries: [
      { mealType: 'meat_simple', region: 'east_china', energyType: 'electric' },
      { mealType: 'meat_simple', region: 'east_china', energyType: 'gas' },
      { mealType: 'meat_full', region: 'north_china', energyType: 'electric' }
    ]
  };
  
  const result = invokeFunction('carbon-baseline-query', params);
  if (result && result.success) {
    console.log(`✅ 批量查询成功: ${result.count} 条`);
    result.data.forEach((item, index) => {
      if (item.success) {
        console.log(`   ${index + 1}. ${item.data.baselineId}: ${item.data.carbonFootprint.value} kg CO₂e`);
      } else {
        console.log(`   ${index + 1}. 查询失败: ${item.error}`);
      }
    });
  } else {
    console.log('❌ 批量查询失败');
  }
}

/**
 * 测试数据完整性
 */
async function testDataIntegrity() {
  console.log('\n=== 测试数据完整性 ===');
  
  const result = invokeFunction('carbon-baseline-init', { action: 'check' });
  if (result && result.code === 0) {
    const check = result.results.check;
    console.log(`总数据量: ${check.total} 条`);
    console.log(`已存在: ${check.found} 条`);
    console.log(`缺失: ${check.missing} 条`);
    
    if (check.isComplete) {
      console.log('✅ 数据完整性检查通过');
    } else {
      console.log('⚠️  数据不完整，缺失的数据：');
      check.missingDetails.forEach(item => {
        console.log(`   - ${item.baselineId}`);
      });
    }
  } else {
    console.log('❌ 数据完整性检查失败');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('基准值查询功能测试（云函数）');
  console.log('========================================');
  
  // 检查是否已登录
  try {
    execSync('tcb login:check', { stdio: 'ignore' });
  } catch {
    console.error('❌ 未登录云开发，请先登录:');
    console.log('   tcb login');
    process.exit(1);
  }
  
  try {
    await testSingleQuery();
    await testBatchQuery();
    await testDataIntegrity();
    
    console.log('\n========================================');
    console.log('✅ 测试完成');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  testSingleQuery,
  testBatchQuery,
  testDataIntegrity
};

