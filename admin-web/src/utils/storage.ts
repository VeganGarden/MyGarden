/**
 * 本地存储工具函数
 * 用于管理用户信息和租户信息的本地存储
 */

const STORAGE_KEYS = {
  TOKEN: 'admin_token',
  USER: 'admin_user',
  TENANT: 'tenant_data',
  RESTAURANT: 'current_restaurant_id',
}

/**
 * 清除所有本地存储的用户相关数据
 */
export const clearUserStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  localStorage.removeItem(STORAGE_KEYS.USER)
  localStorage.removeItem(STORAGE_KEYS.TENANT)
  localStorage.removeItem(STORAGE_KEYS.RESTAURANT)
}

/**
 * 验证并同步用户信息
 * 如果localStorage中的用户信息与当前登录不匹配，清除旧数据
 */
export const validateUserStorage = (currentUserId: string, currentRole: string) => {
  try {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER)
    if (storedUser) {
      const user = JSON.parse(storedUser)
      // 如果存储的用户ID或角色与当前不匹配，清除旧数据
      if (user.id !== currentUserId || user.role !== currentRole) {
        console.log('检测到用户信息不匹配，清除旧数据')
        clearUserStorage()
        return false
      }
    }
    return true
  } catch (error) {
    console.error('验证用户存储失败:', error)
    clearUserStorage()
    return false
  }
}

export default {
  clearUserStorage,
  validateUserStorage,
  STORAGE_KEYS,
}


