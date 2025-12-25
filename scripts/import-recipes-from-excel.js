/**
 * 从 Excel 文件导入中式面点菜谱到基础菜谱库
 * 
 * 功能：
 * 1. 读取 Excel 文件 "Docs/项目策划方案/基础食材食谱/面点产品食材量化表V3.xlsx"
 * 2. 提取 B 列（菜谱名称）、D 列（食材名称）、E 列（食材用量）
 * 3. 将同一菜谱的多个食材合并到一个数组中
 * 4. 检查 recipes 集合中是否已存在，如果存在则跳过
 * 5. 插入新菜谱到 recipes 集合
 * 
 * 执行方式：
 * node scripts/import-recipes-from-excel.js
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_FILE_PATH = path.join(__dirname, '../Docs/项目策划方案/基础食材食谱/面点产品食材量化表V3.xlsx');
const RECIPE_COLUMN = 'B'; // B 列是菜谱列
const INGREDIENT_COLUMN = 'D'; // D 列是食材列
const QUANTITY_COLUMN = 'E'; // E 列是用量列

/**
 * 解析用量字符串，提取数字
 * 例如："100g" -> 100, "0.5kg" -> 500, "1斤" -> 500
 */
function parseQuantity(quantityStr) {
  if (!quantityStr || typeof quantityStr !== 'string') {
    return null;
  }
  
  // 去除空格
  quantityStr = quantityStr.trim();
  
  // 提取数字部分
  const numberMatch = quantityStr.match(/([\d.]+)/);
  if (!numberMatch) {
    return null;
  }
  
  let quantity = parseFloat(numberMatch[1]);
  
  // 单位转换（转换为克）
  if (quantityStr.includes('kg') || quantityStr.includes('千克')) {
    quantity = quantity * 1000; // 千克转克
  } else if (quantityStr.includes('斤')) {
    quantity = quantity * 500; // 斤转克
  } else if (quantityStr.includes('两')) {
    quantity = quantity * 50; // 两转克
  } else if (quantityStr.includes('g') || quantityStr.includes('克')) {
    // 已经是克，不需要转换
  }
  // 如果没有单位，假设是克
  
  return Math.round(quantity * 100) / 100; // 保留2位小数
}

/**
 * 读取 Excel 文件并提取菜谱数据
 */
function readRecipesFromExcel(filePath) {
  try {
    console.log(`📖 正在读取 Excel 文件: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`   工作表名称: ${sheetName}`);
    
    // 将工作表转换为 JSON 格式
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    // 找到各列的索引（列索引从 0 开始）
    const recipeColumnIndex = XLSX.utils.decode_col(RECIPE_COLUMN);
    const ingredientColumnIndex = XLSX.utils.decode_col(INGREDIENT_COLUMN);
    const quantityColumnIndex = XLSX.utils.decode_col(QUANTITY_COLUMN);
    
    // 存储菜谱数据，使用Map来合并同一菜谱的多个食材
    const recipesMap = new Map();
    
    // 从第 2 行开始读取（跳过标题行）
    let currentRecipeName = null; // 记录当前正在处理的菜谱名
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // 获取菜谱名称（如果当前行有，则更新；如果没有，使用上一个菜谱名）
      const recipeNameInRow = row[recipeColumnIndex] ? String(row[recipeColumnIndex]).trim() : null;
      if (recipeNameInRow && recipeNameInRow !== '') {
        currentRecipeName = recipeNameInRow;
      }
      
      // 如果当前还没有菜谱名，跳过这一行
      if (!currentRecipeName) {
        continue;
      }
      
      const ingredientName = row[ingredientColumnIndex] ? String(row[ingredientColumnIndex]).trim() : null;
      const quantityStr = row[quantityColumnIndex] ? String(row[quantityColumnIndex]).trim() : null;
      
      // 跳过无效的食材数据
      if (!ingredientName || ingredientName === '') {
        continue;
      }
      
      // 过滤无效的食材名称
      if (ingredientName === 'null' || 
          ingredientName === 'undefined' || 
          ingredientName.match(/^[0-9.]+$/)) {
        continue;
      }
      
      // 解析用量
      const quantity = parseQuantity(quantityStr);
      if (quantity === null || quantity <= 0) {
        // 如果用量为空或无效，跳过这条食材
        console.log(`   ⚠️  警告: 菜谱"${currentRecipeName}"的食材"${ingredientName}"用量无效，已跳过`);
        continue;
      }
      
      // 如果该菜谱还不存在，创建一个新的菜谱对象
      if (!recipesMap.has(currentRecipeName)) {
        recipesMap.set(currentRecipeName, {
          name: currentRecipeName,
          ingredients: []
        });
      }
      
      // 添加食材到菜谱中
      const recipe = recipesMap.get(currentRecipeName);
      recipe.ingredients.push({
        name: ingredientName,
        quantity: quantity,
        unit: 'g' // 统一使用克作为单位
      });
    }
    
    // 转换为数组
    const recipes = Array.from(recipesMap.values());
    
    // 过滤掉没有食材的菜谱
    const validRecipes = recipes.filter(recipe => recipe.ingredients.length > 0);
    
    console.log(`   ✅ 成功提取 ${validRecipes.length} 个菜谱\n`);
    
    return validRecipes;
    
  } catch (error) {
    console.error('❌ 读取 Excel 文件失败:', error);
    throw error;
  }
}

/**
 * 通过云函数 API 导入菜谱
 */
async function importRecipesViaCloudFunction(recipes) {
  console.log('📝 为了导入数据，请执行以下命令之一：\n');
  console.log('方案1: 使用 tcb 命令行工具（推荐）');
  
  // 如果recipes太大，需要分块处理
  const recipesJson = JSON.stringify(recipes);
  if (recipesJson.length > 50000) {
    console.log('   ⚠️  数据量较大，建议分批导入');
    console.log(`   总大小: ${(recipesJson.length / 1024).toFixed(2)} KB`);
  }
  
  console.log(`tcb fn invoke database --params '{"action":"importRecipesFromList","data":{"recipes":${recipesJson}}}'`);
  console.log('\n方案2: 将数据保存到 JSON 文件，然后在云函数控制台调用');
  
  const outputPath = path.join(__dirname, '../temp-recipes.json');
  fs.writeFileSync(outputPath, JSON.stringify({ recipes: recipes }, null, 2));
  console.log(`  数据已保存到: ${outputPath}`);
  console.log(`  在云函数控制台调用时，使用以下参数:`);
  console.log(`  {"action":"importRecipesFromList","data":{"recipes":[...]}}`);
  
  return {
    success: true,
    message: '请使用上述方法导入数据',
    recipeCount: recipes.length,
    outputPath: outputPath
  };
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('从 Excel 导入中式面点菜谱');
  console.log('========================================\n');
  
  try {
    // 1. 读取 Excel 文件
    const recipes = readRecipesFromExcel(EXCEL_FILE_PATH);
    
    if (recipes.length === 0) {
      console.log('⚠️  没有找到有效的菜谱数据');
      return;
    }
    
    // 2. 显示统计信息
    console.log('📊 统计信息:');
    console.log(`   菜谱总数: ${recipes.length}`);
    
    const totalIngredients = recipes.reduce((sum, recipe) => sum + recipe.ingredients.length, 0);
    const avgIngredients = (totalIngredients / recipes.length).toFixed(1);
    console.log(`   食材总数: ${totalIngredients}`);
    console.log(`   平均每个菜谱的食材数: ${avgIngredients}`);
    console.log('');
    
    // 3. 显示前5个菜谱作为预览
    console.log('📋 菜谱预览（前5个）:');
    recipes.slice(0, 5).forEach((recipe, index) => {
      console.log(`   ${index + 1}. ${recipe.name} (${recipe.ingredients.length} 种食材)`);
      recipe.ingredients.slice(0, 3).forEach(ing => {
        console.log(`      - ${ing.name}: ${ing.quantity}${ing.unit}`);
      });
      if (recipe.ingredients.length > 3) {
        console.log(`      ... 还有 ${recipe.ingredients.length - 3} 种食材`);
      }
    });
    if (recipes.length > 5) {
      console.log(`   ... 还有 ${recipes.length - 5} 个菜谱\n`);
    } else {
      console.log('');
    }
    
    // 4. 通过云函数导入数据
    const result = await importRecipesViaCloudFunction(recipes);
    
    console.log('\n✅ 脚本执行完成！');
    return result;
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { main, readRecipesFromExcel, parseQuantity };

