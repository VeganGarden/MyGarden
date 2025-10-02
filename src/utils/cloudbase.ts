import Taro from '@tarojs/taro'

// 云开发环境配置
const CLOUDBASE_CONFIG = {
  env: process.env.CLOUDBASE_ENVID || 'my-garden-app-env',
  region: process.env.CLOUDBASE_REGION || 'ap-shanghai'
}

/**
 * 初始化云开发环境
 */
export const initCloudbase = async () => {
  try {
    await Taro.cloud.init(CLOUDBASE_CONFIG)
    console.log('云开发环境初始化成功')
    return true
  } catch (error) {
    console.error('云开发环境初始化失败:', error)
    return false
  }
}

/**
 * 调用云函数
 * @param name 云函数名称
 * @param data 调用参数
 */
export const callCloudFunction = async (name: string, data?: any) => {
  try {
    const result = await Taro.cloud.callFunction({
      name,
      data
    })
    return result.result
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error)
    throw error
  }
}

/**
 * 用户登录
 */
export const loginWithWechat = async (code: string) => {
  return await callCloudFunction('login', { code })
}

/**
 * 获取用户信息
 */
export const getUserProfile = async (userId: string) => {
  return await callCloudFunction('user', {
    action: 'getProfile',
    data: { userId }
  })
}

/**
 * 更新用户信息
 */
export const updateUserProfile = async (userId: string, profileData: any) => {
  return await callCloudFunction('user', {
    action: 'updateProfile',
    data: { userId, ...profileData }
  })
}

/**
 * 获取花园信息
 */
export const getGardenInfo = async (userId: string) => {
  return await callCloudFunction('garden', {
    action: 'getGardenInfo',
    data: { userId }
  })
}

/**
 * 记录素食餐食
 */
export const recordVegetarianMeal = async (mealData: any) => {
  return await callCloudFunction('garden', {
    action: 'recordMeal',
    data: mealData
  })
}

/**
 * 计算碳足迹
 */
export const calculateCarbonFootprint = async (ingredients: any[], cookingMethod: string) => {
  return await callCloudFunction('carbon', {
    action: 'calculateMealCarbon',
    data: { ingredients, cookingMethod }
  })
}

/**
 * 获取用户碳足迹统计
 */
export const getUserCarbonStats = async (userId: string) => {
  return await callCloudFunction('carbon', {
    action: 'getUserStats',
    data: { userId }
  })
}

export default {
  initCloudbase,
  callCloudFunction,
  loginWithWechat,
  getUserProfile,
  updateUserProfile,
  getGardenInfo,
  recordVegetarianMeal,
  calculateCarbonFootprint,
  getUserCarbonStats
}