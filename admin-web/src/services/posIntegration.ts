/**
 * 收银系统集成API服务
 */
import { callCloudFunction } from './cloudbase'

/**
 * 收银系统集成配置接口
 */
export interface PosIntegration {
  _id: string
  restaurantId: string
  posSystem: string // 收银系统类型
  apiUrl: string // API地址
  apiKey: string // API密钥
  secretKey?: string // 签名密钥（加密存储，查询时不返回）
  webhookUrl?: string // Webhook回调地址
  status: 'active' | 'inactive'
  lastSyncAt?: string
  syncStats?: {
    totalSyncs: number
    successSyncs: number
    failedSyncs: number
  }
  createdAt: string
  updatedAt: string
}

/**
 * 创建集成配置数据
 */
export interface CreateIntegrationData {
  restaurantId: string
  posSystem: string
  apiUrl: string
  apiKey: string
  secretKey: string
  webhookUrl?: string
  status?: 'active' | 'inactive'
}

/**
 * 更新集成配置数据
 */
export interface UpdateIntegrationData {
  apiUrl?: string
  apiKey?: string
  secretKey?: string
  webhookUrl?: string
  status?: 'active' | 'inactive'
}

/**
 * 发布菜单数据
 */
export interface PublishMenuData {
  restaurantId: string
  syncType: 'full' | 'incremental'
  menuItemIds?: string[] // 增量发布时指定菜单项ID列表
  integrationId?: string // 指定集成配置ID，不传则使用默认激活的集成
}

/**
 * 发布菜单结果
 */
export interface PublishMenuResult {
  syncId: string
  totalCount: number
  successCount: number
  failedCount: number
  failedItems: Array<{
    itemId: string
    reason: string
  }>
  syncAt: string
}

/**
 * 同步历史记录
 */
export interface SyncLog {
  _id: string
  restaurantId: string
  action: 'pushMenu' | 'syncOrder'
  posSystem: string
  syncType: 'full' | 'incremental'
  status: 'success' | 'failed'
  totalCount: number
  successCount: number
  failedCount: number
  failedItems: Array<{
    itemId: string
    reason: string
  }>
  duration: number
  error?: string
  createdAt: string
}

/**
 * 同步历史查询参数
 */
export interface SyncHistoryParams {
  restaurantId: string
  page?: number
  pageSize?: number
  status?: 'success' | 'failed'
  action?: 'pushMenu' | 'syncOrder'
  startDate?: string
  endDate?: string
}

/**
 * 收银系统集成API
 */
export const posIntegrationAPI = {
  /**
   * 获取集成配置列表
   */
  getIntegrations: async (restaurantId: string): Promise<PosIntegration[]> => {
    try {
      const result = await callCloudFunction('tenant', {
        action: 'queryCollection',
        data: {
          collection: 'pos_integrations',
          where: {
            restaurantId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      })

      if (result.code === 0 && result.data) {
        return Array.isArray(result.data) ? result.data : result.data.list || []
      }
      return []
    } catch (error: any) {
      console.error('获取集成配置失败:', error)
      throw new Error(error.message || '获取集成配置失败')
    }
  },

  /**
   * 创建集成配置
   */
  createIntegration: async (
    data: CreateIntegrationData
  ): Promise<PosIntegration> => {
    try {
      const result = await callCloudFunction('tenant', {
        action: 'addDocument',
        data: {
          collection: 'pos_integrations',
          data: {
            ...data,
            status: data.status || 'active',
            syncStats: {
              totalSyncs: 0,
              successSyncs: 0,
              failedSyncs: 0,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      })

      if (result.code === 0 && result.data) {
        return result.data
      }
      throw new Error(result.message || '创建集成配置失败')
    } catch (error: any) {
      console.error('创建集成配置失败:', error)
      throw new Error(error.message || '创建集成配置失败')
    }
  },

  /**
   * 更新集成配置
   */
  updateIntegration: async (
    id: string,
    data: UpdateIntegrationData
  ): Promise<PosIntegration> => {
    try {
      const result = await callCloudFunction('tenant', {
        action: 'updateDocument',
        data: {
          collection: 'pos_integrations',
          docId: id,
          data: {
            ...data,
            updatedAt: new Date().toISOString(),
          },
        },
      })

      if (result.code === 0 && result.data) {
        return result.data
      }
      throw new Error(result.message || '更新集成配置失败')
    } catch (error: any) {
      console.error('更新集成配置失败:', error)
      throw new Error(error.message || '更新集成配置失败')
    }
  },

  /**
   * 删除集成配置
   */
  deleteIntegration: async (id: string): Promise<void> => {
    try {
      const result = await callCloudFunction('tenant', {
        action: 'deleteDocument',
        data: {
          collection: 'pos_integrations',
          docId: id,
        },
      })

      if (result.code !== 0) {
        throw new Error(result.message || '删除集成配置失败')
      }
    } catch (error: any) {
      console.error('删除集成配置失败:', error)
      throw new Error(error.message || '删除集成配置失败')
    }
  },

  /**
   * 测试连接
   */
  testConnection: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // 先获取集成配置
      const integration = await posIntegrationAPI.getIntegrations('')
      const config = integration.find((item) => item._id === id)

      if (!config) {
        return {
          success: false,
          message: '集成配置不存在',
        }
      }

      // 调用pos-interface云函数测试连接
      const result = await callCloudFunction('pos-interface', {
        action: 'testConnection',
        data: {
          integrationId: id,
        },
      })

      if (result.code === 0) {
        return {
          success: true,
          message: result.message || '连接成功',
        }
      }

      return {
        success: false,
        message: result.message || '连接失败',
      }
    } catch (error: any) {
      console.error('测试连接失败:', error)
      return {
        success: false,
        message: error.message || '测试连接失败',
      }
    }
  },

  /**
   * 发布菜单
   */
  publishMenu: async (data: PublishMenuData): Promise<PublishMenuResult> => {
    try {
      const result = await callCloudFunction('pos-interface', {
        action: 'pushMenu',
        data,
      })

      if (result.code === 0 && result.data) {
        return result.data
      }
      throw new Error(result.message || '发布菜单失败')
    } catch (error: any) {
      console.error('发布菜单失败:', error)
      throw new Error(error.message || '发布菜单失败')
    }
  },

  /**
   * 获取发布历史
   */
  getSyncHistory: async (
    params: SyncHistoryParams
  ): Promise<{ list: SyncLog[]; total: number }> => {
    try {
      const { restaurantId, page = 1, pageSize = 20, ...filters } = params

      // 构建查询条件
      const where: any = {
        restaurantId,
      }

      if (filters.status) {
        where.status = filters.status
      }

      if (filters.action) {
        where.action = filters.action
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {}
        if (filters.startDate) {
          where.createdAt.$gte = filters.startDate
        }
        if (filters.endDate) {
          where.createdAt.$lte = filters.endDate
        }
      }

      const result = await callCloudFunction('tenant', {
        action: 'queryCollection',
        data: {
          collection: 'pos_sync_logs',
          where,
          orderBy: {
            createdAt: 'desc',
          },
          page,
          pageSize,
        },
      })

      if (result.code === 0 && result.data) {
        const list = Array.isArray(result.data)
          ? result.data
          : result.data.list || []
        const total =
          result.data.total !== undefined
            ? result.data.total
            : result.data.count || list.length

        return { list, total }
      }

      return { list: [], total: 0 }
    } catch (error: any) {
      console.error('获取发布历史失败:', error)
      throw new Error(error.message || '获取发布历史失败')
    }
  },

  /**
   * 重试发布
   */
  retrySync: async (syncId: string): Promise<PublishMenuResult> => {
    try {
      // 先获取原始同步记录
      const historyResult = await callCloudFunction('tenant', {
        action: 'getDocument',
        data: {
          collection: 'pos_sync_logs',
          docId: syncId,
        },
      })

      if (historyResult.code !== 0 || !historyResult.data) {
        throw new Error('同步记录不存在')
      }

      const syncLog = historyResult.data

      // 重新发布
      const result = await callCloudFunction('pos-interface', {
        action: 'pushMenu',
        data: {
          restaurantId: syncLog.restaurantId,
          syncType: syncLog.syncType,
          menuItemIds:
            syncLog.syncType === 'incremental'
              ? syncLog.failedItems?.map((item: any) => item.itemId) || []
              : undefined,
        },
      })

      if (result.code === 0 && result.data) {
        return result.data
      }
      throw new Error(result.message || '重试发布失败')
    } catch (error: any) {
      console.error('重试发布失败:', error)
      throw new Error(error.message || '重试发布失败')
    }
  },
}

