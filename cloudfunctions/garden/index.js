const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 植物类型配置
const PLANT_TYPES = {
  cactus: { name: '仙人掌', cost: 100, growthTime: 24, experience: 10 },
  lavender: { name: '薰衣草', cost: 200, growthTime: 48, experience: 20 },
  cherry: { name: '樱花树', cost: 500, growthTime: 72, experience: 50 },
  orchid: { name: '蝴蝶兰', cost: 1000, growthTime: 96, experience: 100 }
}

// 花园场景配置
const GARDEN_SCENES = {
  desert: { name: '沙漠绿洲', unlockRequirement: 0 },
  rainforest: { name: '热带雨林', unlockRequirement: 500 },
  wetland: { name: '滨海湿地', unlockRequirement: 2000 },
  future: { name: '未来花园', unlockRequirement: 5000 }
}

/**
 * 花园管理云函数 - 完整版
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const db = cloud.database()
  const _ = db.command
  const gardenCollection = db.collection('gardens')
  const userCollection = db.collection('users')
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'getUserGarden':
        // 获取用户完整花园信息
        return await getUserGarden(openid, gardenCollection, userCollection)

      case 'plantNewPlant':
        // 种植新植物
        return await plantNewPlant(openid, data, gardenCollection, userCollection)

      case 'waterPlant':
        // 给植物浇水
        return await waterPlant(openid, data, gardenCollection)

      case 'harvestPlant':
        // 收获成熟植物
        return await harvestPlant(openid, data, gardenCollection, userCollection)

      case 'unlockScene':
        // 解锁新场景
        return await unlockScene(openid, data, gardenCollection, userCollection)

      case 'getGardenStats':
        // 获取花园统计数据
        return await getGardenStats(openid, gardenCollection)

      case 'calculatePlantGrowth':
        // 计算植物成长进度
        return await calculatePlantGrowth(openid, gardenCollection)

      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('花园操作失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试'
    }
  }
}

/**
 * 获取用户花园信息
 */
async function getUserGarden(openid, gardenCollection, userCollection) {
  // 获取用户信息
  const userResult = await userCollection.where({ openid }).get()
  if (userResult.data.length === 0) {
    return { code: 404, message: '用户不存在' }
  }
  
  const user = userResult.data[0]
  
  // 获取花园信息
  const gardenResult = await gardenCollection.where({ userId: openid }).get()
  let garden
  
  if (gardenResult.data.length === 0) {
    // 创建新花园
    garden = {
      userId: openid,
      currentScene: 'desert',
      unlockedScenes: ['desert'],
      plants: [],
      totalPlantsPlanted: 0,
      totalPlantsHarvested: 0,
      totalExperience: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const addResult = await gardenCollection.add({ data: garden })
    garden._id = addResult._id
  } else {
    garden = gardenResult.data[0]
    
    // 自动计算植物成长
    garden.plants = await calculatePlantsGrowth(garden.plants)
    await gardenCollection.doc(garden._id).update({
      data: {
        plants: garden.plants,
        updatedAt: new Date()
      }
    })
  }
  
  return {
    code: 0,
    data: {
      garden,
      userPoints: user.points || 0,
      userLevel: user.level || 1
    }
  }
}

/**
 * 种植新植物
 */
async function plantNewPlant(openid, data, gardenCollection, userCollection) {
  const { plantType, position } = data
  const plantConfig = PLANT_TYPES[plantType]
  
  if (!plantConfig) {
    return { code: 400, message: '无效的植物类型' }
  }
  
  // 检查用户积分
  const userResult = await userCollection.where({ openid }).get()
  if (userResult.data.length === 0) {
    return { code: 404, message: '用户不存在' }
  }
  
  const user = userResult.data[0]
  if ((user.points || 0) < plantConfig.cost) {
    return { code: 400, message: '积分不足' }
  }
  
  // 获取花园信息
  const gardenResult = await gardenCollection.where({ userId: openid }).get()
  if (gardenResult.data.length === 0) {
    return { code: 404, message: '花园不存在' }
  }
  
  const garden = gardenResult.data[0]
  
  // 创建新植物
  const newPlant = {
    id: Date.now().toString(),
    type: plantType,
    name: plantConfig.name,
    position: position || { x: Math.random() * 200 + 50, y: Math.random() * 300 + 100 },
    growth: 0,
    plantedAt: new Date(),
    lastWatered: new Date(),
    experience: plantConfig.experience,
    isHarvested: false
  }
  
  // 更新花园
  await gardenCollection.doc(garden._id).update({
    data: {
      plants: _.push(newPlant),
      totalPlantsPlanted: _.inc(1),
      updatedAt: new Date()
    }
  })
  
  // 扣除用户积分
  await userCollection.doc(user._id).update({
    data: {
      points: _.inc(-plantConfig.cost),
      updatedAt: new Date()
    }
  })
  
  return {
    code: 0,
    data: {
      plant: newPlant,
      remainingPoints: (user.points || 0) - plantConfig.cost
    },
    message: `成功种植${plantConfig.name}`
  }
}

/**
 * 给植物浇水
 */
async function waterPlant(openid, data, gardenCollection) {
  const { plantId } = data
  
  // 获取花园信息
  const gardenResult = await gardenCollection.where({ userId: openid }).get()
  if (gardenResult.data.length === 0) {
    return { code: 404, message: '花园不存在' }
  }
  
  const garden = gardenResult.data[0]
  const plantIndex = garden.plants.findIndex(p => p.id === plantId)
  
  if (plantIndex === -1) {
    return { code: 404, message: '植物不存在' }
  }
  
  const plant = garden.plants[plantIndex]
  
  // 检查植物是否已经成熟
  if (plant.growth >= 100) {
    return { code: 400, message: '植物已经成熟，无需浇水' }
  }
  
  // 计算浇水后的成长度（每次浇水增加10%）
  const newGrowth = Math.min(100, plant.growth + 10)
  const isFullyGrown = newGrowth >= 100
  
  // 更新植物信息
  garden.plants[plantIndex] = {
    ...plant,
    growth: newGrowth,
    lastWatered: new Date(),
    isFullyGrown: isFullyGrown
  }
  
  await gardenCollection.doc(garden._id).update({
    data: {
      plants: garden.plants,
      updatedAt: new Date()
    }
  })
  
  return {
    code: 0,
    data: {
      newGrowth,
      isFullyGrown,
      plant: garden.plants[plantIndex]
    },
    message: isFullyGrown ? '植物已经成熟！' : '浇水成功'
  }
}

/**
 * 收获成熟植物
 */
async function harvestPlant(openid, data, gardenCollection, userCollection) {
  const { plantId } = data
  
  // 获取花园信息
  const gardenResult = await gardenCollection.where({ userId: openid }).get()
  if (gardenResult.data.length === 0) {
    return { code: 404, message: '花园不存在' }
  }
  
  const garden = gardenResult.data[0]
  const plantIndex = garden.plants.findIndex(p => p.id === plantId)
  
  if (plantIndex === -1) {
    return { code: 404, message: '植物不存在' }
  }
  
  const plant = garden.plants[plantIndex]
  
  // 检查植物是否成熟
  if (!plant.isFullyGrown) {
    return { code: 400, message: '植物尚未成熟，无法收获' }
  }
  
  if (plant.isHarvested) {
    return { code: 400, message: '植物已经被收获' }
  }
  
  // 获取用户信息
  const userResult = await userCollection.where({ openid }).get()
  if (userResult.data.length === 0) {
    return { code: 404, message: '用户不存在' }
  }
  
  const user = userResult.data[0]
  
  // 标记植物为已收获
  garden.plants[plantIndex] = {
    ...plant,
    isHarvested: true,
    harvestedAt: new Date()
  }
  
  // 更新花园和用户信息
  await gardenCollection.doc(garden._id).update({
    data: {
      plants: garden.plants,
      totalPlantsHarvested: _.inc(1),
      totalExperience: _.inc(plant.experience),
      updatedAt: new Date()
    }
  })
  
  await userCollection.doc(user._id).update({
    data: {
      points: _.inc(plant.experience * 2), // 收获获得双倍积分
      totalExperience: _.inc(plant.experience),
      updatedAt: new Date()
    }
  })
  
  return {
    code: 0,
    data: {
      experienceGained: plant.experience,
      pointsGained: plant.experience * 2,
      newPoints: (user.points || 0) + plant.experience * 2
    },
    message: `收获成功！获得${plant.experience}经验和${plant.experience * 2}积分`
  }
}

/**
 * 解锁新场景
 */
async function unlockScene(openid, data, gardenCollection, userCollection) {
  const { sceneId } = data
  const sceneConfig = GARDEN_SCENES[sceneId]
  
  if (!sceneConfig) {
    return { code: 400, message: '无效的场景ID' }
  }
  
  // 获取用户信息
  const userResult = await userCollection.where({ openid }).get()
  if (userResult.data.length === 0) {
    return { code: 404, message: '用户不存在' }
  }
  
  const user = userResult.data[0]
  
  // 检查是否满足解锁条件
  if ((user.totalExperience || 0) < sceneConfig.unlockRequirement) {
    return { 
      code: 400, 
      message: `经验不足，需要${sceneConfig.unlockRequirement}经验才能解锁` 
    }
  }
  
  // 获取花园信息
  const gardenResult = await gardenCollection.where({ userId: openid }).get()
  if (gardenResult.data.length === 0) {
    return { code: 404, message: '花园不存在' }
  }
  
  const garden = gardenResult.data[0]
  
  // 检查是否已经解锁
  if (garden.unlockedScenes.includes(sceneId)) {
    return { code: 400, message: '场景已经解锁' }
  }
  
  // 解锁场景
  await gardenCollection.doc(garden._id).update({
    data: {
      unlockedScenes: _.push(sceneId),
      currentScene: sceneId,
      updatedAt: new Date()
    }
  })
  
  return {
    code: 0,
    data: {
      scene: sceneConfig,
      unlockedScenes: [...garden.unlockedScenes, sceneId]
    },
    message: `成功解锁${sceneConfig.name}场景！`
  }
}

/**
 * 获取花园统计数据
 */
async function getGardenStats(openid, gardenCollection) {
  const gardenResult = await gardenCollection.where({ userId: openid }).get()
  if (gardenResult.data.length === 0) {
    return { code: 404, message: '花园不存在' }
  }
  
  const garden = gardenResult.data[0]
  
  const stats = {
    totalPlants: garden.plants.length,
    growingPlants: garden.plants.filter(p => !p.isFullyGrown && !p.isHarvested).length,
    maturePlants: garden.plants.filter(p => p.isFullyGrown && !p.isHarvested).length,
    harvestedPlants: garden.plants.filter(p => p.isHarvested).length,
    totalExperience: garden.totalExperience || 0,
    unlockedScenes: garden.unlockedScenes.length,
    currentScene: garden.currentScene
  }
  
  return {
    code: 0,
    data: stats
  }
}

/**
 * 计算植物成长进度
 */
async function calculatePlantGrowth(openid, gardenCollection) {
  const gardenResult = await gardenCollection.where({ userId: openid }).get()
  if (gardenResult.data.length === 0) {
    return { code: 404, message: '花园不存在' }
  }
  
  const garden = gardenResult.data[0]
  const updatedPlants = await calculatePlantsGrowth(garden.plants)
  
  await gardenCollection.doc(garden._id).update({
    data: {
      plants: updatedPlants,
      updatedAt: new Date()
    }
  })
  
  return {
    code: 0,
    data: {
      plants: updatedPlants,
      updatedCount: updatedPlants.filter(p => p.growth > 0).length
    }
  }
}

/**
 * 辅助函数：计算植物自动成长
 */
async function calculatePlantsGrowth(plants) {
  const now = new Date()
  return plants.map(plant => {
    if (plant.isFullyGrown || plant.isHarvested) {
      return plant
    }
    
    // 计算距离上次浇水的时间（小时）
    const lastWatered = new Date(plant.lastWatered)
    const hoursSinceLastWater = (now - lastWatered) / (1000 * 60 * 60)
    
    // 每24小时自动成长5%
    const autoGrowth = Math.floor(hoursSinceLastWater / 24) * 5
    const newGrowth = Math.min(100, plant.growth + autoGrowth)
    
    return {
      ...plant,
      growth: newGrowth,
      isFullyGrown: newGrowth >= 100,
      lastWatered: autoGrowth > 0 ? now : plant.lastWatered
    }
  })
}