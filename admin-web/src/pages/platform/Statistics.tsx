import {
    BarChartOutlined,
    DownloadOutlined,
    FireOutlined,
    ShoppingCartOutlined,
    TeamOutlined,
    TrophyOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'

const { RangePicker } = DatePicker

interface PlatformStatistics {
  totalRestaurants: number
  activeRestaurants: number
  totalOrders: number
  totalRevenue: number
  totalCarbonReduction: number
  totalUsers: number
  averageOrderValue: number
  averageCarbonPerOrder: number
}

interface TopRestaurant {
  rank: number
  restaurantName: string
  tenantId: string
  orders: number
  revenue: number
  carbonReduction: number
  certificationLevel?: string
}

const Statistics: React.FC = () => {
  const [statistics, setStatistics] = useState<PlatformStatistics>({
    totalRestaurants: 0,
    activeRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCarbonReduction: 0,
    totalUsers: 0,
    averageOrderValue: 0,
    averageCarbonPerOrder: 0,
  })
  const [topRestaurants, setTopRestaurants] = useState<TopRestaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])
  const [period, setPeriod] = useState<string>('30days')

  useEffect(() => {
    fetchStatistics()
  }, [dateRange, period])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      // TODO: 调用API获取平台统计数据
      // const [statisticsResult, topRestaurantsResult] = await Promise.all([
      //   platformAPI.statistics.getPlatformStatistics({
      //     startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      //     endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      //     period: period as any,
      //   }),
      //   platformAPI.statistics.getTopRestaurants({
      //     limit: 10,
      //     startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      //     endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      //   }),
      // ])
      // setStatistics(statisticsResult)
      // setTopRestaurants(topRestaurantsResult)
      
      // 模拟数据
      setStatistics({
        totalRestaurants: 25,
        activeRestaurants: 20,
        totalOrders: 12580,
        totalRevenue: 1258000,
        totalCarbonReduction: 36500,
        totalUsers: 3500,
        averageOrderValue: 100,
        averageCarbonPerOrder: 2.9,
      })

      setTopRestaurants([
        {
          rank: 1,
          restaurantName: '虹桥素坊',
          tenantId: 'tenant_001',
          orders: 1250,
          revenue: 125000,
          carbonReduction: 3650,
          certificationLevel: 'gold',
        },
        {
          rank: 2,
          restaurantName: '绿色餐厅',
          tenantId: 'tenant_002',
          orders: 890,
          revenue: 89000,
          carbonReduction: 2100,
          certificationLevel: 'silver',
        },
        {
          rank: 3,
          restaurantName: '素食天地',
          tenantId: 'tenant_003',
          orders: 650,
          revenue: 65000,
          carbonReduction: 1800,
          certificationLevel: 'bronze',
        },
        {
          rank: 4,
          restaurantName: '健康素食',
          tenantId: 'tenant_004',
          orders: 520,
          revenue: 52000,
          carbonReduction: 1500,
        },
        {
          rank: 5,
          restaurantName: '环保餐厅',
          tenantId: 'tenant_005',
          orders: 480,
          revenue: 48000,
          carbonReduction: 1400,
        },
      ])
    } catch (error) {
      message.error('获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<TopRestaurant> = [
    {
      title: '排名',
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
      title: '餐厅名称',
      dataIndex: 'restaurantName',
      key: 'restaurantName',
      width: 150,
    },
    {
      title: '租户ID',
      dataIndex: 'tenantId',
      key: 'tenantId',
      width: 150,
    },
    {
      title: '订单数',
      dataIndex: 'orders',
      key: 'orders',
      width: 120,
      render: (value: number) => value.toLocaleString(),
      sorter: (a, b) => a.orders - b.orders,
    },
    {
      title: '收入',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
      sorter: (a, b) => a.revenue - b.revenue,
    },
    {
      title: '碳减排(kg)',
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      width: 120,
      render: (value: number) => value.toLocaleString(),
      sorter: (a, b) => a.carbonReduction - b.carbonReduction,
    },
    {
      title: '认证等级',
      dataIndex: 'certificationLevel',
      key: 'certificationLevel',
      width: 120,
      render: (level?: string) => {
        if (!level) return <Tag>未认证</Tag>
        const config: Record<string, { color: string; text: string }> = {
          bronze: { color: 'default', text: '铜牌' },
          silver: { color: 'default', text: '银牌' },
          gold: { color: 'gold', text: '金牌' },
          platinum: { color: 'purple', text: '白金' },
        }
        const cfg = config[level] || config.bronze
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
  ]

  const handleExport = async () => {
    try {
      // TODO: 实现报表导出功能
      // await platformAPI.statistics.exportReport({
      //   type: 'summary',
      //   startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      //   endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      // })
      message.info('导出报表功能开发中')
    } catch (error) {
      message.error('导出失败')
    }
  }

  return (
    <div>
      <Card
        title="平台级统计报表"
        extra={
          <Space>
            <Select
              value={period}
              onChange={setPeriod}
              style={{ width: 120 }}
            >
              <Select.Option value="7days">近7天</Select.Option>
              <Select.Option value="30days">近30天</Select.Option>
              <Select.Option value="90days">近90天</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
            {period === 'custom' && (
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="YYYY-MM-DD"
              />
            )}
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出报表
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="餐厅总数"
                value={statistics.totalRestaurants}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#1890ff' }}
                loading={loading}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                活跃: {statistics.activeRestaurants}
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总订单数"
                value={statistics.totalOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                平均订单额: ¥{statistics.averageOrderValue}
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总收入"
                value={statistics.totalRevenue}
                prefix="¥"
                valueStyle={{ color: '#fa8c16' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总碳减排"
                value={statistics.totalCarbonReduction}
                suffix="kg CO₂e"
                prefix={<FireOutlined />}
                valueStyle={{ color: '#cf1322' }}
                loading={loading}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                平均每单: {statistics.averageCarbonPerOrder} kg
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={statistics.totalUsers}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#722ed1' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活跃餐厅率"
                value={((statistics.activeRestaurants / statistics.totalRestaurants) * 100).toFixed(1)}
                suffix="%"
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#13c2c2' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均订单数"
                value={(statistics.totalOrders / statistics.activeRestaurants).toFixed(0)}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#eb2f96' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均收入"
                value={(statistics.totalRevenue / statistics.activeRestaurants).toFixed(0)}
                prefix="¥"
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        <Card title="餐厅排行榜" style={{ marginTop: 16 }}>
          <Table
            columns={columns}
            dataSource={topRestaurants}
            rowKey="tenantId"
            loading={loading}
            pagination={false}
          />
        </Card>
      </Card>
    </div>
  )
}

export default Statistics

