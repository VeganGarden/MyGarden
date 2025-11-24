import { platformAPI, tenantAPI } from '@/services/cloudbase'
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Tabs, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'

const { RangePicker } = DatePicker

interface CrossTenantSummary {
  totalTenants: number
  totalOrders: number
  totalRevenue: number
  totalCarbonReduction: number
  totalUsers: number
}

interface TenantData {
  tenantId: string
  tenantName: string
  restaurantCount: number
  restaurantIds: string[]
  statistics: {
    orders: {
      total: number
      trend: Array<{ date: string; count: number }>
    }
    revenue: {
      total: number
      trend: Array<{ date: string; amount: number }>
    }
    carbonReduction: {
      total: number
      trend: Array<{ date: string; amount: number }>
    }
    users: {
      total: number
      active: number
    }
  }
}

interface CrossTenantResponse {
  summary: CrossTenantSummary
  tenants: TenantData[]
  trends: {
    orders: Array<{ date: string; count: number }>
    revenue: Array<{ date: string; amount: number }>
    carbonReduction: Array<{ date: string; amount: number }>
  }
  total: number
  page: number
  pageSize: number
}

const CrossTenant: React.FC = () => {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<CrossTenantSummary>({
    totalTenants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCarbonReduction: 0,
    totalUsers: 0,
  })
  const [tenantData, setTenantData] = useState<TenantData[]>([])
  const [trends, setTrends] = useState<CrossTenantResponse['trends']>({
    orders: [],
    revenue: [],
    carbonReduction: [],
  })
  const [loading, setLoading] = useState(false)
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])
  const [dataType, setDataType] = useState<string>('all')
  const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: string }>>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [activeTab, setActiveTab] = useState('trend')

  // 图表引用
  const trendChartRef = useRef<HTMLDivElement>(null)
  const compareChartRef = useRef<HTMLDivElement>(null)
  const distributionChartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTenantOptions()
    // 延迟调用fetchData，确保组件已完全挂载
    const timer = setTimeout(() => {
    fetchData()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // 延迟渲染图表，确保DOM已挂载
    const timer = setTimeout(() => {
      if (activeTab === 'trend' && trendChartRef.current && trends.orders.length > 0) {
        renderTrendChart()
      }
      if (activeTab === 'compare' && compareChartRef.current && tenantData.length > 0) {
        renderCompareChart()
      }
      if (activeTab === 'distribution' && distributionChartRef.current && tenantData.length > 0) {
        renderDistributionChart()
      }
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [trends, tenantData, activeTab])

  const fetchTenantOptions = async () => {
    try {
      const result = await tenantAPI.getAllTenants()
      if (result && result.code === 0 && result.data) {
        setTenantOptions(
          result.data.map((tenant: any) => ({
            label: tenant.name || tenant._id,
            value: tenant._id,
          }))
        )
      }
    } catch (error) {
      // 获取租户列表失败
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await platformAPI.crossTenant.getData({
        tenantIds: selectedTenants.length > 0 ? selectedTenants : undefined,
        dataType: dataType === 'all' ? 'all' : (dataType as any),
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        page: pagination.current,
        pageSize: pagination.pageSize,
      })

      if (result && result.code === 0 && result.data) {
        setSummary(result.data.summary || {
          totalTenants: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalCarbonReduction: 0,
          totalUsers: 0,
        })
        setTenantData(result.data.tenants || [])
        setTrends(result.data.trends || {
          orders: [],
          revenue: [],
          carbonReduction: [],
        })
        setPagination({ ...pagination, total: result.data.total || 0 })
      } else {
        message.error(result?.message || t('pages.platform.crossTenant.messages.loadFailed'))
        // 即使失败也设置空数据，确保UI能显示
        setSummary({
          totalTenants: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalCarbonReduction: 0,
          totalUsers: 0,
        })
        setTenantData([])
        setTrends({
          orders: [],
          revenue: [],
          carbonReduction: [],
        })
      }
    } catch (error: any) {
      message.error(error.message || t('pages.platform.crossTenant.messages.loadFailed'))
      // 即使失败也设置空数据，确保UI能显示
      setSummary({
        totalTenants: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCarbonReduction: 0,
        totalUsers: 0,
      })
      setTenantData([])
      setTrends({
        orders: [],
        revenue: [],
        carbonReduction: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    fetchData()
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      message.loading(t('pages.platform.crossTenant.messages.exportInProgress'), 0)

      // 获取所有数据用于导出
      const result = await platformAPI.crossTenant.export({
        tenantIds: selectedTenants.length > 0 ? selectedTenants : undefined,
        dataType: dataType === 'all' ? 'all' : dataType,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      })

      if (result && result.code === 0 && result.data) {
        // 准备导出数据
        const exportData = result.data.tenants.map((tenant: TenantData) => [
          tenant.tenantName || tenant.tenantId,
          tenant.restaurantCount,
          tenant.statistics.orders.total,
          tenant.statistics.revenue.total,
          tenant.statistics.carbonReduction.total,
          tenant.statistics.users.total,
          tenant.statistics.users.active,
        ])

        const ws = XLSX.utils.aoa_to_sheet([
          ['租户名称', '餐厅数量', '订单数', '总收入', '碳减排(kg)', '总用户数', '活跃用户数'],
          ...exportData,
        ])

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '跨租户数据')

        const fileName = `跨租户数据_${dayjs().format('YYYY-MM-DD')}.xlsx`
        XLSX.writeFile(wb, fileName)

        message.destroy()
        message.success(t('common.exportSuccess'))
      } else {
        message.destroy()
        message.error(result?.message || t('common.exportFailed'))
      }
    } catch (error: any) {
      message.destroy()
      message.error(error.message || t('common.exportFailed'))
    } finally {
      setLoading(false)
    }
  }

  const renderTrendChart = () => {
    if (!trendChartRef.current) return

    // 如果图表已存在，先销毁
    const existingChart = echarts.getInstanceByDom(trendChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(trendChartRef.current)
    const option = {
      title: {
        text: t('pages.platform.crossTenant.charts.trend.title'),
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        },
      legend: {
        data: [
          t('pages.platform.crossTenant.dataTypes.order'),
          t('pages.platform.crossTenant.dataTypes.revenue'),
          t('pages.platform.crossTenant.dataTypes.carbon'),
        ],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: trends.orders.length > 0 ? trends.orders.map((item) => item.date) : [],
      },
      yAxis: [
        {
          type: 'value',
          name: t('pages.platform.crossTenant.charts.trend.orders'),
          position: 'left',
        },
        {
          type: 'value',
          name: t('pages.platform.crossTenant.charts.trend.revenue'),
          position: 'right',
        },
      ],
      series: [
        {
          name: t('pages.platform.crossTenant.dataTypes.order'),
          type: 'line',
          data: trends.orders.length > 0 ? trends.orders.map((item) => item.count) : [],
          smooth: true,
        },
        {
          name: t('pages.platform.crossTenant.dataTypes.revenue'),
          type: 'line',
          yAxisIndex: 1,
          data: trends.revenue.length > 0 ? trends.revenue.map((item) => item.amount) : [],
          smooth: true,
        },
        {
          name: t('pages.platform.crossTenant.dataTypes.carbon'),
          type: 'line',
          data: trends.carbonReduction.length > 0 ? trends.carbonReduction.map((item) => item.amount) : [],
          smooth: true,
        },
      ],
    }

    chart.setOption(option)

    return () => {
      chart.dispose()
    }
  }

  const renderCompareChart = () => {
    if (!compareChartRef.current) return

    // 如果图表已存在，先销毁
    const existingChart = echarts.getInstanceByDom(compareChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(compareChartRef.current)
    const option = {
      title: {
        text: t('pages.platform.crossTenant.charts.compare.title'),
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: [
          t('pages.platform.crossTenant.dataTypes.order'),
          t('pages.platform.crossTenant.dataTypes.revenue'),
        ],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: tenantData.map((t) => t.tenantName || t.tenantId),
      },
      yAxis: [
        {
          type: 'value',
          name: t('pages.platform.crossTenant.charts.compare.orders'),
          position: 'left',
        },
        {
          type: 'value',
          name: t('pages.platform.crossTenant.charts.compare.revenue'),
          position: 'right',
        },
      ],
      series: [
        {
          name: t('pages.platform.crossTenant.dataTypes.order'),
          type: 'bar',
          data: tenantData.map((t) => t.statistics.orders.total),
        },
        {
          name: t('pages.platform.crossTenant.dataTypes.revenue'),
          type: 'bar',
          yAxisIndex: 1,
          data: tenantData.map((t) => t.statistics.revenue.total),
        },
      ],
    }

    chart.setOption(option)

    return () => {
      chart.dispose()
    }
  }

  const renderDistributionChart = () => {
    if (!distributionChartRef.current) return

    // 如果图表已存在，先销毁
    const existingChart = echarts.getInstanceByDom(distributionChartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(distributionChartRef.current)
    const option = {
      title: {
        text: t('pages.platform.crossTenant.charts.distribution.title'),
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
          name: t('pages.platform.crossTenant.charts.distribution.orders'),
          type: 'pie',
          radius: '50%',
          data: tenantData.map((t) => ({
            value: t.statistics.orders.total,
            name: t.tenantName || t.tenantId,
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

    return () => {
      chart.dispose()
    }
  }

  const columns: ColumnsType<TenantData> = [
    {
      title: t('pages.platform.crossTenant.table.columns.tenantName'),
      dataIndex: 'tenantName',
      key: 'tenantName',
      width: 200,
      render: (name: string, record: TenantData) => name || record.tenantId,
    },
    {
      title: t('pages.platform.crossTenant.table.columns.restaurantCount'),
      dataIndex: 'restaurantCount',
      key: 'restaurantCount',
      width: 120,
      align: 'right',
    },
    {
      title: t('pages.platform.crossTenant.table.columns.orders'),
      dataIndex: ['statistics', 'orders', 'total'],
      key: 'orders',
      width: 120,
      align: 'right',
      render: (value: number) => value.toLocaleString(),
      sorter: (a, b) => a.statistics.orders.total - b.statistics.orders.total,
    },
    {
      title: t('pages.platform.crossTenant.table.columns.revenue'),
      dataIndex: ['statistics', 'revenue', 'total'],
      key: 'revenue',
      width: 150,
      align: 'right',
      render: (value: number) => `¥${value.toLocaleString()}`,
      sorter: (a, b) => a.statistics.revenue.total - b.statistics.revenue.total,
    },
    {
      title: t('pages.platform.crossTenant.table.columns.carbonReduction'),
      dataIndex: ['statistics', 'carbonReduction', 'total'],
      key: 'carbonReduction',
      width: 150,
      align: 'right',
      render: (value: number) => `${value.toLocaleString()} kg`,
      sorter: (a, b) => a.statistics.carbonReduction.total - b.statistics.carbonReduction.total,
    },
    {
      title: t('pages.platform.crossTenant.table.columns.users'),
      dataIndex: ['statistics', 'users', 'total'],
      key: 'users',
      width: 120,
      align: 'right',
      render: (value: number, record: TenantData) => (
        <span>
          {value.toLocaleString()} / {record.statistics.users.active.toLocaleString()}
          <Tag color="green" style={{ marginLeft: 8 }}>
            {record.statistics.users.active > 0
              ? `${Math.round((record.statistics.users.active / value) * 100)}%`
              : '0%'}
          </Tag>
        </span>
      ),
      sorter: (a, b) => a.statistics.users.total - b.statistics.users.total,
    },
  ]

  return (
    <div>
      <Card
        title={t('pages.platform.crossTenant.title')}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              {t('common.refresh')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport} loading={loading}>
              {t('common.export')}
            </Button>
          </Space>
        }
      >
        {/* 筛选条件 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            mode="multiple"
            placeholder={t('pages.platform.crossTenant.filters.tenant')}
            style={{ width: 300 }}
            value={selectedTenants}
            onChange={setSelectedTenants}
            options={tenantOptions}
            allowClear
            loading={loading}
          />
          <Select
            placeholder={t('pages.platform.crossTenant.filters.dataType')}
            style={{ width: 150 }}
            value={dataType}
            onChange={setDataType}
            allowClear
          >
            <Select.Option value="all">{t('common.all')}</Select.Option>
            <Select.Option value="order">{t('pages.platform.crossTenant.dataTypes.order')}</Select.Option>
            <Select.Option value="carbon">{t('pages.platform.crossTenant.dataTypes.carbon')}</Select.Option>
            <Select.Option value="user">{t('pages.platform.crossTenant.dataTypes.user')}</Select.Option>
            <Select.Option value="revenue">{t('pages.platform.crossTenant.dataTypes.revenue')}</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="YYYY-MM-DD"
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
            {t('common.search')}
          </Button>
        </Space>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.crossTenant.summary.totalTenants')}
                value={summary.totalTenants}
                valueStyle={{ color: '#1890ff' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.crossTenant.summary.totalOrders')}
                value={summary.totalOrders}
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.crossTenant.summary.totalRevenue')}
                value={summary.totalRevenue}
                prefix="¥"
                valueStyle={{ color: '#faad14' }}
                loading={loading}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.platform.crossTenant.summary.totalCarbonReduction')}
                value={summary.totalCarbonReduction}
                suffix="kg"
                valueStyle={{ color: '#52c41a' }}
                loading={loading}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表区域 */}
        <Card style={{ marginBottom: 16 }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab={t('pages.platform.crossTenant.charts.trend.title')} key="trend">
              {trends.orders.length > 0 ? (
                <div ref={trendChartRef} style={{ width: '100%', height: '400px' }} />
              ) : (
                <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  {loading ? t('common.loading') : t('common.noData')}
                </div>
              )}
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('pages.platform.crossTenant.charts.compare.title')} key="compare">
              {tenantData.length > 0 ? (
                <div ref={compareChartRef} style={{ width: '100%', height: '400px' }} />
              ) : (
                <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  {loading ? t('common.loading') : t('common.noData')}
                </div>
              )}
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('pages.platform.crossTenant.charts.distribution.title')} key="distribution">
              {tenantData.length > 0 ? (
                <div ref={distributionChartRef} style={{ width: '100%', height: '400px' }} />
              ) : (
                <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  {loading ? t('common.loading') : t('common.noData')}
                </div>
              )}
            </Tabs.TabPane>
          </Tabs>
        </Card>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={tenantData}
          rowKey="tenantId"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
              fetchData()
            },
          }}
        />
      </Card>
    </div>
  )
}

export default CrossTenant
