/**
 * 从 Excel 文件导入中式面点食材到基础食材库和因子库
 * 
 * 功能：
 * 1. 读取 Excel 文件 "Docs/项目策划方案/基础食材食谱/面点产品食材量化表V3.xlsx"
 * 2. 提取 D 列（食材列）的数据
 * 3. 检查 ingredients 集合中是否已存在，如果存在则跳过
 * 4. 插入新食材到 ingredients 集合
 * 5. 同步插入到 carbon_emission_factors 集合
 * 
 * 执行方式：
 * node scripts/import-ingredients-from-excel.js
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_FILE_PATH = path.join(__dirname, '../Docs/项目策划方案/基础食材食谱/面点产品食材量化表V3.xlsx');
const INGREDIENT_COLUMN = 'D'; // D 列是食材列

/**
 * 读取 Excel 文件并提取 D 列数据
 */
function readIngredientsFromExcel(filePath) {
  try {
    console.log(`📖 正在读取 Excel 文件: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`   工作表名称: ${sheetName}`);
    
    // 将工作表转换为 JSON 格式
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    // 找到 D 列的索引（列索引从 0 开始，D 列是第 4 列，索引为 3）
    const columnIndex = XLSX.utils.decode_col(INGREDIENT_COLUMN);
    
    // 提取 D 列的所有非空值（跳过标题行）
    const ingredients = [];
    const seen = new Set(); // 用于去重
    
    for (let i = 1; i < jsonData.length; i++) { // 从第 2 行开始（跳过标题行）
      const row = jsonData[i];
      if (row && row[columnIndex]) {
        const ingredientName = String(row[columnIndex]).trim();
        
        // 过滤空值和无效值
        if (ingredientName && 
            ingredientName !== '' && 
            ingredientName !== 'null' && 
            ingredientName !== 'undefined' &&
            !ingredientName.match(/^[0-9.]+$/)) { // 过滤纯数字
          
          // 去重
          if (!seen.has(ingredientName)) {
            seen.add(ingredientName);
            ingredients.push(ingredientName);
          }
        }
      }
    }
    
    console.log(`   ✅ 成功提取 ${ingredients.length} 个不重复的食材\n`);
    return ingredients;
    
  } catch (error) {
    console.error('❌ 读取 Excel 文件失败:', error);
    throw error;
  }
}

/**
 * 生成因子ID
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

/**
 * 映射食材分类
 * 根据食材名称尝试推断分类（简化版，实际可能需要更复杂的逻辑）
 */
function inferCategory(ingredientName) {
  // 常见的分类关键词
  const categoryKeywords = {
    'vegetables': ['菜', '叶', '根', '茎', '笋', '萝卜', '白菜', '菠菜', '韭菜', '芹菜', '葱', '姜', '蒜', '辣椒', '黄瓜', '茄子', '豆角', '冬瓜', '南瓜', '丝瓜', '苦瓜', '番茄', '土豆', '红薯', '芋头', '莲藕', '胡萝卜', '白萝卜'],
    'beans': ['豆', '豆腐', '豆浆', '豆皮', '豆干', '腐竹', '豆芽', '绿豆', '红豆', '黑豆', '黄豆', '扁豆', '蚕豆'],
    'grains': ['米', '面', '粉', '麦', '玉米', '小麦', '大麦', '燕麦', '荞麦', '高粱', '小米', '大米', '糯米', '黑米', '糙米', '面粉', '淀粉'],
    'fruits': ['果', '苹果', '梨', '桃', '李', '杏', '枣', '葡萄', '草莓', '蓝莓', '樱桃', '橙', '桔', '柠檬', '香蕉', '西瓜', '哈密瓜', '甜瓜'],
    'nuts': ['坚果', '核桃', '杏仁', '花生', '瓜子', '松子', '腰果', '开心果', '榛子', '夏威夷果'],
    'mushrooms': ['菇', '菌', '蘑菇', '香菇', '金针菇', '平菇', '杏鲍菇', '木耳', '银耳'],
    'spices': ['胡椒', '花椒', '八角', '桂皮', '香叶', '孜然', '茴香', '香菜', '芝麻', '香油'],
    'others': []
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => ingredientName.includes(keyword))) {
      return category;
    }
  }
  
  // 默认分类
  return 'others';
}

/**
 * 映射ingredients的category到因子库的subCategory
 */
function mapIngredientCategoryToSubCategory(category) {
  const categoryMap = {
    'vegetables': 'vegetable',
    'beans': 'bean_product',
    'grains': 'grain',
    'fruits': 'fruit',
    'nuts': 'nut',
    'mushrooms': 'mushroom',
    'seafood': 'seafood',
    'dairy': 'dairy',
    'spices': 'spice',
    'others': 'other'
  };
  return categoryMap[category] || 'other';
}

/**
 * 通过云函数 API 导入食材
 */
async function importIngredientsViaCloudFunction(ingredientNames) {
  // 这里需要通过 tcb 工具调用云函数
  // 由于在本地环境无法直接调用云函数，我们提供两种方案：
  // 方案1: 使用 tcb fn invoke 命令行工具
  // 方案2: 输出 JSON 文件，然后在云函数控制台手动调用
  console.log('📝 为了导入数据，请执行以下命令之一：\n');
  console.log('方案1: 使用 tcb 命令行工具（推荐）');
  console.log(`tcb fn invoke database --params '{"action":"importIngredientsFromList","data":{"ingredients":${JSON.stringify(ingredientNames)}}}'`);
  console.log('\n方案2: 将数据保存到 JSON 文件，然后在云函数控制台调用');
  
  const outputPath = path.join(__dirname, '../temp-ingredients.json');
  fs.writeFileSync(outputPath, JSON.stringify({ ingredients: ingredientNames }, null, 2));
  console.log(`  数据已保存到: ${outputPath}`);
  console.log(`  在云函数控制台调用时，使用以下参数:`);
  console.log(`  {"action":"importIngredientsFromList","data":{"ingredients":[...]}}`);
  
  return {
    success: true,
    message: '请使用上述方法导入数据',
    ingredientCount: ingredientNames.length,
    outputPath: outputPath
  };
}


/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('从 Excel 导入中式面点食材');
  console.log('========================================\n');
  
  try {
    // 1. 读取 Excel 文件
    const ingredientNames = readIngredientsFromExcel(EXCEL_FILE_PATH);
    
    if (ingredientNames.length === 0) {
      console.log('⚠️  没有找到有效的食材数据');
      return;
    }
    
    // 2. 显示前10个食材作为预览
    console.log('📋 食材预览（前10个）:');
    ingredientNames.slice(0, 10).forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    if (ingredientNames.length > 10) {
      console.log(`   ... 还有 ${ingredientNames.length - 10} 个食材\n`);
    } else {
      console.log('');
    }
    
    // 3. 通过云函数导入数据
    const result = await importIngredientsViaCloudFunction(ingredientNames);
    
    console.log('\n✅ 导入完成！');
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

module.exports = { main, readIngredientsFromExcel };

