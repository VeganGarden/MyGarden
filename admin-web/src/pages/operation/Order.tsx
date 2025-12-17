import { operationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { Column, Line } from '@ant-design/charts'
import { Button, Card, Col, DatePicker, Input, Row, Select, Space, Statistic, Table, Tag, message, Tabs } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { TabPane } = Tabs

interface Order {
  id: string
  orderNo: string
  orderDate: string
  customerName: string
  amount: number
  carbonFootprint: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
}

interface OrderStats {
  totalOrders: number
  completedOrders: number
  totalRevenue: number
  totalCarbonReduction: number
  avgOrderValue: number
  completionRate: number
  dailyStats: Array<{
    date: string
    orderCount: number
    revenue: number
    carbonReduction: number
  }>
  statusStats: Record<string, number>
}

const OperationOrder: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [keyword, setKeyword] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('list')

  useEffect(() => {
    fetchOrderData()
  }, [currentRestaurantId, dateRange, statusFilter])

  const fetchOrderData = async () => {
    try {
      if (!currentRestaurantId) {
        setDataSource([])
        setStats(null)
        return
      }
      
      setLoading(true)
      const params: any = {
        restaurantId: currentRestaurantId,
        includeStats: true,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      if (statusFilter) {
        params.status = statusFilter
      }

      if (keyword) {
        params.keyword = keyword
      }
      
      const result = await operationAPI.order.list(params)
      
      if (result && result.code === 0) {
        const orders = Array.isArray(result.data) ? result.data : []
        setDataSource(orders.map((order: any) => ({
          id: order.id || order._id || order.orderNo,
          orderNo: order.orderNo || order.order_id || '',
          orderDate: order.orderDate || order.createTime || order.createdAt || '',
          customerName: order.customerName || order.customer_name || order.userName || '',
          amount: order.amount || order.totalAmount || order.total_amount || 0,
          carbonFootprint: order.carbonFootprint || order.carbon_footprint || order.carbonReduction || 0,
          status: order.status || 'pending',
        })))

        if (result.stats) {
          setStats(result.stats)
        }
      } else {
        setDataSource([])
        setStats(null)
      }
    } catch (error: any) {
      console.error('获取订单数据失败:', error)
      message.error(error.message || '获取订单数据失败，请稍后重试')
      setDataSource([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<Order> = [
    {
      title: t('pages.operation.order.table.columns.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: t('pages.operation.order.table.columns.orderDate'),
      dataIndex: 'orderDate',
      key: 'orderDate',
    },
    {
      title: t('pages.operation.order.table.columns.customerName'),
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: t('pages.operation.order.table.columns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: t('pages.operation.order.table.columns.carbonFootprint'),
      dataIndex: 'carbonFootprint',
      key: 'carbonFootprint',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
    {
      title: t('pages.operation.order.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: t('pages.operation.order.status.pending') },
          processing: { color: 'blue', text: t('pages.operation.order.status.processing') },
          completed: { color: 'green', text: t('pages.operation.order.status.completed') },
          cancelled: { color: 'red', text: t('pages.operation.order.status.cancelled') },
        }
        const cfg = config[status] || config.pending
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.operation.order.table.columns.actions'),
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} size="small">
            {t('pages.operation.order.buttons.viewDetail')}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 订单统计概览 */}
      {stats && (
        <Card title="订单统计概览" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic 
                title="总订单数" 
                value={stats.totalOrders} 
                suffix="单" 
                valueStyle={{ color: '#3f8600' }} 
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="总收入" 
                value={stats.totalRevenue.toFixed(2)} 
                prefix="¥" 
                valueStyle={{ color: '#1890ff' }} 
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="总碳减排" 
                value={stats.totalCarbonReduction.toFixed(2)} 
                suffix="kg CO₂e" 
                valueStyle={{ color: '#cf1322' }} 
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="平均客单价" 
                value={stats.avgOrderValue.toFixed(2)} 
                prefix="¥" 
                valueStyle={{ color: '#722ed1' }} 
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card
        title="订单管理"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
            />
            <Button icon={<DownloadOutlined />}>导出</Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="订单列表" key="list">
            <Space style={{ marginBottom: 16 }}>
              <Input.Search 
                placeholder="搜索订单号或客户名称" 
                style={{ width: 300 }}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchOrderData}
              />
              <Select 
                placeholder="订单状态" 
                style={{ width: 150 }} 
                allowClear
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Select.Option value="pending">待处理</Select.Option>
                <Select.Option value="processing">处理中</Select.Option>
                <Select.Option value="completed">已完成</Select.Option>
                <Select.Option value="cancelled">已取消</Select.Option>
              </Select>
            </Space>

            <Table
              columns={columns}
              dataSource={dataSource}
              rowKey="id"
              loading={loading}
              pagination={{
                total: dataSource.length,
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>
          
          <TabPane tab="统计分析" key="stats">
            {stats && (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card title="订单趋势">
                      <Line
                        data={stats.dailyStats.map((item) => ({
                          date: item.date,
                          value: item.orderCount,
                          type: '订单数',
                        }))}
                        xField="date"
                        yField="value"
                        height={300}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="收入趋势">
                      <Line
                        data={stats.dailyStats.map((item) => ({
                          date: item.date,
                          value: item.revenue,
                          type: '收入',
                        }))}
                        xField="date"
                        yField="value"
                        height={300}
                      />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="订单状态分布">
                      <Column
                        data={Object.entries(stats.statusStats).map(([status, count]) => ({
                          status,
                          count,
                        }))}
                        xField="status"
                        yField="count"
                        height={300}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="碳减排趋势">
                      <Line
                        data={stats.dailyStats.map((item) => ({
                          date: item.date,
                          value: item.carbonReduction,
                          type: '碳减排',
                        }))}
                        xField="date"
                        yField="value"
                        height={300}
                      />
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default OperationOrder

