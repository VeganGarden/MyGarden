import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { recipeAPI } from '@/services/cloudbase'
import { Recipe, ApiResponse } from '@/types'

interface RecipeState {
  recipes: Recipe[]
  currentRecipe: Recipe | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const initialState: RecipeState = {
  recipes: [],
  currentRecipe: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },
}

// 异步actions
export const fetchRecipes = createAsyncThunk(
  'recipe/fetchRecipes',
  async (params: { 
    keyword?: string
    restaurantId?: string
    status?: string
    category?: string
    carbonLabel?: string
    page?: number
    pageSize?: number
  }) => {
    try {
      const response = await recipeAPI.list(params)
      
      console.log('fetchRecipes 收到响应:', response)
      console.log('响应数据结构:', {
        code: response.code,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataIsArray: Array.isArray(response.data),
        dataKeys: response.data ? Object.keys(response.data) : null,
      })
      
      // 处理不同的响应格式
      if (response.code === 0) {
        // 如果返回格式是 { code: 0, data: {...} }
        if (response.data) {
          // 如果 data 是对象，包含 data 和 pagination
          if (response.data.data !== undefined) {
            // 格式: { code: 0, data: { data: [...], pagination: {...} } }
            return response as ApiResponse<{
              data: Recipe[]
              pagination: any
            }>
          }
          
          // 如果 data 直接是数组
          if (Array.isArray(response.data)) {
            return {
              code: 0,
              data: {
                data: response.data,
                pagination: response.pagination || {
                  page: params.page || 1,
                  pageSize: params.pageSize || 20,
                  total: response.data.length,
                  totalPages: Math.ceil((response.data.length || 0) / (params.pageSize || 20)),
                },
              },
            } as ApiResponse<{
              data: Recipe[]
              pagination: any
            }>
          }
        }
        
        // 如果 data 是对象，包含 data 和 pagination
        return response as ApiResponse<{
          data: Recipe[]
          pagination: any
        }>
      }
      
      // 如果返回格式不符合预期，返回空数据
      return {
        code: response.code || 500,
        message: response.message || '获取菜谱列表失败',
        data: {
          data: [],
          pagination: {
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            total: 0,
            totalPages: 0,
          },
        },
      } as ApiResponse<{
        data: Recipe[]
        pagination: any
      }>
    } catch (error: any) {
      console.error('fetchRecipes error:', error)
      throw error
    }
  }
)

export const fetchRecipe = createAsyncThunk(
  'recipe/fetchRecipe',
  async (recipeId: string) => {
    const response = await recipeAPI.get(recipeId)
    return response as ApiResponse<Recipe>
  }
)

export const createRecipe = createAsyncThunk(
  'recipe/createRecipe',
  async (recipe: Partial<Recipe>) => {
    const response = await recipeAPI.create(recipe)
    return response as ApiResponse<Recipe>
  }
)

export const updateRecipe = createAsyncThunk(
  'recipe/updateRecipe',
  async ({ recipeId, recipe }: { recipeId: string; recipe: Partial<Recipe> }) => {
    const response = await recipeAPI.update(recipeId, recipe)
    return response as ApiResponse<Recipe>
  }
)

export const deleteRecipe = createAsyncThunk(
  'recipe/deleteRecipe',
  async (recipeId: string) => {
    await recipeAPI.delete(recipeId)
    return recipeId
  }
)

const recipeSlice = createSlice({
  name: 'recipe',
  initialState,
  reducers: {
    clearCurrentRecipe: (state) => {
      state.currentRecipe = null
    },
    setPagination: (
      state,
      action: PayloadAction<{ page: number; pageSize: number }>
    ) => {
      state.pagination.page = action.payload.page
      state.pagination.pageSize = action.payload.pageSize
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchRecipes
      .addCase(fetchRecipes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRecipes.fulfilled, (state, action) => {
        state.loading = false
        console.log('fetchRecipes fulfilled, payload:', action.payload)
        
        if (action.payload.code === 0 && action.payload.data) {
          // 处理数据格式：可能是 { data: [...], pagination: {...} } 或直接是数组
          if (action.payload.data.data !== undefined) {
            // 格式: { code: 0, data: { data: [...], pagination: {...} } }
            state.recipes = action.payload.data.data || []
            if (action.payload.data.pagination) {
              state.pagination = {
                ...state.pagination,
                ...action.payload.data.pagination,
              }
            }
          } else if (Array.isArray(action.payload.data)) {
            // 格式: { code: 0, data: [...] }
            state.recipes = action.payload.data
          } else {
            // 其他格式，尝试直接使用
            state.recipes = []
            console.warn('未知的数据格式:', action.payload.data)
          }
          
          console.log('设置 recipes 数量:', state.recipes.length)
        } else {
          // 如果请求失败，保持当前状态
          state.error = action.payload.message || '获取菜谱列表失败'
          console.warn('获取菜谱列表失败:', action.payload)
        }
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取菜谱列表失败'
      })
      // fetchRecipe
      .addCase(fetchRecipe.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRecipe.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.code === 0 && action.payload.data) {
          state.currentRecipe = action.payload.data
        }
      })
      .addCase(fetchRecipe.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取菜谱详情失败'
      })
      // createRecipe
      .addCase(createRecipe.fulfilled, (state, action) => {
        if (action.payload.code === 0 && action.payload.data) {
          state.recipes.unshift(action.payload.data)
        }
      })
      // updateRecipe
      .addCase(updateRecipe.fulfilled, (state, action) => {
        if (action.payload.code === 0 && action.payload.data) {
          const index = state.recipes.findIndex(
            (r) => r._id === action.payload.data?._id
          )
          if (index !== -1) {
            state.recipes[index] = action.payload.data
          }
          if (state.currentRecipe?._id === action.payload.data?._id) {
            state.currentRecipe = action.payload.data
          }
        }
      })
      // deleteRecipe
      .addCase(deleteRecipe.fulfilled, (state, action) => {
        state.recipes = state.recipes.filter((r) => r._id !== action.payload)
      })
  },
})

export const { clearCurrentRecipe, setPagination } = recipeSlice.actions
export default recipeSlice.reducer

