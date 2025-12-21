/**
 * 区域配置初始化脚本
 * 
 * 功能：
 * 1. 初始化因子区域配置（国家级别）
 * 2. 初始化基准值区域配置（国家+子区域）
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"initRegionConfigs"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化区域配置数据
 */
async function initRegionConfigs() {
  console.log('===== 开始初始化区域配置数据 =====\n');
  
  const results = {
    factorRegions: { success: 0, failed: 0, skipped: 0 },
    baselineRegions: { success: 0, failed: 0, skipped: 0 }
  };
  
  const now = new Date();
  
  // 因子区域配置（国家级别）
  const factorRegions = [
    {
      configType: 'factor_region',
      code: 'CN',
      name: '中国',
      nameEn: 'China',
      country: 'CN',
      countryName: '中国',
      level: 1,
      status: 'active',
      sortOrder: 1,
      description: '中国全国平均碳足迹因子'
    },
    {
      configType: 'factor_region',
      code: 'US',
      name: '美国',
      nameEn: 'United States',
      country: 'US',
      countryName: '美国',
      level: 1,
      status: 'active',
      sortOrder: 2,
      description: '美国全国平均碳足迹因子'
    },
    {
      configType: 'factor_region',
      code: 'JP',
      name: '日本',
      nameEn: 'Japan',
      country: 'JP',
      countryName: '日本',
      level: 1,
      status: 'active',
      sortOrder: 3,
      description: '日本全国平均碳足迹因子'
    },
    {
      configType: 'factor_region',
      code: 'EU',
      name: '欧盟',
      nameEn: 'European Union',
      country: 'EU',
      countryName: '欧盟',
      level: 1,
      status: 'active',
      sortOrder: 4,
      description: '欧盟平均碳足迹因子'
    },
    {
      configType: 'factor_region',
      code: 'IN',
      name: '印度',
      nameEn: 'India',
      country: 'IN',
      countryName: '印度',
      level: 1,
      status: 'active',
      sortOrder: 5,
      description: '印度全国平均碳足迹因子'
    }
  ];
  
  // 基准值区域配置（国家+子区域）
  const baselineRegions = [
    // 中国子区域
    {
      configType: 'baseline_region',
      code: 'CN_NORTH',
      name: '中国-华北',
      nameEn: 'China - North',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      isDefault: false,
      status: 'active',
      sortOrder: 1,
      description: '中国华北地区基准值'
    },
    {
      configType: 'baseline_region',
      code: 'CN_SOUTH',
      name: '中国-华南',
      nameEn: 'China - South',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      isDefault: false,
      status: 'active',
      sortOrder: 2,
      description: '中国华南地区基准值'
    },
    {
      configType: 'baseline_region',
      code: 'CN_EAST',
      name: '中国-华东',
      nameEn: 'China - East',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      isDefault: false,
      status: 'active',
      sortOrder: 3,
      description: '中国华东地区基准值'
    },
    {
      configType: 'baseline_region',
      code: 'CN_SOUTHWEST',
      name: '中国-西南',
      nameEn: 'China - Southwest',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      isDefault: false,
      status: 'active',
      sortOrder: 4,
      description: '中国西南地区基准值'
    },
    {
      configType: 'baseline_region',
      code: 'CN_NORTHWEST',
      name: '中国-西北',
      nameEn: 'China - Northwest',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      isDefault: false,
      status: 'active',
      sortOrder: 5,
      description: '中国西北地区基准值'
    },
    {
      configType: 'baseline_region',
      code: 'CN_NORTHEAST',
      name: '中国-东北',
      nameEn: 'China - Northeast',
      country: 'CN',
      countryName: '中国',
      parentCode: 'CN',
      level: 2,
      isDefault: false,
      status: 'active',
      sortOrder: 6,
      description: '中国东北地区基准值'
    },
    // 美国子区域
    {
      configType: 'baseline_region',
      code: 'US_EAST',
      name: '美国-东部',
      nameEn: 'United States - East',
      country: 'US',
      countryName: '美国',
      parentCode: 'US',
      level: 2,
      isDefault: false,
      status: 'active',
      sortOrder: 7,
      description: '美国东部地区基准值'
    },
    {
      configType: 'baseline_region',
      code: 'US_WEST',
      name: '美国-西部',
      nameEn: 'United States - West',
      country: 'US',
      countryName: '美国',
      parentCode: 'US',
      level: 2,
      isDefault: false,
      status: 'active',
      sortOrder: 8,
      description: '美国西部地区基准值'
    },
    // 默认基准值区域
    {
      configType: 'baseline_region',
      code: 'national_average',
      name: '全国平均',
      nameEn: 'National Average',
      country: '',
      countryName: '通用',
      parentCode: '',
      level: 1,
      isDefault: true,
      status: 'active',
      sortOrder: 0,
      description: '通用全国平均基准值（默认值）'
    }
  ];
  
  // 插入因子区域配置
  console.log('📋 开始插入因子区域配置...');
  for (const region of factorRegions) {
    try {
      // 检查是否已存在
      const existing = await db.collection('region_configs')
        .where({
          configType: region.configType,
          code: region.code
        })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  ⏭️  跳过已存在的因子区域: ${region.code} (${region.name})`);
        results.factorRegions.skipped++;
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
      
      console.log(`  ✅ 成功插入因子区域: ${region.code} (${region.name})`);
      results.factorRegions.success++;
    } catch (error) {
      console.error(`  ❌ 插入因子区域失败 ${region.code}:`, error.message);
      results.factorRegions.failed++;
    }
  }
  
  // 插入基准值区域配置
  console.log('\n📋 开始插入基准值区域配置...');
  for (const region of baselineRegions) {
    try {
      // 检查是否已存在
      const existing = await db.collection('region_configs')
        .where({
          configType: region.configType,
          code: region.code
        })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  ⏭️  跳过已存在的基准值区域: ${region.code} (${region.name})`);
        results.baselineRegions.skipped++;
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
      
      console.log(`  ✅ 成功插入基准值区域: ${region.code} (${region.name})`);
      results.baselineRegions.success++;
    } catch (error) {
      console.error(`  ❌ 插入基准值区域失败 ${region.code}:`, error.message);
      results.baselineRegions.failed++;
    }
  }
  
  console.log('\n===== 区域配置初始化完成 =====');
  console.log(`\n因子区域: 成功 ${results.factorRegions.success}, 失败 ${results.factorRegions.failed}, 跳过 ${results.factorRegions.skipped}`);
  console.log(`基准值区域: 成功 ${results.baselineRegions.success}, 失败 ${results.baselineRegions.failed}, 跳过 ${results.baselineRegions.skipped}`);
  
  return {
    success: true,
    results,
    message: '区域配置初始化完成'
  };
}

/**
 * 主函数
 */
exports.main = async (event) => {
  try {
    return await initRegionConfigs();
  } catch (error) {
    console.error('初始化区域配置失败:', error);
    return {
      success: false,
      error: error.message,
      message: '初始化失败'
    };
  }
};

