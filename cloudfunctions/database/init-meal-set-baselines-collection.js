/**
 * 一餐饭基准值数据库集合初始化脚本（修复版）
 * 
 * 功能：
 * 1. 创建 meal_set_baselines 集合
 * 2. 提供索引配置信息（需要在控制台手动创建）
 * 
 * 使用方法：
 * 通过 database 云函数调用：
 * {
 *   action: "initMealSetBaselinesCollection"
 * }
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 生成索引配置信息
 * 注意：腾讯云开发数据库不支持通过代码创建索引，所有索引需要在控制台手动创建
 */
function getIndexConfigs() {
  return [
    {
      name: '主查询索引',
      index: {
        'category.mealTime': 1,
        'category.region': 1,
        'category.energyType': 1,
        status: 1
      },
      unique: false
    },
    {
      name: '区域饮食习惯索引',
      index: {
        'category.region': 1,
        'category.hasSoup': 1,
        status: 1
      },
      unique: false
    },
    {
      name: '餐次类型索引',
      index: {
        'category.mealTime': 1,
        'category.mealStructure': 1,
        status: 1
      },
      unique: false
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
      },
      unique: false
    },
    {
      name: '时间范围查询索引',
      index: {
        effectiveDate: 1,
        expiryDate: 1
      },
      unique: false
    },
    {
      name: '使用状态索引',
      index: {
        'usage.isForCalculation': 1,
        'usage.researchStatus': 1,
        status: 1
      },
      unique: false
    },
    {
      name: '创建时间索引',
      index: {
        createdAt: -1
      },
      unique: false
    }
  ];
}

/**
 * 格式化索引配置为可读格式
 */
function formatIndexConfig(config) {
  const fields = Object.keys(config.index).map(field => {
    const direction = config.index[field] === 1 ? '升序' : '降序';
    return `${field} (${direction})`;
  }).join(', ');
  
  return {
    name: config.name,
    fields: config.index,
    unique: config.unique || false,
    description: `字段: ${fields}${config.unique ? ', 唯一索引' : ''}`
  };
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

    // 1. 创建集合（通过插入一条临时数据然后删除来创建）
    console.log(`创建集合 ${collectionName}...`);
    try {
      // 尝试插入一条临时数据来创建集合
      const tempDoc = {
        _temp: true,
        createdAt: new Date()
      };
      const addResult = await db.collection(collectionName).add({ data: tempDoc });
      // 删除临时数据
      await db.collection(collectionName).doc(addResult._id).remove();
      console.log(`✅ 集合 ${collectionName} 创建成功`);
    } catch (error) {
      // 如果集合已存在或创建失败，检查是否已存在
      try {
        await db.collection(collectionName).limit(1).get();
        console.log(`ℹ️  集合 ${collectionName} 已存在`);
      } catch (checkError) {
        console.error(`❌ 集合 ${collectionName} 创建失败:`, error.message);
        throw error;
      }
    }

    // 2. 生成索引配置信息
    console.log('\n========================================');
    console.log('索引配置信息');
    console.log('========================================\n');
    
    console.log('⚠️  重要提示：腾讯云开发数据库不支持通过代码创建索引');
    console.log('所有索引需要在控制台手动创建。\n');
    
    const indexConfigs = getIndexConfigs();
    const indexResults = indexConfigs.map(formatIndexConfig);
    
    console.log(`📋 需要手动创建 ${indexResults.length} 个索引：\n`);
    
    indexResults.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.name}`);
      console.log(`   ${result.description}`);
      console.log('');
    });

    console.log('📖 参考文档：');
    console.log('   - Docs/一餐饭基准值数据库初始化指南.md');
    console.log('   - 索引配置表.csv（meal_set_baselines 相关索引）');
    console.log('');
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
          needsManual: indexResults.length
        },
        note: '所有索引需要在控制台手动创建'
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

