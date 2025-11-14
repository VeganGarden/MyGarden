import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  isAuthenticated: boolean
  user: {
    id?: string
    name?: string
    role?: string
    tenantId?: string
  } | null
  token: string | null
}

// 从localStorage恢复用户信息
const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem('admin_user')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('admin_token'),
  user: getStoredUser(),
  token: localStorage.getItem('admin_token'),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: any; token: string }>
    ) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      localStorage.setItem('admin_token', action.payload.token)
      localStorage.setItem('admin_user', JSON.stringify(action.payload.user))
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer

