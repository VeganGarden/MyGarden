import { ingredientStandardAPI } from '@/services/ingredientStandard'
import { useEffect, useState, useCallback } from 'react'
import type { IngredientCategory } from '@/types/ingredientCategory'

/**
 * 类别数据缓存
 */
let categoryCache: IngredientCategory[] | null = null
let categoryCacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

/**
 * 获取类别列表的Hook
 * 提供类别数据的获取、缓存和映射功能
 */
export const useIngredientCategories = (options?: {
  status?: 'active' | 'deprecated'
  refresh?: boolean
}) => {
  const [categories, setCategories] = useState<IngredientCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchCategories = useCallback(async (forceRefresh = false) => {
    // 如果使用缓存且未过期，直接返回缓存
    if (!forceRefresh && categoryCache && Date.now() - categoryCacheTimestamp < CACHE_TTL) {
      setCategories(categoryCache)
      return categoryCache
    }

    setLoading(true)
    setError(null)
    try {
      const result = await ingredientStandardAPI.category.list({
        status: options?.status || 'active',
      })

      if (result && result.code === 0 && result.data) {
        const categoryList = result.data.list || []
        setCategories(categoryList)
        
        // 更新缓存
        categoryCache = categoryList
        categoryCacheTimestamp = Date.now()
        
        return categoryList
      } else {
        throw new Error(result?.message || '获取类别列表失败')
      }
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      console.error('获取类别列表失败:', error)
      return []
    } finally {
      setLoading(false)
    }
  }, [options?.status])

  useEffect(() => {
    fetchCategories(options?.refresh)
  }, [fetchCategories, options?.refresh])

  return {
    categories,
    loading,
    error,
    refresh: () => fetchCategories(true),
  }
}

/**
 * 获取类别选项（用于Select组件）
 */
export const useCategoryOptions = (options?: {
  status?: 'active' | 'deprecated'
  includeAll?: boolean
}) => {
  const { categories, loading } = useIngredientCategories({ status: options?.status })

  const categoryOptions = options?.includeAll
    ? [
        { label: '全部', value: 'all' },
        ...categories.map(cat => ({
          label: cat.categoryName,
          value: cat.categoryCode,
        }))
      ]
    : categories.map(cat => ({
        label: cat.categoryName,
        value: cat.categoryCode,
      }))

  return {
    options: categoryOptions,
    loading,
  }
}

/**
 * 类别代码到名称的映射函数
 */
export const useCategoryMap = () => {
  const { categories } = useIngredientCategories()

  const getCategoryName = (categoryCode: string): string => {
    const category = categories.find(cat => cat.categoryCode === categoryCode)
    return category?.categoryName || categoryCode
  }

  const getCategoryNameEn = (categoryCode: string): string => {
    const category = categories.find(cat => cat.categoryCode === categoryCode)
    return category?.categoryNameEn || categoryCode
  }

  return {
    getCategoryName,
    getCategoryNameEn,
    categories,
  }
}

/**
 * 清除类别缓存
 */
export const clearCategoryCache = () => {
  categoryCache = null
  categoryCacheTimestamp = 0
}

