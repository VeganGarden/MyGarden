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
  async (params: { keyword?: string; page?: number; pageSize?: number }) => {
    const response = await recipeAPI.list(params)
    return response as ApiResponse<{
      data: Recipe[]
      pagination: any
    }>
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
        if (action.payload.code === 0 && action.payload.data) {
          state.recipes = action.payload.data.data || []
          state.pagination = {
            ...state.pagination,
            ...action.payload.data.pagination,
          }
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

