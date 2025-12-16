/**
 * 从现有的ingredients和meat_products集合中初始化因子数据
 * 
 * 功能：
 * 1. 查询ingredients集合中的所有食材
 * 2. 查询meat_products集合中的所有食材
 * 3. 查询carbon_emission_factors集合中已有的食材
 * 4. 为缺失的食材创建因子记录（因子值预留为空）
 * 5. 批量导入到因子库
 * 
 * 执行方式：
 * tcb fn invoke database --params '{"action":"initFactorsFromExistingIngredients"}'
 */

const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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
 * 从ingredients集合获取所有食材
 */
async function getAllIngredients() {
  const MAX_LIMIT = 1000; // 单次查询最大限制
  let allIngredients = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const result = await db.collection('ingredients')
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

  return allIngredients;
}

/**
 * 从meat_products集合获取所有食材
 */
async function getAllMeatProducts() {
  const MAX_LIMIT = 1000;
  let allMeatProducts = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const result = await db.collection('meat_products')
      .skip(skip)
      .limit(MAX_LIMIT)
      .get();
    
    if (result.data && result.data.length > 0) {
      allMeatProducts = allMeatProducts.concat(result.data);
      skip += result.data.length;
      hasMore = result.data.length === MAX_LIMIT;
    } else {
      hasMore = false;
    }
  }

  return allMeatProducts;
}

/**
 * 获取因子库中已有的食材名称集合
 */
async function getExistingFactorNames() {
  const MAX_LIMIT = 1000;
  let allFactors = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const result = await db.collection('carbon_emission_factors')
      .field({ name: true, alias: true })
      .skip(skip)
      .limit(MAX_LIMIT)
      .get();
    
    if (result.data && result.data.length > 0) {
      allFactors = allFactors.concat(result.data);
      skip += result.data.length;
      hasMore = result.data.length === MAX_LIMIT;
    } else {
      hasMore = false;
    }
  }

  // 创建名称集合（包括主名称和别名）
  const nameSet = new Set();
  allFactors.forEach(factor => {
    if (factor.name) nameSet.add(factor.name);
    if (factor.alias && Array.isArray(factor.alias)) {
      factor.alias.forEach(alias => nameSet.add(alias));
    }
  });

  return nameSet;
}

/**
 * 将ingredient转换为因子格式
 */
function convertIngredientToFactor(ingredient) {
  const name = ingredient.name || '';
  const category = mapIngredientCategoryToSubCategory(ingredient.category || 'other');
  
  return {
    name: name,
    alias: ingredient.nameEn ? [ingredient.nameEn] : [],
    category: "ingredient",
    subCategory: category,
    factorValue: null, // 预留空值
    unit: "kgCO2e/kg",
    uncertainty: null,
    region: "CN",
    source: "internal",
    year: null,
    version: "v1.0",
    boundary: "cradle-to-gate",
    status: "pending", // 待补充数据
    notes: "从ingredients集合导入，因子值待补充"
  };
}

/**
 * 将meat_product转换为因子格式
 */
function convertMeatProductToFactor(meatProduct) {
  const name = meatProduct.name || '';
  
  return {
    name: name,
    alias: meatProduct.nameEn ? [meatProduct.nameEn] : [],
    category: "ingredient",
    subCategory: "meat",
    factorValue: null, // 预留空值
    unit: "kgCO2e/kg",
    uncertainty: null,
    region: "CN",
    source: "internal",
    year: null,
    version: "v1.0",
    boundary: "cradle-to-gate",
    status: "pending", // 待补充数据
    notes: "从meat_products集合导入，因子值待补充"
  };
}

/**
 * 主函数
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('从现有食材集合初始化因子数据');
  console.log('========================================\n');

  try {
    // 1. 获取所有食材
    console.log('📋 查询ingredients集合...');
    const ingredients = await getAllIngredients();
    console.log(`   找到 ${ingredients.length} 条素食食材\n`);

    console.log('📋 查询meat_products集合...');
    const meatProducts = await getAllMeatProducts();
    console.log(`   找到 ${meatProducts.length} 条荤食食材\n`);

    // 2. 获取因子库中已有的食材名称
    console.log('📋 查询因子库中已有的食材...');
    const existingNames = await getExistingFactorNames();
    console.log(`   因子库中已有 ${existingNames.size} 个不同的食材名称\n`);

    // 3. 转换为因子格式并过滤重复
    console.log('🔄 转换并去重...');
    const newFactors = [];
    const skipped = [];

    // 处理ingredients
    ingredients.forEach(ingredient => {
      const name = ingredient.name;
      if (!name) {
        skipped.push({ source: 'ingredients', reason: '名称为空', data: ingredient });
        return;
      }
      
      // 检查是否已存在
      if (existingNames.has(name)) {
        skipped.push({ source: 'ingredients', name, reason: '已存在于因子库' });
        return;
      }

      const factor = convertIngredientToFactor(ingredient);
      newFactors.push(factor);
      existingNames.add(name); // 添加到集合中，避免后续重复
    });

    // 处理meat_products
    meatProducts.forEach(meatProduct => {
      const name = meatProduct.name;
      if (!name) {
        skipped.push({ source: 'meat_products', reason: '名称为空', data: meatProduct });
        return;
      }
      
      // 检查是否已存在
      if (existingNames.has(name)) {
        skipped.push({ source: 'meat_products', name, reason: '已存在于因子库' });
        return;
      }

      const factor = convertMeatProductToFactor(meatProduct);
      newFactors.push(factor);
      existingNames.add(name); // 添加到集合中，避免后续重复
    });

    console.log(`   新因子: ${newFactors.length} 条`);
    console.log(`   跳过: ${skipped.length} 条\n`);

    if (newFactors.length === 0) {
      return {
        success: true,
        message: "没有新的食材需要导入",
        results: {
          total: 0,
          new: 0,
          skipped: skipped.length,
          skippedDetails: skipped
        }
      };
    }

    // 4. 批量导入（由于factorValue为null，需要修改验证逻辑或使用特殊处理）
    console.log('📥 开始导入因子数据...\n');
    const now = new Date();
    const OPENID = "system";
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < newFactors.length; i++) {
      const factor = newFactors[i];
      
      try {
        const factorId = generateFactorId(
          factor.name,
          factor.category,
          factor.subCategory,
          factor.region,
          factor.year
        );

        // 检查factorId是否已存在
        const existing = await db.collection('carbon_emission_factors')
          .where({ factorId: factorId })
          .get();

        if (existing.data && existing.data.length > 0) {
          console.log(`   ⏭️  跳过: ${factor.name} (factorId已存在)`);
          continue;
        }

        // 添加系统字段
        const factorData = {
          ...factor,
          factorId: factorId,
          createdAt: now,
          updatedAt: now,
          createdBy: OPENID,
          updatedBy: OPENID
        };

        // 插入数据
        await db.collection('carbon_emission_factors').add({
          data: factorData
        });

        successCount++;
        if ((i + 1) % 10 === 0) {
          console.log(`   ✅ 已处理 ${i + 1}/${newFactors.length} 条...`);
        }
      } catch (error) {
        failCount++;
        const errorMsg = `${factor.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`   ❌ 失败: ${errorMsg}`);
      }
    }

    console.log('\n========================================');
    console.log('导入结果统计');
    console.log('========================================');
    console.log(`  总计: ${newFactors.length}`);
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ❌ 失败: ${failCount}`);
    console.log(`  ⏭️  跳过: ${skipped.length}`);
    console.log('');

    return {
      success: true,
      message: `导入完成：成功 ${successCount}，失败 ${failCount}，跳过 ${skipped.length}`,
      results: {
        total: newFactors.length,
        success: successCount,
        failed: failCount,
        skipped: skipped.length,
        errors: errors,
        skippedDetails: skipped.slice(0, 50) // 只返回前50条跳过的详情
      }
    };

  } catch (error) {
    console.error('❌ 执行失败:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};

