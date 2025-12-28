/**
 * 菜单同步处理模块
 * 
 * 功能：
 * 1. 推送菜单数据到收银系统
 * 2. 调用适配器转换数据格式
 * 3. 处理同步结果
 */

const { logSuccess, logError } = require('./logging');
const { getAdapter } = require('./adapters');

// 引入碳等级配置工具
const {
  determineCarbonLevel: determineCarbonLevelByThreshold
} = require('./carbon-level-config');

/**
 * 推送菜单数据到收银系统
 * @param {Object} data - 请求数据
 * @param {Object} integrationConfig - 收银系统配置
 * @param {Object} db - 数据库实例
 * @param {Object} cloud - 云服务实例
 * @returns {Promise<Object>} 响应结果
 */
async function pushMenu(data, integrationConfig, db, cloud) {
  const startTime = Date.now();
  const _ = db.command;

  try {
    const { restaurantId, syncType, menuItemIds } = data;

    // 1. 参数验证
    if (!restaurantId) {
      return {
        code: 400,
        message: '缺少必填参数: restaurantId'
      };
    }

    if (!syncType || !['full', 'incremental'].includes(syncType)) {
      return {
        code: 400,
        message: 'syncType必须是 full 或 incremental'
      };
    }

    // 2. 查询菜单数据
    const menuItemsCollection = db.collection('restaurant_menu_items');
    // 统一使用 isAvailable 字段，只同步上架的菜品
    let query = menuItemsCollection.where({
      restaurantId: restaurantId,
    });

    // 如果指定了菜单项ID列表，则只同步这些菜单项
    if (menuItemIds && Array.isArray(menuItemIds) && menuItemIds.length > 0) {
      query = query.where({
        _id: _.in(menuItemIds)
      });
    }

    const menuItemsResult = await query.get();
    let menuItems = menuItemsResult.data || [];
    
    // 在代码中过滤：只保留上架的菜单项
    // 统一使用 isAvailable 字段（存储在 availability.isAvailable 或顶层 isAvailable）
    menuItems = menuItems.filter(item => {
      // 优先使用顶层 isAvailable 字段
      if (item.isAvailable !== undefined) {
        return item.isAvailable !== false; // 默认为 true（上架）
      }
      // 使用 availability.isAvailable
      if (item.availability && item.availability.isAvailable !== undefined) {
        return item.availability.isAvailable !== false;
      }
      // 如果都不存在，默认返回 true（上架）
      return true;
    });

    if (menuItems.length === 0) {
      return {
        code: 0,
        message: '没有需要同步的菜单项',
        data: {
          syncId: generateSyncId(),
          totalCount: 0,
          successCount: 0,
          failedCount: 0,
          failedItems: [],
          syncAt: new Date().toISOString()
        }
      };
    }

    // 3. 转换菜单数据格式
    const formattedMenuItems = await Promise.all(menuItems.map(item => formatMenuItem(item)));

    // 4. 获取适配器
    const adapter = getAdapter(integrationConfig.posSystem);
    if (!adapter) {
      return {
        code: 500,
        message: `不支持的收银系统类型: ${integrationConfig.posSystem}`
      };
    }

    // 5. 调用适配器推送数据到收银系统
    const syncResult = await adapter.pushMenu({
      restaurantId,
      syncType,
      menuItems: formattedMenuItems
    }, integrationConfig);

    // 6. 记录同步结果
    const duration = Date.now() - startTime;
    const syncId = generateSyncId();

    if (syncResult.success) {
      await logSuccess({
        action: 'pushMenu',
        restaurantId,
        posSystem: integrationConfig.posSystem,
        requestData: {
          syncType,
          menuItemCount: formattedMenuItems.length
        },
        responseData: syncResult,
        duration
      }, db);
    } else {
      await logError({
        action: 'pushMenu',
        restaurantId,
        posSystem: integrationConfig.posSystem,
        requestData: {
          syncType,
          menuItemCount: formattedMenuItems.length
        },
        error: syncResult.error || '推送失败',
        duration
      }, db);
    }

    // 7. 返回响应
    return {
      code: syncResult.success ? 0 : 500,
      message: syncResult.success ? '同步成功' : syncResult.error || '同步失败',
      data: {
        syncId,
        totalCount: formattedMenuItems.length,
        successCount: syncResult.successCount || formattedMenuItems.length,
        failedCount: syncResult.failedCount || 0,
        failedItems: syncResult.failedItems || [],
        syncAt: new Date().toISOString()
      }
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    await logError({
      action: 'pushMenu',
      restaurantId: data && data.restaurantId ? data.restaurantId : undefined,
      posSystem: integrationConfig && integrationConfig.posSystem ? integrationConfig.posSystem : undefined,
      error: error.message,
      stack: error.stack,
      duration
    }, db);

    return {
      code: 500,
      message: '菜单同步失败',
      error: error.message
    };
  }
}

/**
 * 格式化菜单项数据
 * @param {Object} menuItem - 数据库中的菜单项
 * @returns {Promise<Object>} 格式化后的菜单项
 */
async function formatMenuItem(menuItem) {
  return {
    itemId: menuItem._id || menuItem.itemId,
    itemName: menuItem.name || menuItem.itemName,
    category: menuItem.category || '其他',
    price: menuItem.price || 0,
    unit: menuItem.unit || '份',
    // 统一使用 isAvailable 字段判断状态
    status: (() => {
      // 优先使用顶层 isAvailable 字段
      if (menuItem.isAvailable !== undefined) {
        return menuItem.isAvailable !== false ? 'active' : 'inactive';
      }
      // 使用 availability.isAvailable
      if (menuItem.availability && menuItem.availability.isAvailable !== undefined) {
        return menuItem.availability.isAvailable !== false ? 'active' : 'inactive';
      }
      // 如果都不存在，默认返回 active（上架）
      return 'active';
    })(),
    description: menuItem.description || null,
    imageUrl: menuItem.imageUrl || menuItem.image || null,
    ingredients: (menuItem.ingredients || []).map(ing => ({
      ingredientName: ing.ingredientName || ing.name || ing.ingredient,
      quantity: ing.quantity || ing.amount || 0,
      unit: ing.unit || 'g'
    })),
    cookingMethod: menuItem.cookingMethod || null,
    carbonFootprint: formatCarbonFootprint(menuItem.carbonFootprint),
    carbonLabel: await formatCarbonLabel(menuItem.carbonFootprint),
    updatedAt: (menuItem.updatedAt || menuItem.calculatedAt || new Date()).toISOString()
  };
}

/**
 * 格式化碳足迹数据
 * @param {Object} carbonFootprint - 碳足迹数据
 * @returns {Object} 格式化后的碳足迹数据
 */
function formatCarbonFootprint(carbonFootprint) {
  if (!carbonFootprint || typeof carbonFootprint !== 'object') {
    return null;
  }

  // 兼容新旧格式
  const value = carbonFootprint.value || carbonFootprint.carbonFootprint || 0;
  const baseline = carbonFootprint.baseline || (carbonFootprint.baselineInfo && carbonFootprint.baselineInfo.value ? carbonFootprint.baselineInfo.value : 0) || 0;
  const reduction = baseline - value;

  return {
    value: value,
    unit: 'kg CO₂e',
    calculationLevel: carbonFootprint.calculationLevel || 'L2',
    baseline: baseline,
    reduction: Math.max(0, reduction),
    carbonLevel: carbonFootprint.carbonLevel || determineCarbonLevel(value, baseline),
    certification: carbonFootprint.certification || null,
    calculatedAt: (carbonFootprint.calculatedAt || new Date()).toISOString()
  };
}

/**
 * 格式化碳标签数据
 * @param {Object} carbonFootprint - 碳足迹数据
 * @returns {Promise<Object>} 碳标签数据
 */
async function formatCarbonLabel(carbonFootprint) {
  if (!carbonFootprint) {
    return null;
  }

  let carbonLevel;
  try {
    // 优先使用配置中的绝对阈值判断
    if (carbonFootprint.value !== undefined && carbonFootprint.value !== null) {
      const level = await determineCarbonLevelByThreshold(carbonFootprint.value);
      // 将配置格式（ultra_low）转换为代码格式（ultraLow或low）
      const levelMap = {
        'ultra_low': 'low',
        'low': 'low',
        'medium': 'medium',
        'high': 'high'
      };
      carbonLevel = levelMap[level] || 'medium';
    } else if (carbonFootprint.carbonLevel) {
      // 如果已有碳等级，直接使用
      carbonLevel = carbonFootprint.carbonLevel;
    } else {
      // 回退到基于基准值的相对判断（兼容旧逻辑）
      carbonLevel = determineCarbonLevelByBaseline(
        carbonFootprint.value || 0,
        carbonFootprint.baseline || 0
      );
    }
  } catch (error) {
    console.error('碳等级配置读取失败，使用回退逻辑:', error);
    // 配置读取失败时，使用基于基准值的回退逻辑
    carbonLevel = determineCarbonLevelByBaseline(
      carbonFootprint.value || 0,
      carbonFootprint.baseline || 0
    );
  }

  return {
    level: carbonLevel,
    icon: getCarbonLabelIcon(carbonLevel),
    description: getCarbonLabelDescription(carbonLevel),
    qrCode: null // 后续可生成二维码
  };
}

/**
 * 确定碳等级（基于基准值的相对判断，作为回退逻辑）
 * @param {number} value - 碳足迹值
 * @param {number} baseline - 基准值
 * @returns {string} 碳等级: low/medium/high
 */
function determineCarbonLevelByBaseline(value, baseline) {
  if (!baseline || baseline === 0) {
    return 'medium';
  }

  const ratio = value / baseline;
  if (ratio < 0.8) {
    return 'low'; // 显著减排
  } else if (ratio > 1.2) {
    return 'high'; // 高碳排放
  } else {
    return 'medium'; // 行业达标
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
    low: '低碳排放菜品',
    medium: '行业达标菜品',
    high: '建议优化菜品'
  };
  return descMap[level] || descMap.medium;
}

/**
 * 生成同步ID
 * @returns {string} 同步ID
 */
function generateSyncId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `sync_${timestamp}_${random}`;
}

module.exports = {
  pushMenu
};

