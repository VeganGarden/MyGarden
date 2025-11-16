import { getAuthInstance, getCloudbaseApp } from '@/utils/cloudbase-init'

/**
 * 调用云函数（使用腾讯云开发Web SDK）
 */
export const callCloudFunction = async (
  functionName: string,
  data?: any
): Promise<any> => {
  try {
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
        if (resultData.code === 401) {
          try {
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_user')
            localStorage.removeItem('admin_permissions')
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          } catch {}
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
  } catch (error: any) {
    console.error(`调用云函数 ${functionName} 失败:`, error)
    
    // 处理不同类型的错误
    if (error.code) {
      // 云开发SDK错误
      const errorMessage = error.message || error.code || '未知错误'
      
      // 如果是认证错误，尝试重新登录
      if (error.code === 'AUTH_FAILED' || error.code === 401 || error.code === 'unauthenticated') {
        try {
          const auth = getAuthInstance()
          if (auth) {
            await auth.signInAnonymously()
          }
        } catch (loginError) {
          // 静默处理登录错误
        }
      }
      
      throw new Error(`云函数 ${functionName} 调用失败: ${errorMessage}`)
    }
    
    // 网络错误或其他错误
    const errorMessage = error.message || '网络错误'
    throw new Error(`云函数 ${functionName} 调用失败: ${errorMessage}`)
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
  list: (params: { 
    keyword?: string
    restaurantId?: string
    status?: string
    category?: string
    carbonLabel?: string
    page?: number
    pageSize?: number
  }) =>
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
  getStatus: (restaurantId: string) =>
    callCloudFunction('restaurant-certification', {
      action: 'getStatus',
      restaurantId,
    }),

  // 获取证书信息
  getCertificate: (certificateId: string) =>
    callCloudFunction('restaurant-certification', {
      action: 'getCertificate',
      certificateId,
    }),

  // 保存草稿
  saveDraft: (data: any) =>
    callCloudFunction('restaurant-certification', {
      action: 'saveDraft',
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

  // 获取菜单列表（根据restaurantId）
  getMenuList: (params?: { restaurantId?: string; page?: number; pageSize?: number }) =>
    callCloudFunction('restaurant-carbon-calculator', {
      action: 'getMenuList',
      ...params,
    }),

  // 获取订单碳足迹统计
  getOrderCarbonStats: (params: { startDate?: string; endDate?: string }) =>
    callCloudFunction('restaurant-carbon-calculator', {
      action: 'getOrderCarbonStats',
      ...params,
    }),

  // 生成碳报告
  generateReport: (params: { type: 'monthly' | 'yearly' | 'esg'; period: string }) =>
    callCloudFunction('restaurant-esg-report', {
      action: 'generateReport',
      ...params,
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
    list: (params?: { restaurantId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
      callCloudFunction('restaurant-order-sync', {
        action: 'list',
        ...params,
      }),
    get: (orderId: string) =>
      callCloudFunction('restaurant-order-sync', {
        action: 'get',
        orderId,
      }),
    updateStatus: (orderId: string, status: string) =>
      callCloudFunction('restaurant-order-sync', {
        action: 'updateStatus',
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
      callCloudFunction('behavior-analytics', {
        action: 'getMetrics',
        ...params,
      }),
  },

  // 优惠券管理
  coupon: {
    list: (params?: any) =>
      callCloudFunction('restaurant-campaigns', {
        action: 'listCoupons',
        ...params,
      }),
    create: (data: any) =>
      callCloudFunction('restaurant-campaigns', {
        action: 'createCoupon',
        data,
      }),
    update: (id: string, data: any) =>
      callCloudFunction('restaurant-campaigns', {
        action: 'updateCoupon',
        id,
        data,
      }),
    delete: (id: string) =>
      callCloudFunction('restaurant-campaigns', {
        action: 'deleteCoupon',
        id,
      }),
  },

  // 用户评价
  review: {
    list: (params?: any) =>
      callCloudFunction('restaurant-reviews', {
        action: 'list',
        ...params,
      }),
    reply: (reviewId: string, reply: string) =>
      callCloudFunction('restaurant-reviews', {
        action: 'reply',
        reviewId,
        reply,
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
    callCloudFunction('restaurant-dashboard', {
      action: 'getDashboard',
      ...params,
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
    // 获取餐厅列表
    list: (params?: {
      keyword?: string
      status?: string
      certificationLevel?: string
      page?: number
      pageSize?: number
    }) =>
      callCloudFunction('platform-management', {
        action: 'listRestaurants',
        ...params,
      }),

    // 获取餐厅详情
    get: (restaurantId: string) =>
      callCloudFunction('platform-management', {
        action: 'getRestaurant',
        restaurantId,
      }),

    // 创建餐厅
    create: (data: any) =>
      callCloudFunction('platform-management', {
        action: 'createRestaurant',
        data,
      }),

    // 更新餐厅
    update: (restaurantId: string, data: any) =>
      callCloudFunction('platform-management', {
        action: 'updateRestaurant',
        restaurantId,
        data,
      }),

    // 删除餐厅
    delete: (restaurantId: string) =>
      callCloudFunction('platform-management', {
        action: 'deleteRestaurant',
        restaurantId,
      }),

    // 激活餐厅
    activate: (restaurantId: string) =>
      callCloudFunction('platform-management', {
        action: 'activateRestaurant',
        restaurantId,
      }),

    // 暂停餐厅
    suspend: (restaurantId: string) =>
      callCloudFunction('platform-management', {
        action: 'suspendRestaurant',
        restaurantId,
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
    }) =>
      callCloudFunction('platform-management', {
        action: 'getCrossTenantData',
        ...params,
      }),

    // 导出跨租户数据
    export: (params: {
      tenantIds?: string[]
      dataType?: string
      startDate?: string
      endDate?: string
    }) =>
      callCloudFunction('platform-management', {
        action: 'exportCrossTenantData',
        ...params,
      }),
  },

  // 平台级统计报表
  statistics: {
    // 获取平台统计数据
    getPlatformStatistics: (params: {
      startDate?: string
      endDate?: string
      period?: '7days' | '30days' | '90days' | 'custom'
    }) =>
      callCloudFunction('platform-management', {
        action: 'getPlatformStatistics',
        ...params,
      }),

    // 获取餐厅排行榜
    getTopRestaurants: (params: {
      sortBy?: 'orders' | 'revenue' | 'carbonReduction'
      limit?: number
      startDate?: string
      endDate?: string
    }) =>
      callCloudFunction('platform-management', {
        action: 'getTopRestaurants',
        ...params,
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
  getAuditLogs: (params?: { username?: string; action?: string; status?: string; page?: number; pageSize?: number }) =>
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

export default {
  callCloudFunction,
  authAPI,
  recipeAPI,
  ingredientAPI,
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
}

