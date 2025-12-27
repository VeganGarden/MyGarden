/**
 * 碳足迹计算默认参数配置初始化脚本
 * 
 * 功能：
 * 初始化碳足迹计算相关的默认参数配置
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"initCarbonCalculationConfigs"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化碳足迹计算配置数据
 */
async function initCarbonCalculationConfigs() {
  console.log('===== 开始初始化碳足迹计算配置数据 =====\n');
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  const now = new Date();

  // 默认配置数据
  const defaultConfigs = [
    // 1. 食材损耗率配置
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'vegetables',
      value: 0.20,
      unit: 'ratio',
      description: '蔬菜类食材损耗率（20%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'meat',
      value: 0.05,
      unit: 'ratio',
      description: '肉类食材损耗率（5%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'seafood',
      value: 0.15,
      unit: 'ratio',
      description: '海鲜类食材损耗率（15%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'grains',
      value: 0.0,
      unit: 'ratio',
      description: '干货类食材损耗率（0%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'default',
      value: 0.10,
      unit: 'ratio',
      description: '其他类别食材默认损耗率（10%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 2. 默认能源因子配置
    {
      configKey: 'default_electric_factor',
      configType: 'energy_factor',
      category: 'electric',
      value: 0.5703,
      unit: 'kg CO₂e/kWh',
      description: '2022年全国电网平均排放因子（默认值）',
      source: '2022年全国电网平均排放因子（生态环境部）',
      version: '2022',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'default_gas_factor',
      configType: 'energy_factor',
      category: 'gas',
      value: 2.16,
      unit: 'kg CO₂e/m³',
      description: 'IPCC 固定燃烧源缺省值（默认值）',
      source: 'IPCC 固定燃烧源缺省值',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 3. 标准工时模型配置
    {
      configKey: 'standard_time_model',
      configType: 'cooking_time',
      category: 'raw',
      value: 0,
      unit: 'min',
      description: '生食标准工时（0分钟）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_time_model',
      configType: 'cooking_time',
      category: 'steamed',
      value: 15,
      unit: 'min',
      description: '蒸制标准工时（15分钟）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_time_model',
      configType: 'cooking_time',
      category: 'boiled',
      value: 20,
      unit: 'min',
      description: '煮制标准工时（20分钟）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_time_model',
      configType: 'cooking_time',
      category: 'stir_fried',
      value: 5,
      unit: 'min',
      description: '快炒标准工时（5分钟）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_time_model',
      configType: 'cooking_time',
      category: 'fried',
      value: 8,
      unit: 'min',
      description: '炸制标准工时（8分钟）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_time_model',
      configType: 'cooking_time',
      category: 'baked',
      value: 45,
      unit: 'min',
      description: '烤制标准工时（45分钟）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 4. 标准功率模型配置
    {
      configKey: 'standard_power_model',
      configType: 'cooking_power',
      category: 'raw',
      value: 0,
      unit: 'kW',
      description: '生食标准功率（0kW）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_power_model',
      configType: 'cooking_power',
      category: 'steamed',
      value: 2.0,
      unit: 'kW',
      description: '蒸锅标准功率（2kW）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_power_model',
      configType: 'cooking_power',
      category: 'boiled',
      value: 1.5,
      unit: 'kW',
      description: '煮锅标准功率（1.5kW）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_power_model',
      configType: 'cooking_power',
      category: 'stir_fried',
      value: 3.0,
      unit: 'kW',
      description: '炒锅标准功率（3kW）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_power_model',
      configType: 'cooking_power',
      category: 'fried',
      value: 5.0,
      unit: 'kW',
      description: '炸锅标准功率（5kW）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'standard_power_model',
      configType: 'cooking_power',
      category: 'baked',
      value: 4.0,
      unit: 'kW',
      description: '烤箱标准功率（4kW）',
      source: '气候餐厅标准工时模型 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 5. 包装重量配置
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'meal_box',
      value: 0.030,
      unit: 'kg',
      description: '简餐盒重量（30g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'beverage_cup',
      value: 0.015,
      unit: 'kg',
      description: '饮料杯重量（15g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'paper_bag',
      value: 0.010,
      unit: 'kg',
      description: '纸袋重量（10g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'plastic_bag',
      value: 0.005,
      unit: 'kg',
      description: '塑料袋重量（5g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'takeout_container',
      value: 0.050,
      unit: 'kg',
      description: '外卖容器重量（50g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 6. 补充更多食材类别损耗率
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'beans',
      value: 0.02,
      unit: 'ratio',
      description: '豆制品食材损耗率（2%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'dairy',
      value: 0.03,
      unit: 'ratio',
      description: '乳制品食材损耗率（3%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'fruits',
      value: 0.12,
      unit: 'ratio',
      description: '水果类食材损耗率（12%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'nuts',
      value: 0.0,
      unit: 'ratio',
      description: '坚果类食材损耗率（0%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'spices',
      value: 0.0,
      unit: 'ratio',
      description: '调料类食材损耗率（0%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'ingredient_waste_rate',
      configType: 'waste_rate',
      category: 'mushrooms',
      value: 0.08,
      unit: 'ratio',
      description: '菌菇类食材损耗率（8%）',
      source: '餐饮行业通用成本核算标准',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 7. 补充更多包装类型
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'soup_container',
      value: 0.035,
      unit: 'kg',
      description: '汤品容器重量（35g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'chopsticks',
      value: 0.003,
      unit: 'kg',
      description: '一次性筷子重量（3g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'spoon',
      value: 0.002,
      unit: 'kg',
      description: '一次性勺子重量（2g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'packaging_weight',
      configType: 'packaging',
      category: 'napkin',
      value: 0.001,
      unit: 'kg',
      description: '纸巾重量（1g）',
      source: '市场常见包材平均称重',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 8. 碳等级阈值配置
    {
      configKey: 'carbon_level_threshold',
      configType: 'carbon_level',
      category: 'ultra_low',
      value: 0.5,
      unit: 'kg CO₂e',
      description: '超低碳阈值上限（< 0.5 kg CO₂e）',
      source: '气候餐厅碳等级标准 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'carbon_level_threshold',
      configType: 'carbon_level',
      category: 'low',
      value: 1.0,
      unit: 'kg CO₂e',
      description: '低碳阈值上限（0.5 - 1.0 kg CO₂e）',
      source: '气候餐厅碳等级标准 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'carbon_level_threshold',
      configType: 'carbon_level',
      category: 'medium',
      value: 2.0,
      unit: 'kg CO₂e',
      description: '中碳阈值上限（1.0 - 2.0 kg CO₂e）',
      source: '气候餐厅碳等级标准 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'carbon_level_threshold',
      configType: 'carbon_level',
      category: 'high',
      value: 999999,
      unit: 'kg CO₂e',
      description: '高碳阈值（> 2.0 kg CO₂e，无上限）',
      source: '气候餐厅碳等级标准 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    
    // 9. 碳等级颜色配置
    {
      configKey: 'carbon_level_color',
      configType: 'carbon_level',
      category: 'ultra_low',
      value: '#52c41a',
      unit: 'hex',
      description: '超低碳颜色（绿色）',
      source: '气候餐厅视觉设计规范 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'carbon_level_color',
      configType: 'carbon_level',
      category: 'low',
      value: '#a0d911',
      unit: 'hex',
      description: '低碳颜色（浅绿色）',
      source: '气候餐厅视觉设计规范 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'carbon_level_color',
      configType: 'carbon_level',
      category: 'medium',
      value: '#faad14',
      unit: 'hex',
      description: '中碳颜色（橙色）',
      source: '气候餐厅视觉设计规范 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      configKey: 'carbon_level_color',
      configType: 'carbon_level',
      category: 'high',
      value: '#ff4d4f',
      unit: 'hex',
      description: '高碳颜色（红色）',
      source: '气候餐厅视觉设计规范 v1.0',
      version: '1.0',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  ];

  try {
    // 尝试创建集合（如果已存在会抛出错误，我们捕获它）
    try {
      await db.createCollection('carbon_calculation_configs');
      console.log('✓ 创建 carbon_calculation_configs 集合\n');
    } catch (error) {
      // 如果集合已存在，不算错误（检查错误码或错误消息）
      if (
        (error.errCode === -501001) ||
        (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('Table exist') ||
          error.message.includes('ResourceExist')
        ))
      ) {
        console.log('ℹ  carbon_calculation_configs 集合已存在，继续初始化配置数据\n');
      } else {
        throw error; // 其他错误继续抛出
      }
    }

    // 逐个插入配置（如果已存在则跳过）
    for (const config of defaultConfigs) {
      try {
        // 检查是否已存在（根据 configKey + category 唯一性）
        const existing = await db.collection('carbon_calculation_configs')
          .where({
            configKey: config.configKey,
            category: config.category,
            status: 'active'
          })
          .get();

        if (existing.data.length > 0) {
          console.log(`⏭  配置已存在，跳过: ${config.configKey} - ${config.category}`);
          results.skipped++;
          continue;
        }

        // 插入新配置
        await db.collection('carbon_calculation_configs').add({
          data: config
        });

        console.log(`✓ 创建配置: ${config.configKey} - ${config.category} = ${config.value} ${config.unit}`);
        results.success++;
      } catch (error) {
        console.error(`✗ 创建配置失败: ${config.configKey} - ${config.category}`, error);
        results.failed++;
      }
    }

    console.log('\n===== 初始化完成 =====');
    console.log(`成功: ${results.success}`);
    console.log(`失败: ${results.failed}`);
    console.log(`跳过: ${results.skipped}`);
    console.log(`总计: ${defaultConfigs.length}\n`);

    return {
      code: 0,
      success: true,
      message: '初始化完成',
      data: results
    };
  } catch (error) {
    console.error('初始化失败:', error);
    return {
      code: 500,
      success: false,
      message: '初始化失败',
      error: error.message
    };
  }
}

module.exports = {
  main: initCarbonCalculationConfigs
};

