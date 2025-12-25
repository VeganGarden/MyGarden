import { callCloudFunction } from './cloudbase'

/**
 * 食材标准库管理API
 * 仅平台运营角色可用
 */
export const ingredientStandardAPI = {
  // 标准名称管理
  standard: {
    // 获取标准名称列表
    list: (params?: {
      keyword?: string
      category?: string
      status?: 'active' | 'deprecated'
      page?: number
      pageSize?: number
    }) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'standard.list',
        data: params || {},
      }),

    // 获取标准名称详情
    get: (standardName: string) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'standard.get',
        data: { standardName },
      }),

    // 创建标准名称
    create: (data: {
      standardName: string
      nameEn?: string
      category: string
      subCategory?: string
      description?: string
      defaultUnit?: string
      carbonCoefficient?: number
    }) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'standard.create',
        data,
      }),

    // 更新标准名称
    update: (oldStandardName: string, data: {
      standardName?: string
      nameEn?: string
      category?: string
      subCategory?: string
      description?: string
      defaultUnit?: string
      carbonCoefficient?: number
    }) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'standard.update',
        data: {
          oldStandardName,
          ...data,
        },
      }),

    // 废弃标准名称
    deprecate: (standardName: string) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'standard.deprecate',
        data: { standardName },
      }),

    // 合并标准名称
    merge: (sourceStandardName: string, targetStandardName: string) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'standard.merge',
        data: {
          sourceStandardName,
          targetStandardName,
        },
      }),
  },

  // 别名管理
  alias: {
    // 获取别名列表（根据标准名称）
    list: (standardName: string) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'alias.list',
        data: { standardName },
      }),

    // 添加别名
    add: (data: {
      standardName: string
      alias: string
      confidence?: number
      source?: 'manual' | 'auto' | 'import'
    }) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'alias.add',
        data,
      }),

    // 删除别名
    remove: (standardName: string, alias: string) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'alias.remove',
        data: { standardName, alias },
      }),

    // 批量添加别名
    batchAdd: (standardName: string, aliases: string[]) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'alias.batchAdd',
        data: { standardName, aliases },
      }),
  },

  // 批量操作
  batch: {
    // 批量同步到因子库
    syncToFactors: (standardNames?: string[]) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'sync.toFactors',
        subAction: standardNames ? 'syncByStandardNames' : 'syncAll',
        data: standardNames ? { standardNames } : {},
      }),

    // 批量同步到ingredients库
    syncToIngredients: (standardNames?: string[]) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'sync.toIngredients',
        subAction: standardNames ? 'syncByStandardNames' : 'syncAll',
        data: standardNames ? { standardNames } : {},
      }),

    // 检查数据一致性
    checkConsistency: () =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'sync.toIngredients',
        subAction: 'checkConsistency',
        data: {},
      }),
  },

  // 类别管理
  category: {
    // 获取类别列表
    list: (params?: {
      status?: 'active' | 'deprecated'
      keyword?: string
      page?: number
      pageSize?: number
    }) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'category.list',
        data: params || {},
      }),

    // 获取类别详情
    get: (categoryCode: string) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'category.get',
        data: { categoryCode },
      }),

    // 创建类别
    create: (data: {
      categoryCode: string
      categoryName: string
      categoryNameEn?: string
      parentCategoryCode?: string
      level?: number
      sortOrder?: number
      mapping?: {
        factorSubCategory: string
        keywords: string[]
      }
      description?: string
      status?: 'active' | 'deprecated'
    }) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'category.create',
        data,
      }),

    // 更新类别
    update: (categoryCode: string, data: {
      categoryName?: string
      categoryNameEn?: string
      parentCategoryCode?: string
      level?: number
      sortOrder?: number
      mapping?: {
        factorSubCategory: string
        keywords: string[]
      }
      description?: string
      status?: 'active' | 'deprecated'
    }) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'category.update',
        data: {
          categoryCode,
          ...data,
        },
      }),

    // 删除类别（软删除）
    delete: (categoryCode: string) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'category.delete',
        data: { categoryCode },
      }),

    // 获取类别的关键词列表
    getKeywords: (categoryCode: string) =>
      callCloudFunction('ingredient-standard-manage', {
        action: 'category.getKeywords',
        data: { categoryCode },
      }),
  },
}
