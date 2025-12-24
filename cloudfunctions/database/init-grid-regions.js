/**
 * 电网区域配置初始化脚本
 * 
 * 功能：
 * 在因子区域（factor_region）中添加电网区域配置，作为CN的子区域
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"initGridRegions"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化电网区域配置数据
 */
async function initGridRegions() {
  console.log('===== 开始初始化电网区域配置数据 =====\n');
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  const now = new Date();

  // 电网区域配置（作为CN的子区域，level=2）
  const gridRegions = [
    {
      configType: 'factor_region',
      code: 'east_china',
      name: '华东电网',
      nameEn: 'East China Grid',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      status: 'active',
      sortOrder: 1,
      description: '华东电网区域（上海、江苏、浙江、安徽、福建）'
    },
    {
      configType: 'factor_region',
      code: 'north_china',
      name: '华北电网',
      nameEn: 'North China Grid',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      status: 'active',
      sortOrder: 2,
      description: '华北电网区域（北京、天津、河北、山西、山东）'
    },
    {
      configType: 'factor_region',
      code: 'south_china',
      name: '华南电网',
      nameEn: 'South China Grid',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      status: 'active',
      sortOrder: 3,
      description: '华南电网区域（广东、广西、云南、贵州、海南）'
    },
    {
      configType: 'factor_region',
      code: 'central_china',
      name: '华中电网',
      nameEn: 'Central China Grid',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      status: 'active',
      sortOrder: 4,
      description: '华中电网区域（河南、湖北、湖南、江西、四川、重庆）'
    },
    {
      configType: 'factor_region',
      code: 'northeast_china',
      name: '东北电网',
      nameEn: 'Northeast China Grid',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      status: 'active',
      sortOrder: 5,
      description: '东北电网区域（辽宁、吉林、黑龙江）'
    },
    {
      configType: 'factor_region',
      code: 'northwest_china',
      name: '西北电网',
      nameEn: 'Northwest China Grid',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      status: 'active',
      sortOrder: 6,
      description: '西北电网区域（陕西、甘肃、青海、宁夏、新疆）'
    },
    {
      configType: 'factor_region',
      code: 'southwest_china',
      name: '西南电网',
      nameEn: 'Southwest China Grid',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      status: 'active',
      sortOrder: 7,
      description: '西南电网区域（四川、云南、贵州、西藏）'
    }
  ];

  // 检查CN是否作为父区域存在
  const cnRegion = await db.collection('region_configs')
    .where({
      configType: 'factor_region',
      code: 'CN',
      status: 'active'
    })
    .get();

  if (cnRegion.data.length === 0) {
    console.log('⚠️  警告：CN区域配置不存在，请先初始化基础区域配置');
    return {
      success: false,
      message: 'CN区域配置不存在，请先执行 initRegionConfigs 初始化基础区域配置'
    };
  }

  // 逐个插入电网区域配置
  console.log('📋 开始插入电网区域配置...\n');
  for (const region of gridRegions) {
    try {
      // 检查是否已存在
      const existing = await db.collection('region_configs')
        .where({
          configType: region.configType,
          code: region.code
        })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  ⏭️  跳过已存在的电网区域: ${region.code} (${region.name})`);
        results.skipped++;
        continue;
      }
      
      // 插入数据
      await db.collection('region_configs').add({
        data: {
          ...region,
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          updatedBy: 'system'
        }
      });
      
      console.log(`  ✅ 成功插入电网区域: ${region.code} (${region.name})`);
      results.success++;
    } catch (error) {
      console.error(`  ❌ 插入电网区域失败 ${region.code}:`, error.message);
      results.failed++;
    }
  }

  console.log('\n===== 电网区域配置初始化完成 =====');
  console.log(`成功: ${results.success}`);
  console.log(`失败: ${results.failed}`);
  console.log(`跳过: ${results.skipped}`);
  console.log(`总计: ${gridRegions.length}\n`);

  return {
    code: 0,
    success: true,
    message: '电网区域配置初始化完成',
    data: results
  };
}

/**
 * 主函数
 */
exports.main = async (event) => {
  try {
    return await initGridRegions();
  } catch (error) {
    console.error('初始化电网区域配置失败:', error);
    return {
      code: 500,
      success: false,
      message: '初始化失败',
      error: error.message
    };
  }
};

