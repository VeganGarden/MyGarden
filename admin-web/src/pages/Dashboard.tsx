import { useAppSelector } from '@/store/hooks'
import {
  BookOutlined,
  FireOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons'
import { Alert, Card, Col, Row, Statistic, Tag } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DashboardData {
  totalRecipes: number
  totalCarbonReduction: number
  certifiedRestaurants: number
  activeUsers: number
  todayOrders: number
  todayRevenue: number
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation()
  const { currentTenant, currentRestaurantId, restaurants } = useAppSelector(
    (state: any) => state.tenant
  )
  const [data, setData] = useState<DashboardData>({
    totalRecipes: 0,
    totalCarbonReduction: 0,
    certifiedRestaurants: 0,
    activeUsers: 0,
    todayOrders: 0,
    todayRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  const currentRestaurant = currentRestaurantId
    ? restaurants.find((r: any) => r.id === currentRestaurantId)
    : null

  useEffect(() => {
    // TODO: 从API获取数据，根据currentRestaurantId筛选
    const fetchData = async () => {
      try {
        // const result = await reportAPI.dashboard({
        //   restaurantId: currentRestaurantId,
        //   tenantId: currentTenant?.id,
        // })
        // setData(result)
        
        // 模拟数据 - 根据选中的餐厅返回不同数据
        if (currentRestaurantId === 'restaurant_sukuaixin') {
          // 素开心的数据
          setData({
            totalRecipes: 85,
            totalCarbonReduction: 2200,
            certifiedRestaurants: 1,
            activeUsers: 650,
            todayOrders: 28,
            todayRevenue: 1200,
          })
        } else if (currentRestaurantId === 'restaurant_suhuanle') {
          // 素欢乐的数据
          setData({
            totalRecipes: 65,
            totalCarbonReduction: 1450,
            certifiedRestaurants: 1,
            activeUsers: 420,
            todayOrders: 17,
            todayRevenue: 650,
          })
        } else {
          // 所有餐厅的汇总数据
          setData({
            totalRecipes: 150,
            totalCarbonReduction: 3650,
            certifiedRestaurants: 2,
            activeUsers: 1070,
            todayOrders: 45,
            todayRevenue: 1850,
          })
        }
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentRestaurantId, currentTenant])

  return (
    <div>
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
              value={data.totalRecipes}
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
              value={data.totalCarbonReduction}
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
              value={data.certifiedRestaurants}
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
              value={data.activeUsers}
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
              value={data.todayOrders}
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
              value={data.todayRevenue}
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
    </div>
  )
}

export default Dashboard

