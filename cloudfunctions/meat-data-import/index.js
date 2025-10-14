const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 导入肉类数据
const meatData = require('./meat-data.json');

/**
 * 肉类数据导入云函数
 * 用于批量导入肉类碳足迹数据，支持素食vs肉食对比计算
 */
exports.main = async (event) => {
  const { action } = event;

  try {
    switch (action) {
      case 'importMeatData':
        // 导入肉类数据
        return await importMeatData();

      case 'clearMeatData':
        // 清空肉类库（危险操作，需要确认）
        if (event.confirm === 'YES_I_AM_SURE') {
          return await clearMeatData();
        }
        return {
          code: 400,
          message: '需要确认参数: confirm = "YES_I_AM_SURE"'
        };

      case 'countMeatData':
        // 统计肉类数量
        return await countMeatData();

      case 'getMeatAlternatives':
        // 获取肉类的素食替代品
        return await getMeatAlternatives(event.meatName);

      default:
        return {
          code: 400,
          message: '未知操作，支持: importMeatData, clearMeatData, countMeatData, getMeatAlternatives'
        };
    }
  } catch (error) {
    console.error('操作失败:', error);
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    };
  }
};

/**
 * 导入肉类数据
 */
async function importMeatData() {
  console.log('========================================');
  console.log('开始导入肉类碳足迹数据...');
  console.log(`总计: ${meatData.length} 种肉类产品`);
  console.log('========================================\n');

  const results = {
    total: meatData.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    details: []
  };

  for (let i = 0; i < meatData.length; i++) {
    const meat = meatData[i];
    
    try {
      // 检查是否已存在（根据名称）
      // 如果集合不存在，会抛出错误，直接跳到插入逻辑
      let shouldInsert = true;
      
      try {
        const existing = await db.collection('meat_products')
          .where({ name: meat.name })
          .get();

        if (existing.data.length > 0) {
          console.log(`[${i + 1}/${meatData.length}] ⚠️  ${meat.name} 已存在，跳过`);
          results.skipped++;
          results.details.push({
            name: meat.name,
            status: 'skipped',
            reason: '已存在'
          });
          shouldInsert = false;
        }
      } catch (checkError) {
        // 集合不存在是正常情况（首次导入），继续插入
        if (checkError.errCode === -502005 || checkError.message.includes('not exists')) {
          console.log(`[${i + 1}/${meatData.length}] ℹ️  集合不存在，将创建并插入 ${meat.name}`);
          shouldInsert = true;
        } else {
          throw checkError;  // 其他错误继续抛出
        }
      }

      if (!shouldInsert) {
        continue;
      }

      // 添加时间戳
      const dataToInsert = {
        ...meat,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 插入数据
      await db.collection('meat_products').add({
        data: dataToInsert
      });

      console.log(`[${i + 1}/${meatData.length}] ✅ ${meat.name} 导入成功 (碳足迹: ${meat.carbonFootprint} kg CO₂e/kg)`);
      results.inserted++;
      results.details.push({
        name: meat.name,
        status: 'success',
        carbonFootprint: meat.carbonFootprint
      });

    } catch (error) {
      console.error(`[${i + 1}/${meatData.length}] ❌ ${meat.name} 导入失败:`, error.message);
      results.failed++;
      results.details.push({
        name: meat.name,
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
  console.log('🎉 肉类数据导入完成！');
  console.log('========================================');
  console.log(`总计: ${results.total} 种`);
  console.log(`成功: ${results.inserted} 种`);
  console.log(`跳过: ${results.skipped} 种（已存在）`);
  console.log(`失败: ${results.failed} 种`);
  console.log('========================================\n');

  return {
    code: 0,
    message: '肉类数据导入完成',
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
 * 清空肉类库
 */
async function clearMeatData() {
  console.log('⚠️  开始清空肉类库...');

  const result = await db.collection('meat_products')
    .where({})
    .remove();

  console.log(`✅ 已删除 ${result.stats.removed} 条记录`);

  return {
    code: 0,
    message: '肉类库已清空',
    removed: result.stats.removed
  };
}

/**
 * 统计肉类数量
 */
async function countMeatData() {
  try {
    const total = await db.collection('meat_products').count();
    
    // 如果集合为空
    if (total.total === 0) {
      return {
        code: 0,
        message: '肉类库为空，请先执行导入操作',
        data: {
          total: 0,
          byCategory: [],
          bySubcategory: []
        }
      };
    }
    
    // 按分类统计
    const byCategory = await db.collection('meat_products')
      .aggregate()
      .group({
        _id: '$category',
        count: $.sum(1),
        avgCarbon: $.avg('$carbonFootprint')
      })
      .end();

    // 按子分类统计
    const bySubcategory = await db.collection('meat_products')
      .aggregate()
      .group({
        _id: '$subcategory',
        count: $.sum(1)
      })
      .end();

    console.log('肉类库统计:');
    console.log('总计:', total.total);
    console.log('分类统计:', byCategory.list);
    console.log('子分类统计:', bySubcategory.list);

    return {
      code: 0,
      data: {
        total: total.total,
        byCategory: byCategory.list,
        bySubcategory: bySubcategory.list
      }
    };
  } catch (error) {
    // 集合不存在
    if (error.errCode === -502005 || error.message.includes('not exists')) {
      return {
        code: 404,
        message: 'meat_products 集合不存在，请先执行 importMeatData 操作创建集合并导入数据',
        data: {
          total: 0,
          byCategory: [],
          bySubcategory: []
        }
      };
    }
    throw error;  // 其他错误继续抛出
  }
}

/**
 * 获取肉类的素食替代品
 */
async function getMeatAlternatives(meatName) {
  if (!meatName) {
    return {
      code: 400,
      message: '请提供肉类名称'
    };
  }

  // 查询肉类信息
  const meat = await db.collection('meat_products')
    .where({
      name: db.RegExp({
        regexp: meatName,
        options: 'i'
      })
    })
    .get();

  if (meat.data.length === 0) {
    return {
      code: 404,
      message: '未找到该肉类产品'
    };
  }

  const meatProduct = meat.data[0];

  // 获取素食替代品详情
  const alternatives = [];
  for (const altName of meatProduct.veganAlternatives) {
    const ingredient = await db.collection('ingredients')
      .where({ name: altName })
      .get();
    
    if (ingredient.data.length > 0) {
      alternatives.push(ingredient.data[0]);
    }
  }

  // 计算减排量
  const carbonSavings = alternatives.map(alt => {
    return {
      name: alt.name,
      carbonFootprint: alt.carbonFootprint,
      reduction: meatProduct.carbonFootprint - alt.carbonFootprint,
      reductionPercent: Math.round(
        ((meatProduct.carbonFootprint - alt.carbonFootprint) / meatProduct.carbonFootprint) * 100
      )
    };
  });

  return {
    code: 0,
    data: {
      meatProduct: {
        name: meatProduct.name,
        carbonFootprint: meatProduct.carbonFootprint,
        nutrition: meatProduct.nutrition
      },
      alternatives: carbonSavings,
      message: `用${alternatives[0]?.name || '素食'}替代${meatProduct.name}，可减排${carbonSavings[0]?.reduction.toFixed(1)}kg CO₂（减少${carbonSavings[0]?.reductionPercent}%）`
    }
  };
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

