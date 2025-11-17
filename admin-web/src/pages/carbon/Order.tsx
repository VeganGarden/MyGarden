import { Line } from '@ant-design/charts'
import { DownloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useState } from 'react'
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
  const [dataSource] = useState<OrderCarbon[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

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

  const chartData = [
    { date: '2025-01-01', carbon: 120.5 },
    { date: '2025-01-02', carbon: 135.2 },
    { date: '2025-01-03', carbon: 98.6 },
    { date: '2025-01-04', carbon: 145.8 },
    { date: '2025-01-05', carbon: 112.3 },
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
              value={0}
              suffix="kg CO₂e"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.carbon.order.statistics.todayReduction')}
              value={0}
              suffix="kg CO₂e"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.carbon.order.statistics.totalReduction')}
              value={0}
              suffix="kg CO₂e"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.carbon.order.statistics.totalOrders')}
              value={0}
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

