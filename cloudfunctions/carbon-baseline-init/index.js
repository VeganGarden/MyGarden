/**
 * 碳足迹基准值数据库初始化云函数
 * 
 * 功能：
 * 1. 创建 carbon_baselines 集合
 * 2. 创建索引
 * 3. 导入初始基准值数据（24条）
 * 
 * 调用方式：
 * tcb fn invoke carbon-baseline-init
 * 或
 * wx.cloud.callFunction({
 *   name: 'carbon-baseline-init',
 *   data: { action: 'init' }
 * })
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 生成基准值ID
 */
function generateBaselineId(category) {
  const { mealType, region, energyType, city, restaurantType } = category;
  const parts = [
    mealType,
    region,
    energyType,
    city || 'default',
    restaurantType || 'default'
  ];
  return parts.join('_');
}

/**
 * 生成所有基准值数据
 */
function generateAllBaselines() {
  const regions = [
    'north_china',      // 华北区域
    'northeast',        // 东北区域
    'east_china',       // 华东区域
    'central_china',    // 华中区域
    'northwest',        // 西北区域
    'south_china'       // 南方区域
  ];

  const mealTypes = ['meat_simple', 'meat_full'];
  const energyTypes = ['electric', 'gas'];

  // 区域电网因子（用于调整基准值）
  const regionFactors = {
    north_china: 0.9419,    // 以火电为主，基准值较高
    northeast: 0.7769,      // 以火电为主
    east_china: 0.7035,     // 火电+水电
    central_china: 0.5257,  // 水电+火电，基准值较低
    northwest: 0.6673,      // 火电+新能源
    south_china: 0.5271     // 水电+火电
  };

  // 基础基准值（华东区域，全电厨房）
  const baseBaselines = {
    meat_simple: {
      electric: {
        value: 5.0,
        ingredients: 3.5,
        cookingEnergy: 1.2,
        packaging: 0.2,
        other: 0.1
      },
      gas: {
        value: 5.2,
        ingredients: 3.5,
        cookingEnergy: 1.4,
        packaging: 0.2,
        other: 0.1
      }
    },
    meat_full: {
      electric: {
        value: 7.5,
        ingredients: 5.5,
        cookingEnergy: 1.6,
        packaging: 0.3,
        other: 0.1
      },
      gas: {
        value: 7.8,
        ingredients: 5.5,
        cookingEnergy: 1.8,
        packaging: 0.3,
        other: 0.2
      }
    }
  };

  /**
   * 根据区域因子调整基准值
   */
  function adjustBaselineByRegion(baseValue, regionFactor) {
    // 华东区域因子作为基准（0.7035）
    const baseFactor = 0.7035;
    // 调整系数：新区域因子 / 基准因子
    const adjustmentFactor = regionFactor / baseFactor;
    // 只调整烹饪能耗部分，食材部分不变
    return baseValue * (0.7 + 0.3 * adjustmentFactor); // 70%食材 + 30%能耗
  }

  const baselines = [];
  const now = new Date();

  regions.forEach(region => {
    mealTypes.forEach(mealType => {
      energyTypes.forEach(energyType => {
        const base = baseBaselines[mealType][energyType];
        const regionFactor = regionFactors[region];

        // 根据区域因子调整基准值
        const adjustedValue = adjustBaselineByRegion(base.value, regionFactor);
        const adjustedCookingEnergy = base.cookingEnergy * (regionFactor / 0.7035);

        const baseline = {
          category: {
            mealType,
            region,
            energyType
          },
          carbonFootprint: {
            value: Math.round(adjustedValue * 10) / 10, // 保留1位小数
            uncertainty: mealType === 'meat_simple' ? 0.5 : 0.8,
            confidenceInterval: {
              lower: Math.round((adjustedValue - (mealType === 'meat_simple' ? 0.5 : 0.8)) * 10) / 10,
              upper: Math.round((adjustedValue + (mealType === 'meat_simple' ? 0.5 : 0.8)) * 10) / 10
            },
            unit: 'kg CO₂e'
          },
          breakdown: {
            ingredients: base.ingredients,
            cookingEnergy: Math.round(adjustedCookingEnergy * 10) / 10,
            packaging: base.packaging,
            other: base.other
          },
          source: {
            type: 'industry_statistics',
            organization: '中国餐饮协会',
            report: '2024年度餐饮行业碳足迹报告（示例数据）',
            year: 2024,
            methodology: '基于行业统计数据估算，按区域电网因子调整'
          },
          version: '2024.01',
          effectiveDate: now,
          expiryDate: new Date(now.getFullYear(), 11, 31), // 12月31日
          status: 'active',
          notes: `示例数据，需替换为真实数据。区域：${region}，电网因子：${regionFactor}`,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          updatedBy: 'system',
          baselineId: generateBaselineId({
            mealType,
            region,
            energyType
          })
        };

        baselines.push(baseline);
      });
    });
  });

  return baselines;
}

/**
 * 创建集合（如果不存在）
 */
async function createCollection() {
  try {
    await db.createCollection('carbon_baselines');
    console.log('✅ carbon_baselines 集合创建成功');
    return { success: true, message: '集合创建成功' };
  } catch (error) {
    // 如果集合已存在，不算错误
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️  carbon_baselines 集合已存在，跳过创建');
      return { success: true, message: '集合已存在' };
    }
    
    console.error('❌ 集合创建失败:', error.message);
    return { 
      success: false, 
      error: error.message || '集合创建失败',
      errCode: error.errCode
    };
  }
}

/**
 * 导入基准值数据
 */
async function importBaselines() {
  const baselines = generateAllBaselines();
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (const baseline of baselines) {
    try {
      // 检查是否已存在（如果集合不存在，这里会失败，但会在add时自动创建）
      let existing = { data: [] };
      try {
        existing = await db.collection('carbon_baselines')
          .where({
            baselineId: baseline.baselineId,
            status: 'active'
          })
          .get();
      } catch (checkError) {
        // 如果集合不存在，忽略检查错误，继续插入（会自动创建集合）
        if (checkError.errCode !== -502005) {
          throw checkError;
        }
      }

      if (existing.data && existing.data.length > 0) {
        results.skipped++;
        continue;
      }

      // 插入数据（如果集合不存在会自动创建）
      await db.collection('carbon_baselines').add(baseline);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        baselineId: baseline.baselineId,
        error: error.message,
        errCode: error.errCode
      });
    }
  }

  return results;
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action = 'init' } = event;

  console.log('========================================');
  console.log('碳足迹基准值数据库初始化');
  console.log('========================================\n');

  try {
    switch (action) {
      case 'init':
        // 完整初始化
        return await fullInit();

      case 'import':
        // 仅导入数据
        return await importBaselines();

      case 'check':
        // 检查数据完整性
        return await checkDataIntegrity();

      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['init', 'import', 'check']
        };
    }
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    return {
      code: 500,
      message: '初始化失败',
      error: error.message,
      stack: error.stack
    };
  }
};

/**
 * 完整初始化
 */
async function fullInit() {
  const results = {
    collection: null,
    import: null,
    check: null
  };

  // 1. 创建集合
  console.log('1. 创建集合...');
  try {
    results.collection = await createCollection();
    console.log('✅ 集合准备完成');
  } catch (error) {
    console.error('❌ 集合创建失败:', error);
    results.collection = { success: false, error: error.message };
  }

  // 2. 导入数据
  console.log('\n2. 导入基准值数据...');
  try {
    results.import = await importBaselines();
    console.log(`✅ 导入完成: 成功 ${results.import.success} 条, 跳过 ${results.import.skipped} 条, 失败 ${results.import.failed} 条`);
  } catch (error) {
    console.error('❌ 数据导入失败:', error);
    results.import = { success: false, error: error.message };
  }

  // 3. 检查数据完整性
  console.log('\n3. 检查数据完整性...');
  try {
    results.check = await checkDataIntegrity();
    console.log(`✅ 数据完整性检查完成: ${results.check.total} 条数据`);
  } catch (error) {
    console.error('❌ 数据检查失败:', error);
    results.check = { success: false, error: error.message };
  }

  return {
    code: 0,
    message: '初始化完成',
    results
  };
}

/**
 * 检查数据完整性
 */
async function checkDataIntegrity() {
  try {
    // 先检查集合是否存在
    const collectionCheck = await db.collection('carbon_baselines').limit(1).get();
    
    const regions = ['north_china', 'northeast', 'east_china', 'central_china', 'northwest', 'south_china'];
    const mealTypes = ['meat_simple', 'meat_full'];
    const energyTypes = ['electric', 'gas'];

    let total = 0;
    let found = 0;
    const missing = [];

    for (const region of regions) {
      for (const mealType of mealTypes) {
        for (const energyType of energyTypes) {
          total++;
          const baselineId = generateBaselineId({ mealType, region, energyType });
          
          try {
            // 先尝试只查询 baselineId（不包含 status，因为可能数据没有 status 字段）
            let result = await db.collection('carbon_baselines')
              .where({
                baselineId: baselineId
              })
              .get();

            // 如果没找到，尝试包含 status 的查询
            if (result.data.length === 0) {
              result = await db.collection('carbon_baselines')
                .where({
                  baselineId: baselineId,
                  status: 'active'
                })
                .get();
            }

            if (result.data && result.data.length > 0) {
              found++;
            } else {
              missing.push({ mealType, region, energyType, baselineId });
            }
          } catch (error) {
            // 查询失败，记录为缺失
            missing.push({ mealType, region, energyType, baselineId, error: error.message });
          }
        }
      }
    }

    return {
      total,
      found,
      missing: missing.length,
      missingDetails: missing,
      isComplete: found === total
    };
  } catch (error) {
    // 集合不存在
    if (error.errCode === -502005) {
      return {
        total: 24,
        found: 0,
        missing: 24,
        missingDetails: [],
        isComplete: false,
        error: '集合不存在，请先执行初始化'
      };
    }
    throw error;
  }
}

