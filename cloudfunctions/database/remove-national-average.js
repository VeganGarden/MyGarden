/**
 * 删除 national_average 区域配置
 * 
 * 注意：此脚本为一次性清理脚本，已执行完成
 * 保留此文件仅作为历史记录，不建议再次执行
 * 
 * @deprecated 此脚本已执行完成，不再需要
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function removeNationalAverage() {
  console.log('===== 开始删除 national_average 区域配置 =====\n');
  
  try {
    // 删除因子区域配置中的 national_average
    const result = await db.collection('region_configs')
      .where({
        configType: 'factor_region',
        code: 'national_average'
      })
      .remove();
    
    console.log(`✅ 已删除 ${result.stats.removed} 条 national_average 配置`);
    
    return {
      code: 0,
      success: true,
      message: '删除 national_average 配置完成',
      data: {
        removed: result.stats.removed
      }
    };
  } catch (error) {
    console.error('删除失败:', error);
    return {
      code: 500,
      success: false,
      message: '删除失败',
      error: error.message
    };
  }
}

exports.main = async (event) => {
  return await removeNationalAverage();
};

