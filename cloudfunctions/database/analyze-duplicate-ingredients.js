/**
 * 分析基础食材库中的重复/同类食材
 * 
 * 功能：
 * 1. 查询数据库中相似的食材名称（如：白菜、小白菜、大白菜等）
 * 2. 分析这些食材在菜谱中的使用情况
 * 3. 提供优化建议
 * 
 * 执行方式：
 * tcb fn invoke database --params '{"action":"analyzeDuplicateIngredients"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 提取食材名称的核心关键字
 * 例如："白菜叶" -> "白菜", "新鲜白菜" -> "白菜"
 */
function extractKeyword(name) {
  if (!name) return '';
  
  // 移除常见的修饰词
  const modifiers = ['新鲜', '新鲜', '干', '泡发', '泡发后', '烤', '蒸', '炒', '煮', '叶', '叶', '根', '茎', '花', '果', '籽', '仁', '泥', '汁', '粉', '粒', '末', '片', '丝', '块', '段'];
  
  let keyword = name;
  
  // 移除修饰词
  for (const mod of modifiers) {
    if (keyword.startsWith(mod)) {
      keyword = keyword.substring(mod.length);
    }
    if (keyword.endsWith(mod)) {
      keyword = keyword.substring(0, keyword.length - mod.length);
    }
  }
  
  return keyword.trim();
}

/**
 * 判断两个食材名称是否相关（同类）
 */
function areRelated(name1, name2) {
  const keyword1 = extractKeyword(name1);
  const keyword2 = extractKeyword(name2);
  
  // 完全匹配
  if (keyword1 === keyword2) return true;
  
  // 包含关系
  if (keyword1.includes(keyword2) || keyword2.includes(keyword1)) {
    // 确保不是完全不同的食材（避免误判）
    const minLength = Math.min(keyword1.length, keyword2.length);
    if (minLength >= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * 主函数
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('分析基础食材库中的重复/同类食材');
  console.log('========================================\n');
  
  try {
    // 1. 查询所有食材
    console.log('🔍 查询所有食材...');
    const MAX_LIMIT = 1000;
    let allIngredients = [];
    let hasMore = true;
    let skip = 0;
    
    while (hasMore) {
      const result = await db.collection('ingredients')
        .field({ name: true, category: true })
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
    
    console.log(`   找到 ${allIngredients.length} 个食材\n`);
    
    // 2. 查找同类食材
    console.log('🔍 分析同类食材...');
    const groups = new Map(); // keyword -> [ingredients]
    
    for (const ingredient of allIngredients) {
      const keyword = extractKeyword(ingredient.name);
      
      if (!groups.has(keyword)) {
        groups.set(keyword, []);
      }
      
      groups.get(keyword).push({
        name: ingredient.name,
        category: ingredient.category
      });
    }
    
    // 过滤出有多个变体的食材组
    const duplicateGroups = [];
    for (const [keyword, ingredients] of groups.entries()) {
      if (ingredients.length > 1) {
        duplicateGroups.push({
          keyword: keyword,
          ingredients: ingredients,
          count: ingredients.length
        });
      }
    }
    
    // 按数量排序
    duplicateGroups.sort((a, b) => b.count - a.count);
    
    console.log(`   发现 ${duplicateGroups.length} 组同类食材\n`);
    
    // 3. 查询这些食材在菜谱中的使用情况
    console.log('🔍 查询食材在菜谱中的使用情况...');
    const ingredientUsage = new Map();
    
    let allRecipes = [];
    hasMore = true;
    skip = 0;
    
    while (hasMore) {
      const result = await db.collection('recipes')
        .field({ name: true, ingredients: true })
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
    
    // 统计每个食材在菜谱中的使用次数
    for (const recipe of allRecipes) {
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        for (const ing of recipe.ingredients) {
          const ingName = ing.name;
          if (!ingredientUsage.has(ingName)) {
            ingredientUsage.set(ingName, 0);
          }
          ingredientUsage.set(ingName, ingredientUsage.get(ingName) + 1);
        }
      }
    }
    
    console.log(`   查询了 ${allRecipes.length} 个菜谱\n`);
    
    // 4. 生成分析报告
    console.log('📊 分析报告\n');
    console.log('========================================');
    
    const topGroups = duplicateGroups.slice(0, 20); // 显示前20组
    
    for (const group of topGroups) {
      console.log(`\n【${group.keyword}】类 (${group.count} 个变体):`);
      for (const ing of group.ingredients) {
        const usageCount = ingredientUsage.get(ing.name) || 0;
        const usageText = usageCount > 0 ? `(使用 ${usageCount} 次)` : '(未使用)';
        console.log(`  - ${ing.name} [${ing.category}] ${usageText}`);
      }
    }
    
    // 5. 统计信息
    console.log('\n========================================');
    console.log('统计信息');
    console.log('========================================');
    console.log(`总食材数: ${allIngredients.length}`);
    console.log(`同类食材组数: ${duplicateGroups.length}`);
    console.log(`涉及变体总数: ${duplicateGroups.reduce((sum, g) => sum + g.count, 0)}`);
    console.log(`平均每组变体数: ${(duplicateGroups.reduce((sum, g) => sum + g.count, 0) / duplicateGroups.length).toFixed(2)}`);
    
    // 6. 优化建议
    console.log('\n========================================');
    console.log('优化建议');
    console.log('========================================\n');
    
    console.log('✅ 建议采用的方案：');
    console.log('  1. 建立食材别名系统');
    console.log('     - 为食材添加 alias 字段，存储别名列表');
    console.log('     - 在搜索和匹配时同时考虑主名称和别名');
    console.log('     - 优点：保留历史数据，不影响现有菜谱\n');
    
    console.log('  2. 合并相似食材（谨慎使用）');
    console.log('     - 对于明显重复的食材（如：白菜、小白菜、大白菜）');
    console.log('     - 选择使用频率最高的作为主名称');
    console.log('     - 更新所有菜谱中的引用');
    console.log('     - 优点：数据更规范统一');
    console.log('     - 缺点：需要更新大量菜谱数据\n');
    
    console.log('  3. 建立食材规范库（长期方案）');
    console.log('     - 定义标准食材名称列表');
    console.log('     - 导入时自动标准化名称');
    console.log('     - 支持别名映射');
    console.log('     - 优点：从根本上解决问题\n');
    
    return {
      success: true,
      message: '分析完成',
      results: {
        totalIngredients: allIngredients.length,
        duplicateGroups: duplicateGroups.length,
        totalVariants: duplicateGroups.reduce((sum, g) => sum + g.count, 0),
        topGroups: topGroups.map(g => ({
          keyword: g.keyword,
          count: g.count,
          ingredients: g.ingredients.map(ing => ({
            name: ing.name,
            category: ing.category,
            usageCount: ingredientUsage.get(ing.name) || 0
          }))
        }))
      }
    };
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    return {
      success: false,
      message: '分析失败',
      error: error.message,
      stack: error.stack
    };
  }
};

