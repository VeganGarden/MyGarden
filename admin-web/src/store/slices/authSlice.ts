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

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
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
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      localStorage.removeItem('admin_token')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer

