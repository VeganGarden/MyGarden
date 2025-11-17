import { Column, Line } from '@ant-design/charts'
import { DownloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic } from 'antd'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

const ReportCarbon: React.FC = () => {
  const { t } = useTranslation()
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
      <Card title={t('pages.report.carbon.overview.title')} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={t('pages.report.carbon.overview.totalCarbonReduction')}
              value={3650}
              suffix="kg CO₂e"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.carbon.overview.monthlyCarbonReduction')}
              value={1100}
              suffix="kg CO₂e"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.carbon.overview.targetCompletionRate')}
              value={100}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.report.carbon.overview.annualTarget')}
              value={12000}
              suffix="kg CO₂e"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={t('pages.report.carbon.trend.title')}
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              {t('pages.report.carbon.buttons.export')}
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

      <Card title={t('pages.report.carbon.targetCompletion.title')} style={{ marginBottom: 16 }}>
        <Column
          data={targetData}
          xField="month"
          yField="value"
          seriesField="type"
          height={300}
          isGroup
        />
      </Card>

      <Card title={t('pages.report.carbon.analysis.title')}>
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small" title={t('pages.report.carbon.analysis.byDish.title')}>
              <p>{t('pages.report.carbon.analysis.byDish.lowCarbon')}: 65%</p>
              <p>{t('pages.report.carbon.analysis.byDish.mediumCarbon')}: 25%</p>
              <p>{t('pages.report.carbon.analysis.byDish.highCarbon')}: 10%</p>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title={t('pages.report.carbon.analysis.byTime.title')}>
              <p>{t('pages.report.carbon.analysis.byTime.breakfast')}: 20%</p>
              <p>{t('pages.report.carbon.analysis.byTime.lunch')}: 45%</p>
              <p>{t('pages.report.carbon.analysis.byTime.dinner')}: 35%</p>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title={t('pages.report.carbon.analysis.byUser.title')}>
              <p>{t('pages.report.carbon.analysis.byUser.newUser')}: 30%</p>
              <p>{t('pages.report.carbon.analysis.byUser.oldUser')}: 70%</p>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default ReportCarbon

