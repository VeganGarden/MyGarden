import { Column, Line } from '@ant-design/charts'
import { DownloadOutlined, EyeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Select, Space, Tabs, message } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const { TabPane } = Tabs
const { RangePicker } = DatePicker

const CarbonReport: React.FC = () => {
  const { t } = useTranslation()
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'esg'>('monthly')

  const monthlyData = [
    { month: '1月', carbon: 1200, reduction: 800 },
    { month: '2月', carbon: 1350, reduction: 950 },
    { month: '3月', carbon: 1100, reduction: 750 },
  ]

  const yearlyData = [
    { year: '2023', carbon: 12000, reduction: 8000 },
    { year: '2024', carbon: 15000, reduction: 10000 },
    { year: '2025', carbon: 18000, reduction: 12000 },
  ]

  const handleGenerate = () => {
    message.success(t('pages.carbon.report.messages.generateInProgress'))
    // TODO: 调用报告生成API
  }

  const handleDownload = (format: 'pdf' | 'excel' | 'word') => {
    message.success(t('pages.carbon.report.messages.downloadInProgress', { format: format.toUpperCase() }))
    // TODO: 实现报告下载
  }

  const handleShare = () => {
    message.success(t('pages.carbon.report.messages.shareInProgress'))
    // TODO: 生成分享链接
  }

  return (
    <div>
      <Card
        title={t('pages.carbon.report.title')}
        extra={
          <Space>
            <Select
              value={reportType}
              onChange={setReportType}
              style={{ width: 150 }}
            >
              <Select.Option value="monthly">{t('pages.carbon.report.types.monthly')}</Select.Option>
              <Select.Option value="yearly">{t('pages.carbon.report.types.yearly')}</Select.Option>
              <Select.Option value="esg">{t('pages.carbon.report.types.esg')}</Select.Option>
            </Select>
            <RangePicker />
            <Button type="primary" onClick={handleGenerate}>
              {t('pages.carbon.report.buttons.generate')}
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="preview">
          <TabPane tab={t('pages.carbon.report.tabs.preview')} key="preview">
            <Card
              title={reportType === 'monthly' 
                ? t('pages.carbon.report.preview.monthlyTitle')
                : reportType === 'yearly'
                ? t('pages.carbon.report.preview.yearlyTitle')
                : t('pages.carbon.report.preview.esgTitle')}
              extra={
                <Space>
                  <Button icon={<EyeOutlined />}>{t('pages.carbon.report.buttons.preview')}</Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleDownload('pdf')}>
                    {t('pages.carbon.report.buttons.downloadPdf')}
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleDownload('excel')}>
                    {t('pages.carbon.report.buttons.downloadExcel')}
                  </Button>
                  <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                    {t('pages.carbon.report.buttons.share')}
                  </Button>
                </Space>
              }
            >
              {reportType === 'monthly' && (
                <div>
                  <h3>{t('pages.carbon.report.preview.monthlyData')}</h3>
                  <Column
                    data={monthlyData}
                    xField="month"
                    yField="reduction"
                    height={300}
                    label={{
                      position: 'middle',
                      style: {
                        fill: '#FFFFFF',
                        opacity: 0.6,
                      },
                    }}
                  />
                </div>
              )}

              {reportType === 'yearly' && (
                <div>
                  <h3>{t('pages.carbon.report.preview.yearlyTrend')}</h3>
                  <Line
                    data={yearlyData}
                    xField="year"
                    yField="reduction"
                    height={300}
                    point={{
                      size: 5,
                      shape: 'diamond',
                    }}
                  />
                </div>
              )}

              {reportType === 'esg' && (
                <div>
                  <h3>{t('pages.carbon.report.preview.esgContent')}</h3>
                  <div style={{ padding: 24 }}>
                    <h4>{t('pages.carbon.report.preview.environmental')}</h4>
                    <ul>
                      <li>累计碳减排: 30,000 kg CO₂e</li>
                      <li>能源消耗: 优化后减少15%</li>
                      <li>废物处理: 实现零废弃目标</li>
                    </ul>

                    <h4 style={{ marginTop: 24 }}>{t('pages.carbon.report.preview.social')}</h4>
                    <ul>
                      <li>就业人数: 50人</li>
                      <li>社区贡献: 参与10次公益活动</li>
                      <li>用户满意度: 4.5/5.0</li>
                    </ul>

                    <h4 style={{ marginTop: 24 }}>{t('pages.carbon.report.preview.governance')}</h4>
                    <ul>
                      <li>合规性: 100%符合认证标准</li>
                      <li>透明度: 数据公开透明</li>
                      <li>责任管理: 建立完善的管理体系</li>
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          </TabPane>

          <TabPane tab={t('pages.carbon.report.tabs.history')} key="history">
            <div>
              <p>{t('pages.carbon.report.history.inProgress')}</p>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default CarbonReport

