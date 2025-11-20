import { useAppSelector } from '@/store/hooks'
import { carbonFootprintAPI } from '@/services/cloudbase'
import { Column, Line } from '@ant-design/charts'
import { DownloadOutlined, EyeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Select, Space, Tabs, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { TabPane } = Tabs
const { RangePicker } = DatePicker

const CarbonReport: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'esg'>('monthly')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(3, 'month'),
    dayjs(),
  ])
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; carbon: number; reduction: number }>>([])
  const [yearlyData, setYearlyData] = useState<Array<{ year: string; carbon: number; reduction: number }>>([])
  const [esgData, setEsgData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentRestaurantId) {
      fetchReportData()
    }
  }, [currentRestaurantId, reportType, dateRange])

  const fetchReportData = async () => {
    try {
      if (!currentRestaurantId) {
        setMonthlyData([])
        setYearlyData([])
        setEsgData(null)
        return
      }
      
      setLoading(true)
      const period = dateRange 
        ? `${dateRange[0].format('YYYY-MM-DD')}_${dateRange[1].format('YYYY-MM-DD')}`
        : reportType === 'monthly' 
          ? `${dayjs().subtract(3, 'month').format('YYYY-MM-DD')}_${dayjs().format('YYYY-MM-DD')}`
          : `${dayjs().subtract(1, 'year').format('YYYY-MM-DD')}_${dayjs().format('YYYY-MM-DD')}`
      
      const result = await carbonFootprintAPI.generateReport({
        type: reportType,
        period,
        restaurantId: currentRestaurantId,
      })
      
      if (result && result.code === 0 && result.data) {
        const data = result.data
        
        if (reportType === 'monthly' && data.monthlyData) {
          setMonthlyData(data.monthlyData.map((item: any) => ({
            month: item.month || item.monthName || '',
            carbon: item.carbon || item.totalCarbon || 0,
            reduction: item.reduction || item.carbonReduction || 0,
          })))
        }
        
        if (reportType === 'yearly' && data.yearlyData) {
          setYearlyData(data.yearlyData.map((item: any) => ({
            year: item.year || item.yearName || '',
            carbon: item.carbon || item.totalCarbon || 0,
            reduction: item.reduction || item.carbonReduction || 0,
          })))
        }
        
        if (reportType === 'esg' && data.esgData) {
          setEsgData(data.esgData)
        }
      } else {
        setMonthlyData([])
        setYearlyData([])
        setEsgData(null)
      }
    } catch (error: any) {
      console.error('获取报告数据失败:', error)
      message.error(error.message || '获取报告数据失败，请稍后重试')
      setMonthlyData([])
      setYearlyData([])
      setEsgData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    try {
      setLoading(true)
      await fetchReportData()
      message.success(t('pages.carbon.report.messages.generateInProgress'))
    } catch (error: any) {
      message.error(error.message || '生成报告失败')
    } finally {
      setLoading(false)
    }
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
            <RangePicker 
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
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
                  {monthlyData.length > 0 ? (
                    <Column
                      data={monthlyData}
                      xField="month"
                      yField="reduction"
                      height={300}
                      loading={loading}
                      label={{
                        position: 'middle',
                        style: {
                          fill: '#FFFFFF',
                          opacity: 0.6,
                        },
                      }}
                    />
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center' }}>暂无数据</div>
                  )}
                </div>
              )}

              {reportType === 'yearly' && (
                <div>
                  <h3>{t('pages.carbon.report.preview.yearlyTrend')}</h3>
                  {yearlyData.length > 0 ? (
                    <Line
                      data={yearlyData}
                      xField="year"
                      yField="reduction"
                      height={300}
                      loading={loading}
                      point={{
                        size: 5,
                        shape: 'diamond',
                      }}
                    />
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center' }}>暂无数据</div>
                  )}
                </div>
              )}

              {reportType === 'esg' && (
                <div>
                  <h3>{t('pages.carbon.report.preview.esgContent')}</h3>
                  {esgData ? (
                    <div style={{ padding: 24 }}>
                      <h4>{t('pages.carbon.report.preview.environmental')}</h4>
                      <ul>
                        <li>累计碳减排: {esgData.environmental?.totalCarbonReduction || esgData.totalCarbonReduction || 0} kg CO₂e</li>
                        <li>能源消耗: {esgData.environmental?.energyReduction || '优化中'}</li>
                        <li>废物处理: {esgData.environmental?.wasteManagement || '进行中'}</li>
                      </ul>

                      <h4 style={{ marginTop: 24 }}>{t('pages.carbon.report.preview.social')}</h4>
                      <ul>
                        <li>就业人数: {esgData.social?.employment || 0}人</li>
                        <li>社区贡献: {esgData.social?.communityContribution || '进行中'}</li>
                        <li>用户满意度: {esgData.social?.userSatisfaction || 0}/5.0</li>
                      </ul>

                      <h4 style={{ marginTop: 24 }}>{t('pages.carbon.report.preview.governance')}</h4>
                      <ul>
                        <li>合规性: {esgData.governance?.compliance || '进行中'}</li>
                        <li>透明度: {esgData.governance?.transparency || '进行中'}</li>
                        <li>责任管理: {esgData.governance?.management || '进行中'}</li>
                      </ul>
                    </div>
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center' }}>暂无数据</div>
                  )}
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

