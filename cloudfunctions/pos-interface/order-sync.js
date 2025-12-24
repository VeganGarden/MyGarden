/**
 * 订单同步处理模块
 * 
 * 功能：
 * 1. 接收收银系统订单数据
 * 2. 计算订单碳足迹
 * 3. 返回计算结果给收银系统
 * 4. 批量订单同步
 */

const { logSuccess, logError } = require('./logging');
const { sendWebhook } = require('./webhook');

/**
 * 同步订单数据（收银系统 → 气候餐厅平台）
 * @param {Object} data - 请求数据
 * @param {Object} integrationConfig - 收银系统配置
 * @param {Object} db - 数据库实例
 * @param {Object} cloud - 云服务实例
 * @returns {Promise<Object>} 响应结果
 */
async function syncOrder(data, integrationConfig, db, cloud) {
  const startTime = Date.now();
  const _ = db.command;

  try {
    const { orderId, restaurantId, orderTime, items, totalAmount, customerInfo, orderType } = data;

    // 1. 参数验证
    if (!orderId) {
      return {
        code: 400,
        message: '缺少必填参数: orderId'
      };
    }

    if (!restaurantId) {
      return {
        code: 400,
        message: '缺少必填参数: restaurantId'
      };
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return {
        code: 400,
        message: '缺少必填参数: items（订单项列表）'
      };
    }

    // 2. 检查订单是否已处理过（防重复）
    const ordersCollection = db.collection('restaurant_orders');
    const existingOrder = await ordersCollection
      .where({
        orderId: orderId,
        restaurantId: restaurantId
      })
      .limit(1)
      .get();

    if (existingOrder.data.length > 0) {
      // 订单已存在，返回已有结果
      const order = existingOrder.data[0];
      if (order.carbonImpact) {
        return {
          code: 0,
          message: '订单已处理过',
          data: formatOrderResponse(order, items)
        };
      }
    }

    // 3. 查询菜单项碳足迹数据
    const menuItemsCollection = db.collection('restaurant_menu_items');
    const menuItemIds = items.map(item => item.menuItemId).filter(Boolean);
    
    const menuItemsResult = await menuItemIds.length > 0 
      ? await menuItemsCollection.where({
          restaurantId: restaurantId,
          _id: _.in(menuItemIds)
        }).get()
      : { data: [] };

    const menuItemsMap = {};
    menuItemsResult.data.forEach(item => {
      menuItemsMap[item._id] = item;
    });

    // 4. 计算订单碳足迹
    let totalCarbonFootprint = 0;
    const itemCarbonData = [];

    for (const orderItem of items) {
      const menuItemId = orderItem.menuItemId;
      const quantity = orderItem.quantity || 1;
      const menuItem = menuItemsMap[menuItemId];

      if (menuItem && menuItem.carbonFootprint) {
        const itemCarbon = menuItem.carbonFootprint.value || 0;
        const itemTotalCarbon = itemCarbon * quantity;
        totalCarbonFootprint += itemTotalCarbon;

        itemCarbonData.push({
          menuItemId: menuItemId,
          itemName: orderItem.itemName,
          quantity: quantity,
          carbonFootprint: itemTotalCarbon,
          carbonLabel: formatCarbonLabel(menuItem.carbonFootprint)
        });
      } else {
        // 如果没有碳足迹数据，跳过该项（或使用默认值）
        itemCarbonData.push({
          menuItemId: menuItemId,
          itemName: orderItem.itemName,
          quantity: quantity,
          carbonFootprint: 0,
          warning: '菜单项碳足迹数据不存在'
        });
      }
    }

    // 5. 查询基准值（用于计算减排量）
    let baseline = 0;
    let carbonReduction = 0;
    let carbonLevel = 'medium';

    try {
      // 获取餐厅信息以确定基准值查询参数
      const restaurantsCollection = db.collection('restaurants');
      const restaurantResult = await restaurantsCollection.doc(restaurantId).get();
      
      const restaurant = restaurantResult.data;
      const mealType = items.length <= 2 ? 'meat_simple' : 'meat_full';
      const region = restaurant?.region || 'national_average';
      const energyType = restaurant?.energyType || 'electric';

      // 调用基准值查询云函数
      const baselineResult = await cloud.callFunction({
        name: 'carbon-baseline-query',
        data: {
          mealType: mealType,
          region: region,
          energyType: energyType
        }
      });

      if (baselineResult.result && baselineResult.result.success) {
        baseline = baselineResult.result.data.carbonFootprint.value || 0;
        carbonReduction = Math.max(0, baseline - totalCarbonFootprint);
        carbonLevel = determineCarbonLevel(totalCarbonFootprint, baseline);
      }
    } catch (error) {
      console.error('查询基准值失败:', error);
      // 基准值查询失败不影响订单处理，继续使用0作为默认值
    }

    // 6. 构建订单数据
    const orderData = {
      orderId: orderId,
      restaurantId: restaurantId,
      orderTime: orderTime ? new Date(orderTime) : new Date(),
      items: items,
      totalAmount: totalAmount || 0,
      customerInfo: customerInfo || null,
      orderType: orderType || 'dine_in',
      carbonImpact: {
        totalCarbonFootprint: totalCarbonFootprint,
        unit: 'kg CO₂e',
        baseline: baseline,
        carbonReduction: carbonReduction,
        reductionPercent: baseline > 0 ? ((carbonReduction / baseline) * 100).toFixed(1) : 0,
        carbonLevel: carbonLevel
      },
      syncedAt: new Date(),
      syncedFrom: 'pos_system',
      posSystem: integrationConfig.posSystem
    };

    // 7. 保存订单数据
    if (existingOrder.data.length > 0) {
      // 更新已有订单
      await ordersCollection.doc(existingOrder.data[0]._id).update({
        data: orderData
      });
    } else {
      // 创建新订单
      await ordersCollection.add({
        data: orderData
      });
    }

    // 8. 构建响应数据
    const responseData = {
      orderId: orderId,
      carbonImpact: orderData.carbonImpact,
      items: itemCarbonData,
      processedAt: new Date().toISOString()
    };

    // 9. 记录日志
    const duration = Date.now() - startTime;
    await logSuccess({
      action: 'syncOrder',
      restaurantId,
      posSystem: integrationConfig.posSystem,
      requestData: {
        orderId,
        itemCount: items.length
      },
      responseData: {
        carbonFootprint: totalCarbonFootprint
      },
      duration
    }, db);

    // 10. 发送Webhook通知（异步，不阻塞响应）
    sendWebhook({
      event: 'order.carbon.calculated',
      restaurantId,
      data: {
        orderId,
        carbonFootprint: totalCarbonFootprint,
        carbonLevel,
        status: 'success'
      }
    }, integrationConfig, db).catch(err => {
      console.error('发送Webhook失败:', err);
    });

    // 11. 返回响应
    return {
      code: 0,
      message: '订单处理成功',
      data: responseData
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    await logError({
      action: 'syncOrder',
      restaurantId: data?.restaurantId,
      posSystem: integrationConfig?.posSystem,
      requestData: {
        orderId: data?.orderId
      },
      error: error.message,
      stack: error.stack,
      duration
    }, db);

    return {
      code: 500,
      message: '订单同步失败',
      error: error.message
    };
  }
}

/**
 * 批量同步订单数据
 * @param {Object} data - 请求数据
 * @param {Object} integrationConfig - 收银系统配置
 * @param {Object} db - 数据库实例
 * @param {Object} cloud - 云服务实例
 * @returns {Promise<Object>} 响应结果
 */
async function batchSyncOrders(data, integrationConfig, db, cloud) {
  const startTime = Date.now();

  try {
    const { restaurantId, orders, batchId } = data;

    // 1. 参数验证
    if (!restaurantId) {
      return {
        code: 400,
        message: '缺少必填参数: restaurantId'
      };
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return {
        code: 400,
        message: '缺少必填参数: orders（订单列表）'
      };
    }

    // 限制批量数量
    if (orders.length > 100) {
      return {
        code: 400,
        message: '批量订单数量不能超过100条'
      };
    }

    // 2. 批量处理订单
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const orderData of orders) {
      try {
        const result = await syncOrder({
          ...orderData,
          restaurantId: restaurantId
        }, integrationConfig, db, cloud);

        if (result.code === 0) {
          successCount++;
          results.push({
            orderId: orderData.orderId,
            status: 'success',
            carbonFootprint: result.data?.carbonImpact?.totalCarbonFootprint || 0
          });
        } else {
          failedCount++;
          results.push({
            orderId: orderData.orderId,
            status: 'failed',
            reason: result.message || '处理失败'
          });
        }
      } catch (error) {
        failedCount++;
        results.push({
          orderId: orderData.orderId,
          status: 'failed',
          reason: error.message
        });
      }
    }

    // 3. 记录日志
    const duration = Date.now() - startTime;
    await logSuccess({
      action: 'batchSyncOrders',
      restaurantId,
      posSystem: integrationConfig.posSystem,
      requestData: {
        batchId,
        orderCount: orders.length
      },
      responseData: {
        successCount,
        failedCount
      },
      duration
    }, db);

    // 4. 返回响应
    return {
      code: 0,
      message: '批量同步完成',
      data: {
        batchId: batchId || generateBatchId(),
        totalCount: orders.length,
        successCount: successCount,
        failedCount: failedCount,
        results: results,
        processedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    await logError({
      action: 'batchSyncOrders',
      restaurantId: data?.restaurantId,
      posSystem: integrationConfig?.posSystem,
      error: error.message,
      stack: error.stack,
      duration
    }, db);

    return {
      code: 500,
      message: '批量同步失败',
      error: error.message
    };
  }
}

/**
 * 格式化订单响应数据
 * @param {Object} order - 订单数据
 * @param {Array} items - 订单项列表
 * @returns {Object} 格式化后的响应数据
 */
function formatOrderResponse(order, items) {
  const itemCarbonData = (items || []).map(item => ({
    menuItemId: item.menuItemId,
    carbonFootprint: 0, // 可以从order数据中获取
    carbonLabel: null
  }));

  return {
    orderId: order.orderId,
    carbonImpact: order.carbonImpact || {
      totalCarbonFootprint: 0,
      unit: 'kg CO₂e',
      baseline: 0,
      carbonReduction: 0,
      reductionPercent: 0,
      carbonLevel: 'medium'
    },
    items: itemCarbonData,
    processedAt: order.syncedAt ? new Date(order.syncedAt).toISOString() : new Date().toISOString()
  };
}

/**
 * 格式化碳标签数据
 * @param {Object} carbonFootprint - 碳足迹数据
 * @returns {Object} 碳标签数据
 */
function formatCarbonLabel(carbonFootprint) {
  if (!carbonFootprint) {
    return null;
  }

  const level = carbonFootprint.carbonLevel || 'medium';
  return {
    level: level,
    icon: getCarbonLabelIcon(level),
    description: getCarbonLabelDescription(level)
  };
}

/**
 * 确定碳等级
 * @param {number} value - 碳足迹值
 * @param {number} baseline - 基准值
 * @returns {string} 碳等级
 */
function determineCarbonLevel(value, baseline) {
  if (!baseline || baseline === 0) {
    return 'medium';
  }

  const ratio = value / baseline;
  if (ratio < 0.8) {
    return 'low';
  } else if (ratio > 1.2) {
    return 'high';
  } else {
    return 'medium';
  }
}

/**
 * 获取碳标签图标URL
 * @param {string} level - 碳等级
 * @returns {string} 图标URL
 */
function getCarbonLabelIcon(level) {
  const iconMap = {
    low: 'https://cdn.climate-restaurant.com/labels/low-carbon.png',
    medium: 'https://cdn.climate-restaurant.com/labels/medium-carbon.png',
    high: 'https://cdn.climate-restaurant.com/labels/high-carbon.png'
  };
  return iconMap[level] || iconMap.medium;
}

/**
 * 获取碳标签描述
 * @param {string} level - 碳等级
 * @returns {string} 描述文本
 */
function getCarbonLabelDescription(level) {
  const descMap = {
    low: '低碳排放',
    medium: '行业达标',
    high: '建议优化'
  };
  return descMap[level] || descMap.medium;
}

/**
 * 生成批次ID
 * @returns {string} 批次ID
 */
function generateBatchId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `batch_${timestamp}_${random}`;
}

module.exports = {
  syncOrder,
  batchSyncOrders
};

