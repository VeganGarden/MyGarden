/**
 * 菜单环保信息展示配置API服务
 */
import { callCloudFunction } from './cloudbase'

/**
 * 菜单展示配置API
 */
export const menuDisplayConfigAPI = {
  /**
   * 获取餐厅的菜单展示配置
   */
  getConfig: async (restaurantId: string, version?: number) => {
    const result = await callCloudFunction('menu-carbon-label', {
      action: 'getMenuDisplayConfig',
      data: {
        restaurantId,
        version,
      },
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
      }
    }
    return {
      success: false,
      error: result.message || '获取配置失败',
    }
  },

  /**
   * 创建菜单展示配置
   */
  createConfig: async (restaurantId: string, config: any) => {
    // 注意：创建配置需要通过其他云函数或直接操作数据库
    // 这里暂时返回，实际实现需要根据后端API设计
    const result = await callCloudFunction('menu-carbon-label', {
      action: 'createMenuDisplayConfig',
      data: {
        restaurantId,
        config,
      },
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
      }
    }
    return {
      success: false,
      error: result.message || '创建配置失败',
    }
  },

  /**
   * 更新菜单展示配置
   */
  updateConfig: async (restaurantId: string, config: any, version: number) => {
    // 注意：更新配置需要通过其他云函数或直接操作数据库
    // 这里暂时返回，实际实现需要根据后端API设计
    const result = await callCloudFunction('menu-carbon-label', {
      action: 'updateMenuDisplayConfig',
      data: {
        restaurantId,
        config,
        version,
      },
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
      }
    }
    return {
      success: false,
      error: result.message || '更新配置失败',
    }
  },

  /**
   * 获取菜单项的碳标签信息
   */
  getMenuItemLabel: async (
    restaurantId: string,
    menuItemId: string,
    media?: string,
    language?: string
  ) => {
    const result = await callCloudFunction('menu-carbon-label', {
      action: 'getMenuItemCarbonLabel',
      data: {
        restaurantId,
        menuItemId,
        media: media || 'basic',
        language: language || 'zh_CN',
      },
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
      }
    }
    return {
      success: false,
      error: result.message || '获取标签失败',
    }
  },

  /**
   * 批量获取菜单项的碳标签信息
   */
  getMenuItemsLabels: async (
    restaurantId: string,
    params?: {
      menuItemIds?: string[]
      media?: string
      language?: string
      filter?: { carbonLevel?: string; category?: string }
      sort?: { field?: string; order?: 'asc' | 'desc' }
      page?: number
      pageSize?: number
    }
  ) => {
    const result = await callCloudFunction('menu-carbon-label', {
      action: 'getMenuItemsCarbonLabels',
      data: {
        restaurantId,
        ...params,
      },
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
      }
    }
    return {
      success: false,
      error: result.message || '获取标签列表失败',
    }
  },

  /**
   * 获取订单的碳足迹标签信息
   */
  getOrderLabel: async (orderId: string, media?: string, language?: string) => {
    const result = await callCloudFunction('menu-carbon-label', {
      action: 'getOrderCarbonLabel',
      data: {
        orderId,
        media: media || 'receipt',
        language: language || 'zh_CN',
      },
    })
    if (result.code === 0) {
      return {
        success: true,
        data: result.data,
      }
    }
    return {
      success: false,
      error: result.message || '获取订单标签失败',
    }
  },
}


