import { platformAPI } from '@/services/cloudbase'
import {
    BarChartOutlined,
    DownloadOutlined,
    FireOutlined,
  ReloadOutlined,
    ShoppingCartOutlined,
    TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Tabs, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'

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
  trends?: {
    orders: Array<{ date: string; count: number }>
    revenue: Array<{ date: string; amount: number }>
    carbonReduction: Array<{ date: string; amount: number }>
  }
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
  const { t } = useTranslation()
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
  const [activeTab, setActiveTab] = useState('trend')
  const [sortBy, setSortBy] = useState<'orders' | 'revenue' | 'carbonReduction'>('orders')

  // 图表引用
  const trendChartRef = useRef<HTMLDivElement>(null)
  const compareChartRef = useRef<HTMLDivElement>(null)
  const distributionChartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchStatistics()
  }, [dateRange, period, sortBy])

  useEffect(() => {
    // 延迟渲染图表，确保DOM已挂载
    const timer = setTimeout(() => {
      if (activeTab === 'trend' && trendChartRef.current && statistics.trends && statistics.trends.orders.length > 0) {
        renderTrendChart()
      }
      if (activeTab === 'compare' && compareChartRef.current && topRestaurants.length > 0) {
        renderCompareChart()
      }
      if (activeTab === 'distribution' && distributionChartRef.current && topRestaurants.length > 0) {
        renderDistributionChart()
      }
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [statistics.trends, topRestaurants, activeTab])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const [statisticsResult, topRestaurantsResult] = await Promise.all([
        platformAPI.statistics.getPlatformStatistics({
          startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
          period: period as any,
          includeTrends: true,
        }),
        platformAPI.statistics.getTopRestaurants({
          sortBy: sortBy,
          limit: 10,
          startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        }),
      ])
      
      if (statisticsResult && statisticsResult.code === 0 && statisticsResult.data) {
        const stats = statisticsResult.data
        setStatistics({
          totalRestaurants: stats.totalRestaurants || stats.total_restaurants || 0,
          activeRestaurants: stats.activeRestaurants || stats.active_restaurants || 0,
          totalOrders: stats.totalOrders || stats.total_orders || 0,
          totalRevenue: stats.totalRevenue || stats.total_revenue || 0,
          totalCarbonReduction: stats.totalCarbonReduction || stats.total_carbon_reduction || 0,
          totalUsers: stats.totalUsers || stats.total_users || 0,
          averageOrderValue: stats.averageOrderValue || stats.average_order_value || 0,
          averageCarbonPerOrder: stats.averageCarbonPerOrder || stats.average_carbon_per_order || 0,
          trends: stats.trends || undefined,
        })
      } else {
        if (statisticsResult) {
          message.error(statisticsResult.message || '获取统计数据失败')
        } else {
          message.error('获取统计数据失败：无返回结果')
        }
        // 即使失败也设置默认值，避免NaN
        setStatistics({
          totalRestaurants: 0,
          activeRestaurants: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalCarbonReduction: 0,
          totalUsers: 0,
          averageOrderValue: 0,
          averageCarbonPerOrder: 0,
          trends: undefined,
        })
      }
      
      if (topRestaurantsResult && topRestaurantsResult.code === 0 && topRestaurantsResult.data) {
        const restaurants = Array.isArray(topRestaurantsResult.data) ? topRestaurantsResult.data : []
        setTopRestaurants(restaurants.map((restaurant: any, index: number) => ({
          rank: index + 1,
          restaurantName: restaurant.restaurantName || restaurant.name || restaurant.restaurant_name || '',
          tenantId: restaurant.tenantId || restaurant.tenant_id || '',
          orders: restaurant.orders || restaurant.order_count || 0,
          revenue: restaurant.revenue || restaurant.total_revenue || 0,
          carbonReduction: restaurant.carbonReduction || restaurant.carbon_reduction || 0,
          certificationLevel: restaurant.certificationLevel || restaurant.certification_level || undefined,
        })))
      } else {
        setTopRestaurants([])
      }
    } catch (error: any) {
      message.error(error.message || t('pages.platform.statistics.messages.loadFailed'))
      // 即使失败也设置默认值
      setStatistics({
        totalRestaurants: 0,
        activeRestaurants: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCarbonReduction: 0,
        totalUsers: 0,
        averageOrderValue: 0,
        averageCarbonPerOrder: 0,
        trends: undefined,
      })
      setTopRestaurants([])
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<TopRestaurant> = [
    {
      title: t('pages.platform.statistics.table.columns.rank'),
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
      title: t('pages.platform.statistics.table.columns.restaurantName'),
      dataIndex: 'restaurantName',
      key: 'restaurantName',
      width: 150,
    },
    {
      title: t('pages.platform.statistics.table.columns.tenantId'),
      dataIndex: 'tenantId',
      key: 'tenantId',
      width: 150,
    },
    {
      title: t('pages.platform.statistics.table.columns.orders'),
      dataIndex: 'orders',
      key: 'orders',
      width: 120,
      render: (value: number) => value.toLocaleString(),
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
      render: (value: number) => value.toLocaleString(),
      sorter: (a, b) => a.carbonReduction - b.carbonReduction,
    },
    {
      title: t('pages.platform.statistics.table.columns.certificationLevel'),
      dataIndex: 'certificationLevel',
      key: 'certificationLevel',
      width: 120,
      render: (level?: string) => {
        if (!level) return <Tag>{t('pages.platform.statistics.certificationLevels.notCertified')}</Tag>
        const config: Record<string, { color: string; text: string }> = {
          bronze: { color: 'default', text: t('pages.platform.statistics.certificationLevels.bronze') },
          silver: { color: 'default', text: t('pages.platform.statistics.certificationLevels.silver') },
          gold: { color: 'gold', text: t('pages.platform.statistics.certificationLevels.gold') },
          platinum: { color: 'purple', text: t('pages.platform.statistics.certificationLevels.platinum') },
        }
        const cfg = config[level] || config.bronze
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
  ]

  const handleExport = async () => {
    try {
      setLoading(true)
      message.loading(t('pages.platform.statistics.messages.exportInProgress'), 0)

      // 准备导出数据
      const exportData = [
        ['统计项', '数值'],
        [t('pages.platform.statistics.statistics.totalRestaurants'), statistics.totalRestaurants],
        [t('pages.platform.statistics.statistics.active'), statistics.activeRestaurants],
        [t('pages.platform.statistics.statistics.totalOrders'), statistics.totalOrders],
        [t('pages.platform.statistics.statistics.totalRevenue'), `¥${statistics.totalRevenue}`],
        [t('pages.platform.statistics.statistics.totalCarbonReduction'), `${statistics.totalCarbonReduction} kg`],
        [t('pages.platform.statistics.statistics.totalUsers'), statistics.totalUsers],
        [t('pages.platform.statistics.statistics.avgOrderValue'), `¥${statistics.averageOrderValue}`],
        [t('pages.platform.statistics.statistics.avgCarbonPerOrder'), `${statistics.averageCarbonPerOrder} kg`],
        [],
        ['餐厅排行榜'],
        ['排名', '餐厅名称', '租户ID', '订单数', '总收入', '碳减排(kg)', '认证等级'],
        ...topRestaurants.map((r, index) => [
          index + 1,
          r.restaurantName,
          r.tenantId,
          r.orders,
          `¥${r.revenue}`,
          r.carbonReduction,
          r.certificationLevel || '未认证',
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '平台统计报表')

      const fileName = `平台统计报表_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      message.destroy()
      message.success(t('common.exportSuccess'))
    } catch (error: any) {
      message.destroy()
      message.error(error.message || t('common.exportFailed'))
    } finally {
      setLoading(false)
    }
  }

  const renderTrendChart = () => {
    if (!trendChartRef.current || !statistics.trends) return

    // 如果图表已存在，先销毁
    const existingChart = echarts.getInstanceByDom(trendChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(trendChartRef.current)
    const option = {
      title: {
        text: t('pages.platform.statistics.charts.trend.title'),
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: [
          t('pages.platform.statistics.dataTypes.order'),
          t('pages.platform.statistics.dataTypes.revenue'),
          t('pages.platform.statistics.dataTypes.carbon'),
        ],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: statistics.trends.orders.length > 0 ? statistics.trends.orders.map((item) => item.date) : [],
      },
      yAxis: [
        {
          type: 'value',
          name: t('pages.platform.statistics.charts.trend.orders'),
          position: 'left',
        },
        {
          type: 'value',
          name: t('pages.platform.statistics.charts.trend.revenue'),
          position: 'right',
        },
      ],
      series: [
        {
          name: t('pages.platform.statistics.dataTypes.order'),
          type: 'line',
          data: statistics.trends.orders.length > 0 ? statistics.trends.orders.map((item) => item.count) : [],
          smooth: true,
        },
        {
          name: t('pages.platform.statistics.dataTypes.revenue'),
          type: 'line',
          yAxisIndex: 1,
          data: statistics.trends.revenue.length > 0 ? statistics.trends.revenue.map((item) => item.amount) : [],
          smooth: true,
        },
        {
          name: t('pages.platform.statistics.dataTypes.carbon'),
          type: 'line',
          data: statistics.trends.carbonReduction.length > 0 ? statistics.trends.carbonReduction.map((item) => item.amount) : [],
          smooth: true,
        },
      ],
    }

    chart.setOption(option)
  }

  const renderCompareChart = () => {
    if (!compareChartRef.current || topRestaurants.length === 0) return

    // 如果图表已存在，先销毁
    const existingChart = echarts.getInstanceByDom(compareChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(compareChartRef.current)
    const option = {
      title: {
        text: t('pages.platform.statistics.charts.compare.title'),
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: [
          t('pages.platform.statistics.dataTypes.order'),
          t('pages.platform.statistics.dataTypes.revenue'),
        ],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: topRestaurants.map((r) => r.restaurantName),
      },
      yAxis: [
        {
          type: 'value',
          name: t('pages.platform.statistics.charts.compare.orders'),
          position: 'left',
        },
        {
          type: 'value',
          name: t('pages.platform.statistics.charts.compare.revenue'),
          position: 'right',
        },
      ],
      series: [
        {
          name: t('pages.platform.statistics.dataTypes.order'),
          type: 'bar',
          data: topRestaurants.map((r) => r.orders),
        },
        {
          name: t('pages.platform.statistics.dataTypes.revenue'),
          type: 'bar',
          yAxisIndex: 1,
          data: topRestaurants.map((r) => r.revenue),
        },
      ],
    }

    chart.setOption(option)
  }

  const renderDistributionChart = () => {
    if (!distributionChartRef.current || topRestaurants.length === 0) return

    // 如果图表已存在，先销毁
    const existingChart = echarts.getInstanceByDom(distributionChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(distributionChartRef.current)
    const option = {
      title: {
        text: t('pages.platform.statistics.charts.distribution.title'),
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: t('pages.platform.statistics.charts.distribution.orders'),
          type: 'pie',
          radius: '50%',
          data: topRestaurants.map((r) => ({
            value: r.orders,
            name: r.restaurantName,
          })),
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

  return (
    <div>
      <Card
        title={t('pages.platform.statistics.title')}
        extra={
          <Space>
            <Select
              value={period}
              onChange={setPeriod}
              style={{ width: 120 }}
            >
              <Select.Option value="7days">{t('pages.platform.statistics.periods.last7Days')}</Select.Option>
              <Select.Option value="30days">{t('pages.platform.statistics.periods.last30Days')}</Select.Option>
              <Select.Option value="90days">{t('pages.platform.statistics.periods.last90Days')}</Select.Option>
              <Select.Option value="custom">{t('pages.platform.statistics.periods.custom')}</Select.Option>
            </Select>
            {period === 'custom' && (
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="YYYY-MM-DD"
              />
            )}
            <Button icon={<ReloadOutlined />} onClick={fetchStatistics} loading={loading}>
              {t('common.refresh')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport} loading={loading}>
              {t('pages.platform.statistics.buttons.export')}
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.statistics.statistics.totalRestaurants')}
                value={statistics.totalRestaurants}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#1890ff' }}
                loading={loading}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                {t('pages.platform.statistics.statistics.active')}: {statistics.activeRestaurants}
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.statistics.statistics.totalOrders')}
                value={statistics.totalOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                {t('pages.platform.statistics.statistics.avgOrderValue')}: ¥{statistics.averageOrderValue}
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.statistics.statistics.totalRevenue')}
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
                title={t('pages.platform.statistics.statistics.totalCarbonReduction')}
                value={statistics.totalCarbonReduction}
                suffix="kg CO₂e"
                prefix={<FireOutlined />}
                valueStyle={{ color: '#cf1322' }}
                loading={loading}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                {t('pages.platform.statistics.statistics.avgCarbonPerOrder')}: {statistics.averageCarbonPerOrder} kg
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.statistics.statistics.totalUsers')}
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
                title={t('pages.platform.statistics.statistics.activeRestaurantRate')}
                value={statistics.totalRestaurants > 0 ? ((statistics.activeRestaurants / statistics.totalRestaurants) * 100).toFixed(1) : '0'}
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
                title={t('pages.platform.statistics.statistics.avgOrders')}
                value={statistics.activeRestaurants > 0 ? (statistics.totalOrders / statistics.activeRestaurants).toFixed(0) : '0'}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#eb2f96' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.statistics.statistics.avgRevenue')}
                value={statistics.activeRestaurants > 0 ? (statistics.totalRevenue / statistics.activeRestaurants).toFixed(0) : '0'}
                prefix="¥"
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表区域 */}
        <Card style={{ marginBottom: 16 }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab={t('pages.platform.statistics.charts.trend.title')} key="trend">
              {statistics.trends && statistics.trends.orders.length > 0 ? (
                <div ref={trendChartRef} style={{ width: '100%', height: '400px' }} />
              ) : (
                <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  {loading ? t('common.loading') : t('common.noData')}
                </div>
              )}
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('pages.platform.statistics.charts.compare.title')} key="compare">
              {topRestaurants.length > 0 ? (
                <div ref={compareChartRef} style={{ width: '100%', height: '400px' }} />
              ) : (
                <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  {loading ? t('common.loading') : t('common.noData')}
                </div>
              )}
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('pages.platform.statistics.charts.distribution.title')} key="distribution">
              {topRestaurants.length > 0 ? (
                <div ref={distributionChartRef} style={{ width: '100%', height: '400px' }} />
              ) : (
                <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  {loading ? t('common.loading') : t('common.noData')}
                </div>
              )}
            </Tabs.TabPane>
          </Tabs>
        </Card>

        <Card 
          title={t('pages.platform.statistics.ranking.title')} 
          extra={
            <Select
              value={sortBy}
              onChange={(value) => setSortBy(value)}
              style={{ width: 150 }}
            >
              <Select.Option value="orders">{t('pages.platform.statistics.sortBy.orders')}</Select.Option>
              <Select.Option value="revenue">{t('pages.platform.statistics.sortBy.revenue')}</Select.Option>
              <Select.Option value="carbonReduction">{t('pages.platform.statistics.sortBy.carbonReduction')}</Select.Option>
            </Select>
          }
          style={{ marginTop: 16 }}
        >
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

