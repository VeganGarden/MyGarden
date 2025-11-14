import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { ingredientAPI } from '@/services/cloudbase'
import { Ingredient, ApiResponse } from '@/types'

interface IngredientState {
  ingredients: Ingredient[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const initialState: IngredientState = {
  ingredients: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 0,
  },
}

// 异步actions
export const fetchIngredients = createAsyncThunk(
  'ingredient/fetchIngredients',
  async (params: {
    keyword?: string
    category?: string
    page?: number
    pageSize?: number
  }) => {
    const response = await ingredientAPI.list(params)
    return response as ApiResponse<{
      data: Ingredient[]
      pagination: any
    }>
  }
)

export const searchIngredients = createAsyncThunk(
  'ingredient/searchIngredients',
  async (params: { keyword: string; page?: number; pageSize?: number }) => {
    const response = await ingredientAPI.search(
      params.keyword,
      params.page,
      params.pageSize
    )
    return response as ApiResponse<{
      data: Ingredient[]
      pagination: any
    }>
  }
)

const ingredientSlice = createSlice({
  name: 'ingredient',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIngredients.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchIngredients.fulfilled, (state, action) => {
        state.loading = false
        console.log('fetchIngredients fulfilled, payload:', action.payload)
        
        if (action.payload.code === 0 && action.payload.data) {
          // 处理不同的数据格式
          if (action.payload.data.data !== undefined) {
            // 格式: { code: 0, data: { data: [...], pagination: {...} } }
            state.ingredients = action.payload.data.data || []
            if (action.payload.data.pagination) {
              state.pagination = {
                ...state.pagination,
                ...action.payload.data.pagination,
              }
            }
          } else if (Array.isArray(action.payload.data)) {
            // 格式: { code: 0, data: [...] }
            state.ingredients = action.payload.data
          } else {
            state.ingredients = []
            console.warn('未知的数据格式:', action.payload.data)
          }
          
          console.log('设置 ingredients 数量:', state.ingredients.length)
        } else {
          state.error = action.payload.message || '获取食材列表失败'
          console.warn('获取食材列表失败:', action.payload)
        }
      })
      .addCase(fetchIngredients.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || '获取食材列表失败'
      })
      .addCase(searchIngredients.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.code === 0 && action.payload.data) {
          // 处理不同的数据格式
          if (action.payload.data.data !== undefined) {
            // 格式: { code: 0, data: { data: [...], pagination: {...} } }
            state.ingredients = action.payload.data.data || []
            if (action.payload.data.pagination) {
              state.pagination = {
                ...state.pagination,
                ...action.payload.data.pagination,
              }
            }
          } else if (Array.isArray(action.payload.data)) {
            // 格式: { code: 0, data: [...] }
            state.ingredients = action.payload.data
          } else {
            state.ingredients = []
          }
        }
      })
  },
})

export default ingredientSlice.reducer

