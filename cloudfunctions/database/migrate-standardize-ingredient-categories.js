const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 标准化食材类别
 * 将ingredients和ingredient_standards集合中的类别映射到标准类别
 */
exports.main = async (event) => {
  const results = [];
  
  console.log('========================================');
  console.log('开始标准化食材类别...');
  console.log('========================================\n');

  try {
    // 获取所有标准类别
    const categoriesCollection = db.collection('ingredient_categories');
    const categoriesResult = await categoriesCollection.where({
      status: 'active'
    }).get();
    
    const categories = categoriesResult.data || [];
    console.log(`📋 获取到 ${categories.length} 个标准类别\n`);

    // 构建类别代码映射表（处理可能的别名或旧名称）
    const categoryMapping = {
      // 直接映射
      'vegetables': 'vegetables',
      'beans': 'beans',
      'grains': 'grains',
      'fruits': 'fruits',
      'nuts': 'nuts',
      'mushrooms': 'mushrooms',
      'spices': 'spices',
      'seafood': 'seafood',
      'dairy': 'dairy',
      'others': 'others',
      // 荤食类别映射
      'red_meat': 'red_meat',
      'poultry': 'poultry',
      'processed_meat': 'processed_meat',
      // 其他可能的别名
      'meat': 'red_meat',
      'pork': 'red_meat',
      'beef': 'red_meat',
      'mutton': 'red_meat',
      'chicken': 'poultry',
      'duck': 'poultry',
      'eggs': 'poultry', // 蛋类归为禽肉类
      // 旧的错误类别映射
      'sweeteners': 'condiments', // 甜味剂归为调味品
      'oils': 'oils', // 油脂类（新增）
      'condiments': 'condiments', // 调味品类（新增）
      'herbs': 'herbs', // 香草类（新增）
      'seaweed': 'seaweed', // 海藻类（新增）
      'legumes': 'legumes', // 豆类（新增）
      'tubers': 'tubers', // 薯类（新增）
      'beverages': 'beverages', // 饮品类（新增）
      // 空值或undefined映射到others
      '': 'others',
      null: 'others',
      undefined: 'others'
    };

    // 名称关键词到类别的精确映射（用于特殊食材）
    const nameKeywordMapping = {
      // 调味品
      '酱油': 'condiments',
      '醋': 'condiments',
      '盐': 'condiments',
      '糖': 'condiments',
      '料酒': 'condiments',
      '蚝油': 'condiments',
      '豆瓣酱': 'condiments',
      '辣椒酱': 'condiments',
      '番茄酱': 'condiments',
      '甜面酱': 'condiments',
      '黄豆酱': 'condiments',
      '腐乳': 'condiments',
      '豆豉': 'condiments',
      '味精': 'condiments',
      '鸡精': 'condiments',
      '红糖': 'condiments',
      '白糖': 'condiments',
      '冰糖': 'condiments',
      '枫糖浆': 'condiments',
      '寿司醋': 'condiments',
      // 油脂类
      '花生油': 'oils',
      '菜籽油': 'oils',
      '大豆油': 'oils',
      '玉米油': 'oils',
      '橄榄油': 'oils',
      '芝麻油': 'oils',
      '茶籽油': 'oils',
      '葵花籽油': 'oils',
      '猪油': 'oils',
      '牛油': 'oils',
      '黄油': 'oils',
      '奶油': 'oils',
      '辣椒油': 'oils',
      // 蛋类归为禽肉类
      '鸡蛋': 'poultry',
      '鸭蛋': 'poultry',
      '鹅蛋': 'poultry',
      '鹌鹑蛋': 'poultry',
      '卤蛋': 'poultry',
      // 其他
      '泡打粉': 'grains',
      '白葡萄酒': 'beverages',
      '蜂蜜': 'others',
      // 特殊水果（避免误判为油脂）
      '牛油果': 'fruits',
      ' avocado': 'fruits'
    };

    // 1. 处理ingredients集合
    console.log('[1/2] 处理ingredients集合...');
    const ingredientsCollection = db.collection('ingredients');
    let ingredientsProcessed = 0;
    let ingredientsSkipped = 0;
    let ingredientsErrors = 0;
    
    // 分批处理（每次100条）
    const batchSize = 100;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const ingredientsResult = await ingredientsCollection
        .skip(skip)
        .limit(batchSize)
        .get();

      const ingredients = ingredientsResult.data || [];
      if (ingredients.length === 0) {
        hasMore = false;
        break;
      }

      for (const ingredient of ingredients) {
        try {
          const currentCategory = ingredient.category || 'others';
          const ingredientName = ingredient.name || '';
          
          // 首先检查名称关键词精确映射
          let targetCategory = null;
          for (const [keyword, category] of Object.entries(nameKeywordMapping)) {
            if (ingredientName.includes(keyword)) {
              targetCategory = category;
              break;
            }
          }
          
          // 如果名称映射没有匹配，使用类别映射表
          if (!targetCategory) {
            targetCategory = categoryMapping[currentCategory];
          }

          // 如果映射表中没有，尝试使用类别工具推断
          if (!targetCategory) {
            // 尝试从类别列表中查找匹配（使用关键词）
            let bestMatch = null;
            let maxMatchLength = 0;
            
            for (const cat of categories) {
              const keywords = cat.mapping?.keywords || [];
              for (const keyword of keywords) {
                if (ingredientName.includes(keyword)) {
                  if (keyword.length > maxMatchLength) {
                    maxMatchLength = keyword.length;
                    bestMatch = cat.categoryCode;
                  }
                }
              }
            }
            
            if (bestMatch) {
              targetCategory = bestMatch;
            } else {
              targetCategory = 'others';
            }
          }

          // 只有当类别需要更新时才更新
          if (currentCategory !== targetCategory) {
            await ingredientsCollection.doc(ingredient._id).update({
              data: {
                category: targetCategory,
                updatedAt: new Date()
              }
            });
            ingredientsProcessed++;
            console.log(`  ✅ ${ingredient.name}: ${currentCategory} → ${targetCategory}`);
          } else {
            ingredientsSkipped++;
          }
        } catch (error) {
          ingredientsErrors++;
          console.error(`  ❌ 处理食材 ${ingredient.name} 失败:`, error.message);
        }
      }

      skip += batchSize;
      if (ingredients.length < batchSize) {
        hasMore = false;
      }
    }

    results.push({
      collection: 'ingredients',
      processed: ingredientsProcessed,
      skipped: ingredientsSkipped,
      errors: ingredientsErrors
    });

    console.log(`  📊 ingredients处理完成: 更新 ${ingredientsProcessed} 条，跳过 ${ingredientsSkipped} 条，错误 ${ingredientsErrors} 条\n`);

    // 2. 处理ingredient_standards集合
    console.log('[2/2] 处理ingredient_standards集合...');
    const standardsCollection = db.collection('ingredient_standards');
    let standardsProcessed = 0;
    let standardsSkipped = 0;
    let standardsErrors = 0;
    
    skip = 0;
    hasMore = true;

    while (hasMore) {
      const standardsResult = await standardsCollection
        .skip(skip)
        .limit(batchSize)
        .get();

      const standards = standardsResult.data || [];
      if (standards.length === 0) {
        hasMore = false;
        break;
      }

      for (const standard of standards) {
        try {
          const currentCategory = standard.category || 'others';
          const standardName = standard.standardName || '';
          
          // 首先检查名称关键词精确映射
          let targetCategory = null;
          for (const [keyword, category] of Object.entries(nameKeywordMapping)) {
            if (standardName.includes(keyword)) {
              targetCategory = category;
              break;
            }
          }
          
          // 如果名称映射没有匹配，使用类别映射表
          if (!targetCategory) {
            targetCategory = categoryMapping[currentCategory];
          }

          // 如果映射表中没有，尝试使用类别工具推断
          if (!targetCategory) {
            // 尝试从类别列表中查找匹配（使用关键词）
            let bestMatch = null;
            let maxMatchLength = 0;
            
            for (const cat of categories) {
              const keywords = cat.mapping?.keywords || [];
              for (const keyword of keywords) {
                if (standardName.includes(keyword)) {
                  if (keyword.length > maxMatchLength) {
                    maxMatchLength = keyword.length;
                    bestMatch = cat.categoryCode;
                  }
                }
              }
            }
            
            if (bestMatch) {
              targetCategory = bestMatch;
            } else {
              targetCategory = 'others';
            }
          }

          // 只有当类别需要更新时才更新
          if (currentCategory !== targetCategory) {
            await standardsCollection.doc(standard._id).update({
              data: {
                category: targetCategory,
                updatedAt: new Date()
              }
            });
            standardsProcessed++;
            console.log(`  ✅ ${standard.standardName}: ${currentCategory} → ${targetCategory}`);
          } else {
            standardsSkipped++;
          }
        } catch (error) {
          standardsErrors++;
          console.error(`  ❌ 处理标准名称 ${standard.standardName} 失败:`, error.message);
        }
      }

      skip += batchSize;
      if (standards.length < batchSize) {
        hasMore = false;
      }
    }

    results.push({
      collection: 'ingredient_standards',
      processed: standardsProcessed,
      skipped: standardsSkipped,
      errors: standardsErrors
    });

    console.log(`  📊 ingredient_standards处理完成: 更新 ${standardsProcessed} 条，跳过 ${standardsSkipped} 条，错误 ${standardsErrors} 条\n`);

    console.log('========================================');
    console.log('食材类别标准化完成');
    console.log('========================================\n');

    return {
      code: 0,
      message: '食材类别标准化成功',
      summary: {
        results: results,
        totalProcessed: ingredientsProcessed + standardsProcessed,
        totalSkipped: ingredientsSkipped + standardsSkipped,
        totalErrors: ingredientsErrors + standardsErrors
      }
    };

  } catch (error) {
    console.error('❌ 标准化失败:', error);
    return {
      code: 500,
      message: '食材类别标准化失败',
      error: error.message,
      results: results
    };
  }
};

