import { Column, Line } from '@ant-design/charts'
import { DownloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic } from 'antd'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

const ReportBusiness: React.FC = () => {
  const { t } = useTranslation()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const revenueData = [
    { month: '1月', revenue: 50000 },
    { month: '2月', revenue: 55000 },
    { month: '3月', revenue: 48000 },
  ]

  const orderData = [
    { month: '1月', orders: 1200 },
    { month: '2月', orders: 1350 },
    { month: '3月', orders: 1100 },
  ]

  const handleExport = () => {
    console.log('导出经营数据报表')
  }

  return (
    <div>
      <Card title={t('pages.report.business.overview.title')} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={t('pages.report.business.overview.totalRevenue')}
              value={153000}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.business.overview.totalOrders')}
              value={3650}
              suffix={t('pages.operation.order.statistics.unit')}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.business.overview.avgOrderValue')}
              value={41.92}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.business.overview.repurchaseRate')}
              value={68.5}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={t('pages.report.business.revenueTrend.title')}
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              {t('pages.report.business.buttons.export')}
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Line
          data={revenueData}
          xField="month"
          yField="revenue"
          height={300}
          point={{
            size: 5,
            shape: 'diamond',
          }}
        />
      </Card>

      <Card title={t('pages.report.business.orderStatistics.title')} style={{ marginBottom: 16 }}>
        <Column
          data={orderData}
          xField="month"
          yField="orders"
          height={300}
          label={{
            position: 'middle',
          }}
        />
      </Card>

      <Card title={t('pages.report.business.costAnalysis.title')}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic title={t('pages.report.business.costAnalysis.ingredientCost')} value={61200} prefix="¥" />
          </Col>
          <Col span={8}>
            <Statistic title={t('pages.report.business.costAnalysis.operationCost')} value={30600} prefix="¥" />
          </Col>
          <Col span={8}>
            <Statistic title={t('pages.report.business.costAnalysis.profitMargin')} value={40} suffix="%" valueStyle={{ color: '#3f8600' }} />
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default ReportBusiness

