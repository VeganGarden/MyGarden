const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 修复因子库中的重复条目
 * 策略：
 * 1. 先修复错误的factorId（重新生成正确的factorId）
 * 2. 如果新factorId已存在，保留数据更完整的记录
 * 3. 最后按名称检查重复，删除重复记录
 */

/**
 * 生成因子ID（新版本，使用Base64编码name）
 */
function generateFactorId(name, category, subCategory, region, year) {
  let namePart = "";
  if (name) {
    const hasChinese = /[\u4e00-\u9fa5]/.test(name);
    if (hasChinese) {
      const base64Name = Buffer.from(name, 'utf8').toString('base64').replace(/[=+/]/g, '').substring(0, 8);
      namePart = base64Name.toLowerCase();
    } else {
      namePart = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    }
  }
  
  const categoryPart = category || "general";
  const subCategoryPart = subCategory
    ? `_${subCategory.toLowerCase().replace(/\s+/g, "_")}`
    : "";
  const regionPart = region ? `_${region.toLowerCase()}` : "";
  const yearPart = year ? `_${year}` : "";

  return `ef_${namePart}${subCategoryPart}${regionPart}${yearPart}`;
}

async function getAllFactors() {
  const MAX_LIMIT = 1000;
  let allFactors = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const result = await db.collection('carbon_emission_factors')
      .skip(skip)
      .limit(MAX_LIMIT)
      .get();
    
    if (result.data && result.data.length > 0) {
      allFactors = allFactors.concat(result.data);
      skip += result.data.length;
      hasMore = result.data.length === MAX_LIMIT;
    } else {
      hasMore = false;
    }
  }

  return allFactors;
}

/**
 * 生成唯一键（用于检测重复）
 */
function generateUniqueKey(factor) {
  const name = (factor.name || '').trim().toLowerCase();
  const category = factor.category || '';
  const subCategory = factor.subCategory || '';
  const region = factor.region || '';
  const year = factor.year || '';
  return `${name}|${category}|${subCategory}|${region}|${year}`;
}

/**
 * 判断factorId是否为旧版本（有问题）
 * 旧版本的factorId通常是 ef__subCategory_region_year 格式（缺少name部分）
 */
function isOldFactorId(factorId) {
  if (!factorId) return true;
  // 如果factorId是 ef__subCategory_region_year 格式（中间有两个下划线），说明是旧版本
  return /^ef__[^_]+_[^_]+_\d+$/.test(factorId);
}

/**
 * 判断记录的数据完整性（用于决定保留哪条记录）
 */
function getDataQualityScore(factor) {
  let score = 0;
  if (factor.factorValue !== null && factor.factorValue !== undefined) score += 10;
  if (factor.source && factor.source !== 'internal') score += 5;
  if (factor.uncertainty !== null && factor.uncertainty !== undefined) score += 3;
  if (factor.notes) score += 2;
  if (factor.alias && factor.alias.length > 0) score += 1;
  if (!isOldFactorId(factor.factorId)) score += 5; // factorId正确的额外加分
  return score;
}

/**
 * 修复重复
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('修复因子库重复条目');
  console.log('========================================\n');

  try {
    const { dryRun = true } = event; // 默认是dry run模式

    if (dryRun) {
      console.log('⚠️  当前为预览模式（dryRun=true），不会实际修改数据\n');
    } else {
      console.log('⚠️  当前为执行模式（dryRun=false），将实际修改数据\n');
    }

    // 1. 获取所有因子
    console.log('📋 查询所有因子数据...');
    const allFactors = await getAllFactors();
    console.log(`   共查询到 ${allFactors.length} 条记录\n`);

    const toUpdate = []; // 需要更新factorId的记录
    const toDelete = []; // 需要删除的记录
    const updateResults = []; // 更新结果

    // 2. 第一步：修复错误的factorId
    console.log('🔧 第一步：修复错误的factorId...\n');
    
    // 按 factorId 分组，找出factorId重复的
    const factorIdMap = new Map();
    allFactors.forEach((factor) => {
      const factorId = factor.factorId;
      if (factorId) {
        if (!factorIdMap.has(factorId)) {
          factorIdMap.set(factorId, []);
        }
        factorIdMap.get(factorId).push(factor);
      }
    });

    // 找出需要修复的factorId（旧版本的）
    const needFixFactors = [];
    factorIdMap.forEach((factors, factorId) => {
      if (factors.length > 1) {
        // 检查这些记录的名称是否不同
        const names = factors.map(f => f.name);
        const uniqueNames = new Set(names);
        
        if (uniqueNames.size > 1 && isOldFactorId(factorId)) {
          // factorId有问题，且对应多个不同名称
          factors.forEach(f => {
            if (isOldFactorId(f.factorId)) {
              needFixFactors.push(f);
            }
          });
        }
      } else if (factors.length === 1 && isOldFactorId(factorId)) {
        // 单个记录但factorId是旧版本的，也需要修复
        needFixFactors.push(factors[0]);
      }
    });

    console.log(`   找到 ${needFixFactors.length} 条需要修复factorId的记录\n`);

    // 为需要修复的记录重新生成factorId
    for (const factor of needFixFactors) {
      const newFactorId = generateFactorId(
        factor.name,
        factor.category,
        factor.subCategory,
        factor.region,
        factor.year
      );

      if (newFactorId !== factor.factorId) {
        // 检查新factorId是否已存在
        const existingFactors = allFactors.filter(f => f.factorId === newFactorId && f._id !== factor._id);
        
        if (existingFactors.length > 0) {
          // 新factorId已存在，需要比较数据质量
          const currentScore = getDataQualityScore(factor);
          const existingScores = existingFactors.map(f => getDataQualityScore(f));
          const maxExistingScore = Math.max(...existingScores);
          
          if (currentScore > maxExistingScore) {
            // 当前记录质量更好，更新其factorId，删除已存在的记录
            console.log(`   ✅ ${factor.name}: 新factorId "${newFactorId}" 已存在，但当前记录质量更好`);
            console.log(`      将更新factorId，并删除已存在的记录`);
            toUpdate.push({
              _id: factor._id,
              oldFactorId: factor.factorId,
              newFactorId: newFactorId,
              name: factor.name
            });
            existingFactors.forEach(f => {
              toDelete.push({
                _id: f._id,
                factorId: f.factorId,
                name: f.name,
                reason: `factorId修复时，因新factorId重复且质量较低被删除`
              });
            });
          } else {
            // 已存在的记录质量更好，删除当前记录
            console.log(`   ⚠️  ${factor.name}: 新factorId "${newFactorId}" 已存在，且已存在记录质量更好`);
            console.log(`      将删除当前记录`);
            toDelete.push({
              _id: factor._id,
              factorId: factor.factorId,
              name: factor.name,
              reason: `factorId修复时，因新factorId重复且质量较低被删除`
            });
          }
        } else {
          // 新factorId不存在，直接更新
          console.log(`   ✅ ${factor.name}: 将factorId从 "${factor.factorId}" 更新为 "${newFactorId}"`);
          toUpdate.push({
            _id: factor._id,
            oldFactorId: factor.factorId,
            newFactorId: newFactorId,
            name: factor.name
          });
        }
      }
    }

    // 3. 第二步：按名称检查重复（在factorId修复后）
    console.log('\n🔍 第二步：检查名称重复...\n');
    
    // 创建factorId映射（包含更新后的factorId）
    const factorIdMapping = new Map();
    toUpdate.forEach(update => {
      factorIdMapping.set(update._id, update.newFactorId);
    });
    
    // 重新获取所有因子（包含更新后的factorId）
    let allFactorsAfterUpdate = allFactors.map(f => {
      const updatedId = factorIdMapping.get(f._id);
      if (updatedId) {
        return { ...f, factorId: updatedId };
      }
      return f;
    });
    
    // 过滤掉已标记删除的记录
    const deletedIds = new Set(toDelete.map(d => d._id));
    allFactorsAfterUpdate = allFactorsAfterUpdate.filter(f => !deletedIds.has(f._id));

    // 按唯一键分组
    const uniqueKeyMap = new Map();
    allFactorsAfterUpdate.forEach((factor) => {
      const uniqueKey = generateUniqueKey(factor);
      if (!uniqueKeyMap.has(uniqueKey)) {
        uniqueKeyMap.set(uniqueKey, []);
      }
      uniqueKeyMap.get(uniqueKey).push(factor);
    });

    // 处理名称重复的
    uniqueKeyMap.forEach((factors, uniqueKey) => {
      if (factors.length > 1) {
        // 按数据质量排序，保留质量最高的
        const sortedFactors = factors.sort((a, b) => {
          const scoreA = getDataQualityScore(a);
          const scoreB = getDataQualityScore(b);
          return scoreB - scoreA; // 降序
        });

        console.log(`   ⚠️  名称重复: ${uniqueKey} (${sortedFactors.length} 条)`);
        console.log(`      保留: factorId=${sortedFactors[0].factorId}, name=${sortedFactors[0].name}, score=${getDataQualityScore(sortedFactors[0])}`);
        
        for (let i = 1; i < sortedFactors.length; i++) {
          toDelete.push({
            _id: sortedFactors[i]._id,
            factorId: sortedFactors[i].factorId,
            name: sortedFactors[i].name,
            reason: `名称重复（相同name+category+subCategory+region+year），保留质量更高的记录`
          });
        }
      }
    });

    // 去重（避免同一记录被标记多次）
    const uniqueToDelete = [];
    const deletedIdsSet = new Set();
    toDelete.forEach(item => {
      if (!deletedIdsSet.has(item._id)) {
        deletedIdsSet.add(item._id);
        uniqueToDelete.push(item);
      }
    });

    // 4. 输出统计
    console.log('\n========================================');
    console.log('修复统计');
    console.log('========================================');
    console.log(`总记录数: ${allFactors.length}`);
    console.log(`需要更新factorId: ${toUpdate.length} 条`);
    console.log(`需要删除: ${uniqueToDelete.length} 条`);
    console.log('========================================\n');

    if (toUpdate.length === 0 && uniqueToDelete.length === 0) {
      console.log('✅ 没有发现需要修复的重复记录\n');
      return {
        code: 0,
        success: true,
        message: '没有发现需要修复的重复记录',
        data: {
          total: allFactors.length,
          updated: 0,
          deleted: 0
        }
      };
    }

    // 5. 显示待处理的列表
    if (toUpdate.length > 0) {
      console.log('📋 待更新factorId的记录:');
      toUpdate.forEach((item, idx) => {
        console.log(`   ${idx + 1}. _id: ${item._id}, name: ${item.name}`);
        console.log(`      ${item.oldFactorId} -> ${item.newFactorId}`);
      });
      console.log('');
    }

    if (uniqueToDelete.length > 0) {
      console.log('📋 待删除的记录:');
      uniqueToDelete.forEach((item, idx) => {
        console.log(`   ${idx + 1}. _id: ${item._id}, factorId: ${item.factorId}, name: ${item.name}`);
        console.log(`      reason: ${item.reason}`);
      });
      console.log('');
    }

    // 6. 执行操作（如果不是dry run）
    if (!dryRun) {
      console.log('🔄 开始执行修复...\n');
      
      // 更新factorId
      let updatedCount = 0;
      let updateFailedCount = 0;
      
      for (const update of toUpdate) {
        try {
          await db.collection('carbon_emission_factors').doc(update._id).update({
            data: {
              factorId: update.newFactorId,
              updatedAt: new Date()
            }
          });
          updatedCount++;
          updateResults.push({ _id: update._id, name: update.name, action: 'updated', success: true });
          if (updatedCount % 10 === 0) {
            console.log(`   ✅ 已更新 ${updatedCount}/${toUpdate.length} 条factorId...`);
          }
        } catch (error) {
          updateFailedCount++;
          console.error(`   ❌ 更新失败: _id=${update._id}, error=${error.message}`);
          updateResults.push({ _id: update._id, name: update.name, action: 'updated', success: false, error: error.message });
        }
      }

      // 删除重复记录
      let deletedCount = 0;
      let deleteFailedCount = 0;

      for (const item of uniqueToDelete) {
        try {
          await db.collection('carbon_emission_factors').doc(item._id).remove();
          deletedCount++;
          updateResults.push({ _id: item._id, name: item.name, action: 'deleted', success: true });
          if (deletedCount % 10 === 0) {
            console.log(`   ✅ 已删除 ${deletedCount}/${uniqueToDelete.length} 条记录...`);
          }
        } catch (error) {
          deleteFailedCount++;
          console.error(`   ❌ 删除失败: _id=${item._id}, error=${error.message}`);
          updateResults.push({ _id: item._id, name: item.name, action: 'deleted', success: false, error: error.message });
        }
      }

      console.log('\n========================================');
      console.log('修复结果');
      console.log('========================================');
      console.log(`factorId更新: 成功 ${updatedCount}，失败 ${updateFailedCount}`);
      console.log(`记录删除: 成功 ${deletedCount}，失败 ${deleteFailedCount}`);
      console.log('========================================\n');

      return {
        code: 0,
        success: true,
        message: `修复完成：更新factorId ${updatedCount} 条，删除重复记录 ${deletedCount} 条`,
        data: {
          total: allFactors.length,
          updated: updatedCount,
          updatedFailed: updateFailedCount,
          deleted: deletedCount,
          deletedFailed: deleteFailedCount,
          results: updateResults
        }
      };
    } else {
      console.log('💡 这是预览模式，实际未修改任何数据');
      console.log('💡 如需执行修复，请设置 dryRun: false\n');

      return {
        code: 0,
        success: true,
        message: '预览模式：未实际修改数据',
        data: {
          total: allFactors.length,
          toUpdate: toUpdate.length,
          toDelete: uniqueToDelete.length,
          updatePreview: toUpdate,
          deletePreview: uniqueToDelete
        },
        dryRun: true
      };
    }

  } catch (error) {
    console.error('❌ 修复失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message,
      message: '修复失败'
    };
  }
};
