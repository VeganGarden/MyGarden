/**
 * 将所有因子的适用区域更新为 CN
 * 
 * 功能：
 * 1. 查找所有 carbon_emission_factors 集合中的记录
 * 2. 将 region 字段更新为 'CN'
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"updateAllFactorsRegionToCN"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

async function updateAllFactorsRegionToCN() {
  console.log('===== 开始更新所有因子的适用区域为 CN =====\n');
  
  try {
    // 1. 统计需要更新的记录数
    const countResult = await db.collection('carbon_emission_factors')
      .where({
        status: 'active'
      })
      .count();
    
    const total = countResult.total;
    console.log(`找到 ${total} 条激活状态的因子记录\n`);
    
    if (total === 0) {
      return {
        code: 0,
        success: true,
        message: '没有需要更新的因子记录',
        data: {
          updated: 0,
          total: 0
        }
      };
    }
    
    // 2. 批量更新所有记录的 region 字段为 'CN'
    // 使用 update 命令批量更新
    let updated = 0;
    let failed = 0;
    const batchSize = 100; // 每次处理100条
    
    // 分批处理
    for (let skip = 0; skip < total; skip += batchSize) {
      // 获取当前批次的记录
      const batch = await db.collection('carbon_emission_factors')
        .where({
          status: 'active'
        })
        .skip(skip)
        .limit(batchSize)
        .get();
      
      if (batch.data.length === 0) {
        break;
      }
      
      // 批量更新当前批次的记录
      for (const factor of batch.data) {
        try {
          await db.collection('carbon_emission_factors')
            .doc(factor._id)
            .update({
              data: {
                region: 'CN',
                updatedAt: new Date(),
                updatedBy: 'system'
              }
            });
          updated++;
          
          if (updated % 50 === 0) {
            console.log(`  已更新 ${updated}/${total} 条记录...`);
          }
        } catch (error) {
          console.error(`更新因子 ${factor._id} 失败:`, error);
          failed++;
        }
      }
    }
    
    console.log(`\n===== 更新完成 =====`);
    console.log(`总计: ${total} 条`);
    console.log(`成功: ${updated} 条`);
    console.log(`失败: ${failed} 条`);
    
    return {
      code: 0,
      success: true,
      message: '更新因子适用区域完成',
      data: {
        updated,
        failed,
        total
      }
    };
  } catch (error) {
    console.error('更新失败:', error);
    return {
      code: 500,
      success: false,
      message: '更新失败',
      error: error.message
    };
  }
}

exports.main = async (event) => {
  return await updateAllFactorsRegionToCN();
};

