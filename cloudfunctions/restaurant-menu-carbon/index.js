const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入配置常量
const {
  DEFAULT_BASELINES,
  DEFAULT_WASTE_RATES,
  DEFAULT_ENERGY_FACTORS,
  STANDARD_COOKING_TIMES,
  STANDARD_COOKING_POWERS,
  DEFAULT_REGIONS,
  DEFAULT_CALCULATION_LEVEL,
  DEFAULT_MEAL_TYPE,
  DEFAULT_ENERGY_TYPE,
  DEFAULT_BASELINE_UNCERTAINTY_RATIO,
  VALIDATION_THRESHOLDS,
  CACHE_TTL,
  CACHE_CLEANUP_THRESHOLD,
  VALID_ENUMS,
  COOKING_TIME_RANGE
} = require('./constants');

// 初始化配置缓存（使用硬编码默认值作为降级方案）
let configCache = {
  wasteRates: null,
  energyFactors: null,
  cookingTimes: null,
  cookingPowers: null,
  lastUpdate: null
};
// 使用常量文件中的缓存TTL
const CONFIG_CACHE_TTL = CACHE_TTL.config;
const FACTOR_CACHE_TTL = CACHE_TTL.factor;

// 因子匹配结果缓存（键为 name+category+region，值为因子对象）
const factorMatchCache = new Map();
const factorCacheTimestamps = new Map(); // 记录缓存时间戳

/**
 * 初始化硬编码默认值（作为降级方案）
 */
function initDefaultConfigs() {
  configCache = {
    wasteRates: { ...DEFAULT_WASTE_RATES },
    energyFactors: { ...DEFAULT_ENERGY_FACTORS },
    cookingTimes: { ...STANDARD_COOKING_TIMES },
    cookingPowers: { ...STANDARD_COOKING_POWERS },
    lastUpdate: Date.now()
  };
}

// 初始化默认配置
initDefaultConfigs();

/**
 * 餐厅菜谱碳足迹计算云函数
 * 
 * 功能：
 * 1. 计算菜谱碳足迹（含基准值查询和碳减排值计算）
 * 2. 批量重新计算菜谱碳足迹
 * 
 * 支持的 actions:
 * - calculateMenuItemCarbon: 计算菜谱碳足迹（含基准值）
 * - recalculateMenuItems: 批量重新计算菜谱碳足迹
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      case 'calculateMenuItemCarbon':
        return await calculateMenuItemCarbon(data, context);
      case 'recalculateMenuItems':
        return await recalculateMenuItems(data, context);
      case 'getCarbonFactors':
        return await getCarbonFactors(data, context);
      default:
        return {
          code: 400,
          message: `未知的 action: ${action}`
        };
    }
  } catch (error) {
    return {
      code: 500,
      message: '云函数执行失败',
      error: error.message
    };
  }
};

/**
 * 计算菜谱碳足迹（含基准值查询和碳减排值计算）
 * 
 * @param {Object} data - 请求数据
 * @param {string} data.restaurantId - 餐厅ID（必填）
 * @param {string} data.mealType - 餐食类型（必填）：meat_simple | meat_full
 * @param {string} data.energyType - 用能方式（必填）：electric | gas | mixed
 * @param {Array} data.ingredients - 食材列表
 * @param {string} data.cookingMethod - 烹饪方式
 * @param {number} data.cookingTime - 烹饪时间（分钟，可选）
 * @param {Object} data.packaging - 包装信息（可选）
 */
async function calculateMenuItemCarbon(data, context) {
  try {
    // 1. 验证必填字段
    if (!data.restaurantId || !data.mealType || !data.energyType) {
      return {
        code: 400,
        message: '缺少必填字段：restaurantId、mealType、energyType 为必填'
      };
    }

  // 验证枚举值（使用常量文件中的定义）
  if (!VALID_ENUMS.mealTypes.includes(data.mealType)) {
    return {
      code: 400,
      message: `无效的 mealType: ${data.mealType}，有效值：${VALID_ENUMS.mealTypes.join(', ')}`
    };
  }
  
  if (!VALID_ENUMS.energyTypes.includes(data.energyType)) {
    return {
      code: 400,
      message: `无效的 energyType: ${data.energyType}，有效值：${VALID_ENUMS.energyTypes.join(', ')}`
    };
  }

  // 验证计算级别
  if (data.calculationLevel && !VALID_ENUMS.calculationLevels.includes(data.calculationLevel)) {
    return {
      code: 400,
      message: `无效的 calculationLevel: ${data.calculationLevel}，有效值：${VALID_ENUMS.calculationLevels.join(', ')}`
    };
  }

  // 验证烹饪时间范围（使用常量文件中的定义）
  if (data.cookingTime !== undefined && data.cookingTime !== null) {
    const cookingTime = Number(data.cookingTime);
    if (isNaN(cookingTime) || cookingTime < COOKING_TIME_RANGE.min || cookingTime > COOKING_TIME_RANGE.max) {
      return {
        code: 400,
        message: `无效的 cookingTime: ${data.cookingTime}，有效范围：${COOKING_TIME_RANGE.min}-${COOKING_TIME_RANGE.max}分钟`
      };
    }
  }

  // 验证食材数据格式
  if (data.ingredients && Array.isArray(data.ingredients)) {
    for (let i = 0; i < data.ingredients.length; i++) {
      const ingredient = data.ingredients[i];
      const ingredientName = ingredient.ingredientName || ingredient.name;
      
      // 验证用量
      if (ingredient.quantity !== undefined && ingredient.quantity !== null) {
        const quantity = parseFloat(ingredient.quantity);
        if (isNaN(quantity) || quantity <= 0) {
          return {
            code: 400,
            message: `食材[${i}](${ingredientName || '未知'})的用量无效: ${ingredient.quantity}，必须大于0`
          };
        }
      }

      // 验证单位（使用常量文件中的定义）
      if (ingredient.unit) {
        const unit = ingredient.unit.toLowerCase();
        if (!VALID_ENUMS.units.includes(unit)) {
          return {
            code: 400,
            message: `食材[${i}](${ingredientName || '未知'})的单位无效: ${ingredient.unit}，有效值：${VALID_ENUMS.units.join(', ')}`
          };
        }
      }
    }
  }

    // 2. 获取餐厅信息（获取地区）
    // 如果已经传入餐厅信息，直接使用（批量计算时避免重复查询）
    let restaurant = { data: data.restaurantData || null };
    if (!restaurant.data) {
      const restaurantDoc = await db.collection('restaurants')
        .doc(data.restaurantId)
        .get();
      restaurant = restaurantDoc;

      if (!restaurant.data) {
        return {
          code: 404,
          message: '餐厅不存在'
        };
      }
    }

    // 获取基准值区域代码（用于基准值查询）
    // 优先使用传入的region参数，否则使用餐厅的region，最后使用默认值
    let baselineRegion = data.region;
    if (!baselineRegion) {
      if (restaurant.data && restaurant.data.region) {
        baselineRegion = restaurant.data.region;
      } else {
        // 使用默认值（基准值区域代码）
        baselineRegion = DEFAULT_REGIONS.baselineRegion;
      }
    }
    
    // 获取因子区域代码（用于因子匹配）
    // 优先使用传入的 factorRegion 参数，否则从餐厅信息获取，最后使用默认值
    let factorRegion = data.factorRegion || DEFAULT_REGIONS.factorRegion;
    if (!data.factorRegion && restaurant.data) {
      if (restaurant.data.factorRegion) {
        factorRegion = restaurant.data.factorRegion;
      } else {
        // 如果没有配置 factorRegion，使用默认值
        factorRegion = DEFAULT_REGIONS.factorRegion;
      }
    }

    // 3. 计算菜谱碳足迹值（根据计算级别）
    const calculationLevel = data.calculationLevel || DEFAULT_CALCULATION_LEVEL;
    let carbonValue;
    
    if (calculationLevel === 'L1') {
      // L1级别：基于品类基准值直接映射
      carbonValue = await calculateCarbonFootprintL1(data, baselineRegion);
      // L1级别已经在内部查询了基准值，直接使用结果
      const baseline = carbonValue.value; // L1级别使用基准值作为估算值
      const reduction = baseline - baseline; // L1级别的减排值为0（因为是估算）
      
      // L1级别也需要使用置信区间进行减排认定
      const l1BaselineInfo = carbonValue.baselineInfo || {
        baselineId: null,
        version: null,
        source: 'L1估算级',
        queryDate: new Date()
      };
      
      let l1BaselineLowerBound = baseline;
      let l1BaselineUpperBound = baseline;
      let l1CarbonLevel = 'medium';
      
      if (l1BaselineInfo.confidenceInterval) {
        l1BaselineLowerBound = l1BaselineInfo.confidenceInterval.lower || baseline;
        l1BaselineUpperBound = l1BaselineInfo.confidenceInterval.upper || baseline;
        
        if (carbonValue.value < l1BaselineLowerBound) {
          l1CarbonLevel = 'low';
        } else if (carbonValue.value > l1BaselineUpperBound) {
          l1CarbonLevel = 'high';
        }
      } else {
        // 如果没有置信区间信息，使用默认判断
        l1CarbonLevel = 'medium';
      }
      
      return {
        code: 0,
        message: '计算成功（L1估算级）',
        data: {
          carbonFootprint: {
            value: carbonValue.value,
            baseline: baseline,
            reduction: reduction,
            baselineConfidenceInterval: {
              lower: l1BaselineLowerBound,
              upper: l1BaselineUpperBound
            },
            breakdown: carbonValue.breakdown
          },
          baselineInfo: l1BaselineInfo,
          factorMatchInfo: carbonValue.factorMatchInfo || [],
          optimizationFlag: {
            needsOptimization: l1CarbonLevel === 'high',
            warningMessage: l1CarbonLevel === 'high' ? '碳足迹高于基准值置信上限，建议优化菜谱配方或烹饪方式' : null
          },
          carbonLevel: l1CarbonLevel,
          calculationLevel: 'L1',
          isEstimated: true,
          calculatedAt: new Date()
        }
      };
    } else if (calculationLevel === 'L2') {
      // L2级别：标准配方(BOM) + 标准能耗模型
      // 确保 data 中包含 factorRegion 和 baselineRegion
      data.factorRegion = factorRegion;
      data.baselineRegion = baselineRegion;
      // 传递餐厅信息避免重复查询
      carbonValue = await calculateCarbonFootprint(data, restaurant.data);
    } else if (calculationLevel === 'L3') {
      // L3级别：动态BOM + 智能电表实测 + 溯源因子
      data.factorRegion = factorRegion;
      carbonValue = await calculateCarbonFootprintL3(data, factorRegion);
    } else {
      // 默认使用L2级别
      data.factorRegion = factorRegion;
      data.baselineRegion = baselineRegion;
      // 传递餐厅信息避免重复查询
      carbonValue = await calculateCarbonFootprint(data, restaurant.data);
    }
    
    // 设置计算级别
    carbonValue.calculationLevel = calculationLevel;

    // 4. 查询基准值（使用基准值区域代码）
    const baselineResult = await cloud.callFunction({
      name: 'carbon-baseline-query',
      data: {
        mealType: data.mealType,
        region: baselineRegion,
        energyType: data.energyType
      }
    });

    let baseline = 0;
    let baselineInfo = {
      baselineId: null,
      version: null,
      source: null,
      queryDate: new Date()
    };

    // 基准值置信区间（用于减排认定与分级）
    let baselineLowerBound = 0;
    let baselineUpperBound = 0;
    let baselineUncertainty = null;

    if (baselineResult.result && baselineResult.result.success) {
      const baselineData = baselineResult.result.data;
      baseline = baselineData?.carbonFootprint?.value || 0;
      
      // 获取置信区间信息
      if (baselineData?.carbonFootprint?.confidenceInterval) {
        baselineLowerBound = baselineData.carbonFootprint.confidenceInterval.lower || 0;
        baselineUpperBound = baselineData.carbonFootprint.confidenceInterval.upper || 0;
      } else if (baselineData?.carbonFootprint?.uncertainty !== undefined && baselineData?.carbonFootprint?.uncertainty !== null) {
        // 如果没有置信区间，但有不确定性值，则计算置信区间
        baselineUncertainty = baselineData.carbonFootprint.uncertainty;
        baselineLowerBound = Math.max(0, baseline - baselineUncertainty);
        baselineUpperBound = baseline + baselineUncertainty;
      } else {
        // 如果没有置信区间信息，使用默认的不确定性（使用常量文件中的比例）
        baselineUncertainty = baseline * DEFAULT_BASELINE_UNCERTAINTY_RATIO;
        baselineLowerBound = Math.max(0, baseline - baselineUncertainty);
        baselineUpperBound = baseline + baselineUncertainty;
      }
      
      baselineInfo = {
        baselineId: baselineData?.baselineId || null,
        version: baselineData?.version || null,
        source: baselineData?.source?.organization || null,
        queryDate: new Date()
      };
      } else {
        // 基准值查询失败，尝试使用全国平均
        const nationalBaselineResult = await cloud.callFunction({
        name: 'carbon-baseline-query',
        data: {
          mealType: data.mealType,
          region: 'national_average',
          energyType: data.energyType
        }
      });

      if (nationalBaselineResult.result && nationalBaselineResult.result.success) {
        const nationalBaselineData = nationalBaselineResult.result.data;
        baseline = nationalBaselineData?.carbonFootprint?.value || 0;
        
        // 获取全国平均基准值的置信区间信息
        if (nationalBaselineData?.carbonFootprint?.confidenceInterval) {
          baselineLowerBound = nationalBaselineData.carbonFootprint.confidenceInterval.lower || 0;
          baselineUpperBound = nationalBaselineData.carbonFootprint.confidenceInterval.upper || 0;
        } else if (nationalBaselineData?.carbonFootprint?.uncertainty !== undefined && nationalBaselineData?.carbonFootprint?.uncertainty !== null) {
          baselineUncertainty = nationalBaselineData.carbonFootprint.uncertainty;
          baselineLowerBound = Math.max(0, baseline - baselineUncertainty);
          baselineUpperBound = baseline + baselineUncertainty;
        } else {
          baselineUncertainty = baseline * DEFAULT_BASELINE_UNCERTAINTY_RATIO;
          baselineLowerBound = Math.max(0, baseline - baselineUncertainty);
          baselineUpperBound = baseline + baselineUncertainty;
        }
        
        baselineInfo = {
          baselineId: nationalBaselineData?.baselineId || null,
          version: nationalBaselineData?.version || null,
          source: nationalBaselineData?.source?.organization || '全国平均（备选）',
          queryDate: new Date()
        };
      } else {
        // 仍失败，使用默认值
        baseline = getDefaultBaseline(data.mealType);
        baselineUncertainty = baseline * DEFAULT_BASELINE_UNCERTAINTY_RATIO;
        baselineLowerBound = Math.max(0, baseline - baselineUncertainty);
        baselineUpperBound = baseline + baselineUncertainty;
        baselineInfo = {
          baselineId: null,
          version: null,
          source: '系统默认值',
          queryDate: new Date()
        };
      }
    }

    // 5. 计算碳减排值
    const reduction = baseline - carbonValue.value;

    // 6. 使用置信区间进行减排认定与分级
    // 根据文档：显著减排（CF < Baseline_lower_bound）、行业达标（Baseline_lower_bound ≤ CF ≤ Baseline_upper_bound）、高碳排放（CF > Baseline_upper_bound）
    let carbonLevel = 'medium'; // 默认：行业达标
    let needsOptimization = false;
    let warningMessage = null;
    
    if (baselineLowerBound > 0 && baselineUpperBound > 0) {
      if (carbonValue.value < baselineLowerBound) {
        // 显著减排：低于基准值置信下限
        carbonLevel = 'low';
      } else if (carbonValue.value > baselineUpperBound) {
        // 高碳排放：高于基准值置信上限
        carbonLevel = 'high';
        needsOptimization = true;
        warningMessage = '碳足迹高于基准值置信上限，建议优化菜谱配方或烹饪方式';
      } else {
        // 行业达标：在基准值误差范围内
        carbonLevel = 'medium';
      }
    } else {
      // 如果没有置信区间信息，使用简单判断
      needsOptimization = reduction < 0;
      if (needsOptimization) {
        carbonLevel = 'high';
        warningMessage = '碳减排值为负，建议优化菜谱配方或烹饪方式';
      } else if (reduction > baseline * 0.2) {
        // 减排超过基准值的20%，视为显著减排
        carbonLevel = 'low';
      }
    }

    return {
      code: 0,
      message: '计算成功',
      data: {
        carbonFootprint: {
          value: carbonValue.value,
          baseline: baseline,
          reduction: reduction,
          // 置信区间信息
          baselineConfidenceInterval: {
            lower: baselineLowerBound,
            upper: baselineUpperBound,
            uncertainty: baselineUncertainty
          },
          breakdown: {
            ingredients: carbonValue.ingredients || carbonValue.breakdown?.ingredients || 0,
            energy: carbonValue.cookingEnergy || carbonValue.breakdown?.energy || 0,
            packaging: carbonValue.packaging || carbonValue.breakdown?.packaging || 0,
            transport: carbonValue.transport || carbonValue.breakdown?.transport || 0
          }
        },
        baselineInfo: baselineInfo,
        factorMatchInfo: carbonValue.factorMatchInfo || [],
        // 详细的计算明细（用于前端展示和验证）
        calculationDetails: carbonValue.calculationDetails || null,
        optimizationFlag: {
          needsOptimization: needsOptimization,
          warningMessage: warningMessage
        },
        // 基于置信区间的减排认定级别（low: 显著减排, medium: 行业达标, high: 高碳排放）
        carbonLevel: carbonLevel,
        calculationLevel: carbonValue.calculationLevel || DEFAULT_CALCULATION_LEVEL, // 标识计算级别
        calculatedAt: new Date()
      }
    };
  } catch (error) {
    return {
      code: 500,
      message: '计算失败',
      error: error.message
    };
  }
}

/**
 * 计算菜谱碳足迹值（L2级别：核算级）
 * 基于食材、烹饪方式等数据计算
 * 
 * 计算公式：
 * CF_dish = CF_ingredients + CF_energy + CF_packaging + CF_transport
 * 
 * CF_ingredients = Σ(M_i × EF_i × (1 + W_i))
 * - M_i: 食材i的净重 (kg)
 * - EF_i: 食材i的排放因子 (kg CO₂e/kg)，从因子库查询
 * - W_i: 食材i的损耗率 (Ratio)
 * 
 * @param {Object} data - 计算数据
 * @param {Object} restaurantData - 餐厅信息（可选，避免重复查询）
 */
async function calculateCarbonFootprint(data, restaurantData = null) {
  let ingredientsCarbon = 0;
  let cookingEnergyCarbon = 0;
  let packagingCarbon = 0;
  let transportCarbon = 0;
  
  // 用于记录因子匹配信息
  const factorMatchInfo = [];

  // 获取因子区域代码（用于因子匹配）
  // 优先使用传入的 factorRegion 参数，否则从餐厅信息获取，最后使用默认值CN
  let factorRegion = 'CN'; // 默认使用CN（因子区域代码）
  
  if (data.factorRegion) {
    // 优先使用传入的 factorRegion
    factorRegion = data.factorRegion;
  } else if (restaurantData && restaurantData.factorRegion) {
    // 使用传入的餐厅信息（避免重复查询）
    factorRegion = restaurantData.factorRegion;
  } else if (data.restaurantId && !restaurantData) {
    // 只有在没有传入餐厅信息时才查询
    try {
      const restaurant = await db.collection('restaurants')
        .doc(data.restaurantId)
        .get();
      if (restaurant.data && restaurant.data.factorRegion) {
        factorRegion = restaurant.data.factorRegion;
      }
    } catch (error) {
      // 无法获取餐厅信息，使用默认值
      factorRegion = DEFAULT_REGIONS.factorRegion;
    }
  }
  
  // 获取基准值区域代码（用于基准值查询和电力因子匹配）
  // 优先使用传入的 region 参数，否则从餐厅信息获取，最后使用默认值national_average
  let baselineRegion = DEFAULT_REGIONS.baselineRegion; // 默认使用national_average（基准值区域代码）
  
  if (data.region || data.baselineRegion) {
    // 优先使用传入的 region 或 baselineRegion
    baselineRegion = data.region || data.baselineRegion;
  } else if (restaurantData && restaurantData.region) {
    // 使用传入的餐厅信息（避免重复查询）
    baselineRegion = restaurantData.region;
  } else if (data.restaurantId && !restaurantData) {
    // 只有在没有传入餐厅信息时才查询
    try {
      const restaurant = await db.collection('restaurants')
        .doc(data.restaurantId)
        .get();
      if (restaurant.data && restaurant.data.region) {
        baselineRegion = restaurant.data.region;
      }
    } catch (error) {
      // 无法获取餐厅信息，使用默认值
      baselineRegion = DEFAULT_REGIONS.baselineRegion;
    }
  }

  // 1. 计算食材碳足迹（直接使用菜单项的数据格式：{ ingredientName, quantity, unit, category }）
  if (data.ingredients && Array.isArray(data.ingredients)) {
    
    for (const ingredient of data.ingredients) {
      try {
        // 直接使用菜单项的食材数据格式
        // 格式：{ ingredientName, quantity, unit, category, wasteRate(可选), ingredientId(可选) }
        const ingredientName = ingredient.ingredientName || ingredient.name; // 兼容旧格式
        const quantity = ingredient.quantity;
        const unit = ingredient.unit || 'g';
        const ingredientCategory = ingredient.category || null;
        const wasteRate = ingredient.wasteRate || await getDefaultWasteRate(ingredientCategory); // 损耗率，默认值根据类别

        // 验证必填字段
        if (!ingredientName) {
          // 如果没有名称，尝试从ingredients集合获取
          if (ingredient.ingredientId) {
            const ingredientDoc = await db.collection('ingredients')
              .doc(ingredient.ingredientId)
              .get();
            
            if (ingredientDoc.data) {
              const fetchedName = ingredientDoc.data.name;
              const fetchedCategory = ingredientDoc.data.category;
              if (!fetchedName) {
                continue;
              }
              // 使用获取到的名称和类别
              ingredient.ingredientName = fetchedName;
              ingredient.category = ingredientCategory || fetchedCategory;
            } else {
              continue;
            }
          } else {
            continue;
          }
        }

        if (quantity === undefined || quantity === null) {
          continue;
        }

        // 将用量转换为kg（用于计算）- 使用统一的转换函数
        const quantityNum = parseFloat(quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
          continue;
        }

        const weightInKg = convertToKg(quantityNum, unit);
        if (weightInKg <= 0) {
          continue;
        }

        const finalIngredientName = ingredient.ingredientName || ingredientName;
        const finalCategory = ingredient.category || ingredientCategory;

        // 从因子库查询因子（使用因子区域代码）
        const factor = await matchFactor(finalIngredientName, finalCategory, factorRegion);
        
        if (factor && factor.factorValue !== null && factor.factorValue !== undefined) {
          const coefficient = factor.factorValue;
          // 考虑损耗率：CF = M × EF × (1 + W)
          const carbon = coefficient * weightInKg * (1 + wasteRate);
          ingredientsCarbon += carbon;
          
          
          // 记录因子匹配信息（使用原始数据格式）
          factorMatchInfo.push({
            ingredientName: finalIngredientName,
            ingredientCategory: finalCategory,
            quantity: quantityNum, // 原始用量
            unit: unit, // 原始单位
            weightInKg: weightInKg, // 转换后的重量（kg）
            wasteRate: wasteRate,
            matchedFactor: {
              factorId: factor.factorId || null,
              factorValue: factor.factorValue,
              unit: factor.unit || 'kg CO₂e/kg',
              matchLevel: factor.matchLevel || 'unknown',
              source: factor.source || null,
              year: factor.year || null,
              region: factor.region || null
            },
            carbonFootprint: carbon,
            calculation: {
              formula: 'CF = EF × M × (1 + W)',
              values: {
                EF: coefficient,
                M: weightInKg,
                W: wasteRate,
                result: carbon
              }
            }
          });
        } else {
          factorMatchInfo.push({
            ingredientName: finalIngredientName,
            ingredientCategory: finalCategory,
            quantity: quantityNum,
            unit: unit,
            weightInKg: weightInKg,
            wasteRate: wasteRate,
            matchedFactor: null,
            carbonFootprint: 0,
            warning: '因子匹配失败，未计算碳足迹'
          });
        }
      } catch (error) {
        const ingredientName = ingredient.ingredientName || ingredient.name || '未知';
        factorMatchInfo.push({
          ingredientName: ingredientName,
          error: error.message,
          carbonFootprint: 0,
          warning: '计算过程出错'
        });
      }
    }
    
  }

  // 2. 计算烹饪能耗碳足迹（从因子库查询）
  if (data.cookingMethod && (data.cookingTime || data.energyType)) {
    try {
      // 确定能源因子匹配区域
      // 电力因子使用基准值区域（电网区域），燃气因子使用因子区域（国家级别）
      const energyType = data.energyType || 'electric';
      const energyFactorRegion = energyType === 'electric' ? baselineRegion : factorRegion;
      
      // 如果提供了具体能耗数据（功率和时长）
      if (data.power && data.cookingTime) {
        const energyFactor = await matchEnergyFactor(energyType, energyFactorRegion);
        
        if (energyFactor && energyFactor.factorValue) {
          // 单位转换：功率(kW) × 时长(h) × 因子(kg CO₂e/kWh 或 kg CO₂e/m³)
          const energyConsumption = data.power * (data.cookingTime / 60); // 转换为小时
          cookingEnergyCarbon = energyConsumption * energyFactor.factorValue;
        } else {
          // 降级使用标准工时模型
          cookingEnergyCarbon = await calculateEnergyByStandardModel(data.cookingMethod, data.cookingTime, data.energyType, energyFactorRegion);
        }
      } else {
        // 使用标准工时模型（根据烹饪方式估算）
        cookingEnergyCarbon = await calculateEnergyByStandardModel(data.cookingMethod, data.cookingTime, data.energyType, energyFactorRegion);
      }
    } catch (error) {
      // 计算失败，跳过能耗部分
    }
  }

  // 3. 计算包装碳足迹（从因子库查询）
  if (data.packaging) {
    try {
      const packagingMaterials = Array.isArray(data.packaging) ? data.packaging : [data.packaging];
      
      for (const packaging of packagingMaterials) {
        const materialName = packaging.type || packaging.name || packaging.material;
        const materialWeight = packaging.weight || 0; // 单位：kg
        
        if (!materialName || materialWeight <= 0) {
          continue;
        }
        
        // 从因子库查询包装材料因子
        const materialFactor = await matchMaterialFactor(materialName, factorRegion);
        
        if (materialFactor && materialFactor.factorValue) {
          packagingCarbon += materialFactor.factorValue * materialWeight;
        }
      }
    } catch (error) {
      // 计算失败，跳过包装部分
    }
  }

  // 4. 计算运输碳排放（可选，根据数据源决定）
  // 如果提供了运输信息，则计算运输碳排放
  if (data.transport && data.transport.distance && data.transport.mode) {
    try {
      const transportFactor = await matchTransportFactor(data.transport.mode, factorRegion);
      
      if (transportFactor && transportFactor.factorValue) {
        // 运输碳排放 = 距离(km) × 因子(kg CO₂e/km·kg) × 重量(kg)
        const transportWeight = data.transport.weight || 1; // 默认1kg
        transportCarbon = data.transport.distance * transportFactor.factorValue * transportWeight;
      }
    } catch (error) {
      // 计算失败，跳过运输部分
    }
  }

  const total = ingredientsCarbon + cookingEnergyCarbon + packagingCarbon + transportCarbon;

  // 根据计算级别处理因子匹配失败
  const calculationLevel = data.calculationLevel || DEFAULT_CALCULATION_LEVEL;
  const factorMatchFailure = handleFactorMatchFailure(calculationLevel, factorMatchInfo);
  
  if (factorMatchFailure.warnings.length > 0) {
    console.warn('因子匹配失败处理:', factorMatchFailure.warnings);
  }

  // L3级别如果因子匹配失败，抛出错误
  if (!factorMatchFailure.allowContinue) {
    throw new Error(`L3级别计算失败: ${factorMatchFailure.warnings.join('; ')}`);
  }

  // 验证计算结果合理性
  const validationResult = validateCalculationResult({
    total,
    ingredients: ingredientsCarbon,
    energy: cookingEnergyCarbon,
    packaging: packagingCarbon,
    transport: transportCarbon,
    factorMatchInfo
  });

  if (!validationResult.isValid) {
    console.warn('计算结果合理性验证失败:', validationResult.warnings);
    // 如果计算结果异常，记录警告但不中断（允许继续计算，但标记为可疑）
    factorMatchInfo.push({
      note: '计算结果合理性验证失败',
      warnings: validationResult.warnings,
      carbonFootprint: 0
    });
  }

  return {
    value: total,
    ingredients: ingredientsCarbon,
    cookingEnergy: cookingEnergyCarbon,
    packaging: packagingCarbon,
    transport: transportCarbon,
    breakdown: {
      ingredients: ingredientsCarbon,
      energy: cookingEnergyCarbon,
      packaging: packagingCarbon,
      transport: transportCarbon
    },
    factorMatchInfo: factorMatchInfo,
    // 添加详细的计算明细，用于前端展示和验证（直接使用菜单项的数据格式）
    calculationDetails: {
      ingredients: factorMatchInfo.map(info => ({
        ingredientName: info.ingredientName,
        category: info.ingredientCategory,
        quantity: info.quantity, // 原始用量
        unit: info.unit, // 原始单位
        weightInKg: info.weightInKg, // 转换后的重量（kg）
        wasteRate: info.wasteRate,
        factor: info.matchedFactor ? {
          value: info.matchedFactor.factorValue,
          unit: info.matchedFactor.unit,
          matchLevel: info.matchedFactor.matchLevel,
          source: info.matchedFactor.source
        } : null,
        carbonFootprint: info.carbonFootprint,
        calculation: info.calculation,
        warning: info.warning
      })),
      energy: {
        method: data.cookingMethod,
        time: data.cookingTime,
        energyType: data.energyType,
        carbonFootprint: cookingEnergyCarbon
      },
      packaging: {
        carbonFootprint: packagingCarbon
      },
      transport: {
        carbonFootprint: transportCarbon
      },
      total: total
    }
  };
}

/**
 * 获取默认基准值
 */
function getDefaultBaseline(mealType) {
  // 使用常量文件中的默认基准值
  return DEFAULT_BASELINES[mealType] || DEFAULT_BASELINES.meat_simple;
}

/**
 * L1级别计算：基于品类基准值直接映射（估算级）
 * 适用于：快速铺量、小微餐厅、商户数据缺失场景
 * 
 * 计算逻辑：
 * 1. 根据餐食类型（mealType）和地区（region）、用能方式（energyType）查询基准值
 * 2. 直接使用基准值作为碳足迹估算值
 * 3. 不进行详细的食材分解计算
 * 
 * @param {Object} data - 请求数据
 * @param {string} region - 餐厅地区
 * @returns {Promise<Object>} 计算结果
 */
async function calculateCarbonFootprintL1(data, region) {
  try {
    // 查询基准值（作为L1级别的估算值）
    const baselineResult = await cloud.callFunction({
      name: 'carbon-baseline-query',
      data: {
        mealType: data.mealType || DEFAULT_MEAL_TYPE,
        region: region || DEFAULT_REGIONS.baselineRegion,
        energyType: data.energyType || DEFAULT_ENERGY_TYPE
      }
    });

    let estimatedValue = 0;
    let baselineInfo = {
      baselineId: null,
      version: null,
      source: null,
      queryDate: new Date()
    };

    // L1级别的基准值置信区间信息
    let baselineLowerBound = 0;
    let baselineUpperBound = 0;
    let baselineUncertainty = null;

    if (baselineResult.result && baselineResult.result.success) {
      const baselineData = baselineResult.result.data;
      estimatedValue = baselineData?.carbonFootprint?.value || 0;
      
      // 获取置信区间信息
      if (baselineData?.carbonFootprint?.confidenceInterval) {
        baselineLowerBound = baselineData.carbonFootprint.confidenceInterval.lower || 0;
        baselineUpperBound = baselineData.carbonFootprint.confidenceInterval.upper || 0;
      } else if (baselineData?.carbonFootprint?.uncertainty !== undefined && baselineData?.carbonFootprint?.uncertainty !== null) {
        baselineUncertainty = baselineData.carbonFootprint.uncertainty;
        baselineLowerBound = Math.max(0, estimatedValue - baselineUncertainty);
        baselineUpperBound = estimatedValue + baselineUncertainty;
      } else {
        baselineUncertainty = estimatedValue * DEFAULT_BASELINE_UNCERTAINTY_RATIO;
        baselineLowerBound = Math.max(0, estimatedValue - baselineUncertainty);
        baselineUpperBound = estimatedValue + baselineUncertainty;
      }
      
      baselineInfo = {
        baselineId: baselineData?.baselineId || null,
        version: baselineData?.version || null,
        source: baselineData?.source?.organization || null,
        queryDate: new Date(),
        confidenceInterval: {
          lower: baselineLowerBound,
          upper: baselineUpperBound,
          uncertainty: baselineUncertainty
        }
      };
      } else {
        // 查询失败，尝试使用全国平均
        const nationalBaselineResult = await cloud.callFunction({
        name: 'carbon-baseline-query',
        data: {
          mealType: data.mealType || 'meat_simple',
          region: 'national_average',
          energyType: data.energyType || 'electric'
        }
      });

      if (nationalBaselineResult.result && nationalBaselineResult.result.success) {
        const nationalBaselineData = nationalBaselineResult.result.data;
        estimatedValue = nationalBaselineData?.carbonFootprint?.value || 0;
        
        // 获取全国平均基准值的置信区间信息
        if (nationalBaselineData?.carbonFootprint?.confidenceInterval) {
          baselineLowerBound = nationalBaselineData.carbonFootprint.confidenceInterval.lower || 0;
          baselineUpperBound = nationalBaselineData.carbonFootprint.confidenceInterval.upper || 0;
        } else if (nationalBaselineData?.carbonFootprint?.uncertainty !== undefined && nationalBaselineData?.carbonFootprint?.uncertainty !== null) {
          baselineUncertainty = nationalBaselineData.carbonFootprint.uncertainty;
          baselineLowerBound = Math.max(0, estimatedValue - baselineUncertainty);
          baselineUpperBound = estimatedValue + baselineUncertainty;
        } else {
          baselineUncertainty = estimatedValue * DEFAULT_BASELINE_UNCERTAINTY_RATIO;
          baselineLowerBound = Math.max(0, estimatedValue - baselineUncertainty);
          baselineUpperBound = estimatedValue + baselineUncertainty;
        }
        
        baselineInfo = {
          baselineId: nationalBaselineData?.baselineId || null,
          version: nationalBaselineData?.version || null,
          source: nationalBaselineData?.source?.organization || '全国平均（L1估算）',
          queryDate: new Date(),
          confidenceInterval: {
            lower: baselineLowerBound,
            upper: baselineUpperBound,
            uncertainty: baselineUncertainty
          }
        };
      } else {
        // 仍失败，使用默认值
        estimatedValue = getDefaultBaseline(data.mealType || 'meat_simple');
        baselineUncertainty = estimatedValue * DEFAULT_BASELINE_UNCERTAINTY_RATIO;
        baselineLowerBound = Math.max(0, estimatedValue - baselineUncertainty);
        baselineUpperBound = estimatedValue + baselineUncertainty;
        baselineInfo = {
          baselineId: null,
          version: null,
          source: '系统默认值（L1估算）',
          queryDate: new Date(),
          confidenceInterval: {
            lower: baselineLowerBound,
            upper: baselineUpperBound,
            uncertainty: baselineUncertainty
          }
        };
      }
    }

    // L1级别不进行分解计算，所有值都基于基准值估算
    // 使用行业经验比例进行分解：食材70%，能耗20%，包装5%，运输5%
    return {
      value: estimatedValue,
      ingredients: estimatedValue * 0.7, // 估算：食材占70%
      cookingEnergy: estimatedValue * 0.2, // 估算：能耗占20%
      packaging: estimatedValue * 0.05, // 估算：包装占5%
      transport: estimatedValue * 0.05, // 估算：运输占5%
      breakdown: {
        ingredients: estimatedValue * 0.7,
        energy: estimatedValue * 0.2,
        packaging: estimatedValue * 0.05,
        transport: estimatedValue * 0.05
      },
      factorMatchInfo: [{
        note: 'L1估算级：直接使用基准值作为估算，未进行详细的食材分解计算',
        baselineInfo: baselineInfo,
        calculationMethod: 'baseline_estimation',
        accuracy: 'low',
        description: '基于餐食类型和地区的行业基准值进行快速估算，适用于快速铺量、小微餐厅、商户数据缺失场景'
      }],
      baselineInfo: baselineInfo,
      calculationLevel: 'L1',
      isEstimated: true, // 标识为估算值
      calculationMethod: 'baseline_estimation' // 计算方法标识
    };
  } catch (error) {
    // 降级使用默认值
    const defaultValue = getDefaultBaseline(data.mealType || 'meat_simple');
    return {
      value: defaultValue,
      ingredients: defaultValue * 0.7,
      cookingEnergy: defaultValue * 0.2,
      packaging: defaultValue * 0.05,
      transport: defaultValue * 0.05,
      breakdown: {
        ingredients: defaultValue * 0.7,
        energy: defaultValue * 0.2,
        packaging: defaultValue * 0.05,
        transport: defaultValue * 0.05
      },
      factorMatchInfo: [{
        note: 'L1估算级：计算失败，使用默认值',
        error: error.message
      }],
      baselineInfo: {
        baselineId: null,
        version: null,
        source: '系统默认值（L1估算，计算失败）',
        queryDate: new Date()
      },
      calculationLevel: 'L1',
      isEstimated: true
    };
  }
}

/**
 * L3级别计算：动态BOM + 智能电表实测 + 溯源因子（实测级）
 * 适用于：标杆气候餐厅、碳资产开发
 * 
 * 计算逻辑：
 * 1. 使用动态BOM（实时食材重量输入）
 * 2. 使用智能电表实测能耗数据（或模拟接口）
 * 3. 支持溯源因子（运输、供应链溯源）
 * 4. 完整的审计日志和数据追溯
 * 
 * @param {Object} data - 请求数据
 * @param {string} region - 餐厅地区
 * @returns {Promise<Object>} 计算结果
 */
async function calculateCarbonFootprintL3(data, region) {
  try {
    // 获取因子区域代码（用于因子匹配）
    // 优先使用传入的 factorRegion 参数，否则从餐厅信息获取，最后使用默认值CN
    let factorRegion = 'CN'; // 默认使用CN（因子区域代码）
    
    if (data.factorRegion) {
      // 优先使用传入的 factorRegion
      factorRegion = data.factorRegion;
    } else if (data.restaurantId) {
      // 从餐厅信息获取 factorRegion
      try {
        const restaurant = await db.collection('restaurants')
          .doc(data.restaurantId)
          .get();
        if (restaurant.data && restaurant.data.factorRegion) {
          factorRegion = restaurant.data.factorRegion;
        }
      } catch (error) {
        // 无法获取餐厅信息，使用默认值CN
        factorRegion = 'CN';
      }
    }
    
    // region参数是基准值区域，用于基准值查询和电力因子匹配
    const baselineRegion = region || 'national_average';
    
    // L3级别基于L2级别的计算逻辑，但使用实测数据
    // 1. 如果提供了实测能耗数据（meterReading），使用实测值
    let actualEnergyCarbon = 0;
    let meterReadingInfo = null;
    
    if (data.meterReading) {
      // 验证实测能耗数据格式
      if (typeof data.meterReading.energyConsumption !== 'number' || data.meterReading.energyConsumption < 0) {
        throw new Error('实测能耗数据格式错误：energyConsumption 必须是大于等于0的数字');
      }
      
      if (!data.meterReading.unit || !['kWh', 'm³', 'kwh', 'm3'].includes(data.meterReading.unit)) {
        throw new Error('实测能耗数据格式错误：unit 必须是 "kWh" 或 "m³"');
      }
      
      // 使用实测能耗数据
      const energyType = data.energyType || 'electric';
      // 电力因子使用基准值区域（电网区域），燃气因子使用因子区域（国家级别）
      const energyFactorRegion = energyType === 'electric' ? baselineRegion : factorRegion;
      const energyFactor = await matchEnergyFactor(energyType, energyFactorRegion);
      
      if (energyFactor && energyFactor.factorValue) {
        // 实测能耗（kWh或m³）
        const actualConsumption = data.meterReading.energyConsumption;
        actualEnergyCarbon = actualConsumption * energyFactor.factorValue;
        
        // 记录实测能耗信息
        meterReadingInfo = {
          energyConsumption: actualConsumption,
          unit: data.meterReading.unit,
          energyType: energyType,
          factorValue: energyFactor.factorValue,
          factorSource: energyFactor.source || null,
          timestamp: data.meterReading.timestamp || new Date(),
          deviceId: data.meterReading.deviceId || null
        };
      } else {
        throw new Error(`无法匹配${energyType}能耗因子，L3级别需要有效的能耗因子`);
      }
    }

    // 2. 计算食材碳足迹（直接使用菜单项的数据格式，与L2级别保持一致）
    // L3级别对食材的处理与L2相同，但会记录更详细的溯源信息
    let ingredientsCarbon = 0;
    const factorMatchInfo = [];
    
    if (data.ingredients && Array.isArray(data.ingredients)) {
      for (const ingredient of data.ingredients) {
        try {
          // 直接使用菜单项的食材数据格式：{ ingredientName, quantity, unit, category }
          const ingredientName = ingredient.ingredientName || ingredient.name; // 兼容旧格式
          const quantity = ingredient.quantity;
          const unit = ingredient.unit || 'g';
          const ingredientCategory = ingredient.category || null;
          const wasteRate = ingredient.wasteRate || await getDefaultWasteRate(ingredientCategory);
          
          // 支持溯源信息（L3特有）
          // 溯源信息格式：{ supplierId, supplierName, origin, transportDistance, transportMode, certificateId, etc. }
          const traceabilityInfo = ingredient.traceability || null;
          
          // 验证溯源信息格式（如果提供）
          if (traceabilityInfo && typeof traceabilityInfo !== 'object') {
            // 忽略格式错误的溯源信息
          }

          if (!ingredientName || quantity === undefined || quantity === null) {
            continue;
          }

          // 将用量转换为kg（用于计算）- 使用统一的转换函数
          const quantityNum = parseFloat(quantity);
          if (isNaN(quantityNum) || quantityNum <= 0) {
            continue;
          }

          const weightInKg = convertToKg(quantityNum, unit);
          if (weightInKg <= 0) {
            continue;
          }

          // 食材因子使用因子区域（国家级别）
          const factor = await matchFactor(ingredientName, ingredientCategory, factorRegion);
          
          if (factor && factor.factorValue !== null && factor.factorValue !== undefined) {
            const coefficient = factor.factorValue;
            const carbon = coefficient * weightInKg * (1 + wasteRate);
            ingredientsCarbon += carbon;
            
            // L3级别记录详细的因子匹配信息和溯源信息
            factorMatchInfo.push({
              ingredientName: ingredientName,
              ingredientCategory: ingredientCategory,
              quantity: quantityNum, // 原始用量
              unit: unit, // 原始单位
              weightInKg: weightInKg, // 转换后的重量（kg）
              wasteRate: wasteRate,
              matchedFactor: {
                factorId: factor.factorId || null,
                factorValue: factor.factorValue,
                unit: factor.unit || 'kg CO₂e/kg',
                matchLevel: factor.matchLevel || 'unknown',
                source: factor.source || null,
                year: factor.year || null,
                region: factor.region || null
              },
              traceability: traceabilityInfo, // L3特有：溯源信息
              carbonFootprint: carbon
            });
          }
        } catch (error) {
          // 获取因子失败，跳过该食材
        }
      }
    }

    // 3. 如果没有实测能耗，使用标准计算（但标记为L3级别）
    let cookingEnergyCarbon = actualEnergyCarbon;
    if (actualEnergyCarbon === 0) {
      // 降级使用标准计算
      if (data.cookingMethod && (data.cookingTime || data.energyType)) {
        // 确定能源因子匹配区域：电力使用基准值区域，燃气使用因子区域
        const energyType = data.energyType || 'electric';
        const energyFactorRegion = energyType === 'electric' ? baselineRegion : factorRegion;
        cookingEnergyCarbon = await calculateEnergyByStandardModel(
          data.cookingMethod, 
          data.cookingTime, 
          data.energyType, 
          energyFactorRegion
        );
      }
    }

    // 4. 计算包装碳足迹（从因子库查询）
    let packagingCarbon = 0;
    if (data.packaging) {
      try {
        const packagingMaterials = Array.isArray(data.packaging) ? data.packaging : [data.packaging];
        
        for (const packaging of packagingMaterials) {
          const materialName = packaging.type || packaging.name || packaging.material;
          const materialWeight = packaging.weight || 0;
          
          if (!materialName || materialWeight <= 0) {
            continue;
          }
          
          // 材料因子使用因子区域（国家级别）
          const materialFactor = await matchMaterialFactor(materialName, factorRegion);
          
          if (materialFactor && materialFactor.factorValue) {
            packagingCarbon += materialFactor.factorValue * materialWeight;
          }
        }
      } catch (error) {
        // 计算失败，跳过包装部分
      }
    }

    // 5. 计算运输碳排放（L3级别支持溯源因子）
    let transportCarbon = 0;
    if (data.transport && data.transport.distance && data.transport.mode) {
      try {
        // L3级别优先使用溯源因子（如果提供）
        let transportFactor = null;
        if (data.transport.traceabilityFactor) {
          // 使用溯源因子
          transportFactor = {
            factorValue: data.transport.traceabilityFactor,
            source: '溯源数据',
            matchLevel: 'traceability'
          };
        } else {
          // 降级使用因子库查询（使用因子区域）
          transportFactor = await matchTransportFactor(data.transport.mode, factorRegion);
        }
        
        if (transportFactor && transportFactor.factorValue) {
          const transportWeight = data.transport.weight || 1;
          transportCarbon = data.transport.distance * transportFactor.factorValue * transportWeight;
        }
      } catch (error) {
        // 计算失败，跳过运输部分
      }
    }

    const total = ingredientsCarbon + cookingEnergyCarbon + packagingCarbon + transportCarbon;

    // 6. L3级别：记录审计日志
    try {
      const auditLog = {
        calculationLevel: 'L3',
        restaurantId: data.restaurantId,
        mealType: data.mealType,
        energyType: data.energyType,
        hasMeterReading: !!data.meterReading,
        hasTraceability: factorMatchInfo.some(f => f.traceability !== null),
        calculatedAt: new Date(),
        result: {
          total: total,
          breakdown: {
            ingredients: ingredientsCarbon,
            energy: cookingEnergyCarbon,
            packaging: packagingCarbon,
            transport: transportCarbon
          }
        }
      };
      
      // 可以在这里将审计日志写入数据库（如果需要）
      // await db.collection('carbon_calculation_audit_logs').add({ data: auditLog });
    } catch (error) {
      // 记录审计日志失败，不影响计算结果
    }

    // 检查L3级别的数据完整性
    const hasTraceability = factorMatchInfo.some(f => f.traceability !== null);
    const dataCompleteness = {
      hasMeterReading: actualEnergyCarbon > 0,
      hasTraceability: hasTraceability,
      traceabilityCoverage: hasTraceability ? (factorMatchInfo.filter(f => f.traceability !== null).length / factorMatchInfo.length) : 0,
      completeness: actualEnergyCarbon > 0 && hasTraceability ? 'high' : (actualEnergyCarbon > 0 || hasTraceability ? 'medium' : 'low')
    };
    
    // 构建calculationDetails（与L2格式保持一致，但包含L3特有信息）
    const calculationDetails = {
      ingredients: factorMatchInfo.map(info => ({
        ingredientName: info.ingredientName,
        category: info.ingredientCategory,
        quantity: info.quantity, // 原始用量
        unit: info.unit, // 原始单位
        weightInKg: info.weightInKg, // 转换后的重量（kg）
        wasteRate: info.wasteRate,
        factor: info.matchedFactor ? {
          value: info.matchedFactor.factorValue,
          unit: info.matchedFactor.unit,
          matchLevel: info.matchedFactor.matchLevel,
          source: info.matchedFactor.source
        } : null,
        carbonFootprint: info.carbonFootprint,
        calculation: info.calculation,
        warning: info.warning,
        traceability: info.traceability // L3特有：溯源信息
      })),
      energy: {
        method: data.cookingMethod,
        time: data.cookingTime,
        energyType: data.energyType,
        carbonFootprint: cookingEnergyCarbon,
        meterReading: meterReadingInfo, // L3特有：实测能耗信息
        isMeasured: actualEnergyCarbon > 0 && !!data.meterReading
      },
      packaging: {
        carbonFootprint: packagingCarbon
      },
      transport: {
        carbonFootprint: transportCarbon
      },
      total: total,
      dataCompleteness: dataCompleteness, // L3特有：数据完整性信息
      calculationMethod: 'measured_data', // L3计算方法标识
      accuracy: 'high' // L3级别精度高
    };

    return {
      value: total,
      ingredients: ingredientsCarbon,
      cookingEnergy: cookingEnergyCarbon,
      packaging: packagingCarbon,
      transport: transportCarbon,
      breakdown: {
        ingredients: ingredientsCarbon,
        energy: cookingEnergyCarbon,
        packaging: packagingCarbon,
        transport: transportCarbon
      },
      factorMatchInfo: factorMatchInfo,
      calculationDetails: calculationDetails, // 添加详细的计算明细
      calculationLevel: 'L3',
      calculationMethod: 'measured_data', // 计算方法标识
      meterReadingInfo: meterReadingInfo, // 实测能耗信息
      dataCompleteness: dataCompleteness, // 数据完整性信息
      hasMeterReading: actualEnergyCarbon > 0, // 标识是否使用了实测能耗
      hasTraceability: hasTraceability, // 标识是否有溯源信息
      isAuditable: true, // L3级别具备审计级别
      accuracy: 'high', // L3级别精度高
      description: '基于动态BOM、智能电表实测数据和溯源因子的高精度计算，适用于标杆气候餐厅、碳资产开发场景'
    };
  } catch (error) {
    // L3级别计算失败，抛出错误（不降级，因为L3需要高精度）
    throw new Error(`L3级别计算失败: ${error.message}`);
  }
}

/**
 * 验证计算结果合理性
 * @param {Object} result - 计算结果
 * @param {number} result.total - 总碳足迹
 * @param {number} result.ingredients - 食材碳足迹
 * @param {number} result.energy - 能耗碳足迹
 * @param {number} result.packaging - 包装碳足迹
 * @param {number} result.transport - 运输碳足迹
 * @param {Array} result.factorMatchInfo - 因子匹配信息
 * @returns {Object} { isValid: boolean, warnings: string[] }
 */
function validateCalculationResult(result) {
  const warnings = [];
  const { total, ingredients, energy, packaging, transport, factorMatchInfo } = result;

  // 检查总碳足迹是否为负数
  if (total < 0) {
    warnings.push(`总碳足迹为负数: ${total} kg CO₂e，计算结果异常`);
  }

  // 检查总碳足迹是否过大（使用常量文件中的阈值）
  if (total > VALIDATION_THRESHOLDS.maxCarbonFootprint) {
    warnings.push(`总碳足迹过大: ${total} kg CO₂e，单道菜通常不超过${VALIDATION_THRESHOLDS.maxCarbonFootprint} kg CO₂e`);
  }

  // 检查各部分是否为负数
  if (ingredients < 0) warnings.push(`食材碳足迹为负数: ${ingredients} kg CO₂e`);
  if (energy < 0) warnings.push(`能耗碳足迹为负数: ${energy} kg CO₂e`);
  if (packaging < 0) warnings.push(`包装碳足迹为负数: ${packaging} kg CO₂e`);
  if (transport < 0) warnings.push(`运输碳足迹为负数: ${transport} kg CO₂e`);

  // 检查各部分之和是否等于总碳足迹（使用常量文件中的容差）
  const sum = ingredients + energy + packaging + transport;
  const diff = Math.abs(total - sum);
  if (diff > VALIDATION_THRESHOLDS.sumTolerance) {
    warnings.push(`各部分碳足迹之和(${sum})与总碳足迹(${total})不一致，差值: ${diff} kg CO₂e`);
  }

  // 检查是否有因子匹配失败的情况
  if (factorMatchInfo && Array.isArray(factorMatchInfo)) {
    const failedMatches = factorMatchInfo.filter(info => !info.matchedFactor && !info.error);
    if (failedMatches.length > 0) {
      warnings.push(`${failedMatches.length}个食材因子匹配失败，可能导致计算结果不准确`);
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * 根据计算级别处理因子匹配失败
 * @param {string} calculationLevel - 计算级别：'L1' | 'L2' | 'L3'
 * @param {Array} factorMatchInfo - 因子匹配信息
 * @returns {Object} { allowContinue: boolean, warnings: string[] }
 */
function handleFactorMatchFailure(calculationLevel, factorMatchInfo) {
  const warnings = [];
  const failedMatches = factorMatchInfo.filter(info => !info.matchedFactor && !info.error);

  if (failedMatches.length === 0) {
    return { allowContinue: true, warnings: [] };
  }

  const failedIngredientNames = failedMatches.map(info => info.ingredientName).join(', ');

  if (calculationLevel === 'L1') {
    // L1级别允许因子匹配失败（因为是估算级）
    warnings.push(`L1估算级：${failedMatches.length}个食材因子匹配失败(${failedIngredientNames})，已跳过计算`);
    return { allowContinue: true, warnings };
  } else if (calculationLevel === 'L2') {
    // L2级别警告但不中断
    warnings.push(`L2核算级：${failedMatches.length}个食材因子匹配失败(${failedIngredientNames})，可能导致计算结果不准确，建议添加具体因子`);
    return { allowContinue: true, warnings };
  } else if (calculationLevel === 'L3') {
    // L3级别必须匹配成功（实测级需要高精度）
    warnings.push(`L3实测级：${failedMatches.length}个食材因子匹配失败(${failedIngredientNames})，L3级别要求所有食材必须匹配到因子`);
    return { allowContinue: false, warnings };
  }

  return { allowContinue: true, warnings };
}

/**
 * 单位转换为kg（统一处理）
 * @param {number} quantity - 数量
 * @param {string} unit - 单位（g, kg, ml, l, 克, 千克, 毫升, 升）
 * @returns {number} 转换为kg后的重量
 */
function convertToKg(quantity, unit) {
  if (quantity === undefined || quantity === null || isNaN(quantity) || quantity <= 0) {
    return 0;
  }

  const quantityNum = parseFloat(quantity);
  if (isNaN(quantityNum) || quantityNum <= 0) {
    return 0;
  }

  const unitLower = (unit || 'g').toLowerCase();
  
  // g（克）和 ml（毫升）都转换为 kg：除以 1000
  if (unitLower === 'g' || unitLower === '克') {
    return quantityNum / 1000; // g 转 kg
  } else if (unitLower === 'ml' || unitLower === '毫升') {
    return quantityNum / 1000; // ml 转 kg (假设密度为1)
  } else if (unitLower === 'kg' || unitLower === '千克') {
    return quantityNum;
  } else if (unitLower === 'l' || unitLower === '升') {
    return quantityNum; // 假设密度为1，1L ≈ 1kg
  } else {
    // 未知单位，默认按 g 处理
    return quantityNum / 1000;
  }
}

// 引入类别工具模块
let categoryUtils = null;
try {
  categoryUtils = require('./category-utils');
} catch (error) {
  console.warn('类别工具模块未找到，将使用原有映射逻辑');
}

/**
 * 映射ingredients的category到因子库的subCategory
 * 使用类别工具模块（如果可用），否则回退到硬编码映射
 */
async function mapIngredientCategoryToSubCategory(category) {
  if (categoryUtils) {
    try {
      const categoryDoc = await categoryUtils.getCategoryByCode(category);
      return categoryDoc?.mapping?.factorSubCategory || category || 'other';
    } catch (error) {
      console.error('从类别工具模块获取因子子类别失败，回退到硬编码映射:', error);
    }
  }
  // 回退到硬编码映射
  const categoryMap = categoryUtils?.getFallbackCategoryMap() || {
    vegetables: 'vegetable',
    beans: 'bean_product',
    grains: 'grain',
    fruits: 'fruit',
    nuts: 'nut',
    mushrooms: 'mushroom',
    seafood: 'seafood',
    dairy: 'dairy',
    spices: 'spice',
    others: 'other'
  };
  return categoryMap[category] || category || 'other';
}

/**
 * 验证因子区域代码是否有效
 * 如果验证失败，使用默认区域（CN）作为降级策略
 * 
 * @param {string} regionCode - 区域代码（如 'CN', 'US' 等）
 * @returns {Promise<{isValid: boolean, regionCode: string, warning?: string}>} 验证结果和实际使用的区域代码
 */
async function validateRegionCode(regionCode) {
  if (!regionCode) {
    console.warn('区域代码为空，使用默认值CN');
    return { isValid: false, regionCode: 'CN', warning: '区域代码为空，已降级使用默认值CN' };
  }

  try {
    const result = await db.collection('region_configs')
      .where({
        configType: 'factor_region',
        code: regionCode,
        status: 'active'
      })
      .limit(1)
      .get();
    
    if (result.data.length > 0) {
      return { isValid: true, regionCode: regionCode };
    } else {
      // 验证失败，降级使用默认值CN
      console.warn(`区域代码 ${regionCode} 不在区域配置中，已降级使用默认值CN`);
      return { 
        isValid: false, 
        regionCode: 'CN', 
        warning: `区域代码 ${regionCode} 不在区域配置中，已降级使用默认值CN` 
      };
    }
  } catch (error) {
    // 验证过程出错，降级使用默认值CN
    console.error('验证区域代码失败:', error);
    return { 
      isValid: false, 
      regionCode: 'CN', 
      warning: `验证区域代码时出错: ${error.message}，已降级使用默认值CN` 
    };
  }
}

/**
 * 从数据库加载配置到缓存
 */
async function loadConfigs() {
  const now = Date.now();
  
  // 如果缓存有效，直接返回
  if (configCache.lastUpdate && (now - configCache.lastUpdate) < CONFIG_CACHE_TTL) {
    return;
  }
  
  try {
    // 加载所有激活的配置
    const configs = await db.collection('carbon_calculation_configs')
      .where({
        status: 'active'
      })
      .get();
    
    // 重置缓存
    configCache = {
      wasteRates: {},
      energyFactors: {},
      cookingTimes: {},
      cookingPowers: {},
      lastUpdate: now
    };
    
    // 按类型分类
    for (const config of configs.data) {
      if (config.configKey === 'ingredient_waste_rate') {
        configCache.wasteRates[config.category] = config.value;
      } else if (config.configKey === 'default_electric_factor') {
        configCache.energyFactors.electric = config.value;
      } else if (config.configKey === 'default_gas_factor') {
        configCache.energyFactors.gas = config.value;
      } else if (config.configKey === 'standard_time_model') {
        configCache.cookingTimes[config.category] = config.value;
      } else if (config.configKey === 'standard_power_model') {
        configCache.cookingPowers[config.category] = config.value;
      }
    }
  } catch (error) {
    // 加载失败，使用硬编码默认值
    console.error('加载配置失败，使用默认值:', error);
    initDefaultConfigs();
  }
}

/**
 * 获取默认损耗率
 * 根据食材类别返回默认损耗率（从数据库配置读取）
 * @param {string} category - 食材类别
 * @returns {Promise<number>} 损耗率（比例，如0.2表示20%）
 */
async function getDefaultWasteRate(category) {
  // 确保配置已加载
  await loadConfigs();
  
  // 先从缓存查找
  if (category && configCache.wasteRates && configCache.wasteRates[category] !== undefined) {
    return configCache.wasteRates[category];
  }
  
  // 使用默认值（从常量文件读取）
  return DEFAULT_WASTE_RATES[category] || DEFAULT_WASTE_RATES.default;
}

/**
 * 匹配能源因子（电力或天然气）
 * 只使用精确区域匹配，不进行降级策略
 * - 电力因子使用基准值区域（电网区域，如 east_china, north_china 等）
 * - 燃气因子使用因子区域（国家级别，如 CN, US 等）
 * 
 * @param {string} energyType - 能源类型：'electric' | 'gas'
 * @param {string} region - 地区（电力因子使用基准值区域，燃气因子使用因子区域）
 * @returns {Promise<Object|null>} 匹配到的因子对象，或null
 */
async function matchEnergyFactor(energyType, region = null) {
  if (!region) {
    console.warn('能源因子匹配：未指定区域代码，无法匹配');
    return null;
  }

  const subCategory = energyType === 'gas' ? 'natural_gas' : 'electricity';
  
  // 精确区域匹配（仅此一级）
  // 电网区域可以覆盖全国范围，不存在需要降级到国家级别的情况
  const factor = await db.collection('carbon_emission_factors')
    .where({
      category: 'energy',
      subCategory: subCategory,
      region: region,
      status: 'active'
    })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (factor.data.length > 0) {
    const matched = factor.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return {
        ...matched,
        matchLevel: 'exact_region'
      };
    }
  }

  // 精确匹配失败，返回null并记录警告
  console.warn(`能源因子匹配失败：energyType=${energyType}, region=${region}, subCategory=${subCategory}，请添加对应区域的能源因子`);
  return null;
}

/**
 * 匹配材料因子（包装材料）
 * @param {string} materialName - 材料名称（如 'PP塑料', 'PLA', '纸'）
 * @param {string} region - 地区
 * @returns {Promise<Object|null>} 匹配到的因子对象，或null
 */
async function matchMaterialFactor(materialName, region = 'national_average') {
  // 统一使用新格式
  const factorRegion = region || 'national_average';
  
  // Level 1: 精确名称和区域匹配
  let factor = await db.collection('carbon_emission_factors')
    .where({
      category: 'material',
      name: materialName,
      region: factorRegion,
      status: 'active'
    })
    .limit(1)
    .get();

  if (factor.data.length > 0) {
    const matched = factor.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return {
        ...matched,
        matchLevel: 'exact_region'
      };
    }
  }

  // Level 2: 别名匹配
  let aliasMatch = await db.collection('carbon_emission_factors')
    .where({
      category: 'material',
      alias: materialName,
      status: 'active'
    })
    .limit(1)
    .get();

  if (aliasMatch.data.length > 0) {
    const matched = aliasMatch.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return {
        ...matched,
        matchLevel: 'alias_match'
      };
    }
  }

  // Level 3: 模糊匹配（名称包含）
  const allMaterials = await db.collection('carbon_emission_factors')
    .where({
      category: 'material',
      status: 'active'
    })
    .get();

  const matchedMaterials = allMaterials.data.filter(f => {
    if (f.name && f.name.includes(materialName)) return true;
    if (f.alias && Array.isArray(f.alias)) {
      return f.alias.some(alias => 
        alias.includes(materialName) || materialName.includes(alias)
      );
    }
    return false;
  });

  if (matchedMaterials.length > 0) {
    const matched = matchedMaterials[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return {
        ...matched,
        matchLevel: 'fuzzy_match'
      };
    }
  }

  // Level 4: 国家级匹配
  factor = await db.collection('carbon_emission_factors')
    .where({
      category: 'material',
      name: materialName,
      region: 'national_average',
      status: 'active'
    })
    .limit(1)
    .get();

  if (factor.data.length > 0) {
    const matched = factor.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return {
        ...matched,
        matchLevel: 'national_fallback'
      };
    }
  }

  return null;
}

/**
 * 匹配运输因子
 * @param {string} transportMode - 运输方式（如 'truck', 'rail', 'air', 'ship'）
 * @param {string} region - 地区
 * @returns {Promise<Object|null>} 匹配到的因子对象，或null
 */
async function matchTransportFactor(transportMode, region = 'national_average') {
  // 统一使用新格式
  const factorRegion = region || 'national_average';
  
  // Level 1: 精确匹配
  let factor = await db.collection('carbon_emission_factors')
    .where({
      category: 'transport',
      name: transportMode,
      region: factorRegion,
      status: 'active'
    })
    .limit(1)
    .get();

  if (factor.data.length > 0) {
    const matched = factor.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return {
        ...matched,
        matchLevel: 'exact_region'
      };
    }
  }

  // Level 2: 国家级匹配
  factor = await db.collection('carbon_emission_factors')
    .where({
      category: 'transport',
      name: transportMode,
      region: 'national_average',
      status: 'active'
    })
    .limit(1)
    .get();

  if (factor.data.length > 0) {
    const matched = factor.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      return {
        ...matched,
        matchLevel: 'national_fallback'
      };
    }
  }

  return null;
}

/**
 * 根据标准工时模型计算烹饪能耗碳足迹
 * 当无法提供具体功率和时长时，根据烹饪方式使用预设的工时模型
 * @param {string} cookingMethod - 烹饪方式
 * @param {number} cookingTime - 烹饪时间（分钟，可选）
 * @param {string} energyType - 能源类型
 * @param {string} region - 地区（电力因子使用基准值区域，燃气因子使用因子区域）
 * @returns {Promise<number>} 能耗碳足迹（kg CO₂e）
 */
async function calculateEnergyByStandardModel(cookingMethod, cookingTime, energyType, region) {
  // 确保配置已加载
  await loadConfigs();

  // 从缓存获取标准工时模型（分钟）
  const standardTimeModel = configCache.cookingTimes || {
    raw: 0,
    steamed: 15,
    boiled: 20,
    stir_fried: 5,
    fried: 8,
    baked: 45
  };

  // 从缓存获取标准功率模型（kW）
  const standardPowerModel = configCache.cookingPowers || {
    raw: 0,
    steamed: 2.0,
    boiled: 1.5,
    stir_fried: 3.0,
    fried: 5.0,
    baked: 4.0
  };

  // 使用提供的时长或标准工时
  const timeInMinutes = cookingTime || standardTimeModel[cookingMethod] || 10;
  const powerInKW = standardPowerModel[cookingMethod] || 2.0;
  
  // 查询能源因子
  const energyFactor = await matchEnergyFactor(energyType || 'electric', region);
  
  if (energyFactor && energyFactor.factorValue) {
    // 转换为小时
    const timeInHours = timeInMinutes / 60;
    // 电力：kW × h × 因子(kg CO₂e/kWh)
    // 燃气：需要根据功率转换为流量，这里简化处理
    if (energyType === 'gas') {
      // 天然气：假设功率对应流量为 power/10 (m³/h)，这里需要根据实际情况调整
      const gasFlow = powerInKW / 10; // m³/h（简化估算）
      return gasFlow * timeInHours * energyFactor.factorValue;
    } else {
      // 电力
      return powerInKW * timeInHours * energyFactor.factorValue;
    }
  }
  
  // 如果无法查询到因子，使用默认值（从配置缓存读取，如果缓存中没有则使用常量文件中的默认值）
  await loadConfigs();
  
  const defaultElectricFactor = configCache.energyFactors?.electric || DEFAULT_ENERGY_FACTORS.electric;
  const defaultGasFactor = configCache.energyFactors?.gas || DEFAULT_ENERGY_FACTORS.gas;
  
  const timeInHours = timeInMinutes / 60;
  if (energyType === 'gas') {
    const gasFlow = powerInKW / 10;
    return gasFlow * timeInHours * defaultGasFactor;
  } else {
    return powerInKW * timeInHours * defaultElectricFactor;
  }
}

/**
 * 获取碳排放因子（多级匹配算法）
 * 
 * 根据方案文档实现四级匹配策略：
 * Level 1: 精确区域匹配 (Exact Region Match)
 * Level 2: 国家级匹配 (National Fallback)
 * Level 3: 别名/模糊匹配 (Alias/Fuzzy Match)
 * Level 4: 类别兜底 (Category Fallback)
 * 
 * @param {Object} data - 请求数据
 * @param {Array} data.items - 食材列表，每个元素包含 { name, category }
 * @param {string} data.region - 餐厅区域代码（因子区域代码，如 'CN', 'US' 等）
 */
async function getCarbonFactors(data, context) {
  try {
    if (!data.items || !Array.isArray(data.items)) {
      return {
        code: 400,
        message: '缺少必填字段：items（数组）'
      };
    }

    // 如果没有提供区域，使用默认值CN
    const region = data.region || 'CN';

    const results = [];

    for (const item of data.items) {
      const { name, category } = item;
      if (!name) {
        results.push({
          input: name || 'unknown',
          success: false,
          error: '食材名称不能为空'
        });
        continue;
      }

      try {
        const factor = await matchFactor(name, category, region);
        results.push({
          input: name,
          factorId: factor?.factorId || null,
          value: factor?.factorValue || null,
          unit: factor?.unit || null,
          source: factor?.source || null,
          matchLevel: factor?.matchLevel || 'not_found',
          success: factor !== null
        });
      } catch (error) {
        results.push({
          input: name,
          success: false,
          error: error.message,
          matchLevel: 'error'
        });
      }
    }

    return {
      code: 0,
      message: '匹配完成',
      data: {
        results: results
      }
    };
  } catch (error) {
    return {
      code: 500,
      message: '获取因子失败',
      error: error.message
    };
  }
}

/**
 * 匹配因子（多级匹配算法，带缓存机制）
 * @param {string} inputName - 食材名称
 * @param {string} category - 食材类别（可选）
 * @param {string} region - 地区（国家代码，如 'CN', 'US' 等）
 * @returns {Promise<Object|null>} 匹配到的因子对象，或null
 */
async function matchFactor(inputName, category, region = null) {
  if (!inputName) {
    return null;
  }
  
  // 验证区域代码是否在区域配置中存在（带降级策略）
  const regionValidation = await validateRegionCode(region);
  const actualRegion = regionValidation.regionCode;
  
  // 如果验证失败但有降级值，记录警告但继续使用降级值
  if (!regionValidation.isValid && regionValidation.warning) {
    console.warn(`因子匹配区域验证: ${regionValidation.warning}`);
  }
  
  if (!actualRegion) {
    return null;
  }

  // 检查缓存（键为 name+category+region）
  const cacheKey = `${inputName}|${category || ''}|${actualRegion}`;
  const now = Date.now();
  const cachedResult = factorMatchCache.get(cacheKey);
  const cacheTimestamp = factorCacheTimestamps.get(cacheKey);
  
  if (cachedResult !== undefined && cacheTimestamp && (now - cacheTimestamp) < FACTOR_CACHE_TTL) {
    // 缓存命中且未过期
    return cachedResult;
  }
  
  // 缓存未命中或已过期，执行匹配

  // Level 1: 精确区域匹配（使用实际区域代码，可能是降级后的值）
  let factor = await db.collection('carbon_emission_factors')
    .where({
      name: inputName,
      region: actualRegion,
      status: 'active'
    })
    .get();

  let result = null;
  if (factor.data.length > 0) {
    const matched = factor.data[0];
    if (matched.factorValue !== null && matched.factorValue !== undefined) {
      // 设置匹配级别：精确区域匹配
      result = {
        ...matched,
        matchLevel: 'exact_region'
      };
    }
  }

  // Level 2: 别名匹配（优先匹配指定区域的别名，使用实际区域代码）
  if (!result) {
    let aliasMatch = await db.collection('carbon_emission_factors')
      .where({
        alias: inputName,
        region: actualRegion,
        status: 'active'
      })
      .get();

    if (aliasMatch.data.length > 0) {
      const matched = aliasMatch.data[0];
      if (matched.factorValue !== null && matched.factorValue !== undefined) {
        // 设置匹配级别：别名匹配
        result = {
          ...matched,
          matchLevel: 'alias_match'
        };
      }
    }
  }

  // Level 3类别兜底匹配已取消：类别匹配过于粗糙（如vegetable类别包含多种差异很大的蔬菜），
  // 使用orderBy('createdAt', 'desc').limit(1)取最新因子不够准确，可能导致计算结果偏差。
  // 如果Level 1和Level 2都匹配失败，返回null并记录警告，提示用户需要添加具体的因子数据。

  // 如果仍未匹配到，result为null
  
  // 将结果存入缓存（无论是否匹配成功都缓存，避免重复查询）
  factorMatchCache.set(cacheKey, result);
  factorCacheTimestamps.set(cacheKey, now);
  
  // 定期清理过期缓存（使用常量文件中的阈值，避免内存泄漏）
  if (factorMatchCache.size > CACHE_CLEANUP_THRESHOLD) {
    const expiredKeys = [];
    for (const [key, timestamp] of factorCacheTimestamps.entries()) {
      if (now - timestamp >= FACTOR_CACHE_TTL) {
        expiredKeys.push(key);
      }
    }
    expiredKeys.forEach(key => {
      factorMatchCache.delete(key);
      factorCacheTimestamps.delete(key);
    });
  }
  
  return result;
}

/**
 * 批量重新计算菜谱碳足迹
 * 
 * @param {Object} data - 请求数据
 * @param {string} data.restaurantId - 餐厅ID（必填）
 * @param {Array} data.menuItemIds - 菜谱ID列表（可选，不传则计算全部）
 */
async function recalculateMenuItems(data, context) {
  try {
    if (!data.restaurantId) {
      return {
        code: 400,
        message: '缺少必填字段：restaurantId'
      };
    }

    const menuItemsCollection = db.collection('restaurant_menu_items');
    
    // 构建查询条件
    let query = menuItemsCollection.where({
      restaurantId: data.restaurantId
    });

    // 如果指定了菜谱ID列表，则只计算这些菜谱
    if (data.menuItemIds && Array.isArray(data.menuItemIds) && data.menuItemIds.length > 0) {
      query = query.where({
        _id: _.in(data.menuItemIds)
      });
    }

    const menuItems = await query.get();

    if (menuItems.data.length === 0) {
      return {
        code: 0,
        message: '没有需要重新计算的菜谱',
        data: {
          total: 0,
          success: 0,
          failed: 0,
          results: []
        }
      };
    }


    const results = [];
    let successCount = 0;
    let failedCount = 0;

    // 预先获取餐厅信息（避免在循环中重复查询）
    let restaurantData = null;
    try {
      const restaurant = await db.collection('restaurants').doc(data.restaurantId).get();
      restaurantData = restaurant.data;
    } catch (error) {
      // 无法获取餐厅信息，使用默认值
    }

    // 从餐厅信息获取默认配置
    const defaultFactorRegion = restaurantData?.factorRegion || 'CN';
    const defaultBaselineRegion = restaurantData?.region || 'national_average';

    // 逐个重新计算
    for (const menuItem of menuItems.data) {
      try {
        // 获取计算使用的region：优先使用菜单项的restaurantRegion，否则从餐厅信息获取，最后使用默认值
        // 注意：restaurantRegion 是基准值区域代码，因子匹配需要使用 factorRegion
        let calculationRegion = menuItem.restaurantRegion || defaultBaselineRegion; // 用于基准值查询
        let factorRegion = menuItem.factorRegion || defaultFactorRegion; // 用于因子匹配
        
        // 获取食材列表：优先使用菜单项的ingredients，如果为空且有关联菜谱，则从菜谱获取
        let ingredients = menuItem.ingredients || [];
        
        // 如果菜单项的ingredients为空或格式不正确，且有关联的菜谱，尝试从菜谱获取
        if ((!ingredients || ingredients.length === 0) && menuItem.baseRecipeId) {
          try {
            const recipe = await db.collection('recipes').doc(menuItem.baseRecipeId).get();
            if (recipe.data && recipe.data.ingredients) {
              // 将菜谱的ingredients格式转换为菜单项格式
              const recipeIngredients = recipe.data.ingredients;
              if (Array.isArray(recipeIngredients)) {
                ingredients = recipeIngredients.map((ing, index) => {
                  if (typeof ing === 'string') {
                    return {
                      ingredientName: ing,
                      quantity: 100, // 默认值
                      unit: 'g',
                      isMainIngredient: index === 0
                    };
                  } else if (typeof ing === 'object' && ing !== null) {
                    return {
                      ingredientName: ing.name || ing.ingredientName || ing.ingredient || String(ing),
                      quantity: ing.quantity || ing.amount || 100,
                      unit: ing.unit || 'g',
                      isMainIngredient: ing.isMainIngredient !== undefined ? ing.isMainIngredient : (index === 0)
                    };
                  }
                  return {
                    ingredientName: String(ing),
                    quantity: 100,
                    unit: 'g',
                    isMainIngredient: index === 0
                  };
                });
              }
            }
          } catch (error) {
            // 从菜谱获取食材失败，使用菜单项的ingredients
          }
        }
        
        // 调用计算接口（传递所有配置参数）
        // 注意：必须使用菜单项中保存的配置值，如果配置值不存在才使用缺省值（向后兼容）
        const itemCalculationLevel = menuItem.calculationLevel
        const itemMealType = menuItem.mealType
        const itemEnergyType = menuItem.energyType
        const itemCookingMethod = menuItem.cookingMethod
        const itemCookingTime = menuItem.cookingTime
        
        const calculateResult = await calculateMenuItemCarbon({
          restaurantId: data.restaurantId,
          mealType: itemMealType || 'meat_simple', // 使用配置值，缺失时使用缺省值
          energyType: itemEnergyType || 'electric', // 使用配置值，缺失时使用缺省值
          calculationLevel: itemCalculationLevel || 'L2', // 使用配置值，缺失时使用缺省值
          region: calculationRegion, // 基准值区域代码（用于基准值查询）
          factorRegion: factorRegion, // 因子区域代码（用于因子匹配）
          ingredients: ingredients,
          cookingMethod: itemCookingMethod || null, // 可选字段，允许为空
          cookingTime: itemCookingTime || null, // 可选字段，允许为空
          packaging: menuItem.packaging || null
        }, context);

        if (calculateResult.code === 0) {
          // 更新菜谱数据（处理旧格式兼容）
          // 重要：保持原有的配置值（calculationLevel等），不要使用计算结果中的值
          const preservedCalculationLevel = itemCalculationLevel || menuItem.calculationLevel || DEFAULT_CALCULATION_LEVEL
          
          // 处理calculationDetails：确保从null更新为有效对象时能正确写入
          // L1级别不返回calculationDetails（估算级），L2和L3级别返回calculationDetails
          let calculationDetailsToUpdate = null;
          if (calculateResult.data.calculationDetails !== undefined && calculateResult.data.calculationDetails !== null) {
            // 如果计算结果中有calculationDetails，使用它
            calculationDetailsToUpdate = calculateResult.data.calculationDetails;
          } else if (preservedCalculationLevel === 'L2' || preservedCalculationLevel === 'L3') {
            // 如果是L2或L3级别但计算结果中没有calculationDetails，这不应该发生
            // 记录警告，但为了容错，我们保留原有的calculationDetails（如果有）
            console.warn(`[recalculateMenuItems] L${preservedCalculationLevel}级别计算未返回calculationDetails，菜单项ID: ${menuItem._id}`);
            calculationDetailsToUpdate = menuItem.calculationDetails || null;
          } else {
            // L1级别不需要calculationDetails
            calculationDetailsToUpdate = null;
          }
          
          // 调试日志：记录calculationDetails的更新情况
          if (preservedCalculationLevel === 'L2' || preservedCalculationLevel === 'L3') {
            if (calculationDetailsToUpdate) {
              console.log(`[recalculateMenuItems] L${preservedCalculationLevel}级别计算明细已更新，菜单项ID: ${menuItem._id}，ingredients数量: ${calculationDetailsToUpdate.ingredients?.length || 0}，total: ${calculationDetailsToUpdate.total}`);
            } else {
              console.warn(`[recalculateMenuItems] L${preservedCalculationLevel}级别计算明细为null，菜单项ID: ${menuItem._id}`);
            }
          }
          
          const updateData = {
            carbonFootprint: calculateResult.data.carbonFootprint,
            baselineInfo: calculateResult.data.baselineInfo,
            factorMatchInfo: calculateResult.data.factorMatchInfo || [],
            calculationLevel: preservedCalculationLevel, // 保持原有的计算级别
            optimizationFlag: calculateResult.data.optimizationFlag,
            calculatedAt: calculateResult.data.calculatedAt,
            restaurantRegion: menuItem.restaurantRegion || calculationRegion || 'national_average',
            factorRegion: factorRegion // 保存因子区域代码
          };

          // 构建完整的更新数据，包含需要删除的字段
          const finalUpdateData = { ...updateData };
          
          // 处理 baselineInfo 字段：
          // 如果原来的 baselineInfo 是 null，而新的也是 null，则删除该字段
          // 如果原来的 baselineInfo 是 null，而新的是对象，需要分两步更新：先删除，再设置
          let needsTwoStepUpdate = false;
          if (menuItem.baselineInfo === null || menuItem.baselineInfo === undefined) {
            if (calculateResult.data.baselineInfo === null || calculateResult.data.baselineInfo === undefined) {
              // 原来和现在都是 null，删除字段
              finalUpdateData.baselineInfo = _.remove();
            } else {
              // 原来是 null，现在要设置为对象，需要先删除再设置（避免在 null 上创建嵌套字段的错误）
              // 先从更新数据中移除 baselineInfo，我们将分两步更新
              delete finalUpdateData.baselineInfo;
              needsTwoStepUpdate = true;
            }
          } else if (calculateResult.data.baselineInfo === null || calculateResult.data.baselineInfo === undefined) {
            // 原来有值，现在要设置为 null，删除字段
            finalUpdateData.baselineInfo = _.remove();
          }
          // 如果原来和现在都有值，直接覆盖即可（已在 updateData 中设置）
          
          // 如果 carbonFootprint 是数字（旧格式），需要删除该字段
          if (typeof menuItem.carbonFootprint === 'number') {
            finalUpdateData.carbonFootprint = _.remove();
          }
          
          // 处理calculationDetails字段：简化更新逻辑
          // 使用统一的方式处理：如果值存在则设置，如果L1级别或值为null则删除
          if (calculationDetailsToUpdate !== null && calculationDetailsToUpdate !== undefined) {
            // 有值则设置（无论原来是否为null，直接覆盖）
            finalUpdateData.calculationDetails = calculationDetailsToUpdate;
          } else if (preservedCalculationLevel === 'L1') {
            // L1级别不需要calculationDetails，删除该字段
            finalUpdateData.calculationDetails = _.remove();
          }
          // 如果calculationDetailsToUpdate是null且不是L1，不更新该字段（保持原值）

          // 执行更新
          // 如果需要两步更新（原来是 null，现在要设置为对象），先删除字段再设置
          if (needsTwoStepUpdate) {
            // 第一步：先删除 baselineInfo 字段（如果存在）
            await menuItemsCollection.doc(menuItem._id).update({
              data: {
                baselineInfo: _.remove()
              }
            });
            // 第二步：设置 baselineInfo 为新的对象值，同时更新其他字段
            finalUpdateData.baselineInfo = calculateResult.data.baselineInfo;
            await menuItemsCollection.doc(menuItem._id).update({
              data: finalUpdateData
            });
          } else {
            // 正常更新
            await menuItemsCollection.doc(menuItem._id).update({
              data: finalUpdateData
            });
          }

          results.push({
            menuItemId: menuItem._id,
            success: true
          });
          successCount++;
        } else {
          results.push({
            menuItemId: menuItem._id,
            success: false,
            message: calculateResult.message || '计算失败',
            error: calculateResult.error
          });
          failedCount++;
        }
      } catch (error) {
        results.push({
          menuItemId: menuItem._id,
          success: false,
          message: error.message,
          error: error.stack
        });
        failedCount++;
      }
    }

    return {
      code: 0,
      message: '批量重新计算完成',
      data: {
        total: menuItems.data.length,
        success: successCount,
        failed: failedCount,
        results: results
      }
    };
  } catch (error) {
    return {
      code: 500,
      message: '批量重新计算失败',
      error: error.message
    };
  }
}

