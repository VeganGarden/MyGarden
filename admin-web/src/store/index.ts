import { configureStore } from '@reduxjs/toolkit'
import recipeReducer from './slices/recipeSlice'
import ingredientReducer from './slices/ingredientSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    recipe: recipeReducer,
    ingredient: ingredientReducer,
    auth: authReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

