const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 数据库迁移脚本 - 批量重新计算现有菜谱碳足迹
 * 
 * 功能：
 * 1. 查询所有已有 mealType 和 energyType 的菜谱
 * 2. 按餐厅分组，批量重新计算碳足迹
 * 3. 更新菜谱的碳足迹数据（value、baseline、reduction）
 * 
 * 执行方式：
 * 在 database 云函数中调用：{ action: 'migrate-recalculate-carbon-v1' }
 * 
 * 可选参数：
 * - restaurantId: 指定餐厅ID，只计算该餐厅的菜谱
 * - batchSize: 每批处理的菜谱数量（默认：50）
 */
exports.main = async (event) => {
  // 批量重新计算菜谱碳足迹

  const { restaurantId, batchSize = 50 } = event.data || {};

  const results = {
    totalRestaurants: 0,
    totalMenuItems: 0,
    successCount: 0,
    failedCount: 0,
    restaurantResults: []
  };

  try {
    // 1. 获取需要重新计算的菜谱
    const menuItems = await getMenuItemsToRecalculate(restaurantId);
    
    if (menuItems.length === 0) {
      return {
        code: 0,
        message: '没有需要重新计算的菜谱',
        results: results
      };
    }

    // 2. 按餐厅分组
    const menuItemsByRestaurant = groupByRestaurant(menuItems);
    const restaurantIds = Array.from(menuItemsByRestaurant.keys());
    results.totalRestaurants = restaurantIds.length;
    results.totalMenuItems = menuItems.length;

    // 3. 逐个餐厅批量重新计算
    
    for (const restaurantId of restaurantIds) {
      const restaurantMenuItems = menuItemsByRestaurant.get(restaurantId);

      try {
        // 分批处理，避免超时
        const batches = chunkArray(restaurantMenuItems, batchSize);
        let restaurantSuccess = 0;
        let restaurantFailed = 0;

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const menuItemIds = batch.map(item => item._id);

          // 调用批量重新计算接口
          const recalculateResult = await cloud.callFunction({
            name: 'restaurant-menu-carbon',
            data: {
              action: 'recalculateMenuItems',
              data: {
                restaurantId: restaurantId,
                menuItemIds: menuItemIds
              }
            }
          });

          if (recalculateResult.result && recalculateResult.result.code === 0) {
            const batchResult = recalculateResult.result.data;
            restaurantSuccess += batchResult.success || 0;
            restaurantFailed += batchResult.failed || 0;
            results.successCount += batchResult.success || 0;
            results.failedCount += batchResult.failed || 0;
          } else {
            // 如果批量计算失败，尝试逐个计算
            for (const menuItem of batch) {
              try {
                const singleResult = await recalculateSingleMenuItem(restaurantId, menuItem);
                if (singleResult.success) {
                  restaurantSuccess++;
                  results.successCount++;
                } else {
                  restaurantFailed++;
                  results.failedCount++;
                }
              } catch (error) {
                console.error(`      菜谱 ${menuItem._id} 计算失败:`, error.message);
                restaurantFailed++;
                results.failedCount++;
              }
            }
          }

          // 添加延迟，避免请求过快
          if (i < batches.length - 1) {
            await sleep(1000); // 等待1秒
          }
        }

        results.restaurantResults.push({
          restaurantId: restaurantId,
          total: restaurantMenuItems.length,
          success: restaurantSuccess,
          failed: restaurantFailed
        });
      } catch (error) {
        console.error(`  ❌ 餐厅 ${restaurantId} 处理失败:`, error);
        results.restaurantResults.push({
          restaurantId: restaurantId,
          total: restaurantMenuItems.length,
          success: 0,
          failed: restaurantMenuItems.length,
          error: error.message
        });
        results.failedCount += restaurantMenuItems.length;
      }
    }


    return {
      code: 0,
      message: '批量重新计算完成',
      results: results
    };
  } catch (error) {
    console.error('❌ 批量重新计算失败:', error);
    return {
      code: 500,
      message: '批量重新计算失败',
      error: error.message,
      results: results
    };
  }
};

/**
 * 获取需要重新计算的菜谱
 */
async function getMenuItemsToRecalculate(restaurantId) {
  const menuItemsCollection = db.collection('restaurant_menu_items');
  
  let query = menuItemsCollection.where({
    mealType: _.exists(true),
    energyType: _.exists(true)
  });

  if (restaurantId) {
    query = query.where({
      restaurantId: restaurantId
    });
  }

  const result = await query.get();
  return result.data || [];
}

/**
 * 按餐厅分组菜谱
 */
function groupByRestaurant(menuItems) {
  const map = new Map();
  
  for (const menuItem of menuItems) {
    const restaurantId = menuItem.restaurantId;
    if (!map.has(restaurantId)) {
      map.set(restaurantId, []);
    }
    map.get(restaurantId).push(menuItem);
  }
  
  return map;
}

/**
 * 将数组分块
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 重新计算单个菜谱
 */
async function recalculateSingleMenuItem(restaurantId, menuItem) {
  try {
    const calculateResult = await cloud.callFunction({
      name: 'restaurant-menu-carbon',
      data: {
        action: 'calculateMenuItemCarbon',
        data: {
          restaurantId: restaurantId,
          mealType: menuItem.mealType || 'meat_simple',
          energyType: menuItem.energyType || 'electric',
          ingredients: menuItem.ingredients || [],
          cookingMethod: menuItem.cookingMethod || 'stir_fried',
          cookingTime: menuItem.cookingTime || 10,
          packaging: menuItem.packaging || null
        }
      }
    });

    if (calculateResult.result && calculateResult.result.code === 0) {
      // 更新菜谱数据
      await db.collection('restaurant_menu_items').doc(menuItem._id).update({
        data: {
          carbonFootprint: calculateResult.result.data.carbonFootprint,
          baselineInfo: calculateResult.result.data.baselineInfo,
          optimizationFlag: calculateResult.result.data.optimizationFlag,
          calculatedAt: calculateResult.result.data.calculatedAt,
          restaurantRegion: menuItem.restaurantRegion || 'national_average'
        }
      });

      return { success: true };
    } else {
      return {
        success: false,
        message: calculateResult.result?.message || '计算失败'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


