const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 数据库迁移脚本 - 气候餐厅菜谱碳足迹计算功能优化升级
 * 
 * 功能：
 * 1. 为 restaurants 集合添加 region 字段（默认值：national_average）
 * 2. 为 restaurant_menu_items 集合添加新字段：
 *    - mealType（餐食类型）
 *    - energyType（用能方式）
 *    - restaurantRegion（餐厅地区，冗余存储）
 *    - carbonFootprint（扩展结构）
 *    - baselineInfo（基准值信息）
 *    - optimizationFlag（优化标识）
 *    - calculatedAt（计算时间）
 * 3. 创建必要的索引
 * 
 * 执行方式：
 * 在 database 云函数中调用：{ action: 'migrate-carbon-calculation-v1' }
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('开始数据库迁移 - 碳足迹计算功能优化升级');
  console.log('========================================\n');

  const results = [];

  try {
    // 1. 迁移 restaurants 集合
    console.log('[1/3] 迁移 restaurants 集合...');
    const restaurantResult = await migrateRestaurants();
    results.push(restaurantResult);

    // 2. 迁移 restaurant_menu_items 集合
    console.log('[2/3] 迁移 restaurant_menu_items 集合...');
    const menuItemsResult = await migrateRestaurantMenuItems();
    results.push(menuItemsResult);

    // 3. 创建索引
    console.log('[3/3] 创建索引...');
    const indexResult = await createIndexes();
    results.push(indexResult);

    console.log('\n========================================');
    console.log('✅ 数据库迁移完成');
    console.log('========================================\n');

    return {
      code: 0,
      message: '数据库迁移成功',
      results: results
    };
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    return {
      code: 500,
      message: '数据库迁移失败',
      error: error.message,
      results: results
    };
  }
};

/**
 * 迁移 restaurants 集合
 * 为所有现有餐厅添加 region 字段（默认值：national_average）
 */
async function migrateRestaurants() {
  try {
    const restaurantsCollection = db.collection('restaurants');
    
    // 查询所有没有 region 字段的餐厅
    const restaurantsWithoutRegion = await restaurantsCollection
      .where({
        region: _.exists(false)
      })
      .get();

    console.log(`  发现 ${restaurantsWithoutRegion.data.length} 个餐厅需要添加 region 字段`);

    if (restaurantsWithoutRegion.data.length === 0) {
      return {
        collection: 'restaurants',
        action: 'migrate',
        status: 'skipped',
        message: '所有餐厅已有 region 字段'
      };
    }

    // 逐个更新（腾讯云开发不支持 batch）
    let updateCount = 0;

    for (const restaurant of restaurantsWithoutRegion.data) {
      try {
        await restaurantsCollection.doc(restaurant._id).update({
          data: {
            region: 'national_average' // 默认值：全国平均
          }
        });
        updateCount++;
      } catch (error) {
        console.error(`更新餐厅 ${restaurant._id} 失败:`, error);
      }
    }

    console.log(`  ✅ 已为 ${updateCount} 个餐厅添加 region 字段`);

    return {
      collection: 'restaurants',
      action: 'migrate',
      status: 'success',
      updated: updateCount,
      message: `成功为 ${updateCount} 个餐厅添加 region 字段`
    };
  } catch (error) {
    console.error('  ❌ 迁移 restaurants 集合失败:', error);
    return {
      collection: 'restaurants',
      action: 'migrate',
      status: 'failed',
      error: error.message
    };
  }
}

/**
 * 迁移 restaurant_menu_items 集合
 * 为所有现有菜谱添加新字段
 */
async function migrateRestaurantMenuItems() {
  try {
    const menuItemsCollection = db.collection('restaurant_menu_items');
    
    // 查询所有需要迁移的菜谱（缺少 mealType 或 energyType）
    const menuItemsToMigrate = await menuItemsCollection
      .where(_.or([
        { mealType: _.exists(false) },
        { energyType: _.exists(false) }
      ]))
      .get();

    console.log(`  发现 ${menuItemsToMigrate.data.length} 个菜谱需要迁移`);

    if (menuItemsToMigrate.data.length === 0) {
      return {
        collection: 'restaurant_menu_items',
        action: 'migrate',
        status: 'skipped',
        message: '所有菜谱已有必要字段'
      };
    }

    // 获取所有餐厅的地区信息（用于设置 restaurantRegion）
    const restaurantsMap = new Map();
    const restaurantIds = [...new Set(menuItemsToMigrate.data.map(item => item.restaurantId))];
    
    for (const restaurantId of restaurantIds) {
      try {
        const restaurant = await db.collection('restaurants').doc(restaurantId).get();
        if (restaurant.data) {
          restaurantsMap.set(restaurantId, restaurant.data.region || 'national_average');
        }
      } catch (error) {
        console.warn(`  警告：无法获取餐厅 ${restaurantId} 的地区信息，使用默认值`);
        restaurantsMap.set(restaurantId, 'national_average');
      }
    }

    // 逐个更新（腾讯云开发不支持 batch）
    let updateCount = 0;

    for (const menuItem of menuItemsToMigrate.data) {
      try {
        const restaurantRegion = restaurantsMap.get(menuItem.restaurantId) || 'national_average';
        
        const updateData = {
          // 设置默认值
          mealType: menuItem.mealType || 'meat_simple', // 默认：肉食简餐
          energyType: menuItem.energyType || 'electric', // 默认：全电
          restaurantRegion: restaurantRegion,
          
          // 扩展 carbonFootprint 结构（如果不存在）
          carbonFootprint: menuItem.carbonFootprint || {
            value: menuItem.carbonFootprint?.value || menuItem.carbon_footprint || 0,
            baseline: menuItem.carbonFootprint?.baseline || 0,
            reduction: menuItem.carbonFootprint?.reduction || 0,
            ingredients: menuItem.carbonFootprint?.ingredients || 0,
            cookingEnergy: menuItem.carbonFootprint?.cookingEnergy || 0,
            packaging: menuItem.carbonFootprint?.packaging || 0,
            other: menuItem.carbonFootprint?.other || 0
          },
          
          // 初始化 baselineInfo（如果不存在）
          baselineInfo: menuItem.baselineInfo || null,
          
          // 初始化 optimizationFlag（如果不存在）
          optimizationFlag: menuItem.optimizationFlag || {
            needsOptimization: false,
            warningMessage: null
          },
          
          // 设置 calculatedAt（如果不存在）
          calculatedAt: menuItem.calculatedAt || menuItem.updatedAt || new Date()
        };

        await menuItemsCollection.doc(menuItem._id).update({
          data: updateData
        });
        updateCount++;
      } catch (error) {
        console.error(`更新菜谱 ${menuItem._id} 失败:`, error);
      }
    }

    console.log(`  ✅ 已迁移 ${updateCount} 个菜谱`);

    return {
      collection: 'restaurant_menu_items',
      action: 'migrate',
      status: 'success',
      updated: updateCount,
      message: `成功迁移 ${updateCount} 个菜谱`
    };
  } catch (error) {
    console.error('  ❌ 迁移 restaurant_menu_items 集合失败:', error);
    return {
      collection: 'restaurant_menu_items',
      action: 'migrate',
      status: 'failed',
      error: error.message
    };
  }
}

/**
 * 创建索引
 * 注意：腾讯云开发 MongoDB 需要通过控制台创建索引
 * 此函数仅输出索引创建说明
 */
async function createIndexes() {
  const indexes = [
    {
      collection: 'restaurants',
      index: { region: 1 },
      name: 'region_index',
      description: '餐厅地区查询索引'
    },
    {
      collection: 'restaurant_menu_items',
      index: {
        restaurantRegion: 1,
        mealType: 1,
        energyType: 1
      },
      name: 'baseline_query_index',
      description: '基准值查询维度组合索引'
    },
    {
      collection: 'restaurant_menu_items',
      index: { 'optimizationFlag.needsOptimization': 1 },
      name: 'optimization_flag_index',
      description: '优化标识查询索引'
    }
  ];

  console.log('  需要在控制台手动创建以下索引：');
  indexes.forEach((idx, i) => {
    console.log(`  [${i + 1}/${indexes.length}] ${idx.collection}.${idx.name}`);
    console.log(`      字段: ${JSON.stringify(idx.index)}`);
    console.log(`      说明: ${idx.description}`);
  });

  return {
    action: 'create_indexes',
    status: 'info',
    message: '索引需要在控制台手动创建',
    indexes: indexes
  };
}

