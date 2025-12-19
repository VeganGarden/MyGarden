/**
 * 初始化一餐饭基准值数据库集合
 * 
 * 功能：
 * 1. 创建 meal_set_baselines 集合
 * 2. 创建所有必要的索引
 * 
 * 调用方式：
 * node scripts/init-meal-set-baselines-collection.js
 * 或通过 database 云函数调用
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 创建索引
 */
async function createIndexes() {
  const collectionName = 'meal_set_baselines';
  console.log(`\n开始为 ${collectionName} 创建索引...\n`);

  const indexes = [
    {
      name: '主查询索引',
      index: {
        'category.mealTime': 1,
        'category.region': 1,
        'category.energyType': 1,
        status: 1
      }
    },
    {
      name: '区域饮食习惯索引',
      index: {
        'category.region': 1,
        'category.hasSoup': 1,
        status: 1
      }
    },
    {
      name: '餐次类型索引',
      index: {
        'category.mealTime': 1,
        'category.mealStructure': 1,
        status: 1
      }
    },
    {
      name: 'baselineId唯一索引',
      index: {
        baselineId: 1
      },
      unique: true
    },
    {
      name: '版本查询索引',
      index: {
        version: 1,
        status: 1
      }
    },
    {
      name: '时间范围查询索引',
      index: {
        effectiveDate: 1,
        expiryDate: 1
      }
    },
    {
      name: '使用状态索引',
      index: {
        'usage.isForCalculation': 1,
        'usage.researchStatus': 1,
        status: 1
      }
    },
    {
      name: '创建时间索引',
      index: {
        createdAt: -1
      }
    }
  ];

  const results = [];
  
  for (let i = 0; i < indexes.length; i++) {
    const idx = indexes[i];
    try {
      console.log(`[${i + 1}/${indexes.length}] 创建索引: ${idx.name}`);
      
      // 检查索引是否已存在
      const existingIndexes = await db.collection(collectionName)
        .getIndexes();
      
      const indexName = idx.name;
      const indexExists = existingIndexes.indexes.some(
        existing => existing.name === indexName
      );
      
      if (indexExists) {
        console.log(`  ⚠️  索引已存在，跳过: ${indexName}`);
        results.push({
          index: indexName,
          status: 'skipped',
          message: '索引已存在'
        });
        continue;
      }
      
      // 创建索引
      if (idx.unique) {
        await db.collection(collectionName)
          .createIndex({
            ...idx.index,
            unique: true
          }, {
            name: indexName
          });
      } else {
        await db.collection(collectionName)
          .createIndex(idx.index, {
            name: indexName
          });
      }
      
      console.log(`  ✅ 索引创建成功: ${indexName}`);
      results.push({
        index: indexName,
        status: 'success'
      });
    } catch (error) {
      console.error(`  ❌ 索引创建失败: ${idx.name}`, error.message);
      results.push({
        index: idx.name,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  console.log('========================================');
  console.log('初始化一餐饭基准值数据库集合');
  console.log('========================================\n');

  try {
    const collectionName = 'meal_set_baselines';

    // 1. 检查集合是否存在
    console.log(`检查集合 ${collectionName} 是否存在...`);
    try {
      const collectionInfo = await db.collection(collectionName).limit(1).get();
      console.log(`✅ 集合 ${collectionName} 已存在`);
    } catch (error) {
      // 集合不存在，创建集合（通过插入一条数据来创建）
      console.log(`集合 ${collectionName} 不存在，将通过插入示例数据创建...`);
      // 注意：腾讯云数据库不需要显式创建集合，插入数据时会自动创建
    }

    // 2. 创建索引
    const indexResults = await createIndexes();

    // 3. 统计结果
    const successCount = indexResults.filter(r => r.status === 'success').length;
    const skippedCount = indexResults.filter(r => r.status === 'skipped').length;
    const failedCount = indexResults.filter(r => r.status === 'failed').length;

    console.log('\n========================================');
    console.log('索引创建完成');
    console.log(`成功: ${successCount} 个`);
    console.log(`跳过: ${skippedCount} 个`);
    console.log(`失败: ${failedCount} 个`);
    console.log('========================================\n');

    return {
      success: true,
      code: 0,
      message: '一餐饭基准值数据库集合初始化完成',
      data: {
        collection: collectionName,
        indexes: indexResults,
        summary: {
          total: indexResults.length,
          success: successCount,
          skipped: skippedCount,
          failed: failedCount
        }
      }
    };
  } catch (error) {
    console.error('初始化失败:', error);
    return {
      success: false,
      code: 1,
      error: error.message || '初始化失败',
      stack: error.stack
    };
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  exports.main({}, {}).then(result => {
    console.log('\n执行结果:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

