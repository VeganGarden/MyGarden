import { Column, Line } from '@ant-design/charts'
import { DownloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic } from 'antd'
import dayjs from 'dayjs'
import React, { useState } from 'react'

const { RangePicker } = DatePicker

const ReportCarbon: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const reductionData = [
    { month: '1月', reduction: 1200 },
    { month: '2月', reduction: 1350 },
    { month: '3月', reduction: 1100 },
  ]

  const targetData = [
    { month: '1月', actual: 1200, target: 1000 },
    { month: '2月', actual: 1350, target: 1200 },
    { month: '3月', actual: 1100, target: 1100 },
  ]

  const handleExport = () => {
    console.log('导出碳减排数据报表')
  }

  return (
    <div>
      <Card title="碳减排数据概览" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="累计碳减排"
              value={3650}
              suffix="kg CO₂e"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="月度碳减排"
              value={1100}
              suffix="kg CO₂e"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="目标完成率"
              value={100}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="年度目标"
              value={12000}
              suffix="kg CO₂e"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title="碳减排趋势"
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
        <Line
          data={reductionData}
          xField="month"
          yField="reduction"
          height={300}
          point={{
            size: 5,
            shape: 'diamond',
          }}
        />
      </Card>

      <Card title="目标完成情况" style={{ marginBottom: 16 }}>
        <Column
          data={targetData}
          xField="month"
          yField="value"
          seriesField="type"
          height={300}
          isGroup
        />
      </Card>

      <Card title="多维度分析">
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small" title="按菜品">
              <p>低碳菜品贡献: 65%</p>
              <p>中碳菜品贡献: 25%</p>
              <p>高碳菜品贡献: 10%</p>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="按时段">
              <p>早餐时段: 20%</p>
              <p>午餐时段: 45%</p>
              <p>晚餐时段: 35%</p>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="按用户">
              <p>新用户: 30%</p>
              <p>老用户: 70%</p>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default ReportCarbon

