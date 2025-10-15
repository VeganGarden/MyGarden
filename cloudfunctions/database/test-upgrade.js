const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 数据库升级测试脚本
 * 
 * 功能：验证 v2.0 升级是否成功
 * 
 * 测试项：
 * 1. 验证新集合是否创建成功
 * 2. 验证现有集合是否成功添加新字段
 * 3. 性能测试
 */

exports.main = async (event) => {
  const results = {
    timestamp: new Date(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  console.log('========================================');
  console.log('数据库升级测试 v2.0');
  console.log('========================================\n');

  try {
    // 测试1：验证新集合
    console.log('[测试1] 验证新集合是否创建成功...\n');
    const newCollectionsTest = await testNewCollections();
    results.tests.push(newCollectionsTest);
    
    // 测试2：验证字段扩充
    console.log('\n[测试2] 验证现有集合字段扩充...\n');
    const fieldMigrationTest = await testFieldMigration();
    results.tests.push(fieldMigrationTest);
    
    // 测试3：数据插入测试
    console.log('\n[测试3] 测试数据插入...\n');
    const dataInsertTest = await testDataInsert();
    results.tests.push(dataInsertTest);
    
    // 测试4：查询性能测试
    console.log('\n[测试4] 查询性能测试...\n');
    const performanceTest = await testPerformance();
    results.tests.push(performanceTest);

    // 统计结果
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status === 'passed').length;
    results.summary.failed = results.tests.filter(t => t.status === 'failed').length;

    console.log('\n========================================');
    console.log('测试总结');
    console.log('========================================');
    console.log(`总计: ${results.summary.total} 项测试`);
    console.log(`通过: ${results.summary.passed} 项 ✅`);
    console.log(`失败: ${results.summary.failed} 项 ❌`);
    console.log('========================================\n');

    return {
      code: results.summary.failed === 0 ? 0 : 500,
      message: results.summary.failed === 0 ? '所有测试通过' : '部分测试失败',
      ...results
    };

  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    return {
      code: 500,
      message: '测试执行失败',
      error: error.message
    };
  }
};

/**
 * 测试1：验证新集合
 */
async function testNewCollections() {
  const expectedCollections = [
    'practitioners',
    'practitioner_certifications',
    'tcm_wisdom',
    'wisdom_quotes',
    'mentorship',
    'user_profiles_extended',
    'knowledge_graph'
  ];
  
  const testResults = [];
  
  for (const collName of expectedCollections) {
    try {
      const count = await db.collection(collName).count();
      console.log(`  ✅ ${collName}: 存在（${count.total} 条记录）`);
      testResults.push({ collection: collName, exists: true, count: count.total });
    } catch (error) {
      console.log(`  ❌ ${collName}: 不存在或无法访问`);
      testResults.push({ collection: collName, exists: false, error: error.message });
    }
  }
  
  const allPassed = testResults.every(r => r.exists);
  
  return {
    testName: '新集合验证',
    status: allPassed ? 'passed' : 'failed',
    details: testResults,
    summary: `${testResults.filter(r => r.exists).length}/${expectedCollections.length} 个集合创建成功`
  };
}

/**
 * 测试2：验证字段扩充
 */
async function testFieldMigration() {
  const tests = [];
  
  // 测试 ingredients 新字段
  try {
    const ingredient = await db.collection('ingredients').limit(1).get();
    if (ingredient.data.length > 0) {
      const doc = ingredient.data[0];
      const hasNewFields = 
        doc.hasOwnProperty('practitionerTestimonials') &&
        doc.hasOwnProperty('tcmProperties') &&
        doc.hasOwnProperty('practiceWisdom');
      
      if (hasNewFields) {
        console.log('  ✅ ingredients: 新字段已添加');
        tests.push({ collection: 'ingredients', status: 'passed' });
      } else {
        console.log('  ❌ ingredients: 新字段缺失');
        tests.push({ collection: 'ingredients', status: 'failed', reason: '新字段缺失' });
      }
    } else {
      console.log('  ℹ️  ingredients: 集合为空，无法验证');
      tests.push({ collection: 'ingredients', status: 'skipped', reason: '集合为空' });
    }
  } catch (error) {
    console.log('  ❌ ingredients: 验证失败');
    tests.push({ collection: 'ingredients', status: 'failed', error: error.message });
  }
  
  // 测试 recipes 新字段
  try {
    const recipe = await db.collection('recipes').limit(1).get();
    if (recipe.data.length > 0) {
      const doc = recipe.data[0];
      const hasNewFields = 
        doc.hasOwnProperty('certification') &&
        doc.hasOwnProperty('practiceData') &&
        doc.hasOwnProperty('tcmWisdom');
      
      if (hasNewFields) {
        console.log('  ✅ recipes: 新字段已添加');
        tests.push({ collection: 'recipes', status: 'passed' });
      } else {
        console.log('  ❌ recipes: 新字段缺失');
        tests.push({ collection: 'recipes', status: 'failed', reason: '新字段缺失' });
      }
    } else {
      console.log('  ℹ️  recipes: 集合为空，无法验证');
      tests.push({ collection: 'recipes', status: 'skipped', reason: '集合为空' });
    }
  } catch (error) {
    console.log('  ❌ recipes: 验证失败');
    tests.push({ collection: 'recipes', status: 'failed', error: error.message });
  }
  
  // 测试 users 新字段
  try {
    const user = await db.collection('users').limit(1).get();
    if (user.data.length > 0) {
      const doc = user.data[0];
      const hasNewFields = 
        doc.hasOwnProperty('isPractitioner') &&
        doc.hasOwnProperty('practitionerProfile') &&
        doc.hasOwnProperty('bodyType');
      
      if (hasNewFields) {
        console.log('  ✅ users: 新字段已添加');
        tests.push({ collection: 'users', status: 'passed' });
      } else {
        console.log('  ❌ users: 新字段缺失');
        tests.push({ collection: 'users', status: 'failed', reason: '新字段缺失' });
      }
    } else {
      console.log('  ℹ️  users: 集合为空，无法验证');
      tests.push({ collection: 'users', status: 'skipped', reason: '集合为空' });
    }
  } catch (error) {
    console.log('  ❌ users: 验证失败');
    tests.push({ collection: 'users', status: 'failed', error: error.message });
  }
  
  const allPassed = tests.every(t => t.status === 'passed' || t.status === 'skipped');
  
  return {
    testName: '字段扩充验证',
    status: allPassed ? 'passed' : 'failed',
    details: tests
  };
}

/**
 * 测试3：数据插入测试
 */
async function testDataInsert() {
  const tests = [];
  
  // 测试插入 practitioner
  try {
    console.log('  🧪 测试插入 practitioner...');
    const testDoc = {
      practitionerId: 'test_practitioner_001',
      profile: {
        realName: '测试践行者',
        age: 35,
        gender: 'male',
        occupation: '工程师',
        location: '北京',
        avatar: '',
        isPublic: true
      },
      veganJourney: {
        startDate: new Date('2015-01-01'),
        veganYears: 10,
        veganType: 'pure_vegan',
        story: {
          trigger: '测试触发事件',
          process: '测试转素过程',
          challenges: ['测试挑战1', '测试挑战2'],
          solutions: ['测试解决方案1'],
          keyMoments: []
        }
      },
      practices: {
        dailyMeals: {
          breakfast: '测试早餐',
          lunch: '测试午餐',
          dinner: '测试晚餐',
          snacks: '测试零食'
        },
        topIngredients: [],
        topRecipes: [],
        seasonalAdjustments: {}
      },
      healthChanges: {
        medicalReports: [],
        subjectiveChanges: {},
        diseaseImprovements: []
      },
      uniqueWisdom: {
        corePhilosophy: '测试哲学',
        goldenRules: ['规则1', '规则2', '规则3'],
        uniqueSecrets: [],
        adviceToNewcomers: '测试建议',
        deepThoughts: '测试思考',
        futureVision: '测试愿景'
      },
      certification: {
        level: 'diamond',
        certifiedAt: new Date(),
        certifiedBy: 'admin',
        canBeMentor: true,
        specialties: ['中餐', '营养'],
        mentoredCount: 0
      },
      contributions: {
        recipesShared: 0,
        questionsAnswered: 0,
        articlesWritten: 0,
        videosRecorded: 0
      },
      media: {
        profileVideo: '',
        cookingVideos: [],
        photos: [],
        voiceRecords: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const insertResult = await db.collection('practitioners').add({ data: testDoc });
    console.log(`  ✅ practitioner 插入成功: ${insertResult._id}`);
    
    // 立即删除测试数据
    await db.collection('practitioners').doc(insertResult._id).remove();
    console.log(`  🗑️  测试数据已清理`);
    
    tests.push({ collection: 'practitioners', status: 'passed' });
  } catch (error) {
    console.log(`  ❌ practitioner 插入失败: ${error.message}`);
    tests.push({ collection: 'practitioners', status: 'failed', error: error.message });
  }
  
  // 测试插入 tcm_wisdom
  try {
    console.log('  🧪 测试插入 tcm_wisdom...');
    const testDoc = {
      wisdomId: 'test_tcm_001',
      wisdomType: 'body_type',
      bodyType: {
        type: '阳虚',
        name: '阳虚体质',
        description: '测试描述',
        symptoms: ['怕冷', '手脚凉'],
        dietGuidance: {
          recommended: [],
          avoid: [],
          recommendedRecipes: [],
          keyPoints: []
        },
        practitionerCases: []
      },
      sources: [],
      verifiedBy: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const insertResult = await db.collection('tcm_wisdom').add({ data: testDoc });
    console.log(`  ✅ tcm_wisdom 插入成功: ${insertResult._id}`);
    
    await db.collection('tcm_wisdom').doc(insertResult._id).remove();
    console.log(`  🗑️  测试数据已清理`);
    
    tests.push({ collection: 'tcm_wisdom', status: 'passed' });
  } catch (error) {
    console.log(`  ❌ tcm_wisdom 插入失败: ${error.message}`);
    tests.push({ collection: 'tcm_wisdom', status: 'failed', error: error.message });
  }
  
  const allPassed = tests.every(t => t.status === 'passed');
  
  return {
    testName: '数据插入测试',
    status: allPassed ? 'passed' : 'failed',
    details: tests
  };
}

/**
 * 测试4：性能测试
 */
async function testPerformance() {
  const tests = [];
  
  // 测试 practitioners 查询性能
  try {
    console.log('  ⏱️  测试 practitioners 查询性能...');
    const start = Date.now();
    const result = await db.collection('practitioners')
      .where({ status: 'active' })
      .limit(20)
      .get();
    const duration = Date.now() - start;
    
    const passed = duration < 100;
    console.log(`  ${passed ? '✅' : '⚠️'} 查询耗时: ${duration}ms ${passed ? '(目标<100ms)' : '(超出目标)'}`);
    
    tests.push({
      query: 'practitioners.find({status:active}).limit(20)',
      duration,
      target: 100,
      passed
    });
  } catch (error) {
    console.log(`  ❌ 性能测试失败: ${error.message}`);
    tests.push({
      query: 'practitioners查询',
      status: 'failed',
      error: error.message
    });
  }
  
  // 测试 ingredients 查询性能
  try {
    console.log('  ⏱️  测试 ingredients 查询性能（含新字段）...');
    const start = Date.now();
    const result = await db.collection('ingredients')
      .where({ category: 'vegetables' })
      .limit(20)
      .get();
    const duration = Date.now() - start;
    
    const passed = duration < 100;
    console.log(`  ${passed ? '✅' : '⚠️'} 查询耗时: ${duration}ms ${passed ? '(目标<100ms)' : '(超出目标)'}`);
    
    tests.push({
      query: 'ingredients.find({category:vegetables}).limit(20)',
      duration,
      target: 100,
      passed
    });
  } catch (error) {
    console.log(`  ❌ 性能测试失败: ${error.message}`);
    tests.push({
      query: 'ingredients查询',
      status: 'failed',
      error: error.message
    });
  }
  
  const allPassed = tests.every(t => t.passed !== false);
  
  return {
    testName: '查询性能测试',
    status: allPassed ? 'passed' : 'warning',
    details: tests,
    note: '部分查询超时可通过创建索引优化'
  };
}

// 支持本地测试
if (require.main === module) {
  exports.main({}).then(result => {
    console.log('\n详细结果:', JSON.stringify(result, null, 2));
    process.exit(result.code);
  }).catch(err => {
    console.error('\n执行失败:', err);
    process.exit(1);
  });
}

