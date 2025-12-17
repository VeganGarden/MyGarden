/**
 * 验证因子数据迁移的完整性
 *
 * 功能：
 * 1. 检查ingredients集合中哪些记录有因子值但没有在因子库中找到对应记录
 * 2. 检查meat_products集合中哪些记录有因子值但没有在因子库中找到对应记录
 * 3. 检查因子库中哪些记录的因子值已从原集合迁移
 * 4. 统计迁移完成情况
 *
 * 执行方式：
 * tcb fn invoke database --params '{"action":"verifyFactorsMigration"}'
 */

const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 生成因子ID（与实际代码保持一致）
 */
function generateFactorId(name, category, subCategory, region, year) {
  let namePart = "";
  if (name) {
    const hasChinese = /[\u4e00-\u9fa5]/.test(name);
    if (hasChinese) {
      const base64Name = Buffer.from(name, "utf8")
        .toString("base64")
        .replace(/[=+/]/g, "")
        .substring(0, 8);
      namePart = base64Name.toLowerCase();
    } else {
      namePart = name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
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
    vegetables: "vegetable",
    beans: "bean_product",
    grains: "grain",
    fruits: "fruit",
    nuts: "nut",
    mushrooms: "mushroom",
    seafood: "seafood",
    dairy: "dairy",
    spices: "spice",
    others: "other",
  };
  return categoryMap[category] || category || "other";
}

/**
 * 从ingredients集合获取所有食材（分批获取）
 */
async function getAllIngredients() {
  const MAX_LIMIT = 1000;
  let allIngredients = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const result = await db
      .collection("ingredients")
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
 * 从meat_products集合获取所有食材（分批获取）
 */
async function getAllMeatProducts() {
  const MAX_LIMIT = 1000;
  let allMeatProducts = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const result = await db
      .collection("meat_products")
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
 * 提取ingredient的因子值
 */
function extractIngredientFactorValue(ingredient) {
  if (ingredient.carbonCoefficient) {
    return ingredient.carbonCoefficient;
  } else if (
    ingredient.carbonFootprint &&
    typeof ingredient.carbonFootprint === "number"
  ) {
    return ingredient.carbonFootprint;
  } else if (
    ingredient.carbonFootprint &&
    ingredient.carbonFootprint.coefficient
  ) {
    return ingredient.carbonFootprint.coefficient;
  }
  return null;
}

/**
 * 验证ingredients迁移完整性
 */
async function verifyIngredientsMigration() {
  const ingredients = await getAllIngredients();
  const results = {
    total: ingredients.length,
    withFactorValue: 0,
    migrated: 0,
    notMigrated: [],
    noFactorValue: 0,
  };

  for (const ingredient of ingredients) {
    const factorValue = extractIngredientFactorValue(ingredient);

    if (!factorValue || factorValue <= 0) {
      results.noFactorValue++;
      continue;
    }

    results.withFactorValue++;

    // 查找因子库中对应的记录
    const subCategory = mapIngredientCategoryToSubCategory(
      ingredient.category
    );
    const existingFactors = await db
      .collection("carbon_emission_factors")
      .where({
        name: ingredient.name,
        category: "ingredient",
        subCategory: subCategory,
      })
      .get();

    if (existingFactors.data.length > 0) {
      const factor = existingFactors.data[0];
      // 检查因子值是否已迁移（不为null）
      if (factor.factorValue !== null && factor.factorValue !== undefined) {
        results.migrated++;
      } else {
        results.notMigrated.push({
          id: ingredient._id,
          name: ingredient.name,
          factorValue: factorValue,
          reason: "因子库中存在记录但因子值为空",
        });
      }
    } else {
      results.notMigrated.push({
        id: ingredient._id,
        name: ingredient.name,
        factorValue: factorValue,
        reason: "因子库中未找到对应的因子记录",
      });
    }
  }

  return results;
}

/**
 * 验证meat_products迁移完整性
 */
async function verifyMeatProductsMigration() {
  const meatProducts = await getAllMeatProducts();
  const results = {
    total: meatProducts.length,
    withFactorValue: 0,
    migrated: 0,
    notMigrated: [],
    noFactorValue: 0,
  };

  for (const product of meatProducts) {
    const factorValue = product.carbonFootprint;

    if (!factorValue || factorValue <= 0 || typeof factorValue !== "number") {
      results.noFactorValue++;
      continue;
    }

    results.withFactorValue++;

    // 查找因子库中对应的记录
    const existingFactors = await db
      .collection("carbon_emission_factors")
      .where({
        name: product.name,
        category: "ingredient",
        subCategory: "meat",
      })
      .get();

    if (existingFactors.data.length > 0) {
      const factor = existingFactors.data[0];
      // 检查因子值是否已迁移（不为null）
      if (factor.factorValue !== null && factor.factorValue !== undefined) {
        results.migrated++;
      } else {
        results.notMigrated.push({
          id: product._id,
          name: product.name,
          factorValue: factorValue,
          reason: "因子库中存在记录但因子值为空",
        });
      }
    } else {
      results.notMigrated.push({
        id: product._id,
        name: product.name,
        factorValue: factorValue,
        reason: "因子库中未找到对应的因子记录",
      });
    }
  }

  return results;
}

/**
 * 主函数
 */
exports.main = async (event) => {
  console.log("========================================");
  console.log("验证因子数据迁移完整性");
  console.log("========================================\n");

  try {
    // 验证ingredients迁移
    console.log("[1/2] 验证ingredients迁移完整性...");
    const ingredientsResult = await verifyIngredientsMigration();
    console.log(`  总记录数: ${ingredientsResult.total}`);
    console.log(`  有因子值的记录: ${ingredientsResult.withFactorValue}`);
    console.log(`  已迁移: ${ingredientsResult.migrated}`);
    console.log(`  未迁移: ${ingredientsResult.notMigrated.length}`);
    console.log(`  无因子值: ${ingredientsResult.noFactorValue}`);

    // 验证meat_products迁移
    console.log("\n[2/2] 验证meat_products迁移完整性...");
    const meatProductsResult = await verifyMeatProductsMigration();
    console.log(`  总记录数: ${meatProductsResult.total}`);
    console.log(`  有因子值的记录: ${meatProductsResult.withFactorValue}`);
    console.log(`  已迁移: ${meatProductsResult.migrated}`);
    console.log(`  未迁移: ${meatProductsResult.notMigrated.length}`);
    console.log(`  无因子值: ${meatProductsResult.noFactorValue}`);

    // 统计汇总
    const totalWithFactorValue =
      ingredientsResult.withFactorValue + meatProductsResult.withFactorValue;
    const totalMigrated =
      ingredientsResult.migrated + meatProductsResult.migrated;
    const totalNotMigrated =
      ingredientsResult.notMigrated.length +
      meatProductsResult.notMigrated.length;
    const migrationRate =
      totalWithFactorValue > 0
        ? ((totalMigrated / totalWithFactorValue) * 100).toFixed(2)
        : 0;

    console.log("\n========================================");
    console.log("验证结果汇总");
    console.log("========================================");
    console.log(`总记录数: ${ingredientsResult.total + meatProductsResult.total}`);
    console.log(
      `有因子值的记录: ${totalWithFactorValue} (ingredients: ${ingredientsResult.withFactorValue}, meat_products: ${meatProductsResult.withFactorValue})`
    );
    console.log(
      `已成功迁移: ${totalMigrated} (ingredients: ${ingredientsResult.migrated}, meat_products: ${meatProductsResult.migrated})`
    );
    console.log(
      `未迁移: ${totalNotMigrated} (ingredients: ${ingredientsResult.notMigrated.length}, meat_products: ${meatProductsResult.notMigrated.length})`
    );
    console.log(`迁移完成率: ${migrationRate}%`);
    console.log("========================================\n");

    return {
      success: true,
      results: {
        ingredients: ingredientsResult,
        meatProducts: meatProductsResult,
        summary: {
          totalWithFactorValue,
          totalMigrated,
          totalNotMigrated,
          migrationRate: parseFloat(migrationRate),
        },
      },
      message: "验证完成",
    };
  } catch (error) {
    console.error("❌ 验证失败:", error);
    return {
      success: false,
      error: error.message,
      message: "验证失败",
    };
  }
};

