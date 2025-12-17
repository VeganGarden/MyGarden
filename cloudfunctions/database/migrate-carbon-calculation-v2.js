const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 数据库迁移脚本 - 气候餐厅菜谱碳足迹计算功能完善（v2）
 * 
 * 功能：
 * 1. 为 restaurant_menu_items 集合补充新字段：
 *    - calculationLevel（计算级别：L1/L2/L3）
 *    - factorMatchInfo（因子匹配信息）
 *    - 完善 carbonFootprint 结构（确保包含 breakdown）
 * 
 * 执行方式：
 * 在 database 云函数中调用：{ action: 'migrate-carbon-calculation-v2' }
 */
exports.main = async (event) => {
  console.log('========================================');
  console.log('开始数据库迁移 - 碳足迹计算功能完善（v2）');
  console.log('========================================\n');

  try {
    // 迁移 restaurant_menu_items 集合
    console.log('[1/1] 迁移 restaurant_menu_items 集合...');
    const menuItemsResult = await migrateRestaurantMenuItems();

    console.log('\n========================================');
    console.log('✅ 数据库迁移完成');
    console.log('========================================\n');

    return {
      code: 0,
      message: '数据库迁移成功',
      results: [menuItemsResult]
    };
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    return {
      code: 500,
      message: '数据库迁移失败',
      error: error.message
    };
  }
};

/**
 * 迁移 restaurant_menu_items 集合
 * 为所有现有菜谱补充新字段
 */
async function migrateRestaurantMenuItems() {
  try {
    const menuItemsCollection = db.collection('restaurant_menu_items');
    
    // 查询所有菜谱（检查是否需要添加新字段）
    const allMenuItems = await menuItemsCollection.limit(1000).get();
    console.log(`  共找到 ${allMenuItems.data.length} 个菜谱`);

    let updateCount = 0;
    let skippedCount = 0;

    for (const menuItem of allMenuItems.data) {
      try {
        const updateData = {};
        let needsUpdate = false;

        // 1. 添加 calculationLevel 字段（如果不存在）
        if (!menuItem.calculationLevel) {
          // 根据现有数据判断计算级别
          // 如果有完整的carbonFootprint结构且包含factorMatchInfo，则为L2
          // 否则默认为L2（因为L1和L3需要特殊标记）
          updateData.calculationLevel = 'L2';
          needsUpdate = true;
        }

        // 2. 添加 factorMatchInfo 字段（如果不存在且carbonFootprint存在）
        if (!menuItem.factorMatchInfo && menuItem.carbonFootprint) {
          // 初始化为空数组，实际数据需要在重新计算时填充
          updateData.factorMatchInfo = [];
          needsUpdate = true;
        }

        // 3. 完善 carbonFootprint 结构，确保包含 breakdown
        if (menuItem.carbonFootprint) {
          const carbonFootprint = typeof menuItem.carbonFootprint === 'object' 
            ? menuItem.carbonFootprint 
            : { value: menuItem.carbonFootprint };

          // 确保包含完整的结构
          const updatedCarbonFootprint = {
            value: carbonFootprint.value || carbonFootprint.carbonFootprint || 0,
            baseline: carbonFootprint.baseline || 0,
            reduction: carbonFootprint.reduction !== undefined 
              ? carbonFootprint.reduction 
              : (carbonFootprint.baseline || 0) - (carbonFootprint.value || 0),
            breakdown: carbonFootprint.breakdown || {
              ingredients: carbonFootprint.ingredients || carbonFootprint.ingredientsCarbon || 0,
              energy: carbonFootprint.cookingEnergy || carbonFootprint.energy || 0,
              packaging: carbonFootprint.packaging || 0,
              transport: carbonFootprint.transport || 0
            },
            // 保留旧字段（向后兼容）
            ingredients: carbonFootprint.ingredients || carbonFootprint.ingredientsCarbon || 0,
            cookingEnergy: carbonFootprint.cookingEnergy || carbonFootprint.energy || 0,
            packaging: carbonFootprint.packaging || 0,
            transport: carbonFootprint.transport || 0
          };

          // 检查是否需要更新
          if (!carbonFootprint.breakdown || 
              JSON.stringify(carbonFootprint.breakdown) !== JSON.stringify(updatedCarbonFootprint.breakdown)) {
            updateData.carbonFootprint = updatedCarbonFootprint;
            needsUpdate = true;
          }
        }

        // 如果需要更新，执行更新
        if (needsUpdate) {
          await menuItemsCollection.doc(menuItem._id).update({
            data: updateData
          });
          updateCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`更新菜谱 ${menuItem._id} 失败:`, error);
      }
    }

    console.log(`  ✅ 已更新 ${updateCount} 个菜谱`);
    console.log(`  ⏭️  跳过 ${skippedCount} 个菜谱（无需更新）`);

    return {
      collection: 'restaurant_menu_items',
      action: 'migrate',
      status: 'success',
      updated: updateCount,
      skipped: skippedCount,
      message: `成功更新 ${updateCount} 个菜谱，跳过 ${skippedCount} 个`
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



