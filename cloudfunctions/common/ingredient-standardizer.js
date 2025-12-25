const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 食材标准化服务模块
 * 提供名称标准化、别名匹配等功能
 */

// 常见修饰词列表（用于去除）
const COMMON_MODIFIERS = [
  '新鲜', '干', '泡发', '烤', '蒸', '煮', '炒', '炸', '腌制', '冷冻',
  '新鲜', '干制', '脱水', '速冻', '即食', '半成品'
];

// 常见后缀词列表（用于去除，但要保留有意义的）
const COMMON_SUFFIXES = [
  '叶', '根', '茎', '泥', '汁', '粉', '片', '丝', '块', '丁',
  '末', '粒', '条', '段', '瓣', '头', '尾'
];

/**
 * 标准化食材名称
 * @param {string} inputName - 输入的名称
 * @returns {Promise<string|null>} 标准化后的名称，如果未找到则返回null
 */
async function standardizeIngredientName(inputName) {
  if (!inputName || typeof inputName !== 'string') {
    return null;
  }

  // 1. 去除前后空格
  let normalized = inputName.trim();

  if (!normalized) {
    return null;
  }

  // 2. 先尝试精确匹配别名
  const aliasMatch = await findStandardName(normalized);
  if (aliasMatch) {
    return aliasMatch;
  }

  // 3. 尝试精确匹配标准名称
  const standardMatch = await db.collection('ingredient_standards')
    .where({
      standardName: normalized,
      status: 'active'
    })
    .limit(1)
    .get();

  if (standardMatch.data.length > 0) {
    return normalized;
  }

  // 4. 去除修饰词后匹配
  let cleaned = normalized;
  for (const modifier of COMMON_MODIFIERS) {
    cleaned = cleaned.replace(new RegExp(modifier, 'g'), '');
  }
  cleaned = cleaned.trim();

  if (cleaned && cleaned !== normalized) {
    // 尝试匹配清理后的名称
    const cleanedMatch = await findStandardName(cleaned);
    if (cleanedMatch) {
      return cleanedMatch;
    }
  }

  // 5. 去除后缀词后匹配
  for (const suffix of COMMON_SUFFIXES) {
    if (cleaned.endsWith(suffix)) {
      const withoutSuffix = cleaned.slice(0, -suffix.length).trim();
      if (withoutSuffix) {
        const suffixMatch = await findStandardName(withoutSuffix);
        if (suffixMatch) {
          return suffixMatch;
        }
      }
    }
  }

  // 6. 未找到匹配，返回null
  return null;
}

/**
 * 通过别名查找标准名称
 * @param {string} alias - 别名
 * @returns {Promise<string|null>} 标准名称，如果未找到则返回null
 */
async function findStandardName(alias) {
  if (!alias || typeof alias !== 'string') {
    return null;
  }

  try {
    const result = await db.collection('ingredient_aliases')
      .where({
        alias: alias.trim(),
        status: 'active'
      })
      .limit(1)
      .get();

    if (result.data.length > 0) {
      return result.data[0].standardName;
    }

    return null;
  } catch (error) {
    console.error('查找标准名称失败:', error);
    return null;
  }
}

/**
 * 查找标准名称的所有别名
 * @param {string} standardName - 标准名称
 * @returns {Promise<string[]>} 别名数组
 */
async function findAliases(standardName) {
  if (!standardName || typeof standardName !== 'string') {
    return [];
  }

  try {
    const result = await db.collection('ingredient_aliases')
      .where({
        standardName: standardName.trim(),
        status: 'active'
      })
      .get();

    return result.data.map(item => item.alias);
  } catch (error) {
    console.error('查找别名失败:', error);
    return [];
  }
}

/**
 * 智能匹配食材（支持模糊匹配）
 * @param {string} inputName - 输入名称
 * @returns {Promise<{standardName: string, confidence: number}|null>} 匹配结果
 */
async function matchIngredient(inputName) {
  if (!inputName || typeof inputName !== 'string') {
    return null;
  }

  // 优先级1: 精确匹配标准名称
  const standardMatch = await db.collection('ingredient_standards')
    .where({
      standardName: inputName.trim(),
      status: 'active'
    })
    .limit(1)
    .get();

  if (standardMatch.data.length > 0) {
    return {
      standardName: standardMatch.data[0].standardName,
      confidence: 1.0
    };
  }

  // 优先级2: 精确匹配别名
  const aliasMatch = await findStandardName(inputName);
  if (aliasMatch) {
    return {
      standardName: aliasMatch,
      confidence: 0.9
    };
  }

  // 优先级3: 模糊匹配（去除修饰词后）
  const standardized = await standardizeIngredientName(inputName);
  if (standardized) {
    return {
      standardName: standardized,
      confidence: 0.7
    };
  }

  // 未匹配
  return null;
}

/**
 * 同步别名到因子库
 * @param {string} standardName - 标准名称
 * @returns {Promise<{success: number, failed: number, details: any[]}>} 同步结果
 */
async function syncAliasesToFactors(standardName) {
  if (!standardName) {
    return { success: 0, failed: 0, details: [] };
  }

  try {
    // 1. 查找standardName对应的所有活跃别名
    const aliases = await findAliases(standardName);
    
    if (aliases.length === 0) {
      return { success: 0, failed: 0, details: [], message: '没有找到别名' };
    }

    // 2. 在carbon_emission_factors中查找name=standardName的所有记录
    const factors = await db.collection('carbon_emission_factors')
      .where({
        name: standardName,
        status: 'active'
      })
      .get();

    if (factors.data.length === 0) {
      return { success: 0, failed: 0, details: [], message: '因子库中没有找到对应记录' };
    }

    // 3. 对每条因子记录更新alias字段
    let successCount = 0;
    let failedCount = 0;
    const details = [];

    for (const factor of factors.data) {
      try {
        // 保留原有的英文别名（nameEn等）
        const existingAliases = Array.isArray(factor.alias) ? factor.alias : [];
        const englishAliases = existingAliases.filter(alias => {
          // 简单判断：如果包含英文字母，认为是英文别名
          return /[a-zA-Z]/.test(alias);
        });

        // 合并规范库中的中文别名
        const allAliases = [...new Set([...englishAliases, ...aliases])];

        // 更新因子记录
        await db.collection('carbon_emission_factors').doc(factor._id).update({
          data: {
            alias: allAliases,
            updatedAt: new Date()
          }
        });

        successCount++;
        details.push({
          factorId: factor._id,
          region: factor.region,
          status: 'success',
          aliasCount: allAliases.length
        });
      } catch (error) {
        failedCount++;
        details.push({
          factorId: factor._id,
          region: factor.region,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      details: details
    };

  } catch (error) {
    console.error('同步别名到因子库失败:', error);
    return {
      success: 0,
      failed: 0,
      details: [],
      error: error.message
    };
  }
}

/**
 * 同步标准名称到ingredients库
 * @param {string} oldStandardName - 旧标准名称
 * @param {string} newStandardName - 新标准名称
 * @returns {Promise<{updated: number, failed: number, details: any[]}>} 同步结果
 */
async function syncStandardNameToIngredients(oldStandardName, newStandardName) {
  if (!oldStandardName) {
    return { updated: 0, failed: 0, details: [] };
  }

  try {
    // 1. 在ingredients集合中查找所有standardName=oldStandardName的记录
    const ingredients = await db.collection('ingredients')
      .where({
        standardName: oldStandardName
      })
      .get();

    if (ingredients.data.length === 0) {
      return { updated: 0, failed: 0, details: [], message: '没有找到需要更新的记录' };
    }

    // 2. 批量更新这些记录
    let updatedCount = 0;
    let failedCount = 0;
    const details = [];
    const now = new Date();

    for (const ingredient of ingredients.data) {
      try {
        const updateData = {
          standardName: newStandardName,
          isStandardized: true,
          standardizedAt: now,
          updatedAt: now
        };

        await db.collection('ingredients').doc(ingredient._id).update({
          data: updateData
        });

        updatedCount++;
        details.push({
          ingredientId: ingredient._id,
          name: ingredient.name,
          status: 'success'
        });
      } catch (error) {
        failedCount++;
        details.push({
          ingredientId: ingredient._id,
          name: ingredient.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      updated: updatedCount,
      failed: failedCount,
      details: details
    };

  } catch (error) {
    console.error('同步标准名称到ingredients库失败:', error);
    return {
      updated: 0,
      failed: 0,
      details: [],
      error: error.message
    };
  }
}

module.exports = {
  standardizeIngredientName,
  findStandardName,
  findAliases,
  matchIngredient,
  syncAliasesToFactors,
  syncStandardNameToIngredients
};

