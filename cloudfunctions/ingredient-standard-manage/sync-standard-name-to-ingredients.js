const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入标准化服务模块
const standardizer = require('./ingredient-standardizer');

/**
 * 同步规范库的标准名称到ingredients库
 * 支持批量同步、按标准名称同步、一致性检查
 */
exports.main = async (event) => {
  const { subAction, data = {} } = event;
  const { standardNames, oldStandardName, newStandardName } = data;

  console.log('========================================');
  console.log('同步规范库标准名称到ingredients库');
  console.log('========================================\n');

  try {
    let result;

    switch (subAction) {
      case 'syncAll':
        result = await syncAll();
        break;
      case 'syncByStandardName':
        if (oldStandardName && newStandardName) {
          result = await standardizer.syncStandardNameToIngredients(oldStandardName, newStandardName);
        } else {
          return {
            code: 400,
            message: '请提供oldStandardName和newStandardName参数'
          };
        }
        break;
      case 'syncByStandardNames':
        if (standardNames && Array.isArray(standardNames) && standardNames.length > 0) {
          result = await syncByStandardNames(standardNames);
        } else {
          return {
            code: 400,
            message: '请提供standardNames参数'
          };
        }
        break;
      case 'checkConsistency':
        result = await checkConsistency();
        break;
      default:
        return {
          code: 400,
          message: '未知的subAction，支持: syncAll, syncByStandardName, syncByStandardNames, checkConsistency'
        };
    }

    return {
      code: 0,
      message: '操作完成',
      ...result
    };

  } catch (error) {
    console.error('❌ 操作失败:', error);
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    };
  }
};

/**
 * 批量同步所有标准名称（用于修复数据不一致）
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

  let totalUpdated = 0;
  let totalFailed = 0;
  const details = [];

  // 对于每个标准名称，检查ingredients库中是否有不一致的记录
  const ingredientsCollection = db.collection('ingredients');
  
  for (const standard of allStandards) {
    try {
      // 查找所有使用该标准名称的ingredients记录
      const ingredients = await ingredientsCollection
        .where({
          standardName: standard.standardName
        })
        .get();

      // 检查是否需要更新（确保isStandardized为true）
      let updated = 0;
      let failed = 0;

      for (const ingredient of ingredients.data) {
        if (!ingredient.isStandardized || ingredient.standardName !== standard.standardName) {
          try {
            await ingredientsCollection.doc(ingredient._id).update({
              data: {
                standardName: standard.standardName,
                isStandardized: true,
                standardizedAt: new Date(),
                updatedAt: new Date()
              }
            });
            updated++;
          } catch (error) {
            failed++;
          }
        }
      }

      totalUpdated += updated;
      totalFailed += failed;
      details.push({
        standardName: standard.standardName,
        updated: updated,
        failed: failed
      });
    } catch (error) {
      console.error(`❌ 处理标准名称 ${standard.standardName} 失败:`, error.message);
      totalFailed++;
    }
  }

  return {
    summary: {
      totalStandards: allStandards.length,
      totalUpdated: totalUpdated,
      totalFailed: totalFailed
    },
    details: details
  };
}

/**
 * 批量同步多个标准名称
 */
async function syncByStandardNames(standardNames) {
  console.log(`📝 批量同步 ${standardNames.length} 个标准名称`);
  
  let totalUpdated = 0;
  let totalFailed = 0;
  const details = [];
  const ingredientsCollection = db.collection('ingredients');

  for (const standardName of standardNames) {
    try {
      const ingredients = await ingredientsCollection
        .where({
          standardName: standardName
        })
        .get();

      let updated = 0;
      let failed = 0;

      for (const ingredient of ingredients.data) {
        if (!ingredient.isStandardized || ingredient.standardName !== standardName) {
          try {
            await ingredientsCollection.doc(ingredient._id).update({
              data: {
                standardName: standardName,
                isStandardized: true,
                standardizedAt: new Date(),
                updatedAt: new Date()
              }
            });
            updated++;
          } catch (error) {
            failed++;
          }
        }
      }

      totalUpdated += updated;
      totalFailed += failed;
      details.push({
        standardName: standardName,
        updated: updated,
        failed: failed
      });
    } catch (error) {
      console.error(`❌ 处理标准名称 ${standardName} 失败:`, error.message);
      totalFailed++;
    }
  }

  return {
    summary: {
      totalStandards: standardNames.length,
      totalUpdated: totalUpdated,
      totalFailed: totalFailed
    },
    details: details
  };
}

/**
 * 检查ingredients库的standardName是否与规范库一致
 */
async function checkConsistency() {
  console.log('🔍 检查数据一致性...');
  
  const ingredientsCollection = db.collection('ingredients');
  const standardsCollection = db.collection('ingredient_standards');

  // 获取所有标准名称
  const standards = await standardsCollection
    .where({
      status: 'active'
    })
    .field({ standardName: true })
    .get();

  const validStandardNames = new Set(standards.data.map(s => s.standardName));

  // 获取所有ingredients记录
  const MAX_LIMIT = 1000;
  let allIngredients = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const result = await ingredientsCollection
      .field({ _id: true, name: true, standardName: true, isStandardized: true })
      .skip(skip)
      .limit(MAX_LIMIT)
      .get();

    if (result.data && result.data.length > 0) {
      allIngredients = allIngredients.concat(result.data);
      skip += result.data.length;
      hasMore = result.data.length === MAX_LIMIT;
    } else {
      hasMore = false;
    }
  }

  const inconsistencies = [];

  for (const ingredient of allIngredients) {
    if (ingredient.standardName && !validStandardNames.has(ingredient.standardName)) {
      inconsistencies.push({
        _id: ingredient._id,
        name: ingredient.name,
        standardName: ingredient.standardName,
        issue: 'standardName不存在于规范库'
      });
    } else if (ingredient.isStandardized && !ingredient.standardName) {
      inconsistencies.push({
        _id: ingredient._id,
        name: ingredient.name,
        issue: '标记为已标准化但缺少standardName'
      });
    }
  }

  return {
    summary: {
      totalIngredients: allIngredients.length,
      totalStandards: validStandardNames.size,
      inconsistencies: inconsistencies.length
    },
    inconsistencies: inconsistencies.slice(0, 100) // 只返回前100个不一致项
  };
}

