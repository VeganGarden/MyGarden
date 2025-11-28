import { getAuthInstance, getCloudbaseApp } from '@/utils/cloudbase-init'
import { retry, isNetworkError, isPermissionError } from '@/utils/retry'

/**
 * 调用云函数（使用腾讯云开发Web SDK）
 * 支持自动重试机制
 */
export const callCloudFunction = async (
  functionName: string,
  data?: any,
  retryOptions?: { maxRetries?: number; retryDelay?: number }
): Promise<any> => {
  // 使用重试机制包装云函数调用
  return retry(
    async () => {
      // 确保云开发环境已初始化
      const app = await getCloudbaseApp()
      
      // 确保已登录（匿名登录）
      // 注意：使用全局的 auth 实例，避免重复创建
      try {
        const auth = getAuthInstance()
        if (auth) {
          const loginState = await auth.getLoginState()
          
          if (!loginState) {
            try {
              await auth.signInAnonymously()
            } catch (signInError: any) {
              // 忽略重复登录错误
              if (signInError.code !== 'ALREADY_SIGNED_IN') {
                // 静默处理登录错误，不阻止云函数调用
              }
            }
          }
        }
      } catch (authError: any) {
        // 静默处理认证错误，不阻止云函数调用
      }
      
      // 使用云开发SDK调用云函数
      // 透传后端鉴权所需的 token（用于函数内权限校验）
      const token = (typeof window !== 'undefined' && localStorage.getItem('admin_token')) || ''
      const payload = { ...(data || {}) }
      if (token && !payload.token) {
        payload.token = token
      }
      
      const result = await app.callFunction({
        name: functionName,
        data: payload,
      })
      
      // 检查返回结果
      // 云开发SDK返回格式: { result: {...}, requestId: '...' }
      if (result && result.result) {
        const resultData = result.result
        
        // 如果云函数返回的是 { code, message, data } 格式
        if (resultData.code !== undefined) {
          // 处理权限错误
          if (resultData.code === 401 || resultData.code === 403) {
            try {
              localStorage.removeItem('admin_token')
              localStorage.removeItem('admin_user')
              localStorage.removeItem('admin_permissions')
              if (typeof window !== 'undefined') {
                window.location.href = '/login'
              }
            } catch {}
            throw new Error(resultData.message || '未授权访问，请先登录')
          }
          
          // 对于权限错误，不重试
          if (resultData.code === 403) {
            const permissionError = new Error(resultData.message || '无权限访问')
            ;(permissionError as any).code = 403
            throw permissionError
          }
          
          return resultData
        }
        
        // 如果直接返回数据对象
        if (resultData.data !== undefined) {
          return {
            code: 0,
            ...resultData,
          }
        }
        
        // 如果直接返回数据（数组或其他）
        return {
          code: 0,
          data: resultData,
        }
      }
      
      // 如果没有 result 字段，返回原始结果
      return {
        code: 0,
        data: result,
      }
    },
    {
      maxRetries: retryOptions?.maxRetries ?? 3,
      retryDelay: retryOptions?.retryDelay ?? 1000,
      retryCondition: (error: any) => {
        // 权限错误不重试
        if (isPermissionError(error) || error?.code === 403 || error?.code === 401) {
          return false
        }
        // 网络错误或5xx错误才重试
        return isNetworkError(error) || error?.code >= 500
      }
    }
  ).catch((error: any) => {
    console.error(`调用云函数 ${functionName} 失败:`, error)
    
    // 处理权限错误
    if (isPermissionError(error) || error?.code === 403 || error?.code === 401) {
      try {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        localStorage.removeItem('admin_permissions')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      } catch {}
    }
    
    // 处理不同类型的错误
    if (error.code) {
      const errorMessage = error.message || error.code || '未知错误'
      throw new Error(`云函数 ${functionName} 调用失败: ${errorMessage}`)
    }
    
    // 网络错误或其他错误
    const errorMessage = error.message || '网络错误'
    throw new Error(`云函数 ${functionName} 调用失败: ${errorMessage}`)
  })
}

/**
 * 菜谱管理API
 */
export const recipeAPI = {
  // 创建菜谱（租户隔离）
  create: (recipe: any) =>
    callCloudFunction('recipe', { action: 'create', recipe }),

  // 更新菜谱（租户隔离）
  update: (recipeId: string, recipe: any) =>
    callCloudFunction('recipe', { action: 'update', recipeId, recipe }),

  // 删除菜谱（租户隔离）
  delete: (recipeId: string) =>
    callCloudFunction('recipe', { action: 'delete', recipeId }),

  // 获取菜谱详情
  get: (recipeId: string) =>
    callCloudFunction('recipe', { action: 'get', recipeId }),

  // 获取菜谱列表
  list: (params: { 
    keyword?: string
    restaurantId?: string
    status?: string
    category?: string
    carbonLabel?: string
    isBaseRecipe?: boolean
    page?: number
    pageSize?: number
  }) =>
    callCloudFunction('recipe', { action: 'list', ...params }),

  // 批量导入
  batchImport: (recipes: any[]) =>
    callCloudFunction('recipe', { action: 'batchImport', recipes }),

  // ===== 基础食谱管理（仅平台运营者） =====
  // 创建基础食谱
  createBase: (data: any) =>
    callCloudFunction('recipe', { action: 'createBaseRecipe', data }),

  // 更新基础食谱
  updateBase: (recipeId: string, data: any) =>
    callCloudFunction('recipe', { action: 'updateBaseRecipe', recipeId, data }),

  // 删除基础食谱
  deleteBase: (recipeId: string) =>
    callCloudFunction('recipe', { action: 'deleteBaseRecipe', recipeId }),
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

  // ===== 基础食材管理（仅平台运营者） =====
  // 创建基础食材
  createBase: (data: any) =>
    callCloudFunction('ingredient', { action: 'createBaseIngredient', data }),

  // 更新基础食材
  updateBase: (ingredientId: string, data: any) =>
    callCloudFunction('ingredient', { action: 'updateBaseIngredient', ingredientId, data }),

  // 删除基础食材
  deleteBase: (ingredientId: string) =>
    callCloudFunction('ingredient', { action: 'deleteBaseIngredient', ingredientId }),
}

/**
 * 基础荤食食材API
 */
export const meatIngredientAPI = {
  // 获取单个荤食食材
  get: (ingredientId: string) =>
    callCloudFunction('meat-ingredient', { action: 'get', ingredientId }),

  // 获取荤食食材列表
  list: (params?: { keyword?: string; category?: string; page?: number; pageSize?: number }) =>
    callCloudFunction('meat-ingredient', {
      action: 'list',
      ...params,
    }),

  // 搜索荤食食材
  search: (keyword: string, page?: number, pageSize?: number) =>
    callCloudFunction('meat-ingredient', {
      action: 'search',
      keyword,
      page,
      pageSize,
    }),

  // 创建基础荤食食材
  createBase: (data: any) =>
    callCloudFunction('meat-ingredient', { action: 'createBaseMeatIngredient', data }),

  // 更新基础荤食食材
  updateBase: (ingredientId: string, data: any) =>
    callCloudFunction('meat-ingredient', { action: 'updateBaseMeatIngredient', ingredientId, data }),

  // 删除基础荤食食材
  deleteBase: (ingredientId: string) =>
    callCloudFunction('meat-ingredient', { action: 'deleteBaseMeatIngredient', ingredientId }),
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

/**
 * 气候餐厅认证API
 */
export const certificationAPI = {
  // 提交认证申请
  apply: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'apply',
      data,
    }),

  // 获取认证状态
  getStatus: (data: { restaurantId?: string; applicationId?: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'getStatus',
      data,
    }),

  // 获取证书信息
  getCertificate: (data: { restaurantId?: string; certificateId?: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'getCertificate',
      data,
    }),

  // 保存草稿
  saveDraft: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'saveDraft',
      data,
    }),

  // 获取草稿
  getDraft: (data: { restaurantId: string; tenantId: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'getDraft',
      data,
    }),

  // 系统评估
  systemEvaluate: (data: { applicationId: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'systemEvaluate',
      data,
    }),

  // 更新认证资料
  updateMaterials: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'updateMaterials',
      data,
    }),

  // 获取资料历史版本
  getMaterialHistory: (data: { restaurantId: string; materialType: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'getMaterialHistory',
      data,
    }),

  // 导出认证资料
  exportMaterials: (data: { restaurantId: string; format?: string; fields?: string[] }) =>
    callCloudFunction('restaurant-certification', {
      action: 'exportMaterials',
      data,
    }),

  // 审核操作（平台运营）
  review: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'review',
      data,
    }),

  // 修复审核数据（清理错误的审核记录）
  fixReviewData: (data?: { applicationId?: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'fixReviewData',
      data: data || {},
    }),

  // 生成证书
  generateCertificate: (data: { applicationId: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'generateCertificate',
      data,
    }),

  // 创建抽检任务
  createInspection: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'createInspection',
      data,
    }),

  // 获取抽检记录
  getInspection: (data: { inspectionId?: string; applicationId?: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'getInspection',
      data,
    }),

  // 更新抽检记录
  updateInspection: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'updateInspection',
      data,
    }),

  // 获取抽检列表
  listInspections: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'listInspections',
      data,
    }),

  // 获取试运营数据（用于自动填充认证申请）
  getTrialData: (data: { restaurantId: string; tenantId: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'getTrialData',
      data,
    }),

  // 获取餐厅菜单项（用于导入餐厅菜品）
  getRestaurantMenuItems: (data: { restaurantId: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'getRestaurantMenuItems',
      data,
    }),

  // 获取认证申请列表（平台运营）
  listApplications: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'listApplications',
      data,
    }),

  // 上传文件
  uploadFile: (data: { base64: string; fileName: string; fileType?: string; documentType?: string }) =>
    callCloudFunction('restaurant-certification', {
      action: 'uploadFile',
      data,
    }),
}

/**
 * 碳足迹核算API
 */
export const carbonFootprintAPI = {
  // 计算菜单碳足迹
  calculateMenu: (menuItem: any) =>
    callCloudFunction('restaurant-carbon-calculator', {
      action: 'calculateMenu',
      menuItem,
    }),

  // 批量计算菜单碳足迹
  batchCalculateMenu: (menuItems: any[]) =>
    callCloudFunction('restaurant-carbon-calculator', {
      action: 'batchCalculateMenu',
      menuItems,
    }),

  // 获取订单碳足迹统计
  getOrderCarbonStats: (params: { restaurantId?: string; startDate?: string; endDate?: string }) =>
    callCloudFunction('tenant', {
      action: 'getOrderCarbonStats',
      ...params,
    }),

  // 生成碳报告
  generateReport: (params: { restaurantId?: string; type: 'monthly' | 'yearly' | 'esg'; period: string }) =>
    callCloudFunction('tenant', {
      action: 'generateCarbonReport',
      ...params,
    }),

  // 计算菜谱碳足迹（含基准值）
  calculateMenuItemCarbon: (data: {
    restaurantId: string
    mealType: 'meat_simple' | 'meat_full'
    energyType: 'electric' | 'gas' | 'mixed'
    ingredients?: Array<{ ingredientId: string; weight: number; unit?: string }>
    cookingMethod?: string
    cookingTime?: number
    packaging?: { type: string; weight?: number }
  }) =>
    callCloudFunction('restaurant-menu-carbon', {
      action: 'calculateMenuItemCarbon',
      data,
    }),

  // 批量重新计算菜谱碳足迹
  recalculateMenuItems: (data: {
    restaurantId: string
    menuItemIds?: string[]
  }) =>
    callCloudFunction('restaurant-menu-carbon', {
      action: 'recalculateMenuItems',
      data,
    }),

  // 获取菜单列表（含碳足迹信息）
  getMenuList: (params: { restaurantId: string; page?: number; pageSize?: number }) =>
    callCloudFunction('tenant', {
      action: 'getMenuList',
      data: params,
    }),
}

/**
 * 供应链溯源API
 */
export const traceabilityAPI = {
  // 供应商管理
  supplier: {
    list: (params?: any) =>
      callCloudFunction('traceability-chain', {
        action: 'listSuppliers',
        ...params,
      }),
    create: (data: any) =>
      callCloudFunction('traceability-chain', {
        action: 'createSupplier',
        data,
      }),
    update: (id: string, data: any) =>
      callCloudFunction('traceability-chain', {
        action: 'updateSupplier',
        id,
        data,
      }),
    delete: (id: string) =>
      callCloudFunction('traceability-chain', {
        action: 'deleteSupplier',
        id,
      }),
  },

  // 食材批次管理
  batch: {
    list: (params?: any) =>
      callCloudFunction('traceability-chain', {
        action: 'listBatches',
        ...params,
      }),
    create: (data: any) =>
      callCloudFunction('traceability-chain', {
        action: 'createBatch',
        data,
      }),
    update: (id: string, data: any) =>
      callCloudFunction('traceability-chain', {
        action: 'updateBatch',
        id,
        data,
      }),
    delete: (id: string) =>
      callCloudFunction('traceability-chain', {
        action: 'deleteBatch',
        id,
      }),
  },

  // 溯源链查询
  query: (params: { dishName?: string; batchNo?: string }) =>
    callCloudFunction('traceability-query', {
      action: 'query',
      ...params,
    }),

  // 生成溯源证书
  generateCertificate: (traceabilityId: string) =>
    callCloudFunction('traceability-certificate', {
      action: 'generate',
      traceabilityId,
    }),
}

/**
 * 餐厅运营API
 */
export const operationAPI = {
  // 订单管理
  order: {
    list: (params?: { restaurantId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number; status?: string; keyword?: string }) =>
      callCloudFunction('tenant', {
        action: 'listOrders',
        data: params,
      }),
    get: (orderId: string) =>
      callCloudFunction('tenant', {
        action: 'getOrder',
        orderId,
      }),
    updateStatus: (orderId: string, status: string) =>
      callCloudFunction('tenant', {
        action: 'updateOrderStatus',
        orderId,
        status,
      }),
  },

  // 运营台账
  ledger: {
    list: (params?: any) =>
      callCloudFunction('restaurant-operation', {
        action: 'listLedger',
        ...params,
      }),
    create: (data: any) =>
      callCloudFunction('restaurant-operation', {
        action: 'createLedger',
        data,
      }),
    update: (id: string, data: any) =>
      callCloudFunction('restaurant-operation', {
        action: 'updateLedger',
        id,
        data,
      }),
    delete: (id: string) =>
      callCloudFunction('restaurant-operation', {
        action: 'deleteLedger',
        id,
      }),
  },

  // 行为统计
  behavior: {
    getMetrics: (params?: any) =>
      callCloudFunction('tenant', {
        action: 'getBehaviorMetrics',
        data: params,
      }),
  },

  // 优惠券管理
  coupon: {
    list: (params?: any) =>
      callCloudFunction('tenant', {
        action: 'listCoupons',
        data: params,
      }),
    create: (data: any) =>
      callCloudFunction('tenant', {
        action: 'createCoupon',
        data: data,
      }),
    update: (id: string, data: any) =>
      callCloudFunction('tenant', {
        action: 'updateCoupon',
        data: { id, data },
      }),
    delete: (id: string) =>
      callCloudFunction('tenant', {
        action: 'deleteCoupon',
        data: { id },
      }),
  },

  // 用户评价
  review: {
    list: (params?: any) =>
      callCloudFunction('tenant', {
        action: 'listReviews',
        data: params,
      }),
    reply: (reviewId: string, reply: string) =>
      callCloudFunction('tenant', {
        action: 'replyReview',
        data: { reviewId, reply },
      }),
  },
}

/**
 * 报表API
 */
export const reportAPI = {
  // 经营数据报表
  business: (params: { startDate?: string; endDate?: string }) =>
    callCloudFunction('restaurant-esg-report', {
      action: 'businessReport',
      ...params,
    }),

  // 碳减排报表
  carbon: (params: { startDate?: string; endDate?: string }) =>
    callCloudFunction('restaurant-esg-report', {
      action: 'carbonReport',
      ...params,
    }),

  // ESG报告
  esg: (params: { period: string; type: 'monthly' | 'yearly' }) =>
    callCloudFunction('restaurant-esg-report', {
      action: 'esgReport',
      ...params,
    }),

  // 数据看板
  dashboard: (params?: any) =>
    callCloudFunction('tenant', {
      action: 'getDashboard',
      data: params,
    }),
}

/**
 * 租户和餐厅管理API
 */
export const tenantAPI = {
  // 获取租户信息
  getTenant: (tenantId: string) =>
    callCloudFunction('tenant', {
      action: 'getTenant',
      data: { tenantId },
    }),

  // 获取所有租户列表（平台管理员）
  getAllTenants: () =>
    callCloudFunction('tenant', {
      action: 'getAllTenants',
      data: {},
    }),

  // 创建租户（平台管理员）
  create: (data: {
    name: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
  }) =>
    callCloudFunction('tenant', {
      action: 'createTenant',
      data,
    }),

  // 更新租户信息（平台管理员）
  update: (tenantId: string, data: {
    name?: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
  }) =>
    callCloudFunction('tenant', {
      action: 'updateTenant',
      data: {
        tenantId,
        ...data,
      },
    }),

  // 更新租户状态（平台管理员）
  updateStatus: (tenantId: string, status: 'active' | 'suspended' | 'inactive') =>
    callCloudFunction('tenant', {
      action: 'updateTenantStatus',
      data: {
        tenantId,
        status,
      },
    }),

  // 删除租户（平台管理员）
  delete: (tenantId: string) =>
    callCloudFunction('tenant', {
      action: 'deleteTenant',
      data: { tenantId },
    }),

  // 更新租户配置（平台管理员）
  updateConfig: (tenantId: string, config: any) =>
    callCloudFunction('tenant', {
      action: 'updateTenantConfig',
      data: {
        tenantId,
        config,
      },
    }),

  // 获取餐厅列表
  getRestaurants: (params?: { tenantId?: string; restaurantId?: string }) =>
    callCloudFunction('tenant', {
      action: 'getRestaurants',
      data: params,
    }),

  // 创建租户
  createTenant: (data: any) =>
    callCloudFunction('tenant', {
      action: 'createTenant',
      data,
    }),

  // 创建餐厅
  createRestaurant: (data: any) =>
    callCloudFunction('tenant', {
      action: 'createRestaurant',
      data,
    }),

  // 更新餐厅信息
  updateRestaurant: (restaurantId: string, data: any) =>
    callCloudFunction('tenant', {
      action: 'updateRestaurant',
      data: { restaurantId, ...data },
    }),

  // 创建菜谱
  createMenuItem: (data: any) =>
    callCloudFunction('tenant', {
      action: 'createMenuItem',
      data,
    }),

  // 从基础菜谱创建餐厅菜单项
  createMenuItemFromRecipe: (params: {
    recipeId: string
    restaurantId: string
    customFields?: {
      name?: string
      description?: string
      category?: string
      cuisine?: string
      price?: number
      nutrition?: any
      mealType?: string
      energyType?: string
      tags?: any
      isAvailable?: boolean
      status?: string
    }
  }) =>
    callCloudFunction('tenant', {
      action: 'createMenuItemFromRecipe',
      data: params,
    }),

  // 查询已添加到菜单的基础菜谱ID列表
  getAddedBaseRecipeIds: (params: { restaurantId: string }) =>
    callCloudFunction('tenant', {
      action: 'getAddedBaseRecipeIds',
      data: params,
    }),

  // 从餐厅菜单中移出基础菜谱
  removeRecipeFromMenu: (params: { recipeId: string; restaurantId: string }) =>
    callCloudFunction('tenant', {
      action: 'removeRecipeFromMenu',
      data: params,
    }),

  // 更新菜单项
  updateMenuItem: (params: {
    menuItemId: string
    restaurantId: string
    updateData: {
      name?: string
      description?: string
      price?: number
      category?: string
      status?: string
      isAvailable?: boolean
      nutrition?: any
      tags?: any
    }
  }) =>
    callCloudFunction('tenant', {
      action: 'updateMenuItem',
      data: params,
    }),

  // 根据restaurantId获取餐厅相关数据
  getRestaurantData: (params: {
    restaurantId: string
    dataType: 'menu' | 'order' | 'recipe' | 'carbon' | 'all'
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }) =>
    callCloudFunction('tenant', {
      action: 'getRestaurantData',
      data: params,
    }),

  // 获取菜单列表（根据restaurantId）
  getMenuList: (params?: { restaurantId?: string; page?: number; pageSize?: number }) =>
    callCloudFunction('tenant', {
      action: 'getMenuList',
      data: params,
    }),
}

/**
 * 管理后台认证API
 */
export const authAPI = {
  // 登录
  login: (username: string, password: string) =>
    callCloudFunction('admin-auth', {
      action: 'login',
      data: { username, password },
    }),

  // 验证Token
  verifyToken: (token: string) =>
    callCloudFunction('admin-auth', {
      action: 'verifyToken',
      data: { token },
    }),
}

/**
 * 用户管理API
 */
export const userAPI = {
  // 获取用户信息
  getProfile: () =>
    callCloudFunction('user', {
      action: 'getProfile',
    }),

  // 更新用户信息
  updateProfile: (data: { name?: string; email?: string; phone?: string }) =>
    callCloudFunction('user', {
      action: 'updateProfile',
      data,
    }),

  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    callCloudFunction('user', {
      action: 'changePassword',
      data,
    }),

  // 获取活动日志
  getActivityLogs: (params?: { userId?: string; restaurantId?: string; page?: number; pageSize?: number }) =>
    callCloudFunction('user', {
      action: 'getActivityLogs',
      ...params,
    }),

  // 更新通知设置
  updateNotificationSettings: (settings: any) =>
    callCloudFunction('user', {
      action: 'updateNotificationSettings',
      settings,
    }),
}

/**
 * 平台管理API（仅平台管理员可用）
 */
export const platformAPI = {
  // 餐厅列表管理
  restaurant: {
    // 获取餐厅列表（跨租户）
    list: (params?: {
      keyword?: string
      status?: string
      certificationLevel?: string
      tenantId?: string
      page?: number
      pageSize?: number
    }) =>
      callCloudFunction('tenant', {
        action: 'listAllRestaurants',
        data: params || {},
      }),

    // 获取餐厅详情（使用tenant云函数的getRestaurants）
    get: (restaurantId: string) =>
      callCloudFunction('tenant', {
        action: 'getRestaurants',
        data: {
          restaurantId,
        },
      }),

    // 创建餐厅（使用tenant云函数）
    create: (data: any) =>
      callCloudFunction('tenant', {
        action: 'createRestaurant',
        data,
      }),

    // 更新餐厅（使用tenant云函数）
    update: (restaurantId: string, data: any) =>
      callCloudFunction('tenant', {
        action: 'updateRestaurant',
        data: {
          restaurantId,
          ...data,
        },
      }),

    // 删除餐厅（暂不支持，使用更新状态代替）
    delete: (restaurantId: string) =>
      callCloudFunction('tenant', {
        action: 'updateRestaurantStatus',
        data: {
          restaurantId,
          status: 'inactive',
        },
      }),

    // 激活餐厅
    activate: (restaurantId: string) =>
      callCloudFunction('tenant', {
        action: 'updateRestaurantStatus',
        data: {
          restaurantId,
          status: 'active',
        },
      }),

    // 暂停餐厅
    suspend: (restaurantId: string) =>
      callCloudFunction('tenant', {
        action: 'updateRestaurantStatus',
        data: {
          restaurantId,
          status: 'suspended',
        },
      }),

    // 更新认证等级
    updateCertification: (restaurantId: string, certificationLevel: string | null) =>
      callCloudFunction('tenant', {
        action: 'updateRestaurantCertification',
        data: {
          restaurantId,
          certificationLevel,
        },
      }),
  },

  // 跨租户数据查看
  crossTenant: {
    // 获取跨租户数据
    getData: (params: {
      tenantIds?: string[]
      dataType?: 'order' | 'carbon' | 'user' | 'revenue' | 'all'
      startDate?: string
      endDate?: string
      page?: number
      pageSize?: number
      groupBy?: 'tenant' | 'date' | 'restaurant'
    }) =>
      callCloudFunction('tenant', {
        action: 'getCrossTenantData',
        data: params,
      }),

    // 导出跨租户数据（暂时返回数据，前端处理导出）
    export: (params: {
      tenantIds?: string[]
      dataType?: string
      startDate?: string
      endDate?: string
    }) =>
      callCloudFunction('tenant', {
        action: 'getCrossTenantData',
        data: {
          ...params,
          page: 1,
          pageSize: 10000, // 导出时获取所有数据
        },
      }),
  },

  // 平台级统计报表
  statistics: {
    // 获取平台统计数据
    getPlatformStatistics: (params: {
      startDate?: string
      endDate?: string
      period?: '7days' | '30days' | '90days' | 'custom'
      includeTrends?: boolean
    }) =>
      callCloudFunction('tenant', {
        action: 'getPlatformStatistics',
        data: params || {},
      }),

    // 获取餐厅排行榜
    getTopRestaurants: (params: {
      sortBy?: 'orders' | 'revenue' | 'carbonReduction'
      limit?: number
      startDate?: string
      endDate?: string
    }) =>
      callCloudFunction('tenant', {
        action: 'getTopRestaurants',
        data: params,
      }),

    // 导出平台统计报表
    exportReport: (params: {
      type: 'summary' | 'detailed' | 'comparison'
      startDate?: string
      endDate?: string
    }) =>
      callCloudFunction('platform-management', {
        action: 'exportPlatformReport',
        ...params,
      }),
  },
}

/**
 * 入驻申请与账号审批 API
 */
export const onboardingAPI = {
  // 提交入驻申请（餐厅管理员/租户自助）
  apply: (data: {
    organizationName: string
    contactName: string
    contactPhone: string
    contactEmail?: string
    restaurantCount?: number
    city?: string
    note?: string
  }) =>
    callCloudFunction('tenant', {
      action: 'applyForOnboarding',
      data,
    }),

  // 平台侧：获取入驻申请列表
  listApplications: (params?: {
    status?: 'pending' | 'approved' | 'rejected'
    keyword?: string
    page?: number
    pageSize?: number
  }) =>
    callCloudFunction('tenant', {
      action: 'listOnboardingApplications',
      data: params || {},
    }),

  // 平台侧：审批通过（可选择自动创建账号与租户）
  approve: (applicationId: string, options?: { createAccount?: boolean }) =>
    callCloudFunction('tenant', {
      action: 'approveOnboardingApplication',
      data: { applicationId, ...(options || {}) },
    }),

  // 平台侧：驳回
  reject: (applicationId: string, reason?: string) =>
    callCloudFunction('tenant', {
      action: 'rejectOnboardingApplication',
      data: { applicationId, reason },
    }),
}

/**
 * 管理员账号（仅后台邀请/创建）
 */
export const adminUsersAPI = {
  // 创建管理员账号（受控角色）
  create: (data: {
    username: string
    password: string
    name?: string
    email?: string
    phone?: string
    role: 'system_admin' | 'platform_operator' | 'carbon_specialist'
  }) =>
    callCloudFunction('tenant', {
      action: 'createAdminUser',
      data,
    }),

  // 列表
  list: (params?: {
    status?: 'active' | 'disabled'
    role?: string
    keyword?: string
    page?: number
    pageSize?: number
  }) =>
    callCloudFunction('tenant', {
      action: 'listAdminUsers',
      data: params || {},
    }),

  // 更新状态
  updateStatus: (userId: string, status: 'active' | 'disabled') =>
    callCloudFunction('tenant', {
      action: 'updateAdminUserStatus',
      data: { userId, status },
    }),

  // 重置密码
  resetPassword: (userId: string) =>
    callCloudFunction('tenant', {
      action: 'resetAdminUserPassword',
      data: { userId },
    }),

  // 软删除
  softDelete: (userId: string) =>
    callCloudFunction('tenant', {
      action: 'softDeleteAdminUser',
      data: { userId },
    }),
}

/**
 * 消息管理 API
 */
export const messageAPI = {
  // 获取用户消息列表
  getUserMessages: (params?: {
    userId?: string
    status?: 'sent' | 'read'
    page?: number
    pageSize?: number
  }) =>
    callCloudFunction('message-manage', {
      action: 'getUserMessages',
      data: params || {},
    }),

  // 标记消息为已读
  markAsRead: (data: { userMessageId?: string; messageId?: string; userId?: string }) =>
    callCloudFunction('message-manage', {
      action: 'markAsRead',
      data,
    }),

  // 批量标记全部为已读
  markAllAsRead: (data: { userId: string }) =>
    callCloudFunction('message-manage', {
      action: 'markAllAsRead',
      data,
    }),

  // 获取消息详情
  getMessage: (messageId: string) =>
    callCloudFunction('message-manage', {
      action: 'getMessage',
      data: { messageId },
    }),

  // 创建消息（管理员）
  createMessage: (data: {
    title: string
    content: string
    type?: 'business' | 'system'
    priority?: 'urgent' | 'important' | 'normal'
    sendType?: 'immediate' | 'scheduled'
    scheduledTime?: Date
    targetType?: 'all' | 'specific' | 'role'
    targetUsers?: string[]
    targetRoles?: string[]
    link?: string
  }) =>
    callCloudFunction('message-manage', {
      action: 'createMessage',
      data,
    }),

  // 发送消息
  sendMessage: (messageId: string) =>
    callCloudFunction('message-manage', {
      action: 'sendMessage',
      data: { messageId },
    }),
}

/**
 * 系统域 API（仅系统管理员）
 */
export const systemAPI = {
  // 角色配置
  listRoleConfigs: (params?: { status?: 'active' | 'inactive'; page?: number; pageSize?: number }) =>
    callCloudFunction('tenant', {
      action: 'listRoleConfigs',
      data: params || {},
    }),
  listPermissions: () =>
    callCloudFunction('tenant', {
      action: 'listPermissions',
    }),
  createRoleConfig: (data: { roleCode: string; roleName: string; description?: string; permissions?: string[]; status?: 'active' | 'inactive' }) =>
    callCloudFunction('tenant', {
      action: 'createRoleConfig',
      data,
    }),
  updateRolePermissions: (roleCode: string, permissions: string[], moduleAccess?: any) =>
    callCloudFunction('tenant', {
      action: 'updateRolePermissions',
      data: { roleCode, permissions, moduleAccess },
    }),
  updateRoleStatus: (roleCode: string, status: 'active' | 'inactive') =>
    callCloudFunction('tenant', {
      action: 'updateRoleStatus',
      data: { roleCode, status },
    }),

  // 审计日志
  getAuditLogs: (params?: {
    username?: string
    action?: string
    status?: string
    module?: string
    tenantId?: string
    resource?: string
    startDate?: string
    endDate?: string
    timeRange?: [string, string]
    keyword?: string
    page?: number
    pageSize?: number
  }) =>
    callCloudFunction('tenant', {
      action: 'getAuditLogs',
      data: params || {},
    }),

  // 系统监控
  getSystemMetrics: () =>
    callCloudFunction('tenant', {
      action: 'getSystemMetrics',
    }),

  // 备份导出（占位）
  runBackupExport: () =>
    callCloudFunction('tenant', {
      action: 'runBackupExport',
    }),
  // 个人资料
  uploadAvatar: (data: { base64: string; ext?: string }) =>
    callCloudFunction('tenant', {
      action: 'uploadAvatar',
      data,
    }),
  updateProfile: (data: { name?: string; email?: string; phone?: string; avatarUrl?: string }) =>
    callCloudFunction('tenant', {
      action: 'updateProfile',
      data,
    }),
  updatePassword: (data: { oldPassword: string; newPassword: string }) =>
    callCloudFunction('tenant', {
      action: 'updatePassword',
      data,
    }),
}

// 导出素食人员API
export { staffAPI, customerAPI, vegetarianPersonnelStatsAPI } from './vegetarianPersonnel'

export default {
  callCloudFunction,
  authAPI,
  recipeAPI,
  ingredientAPI,
  meatIngredientAPI,
  carbonAPI,
  certificationAPI,
  carbonFootprintAPI,
  traceabilityAPI,
  operationAPI,
  reportAPI,
  platformAPI,
  userAPI,
  tenantAPI,
  adminUsersAPI,
  onboardingAPI,
  systemAPI,
  messageAPI,
}

