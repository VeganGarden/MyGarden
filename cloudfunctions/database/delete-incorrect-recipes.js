/**
 * 删除之前错误导入的菜谱（只有1种食材的菜谱）
 * 
 * 执行方式：
 * tcb fn invoke database --params '{"action":"deleteIncorrectRecipes"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 主函数
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('删除错误导入的菜谱（只有1种食材）');
  console.log('========================================\n');
  
  try {
    // 查询所有基础菜谱（isBaseRecipe: true）
    console.log('🔍 查询所有基础菜谱...');
    const MAX_LIMIT = 1000;
    let allRecipes = [];
    let hasMore = true;
    let skip = 0;
    
    while (hasMore) {
      const result = await db.collection('recipes')
        .where({
          isBaseRecipe: true
        })
        .skip(skip)
        .limit(MAX_LIMIT)
        .get();
      
      if (result.data && result.data.length > 0) {
        allRecipes = allRecipes.concat(result.data);
        skip += result.data.length;
        hasMore = result.data.length === MAX_LIMIT;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`   找到 ${allRecipes.length} 个基础菜谱\n`);
    
    // 筛选出只有1种食材的菜谱（这些是需要删除的错误数据）
    const incorrectRecipes = allRecipes.filter(recipe => {
      return !recipe.ingredients || 
             !Array.isArray(recipe.ingredients) || 
             recipe.ingredients.length <= 1;
    });
    
    console.log(`📊 统计结果:`);
    console.log(`   总菜谱数: ${allRecipes.length}`);
    console.log(`   需要删除的菜谱数: ${incorrectRecipes.length}\n`);
    
    if (incorrectRecipes.length === 0) {
      return {
        success: true,
        message: '没有需要删除的菜谱',
        results: {
          total: allRecipes.length,
          deleted: 0
        }
      };
    }
    
    // 显示将要删除的菜谱列表
    console.log('📋 将要删除的菜谱列表:');
    incorrectRecipes.forEach((recipe, index) => {
      const ingredientCount = recipe.ingredients ? recipe.ingredients.length : 0;
      console.log(`   ${index + 1}. ${recipe.name} (${ingredientCount} 种食材)`);
    });
    console.log('');
    
    // 批量删除
    console.log('🗑️  开始删除菜谱...\n');
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    for (let i = 0; i < incorrectRecipes.length; i++) {
      const recipe = incorrectRecipes[i];
      
      try {
        await db.collection('recipes').doc(recipe._id).remove();
        successCount++;
        
        if ((i + 1) % 5 === 0) {
          console.log(`   ✅ 已删除 ${i + 1}/${incorrectRecipes.length} 个菜谱...`);
        }
      } catch (error) {
        failCount++;
        errors.push({
          name: recipe.name,
          _id: recipe._id,
          error: error.message
        });
        console.error(`   ❌ 删除菜谱失败: ${recipe.name} - ${error.message}`);
      }
    }
    
    console.log('\n========================================');
    console.log('删除结果统计');
    console.log('========================================');
    console.log(`  总菜谱数: ${allRecipes.length}`);
    console.log(`  需要删除: ${incorrectRecipes.length}`);
    console.log(`  ✅ 成功删除: ${successCount}`);
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
      message: `删除完成：成功 ${successCount}，失败 ${failCount}`,
      results: {
        total: allRecipes.length,
        toDelete: incorrectRecipes.length,
        deleted: successCount,
        failed: failCount,
        errors: errors.length > 0 ? errors.slice(0, 50) : undefined
      }
    };
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    return {
      success: false,
      message: '删除失败',
      error: error.message,
      stack: error.stack
    };
  }
};

