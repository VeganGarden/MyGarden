const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 菜单环保信息标签查询云函数
 * 
 * 支持的 actions:
 * - getMenuItemCarbonLabel: 获取单个菜单项的碳标签信息
 * - getMenuItemsCarbonLabels: 批量获取菜单项的碳标签信息
 * - getOrderCarbonLabel: 获取订单的碳足迹标签信息
 * - getMenuDisplayConfig: 获取餐厅的菜单展示配置
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      case 'getMenuItemCarbonLabel':
        return await getMenuItemCarbonLabel(data, context);
      case 'getMenuItemsCarbonLabels':
        return await getMenuItemsCarbonLabels(data, context);
      case 'getOrderCarbonLabel':
        return await getOrderCarbonLabel(data, context);
      case 'getMenuDisplayConfig':
        return await getMenuDisplayConfig(data, context);
      default:
        return {
          code: 400,
          message: `未知的 action: ${action}`,
          requestId: context.requestId
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      code: 500,
      message: '云函数执行失败',
      error: error.message,
      requestId: context.requestId
    };
  }
};

/**
 * 获取单个菜单项的碳标签信息
 * 
 * @param {Object} data - 请求数据
 * @param {string} data.restaurantId - 餐厅ID（必填）
 * @param {string} data.menuItemId - 菜单项ID（必填）
 * @param {string} data.media - 媒介类型（可选）
 * @param {string} data.language - 语言代码（可选，默认zh_CN）
 */
async function getMenuItemCarbonLabel(data, context) {
  try {
    const { restaurantId, menuItemId, media = 'basic', language = 'zh_CN' } = data;

    if (!restaurantId || !menuItemId) {
      return {
        code: 400,
        message: '缺少必填字段：restaurantId、menuItemId'
      };
    }

    // 1. 获取菜单项信息
    const menuItemDoc = await db.collection('restaurant_menu_items')
      .doc(menuItemId)
      .get();

    if (!menuItemDoc.data) {
      return {
        code: 404,
        message: '菜单项不存在'
      };
    }

    const menuItem = menuItemDoc.data;

    // 验证餐厅ID是否匹配
    if (menuItem.restaurantId !== restaurantId) {
      return {
        code: 403,
        message: '菜单项不属于该餐厅'
      };
    }

    // 2. 获取餐厅配置
    const config = await getRestaurantConfig(restaurantId, media);

    // 3. 获取碳足迹数据
    const carbonFootprint = menuItem.carbonFootprint || {};
    const carbonLevel = menuItem.carbonLevel || carbonFootprint.carbonLevel || 'medium';

    // 4. 生成标签信息（根据配置格式化）
    const carbonLabel = formatCarbonLabel(carbonFootprint, carbonLevel, config, media, language);

    // 5. 生成展示建议
    const displaySuggestion = generateDisplaySuggestion(carbonLevel, carbonFootprint, config);

    return {
      code: 0,
      message: '成功',
      data: {
        menuItemId: menuItemId,
        itemName: menuItem.name || menuItem.itemName,
        category: menuItem.category,
        price: menuItem.price,
        carbonLabel: carbonLabel,
        displaySuggestion: displaySuggestion
      },
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取菜单标签失败:', error);
    return {
      code: 500,
      message: '获取菜单标签失败',
      error: error.message
    };
  }
}

/**
 * 批量获取菜单项的碳标签信息
 * 
 * @param {Object} data - 请求数据
 * @param {string} data.restaurantId - 餐厅ID（必填）
 * @param {Array} data.menuItemIds - 菜单项ID列表（可选）
 * @param {string} data.media - 媒介类型（可选）
 * @param {string} data.language - 语言代码（可选）
 * @param {Object} data.filter - 筛选条件（可选）
 * @param {Object} data.sort - 排序条件（可选）
 * @param {number} data.page - 页码（可选，默认1）
 * @param {number} data.pageSize - 每页数量（可选，默认20）
 */
async function getMenuItemsCarbonLabels(data, context) {
  try {
    const {
      restaurantId,
      menuItemIds,
      media = 'basic',
      language = 'zh_CN',
      filter = {},
      sort = {},
      page = 1,
      pageSize = 20
    } = data;

    if (!restaurantId) {
      return {
        code: 400,
        message: '缺少必填字段：restaurantId'
      };
    }

    // 1. 构建查询条件
    let query = db.collection('restaurant_menu_items')
      .where({
        restaurantId: restaurantId
      });

    // 如果指定了菜单项ID列表
    if (menuItemIds && Array.isArray(menuItemIds) && menuItemIds.length > 0) {
      query = query.where({
        _id: _.in(menuItemIds)
      });
    }

    // 应用筛选条件
    if (filter.carbonLevel) {
      query = query.where({
        carbonLevel: filter.carbonLevel
      });
    }

    if (filter.category) {
      query = query.where({
        category: filter.category
      });
    }

    // 应用排序
    if (sort.field) {
      const order = sort.order === 'desc' ? 'desc' : 'asc';
      if (sort.field === 'carbonFootprint') {
        query = query.orderBy('carbonFootprint.value', order);
      } else if (sort.field === 'reductionPercent') {
        query = query.orderBy('carbonFootprint.reductionPercent', order);
      } else if (sort.field === 'price') {
        query = query.orderBy('price', order);
      }
    } else {
      // 默认排序
      query = query.orderBy('createdAt', 'desc');
    }

    // 分页
    const skip = (page - 1) * pageSize;
    query = query.skip(skip).limit(pageSize);

    // 2. 执行查询
    const result = await query.get();
    const menuItems = result.data;

    // 3. 获取餐厅配置
    const config = await getRestaurantConfig(restaurantId, media);

    // 4. 格式化标签信息
    const items = menuItems.map(menuItem => {
      const carbonFootprint = menuItem.carbonFootprint || {};
      const carbonLevel = menuItem.carbonLevel || carbonFootprint.carbonLevel || 'medium';
      const carbonLabel = formatCarbonLabel(carbonFootprint, carbonLevel, config, media, language);
      const displaySuggestion = generateDisplaySuggestion(carbonLevel, carbonFootprint, config);

      return {
        menuItemId: menuItem._id,
        itemName: menuItem.name || menuItem.itemName,
        category: menuItem.category,
        price: menuItem.price,
        carbonLabel: carbonLabel,
        displaySuggestion: displaySuggestion
      };
    });

    // 5. 统计信息
    const totalResult = await db.collection('restaurant_menu_items')
      .where({
        restaurantId: restaurantId
      })
      .count();

    const totalCount = totalResult.total;
    
    // 统计各碳等级数量
    const lowCarbonResult = await db.collection('restaurant_menu_items')
      .where({
        restaurantId: restaurantId,
        carbonLevel: 'low'
      })
      .count();
    
    const mediumCarbonResult = await db.collection('restaurant_menu_items')
      .where({
        restaurantId: restaurantId,
        carbonLevel: 'medium'
      })
      .count();
    
    const highCarbonResult = await db.collection('restaurant_menu_items')
      .where({
        restaurantId: restaurantId,
        carbonLevel: 'high'
      })
      .count();

    return {
      code: 0,
      message: '成功',
      data: {
        items: items,
        summary: {
          totalCount: totalCount,
          lowCarbonCount: lowCarbonResult.total,
          mediumCarbonCount: mediumCarbonResult.total,
          highCarbonCount: highCarbonResult.total,
          currentPage: page,
          pageSize: pageSize,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      },
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取菜单列表标签失败:', error);
    return {
      code: 500,
      message: '获取菜单列表标签失败',
      error: error.message
    };
  }
}

/**
 * 获取订单的碳足迹标签信息
 * 
 * @param {Object} data - 请求数据
 * @param {string} data.orderId - 订单ID（必填）
 * @param {string} data.media - 媒介类型（可选，默认receipt）
 * @param {string} data.language - 语言代码（可选，默认zh_CN）
 */
async function getOrderCarbonLabel(data, context) {
  try {
    const { orderId, media = 'receipt', language = 'zh_CN' } = data;

    if (!orderId) {
      return {
        code: 400,
        message: '缺少必填字段：orderId'
      };
    }

    // 1. 获取订单信息
    const orderDoc = await db.collection('restaurant_orders')
      .doc(orderId)
      .get();

    if (!orderDoc.data) {
      return {
        code: 404,
        message: '订单不存在'
      };
    }

    const order = orderDoc.data;
    const restaurantId = order.restaurantId;

    // 2. 获取餐厅配置
    const config = await getRestaurantConfig(restaurantId, media);

    // 3. 计算订单碳足迹
    let totalCarbonFootprint = 0;
    let totalBaseline = 0;
    const items = [];

    if (order.items && Array.isArray(order.items)) {
      for (const orderItem of order.items) {
        const menuItemId = orderItem.menuItemId || orderItem.id;
        const quantity = orderItem.quantity || 1;

        // 获取菜单项信息
        const menuItemDoc = await db.collection('restaurant_menu_items')
          .doc(menuItemId)
          .get();

        if (menuItemDoc.data) {
          const menuItem = menuItemDoc.data;
          const carbonFootprint = menuItem.carbonFootprint || {};
          const carbonValue = carbonFootprint.value || 0;
          const baseline = carbonFootprint.baseline || 0;

          totalCarbonFootprint += carbonValue * quantity;
          totalBaseline += baseline * quantity;

          const carbonLevel = menuItem.carbonLevel || carbonFootprint.carbonLevel || 'medium';
          const carbonLabel = formatCarbonLabel(carbonFootprint, carbonLevel, config, media, language);

          items.push({
            menuItemId: menuItemId,
            itemName: menuItem.name || menuItem.itemName,
            quantity: quantity,
            carbonLabel: carbonLabel
          });
        }
      }
    }

    // 4. 计算减排信息
    const carbonReduction = totalBaseline - totalCarbonFootprint;
    const reductionPercent = totalBaseline > 0 ? (carbonReduction / totalBaseline) * 100 : 0;

    // 5. 确定订单碳等级
    const carbonLevel = determineCarbonLevel(totalCarbonFootprint, totalBaseline);

    // 6. 格式化展示文本
    const textConfig = config.textConfig[language] || config.textConfig.zh_CN;
    const displayText = {
      summary: `${textConfig.carbonFootprint}：${totalCarbonFootprint.toFixed(2)} ${textConfig.unit}`,
      reduction: `相比基准${textConfig.reduction}：${carbonReduction.toFixed(2)} ${textConfig.unit}（${reductionPercent.toFixed(1)}%）`,
      message: textConfig.messages.thankYou
    };

    return {
      code: 0,
      message: '成功',
      data: {
        orderId: orderId,
        restaurantId: restaurantId,
        orderTime: order.createdAt || order.orderTime,
        totalAmount: order.totalAmount || 0,
        carbonImpact: {
          totalCarbonFootprint: totalCarbonFootprint,
          unit: textConfig.unit,
          baseline: totalBaseline,
          carbonReduction: carbonReduction,
          reductionPercent: reductionPercent,
          carbonLevel: carbonLevel
        },
        displayText: displayText,
        items: items
      },
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取订单标签失败:', error);
    return {
      code: 500,
      message: '获取订单标签失败',
      error: error.message
    };
  }
}

/**
 * 获取餐厅的菜单展示配置
 * 
 * @param {Object} data - 请求数据
 * @param {string} data.restaurantId - 餐厅ID（必填）
 * @param {number} data.version - 配置版本号（可选）
 */
async function getMenuDisplayConfig(data, context) {
  try {
    const { restaurantId, version } = data;

    if (!restaurantId) {
      return {
        code: 400,
        message: '缺少必填字段：restaurantId'
      };
    }

    // 构建查询条件
    let query = db.collection('restaurant_menu_display_configs')
      .where({
        restaurantId: restaurantId,
        status: 'active'
      });

    // 如果指定了版本号
    if (version) {
      query = query.where({
        version: version
      });
    }

    // 按版本号降序排列，获取最新版本
    query = query.orderBy('version', 'desc').limit(1);

    const result = await query.get();

    if (result.data.length === 0) {
      // 返回默认配置
      return {
        code: 0,
        message: '成功（使用默认配置）',
        data: {
          restaurantId: restaurantId,
          globalConfig: getDefaultGlobalConfig(),
          mediaConfig: getDefaultMediaConfig(),
          styleConfig: getDefaultStyleConfig(),
          features: getDefaultFeatures(),
          textConfig: getDefaultTextConfig(),
          version: 0,
          status: 'default',
          updatedAt: new Date().toISOString()
        },
        requestId: context.requestId,
        timestamp: new Date().toISOString()
      };
    }

    const config = result.data[0];

    return {
      code: 0,
      message: '成功',
      data: {
        restaurantId: restaurantId,
        globalConfig: config.globalConfig,
        mediaConfig: config.mediaConfig,
        styleConfig: config.styleConfig,
        features: config.features,
        textConfig: config.textConfig,
        version: config.version,
        status: config.status,
        updatedAt: config.updatedAt
      },
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取配置失败:', error);
    return {
      code: 500,
      message: '获取配置失败',
      error: error.message
    };
  }
}

/**
 * 获取餐厅配置（带缓存）
 */
let configCache = {};
const CONFIG_CACHE_TTL = 60 * 60 * 1000; // 1小时

async function getRestaurantConfig(restaurantId, media) {
  const cacheKey = `${restaurantId}_${media}`;
  const now = Date.now();

  // 检查缓存
  if (configCache[cacheKey] && (now - configCache[cacheKey].timestamp) < CONFIG_CACHE_TTL) {
    return configCache[cacheKey].config;
  }

  // 查询配置
  const result = await db.collection('restaurant_menu_display_configs')
    .where({
      restaurantId: restaurantId,
      status: 'active'
    })
    .orderBy('version', 'desc')
    .limit(1)
    .get();

  let config;
  if (result.data.length > 0) {
    config = result.data[0];
  } else {
    // 使用默认配置
    config = {
      globalConfig: getDefaultGlobalConfig(),
      mediaConfig: getDefaultMediaConfig(),
      styleConfig: getDefaultStyleConfig(),
      features: getDefaultFeatures(),
      textConfig: getDefaultTextConfig()
    };
  }

  // 合并媒介配置（媒介配置覆盖全局配置）
  const mediaConfig = config.mediaConfig[media] || {};
  const mergedConfig = {
    ...config,
    currentMediaConfig: {
      displayLevel: mediaConfig.displayLevel || config.globalConfig.defaultDisplayLevel,
      showContent: {
        ...getDefaultShowContent(),
        ...mediaConfig.showContent
      }
    }
  };

  // 更新缓存
  configCache[cacheKey] = {
    config: mergedConfig,
    timestamp: now
  };

  return mergedConfig;
}

/**
 * 格式化碳标签（根据配置）
 */
function formatCarbonLabel(carbonFootprint, carbonLevel, config, media, language) {
  const textConfig = config.textConfig[language] || config.textConfig.zh_CN;
  const mediaConfig = config.currentMediaConfig || {};
  const showContent = mediaConfig.showContent || {};

  // 图标信息
  const icon = {
    url: getCarbonLabelIconUrl(carbonLevel, config.styleConfig.iconSize || 'medium'),
    size: config.styleConfig.iconSize || 'medium',
    position: config.styleConfig.iconPosition || 'afterName',
    svgUrl: getCarbonLabelIconUrl(carbonLevel, config.styleConfig.iconSize || 'medium', 'svg')
  };

  // 文本信息（根据配置决定是否包含）
  const text = {};
  if (showContent.levelText) {
    text.levelText = getCarbonLevelText(carbonLevel, textConfig);
  }
  if (showContent.value) {
    const value = carbonFootprint.value || 0;
    text.value = `${value.toFixed(2)} ${textConfig.unit}`;
  }
  if (showContent.reductionPercent) {
    const reductionPercent = carbonFootprint.reductionPercent || 0;
    text.reductionPercent = `${textConfig.reduction}${reductionPercent.toFixed(0)}%`;
  }
  if (showContent.description) {
    text.description = getCarbonLabelDescription(carbonLevel, textConfig);
  }

  // 完整数据（始终包含）
  const fullData = {
    carbonFootprint: {
      value: carbonFootprint.value || 0,
      unit: textConfig.unit,
      baseline: carbonFootprint.baseline || 0,
      reduction: carbonFootprint.reduction || 0,
      reductionPercent: carbonFootprint.reductionPercent || 0,
      calculationLevel: carbonFootprint.calculationLevel || 'L2'
    },
    carbonLevel: carbonLevel
  };

  return {
    level: carbonLevel,
    icon: icon,
    text: text,
    fullData: fullData
  };
}

/**
 * 生成展示建议
 */
function generateDisplaySuggestion(carbonLevel, carbonFootprint, config) {
  const features = config.features || {};

  return {
    recommendedLevel: config.currentMediaConfig.displayLevel || 'basic',
    showInRecommendation: features.enableRecommendation && carbonLevel === 'low',
    sortPriority: carbonLevel === 'low' ? 1 : (carbonLevel === 'medium' ? 2 : 3),
    recommendedPosition: config.styleConfig.iconPosition || 'afterName'
  };
}

/**
 * 确定碳等级
 */
function determineCarbonLevel(carbonFootprint, baseline) {
  if (!baseline || baseline === 0) {
    return 'medium';
  }

  const ratio = carbonFootprint / baseline;
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
 */
function getCarbonLabelIconUrl(level, size = 'medium', format = 'png') {
  const sizeMap = {
    small: '16',
    medium: '24',
    large: '32'
  };
  const sizeValue = sizeMap[size] || '24';
  
  // 这里使用CDN URL，实际部署时需要配置真实的CDN地址
  const baseUrl = 'https://cdn.climate-restaurant.com/labels';
  return `${baseUrl}/${level}-carbon-${sizeValue}.${format}`;
}

/**
 * 获取碳等级文字
 */
function getCarbonLevelText(level, textConfig) {
  const levelMap = {
    low: textConfig.low,
    medium: textConfig.medium,
    high: textConfig.high
  };
  return levelMap[level] || textConfig.medium;
}

/**
 * 获取碳标签描述
 */
function getCarbonLabelDescription(level, textConfig) {
  const descMap = {
    low: `${textConfig.low}排放菜品`,
    medium: `${textConfig.medium}排放菜品`,
    high: `${textConfig.high}排放菜品`
  };
  return descMap[level] || `${textConfig.medium}排放菜品`;
}

/**
 * 默认配置
 */
function getDefaultGlobalConfig() {
  return {
    defaultDisplayLevel: 'basic',
    enabled: true,
    enabledFrom: new Date().toISOString(),
    enabledTo: null
  };
}

function getDefaultMediaConfig() {
  return {
    physicalMenu: {
      displayLevel: 'minimal',
      showContent: {
        icon: true,
        levelText: false,
        value: false,
        reductionPercent: false
      }
    },
    digitalMenu: {
      displayLevel: 'basic',
      showContent: {
        icon: true,
        levelText: true,
        value: false,
        reductionPercent: true
      }
    },
    mobileApp: {
      displayLevel: 'detailed',
      showContent: {
        icon: true,
        levelText: true,
        value: true,
        reductionPercent: true,
        baseline: false
      }
    },
    onlineMenu: {
      displayLevel: 'detailed',
      showContent: {
        icon: true,
        levelText: true,
        value: true,
        reductionPercent: true,
        baseline: false
      }
    },
    posSystem: {
      displayLevel: 'basic',
      showContent: {
        icon: true,
        levelText: true,
        value: false,
        reductionPercent: true
      }
    },
    receipt: {
      displayLevel: 'minimal',
      showContent: {
        icon: false,
        levelText: false,
        value: true,
        reductionPercent: true
      },
      showOrderSummary: true,
      showReductionMessage: true
    }
  };
}

function getDefaultStyleConfig() {
  return {
    iconSize: 'medium',
    colorScheme: 'standard',
    iconPosition: 'afterName',
    customColors: null
  };
}

function getDefaultFeatures() {
  return {
    enableFilter: true,
    enableSort: true,
    enableRecommendation: true,
    enableAchievement: true,
    enableComparison: false
  };
}

function getDefaultTextConfig() {
  return {
    zh_CN: {
      low: '低碳',
      medium: '达标',
      high: '高碳',
      reduction: '减排',
      carbonFootprint: '碳足迹',
      unit: 'kg CO₂e',
      messages: {
        thankYou: '感谢您为环保做出的贡献！',
        recommendation: '今日低碳推荐'
      }
    },
    en_US: {
      low: 'Low Carbon',
      medium: 'Standard',
      high: 'High Carbon',
      reduction: 'Reduction',
      carbonFootprint: 'Carbon Footprint',
      unit: 'kg CO₂e',
      messages: {
        thankYou: 'Thank you for your contribution to environmental protection!',
        recommendation: "Today's Low Carbon Recommendations"
      }
    }
  };
}

function getDefaultShowContent() {
  return {
    icon: true,
    levelText: false,
    value: false,
    reductionPercent: false,
    baseline: false,
    qrCode: false
  };
}

