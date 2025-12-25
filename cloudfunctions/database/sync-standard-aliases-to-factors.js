const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入标准化服务模块
const standardizer = require('./ingredient-standardizer');

/**
 * 同步规范库的别名到因子库
 * 支持批量同步和按标准名称同步
 */
exports.main = async (event) => {
  const { subAction, data = {} } = event;
  const { standardNames } = data;

  console.log('========================================');
  console.log('同步规范库别名到因子库');
  console.log('========================================\n');

  try {
    let result;

    switch (subAction) {
      case 'syncAll':
        result = await syncAll();
        break;
      case 'syncByStandardName':
      case 'syncByStandardNames':
        if (standardNames && Array.isArray(standardNames) && standardNames.length > 0) {
          result = await syncByStandardNames(standardNames);
        } else if (data.standardName) {
          result = await syncByStandardName(data.standardName);
        } else {
          return {
            code: 400,
            message: '请提供standardName或standardNames参数'
          };
        }
        break;
      case 'syncIncremental':
        result = await syncIncremental();
        break;
      default:
        return {
          code: 400,
          message: '未知的subAction，支持: syncAll, syncByStandardName, syncByStandardNames, syncIncremental'
        };
    }

    return {
      code: 0,
      message: '同步完成',
      ...result
    };

  } catch (error) {
    console.error('❌ 同步失败:', error);
    return {
      code: 500,
      message: '同步失败',
      error: error.message
    };
  }
};

/**
 * 批量同步所有标准名称的别名
 */
async function syncAll() {
  console.log('📊 查询所有标准名称...');
  const standardsCollection = db.collection('ingredient_standards');
  
  const MAX_LIMIT = 1000;
  let allStandards = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const result = await standardsCollection
      .where({
        status: 'active'
      })
      .skip(skip)
      .limit(MAX_LIMIT)
      .get();

    if (result.data && result.data.length > 0) {
      allStandards = allStandards.concat(result.data);
      skip += result.data.length;
      hasMore = result.data.length === MAX_LIMIT;
    } else {
      hasMore = false;
    }
  }

  console.log(`   找到 ${allStandards.length} 个标准名称\n`);

  let totalSuccess = 0;
  let totalFailed = 0;
  const details = [];

  for (const standard of allStandards) {
    const syncResult = await standardizer.syncAliasesToFactors(standard.standardName);
    totalSuccess += syncResult.success || 0;
    totalFailed += syncResult.failed || 0;
    details.push({
      standardName: standard.standardName,
      ...syncResult
    });
  }

  return {
    summary: {
      totalStandards: allStandards.length,
      totalSuccess: totalSuccess,
      totalFailed: totalFailed
    },
    details: details
  };
}

/**
 * 同步指定标准名称的别名
 */
async function syncByStandardName(standardName) {
  console.log(`📝 同步标准名称: ${standardName}`);
  const syncResult = await standardizer.syncAliasesToFactors(standardName);
  return {
    standardName: standardName,
    ...syncResult
  };
}

/**
 * 批量同步多个标准名称的别名
 */
async function syncByStandardNames(standardNames) {
  console.log(`📝 批量同步 ${standardNames.length} 个标准名称`);
  
  let totalSuccess = 0;
  let totalFailed = 0;
  const details = [];

  for (const standardName of standardNames) {
    const syncResult = await standardizer.syncAliasesToFactors(standardName);
    totalSuccess += syncResult.success || 0;
    totalFailed += syncResult.failed || 0;
    details.push({
      standardName: standardName,
      ...syncResult
    });
  }

  return {
    summary: {
      totalStandards: standardNames.length,
      totalSuccess: totalSuccess,
      totalFailed: totalFailed
    },
    details: details
  };
}

/**
 * 增量同步（只同步最近变更的）
 * 注意：需要记录变更日志才能实现，这里暂时实现为同步所有
 */
async function syncIncremental() {
  console.log('📝 增量同步（暂时实现为同步所有）');
  return await syncAll();
}

