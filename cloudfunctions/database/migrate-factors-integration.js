/**
 * 因子数据整合迁移脚本
 *
 * 功能：
 * 1. 从 ingredients 集合提取 carbonCoefficient/carbonFootprint，更新因子库中对应的因子记录
 * 2. 从 meat_products 集合提取 carbonFootprint，更新因子库中对应的因子记录
 * 3. （可选）删除 ingredients 和 meat_products 中的因子字段
 *
 * 注意：
 * - 此脚本假设因子库中已经通过 init-factors-from-existing-ingredients.js 创建了因子记录
 * - 此脚本会更新现有因子记录的 factorValue，而不是创建新记录
 * - 删除字段的操作需要通过 removeFactorFields 参数控制
 *
 * 执行方式：
 * tcb fn invoke database --params '{"action":"migrateFactorsIntegration","removeFactorFields":false}'
 */

const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 生成因子ID（与实际代码保持一致）
 * 使用Base64编码处理中文名称，确保唯一性
 */
function generateFactorId(name, category, subCategory, region, year) {
  let namePart = "";
  if (name) {
    const hasChinese = /[\u4e00-\u9fa5]/.test(name);
    if (hasChinese) {
      // 中文名称使用Base64编码（取前8个字符，去掉等号）
      const base64Name = Buffer.from(name, "utf8")
        .toString("base64")
        .replace(/[=+/]/g, "")
        .substring(0, 8);
      namePart = base64Name.toLowerCase();
    } else {
      // 英文名称直接转换
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

// 引入类别工具模块
let categoryUtils = null;
try {
  categoryUtils = require('./category-utils');
} catch (error) {
  console.warn('类别工具模块未找到，将使用原有映射逻辑');
}

/**
 * 映射ingredients的category到因子库的subCategory
 * 使用类别工具模块（如果可用），否则回退到硬编码映射
 */
async function mapIngredientCategoryToSubCategory(category) {
  if (categoryUtils) {
    try {
      const categoryDoc = await categoryUtils.getCategoryByCode(category);
      return categoryDoc?.mapping?.factorSubCategory || category || 'other';
    } catch (error) {
      console.error('从类别工具模块获取因子子类别失败，回退到硬编码映射:', error);
    }
  }
  // 回退到硬编码映射
  const categoryMap = categoryUtils?.getFallbackCategoryMap() || {
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
 * 从ingredients集合提取因子值并更新因子库
 */
async function migrateIngredientsFactors(dryRun = false) {
  const ingredients = await getAllIngredients();
  const results = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const ingredient of ingredients) {
    try {
      // 提取因子值
      let factorValue = null;
      if (ingredient.carbonCoefficient) {
        factorValue = ingredient.carbonCoefficient;
      } else if (
        ingredient.carbonFootprint &&
        typeof ingredient.carbonFootprint === "number"
      ) {
        factorValue = ingredient.carbonFootprint;
      } else if (
        ingredient.carbonFootprint &&
        ingredient.carbonFootprint.coefficient
      ) {
        factorValue = ingredient.carbonFootprint.coefficient;
      }

      if (!factorValue || factorValue <= 0) {
        results.skipped++;
        continue;
      }

      // 查找因子库中对应的因子记录（通过name匹配）
      const subCategory = await mapIngredientCategoryToSubCategory(
        ingredient.category
      );
      const factorId = generateFactorId(
        ingredient.name,
        "ingredient",
        subCategory,
        "CN",
        new Date().getFullYear()
      );

      const existingFactors = await db
        .collection("carbon_emission_factors")
        .where({
          name: ingredient.name,
          category: "ingredient",
          subCategory: subCategory,
        })
        .get();

      if (existingFactors.data.length === 0) {
        results.skipped++;
        results.errors.push({
          type: "ingredient",
          id: ingredient._id,
          name: ingredient.name,
          error: "因子库中未找到对应的因子记录",
        });
        continue;
      }

      // 更新第一个匹配的因子记录（通常只有一个）
      const factor = existingFactors.data[0];
      if (!dryRun) {
        await db
          .collection("carbon_emission_factors")
          .doc(factor._id)
          .update({
            data: {
              factorValue: factorValue,
              status: "active", // 从pending改为active
              updatedAt: new Date(),
              updatedBy: "system_migration",
              notes: factor.notes
                ? `${factor.notes}; 因子值已从ingredients集合迁移`
                : `因子值从ingredients集合迁移，原食材ID: ${ingredient._id}`,
            },
          });
      }
      results.updated++;
      results.processed++;
    } catch (error) {
      results.errors.push({
        type: "ingredient",
        id: ingredient._id,
        name: ingredient.name,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * 从meat_products集合提取因子值并更新因子库
 */
async function migrateMeatProductsFactors(dryRun = false) {
  const meatProducts = await getAllMeatProducts();
  const results = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const product of meatProducts) {
    try {
      // 提取因子值
      const factorValue = product.carbonFootprint;

      if (!factorValue || factorValue <= 0 || typeof factorValue !== "number") {
        results.skipped++;
        continue;
      }

      // 查找因子库中对应的因子记录（通过name匹配）
      const existingFactors = await db
        .collection("carbon_emission_factors")
        .where({
          name: product.name,
          category: "ingredient",
          subCategory: "meat",
        })
        .get();

      if (existingFactors.data.length === 0) {
        results.skipped++;
        results.errors.push({
          type: "meat_product",
          id: product._id,
          name: product.name,
          error: "因子库中未找到对应的因子记录",
        });
        continue;
      }

      // 更新第一个匹配的因子记录（通常只有一个）
      const factor = existingFactors.data[0];
      if (!dryRun) {
        await db
          .collection("carbon_emission_factors")
          .doc(factor._id)
          .update({
            data: {
              factorValue: factorValue,
              status: "active", // 从pending改为active
              updatedAt: new Date(),
              updatedBy: "system_migration",
              notes: factor.notes
                ? `${factor.notes}; 因子值已从meat_products集合迁移`
                : `因子值从meat_products集合迁移，原产品ID: ${product._id}`,
            },
          });
      }
      results.updated++;
      results.processed++;
    } catch (error) {
      results.errors.push({
        type: "meat_product",
        id: product._id,
        name: product.name,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * 删除ingredients集合中的因子字段
 */
async function removeIngredientFactorFields() {
  const ingredients = await getAllIngredients();
  let removed = 0;

  for (const ingredient of ingredients) {
    const updateData = {};

    if (ingredient.carbonCoefficient !== undefined) {
      updateData.carbonCoefficient = db.command.remove();
    }
    if (ingredient.carbonFootprint !== undefined) {
      updateData.carbonFootprint = db.command.remove();
    }

    if (Object.keys(updateData).length > 0) {
      await db
        .collection("ingredients")
        .doc(ingredient._id)
        .update({ data: updateData });
      removed++;
    }
  }

  return removed;
}

/**
 * 删除meat_products集合中的因子字段
 */
async function removeMeatProductFactorFields() {
  const meatProducts = await getAllMeatProducts();
  let removed = 0;

  for (const product of meatProducts) {
    if (product.carbonFootprint !== undefined) {
      await db
        .collection("meat_products")
        .doc(product._id)
        .update({
          data: { carbonFootprint: db.command.remove() },
        });
      removed++;
    }
  }

  return removed;
}

/**
 * 主函数
 */
exports.main = async (event) => {
  const { dryRun = false, removeFactorFields = false } = event;

  console.log("========================================");
  console.log("开始因子数据整合迁移");
  console.log("========================================\n");
  console.log(`执行模式: ${dryRun ? "预览模式（不会实际更新数据）" : "执行模式（将实际更新数据）"}`);
  console.log(`删除字段: ${removeFactorFields ? "是（将删除原集合中的因子字段）" : "否（仅更新因子库）"}\n`);

  const results = {
    ingredients: null,
    meatProducts: null,
    removedFromIngredients: 0,
    removedFromMeatProducts: 0,
    errors: [],
  };

  try {
    // Step 1: 从 ingredients 迁移因子数据
    console.log("[Step 1/4] 从 ingredients 集合迁移因子数据...");
    results.ingredients = await migrateIngredientsFactors(dryRun);
    console.log(
      `  ✅ 处理 ${results.ingredients.processed} 条，更新 ${results.ingredients.updated} 条因子，跳过 ${results.ingredients.skipped} 条`
    );
    if (results.ingredients.errors.length > 0) {
      console.log(`  ⚠️  ${results.ingredients.errors.length} 条错误`);
    }

    // Step 2: 从 meat_products 迁移因子数据
    console.log("\n[Step 2/4] 从 meat_products 集合迁移因子数据...");
    results.meatProducts = await migrateMeatProductsFactors(dryRun);
    console.log(
      `  ✅ 处理 ${results.meatProducts.processed} 条，更新 ${results.meatProducts.updated} 条因子，跳过 ${results.meatProducts.skipped} 条`
    );
    if (results.meatProducts.errors.length > 0) {
      console.log(`  ⚠️  ${results.meatProducts.errors.length} 条错误`);
    }

    // Step 3: 删除 ingredients 中的因子字段（如果指定）
    if (removeFactorFields && !dryRun) {
      console.log("\n[Step 3/4] 删除 ingredients 集合中的因子字段...");
      results.removedFromIngredients = await removeIngredientFactorFields();
      console.log(
        `  ✅ 已删除 ${results.removedFromIngredients} 条记录的因子字段`
      );
    } else if (removeFactorFields && dryRun) {
      console.log("\n[Step 3/4] 预览模式：将删除 ingredients 集合中的因子字段...");
      console.log("  ⚠️  预览模式，未实际删除");
    } else {
      console.log("\n[Step 3/4] 跳过删除 ingredients 集合中的因子字段（removeFactorFields=false）");
    }

    // Step 4: 删除 meat_products 中的因子字段（如果指定）
    if (removeFactorFields && !dryRun) {
      console.log("\n[Step 4/4] 删除 meat_products 集合中的因子字段...");
      results.removedFromMeatProducts = await removeMeatProductFactorFields();
      console.log(
        `  ✅ 已删除 ${results.removedFromMeatProducts} 条记录的因子字段`
      );
    } else if (removeFactorFields && dryRun) {
      console.log("\n[Step 4/4] 预览模式：将删除 meat_products 集合中的因子字段...");
      console.log("  ⚠️  预览模式，未实际删除");
    } else {
      console.log("\n[Step 4/4] 跳过删除 meat_products 集合中的因子字段（removeFactorFields=false）");
    }

    console.log("\n========================================");
    console.log(dryRun ? "✅ 预览完成" : "✅ 因子数据整合迁移完成");
    console.log("========================================\n");
    console.log("📊 迁移统计:");
    console.log(
      `  - ingredients → 因子库: 更新 ${results.ingredients.updated} 条，跳过 ${results.ingredients.skipped} 条`
    );
    console.log(
      `  - meat_products → 因子库: 更新 ${results.meatProducts.updated} 条，跳过 ${results.meatProducts.skipped} 条`
    );
    if (removeFactorFields && !dryRun) {
      console.log(
        `  - 删除字段: ingredients ${results.removedFromIngredients} 条, meat_products ${results.removedFromMeatProducts} 条`
      );
    }
    console.log("");

    if (dryRun) {
      console.log("💡 这是预览模式，未实际修改数据");
      console.log("💡 如需执行迁移，请设置 dryRun: false");
    }

    return {
      success: true,
      dryRun,
      results,
      message: dryRun ? "预览完成" : "迁移完成",
    };
  } catch (error) {
    console.error("❌ 迁移失败:", error);
    return {
      success: false,
      error: error.message,
      results,
    };
  }
};

