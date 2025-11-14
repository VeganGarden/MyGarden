import { Line, Pie } from '@ant-design/charts'
import { DownloadOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic } from 'antd'
import dayjs from 'dayjs'
import React, { useState } from 'react'

const { RangePicker } = DatePicker

const ReportDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const revenueTrend = [
    { date: '1月', value: 50000 },
    { date: '2月', value: 55000 },
    { date: '3月', value: 48000 },
  ]

  const carbonTrend = [
    { date: '1月', value: 1200 },
    { date: '2月', value: 1350 },
    { date: '3月', value: 1100 },
  ]

  const categoryData = [
    { type: '低碳菜品', value: 65 },
    { type: '中碳菜品', value: 25 },
    { type: '高碳菜品', value: 10 },
  ]

  const handleExport = () => {
    console.log('导出数据看板')
  }

  const handleCustomize = () => {
    console.log('自定义看板')
  }

  return (
    <div>
      <Card
        title="数据看板"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
            <Button icon={<SettingOutlined />} onClick={handleCustomize}>
              自定义
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title="总收入"
              value={153000}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="订单总数"
              value={3650}
              suffix="单"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="累计碳减排"
              value={3650}
              suffix="kg CO₂e"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="目标完成率"
              value={100}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title="收入趋势" size="small">
              <Line
                data={revenueTrend}
                xField="date"
                yField="value"
                height={250}
                point={{
                  size: 5,
                  shape: 'diamond',
                }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="碳减排趋势" size="small">
              <Line
                data={carbonTrend}
                xField="date"
                yField="value"
                height={250}
                point={{
                  size: 5,
                  shape: 'diamond',
                }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Card title="菜品分类占比" size="small">
              <Pie
                data={categoryData}
                angleField="value"
                colorField="type"
                height={250}
                radius={0.8}
                label={{
                  type: 'outer',
                  content: '{name}: {percentage}',
                }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="关键指标" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="平均客单价" value={41.92} prefix="¥" />
                </Col>
                <Col span={12}>
                  <Statistic title="复购率" value={68.5} suffix="%" />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic title="低碳菜品占比" value={65} suffix="%" />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic title="用户满意度" value={4.5} suffix="/5.0" />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default ReportDashboard

