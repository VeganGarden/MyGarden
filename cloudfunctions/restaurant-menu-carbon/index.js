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

  // 计算食材碳足迹
  if (data.ingredients && Array.isArray(data.ingredients)) {
    for (const ingredient of data.ingredients) {
      // 从食材数据库获取碳系数
      try {
        const ingredientDoc = await db.collection('ingredients')
          .doc(ingredient.ingredientId)
          .get();
        
        if (ingredientDoc.data && ingredientDoc.data.carbonFootprint) {
          const coefficient = ingredientDoc.data.carbonFootprint.coefficient || 0;
          const weight = ingredient.weight || 0;
          ingredientsCarbon += coefficient * weight;
        }
      } catch (error) {
        console.warn(`无法获取食材 ${ingredient.ingredientId} 的碳系数:`, error);
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

