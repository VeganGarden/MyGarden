import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Restaurant {
  id: string
  name: string
  address?: string
  phone?: string
  status: 'active' | 'inactive' | 'pending'
  certificationLevel?: 'bronze' | 'silver' | 'gold' | 'platinum'
  certificationStatus?: 'none' | 'applying' | 'certified' | 'expired'
  createdAt: string
}

export interface Tenant {
  id: string
  name: string
  restaurants: Restaurant[]
}

interface TenantState {
  currentTenant: Tenant | null
  currentRestaurantId: string | null // 当前选中的餐厅ID，null表示查看所有餐厅
  restaurants: Restaurant[]
}

// 从localStorage恢复租户和餐厅信息
const getStoredTenant = () => {
  try {
    const stored = localStorage.getItem('tenant_data')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const getStoredRestaurantId = () => {
  return localStorage.getItem('current_restaurant_id')
}

// 初始化数据：小苹果租户及其两家餐厅
const initialTenantData: Tenant = {
  id: 'tenant_xiaopingguo',
  name: '小苹果',
  restaurants: [
    {
      id: 'restaurant_sukuaixin',
      name: '素开心',
      address: '上海市虹桥区XX路123号',
      phone: '021-12345678',
      status: 'active',
      certificationLevel: 'gold',
      certificationStatus: 'certified',
      createdAt: '2024-01-15',
    },
    {
      id: 'restaurant_suhuanle',
      name: '素欢乐',
      address: '上海市浦东新区XX街456号',
      phone: '021-87654321',
      status: 'active',
      certificationLevel: 'silver',
      certificationStatus: 'certified',
      createdAt: '2024-02-20',
    },
  ],
}

const storedTenant = getStoredTenant()
const initialState: TenantState = {
  currentTenant: storedTenant || initialTenantData,
  currentRestaurantId: getStoredRestaurantId(),
  restaurants: storedTenant?.restaurants || initialTenantData.restaurants,
}

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    setTenant: (state, action: PayloadAction<Tenant>) => {
      state.currentTenant = action.payload
      state.restaurants = action.payload.restaurants
      localStorage.setItem('tenant_data', JSON.stringify(action.payload))
    },
    clearTenant: (state) => {
      state.currentTenant = null
      state.restaurants = []
      state.currentRestaurantId = null
      localStorage.removeItem('tenant_data')
      localStorage.removeItem('current_restaurant_id')
    },
    setCurrentRestaurant: (state, action: PayloadAction<string | null>) => {
      state.currentRestaurantId = action.payload
      if (action.payload) {
        localStorage.setItem('current_restaurant_id', action.payload)
      } else {
        localStorage.removeItem('current_restaurant_id')
      }
    },
    updateRestaurant: (state, action: PayloadAction<Restaurant>) => {
      const index = state.restaurants.findIndex((r) => r.id === action.payload.id)
      if (index !== -1) {
        state.restaurants[index] = action.payload
        if (state.currentTenant) {
          const tenantIndex = state.currentTenant.restaurants.findIndex(
            (r) => r.id === action.payload.id
          )
          if (tenantIndex !== -1) {
            state.currentTenant.restaurants[tenantIndex] = action.payload
          }
        }
        localStorage.setItem('tenant_data', JSON.stringify(state.currentTenant))
      }
    },
    addRestaurant: (state, action: PayloadAction<Restaurant>) => {
      state.restaurants.push(action.payload)
      if (state.currentTenant) {
        state.currentTenant.restaurants.push(action.payload)
        localStorage.setItem('tenant_data', JSON.stringify(state.currentTenant))
      }
    },
  },
})

export const { setTenant, clearTenant, setCurrentRestaurant, updateRestaurant, addRestaurant } =
  tenantSlice.actions
export default tenantSlice.reducer

