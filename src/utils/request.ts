import Taro from '@tarojs/taro'

// 请求配置
const BASE_URL = 'https://your-api-domain.com/api'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: any
}

// 请求拦截器
const requestInterceptor = (options: RequestOptions) => {
  // 添加认证token
  const token = Taro.getStorageSync('token')
  if (token) {
    options.header = {
      ...options.header,
      'Authorization': `Bearer ${token}`
    }
  }
  
  // 添加公共请求头
  options.header = {
    'Content-Type': 'application/json',
    ...options.header
  }
  
  return options
}

// 响应拦截器
const responseInterceptor = (response: any) => {
  if (response.statusCode === 401) {
    // token过期，跳转到登录页
    Taro.removeStorageSync('token')
    Taro.navigateTo({
      url: '/pages/login/index'
    })
    throw new Error('登录已过期，请重新登录')
  }
  
  if (response.statusCode !== 200) {
    throw new Error(response.data?.message || '网络请求失败')
  }
  
  return response.data
}

// 统一请求方法
export const request = async <T = any>(options: RequestOptions): Promise<T> => {
  try {
    const processedOptions = requestInterceptor(options)
    const response = await Taro.request({
      url: `${BASE_URL}${processedOptions.url}`,
      method: processedOptions.method || 'GET',
      data: processedOptions.data,
      header: processedOptions.header
    })
    
    return responseInterceptor(response)
  } catch (error) {
    Taro.showToast({
      title: error.message || '网络错误',
      icon: 'none',
      duration: 2000
    })
    throw error
  }
}

// GET请求
export const get = <T = any>(url: string, data?: any) => {
  return request<T>({
    url,
    method: 'GET',
    data
  })
}

// POST请求
export const post = <T = any>(url: string, data?: any) => {
  return request<T>({
    url,
    method: 'POST',
    data
  })
}

// PUT请求
export const put = <T = any>(url: string, data?: any) => {
  return request<T>({
    url,
    method: 'PUT',
    data
  })
}

// DELETE请求
export const del = <T = any>(url: string, data?: any) => {
  return request<T>({
    url,
    method: 'DELETE',
    data
  })
}