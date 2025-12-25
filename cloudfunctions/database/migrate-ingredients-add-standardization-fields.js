const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 为ingredients集合添加标准化相关字段
 * 添加字段：
 * - standardName: 标准化后的名称
 * - alias: 原始名称作为别名（冗余字段）
 * - isStandardized: 是否已标准化
 * - standardizedAt: 标准化时间
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('开始为ingredients集合添加标准化字段...');
  console.log('========================================\n');

  try {
    const ingredientsCollection = db.collection('ingredients');
    
    // 获取所有ingredients记录（使用分页查询，避免100条限制）
    console.log('📊 查询所有ingredients记录...');
    const MAX_LIMIT = 1000;
    let allIngredients = [];
    let hasMore = true;
    let skip = 0;

    while (hasMore) {
      const result = await ingredientsCollection
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

    const totalCount = allIngredients.length;
    console.log(`   找到 ${totalCount} 条记录\n`);

    if (totalCount === 0) {
      return {
        code: 0,
        message: '没有需要更新的记录',
        updated: 0
      };
    }

    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // 批量更新（每次更新100条）
    const batchSize = 100;
    for (let i = 0; i < totalCount; i += batchSize) {
      const batch = allIngredients.slice(i, i + batchSize);
      console.log(`📝 处理第 ${i + 1}-${Math.min(i + batchSize, totalCount)} 条记录...`);

      for (const ingredient of batch) {
        try {
          // 检查是否已有这些字段
          const hasStandardName = ingredient.hasOwnProperty('standardName');
          const hasAlias = ingredient.hasOwnProperty('alias');
          const hasIsStandardized = ingredient.hasOwnProperty('isStandardized');
          const hasStandardizedAt = ingredient.hasOwnProperty('standardizedAt');

          // 如果所有字段都已存在，跳过
          if (hasStandardName && hasAlias && hasIsStandardized && hasStandardizedAt) {
            skippedCount++;
            continue;
          }

          // 构建更新数据
          const updateData = {};
          if (!hasStandardName) {
            // 初始值：standardName设为name（后续会通过标准化流程更新）
            updateData.standardName = ingredient.name || null;
          }
          if (!hasAlias) {
            // 初始值：alias设为name（原始名称作为别名）
            updateData.alias = ingredient.name || null;
          }
          if (!hasIsStandardized) {
            // 初始值：false（后续通过标准化流程设为true）
            updateData.isStandardized = false;
          }
          if (!hasStandardizedAt) {
            // 初始值：null
            updateData.standardizedAt = null;
          }

          // 更新记录
          await ingredientsCollection.doc(ingredient._id).update({
            data: updateData
          });

          updatedCount++;
        } catch (error) {
          console.error(`❌ 更新记录 ${ingredient._id} 失败:`, error.message);
          errors.push({
            _id: ingredient._id,
            name: ingredient.name,
            error: error.message
          });
        }
      }
    }

    console.log('\n========================================');
    console.log('字段添加完成');
    console.log('========================================\n');
    console.log(`✅ 更新成功: ${updatedCount} 条`);
    console.log(`⏭️  跳过（已存在）: ${skippedCount} 条`);
    if (errors.length > 0) {
      console.log(`❌ 更新失败: ${errors.length} 条`);
    }

    return {
      code: 0,
      message: '字段添加完成',
      summary: {
        total: totalCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : [] // 只返回前10个错误
      }
    };

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return {
      code: 500,
      message: '字段添加失败',
      error: error.message
    };
  }
};

