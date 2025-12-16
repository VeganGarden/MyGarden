const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 检查因子库中的重复条目
 * 重复标准：
 * 1. factorId 完全相同
 * 2. name + category + subCategory + region + year 组合相同
 */
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
 * 检查重复
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('检查因子库重复条目');
  console.log('========================================\n');

  try {
    // 1. 获取所有因子
    console.log('📋 查询所有因子数据...');
    const allFactors = await getAllFactors();
    console.log(`   共查询到 ${allFactors.length} 条记录\n`);

    // 2. 检查重复
    console.log('🔍 开始检查重复...\n');
    
    // 按 factorId 分组
    const factorIdMap = new Map();
    const duplicateFactorIds = new Set();
    
    // 按唯一键分组
    const uniqueKeyMap = new Map();
    const duplicateUniqueKeys = new Set();

    allFactors.forEach((factor, index) => {
      const factorId = factor.factorId;
      const uniqueKey = generateUniqueKey(factor);

      // 检查 factorId 重复
      if (factorId) {
        if (factorIdMap.has(factorId)) {
          duplicateFactorIds.add(factorId);
          factorIdMap.get(factorId).push({ index, factor });
        } else {
          factorIdMap.set(factorId, [{ index, factor }]);
        }
      }

      // 检查唯一键重复（name+category+subCategory+region+year）
      if (uniqueKeyMap.has(uniqueKey)) {
        duplicateUniqueKeys.add(uniqueKey);
        uniqueKeyMap.get(uniqueKey).push({ index, factor });
      } else {
        uniqueKeyMap.set(uniqueKey, [{ index, factor }]);
      }
    });

    // 3. 整理重复结果
    const results = {
      total: allFactors.length,
      duplicateByFactorId: [],
      duplicateByUniqueKey: [],
      summary: {
        duplicateFactorIdCount: duplicateFactorIds.size,
        duplicateUniqueKeyCount: duplicateUniqueKeys.size,
      }
    };

    // 收集 factorId 重复的详情
    duplicateFactorIds.forEach(factorId => {
      const duplicates = factorIdMap.get(factorId);
      results.duplicateByFactorId.push({
        factorId,
        count: duplicates.length,
          factors: duplicates.map(d => ({
            _id: d.factor._id,
            factorId: d.factor.factorId,
          name: d.factor.name,
          category: d.factor.category,
          subCategory: d.factor.subCategory,
          region: d.factor.region,
          year: d.factor.year,
          factorValue: d.factor.factorValue,
          source: d.factor.source,
          status: d.factor.status,
        }))
      });
    });

    // 收集唯一键重复的详情（排除factorId也重复的，避免重复报告）
    duplicateUniqueKeys.forEach(uniqueKey => {
      const duplicates = uniqueKeyMap.get(uniqueKey);
      // 只报告factorId不同的重复（真正的业务重复）
      const factorIds = duplicates.map(d => d.factor.factorId).filter(id => id);
      const uniqueFactorIds = new Set(factorIds);
      
      if (uniqueFactorIds.size > 1 || duplicates.length > 1) {
        results.duplicateByUniqueKey.push({
          uniqueKey,
          count: duplicates.length,
          factors: duplicates.map(d => ({
            _id: d.factor.id || d.factor._id,
            factorId: d.factor.factorId,
            name: d.factor.name,
            category: d.factor.category,
            subCategory: d.factor.subCategory,
            region: d.factor.region,
            year: d.factor.year,
            factorValue: d.factor.factorValue,
            source: d.factor.source,
            status: d.factor.status,
          }))
        });
      }
    });

    // 4. 输出结果
    console.log('========================================');
    console.log('检查结果统计');
    console.log('========================================');
    console.log(`总记录数: ${results.total}`);
    console.log(`factorId 重复: ${results.summary.duplicateFactorIdCount} 组`);
    console.log(`业务逻辑重复 (name+category+region+year): ${results.duplicateByUniqueKey.length} 组`);
    console.log('========================================\n');

    if (results.duplicateByFactorId.length > 0) {
      console.log('⚠️  factorId 重复的因子:');
      results.duplicateByFactorId.forEach((dup, idx) => {
        console.log(`\n${idx + 1}. factorId: ${dup.factorId} (${dup.count} 条)`);
        dup.factors.forEach((f, fIdx) => {
          console.log(`   ${fIdx + 1}. _id: ${f._id}, name: ${f.name}, status: ${f.status}, factorValue: ${f.factorValue}`);
        });
      });
      console.log('');
    }

    if (results.duplicateByUniqueKey.length > 0) {
      console.log('⚠️  业务逻辑重复的因子 (相同name+category+region+year):');
      results.duplicateByUniqueKey.forEach((dup, idx) => {
        console.log(`\n${idx + 1}. 组合键: ${dup.uniqueKey} (${dup.count} 条)`);
        dup.factors.forEach((f, fIdx) => {
          console.log(`   ${fIdx + 1}. factorId: ${f.factorId}, _id: ${f._id}, name: ${f.name}, source: ${f.source}, status: ${f.status}, factorValue: ${f.factorValue}`);
        });
      });
      console.log('');
    }

    if (results.duplicateByFactorId.length === 0 && results.duplicateByUniqueKey.length === 0) {
      console.log('✅ 未发现重复条目\n');
    }

    return {
      code: 0,
      success: true,
      data: results,
      message: '检查完成'
    };

  } catch (error) {
    console.error('❌ 检查失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message,
      message: '检查失败'
    };
  }
};

