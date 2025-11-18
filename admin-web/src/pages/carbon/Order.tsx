import { useAppSelector } from '@/store/hooks'
import { carbonFootprintAPI } from '@/services/cloudbase'
import { Line } from '@ant-design/charts'
import { DownloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

interface OrderCarbon {
  id: string
  orderNo: string
  orderDate: string
  totalCarbon: number
  carbonReduction: number
  orderAmount: number
  status: string
}

const CarbonOrder: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<OrderCarbon[]>([])
  const [chartData, setChartData] = useState<Array<{ date: string; carbon: number }>>([])
  const [statistics, setStatistics] = useState({
    todayCarbon: 0,
    todayReduction: 0,
    totalReduction: 0,
    totalOrders: 0,
  })
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  useEffect(() => {
    fetchOrderCarbonData()
  }, [currentRestaurantId, dateRange])

  const fetchOrderCarbonData = async () => {
    try {
      if (!currentRestaurantId) {
        setDataSource([])
        setChartData([])
        setStatistics({
          todayCarbon: 0,
          todayReduction: 0,
          totalReduction: 0,
          totalOrders: 0,
        })
        return
      }
      
      const result = await carbonFootprintAPI.getOrderCarbonStats({
        restaurantId: currentRestaurantId,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      })
      
      if (result && result.code === 0 && result.data) {
        const data = result.data
        
        // 设置统计数据
        if (data.statistics) {
          setStatistics({
            todayCarbon: data.statistics.todayCarbon || data.statistics.today_carbon || 0,
            todayReduction: data.statistics.todayReduction || data.statistics.today_reduction || 0,
            totalReduction: data.statistics.totalReduction || data.statistics.total_reduction || 0,
            totalOrders: data.statistics.totalOrders || data.statistics.total_orders || 0,
          })
        }
        
        // 设置图表数据
        if (data.chartData && Array.isArray(data.chartData)) {
          setChartData(data.chartData.map((item: any) => ({
            date: item.date || '',
            carbon: item.carbon || item.totalCarbon || 0,
          })))
        }
        
        // 设置订单列表
        if (data.orders && Array.isArray(data.orders)) {
          setDataSource(data.orders.map((order: any) => ({
            id: order.id || order._id || order.orderNo || '',
            orderNo: order.orderNo || order.order_id || '',
            orderDate: order.orderDate || order.createTime || order.createdAt || '',
            totalCarbon: order.totalCarbon || order.total_carbon || 0,
            carbonReduction: order.carbonReduction || order.carbon_reduction || 0,
            orderAmount: order.orderAmount || order.totalAmount || order.total_amount || 0,
            status: order.status || '',
          })))
        } else {
          setDataSource([])
        }
      } else {
        setDataSource([])
        setChartData([])
      }
    } catch (error: any) {
      console.error('获取订单碳足迹数据失败:', error)
      message.error(error.message || '获取订单碳足迹数据失败，请稍后重试')
      setDataSource([])
      setChartData([])
    }
  }

  const columns: ColumnsType<OrderCarbon> = [
    {
      title: t('pages.carbon.order.table.columns.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: t('pages.carbon.order.table.columns.orderDate'),
      dataIndex: 'orderDate',
      key: 'orderDate',
    },
    {
      title: t('pages.carbon.order.table.columns.totalCarbon'),
      dataIndex: 'totalCarbon',
      key: 'totalCarbon',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
    {
      title: t('pages.carbon.order.table.columns.carbonReduction'),
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      render: (value: number) => (
        <span style={{ color: '#52c41a' }}>+{value.toFixed(2)} kg CO₂e</span>
      ),
    },
    {
      title: t('pages.carbon.order.table.columns.orderAmount'),
      dataIndex: 'orderAmount',
      key: 'orderAmount',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: t('pages.carbon.order.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
    },
  ]

  const chartConfig = {
    data: chartData,
    xField: 'date',
    yField: 'carbon',
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#AAA',
      },
    },
  }

  const handleExport = () => {
    // TODO: 实现数据导出
    console.log('导出数据')
  }

  return (
    <div>
      <Card title={t('pages.carbon.order.title')} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={t('pages.carbon.order.statistics.todayCarbon')}
              value={statistics.todayCarbon}
              suffix="kg CO₂e"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.carbon.order.statistics.todayReduction')}
              value={statistics.todayReduction}
              suffix="kg CO₂e"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.carbon.order.statistics.totalReduction')}
              value={statistics.totalReduction}
              suffix="kg CO₂e"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.carbon.order.statistics.totalOrders')}
              value={statistics.totalOrders}
              suffix={t('common.items')}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={t('pages.carbon.order.trend.title')}
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              {t('pages.carbon.order.buttons.export')}
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Line {...chartConfig} height={300} />
      </Card>

      <Card title={t('pages.carbon.order.table.title')}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
          }}
        />
      </Card>
    </div>
  )
}

export default CarbonOrder

