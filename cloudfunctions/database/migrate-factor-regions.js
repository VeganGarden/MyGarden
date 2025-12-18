/**
 * 因子库区域格式迁移脚本
 * 将旧格式（CN, CN-East等）转换为新格式（national_average, east_china等）
 * 
 * 使用方法：
 * 1. 在云开发控制台调用 database 云函数
 * 2. action: 'migrateFactorRegions'
 * 3. 或者使用命令行：tcb fn invoke database -e your-env-id --data '{"action":"migrateFactorRegions"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 区域映射表：旧格式 -> 新格式
 */
const REGION_MAPPING = {
  'CN': 'national_average',
  'CN-East': 'east_china',
  'CN-North': 'north_china',
  'CN-South': 'south_china',
  'CN-West': 'northwest',
  'Global': 'national_average', // 全球映射到全国平均
};

/**
 * 反向映射：新格式 -> 旧格式（用于回滚）
 */
const REVERSE_MAPPING = {
  'national_average': 'CN',
  'east_china': 'CN-East',
  'north_china': 'CN-North',
  'south_china': 'CN-South',
  'northwest': 'CN-West',
  'northeast': 'CN-North', // 东北映射到华北（因子库无独立东北）
  'central_china': 'CN-East', // 华中映射到华东（因子库无独立华中）
};

/**
 * 迁移因子库区域格式
 */
async function migrateFactorRegions() {
  console.log('========================================');
  console.log('开始迁移因子库区域格式...');
  console.log('========================================\n');

  try {
    // 1. 查询所有需要迁移的因子
    const factorsResult = await db.collection('carbon_emission_factors')
      .where({
        region: _.in(Object.keys(REGION_MAPPING))
      })
      .get();

    const factors = factorsResult.data;
    console.log(`找到 ${factors.length} 个需要迁移的因子\n`);

    if (factors.length === 0) {
      return {
        code: 0,
        message: '没有需要迁移的数据',
        stats: {
          total: 0,
          migrated: 0,
          skipped: 0,
          errors: []
        }
      };
    }

    // 2. 统计信息
    const stats = {
      total: factors.length,
      migrated: 0,
      skipped: 0,
      errors: []
    };

    // 3. 批量更新
    const batchSize = 100;
    for (let i = 0; i < factors.length; i += batchSize) {
      const batch = factors.slice(i, i + batchSize);
      
      for (const factor of batch) {
        try {
          const oldRegion = factor.region;
          const newRegion = REGION_MAPPING[oldRegion];

          if (!newRegion) {
            console.log(`跳过因子 ${factor.factorId}: 区域 ${oldRegion} 无需迁移`);
            stats.skipped++;
            continue;
          }

          // 检查是否已经是新格式
          if (Object.values(REGION_MAPPING).includes(oldRegion)) {
            console.log(`跳过因子 ${factor.factorId}: 已经是新格式 ${oldRegion}`);
            stats.skipped++;
            continue;
          }

          // 更新因子
          await db.collection('carbon_emission_factors')
            .doc(factor._id)
            .update({
              data: {
                region: newRegion,
                updatedAt: new Date()
              }
            });

          console.log(`✓ 迁移因子 ${factor.factorId}: ${oldRegion} -> ${newRegion}`);
          stats.migrated++;

        } catch (error) {
          const errorMsg = `迁移因子 ${factor.factorId} 失败: ${error.message}`;
          console.error(`✗ ${errorMsg}`);
          stats.errors.push({
            factorId: factor.factorId,
            error: errorMsg
          });
        }
      }

      // 每批之间稍作延迟，避免触发限流
      if (i + batchSize < factors.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n========================================');
    console.log('迁移完成！');
    console.log('========================================');
    console.log(`总计: ${stats.total}`);
    console.log(`已迁移: ${stats.migrated}`);
    console.log(`已跳过: ${stats.skipped}`);
    console.log(`错误: ${stats.errors.length}`);
    if (stats.errors.length > 0) {
      console.log('\n错误详情:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.factorId}: ${err.error}`);
      });
    }

    return {
      code: 0,
      message: '迁移完成',
      stats
    };

  } catch (error) {
    console.error('迁移失败:', error);
    return {
      code: 500,
      message: '迁移失败',
      error: error.message
    };
  }
}

/**
 * 回滚迁移（将新格式转回旧格式）
 */
async function rollbackFactorRegions() {
  console.log('========================================');
  console.log('开始回滚因子库区域格式...');
  console.log('========================================\n');

  try {
    // 查询所有新格式的因子
    const newRegions = Object.keys(REVERSE_MAPPING);
    const factorsResult = await db.collection('carbon_emission_factors')
      .where({
        region: _.in(newRegions)
      })
      .get();

    const factors = factorsResult.data;
    console.log(`找到 ${factors.length} 个需要回滚的因子\n`);

    if (factors.length === 0) {
      return {
        code: 0,
        message: '没有需要回滚的数据',
        stats: {
          total: 0,
          rolledBack: 0,
          skipped: 0,
          errors: []
        }
      };
    }

    const stats = {
      total: factors.length,
      rolledBack: 0,
      skipped: 0,
      errors: []
    };

    for (const factor of factors) {
      try {
        const newRegion = factor.region;
        const oldRegion = REVERSE_MAPPING[newRegion];

        if (!oldRegion) {
          stats.skipped++;
          continue;
        }

        await db.collection('carbon_emission_factors')
          .doc(factor._id)
          .update({
            data: {
              region: oldRegion,
              updatedAt: new Date()
            }
          });

        console.log(`✓ 回滚因子 ${factor.factorId}: ${newRegion} -> ${oldRegion}`);
        stats.rolledBack++;

      } catch (error) {
        stats.errors.push({
          factorId: factor.factorId,
          error: error.message
        });
      }
    }

    return {
      code: 0,
      message: '回滚完成',
      stats
    };

  } catch (error) {
    return {
      code: 500,
      message: '回滚失败',
      error: error.message
    };
  }
}

// 导出函数
exports.migrateFactorRegions = migrateFactorRegions;
exports.rollbackFactorRegions = rollbackFactorRegions;

// 如果直接调用此脚本
if (require.main === module) {
  const action = process.argv[2] || 'migrate';
  
  if (action === 'rollback') {
    rollbackFactorRegions().then(result => {
      console.log('\n结果:', JSON.stringify(result, null, 2));
      process.exit(result.code === 0 ? 0 : 1);
    });
  } else {
    migrateFactorRegions().then(result => {
      console.log('\n结果:', JSON.stringify(result, null, 2));
      process.exit(result.code === 0 ? 0 : 1);
    });
  }
}

