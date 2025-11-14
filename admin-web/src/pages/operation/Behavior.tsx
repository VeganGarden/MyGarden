import { Column } from '@ant-design/charts'
import { Card, Col, DatePicker, Row, Space, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useState } from 'react'

const { RangePicker } = DatePicker

interface BehaviorMetric {
  id: string
  date: string
  lowCarbonRatio: number
  customerBehavior: string
  carbonReduction: number
}

const OperationBehavior: React.FC = () => {
  const [dataSource] = useState<BehaviorMetric[]>([])

  const columns: ColumnsType<BehaviorMetric> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '低碳菜品占比',
      dataIndex: 'lowCarbonRatio',
      key: 'lowCarbonRatio',
      render: (value: number) => `${(value * 100).toFixed(1)}%`,
    },
    {
      title: '顾客行为',
      dataIndex: 'customerBehavior',
      key: 'customerBehavior',
    },
    {
      title: '碳减排量',
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
  ]

  const chartData = [
    { date: '1月', ratio: 0.65 },
    { date: '2月', ratio: 0.72 },
    { date: '3月', ratio: 0.68 },
  ]

  return (
    <div>
      <Card title="行为统计概览" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="低碳菜品占比"
              value={68.5}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="本月碳减排"
              value={1250}
              suffix="kg CO₂e"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="顾客低碳选择率"
              value={75.2}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="行为记录数"
              value={1250}
              suffix="条"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title="低碳菜品占比趋势"
        extra={<RangePicker />}
        style={{ marginBottom: 16 }}
      >
        <Column
          data={chartData}
          xField="date"
          yField="ratio"
          height={300}
          label={{
            position: 'middle',
            formatter: (datum: any) => `${(datum.ratio * 100).toFixed(1)}%`,
          }}
        />
      </Card>

      <Card title="行为指标明细">
        <Space style={{ marginBottom: 16 }}>
          <RangePicker />
        </Space>

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

export default OperationBehavior

