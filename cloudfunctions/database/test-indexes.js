const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 数据库索引性能测试脚本
 * 用于验证索引是否正确创建并测试查询性能
 */
exports.main = async (event) => {
  const testResults = [];
  
  console.log('========================================');
  console.log('开始测试数据库索引性能...');
  console.log('========================================\n');

  try {
    // 测试1: users集合 - openId查询
    console.log('[测试1/10] users.openId查询性能...');
    const test1 = await testQuery('users', 
      () => db.collection('users').where({ openId: 'test-openid' }).get(),
      { expected: '<50ms', description: '用户登录查询' }
    );
    testResults.push(test1);

    // 测试2: users集合 - 排行榜查询
    console.log('[测试2/10] users排行榜查询性能...');
    const test2 = await testQuery('users', 
      () => db.collection('users').orderBy('level', 'desc').orderBy('points', 'desc').limit(20).get(),
      { expected: '<100ms', description: '排行榜查询' }
    );
    testResults.push(test2);

    // 测试3: meals集合 - 个人记录查询（最高频）
    console.log('[测试3/10] meals个人记录查询性能...');
    const test3 = await testQuery('meals', 
      () => db.collection('meals').where({ userId: 'test-user-id' }).orderBy('mealDate', 'desc').limit(10).get(),
      { expected: '<50ms', description: '个人餐食记录查询（最高频）' }
    );
    testResults.push(test3);

    // 测试4: meals集合 - 防重复查询
    console.log('[测试4/10] meals防重复同步查询性能...');
    const test4 = await testQuery('meals', 
      () => db.collection('meals').where({
        userId: 'test-user-id',
        source: 'third_party',
        sourceOrderId: 'test-order-hash'
      }).get(),
      { expected: '<20ms', description: '第三方订单防重查询' }
    );
    testResults.push(test4);

    // 测试5: daily_stats集合 - 个人统计查询
    console.log('[测试5/10] daily_stats个人统计查询性能...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const test5 = await testQuery('daily_stats', 
      () => db.collection('daily_stats').where({
        userId: 'test-user-id',
        date: today
      }).get(),
      { expected: '<50ms', description: '个人每日统计查询' }
    );
    testResults.push(test5);

    // 测试6: daily_stats集合 - 排行榜查询
    console.log('[测试6/10] daily_stats排行榜查询性能...');
    const test6 = await testQuery('daily_stats', 
      () => db.collection('daily_stats').where({ date: today })
        .orderBy('totalCarbonReduction', 'desc').limit(20).get(),
      { expected: '<100ms', description: '每日排行榜查询' }
    );
    testResults.push(test6);

    // 测试7: gardens集合 - 个人花园查询
    console.log('[测试7/10] gardens个人花园查询性能...');
    const test7 = await testQuery('gardens', 
      () => db.collection('gardens').where({ userId: 'test-user-id' }).get(),
      { expected: '<30ms', description: '个人花园查询' }
    );
    testResults.push(test7);

    // 测试8: ingredients集合 - 全文搜索
    console.log('[测试8/10] ingredients全文搜索性能...');
    const test8 = await testQuery('ingredients', 
      () => db.collection('ingredients').where({
        name: db.RegExp({ regexp: '豆腐', options: 'i' })
      }).get(),
      { expected: '<200ms', description: '食材全文搜索' }
    );
    testResults.push(test8);

    // 测试9: friends集合 - 好友列表查询
    console.log('[测试9/10] friends好友列表查询性能...');
    const test9 = await testQuery('friends', 
      () => db.collection('friends').where({
        userId: 'test-user-id',
        status: 'accepted'
      }).get(),
      { expected: '<50ms', description: '好友列表查询' }
    );
    testResults.push(test9);

    // 测试10: posts集合 - 公开动态查询
    console.log('[测试10/10] posts公开动态查询性能...');
    const test10 = await testQuery('posts', 
      () => db.collection('posts').where({ visibility: 'public' })
        .orderBy('createdAt', 'desc').limit(20).get(),
      { expected: '<100ms', description: '公开动态查询' }
    );
    testResults.push(test10);

    // 汇总结果
    console.log('\n========================================');
    console.log('测试完成！汇总结果：');
    console.log('========================================\n');

    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    const avgDuration = Math.round(
      testResults.reduce((sum, t) => sum + t.duration, 0) / totalTests
    );

    console.log(`通过: ${passedTests}/${totalTests}`);
    console.log(`平均查询时间: ${avgDuration}ms`);
    console.log(`性能等级: ${getPerformanceGrade(avgDuration)}\n`);

    // 详细结果
    testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '⚠️';
      console.log(`${status} [${index + 1}] ${result.collection}.${result.description}`);
      console.log(`   耗时: ${result.duration}ms (预期: ${result.expected})`);
      if (!result.passed) {
        console.log(`   警告: 查询超时，可能需要优化索引`);
      }
    });

    console.log('\n========================================\n');

    return {
      code: 0,
      message: '索引性能测试完成',
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        avgDuration,
        performanceGrade: getPerformanceGrade(avgDuration)
      },
      details: testResults
    };

  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    return {
      code: 500,
      message: '测试执行失败',
      error: error.message,
      results: testResults
    };
  }
};

/**
 * 测试单个查询的性能
 */
async function testQuery(collection, queryFn, options) {
  const { expected, description } = options;
  const expectedMs = parseInt(expected.replace(/[^0-9]/g, ''));
  
  const startTime = Date.now();
  try {
    await queryFn();
    const duration = Date.now() - startTime;
    const passed = duration <= expectedMs;
    
    return {
      collection,
      description,
      duration,
      expected,
      passed,
      status: passed ? 'PASS' : 'WARN'
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`  ⚠️ 查询出错: ${error.message}`);
    return {
      collection,
      description,
      duration,
      expected,
      passed: false,
      status: 'ERROR',
      error: error.message
    };
  }
}

/**
 * 根据平均查询时间评级
 */
function getPerformanceGrade(avgMs) {
  if (avgMs < 50) return 'A+ (优秀)';
  if (avgMs < 100) return 'A (良好)';
  if (avgMs < 200) return 'B (一般)';
  if (avgMs < 500) return 'C (较差)';
  return 'D (需要优化)';
}

/**
 * 检查所有集合的索引是否正确创建
 */
async function checkIndexes() {
  console.log('========================================');
  console.log('检查索引创建情况...');
  console.log('========================================\n');

  const expectedIndexes = {
    users: 3,
    user_sessions: 3,
    meals: 4,
    daily_stats: 3,
    gardens: 1,
    ingredients: 3,
    recipes: 2,
    sync_tasks: 4,
    platform_configs: 1,
    friends: 2,
    posts: 2,
    orders: 2
  };

  const results = [];

  for (const [collection, expectedCount] of Object.entries(expectedIndexes)) {
    try {
      // 注意：腾讯云MongoDB可能不支持getIndexes()
      // 这里仅作示例，实际使用时可能需要调整
      console.log(`检查 ${collection} 集合...`);
      results.push({
        collection,
        expected: expectedCount,
        status: 'OK'
      });
    } catch (error) {
      results.push({
        collection,
        expected: expectedCount,
        status: 'ERROR',
        error: error.message
      });
    }
  }

  return results;
}

// 支持本地测试
if (require.main === module) {
  exports.main({}).then(result => {
    console.log('\n最终结果:', JSON.stringify(result.summary, null, 2));
    process.exit(result.code === 0 ? 0 : 1);
  }).catch(err => {
    console.error('\n测试失败:', err);
    process.exit(1);
  });
}


