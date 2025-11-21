import { baselineManageAPI } from '@/services/baseline'
import { adminUsersAPI, onboardingAPI, platformAPI, reportAPI, systemAPI, tenantAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { selectUser } from '@/store/slices/authSlice'
import { UserRole } from '@/types/role'
import { getBrandChartTheme } from '@/utils/chart-theme'
import {
  ApiOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CheckCircleTwoTone,
  DatabaseOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileTextOutlined,
  FireOutlined,
  ReloadOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  TrophyOutlined,
  UploadOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Alert, Badge, Button, Card, Col, DatePicker, Empty, Row, Select, Skeleton, Space, Statistic, Table, Tag, Tooltip, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

// 餐厅管理员看板数据
interface RestaurantDashboardData {
  totalRecipes: number
  totalCarbonReduction: number
  certifiedRestaurants: number
  activeUsers: number
  todayOrders: number
  todayRevenue: number
  yesterdayOrders?: number
  yesterdayRevenue?: number
}

// 待办事项数据
interface TodoItem {
  id: string
  type: 'certification' | 'recipe' | 'order' | 'notification'
  title: string
  description?: string
  count?: number
  time?: string
  status?: string
  link?: string
}

// 热门菜谱数据
interface TopRecipe {
  rank: number
  recipeId: string
  recipeName: string
  orders: number
  revenue: number
  carbonReduction: number
}

// 平台运营看板数据
interface PlatformOperatorDashboardData {
  totalTenants: number
  activeTenants: number
  totalRestaurants: number
  pendingApplications: number
  totalOrders: number
  totalRevenue: number
  totalCarbonReduction: number
  totalUsers: number
}

// 系统管理员看板数据
interface SystemAdminDashboardData {
  totalUsers: number
  activeUsers: number
  systemAlerts: number
  backupStatus: string
  todayLogins: number
  todayOperations: number
  databaseUsage: number
  apiCalls: number
}

// 碳核算专员看板数据
interface CarbonSpecialistDashboardData {
  totalCarbonReduction: number
  baselineCount: number
  activeBaselineCount: number
  pendingBaselineCount: number
  todayCarbonReduction: number
  monthCarbonReduction: number
  averageCarbonPerOrder: number
  carbonLabelDistribution: {
    ultraLow: number
    low: number
    medium: number
    high: number
  }
}

// 餐厅排行榜数据
interface TopRestaurant {
  rank: number
  restaurantName: string
  tenantId: string
  tenantName?: string
  orders: number
  revenue: number
  carbonReduction: number
  certificationLevel?: string
  monthCarbonReduction?: number
  averageCarbonPerOrder?: number
}

// 操作日志数据
interface AuditLog {
  _id: string
  username: string
  role?: string
  action: string
  resource: string
  module: string
  description: string
  status: 'success' | 'failed' | 'pending'
  createdAt: string
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAppSelector(selectUser)
  const { currentTenant, currentRestaurantId, restaurants } = useAppSelector(
    (state: any) => state.tenant
  )

  // 判断用户角色
  const isPlatformOperator = user?.role === UserRole.PLATFORM_OPERATOR
  const isSystemAdmin = user?.role === UserRole.SYSTEM_ADMIN
  const isCarbonSpecialist = user?.role === UserRole.CARBON_SPECIALIST
  const isRestaurantAdmin = user?.role === UserRole.RESTAURANT_ADMIN

  // 餐厅管理员数据
  const [restaurantData, setRestaurantData] = useState<RestaurantDashboardData>({
    totalRecipes: 0,
    totalCarbonReduction: 0,
    certifiedRestaurants: 0,
    activeUsers: 0,
    todayOrders: 0,
    todayRevenue: 0,
    yesterdayOrders: 0,
    yesterdayRevenue: 0,
  })

  // 待办事项数据
  const [todoItems, setTodoItems] = useState<TodoItem[]>([])

  // 热门菜谱排行榜
  const [topRecipes, setTopRecipes] = useState<TopRecipe[]>([])

  // 平台运营数据
  const [platformData, setPlatformData] = useState<PlatformOperatorDashboardData>({
    totalTenants: 0,
    activeTenants: 0,
    totalRestaurants: 0,
    pendingApplications: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCarbonReduction: 0,
    totalUsers: 0,
  })

  // 系统管理员数据
  const [systemData, setSystemData] = useState<SystemAdminDashboardData>({
    totalUsers: 0,
    activeUsers: 0,
    systemAlerts: 0,
    backupStatus: 'unknown',
    todayLogins: 0,
    todayOperations: 0,
    databaseUsage: 0,
    apiCalls: 0,
  })

  // 餐厅排行榜
  const [topRestaurants, setTopRestaurants] = useState<TopRestaurant[]>([])
  
  // 最近操作日志
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])

  // 碳核算专员数据
  const [carbonData, setCarbonData] = useState<CarbonSpecialistDashboardData>({
    totalCarbonReduction: 0,
    baselineCount: 0,
    activeBaselineCount: 0,
    pendingBaselineCount: 0,
    todayCarbonReduction: 0,
    monthCarbonReduction: 0,
    averageCarbonPerOrder: 0,
    carbonLabelDistribution: {
      ultraLow: 0,
      low: 0,
      medium: 0,
      high: 0,
    },
  })

  // 碳减排排行榜
  const [topCarbonRestaurants, setTopCarbonRestaurants] = useState<TopRestaurant[]>([])

  // 趋势数据
  const [trendsData, setTrendsData] = useState<{
    orders?: Array<{ date: string; count: number }>
    revenue?: Array<{ date: string; amount: number }>
    carbonReduction?: Array<{ date: string; amount: number }>
    tenantGrowth?: Array<{ date: string; count: number }>
    userActivity?: Array<{ date: string; count: number }>
    systemResources?: Array<{ date: string; databaseUsage: number; apiCalls: number }>
  }>({})

  // 时间范围选择
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])
  const [period, setPeriod] = useState<string>('30days')

  // 图表引用
  const platformTrendChartRef = useRef<HTMLDivElement>(null)
  const platformGrowthChartRef = useRef<HTMLDivElement>(null)
  const systemActivityChartRef = useRef<HTMLDivElement>(null)
  const systemResourceChartRef = useRef<HTMLDivElement>(null)
  const carbonTrendChartRef = useRef<HTMLDivElement>(null)
  const carbonLabelChartRef = useRef<HTMLDivElement>(null)
  const restaurantTrendChartRef = useRef<HTMLDivElement>(null)
  const restaurantCarbonChartRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)

  const currentRestaurant = currentRestaurantId
    ? restaurants.find((r: any) => r.id === currentRestaurantId)
    : null

  // 计算当前租户下的认证餐厅数量
  // 认证餐厅的判断标准：certificationStatus === 'certified' 或 certificationLevel 存在且不为空
  const calculateCertifiedRestaurants = () => {
    if (!currentTenant || restaurants.length === 0) return 0
    return restaurants.filter((r: any) => {
      // 优先使用 certificationStatus
      if (r.certificationStatus === 'certified') return true
      // 其次使用 certificationLevel（bronze, silver, gold, platinum 都算认证）
      if (r.certificationLevel && 
          ['bronze', 'silver', 'gold', 'platinum'].includes(r.certificationLevel)) {
        return true
      }
      return false
    }).length
  }

  // 获取餐厅管理员数据
  // 注意：此函数会根据用户选择的日期范围（dateRange）从云端数据库查询数据
  // startDate 和 endDate 会传递给后端API，后端会根据这些日期筛选订单、统计等数据
  const fetchRestaurantData = async () => {
    try {
      setLoading(true)
      // 从日期选择器获取日期范围，如果没有选择则使用默认值（近30天）
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'day').format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
      
      console.log('[餐厅数据] 查询日期范围:', startDate, '到', endDate)
      
      // 调用后端API，传入日期范围参数
      // 后端会根据这些日期范围从数据库查询对应时间段的订单、统计等数据
      const result = await reportAPI.dashboard({
        restaurantId: currentRestaurantId,
        tenantId: currentTenant?.id,
        startDate,  // 起始日期，用于筛选数据库中的订单创建时间
        endDate,    // 终止日期，用于筛选数据库中的订单创建时间
        includeTrends: true,
      })
      
      if (result && result.code === 0 && result.data) {
        // 如果查看所有餐厅，使用计算出的认证餐厅数量；否则使用后端返回的值（通常为0）
        const certifiedCount = !currentRestaurantId 
          ? calculateCertifiedRestaurants() 
          : (result.data.certifiedRestaurants || 0)
        
        setRestaurantData({
          totalRecipes: result.data.totalRecipes || 0,
          totalCarbonReduction: result.data.totalCarbonReduction || 0,
          certifiedRestaurants: certifiedCount,
          activeUsers: result.data.activeUsers || 0,
          todayOrders: result.data.todayOrders || 0,
          todayRevenue: result.data.todayRevenue || 0,
          yesterdayOrders: result.data.yesterdayOrders || 0,
          yesterdayRevenue: result.data.yesterdayRevenue || 0,
        })
        
        // 保存趋势数据
        if (result.data.trends) {
          setTrendsData(prev => ({
            ...prev,
            orders: result.data.trends.orders,
            revenue: result.data.trends.revenue,
            carbonReduction: result.data.trends.carbonReduction,
          }))
        }
      }
      
      // 获取待办事项
      await fetchTodoItems()
      
      // 检查API返回的数据中是否包含topRecipes
      if (result && result.code === 0 && result.data && result.data.topRecipes) {
        // 如果API已经返回了topRecipes，直接使用
        const recipes = Array.isArray(result.data.topRecipes) ? result.data.topRecipes : []
        console.log('[热门菜谱] 从fetchRestaurantData获取到数据:', recipes.length, '条')
        
        if (recipes.length > 0) {
          const mappedRecipes = recipes.map((recipe: any, index: number) => ({
            rank: index + 1,
            recipeId: recipe.recipeId || recipe.recipe_id || recipe.id || '',
            recipeName: recipe.recipeName || recipe.name || recipe.recipe_name || '',
            orders: recipe.orders || recipe.order_count || 0,
            revenue: recipe.revenue || recipe.total_revenue || 0,
            carbonReduction: recipe.carbonReduction || recipe.carbon_reduction || 0,
          }))
          console.log('[热门菜谱] 映射后的数据:', mappedRecipes)
          setTopRecipes(mappedRecipes)
        } else {
          console.log('[热门菜谱] API返回的topRecipes为空数组')
          setTopRecipes([])
        }
      } else {
        // 如果API没有返回topRecipes，单独调用fetchTopRecipes
        console.log('[热门菜谱] API未返回topRecipes，单独调用fetchTopRecipes')
        await fetchTopRecipes()
      }
    } catch (error: any) {
      message.error(error.message || t('common.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 获取待办事项数据
  const fetchTodoItems = async () => {
    try {
      const todos: TodoItem[] = []
      
      // TODO: 实际调用API获取待办事项
      // 这里暂时使用空数组，后续根据实际API接口实现
      
      setTodoItems(todos)
    } catch (error: any) {
      // 静默处理错误
    }
  }

  // 获取热门菜谱排行榜
  // 统计逻辑：
  // 1. 当选择具体餐厅时（currentRestaurantId 不为空）：统计该餐厅的菜谱 Top 10
  // 2. 当查看所有餐厅时（currentRestaurantId 为空）：统计当前租户下所有餐厅的菜谱 Top 10
  // 统计维度：按订单数量（orders）排序，取前10名
  // 返回数据包含：菜谱ID、名称、订单数、收入、碳减排量
  // 注意：此函数会根据用户选择的日期范围（dateRange）从云端数据库查询订单数据
  // 后端会根据startDate和endDate筛选对应时间段的订单，然后统计每个菜谱的订单数
  const fetchTopRecipes = async () => {
    try {
      // 从日期选择器获取日期范围，如果没有选择则使用默认值（近30天）
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'day').format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
      
      console.log('[热门菜谱] 查询日期范围:', startDate, '到', endDate)
      
      // 调用reportAPI获取热门菜谱数据
      // 参数说明：
      // - restaurantId: 如果为null，则统计当前租户下所有餐厅的菜谱；如果指定，则只统计该餐厅的菜谱
      // - tenantId: 当前租户ID，用于数据隔离
      // - startDate: 起始日期，后端会筛选此日期之后的订单
      // - endDate: 终止日期，后端会筛选此日期之前的订单
      // - includeTopRecipes: 标识需要返回热门菜谱数据
      const params = {
        restaurantId: currentRestaurantId,
        tenantId: currentTenant?.id,
        startDate,  // 传递给后端，用于筛选订单的创建时间
        endDate,    // 传递给后端，用于筛选订单的创建时间
        includeTopRecipes: true,
      }
      
      console.log('[热门菜谱] 请求参数:', params)
      const result = await reportAPI.dashboard(params)
      console.log('[热门菜谱] API返回结果:', result)
      
      if (result && result.code === 0 && result.data) {
        console.log('[热门菜谱] API返回的data:', result.data)
        console.log('[热门菜谱] topRecipes字段:', result.data.topRecipes)
        
        // 检查是否有topRecipes字段
        if (result.data.topRecipes) {
          const recipes = Array.isArray(result.data.topRecipes) ? result.data.topRecipes : []
          console.log('[热门菜谱] 解析后的recipes数组:', recipes)
          
          if (recipes.length > 0) {
            const mappedRecipes = recipes.map((recipe: any, index: number) => ({
              rank: index + 1,
              recipeId: recipe.recipeId || recipe.recipe_id || recipe.id || '',
              recipeName: recipe.recipeName || recipe.name || recipe.recipe_name || '',
              orders: recipe.orders || recipe.order_count || 0,
              revenue: recipe.revenue || recipe.total_revenue || 0,
              carbonReduction: recipe.carbonReduction || recipe.carbon_reduction || 0,
            }))
            console.log('[热门菜谱] 映射后的数据:', mappedRecipes)
            setTopRecipes(mappedRecipes)
          } else {
            console.warn('[热门菜谱] topRecipes数组为空')
            setTopRecipes([])
          }
        } else {
          console.warn('[热门菜谱] API返回的data中没有topRecipes字段，data结构:', Object.keys(result.data))
          setTopRecipes([])
        }
      } else {
        console.warn('[热门菜谱] API返回失败或格式不正确:', result)
        setTopRecipes([])
      }
    } catch (error: any) {
      console.error('[热门菜谱] 获取数据失败:', error)
      // 静默处理错误，不影响其他数据加载
      setTopRecipes([])
    }
  }

  // 获取平台运营数据
  const fetchPlatformData = async () => {
    try {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'day').format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
      
      // 获取平台统计数据（包含趋势数据）
      const [statisticsResult, topRestaurantsResult, applicationsResult, tenantsResult] = await Promise.all([
        platformAPI.statistics.getPlatformStatistics({
          startDate,
          endDate,
          period: period as any,
          includeTrends: true,
        }),
        platformAPI.statistics.getTopRestaurants({
          sortBy: 'orders',
          limit: 10,
        }),
        onboardingAPI.listApplications({
          status: 'pending',
          page: 1,
          pageSize: 1,
        }),
        tenantAPI.getAllTenants(),
      ])

      if (statisticsResult && statisticsResult.code === 0 && statisticsResult.data) {
        const stats = statisticsResult.data
        setPlatformData({
          totalTenants: stats.totalTenants || 0,
          activeTenants: stats.activeTenants || stats.active_tenants || 0,
          totalRestaurants: stats.totalRestaurants || stats.total_restaurants || 0,
          pendingApplications: applicationsResult?.data?.total || applicationsResult?.data?.length || 0,
          totalOrders: stats.totalOrders || stats.total_orders || 0,
          totalRevenue: stats.totalRevenue || stats.total_revenue || 0,
          totalCarbonReduction: stats.totalCarbonReduction || stats.total_carbon_reduction || 0,
          totalUsers: stats.totalUsers || stats.total_users || 0,
        })
        
        // 保存趋势数据
        if (stats.trends) {
          setTrendsData({
            orders: stats.trends.orders,
            revenue: stats.trends.revenue,
            carbonReduction: stats.trends.carbonReduction,
            tenantGrowth: stats.trends.tenantGrowth || stats.trends.restaurantGrowth || undefined,
          })
        }
      }

      // 获取餐厅排行榜
      if (topRestaurantsResult && topRestaurantsResult.code === 0 && topRestaurantsResult.data) {
        const restaurants = Array.isArray(topRestaurantsResult.data) ? topRestaurantsResult.data : []
        setTopRestaurants(restaurants.map((restaurant: any, index: number) => ({
          rank: index + 1,
          restaurantName: restaurant.restaurantName || restaurant.name || restaurant.restaurant_name || '',
          tenantId: restaurant.tenantId || restaurant.tenant_id || '',
          tenantName: restaurant.tenantName || restaurant.tenant_name || '',
          orders: restaurant.orders || restaurant.order_count || 0,
          revenue: restaurant.revenue || restaurant.total_revenue || 0,
          carbonReduction: restaurant.carbonReduction || restaurant.carbon_reduction || 0,
          certificationLevel: restaurant.certificationLevel || restaurant.certification_level || undefined,
        })))
      }

      // 获取租户总数和活跃数，并计算增长趋势
      if (tenantsResult && tenantsResult.code === 0 && tenantsResult.data) {
        const tenants = tenantsResult.data || []
        const activeTenants = tenants.filter((t: any) => t.status === 'active').length
        setPlatformData(prev => ({
          ...prev,
          totalTenants: tenants.length,
          activeTenants: activeTenants,
        }))
        
        // 如果没有趋势数据中的租户增长数据，尝试从租户列表计算
        if (!trendsData.tenantGrowth || trendsData.tenantGrowth.length === 0) {
          // 按创建日期分组统计
          const growthMap = new Map<string, { tenantCount: number; restaurantCount: number }>()
          tenants.forEach((tenant: any) => {
            const date = dayjs(tenant.createdAt || tenant.created_at).format('YYYY-MM-DD')
            if (!growthMap.has(date)) {
              growthMap.set(date, { tenantCount: 0, restaurantCount: 0 })
            }
            const current = growthMap.get(date)!
            current.tenantCount++
            if (tenant.restaurants && Array.isArray(tenant.restaurants)) {
              current.restaurantCount += tenant.restaurants.length
            }
          })
          
          const growthData = Array.from(growthMap.entries())
            .map(([date, counts]) => ({
              date,
              count: counts.tenantCount,
              restaurantCount: counts.restaurantCount,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
          
          if (growthData.length > 0) {
            setTrendsData(prev => ({
              ...prev,
              tenantGrowth: growthData,
            }))
          }
        }
      }
    } catch (error: any) {
      message.error(error.message || t('common.loadFailed'))
    }
  }

  // 获取系统管理员数据
  const fetchSystemData = async () => {
    try {
      // 获取用户统计
      const [usersResult, logsResult, metricsResult] = await Promise.all([
        adminUsersAPI.list({}),
        systemAPI.getAuditLogs({
          page: 1,
          pageSize: 20,
        }),
        systemAPI.getSystemMetrics(),
      ])

      if (usersResult && usersResult.code === 0) {
        const users = usersResult.data?.list || usersResult.data || []
        const activeUsers = users.filter((u: any) => u.status === 'active').length
        setSystemData(prev => ({
          ...prev,
          totalUsers: users.length,
          activeUsers: activeUsers,
        }))
      }

      // 获取最近操作日志
      if (logsResult && logsResult.code === 0 && logsResult.data) {
        setRecentLogs(logsResult.data.list || logsResult.data || [])
      }

      // 获取系统指标（如果有）
      if (metricsResult && metricsResult.code === 0 && metricsResult.data) {
        const metrics = metricsResult.data
        setSystemData(prev => ({
          ...prev,
          todayLogins: metrics.todayLogins || 0,
          todayOperations: metrics.todayOperations || 0,
          databaseUsage: metrics.databaseUsage || 0,
          apiCalls: metrics.apiCalls || 0,
          systemAlerts: metrics.alerts || 0,
          backupStatus: metrics.backupStatus || 'unknown',
        }))
      }
    } catch (error: any) {
      message.error(error.message || t('common.loadFailed'))
    }
  }

  // 获取碳核算专员数据
  const fetchCarbonData = async () => {
    try {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'day').format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
      
      // 获取平台碳数据和基准值数据
      const [statisticsResult, baselineResult, topCarbonResult] = await Promise.all([
        platformAPI.statistics.getPlatformStatistics({
          startDate,
          endDate,
          period: period as any,
          includeTrends: true,
        }),
        baselineManageAPI.list({
          page: 1,
          pageSize: 1,
        }),
        platformAPI.statistics.getTopRestaurants({
          sortBy: 'carbonReduction',
          limit: 10,
        }),
      ])

      if (statisticsResult && statisticsResult.code === 0 && statisticsResult.data) {
        const stats = statisticsResult.data
        const today = dayjs().format('YYYY-MM-DD')
        const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
        
        setCarbonData({
          totalCarbonReduction: stats.totalCarbonReduction || stats.total_carbon_reduction || 0,
          baselineCount: baselineResult?.pagination?.total || 0,
          activeBaselineCount: 0, // 需要从基准值列表筛选
          pendingBaselineCount: 0, // 需要从基准值列表筛选
          todayCarbonReduction: 0, // 需要从趋势数据中获取
          monthCarbonReduction: 0, // 需要从趋势数据中计算
          averageCarbonPerOrder: stats.averageCarbonPerOrder || stats.average_carbon_per_order || 0,
          carbonLabelDistribution: {
            ultraLow: 0,
            low: 0,
            medium: 0,
            high: 0,
          },
        })
        
        // 保存碳减排趋势数据
        if (stats.trends && stats.trends.carbonReduction) {
          setTrendsData(prev => ({
            ...prev,
            carbonReduction: stats.trends.carbonReduction,
          }))
        }
      }

      // 获取基准值统计
      if (baselineResult && baselineResult.success) {
        const baselines = baselineResult.data || []
        const activeBaselines = baselines.filter((b: any) => b.status === 'active').length
        const pendingBaselines = baselines.filter((b: any) => b.status === 'pending').length
        
        setCarbonData(prev => ({
          ...prev,
          baselineCount: baselineResult.pagination?.total || baselines.length,
          activeBaselineCount: activeBaselines,
          pendingBaselineCount: pendingBaselines,
        }))
      }

      // 获取碳减排排行榜
      if (topCarbonResult && topCarbonResult.code === 0 && topCarbonResult.data) {
        const restaurants = Array.isArray(topCarbonResult.data) ? topCarbonResult.data : []
        setTopCarbonRestaurants(restaurants.map((restaurant: any, index: number) => ({
          rank: index + 1,
          restaurantName: restaurant.restaurantName || restaurant.name || restaurant.restaurant_name || '',
          tenantId: restaurant.tenantId || restaurant.tenant_id || '',
          tenantName: restaurant.tenantName || restaurant.tenant_name || '',
          orders: restaurant.orders || restaurant.order_count || 0,
          revenue: restaurant.revenue || restaurant.total_revenue || 0,
          carbonReduction: restaurant.carbonReduction || restaurant.carbon_reduction || 0,
          certificationLevel: restaurant.certificationLevel || restaurant.certification_level || undefined,
        })))
      }
    } catch (error: any) {
      message.error(error.message || t('common.loadFailed'))
    }
  }

  // 使用ref来防止重复调用
  const isFetchingRef = useRef(false)
  
  useEffect(() => {
    const fetchData = async () => {
      // 防止重复调用
      if (isFetchingRef.current) {
        console.log('[Dashboard] 正在获取数据，跳过重复调用')
        return
      }
      
      try {
        isFetchingRef.current = true
        if (isRestaurantAdmin) {
          await fetchRestaurantData()
        } else if (isPlatformOperator) {
          await fetchPlatformData()
        } else if (isSystemAdmin) {
          await fetchSystemData()
        } else if (isCarbonSpecialist) {
          await fetchCarbonData()
        }
      } catch (error) {
        // 错误已在各自函数中处理
      } finally {
        isFetchingRef.current = false
      }
    }
    fetchData()
  }, [currentRestaurantId, currentTenant, user?.role, dateRange, period])

  // 自动刷新功能
  useEffect(() => {
    if (isRestaurantAdmin || isPlatformOperator || isSystemAdmin || isCarbonSpecialist) {
      const interval = setInterval(() => {
        if (isRestaurantAdmin) {
          fetchRestaurantData()
        } else if (isPlatformOperator) {
          fetchPlatformData()
        } else if (isSystemAdmin) {
          fetchSystemData()
        } else if (isCarbonSpecialist) {
          fetchCarbonData()
        }
      }, 5 * 60 * 1000) // 每5分钟自动刷新

      return () => clearInterval(interval)
    }
  }, [isRestaurantAdmin, isPlatformOperator, isSystemAdmin, isCarbonSpecialist])

  // 导出功能
  const handleExportPlatformData = async () => {
    try {
      message.loading(t('pages.dashboard.exporting'), 0)
      
      const exportData = [
        [t('pages.dashboard.export.platformOperator.title')],
        [],
        [t('pages.dashboard.export.platformOperator.coreMetrics')],
        [t('pages.dashboard.platformOperator.totalTenants'), platformData.totalTenants],
        [t('pages.dashboard.platformOperator.activeTenants'), platformData.activeTenants],
        [t('pages.dashboard.platformOperator.totalRestaurants'), platformData.totalRestaurants],
        [t('pages.dashboard.platformOperator.pendingApplications'), platformData.pendingApplications],
        [],
        [t('pages.dashboard.export.platformOperator.businessData')],
        [t('pages.dashboard.platformOperator.totalOrders'), platformData.totalOrders],
        [t('pages.dashboard.platformOperator.totalRevenue'), `¥${platformData.totalRevenue.toLocaleString()}`],
        [t('pages.dashboard.platformOperator.totalCarbonReduction'), `${platformData.totalCarbonReduction.toLocaleString()} kg CO₂e`],
        [t('pages.dashboard.platformOperator.totalUsers'), platformData.totalUsers],
        [],
        [t('pages.dashboard.platformOperator.topRestaurants')],
        [t('pages.dashboard.export.table.rank'), t('pages.dashboard.export.table.restaurantName'), t('pages.dashboard.export.table.tenantName'), t('pages.dashboard.export.table.orders'), t('pages.dashboard.export.table.revenue'), t('pages.dashboard.export.table.carbonReduction'), t('pages.dashboard.export.table.certificationLevel')],
        ...topRestaurants.map((r) => [
          r.rank,
          r.restaurantName,
          r.tenantName || r.tenantId,
          r.orders,
          `¥${r.revenue.toLocaleString()}`,
          `${r.carbonReduction.toLocaleString()} kg`,
          r.certificationLevel || t('pages.dashboard.export.notCertified'),
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t('pages.dashboard.export.platformOperator.sheetName'))
      
      const fileName = `${t('pages.dashboard.export.platformOperator.fileName')}_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      message.destroy()
      message.success(t('common.exportSuccess'))
    } catch (error: any) {
      message.destroy()
      message.error(error.message || t('common.exportFailed'))
    }
  }

  const handleExportSystemData = async () => {
    try {
      message.loading(t('pages.dashboard.exporting'), 0)
      
      const exportData = [
        [t('pages.dashboard.export.systemAdmin.title')],
        [],
        [t('pages.dashboard.export.systemAdmin.systemHealth')],
        [t('pages.dashboard.systemAdmin.totalUsers'), systemData.totalUsers],
        [t('pages.dashboard.systemAdmin.activeUsers'), systemData.activeUsers],
        [t('pages.dashboard.systemAdmin.systemAlerts'), systemData.systemAlerts],
        [t('pages.dashboard.systemAdmin.backupStatus'), systemData.backupStatus === 'success' ? t('pages.dashboard.systemAdmin.backupSuccess') : t('pages.dashboard.systemAdmin.backupUnknown')],
        [],
        [t('pages.dashboard.export.systemAdmin.usageStats')],
        [t('pages.dashboard.systemAdmin.todayLogins'), systemData.todayLogins],
        [t('pages.dashboard.systemAdmin.todayOperations'), systemData.todayOperations],
        [t('pages.dashboard.systemAdmin.databaseUsage'), `${systemData.databaseUsage}%`],
        [t('pages.dashboard.systemAdmin.apiCalls'), systemData.apiCalls],
        [],
        [t('pages.dashboard.systemAdmin.recentLogs')],
        [t('pages.dashboard.export.table.time'), t('pages.dashboard.export.table.username'), t('pages.dashboard.export.table.role'), t('pages.dashboard.export.table.action'), t('pages.dashboard.export.table.resource'), t('pages.dashboard.export.table.status')],
        ...recentLogs.map((log) => [
          dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          log.username,
          log.role || '-',
          log.action,
          log.resource,
          log.status,
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t('pages.dashboard.export.systemAdmin.sheetName'))
      
      const fileName = `${t('pages.dashboard.export.systemAdmin.fileName')}_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      message.destroy()
      message.success(t('common.exportSuccess'))
    } catch (error: any) {
      message.destroy()
      message.error(error.message || t('common.exportFailed'))
    }
  }

  // 导出餐厅管理员数据
  const handleExportRestaurantData = async () => {
    try {
      message.loading(t('pages.dashboard.exporting'), 0)
      
      const exportData = [
        [t('pages.dashboard.export.restaurantAdmin.title')],
        [],
        [t('pages.dashboard.export.restaurantAdmin.coreMetrics')],
        [t('pages.dashboard.statistics.totalRecipes'), restaurantData.totalRecipes],
        [t('pages.dashboard.statistics.totalCarbonReduction'), `${restaurantData.totalCarbonReduction.toLocaleString()} kg CO₂e`],
        [t('pages.dashboard.statistics.certifiedRestaurants'), restaurantData.certifiedRestaurants],
        [t('pages.dashboard.statistics.activeUsers'), restaurantData.activeUsers],
        [],
        [t('pages.dashboard.export.restaurantAdmin.todayData')],
        [t('pages.dashboard.statistics.todayOrders'), restaurantData.todayOrders],
        [t('pages.dashboard.statistics.todayRevenue'), `¥${restaurantData.todayRevenue.toLocaleString()}`],
        [],
        [t('pages.dashboard.export.restaurantAdmin.trendData')],
        [t('pages.dashboard.restaurantAdmin.charts.orderTrend')],
        [t('pages.dashboard.export.table.time'), t('pages.dashboard.restaurantAdmin.charts.orders'), t('pages.dashboard.restaurantAdmin.charts.revenue')],
        ...(trendsData.orders || []).map((item, index) => [
          dayjs(item.date).format('YYYY-MM-DD'),
          item.count,
          (trendsData.revenue && trendsData.revenue[index]) ? trendsData.revenue[index].amount : 0,
        ]),
        [],
        [t('pages.dashboard.restaurantAdmin.charts.carbonTrend')],
        [t('pages.dashboard.export.table.time'), t('pages.dashboard.restaurantAdmin.charts.carbonReduction')],
        ...(trendsData.carbonReduction || []).map((item) => [
          dayjs(item.date).format('YYYY-MM-DD'),
          `${item.amount.toLocaleString()} kg`,
        ]),
        [],
        [t('pages.dashboard.restaurantAdmin.topRecipes')],
        [t('pages.dashboard.export.table.rank'), t('pages.dashboard.export.restaurantAdmin.recipeName'), t('pages.dashboard.export.table.orders'), t('pages.dashboard.export.table.revenue'), t('pages.dashboard.export.table.carbonReduction')],
        ...topRecipes.map((r) => [
          r.rank,
          r.recipeName,
          r.orders,
          `¥${r.revenue.toLocaleString()}`,
          `${r.carbonReduction.toLocaleString()} kg`,
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t('pages.dashboard.export.restaurantAdmin.sheetName'))
      
      const fileName = `${t('pages.dashboard.export.restaurantAdmin.fileName')}_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      message.destroy()
      message.success(t('common.exportSuccess'))
    } catch (error: any) {
      message.destroy()
      message.error(error.message || t('common.exportFailed'))
    }
  }

  const handleExportCarbonData = async () => {
    try {
      message.loading(t('pages.dashboard.exporting'), 0)
      
      const exportData = [
        [t('pages.dashboard.export.carbonSpecialist.title')],
        [],
        [t('pages.dashboard.export.carbonSpecialist.coreMetrics')],
        [t('pages.dashboard.carbonSpecialist.totalCarbonReduction'), `${carbonData.totalCarbonReduction.toLocaleString()} kg CO₂e`],
        [t('pages.dashboard.carbonSpecialist.baselineCount'), carbonData.baselineCount],
        [t('pages.dashboard.carbonSpecialist.activeBaselineCount'), carbonData.activeBaselineCount],
        [t('pages.dashboard.carbonSpecialist.pendingBaselineCount'), carbonData.pendingBaselineCount],
        [],
        [t('pages.dashboard.export.carbonSpecialist.carbonStats')],
        [t('pages.dashboard.carbonSpecialist.todayCarbonReduction'), `${carbonData.todayCarbonReduction.toLocaleString()} kg CO₂e`],
        [t('pages.dashboard.carbonSpecialist.monthCarbonReduction'), `${carbonData.monthCarbonReduction.toLocaleString()} kg CO₂e`],
        [t('pages.dashboard.carbonSpecialist.averageCarbonPerOrder'), `${carbonData.averageCarbonPerOrder.toFixed(2)} kg CO₂e/单`],
        [],
        [t('pages.dashboard.carbonSpecialist.topRestaurants')],
        [t('pages.dashboard.export.table.rank'), t('pages.dashboard.export.table.restaurantName'), t('pages.dashboard.export.table.tenantName'), t('pages.dashboard.export.table.totalCarbonReduction'), t('pages.dashboard.export.table.monthCarbonReduction'), t('pages.dashboard.export.table.avgCarbonPerOrder')],
        ...topCarbonRestaurants.map((r) => [
          r.rank,
          r.restaurantName,
          r.tenantName || r.tenantId,
          `${r.carbonReduction.toLocaleString()} kg`,
          `${(r.monthCarbonReduction || 0).toLocaleString()} kg`,
          `${(r.averageCarbonPerOrder || 0).toFixed(2)} kg/单`,
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t('pages.dashboard.export.carbonSpecialist.sheetName'))
      
      const fileName = `${t('pages.dashboard.export.carbonSpecialist.fileName')}_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      message.destroy()
      message.success(t('common.exportSuccess'))
    } catch (error: any) {
      message.destroy()
      message.error(error.message || t('common.exportFailed'))
    }
  }

  // 餐厅管理员看板
  const renderRestaurantAdminDashboard = () => {
    // 计算趋势百分比
    const ordersTrend = restaurantData.yesterdayOrders 
      ? ((restaurantData.todayOrders - restaurantData.yesterdayOrders) / restaurantData.yesterdayOrders * 100).toFixed(1)
      : '0'
    const revenueTrend = restaurantData.yesterdayRevenue 
      ? ((restaurantData.todayRevenue - restaurantData.yesterdayRevenue) / restaurantData.yesterdayRevenue * 100).toFixed(1)
      : '0'

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ margin: 0 }}>{t('pages.dashboard.title')}</h1>
            {currentRestaurant && (
              <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                {t('pages.dashboard.tags.currentView', { name: currentRestaurant.name })}
              </Tag>
            )}
            {!currentRestaurantId && currentTenant && (
              <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                {t('pages.dashboard.tags.viewAll', { count: restaurants.length })}
              </Tag>
            )}
          </div>
          <Space>
            <Select
              value={period}
              onChange={(value) => {
                setPeriod(value)
                // 根据选择的时间段自动更新日期范围
                const today = dayjs()
                let startDate: dayjs.Dayjs
                switch (value) {
                  case '7days':
                    startDate = today.subtract(7, 'day')
                    break
                  case '30days':
                    startDate = today.subtract(30, 'day')
                    break
                  case '90days':
                    startDate = today.subtract(90, 'day')
                    break
                  default:
                    startDate = today.subtract(30, 'day')
                }
                setDateRange([startDate, today])
              }}
              style={{ width: 120 }}
            >
              <Select.Option value="7days">{t('pages.dashboard.periods.last7Days')}</Select.Option>
              <Select.Option value="30days">{t('pages.dashboard.periods.last30Days')}</Select.Option>
              <Select.Option value="90days">{t('pages.dashboard.periods.last90Days')}</Select.Option>
            </Select>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => {
                // 直接设置日期范围，不进行任何自动调整
                // 允许用户选择任意日期范围，包括终止日期早于起始日期的情况
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
                // 当用户手动选择日期时，将period设置为空或自定义状态
                // 这里可以设置为'custom'，但需要先添加这个选项
              }}
              format="YYYY-MM-DD"
              allowClear
              // 禁用默认的日期范围限制，允许选择任意日期
              disabledDate={() => false}
            />
            <Button icon={<ExportOutlined />} onClick={() => handleExportRestaurantData()} loading={loading}>
              {t('pages.dashboard.exportButton')}
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => {
                // 手动刷新时，重置fetching状态
                isFetchingRef.current = false
                fetchRestaurantData()
              }} 
              loading={loading}
            >
              {t('common.refresh')}
            </Button>
          </Space>
        </div>

      <Alert
        message={
          currentRestaurant
            ? t('pages.dashboard.alerts.welcomeRestaurant', { name: currentRestaurant.name })
            : currentTenant
            ? t('pages.dashboard.alerts.welcomeTenant', { name: currentTenant.name })
            : t('pages.dashboard.alerts.welcomeSystem')
        }
        description={
          currentRestaurant
            ? t('pages.dashboard.alerts.descriptionRestaurant', { name: currentRestaurant.name })
            : currentTenant
            ? t('pages.dashboard.alerts.descriptionTenant', { name: currentTenant.name })
            : t('pages.dashboard.alerts.descriptionSystem')
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Tooltip title={t('pages.dashboard.restaurantAdmin.tooltips.totalRecipes')}>
            <Card
              hoverable
              onClick={() => navigate('/recipe/list')}
              style={{ cursor: 'pointer' }}
            >
              <Statistic
                title={t('pages.dashboard.statistics.totalRecipes')}
                value={restaurantData.totalRecipes}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#3f8600' }}
                loading={loading}
              />
            </Card>
          </Tooltip>
        </Col>
        <Col span={6}>
          <Tooltip title={t('pages.dashboard.restaurantAdmin.tooltips.totalCarbonReduction')}>
            <Card
              hoverable
              onClick={() => navigate('/carbon')}
              style={{ cursor: 'pointer' }}
            >
              <Statistic
                title={t('pages.dashboard.statistics.totalCarbonReduction')}
                value={restaurantData.totalCarbonReduction}
                suffix="kg CO₂e"
                prefix={<FireOutlined />}
                valueStyle={{ color: '#cf1322' }}
                loading={loading}
              />
            </Card>
          </Tooltip>
        </Col>
        {/* 认证餐厅栏：仅在查看所有餐厅时显示，选择具体餐厅时隐藏 */}
        {!currentRestaurantId && (
          <Col span={6}>
            <Tooltip title={t('pages.dashboard.restaurantAdmin.tooltips.certifiedRestaurants')}>
              <Card
                hoverable
                onClick={() => navigate('/certification')}
                style={{ cursor: 'pointer' }}
              >
                <Statistic
                  title={t('pages.dashboard.statistics.certifiedRestaurants')}
                  value={restaurantData.certifiedRestaurants}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                  loading={loading}
                />
              </Card>
            </Tooltip>
          </Col>
        )}
        <Col span={currentRestaurantId ? 12 : 6}>
          <Tooltip title={t('pages.dashboard.restaurantAdmin.tooltips.activeUsers')}>
            <Card>
              <Statistic
                title={t('pages.dashboard.statistics.activeUsers')}
                value={restaurantData.activeUsers}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#722ed1' }}
                loading={loading}
              />
            </Card>
          </Tooltip>
        </Col>
      </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Tooltip title={t('pages.dashboard.restaurantAdmin.tooltips.todayOrders')}>
              <Card
                hoverable
                onClick={() => navigate('/orders')}
                style={{ cursor: 'pointer' }}
              >
                <Statistic
                  title={t('pages.dashboard.statistics.todayOrders')}
                  value={restaurantData.todayOrders}
                  prefix={<ShoppingCartOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                  loading={loading}
                  suffix={
                    restaurantData.yesterdayOrders !== undefined ? (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <span style={{ color: Number(ordersTrend) >= 0 ? '#52c41a' : '#f5222d' }}>
                          {Number(ordersTrend) >= 0 ? '↑' : '↓'} {Math.abs(Number(ordersTrend))}%
                        </span>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                          {t('pages.dashboard.restaurantAdmin.vsYesterday')}
                        </div>
                      </div>
                    ) : null
                  }
                />
              </Card>
            </Tooltip>
          </Col>
          <Col span={6}>
            <Tooltip title={t('pages.dashboard.restaurantAdmin.tooltips.todayRevenue')}>
              <Card
                hoverable
                onClick={() => navigate('/reports')}
                style={{ cursor: 'pointer' }}
              >
                <Statistic
                  title={t('pages.dashboard.statistics.todayRevenue')}
                  value={restaurantData.todayRevenue}
                  prefix="¥"
                  valueStyle={{ color: '#52c41a' }}
                  loading={loading}
                  suffix={
                    restaurantData.yesterdayRevenue !== undefined ? (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <span style={{ color: Number(revenueTrend) >= 0 ? '#52c41a' : '#f5222d' }}>
                          {Number(revenueTrend) >= 0 ? '↑' : '↓'} {Math.abs(Number(revenueTrend))}%
                        </span>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                          {t('pages.dashboard.restaurantAdmin.vsYesterday')}
                        </div>
                      </div>
                    ) : null
                  }
                />
              </Card>
            </Tooltip>
          </Col>
        </Row>

        {/* 趋势图表区域 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={24} md={24} lg={12} xl={12}>
            <Card title={t('pages.dashboard.restaurantAdmin.charts.orderTrend')}>
              {loading && (!trendsData.orders || trendsData.orders.length === 0) ? (
                <Skeleton active paragraph={{ rows: 8 }} />
              ) : (!trendsData.orders || trendsData.orders.length === 0) ? (
                <Empty
                  description={t('pages.dashboard.restaurantAdmin.empty.noOrderData')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button type="primary" onClick={() => fetchRestaurantData()}>
                    {t('common.refresh')}
                  </Button>
                </Empty>
              ) : (
                <div ref={restaurantTrendChartRef} style={{ width: '100%', height: 300 }} />
              )}
            </Card>
          </Col>
          <Col xs={24} sm={24} md={24} lg={12} xl={12}>
            <Card title={t('pages.dashboard.restaurantAdmin.charts.carbonTrend')}>
              {loading && (!trendsData.carbonReduction || trendsData.carbonReduction.length === 0) ? (
                <Skeleton active paragraph={{ rows: 8 }} />
              ) : (!trendsData.carbonReduction || trendsData.carbonReduction.length === 0) ? (
                <Empty
                  description={t('pages.dashboard.restaurantAdmin.empty.noCarbonData')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button type="primary" onClick={() => fetchRestaurantData()}>
                    {t('common.refresh')}
                  </Button>
                </Empty>
              ) : (
                <div ref={restaurantCarbonChartRef} style={{ width: '100%', height: 300 }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* 待办事项卡片 */}
        {todoItems.length > 0 && (
          <Card title={t('pages.dashboard.restaurantAdmin.todos.title')} style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
              {todoItems.map((item) => (
                <Col xs={24} sm={12} md={12} lg={6} xl={6} key={item.id}>
                  <Card
                    hoverable
                    onClick={() => item.link && navigate(item.link)}
                    style={{ cursor: item.link ? 'pointer' : 'default' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                          {item.title}
                        </div>
                        {item.count !== undefined && (
                          <Badge count={item.count} showZero={false} />
                        )}
                      </div>
                      {item.type === 'certification' && <TrophyOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                      {item.type === 'recipe' && <BookOutlined style={{ fontSize: 24, color: '#3f8600' }} />}
                      {item.type === 'order' && <ShoppingCartOutlined style={{ fontSize: 24, color: '#fa8c16' }} />}
                      {item.type === 'notification' && <BellOutlined style={{ fontSize: 24, color: '#722ed1' }} />}
                    </div>
                    {item.description && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                        {item.description}
                      </div>
                    )}
                    {item.link && (
                      <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }}>
                        {t('pages.dashboard.restaurantAdmin.todos.view')} →
                      </Button>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* 热门菜谱排行榜 */}
        <Card 
          title={t('pages.dashboard.restaurantAdmin.topRecipes')} 
          style={{ marginBottom: 24 }}
          extra={
            topRecipes.length > 0 && (
              <Button 
                type="link" 
                size="small" 
                onClick={() => navigate('/recipe/list')}
              >
                {t('pages.dashboard.restaurantAdmin.viewAllRecipes')}
              </Button>
            )
          }
        >
          {loading && topRecipes.length === 0 ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : topRecipes.length === 0 ? (
            <Empty
              description={t('pages.dashboard.restaurantAdmin.empty.noRecipeData')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/recipe/list')}>
                {t('pages.dashboard.restaurantAdmin.empty.goToRecipes')}
              </Button>
            </Empty>
          ) : (
            <Table
              columns={[
                {
                  title: t('pages.dashboard.export.table.rank'),
                  dataIndex: 'rank',
                  key: 'rank',
                  width: 80,
                  render: (rank: number) => {
                    if (rank === 1) return <Tag color="gold">🥇 {rank}</Tag>
                    if (rank === 2) return <Tag color="default">🥈 {rank}</Tag>
                    if (rank === 3) return <Tag color="orange">🥉 {rank}</Tag>
                    return rank
                  },
                },
                {
                  title: t('pages.dashboard.export.restaurantAdmin.recipeName'),
                  dataIndex: 'recipeName',
                  key: 'recipeName',
                  render: (text: string, record: TopRecipe) => (
                    <Button 
                      type="link" 
                      onClick={() => navigate(`/recipe/detail/${record.recipeId}`)}
                      style={{ padding: 0 }}
                    >
                      {text}
                    </Button>
                  ),
                },
                {
                  title: t('pages.dashboard.export.table.orders'),
                  dataIndex: 'orders',
                  key: 'orders',
                  width: 120,
                  sorter: (a: TopRecipe, b: TopRecipe) => a.orders - b.orders,
                  render: (value: number) => value.toLocaleString(),
                },
                {
                  title: t('pages.dashboard.export.table.revenue'),
                  dataIndex: 'revenue',
                  key: 'revenue',
                  width: 150,
                  sorter: (a: TopRecipe, b: TopRecipe) => a.revenue - b.revenue,
                  render: (value: number) => `¥${value.toLocaleString()}`,
                },
                {
                  title: t('pages.dashboard.export.table.carbonReduction'),
                  dataIndex: 'carbonReduction',
                  key: 'carbonReduction',
                  width: 150,
                  sorter: (a: TopRecipe, b: TopRecipe) => a.carbonReduction - b.carbonReduction,
                  render: (value: number) => `${value.toLocaleString()} kg`,
                },
              ]}
              dataSource={topRecipes}
              rowKey="recipeId"
              loading={loading}
              pagination={false}
              size="small"
            />
          )}
        </Card>

        {/* 快速入口区域 */}
        <Card title={t('pages.dashboard.quickAccess.title')}>
          <Row gutter={[16, 16]}>
            {/* 第一行：3个卡片 */}
            <Col xs={24} sm={24} md={12} lg={8} xl={8}>
              <Card
                hoverable
                onClick={() => navigate('/orders')}
                style={{ cursor: 'pointer', height: '100%' }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 24, color: '#fa8c16' }}>
                    <ShoppingCartOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      {t('pages.dashboard.quickAccess.modules.operation')}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12} lg={8} xl={8}>
              <Card
                hoverable
                onClick={() => navigate('/reports')}
                style={{ cursor: 'pointer', height: '100%' }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 24, color: '#1890ff' }}>
                    <FileTextOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      {t('pages.dashboard.quickAccess.modules.report')}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12} lg={8} xl={8}>
              <Card
                hoverable
                onClick={() => navigate('/recipe/list')}
                style={{ cursor: 'pointer', height: '100%' }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 24, color: '#3f8600' }}>
                    <BookOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      {t('pages.dashboard.restaurantAdmin.quickActions.manageRecipes')}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
            {/* 第二行：2个卡片 */}
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Card
                hoverable
                onClick={() => navigate('/certification')}
                style={{ cursor: 'pointer', height: '100%' }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 24, color: '#1890ff' }}>
                    <TrophyOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      {t('pages.dashboard.quickAccess.modules.certification')}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Card
                hoverable
                onClick={() => navigate('/carbon')}
                style={{ cursor: 'pointer', height: '100%' }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 24, color: '#cf1322' }}>
                    <FireOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      {t('pages.dashboard.quickAccess.modules.carbon')}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
            {/* 第三行：1个卡片 */}
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Card
                hoverable
                onClick={() => navigate('/traceability')}
                style={{ cursor: 'pointer', height: '100%' }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 24, color: '#722ed1' }}>
                    <EnvironmentOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                      {t('pages.dashboard.quickAccess.modules.traceability')}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      </>
    )
  }

  // 平台运营看板
  const renderPlatformOperatorDashboard = () => {
    const restaurantColumns: ColumnsType<TopRestaurant> = [
      {
        title: t('pages.platform.statistics.table.columns.rank'),
        dataIndex: 'rank',
        key: 'rank',
        width: 80,
      },
      {
        title: t('pages.platform.statistics.table.columns.restaurantName'),
        dataIndex: 'restaurantName',
        key: 'restaurantName',
      },
      {
        title: t('pages.platform.statistics.table.columns.tenantId'),
        dataIndex: 'tenantId',
        key: 'tenantId',
        width: 120,
      },
      {
        title: t('pages.platform.statistics.table.columns.orders'),
        dataIndex: 'orders',
        key: 'orders',
        width: 100,
        sorter: (a, b) => a.orders - b.orders,
      },
      {
        title: t('pages.platform.statistics.table.columns.revenue'),
        dataIndex: 'revenue',
        key: 'revenue',
        width: 120,
        render: (value: number) => `¥${value.toLocaleString()}`,
        sorter: (a, b) => a.revenue - b.revenue,
      },
      {
        title: t('pages.platform.statistics.table.columns.carbonReduction'),
        dataIndex: 'carbonReduction',
        key: 'carbonReduction',
        width: 120,
        render: (value: number) => `${value.toLocaleString()} kg`,
        sorter: (a, b) => a.carbonReduction - b.carbonReduction,
      },
      {
        title: t('pages.platform.statistics.table.columns.certificationLevel'),
        dataIndex: 'certificationLevel',
        key: 'certificationLevel',
        width: 100,
        render: (level?: string) => {
          if (!level) return '-'
          const levelMap: Record<string, string> = {
            bronze: t('pages.platform.statistics.certificationLevels.bronze'),
            silver: t('pages.platform.statistics.certificationLevels.silver'),
            gold: t('pages.platform.statistics.certificationLevels.gold'),
            platinum: t('pages.platform.statistics.certificationLevels.platinum'),
          }
          return levelMap[level] || level
        },
      },
    ]

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>{t('pages.dashboard.title')}</h1>
          <Space>
            <Select
              value={period}
              onChange={(value) => {
                setPeriod(value)
                // 根据选择的时间段自动更新日期范围
                const today = dayjs()
                let startDate: dayjs.Dayjs
                switch (value) {
                  case '7days':
                    startDate = today.subtract(7, 'day')
                    break
                  case '30days':
                    startDate = today.subtract(30, 'day')
                    break
                  case '90days':
                    startDate = today.subtract(90, 'day')
                    break
                  default:
                    startDate = today.subtract(30, 'day')
                }
                setDateRange([startDate, today])
              }}
              style={{ width: 120 }}
            >
              <Select.Option value="7days">{t('pages.dashboard.periods.last7Days')}</Select.Option>
              <Select.Option value="30days">{t('pages.dashboard.periods.last30Days')}</Select.Option>
              <Select.Option value="90days">{t('pages.dashboard.periods.last90Days')}</Select.Option>
            </Select>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => {
                // 直接设置日期范围，不进行任何自动调整
                // 允许用户选择任意日期范围，包括终止日期早于起始日期的情况
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
                // 当用户手动选择日期时，将period设置为空或自定义状态
                // 这里可以设置为'custom'，但需要先添加这个选项
              }}
              format="YYYY-MM-DD"
              allowClear
              // 禁用默认的日期范围限制，允许选择任意日期
              disabledDate={() => false}
            />
            <Button icon={<ExportOutlined />} onClick={() => handleExportPlatformData()} loading={loading}>
              {t('pages.dashboard.exportButton')}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchPlatformData()} loading={loading}>
              {t('common.refresh')}
            </Button>
          </Space>
        </div>

        <Alert
          message={t('pages.dashboard.alerts.welcomeSystem')}
          description={t('pages.dashboard.alerts.descriptionSystem')}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 核心指标卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card
              hoverable
              onClick={() => navigate('/platform/tenants')}
              style={{ cursor: 'pointer' }}
            >
              <Statistic
                title={t('pages.dashboard.platformOperator.totalTenants')}
                value={platformData.totalTenants}
                prefix={<ShopOutlined />}
                valueStyle={{ color: '#1890ff' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.platformOperator.activeTenants')}
                value={platformData.activeTenants}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
                suffix={
                  platformData.totalTenants > 0
                    ? `(${((platformData.activeTenants / platformData.totalTenants) * 100).toFixed(1)}%)`
                    : ''
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.platformOperator.totalRestaurants')}
                value={platformData.totalRestaurants}
                prefix={<ShopOutlined />}
                valueStyle={{ color: '#fa8c16' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card
              hoverable
              onClick={() => navigate('/platform/account-approvals')}
              style={{ cursor: 'pointer' }}
            >
              <Statistic
                title={t('pages.dashboard.platformOperator.pendingApplications')}
                value={platformData.pendingApplications}
                prefix={<BellOutlined />}
                valueStyle={{ color: platformData.pendingApplications > 0 ? '#cf1322' : '#8c8c8c' }}
                loading={loading}
              />
              {platformData.pendingApplications > 0 && (
                <Badge count={platformData.pendingApplications} style={{ marginTop: 8 }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* 业务数据卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={12} lg={6} xl={6}>
            <Tooltip title={t('pages.dashboard.platformOperator.tooltips.totalOrders')}>
              <Card>
                <Statistic
                  title={t('pages.dashboard.platformOperator.totalOrders')}
                  value={platformData.totalOrders}
                  prefix={<ShoppingCartOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                  loading={loading}
                />
              </Card>
            </Tooltip>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6} xl={6}>
            <Tooltip title={t('pages.dashboard.platformOperator.tooltips.totalRevenue')}>
              <Card>
                <Statistic
                  title={t('pages.dashboard.platformOperator.totalRevenue')}
                  value={platformData.totalRevenue}
                  prefix="¥"
                  valueStyle={{ color: '#faad14' }}
                  loading={loading}
                />
              </Card>
            </Tooltip>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6} xl={6}>
            <Tooltip title={t('pages.dashboard.platformOperator.tooltips.totalCarbonReduction')}>
              <Card>
                <Statistic
                  title={t('pages.dashboard.platformOperator.totalCarbonReduction')}
                  value={platformData.totalCarbonReduction}
                  suffix="kg CO₂e"
                  prefix={<FireOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                  loading={loading}
                />
              </Card>
            </Tooltip>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6} xl={6}>
            <Tooltip title={t('pages.dashboard.platformOperator.tooltips.totalUsers')}>
              <Card>
                <Statistic
                  title={t('pages.dashboard.platformOperator.totalUsers')}
                  value={platformData.totalUsers}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#13c2c2' }}
                  loading={loading}
                />
              </Card>
            </Tooltip>
          </Col>
        </Row>

        {/* 趋势图表区域 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={24} md={24} lg={12} xl={12}>
            <Card title={t('pages.dashboard.platformOperator.charts.orderTrend')}>
              <div ref={platformTrendChartRef} style={{ width: '100%', height: 300 }} />
            </Card>
          </Col>
          <Col xs={24} sm={24} md={24} lg={12} xl={12}>
            <Card title={t('pages.dashboard.platformOperator.charts.tenantGrowth')}>
              <div ref={platformGrowthChartRef} style={{ width: '100%', height: 300 }} />
            </Card>
          </Col>
        </Row>

        {/* 快速操作区域 */}
        <Card title={t('pages.dashboard.platformOperator.quickActions')} style={{ marginBottom: 24 }}>
          <Space wrap>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => navigate('/platform/account-approvals')}
            >
              {t('pages.dashboard.platformOperator.approveApplications')}
            </Button>
            <Button icon={<ShopOutlined />} onClick={() => navigate('/platform/tenants')}>
              {t('pages.dashboard.platformOperator.viewTenants')}
            </Button>
            <Button icon={<ShopOutlined />} onClick={() => navigate('/platform/restaurants')}>
              {t('pages.dashboard.platformOperator.viewRestaurants')}
            </Button>
            <Button icon={<BarChartOutlined />} onClick={() => navigate('/platform/statistics')}>
              {t('pages.dashboard.platformOperator.viewStatistics')}
            </Button>
            <Button icon={<EyeOutlined />} onClick={() => navigate('/platform/cross-tenant')}>
              {t('pages.dashboard.platformOperator.viewCrossTenantData')}
            </Button>
          </Space>
        </Card>

        {/* 餐厅排行榜 */}
        <Card title={t('pages.dashboard.platformOperator.topRestaurants')}>
          <Table
            columns={restaurantColumns}
            dataSource={topRestaurants}
            rowKey="rank"
            loading={loading}
            pagination={false}
            size="small"
          />
        </Card>
      </>
    )
  }

  // 系统管理员看板
  const renderSystemAdminDashboard = () => {
    const logColumns: ColumnsType<AuditLog> = [
      {
        title: t('pages.platform.operationLog.table.columns.time'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        title: t('pages.platform.operationLog.table.columns.user'),
        dataIndex: 'username',
        key: 'username',
        width: 120,
      },
      {
        title: t('pages.platform.operationLog.table.columns.role'),
        dataIndex: 'role',
        key: 'role',
        width: 100,
      },
      {
        title: t('pages.platform.operationLog.table.columns.action'),
        dataIndex: 'action',
        key: 'action',
        width: 100,
      },
      {
        title: t('pages.platform.operationLog.table.columns.resource'),
        dataIndex: 'resource',
        key: 'resource',
        width: 100,
      },
      {
        title: t('pages.platform.operationLog.table.columns.status'),
        dataIndex: 'status',
        key: 'status',
        width: 80,
        render: (status: string) => {
          const config: Record<string, { color: string; text: string }> = {
            success: { color: 'success', text: t('pages.platform.operationLog.status.success') },
            failed: { color: 'error', text: t('pages.platform.operationLog.status.failed') },
            pending: { color: 'processing', text: t('pages.platform.operationLog.status.pending') },
          }
          const cfg = config[status] || { color: 'default', text: status }
          return <Tag color={cfg.color}>{cfg.text}</Tag>
        },
      },
    ]

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>{t('pages.dashboard.title')}</h1>
          <Space>
            <Button icon={<ExportOutlined />} onClick={() => handleExportSystemData()} loading={loading}>
              {t('pages.dashboard.exportButton')}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchSystemData()} loading={loading}>
              {t('common.refresh')}
            </Button>
          </Space>
        </div>

        <Alert
          message={t('pages.dashboard.alerts.welcomeSystem')}
          description={t('pages.dashboard.alerts.descriptionSystem')}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 系统健康指标 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card
              hoverable
              onClick={() => navigate('/system/users')}
              style={{ cursor: 'pointer' }}
            >
              <Statistic
                title={t('pages.dashboard.systemAdmin.totalUsers')}
                value={systemData.totalUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.systemAdmin.activeUsers')}
                value={systemData.activeUsers}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
                suffix={
                  systemData.totalUsers > 0
                    ? `(${((systemData.activeUsers / systemData.totalUsers) * 100).toFixed(1)}%)`
                    : ''
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card
              hoverable
              onClick={() => navigate('/system/monitor')}
              style={{ cursor: 'pointer' }}
            >
              <Statistic
                title={t('pages.dashboard.systemAdmin.systemAlerts')}
                value={systemData.systemAlerts}
                prefix={<WarningOutlined />}
                valueStyle={{ color: systemData.systemAlerts > 0 ? '#cf1322' : '#8c8c8c' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.systemAdmin.backupStatus')}
                value={systemData.backupStatus === 'success' ? t('pages.dashboard.systemAdmin.backupSuccess') : t('pages.dashboard.systemAdmin.backupUnknown')}
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: systemData.backupStatus === 'success' ? '#52c41a' : '#8c8c8c' }}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        {/* 系统使用统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.systemAdmin.todayLogins')}
                value={systemData.todayLogins}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.systemAdmin.todayOperations')}
                value={systemData.todayOperations}
                prefix={<SettingOutlined />}
                valueStyle={{ color: '#fa8c16' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.systemAdmin.databaseUsage')}
                value={systemData.databaseUsage}
                suffix="%"
                prefix={<DatabaseOutlined />}
                valueStyle={{
                  color:
                    systemData.databaseUsage >= 80
                      ? '#cf1322'
                      : systemData.databaseUsage >= 60
                      ? '#faad14'
                      : '#52c41a',
                }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.systemAdmin.apiCalls')}
                value={systemData.apiCalls}
                prefix={<ApiOutlined />}
                valueStyle={{ color: '#13c2c2' }}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        {/* 快速操作区域 */}
        <Card title={t('pages.dashboard.systemAdmin.quickActions')} style={{ marginBottom: 24 }}>
          <Space wrap>
            <Button type="primary" icon={<UserOutlined />} onClick={() => navigate('/system/users')}>
              {t('pages.dashboard.systemAdmin.userManagement')}
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/system/roles')}>
              {t('pages.dashboard.systemAdmin.roleManagement')}
            </Button>
            <Button icon={<EyeOutlined />} onClick={() => navigate('/system/monitor')}>
              {t('pages.dashboard.systemAdmin.systemMonitor')}
            </Button>
            <Button icon={<DatabaseOutlined />} onClick={() => navigate('/system/backup')}>
              {t('pages.dashboard.systemAdmin.dataBackup')}
            </Button>
            <Button icon={<FileTextOutlined />} onClick={() => navigate('/platform/operation-log')}>
              {t('pages.dashboard.systemAdmin.operationLog')}
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/system/audit')}>
              {t('pages.dashboard.systemAdmin.auditLog')}
            </Button>
          </Space>
        </Card>

        {/* 最近操作日志 */}
        <Card title={t('pages.dashboard.systemAdmin.recentLogs')}>
          <Table
            columns={logColumns}
            dataSource={recentLogs}
            rowKey="_id"
            loading={loading}
            pagination={false}
            size="small"
          />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button type="link" onClick={() => navigate('/platform/operation-log')}>
              {t('pages.dashboard.systemAdmin.viewAllLogs')}
            </Button>
          </div>
        </Card>
      </>
    )
  }

  // 图表渲染函数
  const renderPlatformTrendChart = () => {
    if (!platformTrendChartRef.current || !trendsData.orders || trendsData.orders.length === 0) return

    const existingChart = echarts.getInstanceByDom(platformTrendChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(platformTrendChartRef.current)
    const theme = getBrandChartTheme()
    const option = {
      ...theme,
      title: {
        text: t('pages.dashboard.platformOperator.charts.orderTrend'),
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: [
          t('pages.dashboard.platformOperator.charts.orders'),
          t('pages.dashboard.platformOperator.charts.revenue'),
        ],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: trendsData.orders.map((item) => dayjs(item.date).format('MM-DD')),
      },
      yAxis: [
        {
          type: 'value',
          name: t('pages.dashboard.platformOperator.charts.orders'),
          position: 'left',
        },
        {
          type: 'value',
          name: t('pages.dashboard.platformOperator.charts.revenue'),
          position: 'right',
        },
      ],
      series: [
        {
          name: t('pages.dashboard.platformOperator.charts.orders'),
          type: 'line',
          data: trendsData.orders.map((item) => item.count),
          smooth: true,
          itemStyle: {
            color: '#722ed1', // 紫色 - 订单数
          },
          lineStyle: {
            color: '#722ed1',
            width: 2,
          },
        },
        {
          name: t('pages.dashboard.platformOperator.charts.revenue'),
          type: 'line',
          yAxisIndex: 1,
          data: trendsData.revenue?.map((item) => item.amount) || [],
          smooth: true,
          itemStyle: {
            color: '#faad14', // 金色 - 收入
          },
          lineStyle: {
            color: '#faad14',
            width: 2,
          },
        },
      ],
    }

    chart.setOption(option)
  }

  const renderPlatformGrowthChart = () => {
    if (!platformGrowthChartRef.current) return

    const existingChart = echarts.getInstanceByDom(platformGrowthChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(platformGrowthChartRef.current)
    const theme = getBrandChartTheme()
    
    // 从租户数据计算增长趋势（基于创建时间）
    let growthData: Array<{ date: string; tenantCount: number; restaurantCount: number }> = []
    if (trendsData.tenantGrowth && trendsData.tenantGrowth.length > 0) {
      // 处理趋势数据，支持不同的数据结构
      growthData = trendsData.tenantGrowth.map((item: any) => {
        // 如果item是对象，直接使用；如果是简单结构，需要转换
        if (typeof item === 'object' && item !== null) {
          return {
            date: item.date || item.day || '',
            tenantCount: item.count || item.tenantCount || item.tenant_count || 0,
            restaurantCount: item.restaurantCount || item.restaurant_count || 0,
          }
        }
        return { date: '', tenantCount: 0, restaurantCount: 0 }
      }).filter(item => item.date) // 过滤掉无效数据
    } else {
      // 如果没有趋势数据，使用空数据避免显示错误
      growthData = []
    }

    const option = {
      ...theme,
      title: {
        text: t('pages.dashboard.platformOperator.charts.tenantGrowth'),
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        // 使用默认formatter，避免信息重叠
      },
      legend: {
        data: [
          t('pages.dashboard.platformOperator.charts.newTenants'),
          t('pages.dashboard.platformOperator.charts.newRestaurants'),
        ],
        bottom: 0,
        itemGap: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: growthData.length > 0 
          ? growthData.map((item) => dayjs(item.date).format('MM-DD'))
          : [],
        axisLabel: {
          rotate: 0,
          interval: growthData.length > 30 ? Math.floor(growthData.length / 10) : 'auto',
        },
      },
      yAxis: {
        type: 'value',
        name: t('pages.dashboard.platformOperator.charts.count'),
        nameLocation: 'middle',
        nameGap: 40,
      },
      series: [
        {
          name: t('pages.dashboard.platformOperator.charts.newTenants'),
          type: 'bar',
          data: growthData.length > 0 
            ? growthData.map((item) => item.tenantCount)
            : [],
          itemStyle: {
            color: '#1890ff', // 蓝色 - 租户
          },
          barWidth: '35%',
          barGap: '20%',
        },
        {
          name: t('pages.dashboard.platformOperator.charts.newRestaurants'),
          type: 'bar',
          data: growthData.length > 0 
            ? growthData.map((item) => item.restaurantCount)
            : [],
          itemStyle: {
            color: '#fa8c16', // 橙色 - 餐厅
          },
          barWidth: '35%',
        },
      ],
    }

    chart.setOption(option)
  }

  const renderCarbonTrendChart = () => {
    if (!carbonTrendChartRef.current || !trendsData.carbonReduction || trendsData.carbonReduction.length === 0) return

    const existingChart = echarts.getInstanceByDom(carbonTrendChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(carbonTrendChartRef.current)
    const theme = getBrandChartTheme()
    const option = {
      ...theme,
      title: {
        text: t('pages.dashboard.carbonSpecialist.charts.carbonTrend'),
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = params[0]
          return `${param.axisValue}<br/>${param.seriesName}: ${param.value.toFixed(2)} kg CO₂e`
        },
      },
      xAxis: {
        type: 'category',
        data: trendsData.carbonReduction.map((item) => dayjs(item.date).format('MM-DD')),
      },
      yAxis: {
        type: 'value',
        name: t('pages.dashboard.carbonSpecialist.charts.carbonReduction'),
      },
      series: [
        {
          name: t('pages.dashboard.carbonSpecialist.charts.carbonReduction'),
          type: 'line',
          data: trendsData.carbonReduction.map((item) => item.amount),
          smooth: true,
          areaStyle: {},
        },
      ],
    }

    chart.setOption(option)
  }

  const renderCarbonLabelChart = () => {
    if (!carbonLabelChartRef.current) return

    const existingChart = echarts.getInstanceByDom(carbonLabelChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(carbonLabelChartRef.current)
    const theme = getBrandChartTheme()
    const { carbonLabelDistribution } = carbonData
    const option = {
      ...theme,
      title: {
        text: t('pages.dashboard.carbonSpecialist.charts.labelDistribution'),
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: [
          t('pages.dashboard.carbonSpecialist.labels.ultraLow'),
          t('pages.dashboard.carbonSpecialist.labels.low'),
          t('pages.dashboard.carbonSpecialist.labels.medium'),
          t('pages.dashboard.carbonSpecialist.labels.high'),
        ],
      },
      series: [
        {
          name: t('pages.dashboard.carbonSpecialist.charts.labelDistribution'),
          type: 'pie',
          radius: '50%',
          data: [
            {
              value: carbonLabelDistribution.ultraLow,
              name: t('pages.dashboard.carbonSpecialist.labels.ultraLow'),
            },
            {
              value: carbonLabelDistribution.low,
              name: t('pages.dashboard.carbonSpecialist.labels.low'),
            },
            {
              value: carbonLabelDistribution.medium,
              name: t('pages.dashboard.carbonSpecialist.labels.medium'),
            },
            {
              value: carbonLabelDistribution.high,
              name: t('pages.dashboard.carbonSpecialist.labels.high'),
            },
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    }

    chart.setOption(option)
  }

  // 餐厅管理员图表渲染函数
  const renderRestaurantTrendChart = () => {
    if (!restaurantTrendChartRef.current) return

    const existingChart = echarts.getInstanceByDom(restaurantTrendChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(restaurantTrendChartRef.current)
    const theme = getBrandChartTheme()
    
    const ordersData = trendsData.orders || []
    const revenueData = trendsData.revenue || []
    
    const option = {
      ...theme,
      title: {
        text: t('pages.dashboard.restaurantAdmin.charts.orderTrend'),
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      toolbox: {
        show: true,
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: t('pages.dashboard.restaurantAdmin.charts.zoom'),
              back: t('pages.dashboard.restaurantAdmin.charts.restore'),
            },
          },
          restore: {
            title: t('pages.dashboard.restaurantAdmin.charts.restore'),
          },
          saveAsImage: {
            title: t('pages.dashboard.restaurantAdmin.charts.saveAsImage'),
          },
        },
        right: 10,
        top: 10,
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100,
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          start: 0,
          end: 100,
        },
      ],
      legend: {
        data: [
          t('pages.dashboard.restaurantAdmin.charts.orders'),
          t('pages.dashboard.restaurantAdmin.charts.revenue'),
        ],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: ordersData.length > 0 
          ? ordersData.map((item) => dayjs(item.date).format('MM-DD'))
          : [],
      },
      yAxis: [
        {
          type: 'value',
          name: t('pages.dashboard.restaurantAdmin.charts.orders'),
          position: 'left',
        },
        {
          type: 'value',
          name: t('pages.dashboard.restaurantAdmin.charts.revenue'),
          position: 'right',
        },
      ],
      series: [
        {
          name: t('pages.dashboard.restaurantAdmin.charts.orders'),
          type: 'line',
          data: ordersData.map((item) => item.count),
          smooth: true,
          itemStyle: {
            color: '#722ed1', // 紫色 - 订单数
          },
          lineStyle: {
            color: '#722ed1',
            width: 2,
          },
        },
        {
          name: t('pages.dashboard.restaurantAdmin.charts.revenue'),
          type: 'line',
          yAxisIndex: 1,
          data: revenueData.map((item) => item.amount),
          smooth: true,
          itemStyle: {
            color: '#faad14', // 金色 - 收入
          },
          lineStyle: {
            color: '#faad14',
            width: 2,
          },
        },
      ],
    }

    chart.setOption(option)
  }

  const renderRestaurantCarbonChart = () => {
    if (!restaurantCarbonChartRef.current) return

    const existingChart = echarts.getInstanceByDom(restaurantCarbonChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(restaurantCarbonChartRef.current)
    const theme = getBrandChartTheme()
    
    const carbonData = trendsData.carbonReduction || []
    
    const option = {
      ...theme,
      title: {
        text: t('pages.dashboard.restaurantAdmin.charts.carbonTrend'),
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      toolbox: {
        show: true,
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: t('pages.dashboard.restaurantAdmin.charts.zoom'),
              back: t('pages.dashboard.restaurantAdmin.charts.restore'),
            },
          },
          restore: {
            title: t('pages.dashboard.restaurantAdmin.charts.restore'),
          },
          saveAsImage: {
            title: t('pages.dashboard.restaurantAdmin.charts.saveAsImage'),
          },
        },
        right: 10,
        top: 10,
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100,
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          start: 0,
          end: 100,
        },
      ],
      xAxis: {
        type: 'category',
        data: carbonData.length > 0 
          ? carbonData.map((item) => dayjs(item.date).format('MM-DD'))
          : [],
      },
      yAxis: {
        type: 'value',
        name: t('pages.dashboard.restaurantAdmin.charts.carbonReduction'),
      },
      series: [
        {
          name: t('pages.dashboard.restaurantAdmin.charts.carbonReduction'),
          type: 'line',
          data: carbonData.map((item) => item.amount),
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34, 197, 94, 0.3)' },
                { offset: 1, color: 'rgba(34, 197, 94, 0.1)' },
              ],
            },
          },
          itemStyle: {
            color: '#22c55e', // 绿色 - 碳减排
          },
          lineStyle: {
            color: '#22c55e',
            width: 2,
          },
        },
      ],
    }

    chart.setOption(option)
  }

  // 图表渲染效果
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isRestaurantAdmin) {
        renderRestaurantTrendChart()
        renderRestaurantCarbonChart()
      } else if (isPlatformOperator) {
        renderPlatformTrendChart()
        renderPlatformGrowthChart()
      } else if (isCarbonSpecialist) {
        renderCarbonTrendChart()
        renderCarbonLabelChart()
      }
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [trendsData, carbonData, isRestaurantAdmin, isPlatformOperator, isCarbonSpecialist])

  // 碳核算专员看板
  const renderCarbonSpecialistDashboard = () => {
    const carbonRestaurantColumns: ColumnsType<TopRestaurant> = [
      {
        title: t('pages.dashboard.carbonSpecialist.table.rank'),
        dataIndex: 'rank',
        key: 'rank',
        width: 80,
        render: (rank: number) => {
          if (rank === 1) return <Tag color="gold">🥇 {rank}</Tag>
          if (rank === 2) return <Tag color="default">🥈 {rank}</Tag>
          if (rank === 3) return <Tag color="orange">🥉 {rank}</Tag>
          return rank
        },
      },
      {
        title: t('pages.dashboard.carbonSpecialist.table.restaurantName'),
        dataIndex: 'restaurantName',
        key: 'restaurantName',
      },
      {
        title: t('pages.dashboard.carbonSpecialist.table.tenantName'),
        dataIndex: 'tenantName',
        key: 'tenantName',
      },
      {
        title: t('pages.dashboard.carbonSpecialist.table.totalCarbonReduction'),
        dataIndex: 'carbonReduction',
        key: 'carbonReduction',
        width: 150,
        render: (value: number) => `${value.toLocaleString()} kg`,
        sorter: (a, b) => a.carbonReduction - b.carbonReduction,
      },
      {
        title: t('pages.dashboard.carbonSpecialist.table.monthCarbonReduction'),
        dataIndex: 'monthCarbonReduction',
        key: 'monthCarbonReduction',
        width: 150,
        render: (value: number) => `${(value || 0).toLocaleString()} kg`,
      },
      {
        title: t('pages.dashboard.carbonSpecialist.table.avgCarbonPerOrder'),
        dataIndex: 'averageCarbonPerOrder',
        key: 'averageCarbonPerOrder',
        width: 150,
        render: (value: number) => `${(value || 0).toFixed(2)} kg/单`,
      },
    ]

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>{t('pages.dashboard.title')}</h1>
          <Space>
            <Select
              value={period}
              onChange={(value) => {
                setPeriod(value)
                // 根据选择的时间段自动更新日期范围
                const today = dayjs()
                let startDate: dayjs.Dayjs
                switch (value) {
                  case '7days':
                    startDate = today.subtract(7, 'day')
                    break
                  case '30days':
                    startDate = today.subtract(30, 'day')
                    break
                  case '90days':
                    startDate = today.subtract(90, 'day')
                    break
                  default:
                    startDate = today.subtract(30, 'day')
                }
                setDateRange([startDate, today])
              }}
              style={{ width: 120 }}
            >
              <Select.Option value="7days">{t('pages.dashboard.periods.last7Days')}</Select.Option>
              <Select.Option value="30days">{t('pages.dashboard.periods.last30Days')}</Select.Option>
              <Select.Option value="90days">{t('pages.dashboard.periods.last90Days')}</Select.Option>
            </Select>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => {
                // 直接设置日期范围，不进行任何自动调整
                // 允许用户选择任意日期范围，包括终止日期早于起始日期的情况
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
                // 当用户手动选择日期时，将period设置为空或自定义状态
                // 这里可以设置为'custom'，但需要先添加这个选项
              }}
              format="YYYY-MM-DD"
              allowClear
              // 禁用默认的日期范围限制，允许选择任意日期
              disabledDate={() => false}
            />
            <Button icon={<ExportOutlined />} onClick={() => handleExportCarbonData()} loading={loading}>
              {t('pages.dashboard.exportButton')}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchCarbonData()} loading={loading}>
              {t('common.refresh')}
            </Button>
          </Space>
        </div>

        <Alert
          message={t('pages.dashboard.carbonSpecialist.welcome')}
          description={t('pages.dashboard.carbonSpecialist.description')}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 碳数据核心指标 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.totalCarbonReduction')}
                value={carbonData.totalCarbonReduction}
                suffix="kg CO₂e"
                prefix={<FireOutlined />}
                valueStyle={{ color: '#22c55e' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/carbon/baseline')}
            >
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.baselineCount')}
                value={carbonData.baselineCount}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#3b82f6' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.activeBaselineCount')}
                value={carbonData.activeBaselineCount}
                suffix={`/ ${carbonData.baselineCount}`}
                prefix={<CheckCircleTwoTone twoToneColor="#52c41a" />}
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card
              style={{ cursor: carbonData.pendingBaselineCount > 0 ? 'pointer' : 'default' }}
              onClick={() => carbonData.pendingBaselineCount > 0 && navigate('/carbon/baseline')}
            >
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.pendingBaselineCount')}
                value={carbonData.pendingBaselineCount}
                prefix={<BellOutlined />}
                valueStyle={{
                  color: carbonData.pendingBaselineCount > 0 ? '#f5222d' : '#8c8c8c',
                }}
                loading={loading}
              />
              {carbonData.pendingBaselineCount > 0 && (
                <Badge count={carbonData.pendingBaselineCount} style={{ marginTop: 8 }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* 碳数据统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.todayCarbonReduction')}
                value={carbonData.todayCarbonReduction}
                suffix="kg CO₂e"
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#22c55e' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.monthCarbonReduction')}
                value={carbonData.monthCarbonReduction}
                suffix="kg CO₂e"
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#13c2c2' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.averageCarbonPerOrder')}
                value={carbonData.averageCarbonPerOrder}
                suffix="kg CO₂e/单"
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#fa8c16' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.carbonLabelDistribution')}
                value={Object.values(carbonData.carbonLabelDistribution).reduce((a, b) => a + b, 0)}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#722ed1' }}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        {/* 趋势图表 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card>
              <div ref={carbonTrendChartRef} style={{ width: '100%', height: 300 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <div ref={carbonLabelChartRef} style={{ width: '100%', height: 300 }} />
            </Card>
          </Col>
        </Row>

        {/* 基准值数据概览 */}
        <Card title={t('pages.dashboard.carbonSpecialist.baselineOverview')} style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.baselineCount')}
                value={carbonData.baselineCount}
                prefix={<BarChartOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={t('pages.dashboard.carbonSpecialist.activeBaselineCount')}
                value={carbonData.activeBaselineCount}
                prefix={<CheckCircleTwoTone twoToneColor="#52c41a" />}
              />
            </Col>
            <Col span={8}>
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => navigate('/carbon/baseline')}
              >
                {t('pages.dashboard.carbonSpecialist.viewBaselines')}
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 快速操作区域 */}
        <Card title={t('pages.dashboard.carbonSpecialist.quickActions')} style={{ marginBottom: 24 }}>
          <Space wrap>
            <Button
              type="primary"
              icon={<BarChartOutlined />}
              onClick={() => navigate('/carbon/baseline')}
            >
              {t('pages.dashboard.carbonSpecialist.manageBaselines')}
            </Button>
            <Button icon={<FileAddOutlined />} onClick={() => navigate('/carbon/baseline/add')}>
              {t('pages.dashboard.carbonSpecialist.addBaseline')}
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => navigate('/carbon/baseline/import')}>
              {t('pages.dashboard.carbonSpecialist.importBaselines')}
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => navigate('/report/carbon')}>
              {t('pages.dashboard.carbonSpecialist.generateReport')}
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => navigate('/report/carbon')}>
              {t('pages.dashboard.carbonSpecialist.exportData')}
            </Button>
            <Button icon={<CheckCircleOutlined />} onClick={() => navigate('/carbon/baseline')}>
              {t('pages.dashboard.carbonSpecialist.dataQuality')}
            </Button>
          </Space>
        </Card>

        {/* 碳减排排行榜 */}
        <Card title={t('pages.dashboard.carbonSpecialist.topRestaurants')}>
          <Table
            columns={carbonRestaurantColumns}
            dataSource={topCarbonRestaurants}
            rowKey="rank"
            loading={loading}
            pagination={false}
          />
        </Card>
      </>
    )
  }

  // 根据角色渲染不同的看板
  if (isPlatformOperator) {
    return <div>{renderPlatformOperatorDashboard()}</div>
  } else if (isSystemAdmin) {
    return <div>{renderSystemAdminDashboard()}</div>
  } else if (isCarbonSpecialist) {
    return <div>{renderCarbonSpecialistDashboard()}</div>
  } else if (isRestaurantAdmin) {
    return <div>{renderRestaurantAdminDashboard()}</div>
  }

  // 默认显示餐厅管理员看板（兼容旧版本）
  return <div>{renderRestaurantAdminDashboard()}</div>
}

export default Dashboard
