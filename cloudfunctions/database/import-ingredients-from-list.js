/**
 * 从食材列表导入到基础食材库和因子库
 * 
 * 功能：
 * 1. 接收食材名称列表
 * 2. 检查 ingredients 集合中是否已存在，如果存在则跳过
 * 3. 插入新食材到 ingredients 集合
 * 4. 同步插入到 carbon_emission_factors 集合
 * 
 * 执行方式：
 * tcb fn invoke database --params '{"action":"importIngredientsFromList","data":{"ingredients":["食材1","食材2",...]}}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入标准化服务模块
const standardizer = require('./ingredient-standardizer');

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

// 引入类别工具模块
const categoryUtils = require('./category-utils');

/**
 * 主函数
 */
exports.main = async (event) => {
  const { ingredients } = event.data || event;
  
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return {
      success: false,
      message: '请提供有效的食材列表',
      code: 400
    };
  }
  
  console.log('========================================');
  console.log('从列表导入食材到基础食材库和因子库');
  console.log('========================================\n');
  console.log(`📋 收到 ${ingredients.length} 个食材名称\n`);
  
  try {
    // 1. 查询数据库中已存在的食材名称
    console.log('🔍 查询数据库中已存在的食材...');
    const MAX_LIMIT = 1000;
    let allExistingIngredients = [];
    let hasMore = true;
    let skip = 0;
    
    while (hasMore) {
      const result = await db.collection('ingredients')
        .field({ name: true })
        .skip(skip)
        .limit(MAX_LIMIT)
        .get();
      
      if (result.data && result.data.length > 0) {
        allExistingIngredients = allExistingIngredients.concat(result.data);
        skip += result.data.length;
        hasMore = result.data.length === MAX_LIMIT;
      } else {
        hasMore = false;
      }
    }
    
    const existingNames = new Set(allExistingIngredients.map(ing => ing.name));
    console.log(`   数据库中已有 ${existingNames.size} 个食材\n`);
    
    // 2. 查询因子库中已存在的食材名称
    console.log('🔍 查询因子库中已存在的食材...');
    let allExistingFactors = [];
    hasMore = true;
    skip = 0;
    
    while (hasMore) {
      const result = await db.collection('carbon_emission_factors')
        .where({
          category: 'ingredient'
        })
        .field({ name: true, alias: true })
        .skip(skip)
        .limit(MAX_LIMIT)
        .get();
      
      if (result.data && result.data.length > 0) {
        allExistingFactors = allExistingFactors.concat(result.data);
        skip += result.data.length;
        hasMore = result.data.length === MAX_LIMIT;
      } else {
        hasMore = false;
      }
    }
    
    const existingFactorNames = new Set();
    allExistingFactors.forEach(factor => {
      if (factor.name) existingFactorNames.add(factor.name);
      if (factor.alias && Array.isArray(factor.alias)) {
        factor.alias.forEach(alias => existingFactorNames.add(alias));
      }
    });
    console.log(`   因子库中已有 ${existingFactorNames.size} 个食材\n`);
    
    // 3. 过滤出需要导入的新食材
    const newIngredients = [];
    const skipped = [];
    
    for (const ingredientName of ingredients) {
      const name = String(ingredientName).trim();
      if (!name || name === '') {
        skipped.push({ name: ingredientName, reason: '名称为空' });
        continue;
      }
      
      if (existingNames.has(name)) {
        skipped.push({ name: name, reason: '已存在于食材库' });
        continue;
      }
      
      newIngredients.push(name);
    }
    
    console.log(`📊 统计结果:`);
    console.log(`   总食材数: ${ingredients.length}`);
    console.log(`   新食材数: ${newIngredients.length}`);
    console.log(`   跳过数: ${skipped.length}\n`);
    
    if (newIngredients.length === 0) {
      return {
        success: true,
        message: '没有新食材需要导入',
        results: {
          total: ingredients.length,
          new: 0,
          skipped: skipped.length,
          skippedDetails: skipped
        }
      };
    }
    
    // 4. 批量插入新食材
    console.log('📥 开始插入新食材...\n');
    const now = new Date();
    const OPENID = "system";
    let ingredientSuccessCount = 0;
    let factorSuccessCount = 0;
    let ingredientFailCount = 0;
    let factorFailCount = 0;
    const errors = [];
    
    for (let i = 0; i < newIngredients.length; i++) {
      const ingredientName = newIngredients[i];
      const category = await categoryUtils.inferCategory(ingredientName);
      const subCategory = await categoryUtils.mapCategoryToFactorSubCategory(category);
      
      try {
        // 1. 调用标准化服务标准化名称
        let standardName = await standardizer.standardizeIngredientName(ingredientName);
        
        // 2. 如果未找到标准名称，检查是否需要创建新的标准名称
        if (!standardName) {
          // 检查是否已存在标准名称记录
          const existingStandard = await db.collection('ingredient_standards')
            .where({
              standardName: ingredientName,
              status: 'active'
            })
            .limit(1)
            .get();
          
          if (existingStandard.data.length === 0) {
            // 创建新的标准名称记录
            await db.collection('ingredient_standards').add({
              data: {
                standardName: ingredientName,
                nameEn: null,
                category: category,
                subCategory: subCategory,
                description: null,
                defaultUnit: 'g',
                carbonCoefficient: null,
                status: 'active',
                version: 1,
                createdAt: now,
                updatedAt: now,
                createdBy: OPENID,
                updatedBy: OPENID
              }
            });
          }
          standardName = ingredientName; // 使用原始名称作为标准名称
        }
        
        // 3. 建立别名映射关系（如果原始名称不是标准名称）
        if (ingredientName !== standardName) {
          // 检查别名映射是否已存在
          const existingAlias = await db.collection('ingredient_aliases')
            .where({
              alias: ingredientName,
              standardName: standardName
            })
            .limit(1)
            .get();
          
          if (existingAlias.data.length === 0) {
            // 创建别名映射
            await db.collection('ingredient_aliases').add({
              data: {
                alias: ingredientName,
                standardName: standardName,
                confidence: 1.0,
                source: 'import',
                status: 'active',
                createdAt: now,
                updatedAt: now,
                createdBy: OPENID
              }
            });
          }
        }
        
        // 4. 插入到 ingredients 集合（包含standardName字段）
        const ingredientData = {
          name: ingredientName,
          standardName: standardName, // 标准化后的名称
          alias: ingredientName, // 原始名称作为别名
          isStandardized: true,
          standardizedAt: now,
          category: category,
          nameEn: null,
          description: null,
          carbonCoefficient: null,
          createdAt: now,
          updatedAt: now,
          createdBy: OPENID,
          updatedBy: OPENID
        };
        
        await db.collection('ingredients').add({
          data: ingredientData
        });
        
        ingredientSuccessCount++;
        
        // 插入到 carbon_emission_factors 集合（如果因子库中不存在）
        if (!existingFactorNames.has(ingredientName)) {
          try {
            const factorId = generateFactorId(
              ingredientName,
              'ingredient',
              subCategory,
              'CN',
              null
            );
            
            // 检查 factorId 是否已存在
            const existingFactor = await db.collection('carbon_emission_factors')
              .where({ factorId: factorId })
              .get();
            
            if (existingFactor.data.length === 0) {
              const factorData = {
                name: ingredientName,
                alias: [],
                category: 'ingredient',
                subCategory: subCategory,
                factorValue: null,
                unit: 'kgCO2e/kg',
                uncertainty: null,
                region: 'CN',
                source: 'internal',
                year: null,
                version: 'v1.0',
                boundary: 'cradle-to-gate',
                status: 'pending',
                factorId: factorId,
                notes: '从面点产品食材量化表导入，因子值待补充',
                createdAt: now,
                updatedAt: now,
                createdBy: OPENID,
                updatedBy: OPENID
              };
              
              await db.collection('carbon_emission_factors').add({
                data: factorData
              });
              
              factorSuccessCount++;
              existingFactorNames.add(ingredientName);
            }
          } catch (factorError) {
            factorFailCount++;
            errors.push({
              name: ingredientName,
              type: 'factor',
              error: factorError.message
            });
            console.error(`   ⚠️  因子插入失败: ${ingredientName} - ${factorError.message}`);
          }
        }
        
        if ((i + 1) % 10 === 0) {
          console.log(`   ✅ 已处理 ${i + 1}/${newIngredients.length} 个食材...`);
        }
        
      } catch (error) {
        ingredientFailCount++;
        errors.push({
          name: ingredientName,
          type: 'ingredient',
          error: error.message
        });
        console.error(`   ❌ 食材插入失败: ${ingredientName} - ${error.message}`);
      }
    }
    
    console.log('\n========================================');
    console.log('导入结果统计');
    console.log('========================================');
    console.log(`  总食材数: ${ingredients.length}`);
    console.log(`  新食材数: ${newIngredients.length}`);
    console.log(`  跳过数: ${skipped.length}`);
    console.log(`\n  食材库:`);
    console.log(`    ✅ 成功: ${ingredientSuccessCount}`);
    console.log(`    ❌ 失败: ${ingredientFailCount}`);
    console.log(`\n  因子库:`);
    console.log(`    ✅ 成功: ${factorSuccessCount}`);
    console.log(`    ❌ 失败: ${factorFailCount}`);
    console.log('');
    
    return {
      success: true,
      message: `导入完成：食材库成功 ${ingredientSuccessCount}，因子库成功 ${factorSuccessCount}`,
      results: {
        total: ingredients.length,
        new: newIngredients.length,
        skipped: skipped.length,
        ingredientSuccess: ingredientSuccessCount,
        ingredientFailed: ingredientFailCount,
        factorSuccess: factorSuccessCount,
        factorFailed: factorFailCount,
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


