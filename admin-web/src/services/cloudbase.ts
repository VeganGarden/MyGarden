import axios, { AxiosInstance } from 'axios'

// 腾讯云开发环境配置
const CLOUDBASE_CONFIG = {
  envId: import.meta.env.VITE_CLOUDBASE_ENVID || 'my-garden-app-env-4e0h762923be2f',
  region: import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai',
}

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `https://${CLOUDBASE_CONFIG.envId}.${CLOUDBASE_CONFIG.region}.app.tcloudbase.com`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token（如果需要）
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API请求失败:', error)
    if (error.response?.status === 401) {
      // 未授权，跳转到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/**
 * 调用云函数（通过HTTP触发器）
 * 注意：需要为云函数配置HTTP触发器才能通过HTTP调用
 * 或者使用腾讯云开发Web SDK (@cloudbase/js-sdk)
 */
export const callCloudFunction = async (
  functionName: string,
  data?: any
): Promise<any> => {
  try {
    // 方案1：如果配置了HTTP触发器，直接调用
    const response = await apiClient.post(`/${functionName}`, data)
    return response
  } catch (error: any) {
    console.error(`调用云函数 ${functionName} 失败:`, error)
    
    // 方案2：如果HTTP触发器未配置，可以使用腾讯云开发Web SDK
    // 这里先抛出错误，后续可以集成 @cloudbase/js-sdk
    throw new Error(`云函数 ${functionName} 调用失败: ${error.message}`)
  }
}

/**
 * 菜谱管理API
 */
export const recipeAPI = {
  // 创建菜谱
  create: (recipe: any) =>
    callCloudFunction('recipe', { action: 'create', recipe }),

  // 更新菜谱
  update: (recipeId: string, recipe: any) =>
    callCloudFunction('recipe', { action: 'update', recipeId, recipe }),

  // 删除菜谱
  delete: (recipeId: string) =>
    callCloudFunction('recipe', { action: 'delete', recipeId }),

  // 获取菜谱详情
  get: (recipeId: string) =>
    callCloudFunction('recipe', { action: 'get', recipeId }),

  // 获取菜谱列表
  list: (params: { keyword?: string; page?: number; pageSize?: number }) =>
    callCloudFunction('recipe', { action: 'list', ...params }),

  // 批量导入
  batchImport: (recipes: any[]) =>
    callCloudFunction('recipe', { action: 'batchImport', recipes }),
}

/**
 * 食材管理API
 */
export const ingredientAPI = {
  // 获取食材详情
  get: (ingredientId: string) =>
    callCloudFunction('ingredient', { action: 'get', ingredientId }),

  // 获取食材列表
  list: (params: {
    keyword?: string
    category?: string
    page?: number
    pageSize?: number
  }) => callCloudFunction('ingredient', { action: 'list', ...params }),

  // 搜索食材
  search: (keyword: string, page?: number, pageSize?: number) =>
    callCloudFunction('ingredient', {
      action: 'search',
      keyword,
      page,
      pageSize,
    }),
}

/**
 * 碳足迹计算API
 */
export const carbonAPI = {
  // 计算菜谱碳足迹
  calculateRecipe: (data: {
    ingredients: Array<{
      ingredientId: string
      quantity: number
      unit: string
    }>
    cookingMethod: string
  }) =>
    callCloudFunction('carbon', {
      action: 'calculateRecipe',
      data,
    }),
}

export default {
  callCloudFunction,
  recipeAPI,
  ingredientAPI,
  carbonAPI,
}

