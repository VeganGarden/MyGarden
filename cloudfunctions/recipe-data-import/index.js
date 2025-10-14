// 云函数：recipe-data-import
// 功能：食谱数据导入与管理

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 导入食谱数据
const recipeData = require('./recipe-data.json');

/**
 * 云函数入口
 */
exports.main = async (event) => {
  const { action } = event;

  try {
    switch (action) {
      case 'importRecipes':
        return await importRecipes();
      
      case 'countRecipes':
        return await countRecipes();
      
      case 'getRecipeById':
        return await getRecipeById(event.recipeId);
      
      case 'searchRecipes':
        return await searchRecipes(event);
      
      case 'recommendRecipes':
        return await recommendRecipes(event);
      
      case 'getRecipesByCategory':
        return await getRecipesByCategory(event.category);
      
      case 'calculateRecipeCarbon':
        return await calculateRecipeCarbon(event.recipeId);
      
      default:
        return {
          code: 400,
          message: '未知的操作类型，支持: importRecipes, countRecipes, getRecipeById, searchRecipes, recommendRecipes, getRecipesByCategory, calculateRecipeCarbon'
        };
    }
  } catch (error) {
    console.error('操作失败:', error);
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    };
  }
};

/**
 * 导入食谱数据
 */
async function importRecipes() {
  console.log('========================================');
  console.log('开始导入食谱数据...');
  console.log('========================================\n');

  const results = {
    total: recipeData.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    details: []
  };

  for (let i = 0; i < recipeData.length; i++) {
    const recipe = recipeData[i];
    
    try {
      // 检查是否已存在
      let shouldInsert = true;
      
      try {
        const existing = await db.collection('recipes')
          .where({ recipeId: recipe.recipeId })
          .get();

        if (existing.data.length > 0) {
          console.log(`[${i + 1}/${recipeData.length}] ⚠️  ${recipe.name} 已存在，跳过`);
          results.skipped++;
          results.details.push({
            name: recipe.name,
            status: 'skipped',
            reason: '已存在'
          });
          shouldInsert = false;
        }
      } catch (checkError) {
        // 如果集合不存在，继续插入
        if (checkError.errCode === -502005 || checkError.message.includes('not exists')) {
          console.log(`[${i + 1}/${recipeData.length}] ℹ️  集合不存在，将创建并插入 ${recipe.name}`);
          shouldInsert = true;
        } else {
          throw checkError;
        }
      }

      if (!shouldInsert) {
        continue;
      }

      // 计算食谱的总碳足迹和营养
      const enrichedRecipe = await enrichRecipeData(recipe);

      // 插入数据
      await db.collection('recipes').add({
        data: {
          ...enrichedRecipe,
          createdBy: 'admin',
          verified: true,
          likes: 0,
          collections: 0,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`[${i + 1}/${recipeData.length}] ✅ ${recipe.name} 导入成功 (碳足迹: ${enrichedRecipe.totalCarbon} kg CO₂e)`);
      results.inserted++;
      results.details.push({
        name: recipe.name,
        category: recipe.category,
        status: 'success',
        carbonFootprint: enrichedRecipe.totalCarbon
      });

    } catch (error) {
      console.error(`[${i + 1}/${recipeData.length}] ❌ ${recipe.name} 导入失败:`, error.message);
      results.failed++;
      results.details.push({
        name: recipe.name,
        status: 'failed',
        error: error.message
      });
    }

    // 控制导入速度，避免触发频率限制
    if (i < recipeData.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n========================================');
  console.log('📊 食谱数据导入完成！');
  console.log('========================================');
  console.log(`总计: ${results.total}`);
  console.log(`✅ 成功: ${results.inserted}`);
  console.log(`⚠️  跳过: ${results.skipped}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log('========================================\n');

  return {
    code: 0,
    message: '食谱数据导入完成',
    summary: results
  };
}

/**
 * 丰富食谱数据：计算碳足迹和营养
 */
async function enrichRecipeData(recipe) {
  let totalCarbon = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const enrichedIngredients = [];

  for (const ing of recipe.ingredients) {
    try {
      // 从ingredients集合查询食材信息
      const ingredientResult = await db.collection('ingredients')
        .where({ name: ing.name })
        .limit(1)
        .get();

      if (ingredientResult.data.length > 0) {
        const ingredientData = ingredientResult.data[0];
        
        // 计算该食材的碳足迹（碳系数 * 重量/1000）
        const carbon = ingredientData.carbonFootprint * (ing.amount / 1000);
        
        // 计算营养（营养值 * 重量/100）
        const calories = (ingredientData.nutrition?.calories || 0) * (ing.amount / 100);
        const protein = (ingredientData.nutrition?.protein || 0) * (ing.amount / 100);
        const carbs = (ingredientData.nutrition?.carbs || 0) * (ing.amount / 100);
        const fat = (ingredientData.nutrition?.fat || 0) * (ing.amount / 100);

        totalCarbon += carbon;
        totalCalories += calories;
        totalProtein += protein;
        totalCarbs += carbs;
        totalFat += fat;

        enrichedIngredients.push({
          ingredientId: ingredientData._id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          carbon: parseFloat(carbon.toFixed(3)),
          carbonFootprint: ingredientData.carbonFootprint
        });
      } else {
        // 如果找不到食材，使用默认值
        enrichedIngredients.push({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          carbon: 0.1, // 默认估算值
          carbonFootprint: 1.0
        });
        totalCarbon += 0.1;
      }
    } catch (error) {
      console.error(`查询食材 ${ing.name} 失败:`, error.message);
      enrichedIngredients.push({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        carbon: 0.1,
        carbonFootprint: 1.0
      });
      totalCarbon += 0.1;
    }
  }

  return {
    ...recipe,
    ingredients: enrichedIngredients,
    totalCarbon: parseFloat(totalCarbon.toFixed(2)),
    totalNutrition: {
      calories: parseFloat(totalCalories.toFixed(0)),
      protein: parseFloat(totalProtein.toFixed(1)),
      carbs: parseFloat(totalCarbs.toFixed(1)),
      fat: parseFloat(totalFat.toFixed(1))
    }
  };
}

/**
 * 统计食谱数据
 */
async function countRecipes() {
  try {
    // 总数统计
    const total = await db.collection('recipes').count();
    
    if (total.total === 0) {
      return {
        code: 0,
        message: '食谱库为空，请先执行导入操作',
        data: {
          total: 0,
          byCategory: [],
          byCuisine: [],
          byDifficulty: []
        }
      };
    }

    // 按分类统计
    const byCategory = await db.collection('recipes')
      .aggregate()
      .group({
        _id: '$category',
        count: $.sum(1)
      })
      .end();

    // 按菜系统计
    const byCuisine = await db.collection('recipes')
      .aggregate()
      .group({
        _id: '$cuisine',
        count: $.sum(1)
      })
      .end();

    // 按难度统计
    const byDifficulty = await db.collection('recipes')
      .aggregate()
      .group({
        _id: '$difficulty',
        count: $.sum(1)
      })
      .end();

    console.log('食谱库统计:');
    console.log('总计:', total.total);
    console.log('按分类:', byCategory.list);
    console.log('按菜系:', byCuisine.list);
    console.log('按难度:', byDifficulty.list);

    return {
      code: 0,
      data: {
        total: total.total,
        byCategory: byCategory.list,
        byCuisine: byCuisine.list,
        byDifficulty: byDifficulty.list
      }
    };

  } catch (error) {
    if (error.errCode === -502005 || error.message.includes('not exists')) {
      return {
        code: 404,
        message: 'recipes 集合不存在，请先执行 importRecipes 操作创建集合并导入数据',
        data: {
          total: 0,
          byCategory: [],
          byCuisine: [],
          byDifficulty: []
        }
      };
    }
    throw error;
  }
}

/**
 * 根据ID获取食谱
 */
async function getRecipeById(recipeId) {
  if (!recipeId) {
    return {
      code: 400,
      message: '请提供食谱ID'
    };
  }

  const recipe = await db.collection('recipes')
    .where({ recipeId })
    .get();

  if (recipe.data.length === 0) {
    return {
      code: 404,
      message: '未找到该食谱'
    };
  }

  return {
    code: 0,
    data: recipe.data[0]
  };
}

/**
 * 搜索食谱
 */
async function searchRecipes(params) {
  const {
    keyword,
    category,
    cuisine,
    difficulty,
    maxTime,
    season,
    tags,
    limit = 20,
    offset = 0
  } = params;

  const where = { status: 'active' };

  // 关键词搜索（食谱名称）
  if (keyword) {
    where.name = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  // 分类筛选
  if (category) {
    where.category = category;
  }

  // 菜系筛选
  if (cuisine) {
    where.cuisine = cuisine;
  }

  // 难度筛选
  if (difficulty) {
    where.difficulty = difficulty;
  }

  // 烹饪时间筛选
  if (maxTime) {
    where.cookingTime = _.lte(maxTime);
  }

  // 季节筛选
  if (season) {
    where.season = db.RegExp({
      regexp: season,
      options: 'i'
    });
  }

  // 标签筛选
  if (tags && tags.length > 0) {
    where.tags = _.in(tags);
  }

  const recipes = await db.collection('recipes')
    .where(where)
    .skip(offset)
    .limit(limit)
    .orderBy('usageCount', 'desc')
    .get();

  const total = await db.collection('recipes')
    .where(where)
    .count();

  return {
    code: 0,
    data: {
      list: recipes.data,
      total: total.total,
      limit,
      offset
    }
  };
}

/**
 * 推荐食谱
 */
async function recommendRecipes(params) {
  const {
    userId,
    season = 'all',
    preference = 'high_protein',
    limit = 10
  } = params;

  // 推荐策略：
  // 1. 优先推荐当季食谱
  // 2. 根据用户偏好推荐分类
  // 3. 按使用次数排序

  const where = { status: 'active' };

  // 季节匹配
  if (season !== 'all') {
    where.season = db.RegExp({
      regexp: season,
      options: 'i'
    });
  }

  // 根据偏好选择分类
  if (preference === 'high_protein') {
    where.category = 'high_protein';
  } else if (preference === 'quick') {
    where.category = 'quick_meal';
  } else if (preference === 'traditional') {
    where.category = _.in(['chinese_vegan', 'seasonal']);
  }

  const recipes = await db.collection('recipes')
    .where(where)
    .limit(limit)
    .orderBy('usageCount', 'desc')
    .get();

  return {
    code: 0,
    data: {
      list: recipes.data,
      recommendReason: getRecommendReason(season, preference)
    }
  };
}

/**
 * 获取推荐理由
 */
function getRecommendReason(season, preference) {
  const reasons = [];

  if (season === 'spring') {
    reasons.push('春季应季食谱');
  } else if (season === 'summer') {
    reasons.push('夏季清爽菜品');
  } else if (season === 'autumn') {
    reasons.push('秋季滋补食谱');
  } else if (season === 'winter') {
    reasons.push('冬季温暖菜品');
  }

  if (preference === 'high_protein') {
    reasons.push('高蛋白健身餐');
  } else if (preference === 'quick') {
    reasons.push('快手简餐');
  } else if (preference === 'traditional') {
    reasons.push('传统经典');
  }

  return reasons.join('、');
}

/**
 * 根据分类获取食谱
 */
async function getRecipesByCategory(category) {
  if (!category) {
    return {
      code: 400,
      message: '请提供食谱分类'
    };
  }

  const recipes = await db.collection('recipes')
    .where({
      category,
      status: 'active'
    })
    .orderBy('usageCount', 'desc')
    .get();

  const categoryNames = {
    'chinese_vegan': '中式经典素食',
    'quick_meal': '快手简餐',
    'high_protein': '高蛋白食谱',
    'seasonal': '节气食谱',
    'western': '西式素食',
    'asian_fusion': '亚洲融合'
  };

  return {
    code: 0,
    data: {
      category,
      categoryName: categoryNames[category] || category,
      list: recipes.data,
      total: recipes.data.length
    }
  };
}

/**
 * 计算食谱碳足迹（重新计算）
 */
async function calculateRecipeCarbon(recipeId) {
  if (!recipeId) {
    return {
      code: 400,
      message: '请提供食谱ID'
    };
  }

  const recipe = await db.collection('recipes')
    .where({ recipeId })
    .get();

  if (recipe.data.length === 0) {
    return {
      code: 404,
      message: '未找到该食谱'
    };
  }

  const recipeData = recipe.data[0];
  const enrichedRecipe = await enrichRecipeData(recipeData);

  return {
    code: 0,
    data: {
      recipeId,
      name: recipeData.name,
      totalCarbon: enrichedRecipe.totalCarbon,
      totalNutrition: enrichedRecipe.totalNutrition,
      ingredients: enrichedRecipe.ingredients.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        carbon: ing.carbon
      }))
    }
  };
}

