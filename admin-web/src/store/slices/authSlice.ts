import { AdminUser, Permission } from '@/types/role'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  isAuthenticated: boolean
  user: AdminUser | null
  token: string | null
  permissions: Permission[]
}

// 从localStorage恢复用户信息
const getStoredUser = (): AdminUser | null => {
  try {
    const storedUser = localStorage.getItem('admin_user')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

const getStoredPermissions = (): Permission[] => {
  try {
    const stored = localStorage.getItem('admin_permissions')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('admin_token'),
  user: getStoredUser(),
  token: localStorage.getItem('admin_token'),
  permissions: getStoredPermissions(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AdminUser; token: string; permissions?: Permission[] }>
    ) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.permissions = action.payload.permissions || action.payload.user.permissions || []
      
      // 保存到localStorage
      localStorage.setItem('admin_token', action.payload.token)
      localStorage.setItem('admin_user', JSON.stringify(action.payload.user))
      localStorage.setItem('admin_permissions', JSON.stringify(state.permissions))
    },
    updateUser: (state, action: PayloadAction<Partial<AdminUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        localStorage.setItem('admin_user', JSON.stringify(state.user))
      }
    },
    updatePermissions: (state, action: PayloadAction<Permission[]>) => {
      state.permissions = action.payload
      localStorage.setItem('admin_permissions', JSON.stringify(action.payload))
      if (state.user) {
        state.user.permissions = action.payload
        localStorage.setItem('admin_user', JSON.stringify(state.user))
      }
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.permissions = []
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      localStorage.removeItem('admin_permissions')
    },
  },
})

export const { setCredentials, updateUser, updatePermissions, logout } = authSlice.actions

// 选择器
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectToken = (state: { auth: AuthState }) => state.auth.token
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions
export const selectHasPermission = (state: { auth: AuthState }, permission: Permission) =>
  state.auth.permissions.includes(permission)

export default authSlice.reducer

