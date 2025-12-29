/**
 * 初始化素食人员减碳计算配置数据
 * 
 * 功能：
 * 1. 创建 vegetarian_carbon_configs 集合
 * 2. 初始化配置数据：
 *    - 基础减碳量配置
 *    - 素食类型系数配置
 *    - 年限增长系数配置
 *    - 计算规则配置
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"initVegetarianCarbonConfigs"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 创建集合（如果不存在）
 */
async function createCollection(collectionName) {
  try {
    await db.createCollection(collectionName);
    console.log(`✅ 集合 ${collectionName} 创建成功`);
    return { success: true, collectionName };
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log(`ℹ️ 集合 ${collectionName} 已存在，跳过`);
      return { success: true, collectionName, existed: true };
    }
    console.error(`❌ 集合 ${collectionName} 创建失败:`, error.message);
    return { success: false, collectionName, error: error.message };
  }
}

/**
 * 初始化配置数据
 */
async function initVegetarianCarbonConfigs() {
  console.log('===== 开始初始化素食人员减碳计算配置数据 =====\n');
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  const now = new Date();

  // 默认配置数据
  const defaultConfigs = [
    // 1. 基础减碳量配置
    {
      configType: 'calculation_rule',
      parameterName: 'base_daily_reduction',
      parameterValue: 2.0,
      unit: 'kg CO₂e/天/人',
      dataSource: '素食减碳研究数据',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '基础减碳量，基于研究数据：一个素食者每天可减少约 2.0 kg CO₂e 的碳排放',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 2. 素食类型系数配置
    {
      configType: 'vegetarian_coefficient',
      vegetarianType: 'pure',
      parameterName: 'pure_vegetarian_coefficient',
      parameterValue: 1.0,
      unit: 'ratio',
      dataSource: '素食类型减碳效果研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '纯素（pure）：基准值，减碳效果最好',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'vegetarian_coefficient',
      vegetarianType: 'ovo_lacto',
      parameterName: 'ovo_lacto_coefficient',
      parameterValue: 0.8,
      unit: 'ratio',
      dataSource: '素食类型减碳效果研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '蛋奶素（ovo_lacto）：减碳效果约为纯素的80%',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'vegetarian_coefficient',
      vegetarianType: 'flexible',
      parameterName: 'flexible_coefficient',
      parameterValue: 0.5,
      unit: 'ratio',
      dataSource: '素食类型减碳效果研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '弹性素（flexible）：减碳效果约为纯素的50%',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'vegetarian_coefficient',
      vegetarianType: 'other',
      parameterName: 'other_coefficient',
      parameterValue: 0.6,
      unit: 'ratio',
      dataSource: '素食类型减碳效果研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '其他类型：减碳效果约为纯素的60%',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 3. 素食年限增长系数配置
    {
      configType: 'years_growth_coefficient',
      minYears: 0,
      maxYears: 1,
      parameterName: 'years_growth_coefficient_0_1',
      parameterValue: 1.0,
      unit: 'ratio',
      dataSource: '素食年限增长效应研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '1年以下：基准值，能量场开始变化',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'years_growth_coefficient',
      minYears: 1,
      maxYears: 3,
      parameterName: 'years_growth_coefficient_1_3',
      parameterValue: 1.2,
      unit: 'ratio',
      dataSource: '素食年限增长效应研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '1-3年：增长20%，能量场开始变化，欲望开始减少',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'years_growth_coefficient',
      minYears: 3,
      maxYears: 5,
      parameterName: 'years_growth_coefficient_3_5',
      parameterValue: 1.5,
      unit: 'ratio',
      dataSource: '素食年限增长效应研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '3-5年：增长50%，能量场明显变化，欲望明显减少',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'years_growth_coefficient',
      minYears: 5,
      maxYears: 10,
      parameterName: 'years_growth_coefficient_5_10',
      parameterValue: 2.0,
      unit: 'ratio',
      dataSource: '素食年限增长效应研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '5-10年：增长100%，能量场显著变化，对地球伤害相对越小',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'years_growth_coefficient',
      minYears: 10,
      maxYears: undefined, // 10年以上
      parameterName: 'years_growth_coefficient_10_plus',
      parameterValue: 2.5,
      unit: 'ratio',
      dataSource: '素食年限增长效应研究',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '10年以上：增长150%，能量场深度变化，欲望大幅减少，对地球伤害最小',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 4. 客户计算规则配置
    {
      configType: 'calculation_rule',
      parameterName: 'customer_contribution_factor',
      parameterValue: 1.0,
      unit: 'ratio',
      dataSource: '客户减碳贡献计算规则',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '客户完全按素食类型系数计算（V2版本不再使用50%固定系数）',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'calculation_rule',
      parameterName: 'default_vegetarian_years',
      parameterValue: 1,
      unit: '年',
      dataSource: '默认值配置',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '无年份数据时的默认素食年限（年）',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 5. 等效对比参数配置
    {
      configType: 'calculation_rule',
      parameterName: 'equivalent_tree_absorption',
      parameterValue: 18,
      unit: 'kg CO₂/年',
      dataSource: '树木碳吸收研究数据',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '每棵树年吸收 CO₂ 量（kg）',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configType: 'calculation_rule',
      parameterName: 'equivalent_electricity_emission',
      parameterValue: 0.5,
      unit: 'kg CO₂/度',
      dataSource: '电力碳排放因子',
      referenceUrl: '',
      effectiveDate: now,
      version: '1.0',
      notes: '每度电产生 CO₂ 量（kg）',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  ];

  try {
    // 1. 创建集合
    console.log('[1/2] 创建 vegetarian_carbon_configs 集合...');
    const createResult = await createCollection('vegetarian_carbon_configs');
    if (!createResult.success && !createResult.existed) {
      throw new Error(`创建集合失败: ${createResult.error}`);
    }

    // 2. 插入配置数据
    console.log('[2/2] 插入配置数据...');
    const collection = db.collection('vegetarian_carbon_configs');
    
    for (const config of defaultConfigs) {
      try {
        // 检查是否已存在相同配置（避免重复插入）
        let checkQuery = {
          configType: config.configType,
          parameterName: config.parameterName,
          status: 'active'
        };
        
        // 对于素食类型系数，还要检查 vegetarianType
        if (config.configType === 'vegetarian_coefficient' && config.vegetarianType) {
          checkQuery.vegetarianType = config.vegetarianType;
        }
        
        // 对于年限增长系数，还要检查 minYears 和 maxYears
        if (config.configType === 'years_growth_coefficient') {
          checkQuery.minYears = config.minYears;
          if (config.maxYears !== undefined) {
            checkQuery.maxYears = config.maxYears;
          } else {
            checkQuery.maxYears = null; // 10年以上使用 null
          }
        }
        
        const existing = await collection.where(checkQuery).get();
        
        if (existing.data.length > 0) {
          console.log(`  ℹ️  配置已存在，跳过: ${config.parameterName}`);
          results.skipped++;
          continue;
        }
        
        // 插入新配置
        await collection.add({ data: config });
        console.log(`  ✅ 配置插入成功: ${config.parameterName}`);
        results.success++;
      } catch (error) {
        console.error(`  ❌ 配置插入失败: ${config.parameterName}`, error.message);
        results.failed++;
      }
    }

    console.log('\n========================================');
    console.log('素食人员减碳计算配置数据初始化完成');
    console.log('========================================\n');
    console.log(`成功: ${results.success} 条`);
    console.log(`失败: ${results.failed} 条`);
    console.log(`跳过: ${results.skipped} 条`);
    console.log(`总计: ${defaultConfigs.length} 条\n`);

    return {
      code: 0,
      message: '初始化完成',
      data: {
        collection: 'vegetarian_carbon_configs',
        total: defaultConfigs.length,
        success: results.success,
        failed: results.failed,
        skipped: results.skipped,
        configTypes: {
          calculation_rule: defaultConfigs.filter(c => c.configType === 'calculation_rule').length,
          vegetarian_coefficient: defaultConfigs.filter(c => c.configType === 'vegetarian_coefficient').length,
          years_growth_coefficient: defaultConfigs.filter(c => c.configType === 'years_growth_coefficient').length
        }
      }
    };
  } catch (error) {
    console.error('初始化失败:', error);
    return {
      code: 500,
      message: '初始化失败',
      error: error.message,
      data: results
    };
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  return await initVegetarianCarbonConfigs();
};

