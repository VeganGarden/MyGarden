/**
 * 修复区域配置的默认值设置
 * 
 * 注意：此脚本为一次性修复脚本，已执行完成
 * 保留此文件仅作为历史记录，不建议再次执行
 * 
 * @deprecated 此脚本已执行完成，不再需要
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function fixRegionConfigDefaults() {
  console.log('===== 开始修复区域配置默认值 =====\n');
  
  try {
    // 1. 获取所有因子区域配置
    const factorRegions = await db.collection('region_configs')
      .where({
        configType: 'factor_region',
        status: 'active'
      })
      .get();
    
    console.log(`找到 ${factorRegions.data.length} 个因子区域配置\n`);
    
    let updated = 0;
    let skipped = 0;
    
    // 2. 更新除 national_average 之外的所有配置
    for (const region of factorRegions.data) {
      if (region.code === 'national_average') {
        // national_average 保持为默认
        if (!region.isDefault) {
          await db.collection('region_configs').doc(region._id).update({
            data: {
              isDefault: true,
              updatedAt: new Date(),
              updatedBy: 'system'
            }
          });
          console.log(`✅ 设置 ${region.code} (${region.name}) 为默认值`);
          updated++;
        } else {
          console.log(`⏭️  ${region.code} (${region.name}) 已经是默认值，跳过`);
          skipped++;
        }
      } else {
        // 其他国家的配置设置为非默认
        if (region.isDefault) {
          await db.collection('region_configs').doc(region._id).update({
            data: {
              isDefault: false,
              updatedAt: new Date(),
              updatedBy: 'system'
            }
          });
          console.log(`✅ 取消 ${region.code} (${region.name}) 的默认值设置`);
          updated++;
        } else {
          console.log(`⏭️  ${region.code} (${region.name}) 已经不是默认值，跳过`);
          skipped++;
        }
      }
    }
    
    console.log(`\n===== 修复完成 =====`);
    console.log(`更新: ${updated} 个配置`);
    console.log(`跳过: ${skipped} 个配置`);
    
    return {
      code: 0,
      success: true,
      message: '区域配置默认值修复完成',
      data: {
        updated,
        skipped,
        total: factorRegions.data.length
      }
    };
  } catch (error) {
    console.error('修复失败:', error);
    return {
      code: 500,
      success: false,
      message: '修复失败',
      error: error.message
    };
  }
}

exports.main = async (event) => {
  return await fixRegionConfigDefaults();
};

