/**
 * 一餐饭基准值初始数据脚本
 * 
 * 功能：
 * 1. 生成初始一餐饭基准值数据
 * 2. 基于研究结果估算基准值
 * 3. 包含主要维度组合的基准值
 * 
 * 使用方法：
 * 通过 database 云函数调用：
 * {
 *   action: "initMealSetBaselineSampleData"
 * }
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 生成基准值ID
 */
function generateMealSetBaselineId(category) {
  const parts = [
    'meal_set',
    category.mealTime,
    category.region,
    category.energyType,
    category.mealStructure || 'default',
    category.hasSoup || 'default',
    category.restaurantType || 'default',
    category.consumptionScenario || 'default',
    category.city || 'default',
    category.season || 'default',
    category.consumptionLevel || 'default'
  ];
  return parts.join('_');
}

/**
 * 生成初始基准值数据
 */
function generateSampleBaselines() {
  const baselines = [];
  
  // 餐次类型
  const mealTimes = ['breakfast', 'lunch', 'dinner'];
  // 区域
  const regions = ['north_china', 'northeast', 'east_china', 'central_china', 'south_china', 'northwest', 'southwest', 'national_average'];
  // 用能方式
  const energyTypes = ['electric', 'gas', 'mixed'];
  // 结构类型
  const mealStructures = ['simple', 'standard', 'full'];
  
  // 基于研究结果的基准值估算
  // 参考：单道菜基准值（肉食简餐 5.0，肉食正餐 7.5）
  // 早餐通常简化30-40%，晚餐通常增加10-20%
  // 华南地区每餐必有汤，增加15-20%
  
  const baseValues = {
    breakfast: {
      simple: 3.0,
      standard: 3.2,
      full: 3.5
    },
    lunch: {
      simple: 5.5,
      standard: 6.5,
      full: 8.5
    },
    dinner: {
      simple: 6.0,
      standard: 7.0,
      full: 9.0
    }
  };
  
  const regionFactors = {
    north_china: 1.08,      // +8%
    northeast: 1.12,        // +12%
    east_china: 1.00,       // 基准
    central_china: 1.06,    // +6%
    south_china: 1.18,      // +18%（每餐必有汤）
    northwest: 1.12,        // +12%
    southwest: 1.12,        // +12%
    national_average: 1.00  // 基准
  };
  
  // 生成基准值数据
  for (const mealTime of mealTimes) {
    for (const region of regions) {
      for (const energyType of energyTypes) {
        for (const mealStructure of mealStructures) {
          // 计算基准值
          const baseValue = baseValues[mealTime][mealStructure];
          const regionFactor = regionFactors[region];
          let value = baseValue * regionFactor;
          
          // 华南地区每餐必有汤，需要额外考虑汤类影响
          if (region === 'south_china' && mealTime !== 'breakfast') {
            // 如果结构类型是simple，可能没有单独考虑汤，需要加上
            if (mealStructure === 'simple') {
              value += 0.6; // 加上典型汤类碳排放
            }
          }
          
          // 确定是否有汤
          let hasSoup = 'optional';
          if (region === 'south_china' && mealTime !== 'breakfast') {
            hasSoup = 'with_soup';
          } else if (mealTime === 'breakfast') {
            hasSoup = 'without_soup';
          }
          
          // 生成典型结构描述
          const typicalStructure = generateTypicalStructure(mealTime, mealStructure, hasSoup);
          
          // 生成分解数据（估算）
          const breakdown = generateBreakdown(value, mealStructure, hasSoup, mealTime);
          
          // 生成基准值数据
          const baseline = {
            baselineId: generateMealSetBaselineId({
              mealTime,
              region,
              energyType,
              mealStructure,
              hasSoup
            }),
            category: {
              mealTime,
              region,
              energyType,
              mealStructure,
              hasSoup
            },
            carbonFootprint: {
              value: Math.round(value * 100) / 100,
              uncertainty: Math.round(value * 0.25 * 100) / 100, // 25%不确定性
              confidenceInterval: {
                lower: Math.max(0, Math.round((value - value * 0.25) * 100) / 100),
                upper: Math.round((value + value * 0.25) * 100) / 100
              },
              unit: 'kg CO₂e'
            },
            breakdown,
            typicalStructure,
            source: {
              type: 'estimation',
              organization: '平台',
              report: '一餐饭基准值初始估算',
              year: 2024,
              methodology: '基于现有单道菜基准值和研究报告估算'
            },
            version: '2024.01',
            effectiveDate: new Date('2024-01-01'),
            expiryDate: new Date('2025-12-31'),
            status: 'active',
            usage: {
              isForCalculation: false,
              notes: '初始估算值，待验证',
              researchStatus: 'researching',
              observationPeriod: {
                startDate: new Date('2024-01-01'),
                notes: '观察期：待确定'
              }
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            updatedBy: 'system',
            notes: `基于研究报告估算的初始基准值。${region === 'south_china' && mealTime !== 'breakfast' ? '华南地区每餐必有汤。' : ''}`,
            usageCount: 0
          };
          
          baselines.push(baseline);
        }
      }
    }
  }
  
  return baselines;
}

/**
 * 生成典型结构描述
 */
function generateTypicalStructure(mealTime, mealStructure, hasSoup) {
  let mainDishesCount = 1;
  let stapleFoodType = '米饭';
  let hasSoupBool = hasSoup === 'with_soup';
  let hasDessert = false;
  let totalItems = 2;
  let description = '';
  
  if (mealStructure === 'simple') {
    mainDishesCount = 1;
    totalItems = 2;
    description = '1道主菜+主食';
    if (hasSoupBool) {
      totalItems = 3;
      description += '+汤';
    }
  } else if (mealStructure === 'standard') {
    mainDishesCount = 2;
    totalItems = 3;
    description = '2道主菜+主食';
    if (hasSoupBool) {
      totalItems = 4;
      description += '+汤';
    }
  } else if (mealStructure === 'full') {
    mainDishesCount = 3;
    totalItems = 4;
    description = '3道主菜+主食';
    if (hasSoupBool) {
      totalItems = 5;
      description += '+汤';
    }
    hasDessert = true;
    totalItems += 1;
    description += '+甜点';
  }
  
  // 早餐通常没有汤
  if (mealTime === 'breakfast') {
    hasSoupBool = false;
    description = description.replace('+汤', '');
    totalItems -= (description.includes('+汤') ? 1 : 0);
  }
  
  return {
    mainDishesCount,
    stapleFoodType,
    hasSoup: hasSoupBool,
    hasDessert,
    totalItems,
    description
  };
}

/**
 * 生成分解数据
 */
function generateBreakdown(totalValue, mealStructure, hasSoup, mealTime) {
  // 基于总值的比例估算分解数据
  const breakdown = {
    mainDishes: 0,
    stapleFood: 0,
    soup: 0,
    dessert: 0,
    beverage: 0.1,
    sideDishes: 0.1,
    condiments: 0.05,
    cookingEnergy: 0,
    packaging: 0.1,
    transport: 0,
    other: 0.05
  };
  
  // 主菜（占比最大）
  if (mealStructure === 'simple') {
    breakdown.mainDishes = totalValue * 0.75;
  } else if (mealStructure === 'standard') {
    breakdown.mainDishes = totalValue * 0.70;
  } else if (mealStructure === 'full') {
    breakdown.mainDishes = totalValue * 0.65;
  }
  
  // 主食
  breakdown.stapleFood = totalValue * 0.10;
  
  // 汤类
  if (hasSoup === 'with_soup' && mealTime !== 'breakfast') {
    breakdown.soup = totalValue * 0.12;
  }
  
  // 甜点（正餐可能有）
  if (mealStructure === 'full') {
    breakdown.dessert = totalValue * 0.05;
  }
  
  // 烹饪能耗
  breakdown.cookingEnergy = totalValue * 0.08;
  
  // 确保总和等于总值（允许小误差）
  const currentSum = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  const diff = totalValue - currentSum;
  
  // 将差异加到主菜上
  breakdown.mainDishes += diff;
  
  // 确保不为负数
  Object.keys(breakdown).forEach(key => {
    breakdown[key] = Math.max(0, Math.round(breakdown[key] * 100) / 100);
  });
  
  return breakdown;
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  console.log('========================================');
  console.log('初始化一餐饭基准值示例数据');
  console.log('========================================\n');
  
  try {
    const collectionName = 'meal_set_baselines';
    
    // 生成示例数据
    console.log('生成初始基准值数据...');
    const baselines = generateSampleBaselines();
    console.log(`生成了 ${baselines.length} 条基准值数据\n`);
    
    // 检查是否已有数据
    const existingCount = await db.collection(collectionName).count();
    if (existingCount.total > 0) {
      console.log(`⚠️  集合中已有 ${existingCount.total} 条数据`);
      console.log('如需重新初始化，请先清空集合或使用不同的版本号\n');
      
      return {
        success: false,
        code: 1,
        message: '集合中已有数据，请先清空或使用不同版本',
        existingCount: existingCount.total
      };
    }
    
    // 批量插入数据
    console.log('开始批量插入数据...');
    const batchSize = 50;
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < baselines.length; i += batchSize) {
      const batch = baselines.slice(i, i + batchSize);
      
      try {
        // 使用批量插入
        const promises = batch.map(baseline => 
          db.collection(collectionName).add({ data: baseline })
        );
        
        await Promise.all(promises);
        successCount += batch.length;
        console.log(`[${i + 1}-${Math.min(i + batchSize, baselines.length)}/${baselines.length}] 插入成功`);
      } catch (error) {
        console.error(`[${i + 1}-${Math.min(i + batchSize, baselines.length)}] 插入失败:`, error.message);
        failedCount += batch.length;
      }
    }
    
    console.log('\n========================================');
    console.log('数据初始化完成');
    console.log(`成功: ${successCount} 条`);
    console.log(`失败: ${failedCount} 条`);
    console.log('========================================\n');
    
    return {
      success: true,
      code: 0,
      message: '一餐饭基准值示例数据初始化完成',
      data: {
        total: baselines.length,
        success: successCount,
        failed: failedCount
      }
    };
  } catch (error) {
    console.error('初始化失败:', error);
    return {
      success: false,
      code: 1,
      error: error.message || '初始化失败',
      stack: error.stack
    };
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  exports.main({}, {}).then(result => {
    console.log('\n执行结果:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

