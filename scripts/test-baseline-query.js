/**
 * 测试基准值查询功能
 * 
 * 使用方法：
 * node scripts/test-baseline-query.js
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloud.init({
  env: process.env.TCB_ENV || 'your-env-id',
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();

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
    try {
      const result = await db.collection('carbon_baselines')
        .where({
          'category.mealType': testCase.mealType,
          'category.region': testCase.region,
          'category.energyType': testCase.energyType,
          status: 'active'
        })
        .orderBy('version', 'desc')
        .limit(1)
        .get();
      
      if (result.data.length > 0) {
        console.log(`✅ 查询成功: ${testCase.mealType} / ${testCase.region} / ${testCase.energyType}`);
        console.log(`   基准值: ${result.data[0].carbonFootprint.value} kg CO₂e`);
      } else {
        console.log(`❌ 未找到: ${testCase.mealType} / ${testCase.region} / ${testCase.energyType}`);
      }
    } catch (error) {
      console.error(`❌ 查询失败:`, error);
    }
  }
}

/**
 * 测试批量查询
 */
async function testBatchQuery() {
  console.log('\n=== 测试批量查询 ===');
  
  const queries = [
    { mealType: 'meat_simple', region: 'east_china', energyType: 'electric' },
    { mealType: 'meat_simple', region: 'east_china', energyType: 'gas' },
    { mealType: 'meat_full', region: 'north_china', energyType: 'electric' }
  ];
  
  try {
    const results = await Promise.all(
      queries.map(async (query) => {
        const result = await db.collection('carbon_baselines')
          .where({
            'category.mealType': query.mealType,
            'category.region': query.region,
            'category.energyType': query.energyType,
            status: 'active'
          })
          .orderBy('version', 'desc')
          .limit(1)
          .get();
        
        return {
          query,
          result: result.data.length > 0 ? result.data[0] : null
        };
      })
    );
    
    results.forEach(({ query, result }) => {
      if (result) {
        console.log(`✅ ${query.mealType} / ${query.region} / ${query.energyType}: ${result.carbonFootprint.value} kg CO₂e`);
      } else {
        console.log(`❌ ${query.mealType} / ${query.region} / ${query.energyType}: 未找到`);
      }
    });
  } catch (error) {
    console.error('❌ 批量查询失败:', error);
  }
}

/**
 * 测试数据完整性
 */
async function testDataIntegrity() {
  console.log('\n=== 测试数据完整性 ===');
  
  const regions = ['north_china', 'northeast', 'east_china', 'central_china', 'northwest', 'south_china'];
  const mealTypes = ['meat_simple', 'meat_full'];
  const energyTypes = ['electric', 'gas'];
  
  let total = 0;
  let found = 0;
  
  for (const region of regions) {
    for (const mealType of mealTypes) {
      for (const energyType of energyTypes) {
        total++;
        const result = await db.collection('carbon_baselines')
          .where({
            'category.mealType': mealType,
            'category.region': region,
            'category.energyType': energyType,
            status: 'active'
          })
          .count();
        
        if (result.total > 0) {
          found++;
        }
      }
    }
  }
  
  console.log(`总数据量: ${total} 条`);
  console.log(`已存在: ${found} 条`);
  console.log(`缺失: ${total - found} 条`);
  
  if (found === total) {
    console.log('✅ 数据完整性检查通过');
  } else {
    console.log('⚠️  数据不完整，请运行初始化脚本');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('基准值查询功能测试');
  console.log('========================================');
  
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

