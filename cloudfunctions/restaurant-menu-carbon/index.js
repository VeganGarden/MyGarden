const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 区域映射工具
 * 将基准值格式的区域代码转换为因子库格式（向后兼容）
 * 同时支持新格式（统一后）和旧格式（兼容）
 */
function normalizeRegionForFactor(region) {
  if (!region) {
    return 'CN'; // 默认使用国家级
  }
  
  // 区域映射表：基准值格式 -> 因子库格式（向后兼容）
  const regionMapping = {
    // 新格式（统一后的基准值格式）
    'national_average': 'CN',
    'north_china': 'CN-North',
    'northeast': 'CN-North', // 东北映射到华北（因子库无独立东北）
    'east_china': 'CN-East',
    'central_china': 'CN-East', // 华中映射到华东（因子库无独立华中）
    'northwest': 'CN-West',
    'south_china': 'CN-South',
    
    // 旧格式（因子库格式，保持不变）
    'CN': 'CN',
    'CN-East': 'CN-East',
    'CN-North': 'CN-North',
    'CN-South': 'CN-South',
    'CN-West': 'CN-West',
    'Global': 'Global',
  };
  
  return regionMapping[region] || 'CN';
}

/**
 * 区域映射（反向）：因子库格式 -> 基准值格式
 * 用于数据迁移和显示
 */
function normalizeRegionForBaseline(region) {
  if (!region) {
    return 'national_average';
  }
  
  const reverseMapping = {
    'CN': 'national_average',
    'CN-East': 'east_china',
    'CN-North': 'north_china',
    'CN-South': 'south_china',
    'CN-West': 'northwest',
    'Global': 'national_average',
    
    // 新格式保持不变
    'national_average': 'national_average',
    'north_china': 'north_china',
    'northeast': 'northeast',
    'east_china': 'east_china',
    'central_china': 'central_china',
    'northwest': 'northwest',
    'south_china': 'south_china',
  };
  
  return reverseMapping[region] || 'national_average';
}

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

  // 餐厅菜谱碳足迹计算云函数

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
    console.error('❌ 云函数执行失败:', error);
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

    // 验证枚举值
    const validMealTypes = ['meat_simple', 'meat_full'];
    const validEnergyTypes = ['electric', 'gas', 'mixed'];
    
    if (!validMealTypes.includes(data.mealType)) {
      return {
        code: 400,
        message: `无效的 mealType: ${data.mealType}，有效值：${validMealTypes.join(', ')}`
      };
    }
    
    if (!validEnergyTypes.includes(data.energyType)) {
      return {
        code: 400,
        message: `无效的 energyType: ${data.energyType}，有效值：${validEnergyTypes.join(', ')}`
      };
    }

    // 2. 获取餐厅信息（获取地区）
    const restaurant = await db.collection('restaurants')
      .doc(data.restaurantId)
      .get();

    if (!restaurant.data) {
      return {
        code: 404,
        message: '餐厅不存在'
      };
    }

    // 优先使用传入的region参数，否则使用餐厅的region
    let region = data.region;
    if (!region) {
      if (!restaurant.data.region) {
        return {
          code: 400,
          message: '餐厅未定义地区，请先设置餐厅地区或菜单项的适用区域'
        };
      }
      region = restaurant.data.region;
    }

    // 3. 计算菜谱碳足迹值（根据计算级别）
    const calculationLevel = data.calculationLevel || 'L2';
    let carbonValue;
    
    if (calculationLevel === 'L1') {
      // L1级别：基于品类基准值直接映射
      carbonValue = await calculateCarbonFootprintL1(data, region);
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
      carbonValue = await calculateCarbonFootprint(data);
    } else if (calculationLevel === 'L3') {
      // L3级别：动态BOM + 智能电表实测 + 溯源因子
      carbonValue = await calculateCarbonFootprintL3(data, region);
    } else {
      // 默认使用L2级别
      carbonValue = await calculateCarbonFootprint(data);
    }
    
    // 设置计算级别
    carbonValue.calculationLevel = calculationLevel;

    // 4. 查询基准值
    const baselineResult = await cloud.callFunction({
      name: 'carbon-baseline-query',
      data: {
        mealType: data.mealType,
        region: region,
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
        // 如果没有置信区间信息，使用默认的不确定性（10%）
        baselineUncertainty = baseline * 0.1;
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
      console.warn('基准值查询失败，尝试使用全国平均基准值');
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
          baselineUncertainty = baseline * 0.1;
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
        console.warn('全国平均基准值查询也失败，使用默认值');
        baseline = getDefaultBaseline(data.mealType);
        baselineUncertainty = baseline * 0.1;
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
        optimizationFlag: {
          needsOptimization: needsOptimization,
          warningMessage: warningMessage
        },
        // 基于置信区间的减排认定级别（low: 显著减排, medium: 行业达标, high: 高碳排放）
        carbonLevel: carbonLevel,
        calculationLevel: carbonValue.calculationLevel || 'L2', // 标识计算级别
        calculatedAt: new Date()
      }
    };
  } catch (error) {
    console.error('计算菜谱碳足迹失败:', error);
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
 */
async function calculateCarbonFootprint(data) {
  let ingredientsCarbon = 0;
  let cookingEnergyCarbon = 0;
  let packagingCarbon = 0;
  let transportCarbon = 0;
  
  // 用于记录因子匹配信息
  const factorMatchInfo = [];

          // 获取餐厅地区（用于因子匹配）
  // 优先使用传入的region参数，否则从餐厅信息获取，最后使用默认值
  let restaurantRegion = 'CN'; // 默认使用全国
  if (data.region) {
    restaurantRegion = data.region;
  } else if (data.restaurantId) {
    try {
      const restaurant = await db.collection('restaurants')
        .doc(data.restaurantId)
        .get();
      if (restaurant.data && restaurant.data.region) {
        restaurantRegion = restaurant.data.region;
      }
    } catch (error) {
      // 无法获取餐厅地区，使用默认值CN
    }
  }

  // 1. 计算食材碳足迹（使用因子库）
  if (data.ingredients && Array.isArray(data.ingredients)) {
    for (const ingredient of data.ingredients) {
      try {
        let ingredientName = ingredient.name;
        let ingredientCategory = ingredient.category || null;
        const ingredientWeight = ingredient.weight || 0; // weight单位应该是kg
        const wasteRate = ingredient.wasteRate || getDefaultWasteRate(ingredientCategory); // 损耗率，默认值根据类别

        // 如果没有名称，从ingredients集合获取
        if (!ingredientName && ingredient.ingredientId) {
          const ingredientDoc = await db.collection('ingredients')
            .doc(ingredient.ingredientId)
            .get();
          
          if (ingredientDoc.data) {
            ingredientName = ingredientDoc.data.name;
            if (!ingredientCategory && ingredientDoc.data.category) {
              ingredientCategory = ingredientDoc.data.category;
            }
          }
        }

        if (!ingredientName) {
          console.warn(`食材缺少名称，跳过: ${ingredient.ingredientId || 'unknown'}`);
          continue;
        }

        // 从因子库查询因子
        const factor = await matchFactor(ingredientName, ingredientCategory, restaurantRegion);
        
        if (factor && factor.factorValue !== null && factor.factorValue !== undefined) {
          const coefficient = factor.factorValue;
          // 考虑损耗率：CF = M × EF × (1 + W)
          const carbon = coefficient * ingredientWeight * (1 + wasteRate);
          ingredientsCarbon += carbon;
          
          // 记录因子匹配信息
          factorMatchInfo.push({
            ingredientName: ingredientName,
            ingredientCategory: ingredientCategory,
            weight: ingredientWeight,
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
            carbonFootprint: carbon
          });
        } else {
          console.warn(`无法匹配因子: ${ingredientName}，使用默认值0`);
          factorMatchInfo.push({
            ingredientName: ingredientName,
            ingredientCategory: ingredientCategory,
            weight: ingredientWeight,
            wasteRate: wasteRate,
            matchedFactor: null,
            carbonFootprint: 0,
            warning: '因子匹配失败，未计算碳足迹'
          });
        }
      } catch (error) {
        console.error(`获取食材 ${ingredient.name || ingredient.ingredientId} 的因子失败:`, error);
      }
    }
  }

  // 2. 计算烹饪能耗碳足迹（从因子库查询）
  if (data.cookingMethod && (data.cookingTime || data.energyType)) {
    try {
      // 如果提供了具体能耗数据（功率和时长）
      if (data.power && data.cookingTime) {
        // 使用配置的能源类型（如果缺失则使用缺省值，用于向后兼容）
        const energyType = data.energyType || 'electric';
        const energyFactor = await matchEnergyFactor(energyType, restaurantRegion);
        
        if (energyFactor && energyFactor.factorValue) {
          // 单位转换：功率(kW) × 时长(h) × 因子(kg CO₂e/kWh 或 kg CO₂e/m³)
          const energyConsumption = data.power * (data.cookingTime / 60); // 转换为小时
          cookingEnergyCarbon = energyConsumption * energyFactor.factorValue;
        } else {
          console.warn(`无法匹配${energyType}能耗因子，使用默认计算`);
          // 降级使用标准工时模型
          cookingEnergyCarbon = await calculateEnergyByStandardModel(data.cookingMethod, data.cookingTime, data.energyType, restaurantRegion);
        }
      } else {
        // 使用标准工时模型（根据烹饪方式估算）
        cookingEnergyCarbon = await calculateEnergyByStandardModel(data.cookingMethod, data.cookingTime, data.energyType, restaurantRegion);
      }
    } catch (error) {
      console.error('计算烹饪能耗碳足迹失败:', error);
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
        const materialFactor = await matchMaterialFactor(materialName, restaurantRegion);
        
        if (materialFactor && materialFactor.factorValue) {
          packagingCarbon += materialFactor.factorValue * materialWeight;
        } else {
          console.warn(`无法匹配包装材料因子: ${materialName}`);
        }
      }
    } catch (error) {
      console.error('计算包装碳足迹失败:', error);
    }
  }

  // 4. 计算运输碳排放（可选，根据数据源决定）
  // 如果提供了运输信息，则计算运输碳排放
  if (data.transport && data.transport.distance && data.transport.mode) {
    try {
      const transportFactor = await matchTransportFactor(data.transport.mode, restaurantRegion);
      
      if (transportFactor && transportFactor.factorValue) {
        // 运输碳排放 = 距离(km) × 因子(kg CO₂e/km·kg) × 重量(kg)
        const transportWeight = data.transport.weight || 1; // 默认1kg
        transportCarbon = data.transport.distance * transportFactor.factorValue * transportWeight;
      }
    } catch (error) {
      console.error('计算运输碳排放失败:', error);
    }
  }

  const total = ingredientsCarbon + cookingEnergyCarbon + packagingCarbon + transportCarbon;

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
    factorMatchInfo: factorMatchInfo
  };
}

/**
 * 获取默认基准值
 */
function getDefaultBaseline(mealType) {
  // 默认基准值（kg CO₂e）
  const defaultBaselines = {
    meat_simple: 5.0,  // 肉食简餐
    meat_full: 7.5     // 肉食正餐
  };
  return defaultBaselines[mealType] || 5.0;
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
        mealType: data.mealType || 'meat_simple',
        region: region || 'national_average',
        energyType: data.energyType || 'electric'
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
        baselineUncertainty = estimatedValue * 0.1;
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
      console.warn('L1基准值查询失败，尝试使用全国平均基准值');
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
          baselineUncertainty = estimatedValue * 0.1;
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
        baselineUncertainty = estimatedValue * 0.1;
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
        note: 'L1估算级：直接使用基准值作为估算',
        baselineInfo: baselineInfo
      }],
      baselineInfo: baselineInfo,
      calculationLevel: 'L1',
      isEstimated: true // 标识为估算值
    };
  } catch (error) {
    console.error('L1级别计算失败:', error);
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
    // L3级别基于L2级别的计算逻辑，但使用实测数据
    // 1. 如果提供了实测能耗数据（meterReading），使用实测值
    let actualEnergyCarbon = 0;
    if (data.meterReading && data.meterReading.energyConsumption) {
      // 使用实测能耗数据
      const energyType = data.energyType || 'electric';
      const energyFactor = await matchEnergyFactor(energyType, region);
      
      if (energyFactor && energyFactor.factorValue) {
        // 实测能耗（kWh或m³）
        const actualConsumption = data.meterReading.energyConsumption;
        actualEnergyCarbon = actualConsumption * energyFactor.factorValue;
      }
    }

    // 2. 计算食材碳足迹（使用动态BOM，支持实时重量输入）
    // L3级别对食材的处理与L2相同，但会记录更详细的溯源信息
    let ingredientsCarbon = 0;
    const factorMatchInfo = [];
    
    if (data.ingredients && Array.isArray(data.ingredients)) {
      for (const ingredient of data.ingredients) {
        try {
          const ingredientName = ingredient.name;
          const ingredientCategory = ingredient.category || null;
          const ingredientWeight = ingredient.weight || 0; // 动态BOM：实时重量
          const wasteRate = ingredient.wasteRate || getDefaultWasteRate(ingredientCategory);
          
          // 支持溯源信息
          const traceabilityInfo = ingredient.traceability || null; // 溯源信息

          if (!ingredientName) {
            continue;
          }

          const factor = await matchFactor(ingredientName, ingredientCategory, region);
          
          if (factor && factor.factorValue !== null && factor.factorValue !== undefined) {
            const coefficient = factor.factorValue;
            const carbon = coefficient * ingredientWeight * (1 + wasteRate);
            ingredientsCarbon += carbon;
            
            // L3级别记录详细的因子匹配信息和溯源信息
            factorMatchInfo.push({
              ingredientName: ingredientName,
              ingredientCategory: ingredientCategory,
              weight: ingredientWeight,
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
          console.error(`L3获取食材因子失败 ${ingredient.name}:`, error);
        }
      }
    }

    // 3. 如果没有实测能耗，使用标准计算（但标记为L3级别）
    let cookingEnergyCarbon = actualEnergyCarbon;
    if (actualEnergyCarbon === 0) {
      // 降级使用标准计算
      if (data.cookingMethod && (data.cookingTime || data.energyType)) {
        cookingEnergyCarbon = await calculateEnergyByStandardModel(
          data.cookingMethod, 
          data.cookingTime, 
          data.energyType, 
          region
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
          
          const materialFactor = await matchMaterialFactor(materialName, region);
          
          if (materialFactor && materialFactor.factorValue) {
            packagingCarbon += materialFactor.factorValue * materialWeight;
          }
        }
      } catch (error) {
        console.error('L3计算包装碳足迹失败:', error);
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
          // 降级使用因子库查询
          transportFactor = await matchTransportFactor(data.transport.mode, region);
        }
        
        if (transportFactor && transportFactor.factorValue) {
          const transportWeight = data.transport.weight || 1;
          transportCarbon = data.transport.distance * transportFactor.factorValue * transportWeight;
        }
      } catch (error) {
        console.error('L3计算运输碳排放失败:', error);
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
      console.error('L3记录审计日志失败:', error);
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
      calculationLevel: 'L3',
      hasMeterReading: actualEnergyCarbon > 0, // 标识是否使用了实测能耗
      isAuditable: true // L3级别具备审计级别
    };
  } catch (error) {
    console.error('L3级别计算失败:', error);
    // L3级别计算失败，抛出错误（不降级，因为L3需要高精度）
    throw new Error(`L3级别计算失败: ${error.message}`);
  }
}

/**
 * 获取默认损耗率
 * 根据食材类别返回默认损耗率
 * @param {string} category - 食材类别
 * @returns {number} 损耗率（比例，如0.2表示20%）
 */
function getDefaultWasteRate(category) {
  // 行业经验值损耗率
  const defaultWasteRates = {
    // 蔬菜类
    vegetables: 0.20,    // 叶菜类 20%
    vegetable: 0.20,
    leafy: 0.20,
    // 肉类
    meat: 0.05,          // 肉类 5%
    // 海鲜
    seafood: 0.15,       // 海鲜 15%
    // 干货
    grains: 0.0,         // 谷物 0%
    grain: 0.0,
    nuts: 0.0,           // 坚果 0%
    spices: 0.0,         // 调料 0%
    // 其他
    others: 0.10,        // 其他 10%
    other: 0.10
  };
  
  if (category && defaultWasteRates[category]) {
    return defaultWasteRates[category];
  }
  
  // 默认值
  return 0.10; // 10%
}

/**
 * 匹配能源因子（电力或天然气）
 * @param {string} energyType - 能源类型：'electric' | 'gas'
 * @param {string} region - 地区
 * @returns {Promise<Object|null>} 匹配到的因子对象，或null
 */
async function matchEnergyFactor(energyType, region = 'CN') {
  const subCategory = energyType === 'gas' ? 'natural_gas' : 'electricity';
  const name = energyType === 'gas' ? '天然气' : '电力';
  
  // 将基准值格式的区域转换为因子库格式（向后兼容）
  const factorRegion = normalizeRegionForFactor(region);
  
  // Level 1: 精确区域匹配
  let factor = await db.collection('carbon_emission_factors')
    .where({
      category: 'energy',
      subCategory: subCategory,
      region: factorRegion,
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

  // Level 2: 名称匹配（如果因子库中有具体名称）
  factor = await db.collection('carbon_emission_factors')
    .where({
      category: 'energy',
      name: name,
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
        matchLevel: 'name_match'
      };
    }
  }

  // Level 3: 国家级匹配
  factor = await db.collection('carbon_emission_factors')
    .where({
      category: 'energy',
      subCategory: subCategory,
      region: 'CN',
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
        matchLevel: 'national_fallback'
      };
    }
  }

  return null;
}

/**
 * 匹配材料因子（包装材料）
 * @param {string} materialName - 材料名称（如 'PP塑料', 'PLA', '纸'）
 * @param {string} region - 地区
 * @returns {Promise<Object|null>} 匹配到的因子对象，或null
 */
async function matchMaterialFactor(materialName, region = 'CN') {
  // 将基准值格式的区域转换为因子库格式（向后兼容）
  const factorRegion = normalizeRegionForFactor(region);
  
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
      region: 'CN',
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
async function matchTransportFactor(transportMode, region = 'CN') {
  // 将基准值格式的区域转换为因子库格式（向后兼容）
  const factorRegion = normalizeRegionForFactor(region);
  
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
      region: 'CN',
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
 * @param {string} region - 地区
 * @returns {Promise<number>} 能耗碳足迹（kg CO₂e）
 */
async function calculateEnergyByStandardModel(cookingMethod, cookingTime, energyType, region) {
  // 标准工时模型（分钟）
  const standardTimeModel = {
    raw: 0,           // 生食：0分钟
    steamed: 15,      // 蒸：15分钟
    boiled: 20,       // 煮：20分钟
    stir_fried: 5,    // 炒：5分钟
    fried: 8,         // 炸：8分钟
    baked: 45         // 烤：45分钟
  };

  // 标准功率模型（kW，根据烹饪方式）
  const standardPowerModel = {
    raw: 0,
    steamed: 2.0,     // 蒸锅：2kW
    boiled: 1.5,      // 煮锅：1.5kW
    stir_fried: 3.0,  // 炒锅：3kW
    fried: 5.0,       // 炸锅：5kW
    baked: 4.0        // 烤箱：4kW
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
  
  // 如果无法查询到因子，使用默认值（降级处理）
  console.warn('无法查询能耗因子，使用默认值计算');
  const defaultElectricFactor = 0.5703; // 2022年全国电网平均排放因子 (kg CO₂e/kWh)
  const defaultGasFactor = 2.16; // IPCC 天然气因子 (kg CO₂e/m³)
  
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
 * @param {string} data.region - 餐厅区域代码，如 "CN-East", "CN"
 */
async function getCarbonFactors(data, context) {
  try {
    if (!data.items || !Array.isArray(data.items)) {
      return {
        code: 400,
        message: '缺少必填字段：items（数组）'
      };
    }

    if (!data.region) {
      return {
        code: 400,
        message: '缺少必填字段：region'
      };
    }

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
        const factor = await matchFactor(name, category, data.region);
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
        console.error(`匹配因子失败 ${name}:`, error);
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
    console.error('获取碳排放因子失败:', error);
    return {
      code: 500,
      message: '获取因子失败',
      error: error.message
    };
  }
}

/**
 * 匹配因子（多级匹配算法）
 */
async function matchFactor(inputName, category, restaurantRegion) {
  // 将基准值格式的区域转换为因子库格式（向后兼容）
  const factorRegion = normalizeRegionForFactor(restaurantRegion);
  
  // Level 1: 精确区域匹配 (Exact Region Match)
  // 查询条件：name == inputName AND region == factorRegion AND status == 'active'
  let factor = await db.collection('carbon_emission_factors')
    .where({
      name: inputName,
      region: factorRegion,
      status: 'active'
    })
    .get();

  if (factor.data.length > 0) {
    return {
      ...factor.data[0],
      matchLevel: 'exact_region'
    };
  }

  // Level 2: 国家级匹配 (National Fallback)
  // 查询条件：name == inputName AND region == "CN" AND status == 'active'
  factor = await db.collection('carbon_emission_factors')
    .where({
      name: inputName,
      region: 'CN',
      status: 'active'
    })
    .get();

  if (factor.data.length > 0) {
    return {
      ...factor.data[0],
      matchLevel: 'national_fallback'
    };
  }

  // Level 3: 别名/模糊匹配 (Alias/Fuzzy Match)
  // 查询条件：alias contains inputName AND status == 'active'
  // MongoDB中数组字段包含查询，使用where({alias: inputName})即可
  let aliasMatch = await db.collection('carbon_emission_factors')
    .where({
      alias: inputName,
      status: 'active'
    })
    .get();

  // 如果精确匹配失败，尝试模糊匹配（使用正则）
  if (aliasMatch.data.length === 0) {
    // 获取所有活跃因子，在内存中匹配别名
    const allActiveFactors = await db.collection('carbon_emission_factors')
      .where({
        status: 'active',
        category: category ? 'ingredient' : _.neq(null) // 如果提供了category，只查ingredient类别
      })
      .get();

    const matchedFactors = allActiveFactors.data.filter(factor => {
      if (!factor.alias || !Array.isArray(factor.alias)) return false;
      return factor.alias.some(alias => {
        const aliasLower = alias.toLowerCase();
        const inputLower = inputName.toLowerCase();
        return aliasLower.includes(inputLower) || inputLower.includes(aliasLower);
      });
    });

    if (matchedFactors.length > 0) {
      // 找到最精确的匹配（完全匹配优先）
      const exactMatch = matchedFactors.find(f => 
        f.alias.some(alias => alias.toLowerCase() === inputName.toLowerCase())
      );
      
      return {
        ...(exactMatch || matchedFactors[0]),
        matchLevel: 'alias_fuzzy_match'
      };
    }
  } else {
    return {
      ...aliasMatch.data[0],
      matchLevel: 'alias_fuzzy_match'
    };
  }

  // Level 4: 类别兜底 (Category Fallback)
  // 根据品类使用行业通用平均值
  if (category) {
    // 映射ingredients的category到因子库的subCategory
    const categoryMap = {
      vegetables: 'vegetable',
      vegetable: 'vegetable',
      beans: 'bean_product',
      bean_product: 'bean_product',
      grains: 'grain',
      grain: 'grain',
      fruits: 'fruit',
      fruit: 'fruit',
      nuts: 'nut',
      nut: 'nut',
      mushrooms: 'mushroom',
      mushroom: 'mushroom',
      seafood: 'seafood',
      dairy: 'dairy',
      spices: 'spice',
      spice: 'spice',
      others: 'other',
      other: 'other',
      meat: 'meat'
    };

    const mappedCategory = categoryMap[category] || category;

    // 查询该类别下的通用因子（subCategory为'general'或包含'general'）
    const categoryFactor = await db.collection('carbon_emission_factors')
      .where({
        category: 'ingredient',
        subCategory: mappedCategory,
        region: _.or(['CN', factorRegion]),
        status: 'active'
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (categoryFactor.data.length > 0) {
      return {
        ...categoryFactor.data[0],
        matchLevel: 'category_fallback'
      };
    }
  }

  // 如果所有级别都未匹配到，返回null
  return null;
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

    // 逐个重新计算
    for (const menuItem of menuItems.data) {
      try {
        // 获取计算使用的region：优先使用菜单项的restaurantRegion，否则从餐厅信息获取
        let calculationRegion = menuItem.restaurantRegion;
        if (!calculationRegion) {
          try {
            const restaurant = await db.collection('restaurants').doc(data.restaurantId).get();
            if (restaurant.data && restaurant.data.region) {
              calculationRegion = restaurant.data.region;
            }
          } catch (error) {
            // 无法获取餐厅地区，使用默认值
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
          region: calculationRegion || 'national_average', // 使用配置值，缺失时使用缺省值
          ingredients: menuItem.ingredients || [],
          cookingMethod: itemCookingMethod || null, // 可选字段，允许为空
          cookingTime: itemCookingTime || null, // 可选字段，允许为空
          packaging: menuItem.packaging || null
        }, context);

        if (calculateResult.code === 0) {
          // 更新菜谱数据（处理旧格式兼容）
          // 重要：保持原有的配置值（calculationLevel等），不要使用计算结果中的值
          const preservedCalculationLevel = itemCalculationLevel || menuItem.calculationLevel || 'L2'
          const updateData = {
            carbonFootprint: calculateResult.data.carbonFootprint,
            baselineInfo: calculateResult.data.baselineInfo,
            factorMatchInfo: calculateResult.data.factorMatchInfo || [],
            calculationLevel: preservedCalculationLevel, // 保持原有的计算级别
            optimizationFlag: calculateResult.data.optimizationFlag,
            calculatedAt: calculateResult.data.calculatedAt,
            restaurantRegion: menuItem.restaurantRegion || calculationRegion || 'national_average'
          };

          // 如果 baselineInfo 是 null，先删除再设置
          if (menuItem.baselineInfo === null) {
            await menuItemsCollection.doc(menuItem._id).update({
              data: {
                baselineInfo: _.remove()
              }
            });
          }

          // 如果 carbonFootprint 是数字（旧格式），先删除再设置
          if (typeof menuItem.carbonFootprint === 'number') {
            await menuItemsCollection.doc(menuItem._id).update({
              data: {
                carbonFootprint: _.remove()
              }
            });
          }

          await menuItemsCollection.doc(menuItem._id).update({
            data: updateData
          });

          results.push({
            menuItemId: menuItem._id,
            success: true
          });
          successCount++;
        } else {
          console.error(`菜谱 ${menuItem._id} 计算失败:`, calculateResult.message, calculateResult.error);
          results.push({
            menuItemId: menuItem._id,
            success: false,
            message: calculateResult.message || '计算失败',
            error: calculateResult.error
          });
          failedCount++;
        }
      } catch (error) {
        console.error(`重新计算菜谱 ${menuItem._id} 失败:`, error);
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
    console.error('批量重新计算失败:', error);
    return {
      code: 500,
      message: '批量重新计算失败',
      error: error.message
    };
  }
}

