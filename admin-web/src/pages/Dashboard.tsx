import { useAppSelector } from '@/store/hooks'
import { selectUser } from '@/store/slices/authSlice'
import { UserRole } from '@/types/role'
import { reportAPI, platformAPI, onboardingAPI, systemAPI, adminUsersAPI, tenantAPI } from '@/services/cloudbase'
import {
  BookOutlined,
  FireOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  TrophyOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DatabaseOutlined,
  ApiOutlined,
  UserOutlined,
  FileTextOutlined,
  SettingOutlined,
  BarChartOutlined,
  EyeOutlined,
  ReloadOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { Alert, Card, Col, Row, Statistic, Tag, message, Button, Space, Table, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

// 餐厅管理员看板数据
interface RestaurantDashboardData {
  totalRecipes: number
  totalCarbonReduction: number
  certifiedRestaurants: number
  activeUsers: number
  todayOrders: number
  todayRevenue: number
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
  })

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

  const [loading, setLoading] = useState(true)

  const currentRestaurant = currentRestaurantId
    ? restaurants.find((r: any) => r.id === currentRestaurantId)
    : null

  // 获取餐厅管理员数据
  const fetchRestaurantData = async () => {
    try {
      const result = await reportAPI.dashboard({
        restaurantId: currentRestaurantId,
        tenantId: currentTenant?.id,
      })
      
      if (result && result.code === 0 && result.data) {
        setRestaurantData({
          totalRecipes: result.data.totalRecipes || 0,
          totalCarbonReduction: result.data.totalCarbonReduction || 0,
          certifiedRestaurants: result.data.certifiedRestaurants || 0,
          activeUsers: result.data.activeUsers || 0,
          todayOrders: result.data.todayOrders || 0,
          todayRevenue: result.data.todayRevenue || 0,
        })
      }
    } catch (error: any) {
      message.error(error.message || t('common.loadFailed'))
    }
  }

  // 获取平台运营数据
  const fetchPlatformData = async () => {
    try {
      // 获取平台统计数据
      const [statisticsResult, topRestaurantsResult, applicationsResult, tenantsResult] = await Promise.all([
        platformAPI.statistics.getPlatformStatistics({
          startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          endDate: dayjs().format('YYYY-MM-DD'),
          period: '30days',
          includeTrends: false,
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

      // 获取租户总数和活跃数
      if (tenantsResult && tenantsResult.code === 0 && tenantsResult.data) {
        const tenants = tenantsResult.data || []
        const activeTenants = tenants.filter((t: any) => t.status === 'active').length
        setPlatformData(prev => ({
          ...prev,
          totalTenants: tenants.length,
          activeTenants: activeTenants,
        }))
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (isRestaurantAdmin) {
          await fetchRestaurantData()
        } else if (isPlatformOperator) {
          await fetchPlatformData()
        } else if (isSystemAdmin) {
          await fetchSystemData()
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentRestaurantId, currentTenant, user?.role])

  // 餐厅管理员看板
  const renderRestaurantAdminDashboard = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
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
          <Card>
            <Statistic
              title={t('pages.dashboard.statistics.totalRecipes')}
              value={restaurantData.totalRecipes}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('pages.dashboard.statistics.totalCarbonReduction')}
              value={restaurantData.totalCarbonReduction}
              suffix="kg CO₂e"
              prefix={<FireOutlined />}
              valueStyle={{ color: '#cf1322' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('pages.dashboard.statistics.certifiedRestaurants')}
              value={restaurantData.certifiedRestaurants}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('pages.dashboard.statistics.activeUsers')}
              value={restaurantData.activeUsers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('pages.dashboard.statistics.todayOrders')}
              value={restaurantData.todayOrders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('pages.dashboard.statistics.todayRevenue')}
              value={restaurantData.todayRevenue}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <h3>{t('pages.dashboard.quickAccess.title')}</h3>
            <p>{t('pages.dashboard.quickAccess.description')}</p>
            <ul>
              <li>{t('pages.dashboard.quickAccess.modules.certification')}</li>
              <li>{t('pages.dashboard.quickAccess.modules.carbon')}</li>
              <li>{t('pages.dashboard.quickAccess.modules.traceability')}</li>
              <li>{t('pages.dashboard.quickAccess.modules.operation')}</li>
              <li>{t('pages.dashboard.quickAccess.modules.report')}</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </>
  )

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
          <Button icon={<ReloadOutlined />} onClick={() => fetchPlatformData()} loading={loading}>
            {t('common.refresh')}
          </Button>
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
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.platformOperator.totalOrders')}
                value={platformData.totalOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#722ed1' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.platformOperator.totalRevenue')}
                value={platformData.totalRevenue}
                prefix="¥"
                valueStyle={{ color: '#faad14' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
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
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.dashboard.platformOperator.totalUsers')}
                value={platformData.totalUsers}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#13c2c2' }}
                loading={loading}
              />
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
          <Button icon={<ReloadOutlined />} onClick={() => fetchSystemData()} loading={loading}>
            {t('common.refresh')}
          </Button>
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

  // 根据角色渲染不同的看板
  if (isPlatformOperator) {
    return <div>{renderPlatformOperatorDashboard()}</div>
  } else if (isSystemAdmin) {
    return <div>{renderSystemAdminDashboard()}</div>
  } else if (isRestaurantAdmin) {
    return <div>{renderRestaurantAdminDashboard()}</div>
  }

  // 默认显示餐厅管理员看板（兼容旧版本）
  return <div>{renderRestaurantAdminDashboard()}</div>
}

export default Dashboard
