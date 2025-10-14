// 云函数：plant-templates
// 功能：植物模板数据导入与管理

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 导入植物数据
const plantData = require('./plant-data.json');

/**
 * 云函数入口
 */
exports.main = async (event) => {
  const { action } = event;

  try {
    switch (action) {
      case 'importPlants':
        return await importPlants();
      
      case 'countPlants':
        return await countPlants();
      
      case 'getPlantById':
        return await getPlantById(event.plantId);
      
      case 'getPlantsByRarity':
        return await getPlantsByRarity(event.rarity);
      
      case 'getPlantsByCategory':
        return await getPlantsByCategory(event.category);
      
      case 'checkUnlockStatus':
        return await checkUnlockStatus(event.userId, event.plantId);
      
      case 'getUnlockedPlants':
        return await getUnlockedPlants(event.userId);
      
      default:
        return {
          code: 400,
          message: '未知的操作类型，支持: importPlants, countPlants, getPlantById, getPlantsByRarity, getPlantsByCategory, checkUnlockStatus, getUnlockedPlants'
        };
    }
  } catch (error) {
    console.error('操作失败:', error);
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    };
  }
};

/**
 * 导入植物模板数据
 */
async function importPlants() {
  console.log('========================================');
  console.log('开始导入植物模板数据...');
  console.log('========================================\n');

  const results = {
    total: plantData.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    details: []
  };

  for (let i = 0; i < plantData.length; i++) {
    const plant = plantData[i];
    
    try {
      // 检查是否已存在
      let shouldInsert = true;
      
      try {
        const existing = await db.collection('plant_templates')
          .where({ plantId: plant.plantId })
          .get();

        if (existing.data.length > 0) {
          console.log(`[${i + 1}/${plantData.length}] ⚠️  ${plant.name} 已存在，跳过`);
          results.skipped++;
          results.details.push({
            name: plant.name,
            status: 'skipped',
            reason: '已存在'
          });
          shouldInsert = false;
        }
      } catch (checkError) {
        if (checkError.errCode === -502005 || checkError.message.includes('not exists')) {
          console.log(`[${i + 1}/${plantData.length}] ℹ️  集合不存在，将创建并插入 ${plant.name}`);
          shouldInsert = true;
        } else {
          throw checkError;
        }
      }

      if (!shouldInsert) {
        continue;
      }

      // 插入数据
      await db.collection('plant_templates').add({
        data: {
          ...plant,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`[${i + 1}/${plantData.length}] ✅ ${plant.name} 导入成功 (稀有度: ${plant.rarity})`);
      results.inserted++;
      results.details.push({
        name: plant.name,
        rarity: plant.rarity,
        status: 'success'
      });

    } catch (error) {
      console.error(`[${i + 1}/${plantData.length}] ❌ ${plant.name} 导入失败:`, error.message);
      results.failed++;
      results.details.push({
        name: plant.name,
        status: 'failed',
        error: error.message
      });
    }

    // 控制导入速度
    if (i < plantData.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n========================================');
  console.log('📊 植物模板数据导入完成！');
  console.log('========================================');
  console.log(`总计: ${results.total}`);
  console.log(`✅ 成功: ${results.inserted}`);
  console.log(`⚠️  跳过: ${results.skipped}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log('========================================\n');

  return {
    code: 0,
    message: '植物模板数据导入完成',
    summary: results
  };
}

/**
 * 统计植物数据
 */
async function countPlants() {
  try {
    const total = await db.collection('plant_templates').count();
    
    if (total.total === 0) {
      return {
        code: 0,
        message: '植物库为空，请先执行导入操作',
        data: { total: 0, byRarity: [], byCategory: [] }
      };
    }

    // 按稀有度统计
    const byRarity = await db.collection('plant_templates')
      .aggregate()
      .group({
        _id: '$rarity',
        count: $.sum(1)
      })
      .end();

    // 按分类统计
    const byCategory = await db.collection('plant_templates')
      .aggregate()
      .group({
        _id: '$category',
        count: $.sum(1)
      })
      .end();

    console.log('植物库统计:');
    console.log('总计:', total.total);
    console.log('按稀有度:', byRarity.list);
    console.log('按分类:', byCategory.list);

    return {
      code: 0,
      data: {
        total: total.total,
        byRarity: byRarity.list,
        byCategory: byCategory.list
      }
    };

  } catch (error) {
    if (error.errCode === -502005 || error.message.includes('not exists')) {
      return {
        code: 404,
        message: 'plant_templates 集合不存在，请先执行 importPlants 操作',
        data: { total: 0, byRarity: [], byCategory: [] }
      };
    }
    throw error;
  }
}

/**
 * 根据ID获取植物
 */
async function getPlantById(plantId) {
  if (!plantId) {
    return { code: 400, message: '请提供植物ID' };
  }

  const plant = await db.collection('plant_templates')
    .where({ plantId })
    .get();

  if (plant.data.length === 0) {
    return { code: 404, message: '未找到该植物' };
  }

  return {
    code: 0,
    data: plant.data[0]
  };
}

/**
 * 按稀有度获取植物
 */
async function getPlantsByRarity(rarity) {
  if (!rarity) {
    return { code: 400, message: '请提供稀有度' };
  }

  const plants = await db.collection('plant_templates')
    .where({ rarity, status: 'active' })
    .orderBy('unlockRequirements.totalPoints', 'asc')
    .get();

  return {
    code: 0,
    data: {
      rarity,
      list: plants.data,
      total: plants.data.length
    }
  };
}

/**
 * 按分类获取植物
 */
async function getPlantsByCategory(category) {
  if (!category) {
    return { code: 400, message: '请提供分类' };
  }

  const plants = await db.collection('plant_templates')
    .where({ category, status: 'active' })
    .orderBy('unlockRequirements.totalPoints', 'asc')
    .get();

  return {
    code: 0,
    data: {
      category,
      list: plants.data,
      total: plants.data.length
    }
  };
}

/**
 * 检查植物解锁状态
 */
async function checkUnlockStatus(userId, plantId) {
  if (!userId || !plantId) {
    return { code: 400, message: '请提供用户ID和植物ID' };
  }

  // 获取植物信息
  const plantResult = await db.collection('plant_templates')
    .where({ plantId })
    .get();

  if (plantResult.data.length === 0) {
    return { code: 404, message: '植物不存在' };
  }

  const plant = plantResult.data[0];
  const requirements = plant.unlockRequirements;

  // 获取用户信息
  const userResult = await db.collection('users')
    .where({ _id: userId })
    .get();

  if (userResult.data.length === 0) {
    return { code: 404, message: '用户不存在' };
  }

  const user = userResult.data[0];

  // 检查解锁条件
  const checks = {
    points: (user.points || 0) >= (requirements.totalPoints || 0),
    carbon: (user.stats?.totalCarbonReduction || 0) >= (requirements.totalCarbon || 0),
    prerequisite: true
  };

  // 检查前置植物
  if (requirements.prerequisitePlants && requirements.prerequisitePlants.length > 0) {
    const gardenResult = await db.collection('gardens')
      .where({ userId })
      .get();

    if (gardenResult.data.length > 0) {
      const garden = gardenResult.data[0];
      const userPlants = garden.plants || [];
      const userPlantTypes = userPlants.map(p => p.type);

      checks.prerequisite = requirements.prerequisitePlants.every(
        reqPlant => userPlantTypes.includes(reqPlant)
      );
    } else {
      checks.prerequisite = false;
    }
  }

  const unlocked = checks.points && checks.carbon && checks.prerequisite;

  return {
    code: 0,
    data: {
      plantId,
      plantName: plant.name,
      unlocked,
      checks,
      requirements,
      userProgress: {
        points: user.points || 0,
        carbon: user.stats?.totalCarbonReduction || 0
      }
    }
  };
}

/**
 * 获取用户已解锁的所有植物
 */
async function getUnlockedPlants(userId) {
  if (!userId) {
    return { code: 400, message: '请提供用户ID' };
  }

  // 获取用户信息
  const userResult = await db.collection('users')
    .where({ _id: userId })
    .get();

  if (userResult.data.length === 0) {
    return { code: 404, message: '用户不存在' };
  }

  const user = userResult.data[0];
  const userPoints = user.points || 0;
  const userCarbon = user.stats?.totalCarbonReduction || 0;

  // 获取所有植物
  const allPlantsResult = await db.collection('plant_templates')
    .where({ status: 'active' })
    .get();

  const unlockedPlants = [];
  const lockedPlants = [];

  for (const plant of allPlantsResult.data) {
    const req = plant.unlockRequirements;
    const pointsOk = userPoints >= (req.totalPoints || 0);
    const carbonOk = userCarbon >= (req.totalCarbon || 0);

    if (pointsOk && carbonOk) {
      unlockedPlants.push({
        ...plant,
        unlocked: true
      });
    } else {
      lockedPlants.push({
        plantId: plant.plantId,
        name: plant.name,
        rarity: plant.rarity,
        unlocked: false,
        progress: {
          points: pointsOk ? 100 : Math.min(100, (userPoints / req.totalPoints * 100).toFixed(0)),
          carbon: carbonOk ? 100 : Math.min(100, (userCarbon / req.totalCarbon * 100).toFixed(0))
        }
      });
    }
  }

  return {
    code: 0,
    data: {
      unlocked: unlockedPlants,
      locked: lockedPlants,
      summary: {
        total: allPlantsResult.data.length,
        unlocked: unlockedPlants.length,
        locked: lockedPlants.length
      }
    }
  };
}

