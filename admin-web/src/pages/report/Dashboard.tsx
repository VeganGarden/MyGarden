import { Line, Pie } from '@ant-design/charts'
import { DownloadOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic } from 'antd'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

const ReportDashboard: React.FC = () => {
  const { t } = useTranslation()
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
        title={t('pages.report.dashboard.title')}
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
            <Button icon={<SettingOutlined />} onClick={handleCustomize}>
              {t('pages.report.dashboard.buttons.customize')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              {t('common.export')}
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title={t('pages.report.dashboard.statistics.totalRevenue')}
              value={153000}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.dashboard.statistics.totalOrders')}
              value={3650}
              suffix={t('pages.operation.order.statistics.unit')}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.dashboard.statistics.totalCarbonReduction')}
              value={3650}
              suffix="kg CO₂e"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.dashboard.statistics.targetCompletionRate')}
              value={100}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title={t('pages.report.dashboard.charts.revenueTrend')} size="small">
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
            <Card title={t('pages.report.dashboard.charts.carbonReductionTrend')} size="small">
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
            <Card title={t('pages.report.dashboard.charts.categoryRatio')} size="small">
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
            <Card title={t('pages.report.dashboard.charts.keyMetrics')} size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title={t('pages.report.dashboard.metrics.avgOrderValue')} value={41.92} prefix="¥" />
                </Col>
                <Col span={12}>
                  <Statistic title={t('pages.report.dashboard.metrics.repurchaseRate')} value={68.5} suffix="%" />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic title={t('pages.report.dashboard.metrics.lowCarbonRatio')} value={65} suffix="%" />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic title={t('pages.report.dashboard.metrics.userSatisfaction')} value={4.5} suffix="/5.0" />
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

