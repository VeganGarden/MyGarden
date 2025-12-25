const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化食材规范库集合
 * 创建 ingredient_standards 和 ingredient_aliases 集合
 */
exports.main = async (event) => {
  const results = [];
  
  console.log('========================================');
  console.log('开始初始化食材规范库集合...');
  console.log('========================================\n');

  try {
    // 1. 创建 ingredient_standards 集合
    console.log('[1/2] 创建 ingredient_standards 集合...');
    try {
      await db.createCollection('ingredient_standards');
      results.push({
        collection: 'ingredient_standards',
        status: 'success',
        message: '集合创建成功'
      });
      console.log('✅ ingredient_standards 集合创建成功');
    } catch (error) {
      if (error.errCode === -1) {
        // 集合已存在
        results.push({
          collection: 'ingredient_standards',
          status: 'skipped',
          message: '集合已存在，跳过'
        });
        console.log('⚠️  ingredient_standards 集合已存在，跳过');
      } else {
        throw error;
      }
    }

    // 2. 创建 ingredient_aliases 集合
    console.log('[2/2] 创建 ingredient_aliases 集合...');
    try {
      await db.createCollection('ingredient_aliases');
      results.push({
        collection: 'ingredient_aliases',
        status: 'success',
        message: '集合创建成功'
      });
      console.log('✅ ingredient_aliases 集合创建成功');
    } catch (error) {
      if (error.errCode === -1) {
        // 集合已存在
        results.push({
          collection: 'ingredient_aliases',
          status: 'skipped',
          message: '集合已存在，跳过'
        });
        console.log('⚠️  ingredient_aliases 集合已存在，跳过');
      } else {
        throw error;
      }
    }

    console.log('\n========================================');
    console.log('食材规范库集合初始化完成');
    console.log('========================================\n');

    // 返回结果
    return {
      code: 0,
      message: '食材规范库集合初始化成功',
      summary: {
        totalCollections: 2,
        results: results
      }
    };

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    return {
      code: 500,
      message: '食材规范库集合初始化失败',
      error: error.message,
      results: results
    };
  }
};

