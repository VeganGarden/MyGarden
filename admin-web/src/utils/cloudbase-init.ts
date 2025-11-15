/**
 * 云开发环境初始化工具
 * 用于在应用启动时初始化腾讯云开发环境
 */

import cloud from '@cloudbase/js-sdk'

// 腾讯云开发环境配置
const CLOUDBASE_CONFIG = {
  envId: import.meta.env.VITE_CLOUDBASE_ENVID || 'my-garden-app-env-4e0h762923be2f',
  region: import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai',
}

let cloudbaseApp: any = null
let authInstance: any = null

/**
 * 初始化云开发环境
 */
export const initCloudbase = async () => {
  if (!cloudbaseApp) {
    try {
      cloudbaseApp = cloud.init({
        env: CLOUDBASE_CONFIG.envId,
        region: CLOUDBASE_CONFIG.region,
      })
      
      // 创建 auth 对象（只创建一次）
      authInstance = cloudbaseApp.auth({ persistence: 'local' })
      
      // Web端调用云函数需要匿名登录
      try {
        const loginState = await authInstance.getLoginState()
        
        if (!loginState) {
          await authInstance.signInAnonymously()
        }
      } catch (authError: any) {
        // 如果已经登录，忽略错误
        if (authError.code !== 'ALREADY_SIGNED_IN') {
          // 静默处理登录错误，不阻止初始化
        }
      }
    } catch (error) {
      console.error('云开发环境初始化失败:', error)
      throw error
    }
  }
  return cloudbaseApp
}

/**
 * 获取 auth 实例（只创建一次）
 */
export const getAuthInstance = () => {
  if (!authInstance && cloudbaseApp) {
    authInstance = cloudbaseApp.auth({ persistence: 'local' })
  }
  return authInstance
}

/**
 * 获取云开发应用实例
 */
export const getCloudbaseApp = async () => {
  if (!cloudbaseApp) {
    return await initCloudbase()
  }
  return cloudbaseApp
}

export default {
  initCloudbase,
  getCloudbaseApp,
  getAuthInstance,
  config: CLOUDBASE_CONFIG,
}

