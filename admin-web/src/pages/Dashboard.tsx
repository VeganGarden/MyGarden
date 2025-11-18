import { useAppSelector } from '@/store/hooks'
import { reportAPI } from '@/services/cloudbase'
import {
  BookOutlined,
  FireOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons'
import { Alert, Card, Col, Row, Statistic, Tag, message } from 'antd'
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
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await reportAPI.dashboard({
          restaurantId: currentRestaurantId,
          tenantId: currentTenant?.id,
        })
        
        if (result && result.code === 0 && result.data) {
          setData({
            totalRecipes: result.data.totalRecipes || 0,
            totalCarbonReduction: result.data.totalCarbonReduction || 0,
            certifiedRestaurants: result.data.certifiedRestaurants || 0,
            activeUsers: result.data.activeUsers || 0,
            todayOrders: result.data.todayOrders || 0,
            todayRevenue: result.data.todayRevenue || 0,
          })
        } else {
          // 如果API返回错误，使用默认值
          setData({
            totalRecipes: 0,
            totalCarbonReduction: 0,
            certifiedRestaurants: 0,
            activeUsers: 0,
            todayOrders: 0,
            todayRevenue: 0,
          })
        }
      } catch (error: any) {
        console.error('获取数据失败:', error)
        message.error(error.message || '获取数据失败，请稍后重试')
        // 出错时使用默认值
        setData({
          totalRecipes: 0,
          totalCarbonReduction: 0,
          certifiedRestaurants: 0,
          activeUsers: 0,
          todayOrders: 0,
          todayRevenue: 0,
        })
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

