const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 初始化食材规范库数据
 * 从现有ingredients提取标准名称，生成初始别名映射
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('开始初始化食材规范库数据...');
  console.log('========================================\n');

  try {
    const ingredientsCollection = db.collection('ingredients');
    const standardsCollection = db.collection('ingredient_standards');
    const aliasesCollection = db.collection('ingredient_aliases');

    // 1. 获取所有ingredients记录（使用分页查询，避免100条限制）
    console.log('📊 查询所有ingredients记录...');
    const MAX_LIMIT = 1000;
    let allIngredients = [];
    let hasMore = true;
    let skip = 0;

    while (hasMore) {
      const result = await ingredientsCollection
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

    const totalCount = allIngredients.length;
    console.log(`   找到 ${totalCount} 条记录\n`);

    if (totalCount === 0) {
      return {
        code: 0,
        message: '没有ingredients数据，无法初始化规范库',
        summary: {
          standardsCreated: 0,
          aliasesCreated: 0
        }
      };
    }

    // 2. 统计每个名称的使用频率
    console.log('📈 统计名称使用频率...');
    const nameFrequency = {};
    const nameToIngredient = {};

    for (const ingredient of allIngredients) {
      const name = (ingredient.name || '').trim();
      if (!name) continue;

      if (!nameFrequency[name]) {
        nameFrequency[name] = 0;
        nameToIngredient[name] = ingredient;
      }
      nameFrequency[name]++;
    }

    // 3. 按使用频率排序，选择最常用的作为标准名称
    const sortedNames = Object.entries(nameFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    console.log(`   统计完成，共 ${sortedNames.length} 个不同名称\n`);

    // 4. 创建标准名称记录
    console.log('📝 创建标准名称记录...');
    let standardsCreated = 0;
    let standardsSkipped = 0;
    const now = new Date();
    const OPENID = 'system';

    for (const name of sortedNames) {
      try {
        // 检查是否已存在
        const existing = await standardsCollection
          .where({
            standardName: name
          })
          .limit(1)
          .get();

        if (existing.data.length > 0) {
          standardsSkipped++;
          continue;
        }

        // 获取该名称对应的ingredient信息（使用第一个）
        const ingredient = nameToIngredient[name];

        // 创建标准名称记录
        await standardsCollection.add({
          data: {
            standardName: name,
            nameEn: ingredient.nameEn || null,
            category: ingredient.category || 'others',
            subCategory: ingredient.subCategory || null,
            description: null,
            defaultUnit: ingredient.defaultUnit || 'g',
            carbonCoefficient: ingredient.carbonCoefficient || null,
            status: 'active',
            version: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: OPENID,
            updatedBy: OPENID
          }
        });

        standardsCreated++;
      } catch (error) {
        console.error(`❌ 创建标准名称 ${name} 失败:`, error.message);
      }
    }

    console.log(`✅ 创建标准名称: ${standardsCreated} 个`);
    console.log(`⏭️  跳过（已存在）: ${standardsSkipped} 个\n`);

    // 5. 生成别名映射（基于analyze-duplicate-ingredients的逻辑）
    console.log('🔗 生成别名映射...');
    let aliasesCreated = 0;
    let aliasesSkipped = 0;

    // 提取关键词（去除修饰词）
    function extractKeyword(name) {
      let keyword = name;
      const modifiers = ['新鲜', '干', '泡发', '烤', '蒸', '煮', '炒', '炸', '大', '小', '老', '嫩'];
      for (const modifier of modifiers) {
        keyword = keyword.replace(new RegExp(modifier, 'g'), '');
      }
      return keyword.trim();
    }

    // 判断两个名称是否相关
    function areRelated(name1, name2) {
      if (name1 === name2) return true;
      const keyword1 = extractKeyword(name1);
      const keyword2 = extractKeyword(name2);
      if (keyword1 === keyword2) return true;
      if (name1.includes(keyword2) || name2.includes(keyword1)) return true;
      return false;
    }

    // 按关键词分组
    const keywordGroups = {};
    for (const name of sortedNames) {
      const keyword = extractKeyword(name);
      if (!keywordGroups[keyword]) {
        keywordGroups[keyword] = [];
      }
      keywordGroups[keyword].push(name);
    }

    // 为每组创建别名映射（最常用的作为标准名称）
    for (const [keyword, names] of Object.entries(keywordGroups)) {
      if (names.length <= 1) continue; // 只有一个名称，不需要别名

      // 最常用的作为标准名称
      const standardName = names[0];
      const aliases = names.slice(1);

      // 为每个别名创建映射
      for (const alias of aliases) {
        try {
          // 检查是否已存在
          const existing = await aliasesCollection
            .where({
              alias: alias,
              standardName: standardName
            })
            .limit(1)
            .get();

          if (existing.data.length > 0) {
            aliasesSkipped++;
            continue;
          }

          // 创建别名映射
          await aliasesCollection.add({
            data: {
              alias: alias,
              standardName: standardName,
              confidence: 0.8, // 初始置信度
              source: 'auto',
              status: 'active',
              createdAt: now,
              updatedAt: now,
              createdBy: OPENID
            }
          });

          aliasesCreated++;
        } catch (error) {
          console.error(`❌ 创建别名映射 ${alias} -> ${standardName} 失败:`, error.message);
        }
      }
    }

    console.log(`✅ 创建别名映射: ${aliasesCreated} 个`);
    console.log(`⏭️  跳过（已存在）: ${aliasesSkipped} 个\n`);

    console.log('========================================');
    console.log('食材规范库数据初始化完成');
    console.log('========================================\n');

    return {
      code: 0,
      message: '食材规范库数据初始化成功',
      summary: {
        totalIngredients: totalCount,
        uniqueNames: sortedNames.length,
        standardsCreated: standardsCreated,
        standardsSkipped: standardsSkipped,
        aliasesCreated: aliasesCreated,
        aliasesSkipped: aliasesSkipped
      }
    };

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    return {
      code: 500,
      message: '食材规范库数据初始化失败',
      error: error.message
    };
  }
};

