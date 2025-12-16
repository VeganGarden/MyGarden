/**
 * 从权威数据源初始化因子数据
 * 
 * 功能：
 * 1. 从CSV或JSON格式导入因子数据
 * 2. 数据验证和去重
 * 3. 批量导入到因子库
 * 
 * 执行方式：
 * // 从JSON导入
 * tcb fn invoke database --params '{"action":"initFactorDataFromJSON","factors":[...]}'
 * 
 * // 从CSV导入（需要先上传CSV文件到云存储）
 * tcb fn invoke database --params '{"action":"initFactorDataFromCSV","fileUrl":"cloud://..."}'
 */

const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 生成因子ID
 */
function generateFactorId(name, category, subCategory, region, year) {
  const namePart = (name || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const categoryPart = category || "general";
  const subCategoryPart = subCategory
    ? `_${subCategory.toLowerCase().replace(/\s+/g, "_")}`
    : "";
  const regionPart = region ? `_${region.toLowerCase()}` : "";
  const yearPart = year ? `_${year}` : "";

  return `ef_${namePart}${subCategoryPart}${regionPart}${yearPart}`;
}

/**
 * 验证因子数据
 */
function validateFactorData(factor) {
  const errors = [];

  // 必填字段检查
  if (!factor.name) errors.push("name 是必填字段");
  if (!factor.category) errors.push("category 是必填字段");
  if (factor.factorValue === undefined || factor.factorValue === null) {
    errors.push("factorValue 是必填字段");
  }
  if (!factor.unit) errors.push("unit 是必填字段");
  if (!factor.region) errors.push("region 是必填字段");
  if (!factor.source) errors.push("source 是必填字段");

  // 数值验证
  if (factor.factorValue !== undefined && (isNaN(factor.factorValue) || factor.factorValue < 0)) {
    errors.push("factorValue 必须是有效的正数");
  }

  // 分类验证
  const validCategories = ["ingredient", "energy", "material", "transport"];
  if (factor.category && !validCategories.includes(factor.category)) {
    errors.push(`category 必须是以下之一: ${validCategories.join(", ")}`);
  }

  // 来源验证
  const validSources = ["IPCC", "CLCD", "国家数据库", "CPCD", "Ecoinvent", "internal", "其他"];
  if (factor.source && !validSources.includes(factor.source)) {
    console.warn(`警告: source "${factor.source}" 不在标准列表中，建议使用标准来源`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 从JSON数组导入因子数据
 */
async function importFactorsFromJSON(factors, options = {}) {
  const {
    skipDuplicates = true, // 是否跳过重复数据
    dryRun = false, // 是否只是验证，不实际导入
  } = options;

  const results = {
    total: factors.length,
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const now = new Date();
  const OPENID = "system";

  for (let i = 0; i < factors.length; i++) {
    const factor = factors[i];
    results.processed++;

    try {
      // 数据验证
      const validation = validateFactorData(factor);
      if (!validation.valid) {
        results.failed++;
        results.errors.push({
          index: i + 1,
          name: factor.name || "unknown",
          errors: validation.errors,
        });
        continue;
      }

      // 生成因子ID
      const factorId =
        factor.factorId ||
        generateFactorId(
          factor.name,
          factor.category,
          factor.subCategory,
          factor.region,
          factor.year || new Date().getFullYear()
        );

      // 检查是否已存在
      if (skipDuplicates) {
        const existing = await db
          .collection("carbon_emission_factors")
          .where({
            factorId: factorId,
          })
          .get();

        if (existing.data.length > 0) {
          results.skipped++;
          continue;
        }
      }

      // 准备数据
      const factorData = {
        factorId,
        name: factor.name,
        alias: factor.alias || [],
        category: factor.category,
        subCategory: factor.subCategory || "general",
        factorValue: Number(factor.factorValue),
        unit: factor.unit,
        uncertainty: factor.uncertainty ? Number(factor.uncertainty) : undefined,
        region: factor.region,
        source: factor.source,
        year: factor.year || new Date().getFullYear(),
        version: factor.version || "v1.0",
        boundary: factor.boundary || "cradle-to-gate",
        status: factor.status || "active",
        notes: factor.notes || "",
        createdAt: now,
        updatedAt: now,
        createdBy: OPENID,
        updatedBy: OPENID,
      };

      // 如果是dry run，只验证不导入
      if (dryRun) {
        results.success++;
        continue;
      }

      // 导入数据
      await db.collection("carbon_emission_factors").add({
        data: factorData,
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        index: i + 1,
        name: factor.name || "unknown",
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * 解析CSV数据（简化版，实际使用建议使用csv-parse库）
 */
function parseCSV(csvText) {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // 解析表头
  const headers = lines[0].split(",").map((h) => h.trim());

  // 解析数据行
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      let value = values[index] || "";
      // 处理引号
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      // 处理别名数组
      if (header === "alias" && value) {
        row[header] = value.split(",").map((a) => a.trim());
      } else {
        row[header] = value;
      }
    });
    data.push(row);
  }

  return data;
}

/**
 * 从CSV文件导入因子数据
 */
async function importFactorsFromCSV(fileUrl, options = {}) {
  try {
    // 从云存储下载文件（这里需要根据实际情况实现）
    // const fileContent = await downloadFileFromStorage(fileUrl);
    // const factors = parseCSV(fileContent);

    // 临时实现：如果fileUrl是JSON格式的字符串，直接解析
    // 实际应用中，应该从云存储下载CSV文件
    console.warn("CSV导入功能需要实现文件下载逻辑");
    return {
      success: false,
      error: "CSV导入功能暂未实现，请使用JSON格式导入",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 主函数
 */
exports.main = async (event) => {
  const { action, factors, fileUrl, ...options } = event;

  console.log("========================================");
  console.log("从权威数据源初始化因子数据");
  console.log("========================================\n");

  try {
    if (action === "initFactorDataFromJSON") {
      if (!factors || !Array.isArray(factors)) {
        return {
          success: false,
          error: "factors 必须是数组格式",
        };
      }

      console.log(`准备导入 ${factors.length} 条因子数据...\n`);
      const results = await importFactorsFromJSON(factors, options);

      console.log("========================================");
      console.log("导入结果统计");
      console.log("========================================");
      console.log(`  总计: ${results.total}`);
      console.log(`  ✅ 成功: ${results.success}`);
      console.log(`  ⏭️  跳过: ${results.skipped}`);
      console.log(`  ❌ 失败: ${results.failed}`);
      console.log("");

      if (results.errors.length > 0) {
        console.log("错误详情:");
        results.errors.forEach((err) => {
          console.log(`  - [${err.index}] ${err.name}:`);
          if (err.errors) {
            err.errors.forEach((e) => console.log(`      ${e}`));
          } else {
            console.log(`      ${err.error}`);
          }
        });
        console.log("");
      }

      return {
        success: true,
        results,
        message: `导入完成：成功 ${results.success}，失败 ${results.failed}，跳过 ${results.skipped}`,
      };
    }

    if (action === "initFactorDataFromCSV") {
      if (!fileUrl) {
        return {
          success: false,
          error: "fileUrl 参数是必填的",
        };
      }

      return await importFactorsFromCSV(fileUrl, options);
    }

    return {
      success: false,
      error: `未知的 action: ${action}`,
      message: "支持的 action: initFactorDataFromJSON, initFactorDataFromCSV",
    };
  } catch (error) {
    console.error("❌ 初始化失败:", error);
    return {
      success: false,
      error: error.message,
      message: error.message,
    };
  }
};

