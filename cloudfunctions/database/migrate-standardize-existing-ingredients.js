const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入标准化服务模块
const standardizer = require('./ingredient-standardizer');

/**
 * 批量标准化现有ingredients数据
 * 对每个食材调用标准化函数，更新standardName字段，在ingredient_aliases中建立映射关系
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('开始批量标准化现有ingredients数据...');
  console.log('========================================\n');

  try {
    const ingredientsCollection = db.collection('ingredients');
    const standardsCollection = db.collection('ingredient_standards');
    const aliasesCollection = db.collection('ingredient_aliases');

    // 获取所有ingredients记录
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
        message: '没有需要标准化的记录',
        summary: {
          total: 0,
          updated: 0,
          skipped: 0,
          failed: 0
        }
      };
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors = [];
    const now = new Date();
    const OPENID = 'system';

    // 批量处理（每次处理100条）
    const batchSize = 100;
    for (let i = 0; i < totalCount; i += batchSize) {
      const batch = allIngredients.slice(i, i + batchSize);
      console.log(`📝 处理第 ${i + 1}-${Math.min(i + batchSize, totalCount)} 条记录...`);

      for (const ingredient of batch) {
        try {
          const ingredientName = (ingredient.name || '').trim();
          if (!ingredientName) {
            skippedCount++;
            continue;
          }

          // 如果已经标准化且standardName存在，检查是否需要更新
          if (ingredient.isStandardized && ingredient.standardName) {
            // 验证standardName是否仍然有效
            const standardExists = await standardsCollection
              .where({
                standardName: ingredient.standardName,
                status: 'active'
              })
              .limit(1)
              .get();

            if (standardExists.data.length > 0) {
              skippedCount++;
              continue; // 已标准化且标准名称有效，跳过
            }
          }

          // 调用标准化函数
          let standardName = await standardizer.standardizeIngredientName(ingredientName);

          // 如果未找到标准名称，使用原始名称作为标准名称
          if (!standardName) {
            // 检查是否已存在标准名称记录
            const existingStandard = await standardsCollection
              .where({
                standardName: ingredientName,
                status: 'active'
              })
              .limit(1)
              .get();

            if (existingStandard.data.length === 0) {
              // 创建新的标准名称记录
              await standardsCollection.add({
                data: {
                  standardName: ingredientName,
                  nameEn: ingredient.nameEn || null,
                  category: ingredient.category || 'others',
                  subCategory: ingredient.subCategory || null,
                  description: ingredient.description || null,
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
            }
            standardName = ingredientName;
          }

          // 建立别名映射关系（如果原始名称不是标准名称）
          if (ingredientName !== standardName) {
            // 检查别名映射是否已存在
            const existingAlias = await aliasesCollection
              .where({
                alias: ingredientName,
                standardName: standardName
              })
              .limit(1)
              .get();

            if (existingAlias.data.length === 0) {
              // 创建别名映射
              await aliasesCollection.add({
                data: {
                  alias: ingredientName,
                  standardName: standardName,
                  confidence: 1.0,
                  source: 'auto',
                  status: 'active',
                  createdAt: now,
                  updatedAt: now,
                  createdBy: OPENID
                }
              });
            }
          }

          // 更新ingredient记录
          const updateData = {
            standardName: standardName,
            alias: ingredientName, // 原始名称作为别名
            isStandardized: true,
            standardizedAt: now,
            updatedAt: now
          };

          await ingredientsCollection.doc(ingredient._id).update({
            data: updateData
          });

          updatedCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            _id: ingredient._id,
            name: ingredient.name,
            error: error.message
          });
          console.error(`❌ 标准化记录 ${ingredient._id} 失败:`, error.message);
        }
      }
    }

    console.log('\n========================================');
    console.log('批量标准化完成');
    console.log('========================================\n');
    console.log(`✅ 更新成功: ${updatedCount} 条`);
    console.log(`⏭️  跳过（已标准化）: ${skippedCount} 条`);
    console.log(`❌ 更新失败: ${failedCount} 条`);

    return {
      code: 0,
      message: '批量标准化完成',
      summary: {
        total: totalCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : [] // 只返回前10个错误
      }
    };

  } catch (error) {
    console.error('❌ 批量标准化失败:', error);
    return {
      code: 500,
      message: '批量标准化失败',
      error: error.message
    };
  }
};

