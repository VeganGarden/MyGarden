/**
 * 从菜谱列表导入到基础菜谱库
 * 
 * 功能：
 * 1. 接收菜谱列表（包含名称和食材清单）
 * 2. 检查 recipes 集合中是否已存在，如果存在则跳过
 * 3. 插入新菜谱到 recipes 集合
 * 
 * 执行方式：
 * tcb fn invoke database --params '{"action":"importRecipesFromList","data":{"recipes":[...]}}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 主函数
 */
exports.main = async (event) => {
  const { recipes } = event.data || event;
  
  if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
    return {
      success: false,
      message: '请提供有效的菜谱列表',
      code: 400
    };
  }
  
  console.log('========================================');
  console.log('从列表导入菜谱到基础菜谱库');
  console.log('========================================\n');
  console.log(`📋 收到 ${recipes.length} 个菜谱\n`);
  
  try {
    // 1. 验证菜谱数据格式
    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      if (!recipe.name) {
        return {
          success: false,
          message: `第 ${i + 1} 个菜谱缺少名称`,
          code: 400
        };
      }
      if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
        return {
          success: false,
          message: `菜谱"${recipe.name}"缺少食材清单`,
          code: 400
        };
      }
      // 验证食材数据
      for (let j = 0; j < recipe.ingredients.length; j++) {
        const ingredient = recipe.ingredients[j];
        if (!ingredient.name) {
          return {
            success: false,
            message: `菜谱"${recipe.name}"的第 ${j + 1} 个食材缺少名称`,
            code: 400
          };
        }
        if (ingredient.quantity === undefined || ingredient.quantity === null || ingredient.quantity <= 0) {
          return {
            success: false,
            message: `菜谱"${recipe.name}"的食材"${ingredient.name}"用量无效`,
            code: 400
          };
        }
      }
    }
    
    // 2. 查询数据库中已存在的菜谱名称
    console.log('🔍 查询数据库中已存在的菜谱...');
    const MAX_LIMIT = 1000;
    let allExistingRecipes = [];
    let hasMore = true;
    let skip = 0;
    
    while (hasMore) {
      const result = await db.collection('recipes')
        .field({ name: true })
        .skip(skip)
        .limit(MAX_LIMIT)
        .get();
      
      if (result.data && result.data.length > 0) {
        allExistingRecipes = allExistingRecipes.concat(result.data);
        skip += result.data.length;
        hasMore = result.data.length === MAX_LIMIT;
      } else {
        hasMore = false;
      }
    }
    
    const existingNames = new Set(allExistingRecipes.map(recipe => recipe.name));
    console.log(`   数据库中已有 ${existingNames.size} 个菜谱\n`);
    
    // 3. 过滤出需要导入的新菜谱
    const newRecipes = [];
    const skipped = [];
    
    for (const recipe of recipes) {
      const recipeName = String(recipe.name).trim();
      if (!recipeName) {
        skipped.push({ name: recipe.name, reason: '名称为空' });
        continue;
      }
      
      if (existingNames.has(recipeName)) {
        skipped.push({ name: recipeName, reason: '已存在于菜谱库' });
        continue;
      }
      
      newRecipes.push(recipe);
    }
    
    console.log(`📊 统计结果:`);
    console.log(`   总菜谱数: ${recipes.length}`);
    console.log(`   新菜谱数: ${newRecipes.length}`);
    console.log(`   跳过数: ${skipped.length}\n`);
    
    if (newRecipes.length === 0) {
      return {
        success: true,
        message: '没有新菜谱需要导入',
        results: {
          total: recipes.length,
          new: 0,
          skipped: skipped.length,
          skippedDetails: skipped
        }
      };
    }
    
    // 4. 批量插入新菜谱
    console.log('📥 开始插入新菜谱...\n');
    const now = new Date();
    const OPENID = "system";
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    for (let i = 0; i < newRecipes.length; i++) {
      const recipe = newRecipes[i];
      
      try {
        // 构建菜谱数据
        const recipeData = {
          name: recipe.name.trim(),
          description: recipe.description || '',
          category: recipe.category || '面点', // 默认分类为面点
          cookingMethod: recipe.cookingMethod || 'steamed', // 默认烹饪方式为蒸
          ingredients: recipe.ingredients.map(ing => ({
            name: String(ing.name).trim(),
            quantity: parseFloat(ing.quantity) || 0,
            unit: ing.unit || 'g'
          })),
          carbonFootprint: recipe.carbonFootprint || 0, // 碳足迹，后续可以计算
          carbonLabel: recipe.carbonLabel || null,
          carbonScore: recipe.carbonScore || 0,
          status: recipe.status || 'active',
          isBaseRecipe: true, // 标记为基础菜谱
          usageCount: 0, // 使用次数初始化为0
          createdAt: now,
          updatedAt: now,
          createdBy: OPENID,
          updatedBy: OPENID
        };
        
        // 插入菜谱
        await db.collection('recipes').add({
          data: recipeData
        });
        
        successCount++;
        
        if ((i + 1) % 5 === 0) {
          console.log(`   ✅ 已处理 ${i + 1}/${newRecipes.length} 个菜谱...`);
        }
        
      } catch (error) {
        failCount++;
        errors.push({
          name: recipe.name,
          error: error.message
        });
        console.error(`   ❌ 菜谱插入失败: ${recipe.name} - ${error.message}`);
      }
    }
    
    console.log('\n========================================');
    console.log('导入结果统计');
    console.log('========================================');
    console.log(`  总菜谱数: ${recipes.length}`);
    console.log(`  新菜谱数: ${newRecipes.length}`);
    console.log(`  跳过数: ${skipped.length}`);
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ❌ 失败: ${failCount}`);
    console.log('');
    
    if (errors.length > 0) {
      console.log(`⚠️  错误详情 (前10个):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err.name}: ${err.error}`);
      });
    }
    
    return {
      success: true,
      message: `导入完成：成功 ${successCount}，失败 ${failCount}`,
      results: {
        total: recipes.length,
        new: newRecipes.length,
        skipped: skipped.length,
        success: successCount,
        failed: failCount,
        errors: errors.length > 0 ? errors.slice(0, 50) : undefined
      }
    };
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    return {
      success: false,
      message: '导入失败',
      error: error.message,
      stack: error.stack
    };
  }
};

