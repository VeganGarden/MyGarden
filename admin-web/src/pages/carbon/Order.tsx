import { Line } from '@ant-design/charts'
import { DownloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useState } from 'react'

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
  const [dataSource] = useState<OrderCarbon[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const columns: ColumnsType<OrderCarbon> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: '订单日期',
      dataIndex: 'orderDate',
      key: 'orderDate',
    },
    {
      title: '订单碳足迹',
      dataIndex: 'totalCarbon',
      key: 'totalCarbon',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
    {
      title: '碳减排量',
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      render: (value: number) => (
        <span style={{ color: '#52c41a' }}>+{value.toFixed(2)} kg CO₂e</span>
      ),
    },
    {
      title: '订单金额',
      dataIndex: 'orderAmount',
      key: 'orderAmount',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: '状态',
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
      <Card title="订单碳足迹统计" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="今日订单碳足迹"
              value={0}
              suffix="kg CO₂e"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="今日碳减排量"
              value={0}
              suffix="kg CO₂e"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="累计碳减排量"
              value={0}
              suffix="kg CO₂e"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="订单总数"
              value={0}
              suffix="单"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title="订单碳足迹趋势"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出数据
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Line {...chartConfig} height={300} />
      </Card>

      <Card title="订单列表">
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  )
}

export default CarbonOrder

