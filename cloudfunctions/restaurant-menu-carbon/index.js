const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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

    if (!restaurant.data.region) {
      return {
        code: 400,
        message: '餐厅未定义地区，请先设置餐厅地区'
      };
    }

    const region = restaurant.data.region;

    // 3. 计算菜谱碳足迹值
    const carbonValue = await calculateCarbonFootprint(data);

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

    if (baselineResult.result && baselineResult.result.success) {
      baseline = baselineResult.result.data?.carbonFootprint?.value || 0;
      baselineInfo = {
        baselineId: baselineResult.result.data?.baselineId || null,
        version: baselineResult.result.data?.version || null,
        source: baselineResult.result.data?.source?.organization || null,
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
        baseline = nationalBaselineResult.result.data?.carbonFootprint?.value || 0;
        baselineInfo = {
          baselineId: nationalBaselineResult.result.data?.baselineId || null,
          version: nationalBaselineResult.result.data?.version || null,
          source: nationalBaselineResult.result.data?.source?.organization || '全国平均（备选）',
          queryDate: new Date()
        };
      } else {
        // 仍失败，使用默认值
        console.warn('全国平均基准值查询也失败，使用默认值');
        baseline = getDefaultBaseline(data.mealType);
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

    // 6. 判断是否需要优化
    const needsOptimization = reduction < 0;

    return {
      code: 0,
      message: '计算成功',
      data: {
        carbonFootprint: {
          value: carbonValue.value,
          baseline: baseline,
          reduction: reduction,
          ingredients: carbonValue.ingredients || 0,
          cookingEnergy: carbonValue.cookingEnergy || 0,
          packaging: carbonValue.packaging || 0,
          other: carbonValue.other || 0
        },
        baselineInfo: baselineInfo,
        optimizationFlag: {
          needsOptimization: needsOptimization,
          warningMessage: needsOptimization
            ? '碳减排值为负，建议优化菜谱配方或烹饪方式'
            : null
        },
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
 * 计算菜谱碳足迹值
 * 基于食材、烹饪方式等数据计算
 */
async function calculateCarbonFootprint(data) {
  // TODO: 实现完整的碳足迹计算逻辑
  // 这里先返回一个简化版本，后续需要根据实际需求完善
  
  let ingredientsCarbon = 0;
  let cookingEnergyCarbon = 0;
  let packagingCarbon = 0;
  let otherCarbon = 0;

  // 获取餐厅地区（用于因子匹配）
  let restaurantRegion = 'CN'; // 默认使用全国
  if (data.restaurantId) {
    try {
      const restaurant = await db.collection('restaurants')
        .doc(data.restaurantId)
        .get();
      if (restaurant.data && restaurant.data.region) {
        restaurantRegion = restaurant.data.region;
      }
    } catch (error) {
      console.warn('无法获取餐厅地区，使用默认值CN:', error);
    }
  }

  // 计算食材碳足迹（使用因子库）
  if (data.ingredients && Array.isArray(data.ingredients)) {
    for (const ingredient of data.ingredients) {
      try {
        let ingredientName = ingredient.name;
        let ingredientCategory = ingredient.category || null;

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
          const weight = ingredient.weight || 0; // weight单位应该是kg
          ingredientsCarbon += coefficient * weight;
        } else {
          console.warn(`无法匹配因子: ${ingredientName}，使用默认值0`);
        }
      } catch (error) {
        console.error(`获取食材 ${ingredient.name || ingredient.ingredientId} 的因子失败:`, error);
      }
    }
  }

  // 计算烹饪能耗碳足迹（简化计算）
  if (data.cookingMethod && data.cookingTime) {
    // 根据烹饪方式和时间估算能耗
    const cookingFactors = {
      raw: 0,
      steamed: 0.1,
      boiled: 0.15,
      stir_fried: 0.2,
      fried: 0.3,
      baked: 0.25
    };
    
    const factor = cookingFactors[data.cookingMethod] || 0.15;
    cookingEnergyCarbon = factor * (data.cookingTime || 10) / 60; // 转换为小时
  }

  // 计算包装碳足迹
  if (data.packaging) {
    const packagingFactors = {
      paper: 1.5,
      plastic: 3.0,
      biodegradable: 2.0
    };
    const factor = packagingFactors[data.packaging.type] || 2.0;
    packagingCarbon = factor * (data.packaging.weight || 0);
  }

  const total = ingredientsCarbon + cookingEnergyCarbon + packagingCarbon + otherCarbon;

  return {
    value: total,
    ingredients: ingredientsCarbon,
    cookingEnergy: cookingEnergyCarbon,
    packaging: packagingCarbon,
    other: otherCarbon
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
  // Level 1: 精确区域匹配 (Exact Region Match)
  // 查询条件：name == inputName AND region == restaurantRegion AND status == 'active'
  let factor = await db.collection('carbon_emission_factors')
    .where({
      name: inputName,
      region: restaurantRegion,
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
    const categoryMap = {
      'meat': 'meat',
      'vegetable': 'vegetable',
      'grain': 'grain',
      'fruit': 'fruit',
      'dairy': 'dairy',
      'seafood': 'seafood'
    };

    const mappedCategory = categoryMap[category] || category;

    // 查询该类别下的通用因子（subCategory为'general'或包含'general'）
    const categoryFactor = await db.collection('carbon_emission_factors')
      .where({
        category: 'ingredient',
        subCategory: mappedCategory,
        region: _.or(['CN', restaurantRegion]),
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
        // 调用计算接口
        const calculateResult = await calculateMenuItemCarbon({
          restaurantId: data.restaurantId,
          mealType: menuItem.mealType || 'meat_simple',
          energyType: menuItem.energyType || 'electric',
          ingredients: menuItem.ingredients || [],
          cookingMethod: menuItem.cookingMethod || 'stir_fried',
          cookingTime: menuItem.cookingTime || 10,
          packaging: menuItem.packaging || null
        }, context);

        if (calculateResult.code === 0) {
          // 更新菜谱数据（处理旧格式兼容）
          const updateData = {
            carbonFootprint: calculateResult.data.carbonFootprint,
            baselineInfo: calculateResult.data.baselineInfo,
            optimizationFlag: calculateResult.data.optimizationFlag,
            calculatedAt: calculateResult.data.calculatedAt,
            restaurantRegion: menuItem.restaurantRegion || 'national_average'
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

