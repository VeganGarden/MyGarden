import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import ingredientReducer from './slices/ingredientSlice'
import notificationReducer from './slices/notificationSlice'
import recipeReducer from './slices/recipeSlice'
import tenantReducer from './slices/tenantSlice'

export const store = configureStore({
  reducer: {
    recipe: recipeReducer,
    ingredient: ingredientReducer,
    auth: authReducer,
    tenant: tenantReducer,
    notification: notificationReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

