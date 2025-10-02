import Taro from '@tarojs/taro'

// 格式化日期
export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD'): string => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
}

// 格式化数字（千分位分隔）
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 计算碳足迹
export const calculateCarbonFootprint = (plantCount: number, daysActive: number): number => {
  // 简化计算：每株植物每天吸收0.1kg二氧化碳
  return Math.round(plantCount * daysActive * 0.1 * 100) / 100
}

// 显示Toast消息
export const showToast = (message: string, duration: number = 2000) => {
  Taro.showToast({
    title: message,
    icon: 'none',
    duration
  })
}

// 显示加载中
export const showLoading = (title: string = '加载中...') => {
  Taro.showLoading({
    title,
    mask: true
  })
}

// 隐藏加载中
export const hideLoading = () => {
  Taro.hideLoading()
}

// 验证手机号
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 验证邮箱
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let lastCall = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func.apply(null, args)
    }
  }
}

// 本地存储封装
export const storage = {
  set: (key: string, value: any) => {
    try {
      Taro.setStorageSync(key, value)
    } catch (error) {
      console.error('存储失败:', error)
    }
  },
  
  get: (key: string): any => {
    try {
      return Taro.getStorageSync(key)
    } catch (error) {
      console.error('读取存储失败:', error)
      return null
    }
  },
  
  remove: (key: string) => {
    try {
      Taro.removeStorageSync(key)
    } catch (error) {
      console.error('删除存储失败:', error)
    }
  },
  
  clear: () => {
    try {
      Taro.clearStorageSync()
    } catch (error) {
      console.error('清空存储失败:', error)
    }
  }
}

// 生成随机ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}