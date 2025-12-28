const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 统一因子库中的 subCategory 值为标准值
 * 
 * 主要修复：
 * - beans -> bean_product (豆制品)
 * 
 * 执行方式：
 * wx.cloud.callFunction({
 *   name: 'database',
 *   data: { action: 'unifyFactorSubCategory' }
 * })
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('开始统一因子库 subCategory 值...');
  console.log('========================================\n');

  const results = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  try {
    // 定义需要统一的映射关系
    const subCategoryMapping = {
      'beans': 'bean_product',  // beans -> bean_product (豆制品)
      // 可以在这里添加其他需要统一的映射
    };

    // 获取所有需要更新的因子
    const factorsCollection = db.collection('carbon_emission_factors');
    
    for (const [oldValue, newValue] of Object.entries(subCategoryMapping)) {
      console.log(`\n处理映射: ${oldValue} -> ${newValue}`);
      
      // 查询所有使用旧值的食材因子
      const queryResult = await factorsCollection
        .where({
          category: 'ingredient',
          subCategory: oldValue
        })
        .get();

      const factors = queryResult.data;
      results.total += factors.length;

      if (factors.length === 0) {
        console.log(`  ✓ 没有找到使用 ${oldValue} 的因子`);
        continue;
      }

      console.log(`  找到 ${factors.length} 个因子需要更新`);

      // 批量更新
      for (const factor of factors) {
        try {
          await factorsCollection.doc(factor._id).update({
            data: {
              subCategory: newValue,
              updatedAt: new Date(),
              updatedBy: 'system'
            }
          });
          results.updated++;
          console.log(`  ✓ 更新因子 ${factor.factorId}: ${oldValue} -> ${newValue}`);
        } catch (error) {
          results.errors.push({
            factorId: factor.factorId,
            error: error.message
          });
          console.error(`  ✗ 更新因子 ${factor.factorId} 失败:`, error.message);
        }
      }
    }

    // 检查是否还有其他非标准的 subCategory 值
    console.log('\n检查其他可能的非标准 subCategory 值...');
    const allFactors = await factorsCollection
      .where({
        category: 'ingredient'
      })
      .get();

    // 获取所有标准的 subCategory 值（从食材类别管理）
    const categoriesCollection = db.collection('ingredient_categories');
    const categoriesResult = await categoriesCollection
      .where({
        status: 'active'
      })
      .get();

    const standardSubCategories = new Set();
    categoriesResult.data.forEach(cat => {
      if (cat.mapping?.factorSubCategory) {
        standardSubCategories.add(cat.mapping.factorSubCategory);
      }
    });

    // 检查因子中的 subCategory 值
    const nonStandardFactors = [];
    allFactors.data.forEach(factor => {
      if (factor.subCategory && !standardSubCategories.has(factor.subCategory)) {
        nonStandardFactors.push({
          factorId: factor.factorId,
          name: factor.name,
          subCategory: factor.subCategory
        });
      }
    });

    if (nonStandardFactors.length > 0) {
      console.log(`\n⚠️  发现 ${nonStandardFactors.length} 个因子使用了非标准的 subCategory 值:`);
      nonStandardFactors.forEach(f => {
        console.log(`  - ${f.factorId} (${f.name}): ${f.subCategory}`);
      });
    } else {
      console.log('  ✓ 所有因子的 subCategory 值都是标准的');
    }

    console.log('\n========================================');
    console.log('统一因子库 subCategory 值完成');
    console.log(`- 总计: ${results.total} 个因子`);
    console.log(`- 已更新: ${results.updated} 个`);
    console.log(`- 跳过: ${results.skipped} 个`);
    console.log(`- 错误: ${results.errors.length} 个`);
    if (nonStandardFactors.length > 0) {
      console.log(`- 非标准值: ${nonStandardFactors.length} 个（需要手动处理）`);
    }
    console.log('========================================\n');

    return {
      code: 0,
      message: '统一因子库 subCategory 值完成',
      results: {
        ...results,
        nonStandardFactors: nonStandardFactors.length > 0 ? nonStandardFactors : undefined
      }
    };

  } catch (error) {
    console.error('❌ 统一因子库 subCategory 值失败:', error);
    return {
      code: 500,
      message: '统一因子库 subCategory 值失败',
      error: error.message,
      results
    };
  }
};

