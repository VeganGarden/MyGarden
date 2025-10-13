const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 导入食材数据
const ingredientsData = require('./ingredients-data.json');

/**
 * 数据导入云函数
 * 用于批量导入食材库、食谱等基础数据
 */
exports.main = async (event) => {
  const { action } = event;

  try {
    switch (action) {
      case 'importIngredients':
        // 导入食材数据
        return await importIngredients();

      case 'clearIngredients':
        // 清空食材库（危险操作，需要确认）
        if (event.confirm === 'YES_I_AM_SURE') {
          return await clearIngredients();
        }
        return {
          code: 400,
          message: '需要确认参数: confirm = "YES_I_AM_SURE"'
        };

      case 'countIngredients':
        // 统计食材数量
        return await countIngredients();

      default:
        return {
          code: 400,
          message: '未知操作，支持: importIngredients, clearIngredients, countIngredients'
        };
    }
  } catch (error) {
    console.error('数据导入失败:', error);
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    };
  }
};

/**
 * 导入食材数据
 */
async function importIngredients() {
  console.log('========================================');
  console.log('开始导入食材数据...');
  console.log(`总计: ${ingredientsData.length} 种食材`);
  console.log('========================================\n');

  const results = {
    total: ingredientsData.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    details: []
  };

  for (let i = 0; i < ingredientsData.length; i++) {
    const ingredient = ingredientsData[i];
    
    try {
      // 检查是否已存在（根据名称）
      const existing = await db.collection('ingredients')
        .where({ name: ingredient.name })
        .get();

      if (existing.data.length > 0) {
        console.log(`[${i + 1}/${ingredientsData.length}] ⚠️  ${ingredient.name} 已存在，跳过`);
        results.skipped++;
        results.details.push({
          name: ingredient.name,
          status: 'skipped',
          reason: '已存在'
        });
        continue;
      }

      // 添加时间戳
      const dataToInsert = {
        ...ingredient,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 插入数据
      await db.collection('ingredients').add({
        data: dataToInsert
      });

      console.log(`[${i + 1}/${ingredientsData.length}] ✅ ${ingredient.name} 导入成功`);
      results.inserted++;
      results.details.push({
        name: ingredient.name,
        status: 'success'
      });

    } catch (error) {
      console.error(`[${i + 1}/${ingredientsData.length}] ❌ ${ingredient.name} 导入失败:`, error.message);
      results.failed++;
      results.details.push({
        name: ingredient.name,
        status: 'failed',
        error: error.message
      });
    }

    // 每10条休息一下，避免超时
    if ((i + 1) % 10 === 0) {
      await sleep(100);
    }
  }

  console.log('\n========================================');
  console.log('🎉 食材数据导入完成！');
  console.log('========================================');
  console.log(`总计: ${results.total} 种`);
  console.log(`成功: ${results.inserted} 种`);
  console.log(`跳过: ${results.skipped} 种（已存在）`);
  console.log(`失败: ${results.failed} 种`);
  console.log('========================================\n');

  return {
    code: 0,
    message: '食材数据导入完成',
    summary: {
      total: results.total,
      inserted: results.inserted,
      skipped: results.skipped,
      failed: results.failed
    },
    details: results.details
  };
}

/**
 * 清空食材库
 */
async function clearIngredients() {
  console.log('⚠️  开始清空食材库...');

  const result = await db.collection('ingredients')
    .where({})
    .remove();

  console.log(`✅ 已删除 ${result.stats.removed} 条记录`);

  return {
    code: 0,
    message: '食材库已清空',
    removed: result.stats.removed
  };
}

/**
 * 统计食材数量
 */
async function countIngredients() {
  const total = await db.collection('ingredients').count();
  
  // 按分类统计
  const byCategory = await db.collection('ingredients')
    .aggregate()
    .group({
      _id: '$category',
      count: $.sum(1)
    })
    .end();

  console.log('食材库统计:');
  console.log('总计:', total.total);
  console.log('分类统计:', byCategory.list);

  return {
    code: 0,
    data: {
      total: total.total,
      byCategory: byCategory.list
    }
  };
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

