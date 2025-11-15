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

interface DashboardData {
  totalRecipes: number
  totalCarbonReduction: number
  certifiedRestaurants: number
  activeUsers: number
  todayOrders: number
  todayRevenue: number
}

const Dashboard: React.FC = () => {
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
        <h1 style={{ margin: 0 }}>气候餐厅管理数据看板</h1>
        {currentRestaurant && (
          <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
            当前查看：{currentRestaurant.name}
          </Tag>
        )}
        {!currentRestaurantId && currentTenant && (
          <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
            查看所有餐厅（共{restaurants.length}家）
          </Tag>
        )}
      </div>

      <Alert
        message={
          currentRestaurant
            ? `欢迎查看${currentRestaurant.name}的运营数据`
            : currentTenant
            ? `欢迎查看${currentTenant.name}所有餐厅的运营数据`
            : '欢迎使用气候餐厅管理系统'
        }
        description={
          currentRestaurant
            ? `这里是${currentRestaurant.name}的详细运营数据，包括订单、收入、碳减排等关键指标。`
            : currentTenant
            ? `这里是${currentTenant.name}旗下所有餐厅的汇总数据。您可以在右上角切换查看具体某家餐厅的数据。`
            : '这里是系统概览，您可以查看关键业务指标和统计数据。'
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="菜谱总数"
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
              title="累计碳减排"
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
              title="认证餐厅"
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
              title="活跃用户"
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
              title="今日订单"
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
              title="今日收入"
              value={data.todayRevenue}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <h3>快速入口</h3>
            <p>系统包含以下核心功能模块：</p>
            <ul>
              <li>气候餐厅认证 - 餐厅入驻、认证申请、审核流程、证书管理</li>
              <li>碳足迹核算 - 菜单碳足迹计算、订单碳统计、碳标签生成与管理</li>
              <li>供应链溯源 - 供应商管理、食材批次追踪、溯源链构建与展示</li>
              <li>餐厅运营 - 订单管理、积分系统、运营台账、行为统计</li>
              <li>报表与生态拓展 - 数据报表、ESG报告、对外接口、生态联动</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard

