import { carbonFootprintAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { Column, Line } from '@ant-design/charts'
import { DeleteOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined, SaveOutlined, ShareAltOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import { App, Button, Card, Col, DatePicker, Descriptions, Popconfirm, Row, Select, Space, Statistic, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

const CarbonReport: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'esg'>('monthly')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(3, 'month'),
    dayjs(),
  ])
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; carbon: number; reduction: number; orderCount?: number }>>([])
  const [yearlyData, setYearlyData] = useState<Array<{ year: string; carbon: number; reduction: number; orderCount?: number }>>([])
  const [esgData, setEsgData] = useState<any>(null)
  const [reportSummary, setReportSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [historyReports, setHistoryReports] = useState<Array<any>>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [currentReportData, setCurrentReportData] = useState<any>(null)

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
      message.error(error.message || '获取报告数据失败，请稍后重试')
      setMonthlyData([])
      setYearlyData([])
      setEsgData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!currentRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }

    try {
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

      if (result && result.code === 0) {
        // 保存完整报告数据
        setCurrentReportData({
          type: reportType,
          period,
          generatedAt: new Date().toISOString(),
          data: result.data,
        })

        // 更新数据
        if (reportType === 'monthly' && result.data.monthlyData) {
          setMonthlyData(result.data.monthlyData.map((item: any) => ({
            month: item.month || item.monthName || '',
            carbon: item.carbon || 0,
            reduction: item.reduction || 0,
            orderCount: item.orderCount || 0,
          })))
          setReportSummary(result.data.summary || {
            totalCarbon: result.data.monthlyData.reduce((sum: number, item: any) => sum + (item.carbon || 0), 0),
            totalReduction: result.data.monthlyData.reduce((sum: number, item: any) => sum + (item.reduction || 0), 0),
            totalOrders: result.data.monthlyData.reduce((sum: number, item: any) => sum + (item.orderCount || 0), 0),
          })
        }
        
        if (reportType === 'yearly' && result.data.yearlyData) {
          setYearlyData(result.data.yearlyData.map((item: any) => ({
            year: item.year || item.yearName || '',
            carbon: item.carbon || 0,
            reduction: item.reduction || 0,
            orderCount: item.orderCount || 0,
          })))
          setReportSummary(result.data.summary || {
            totalCarbon: result.data.yearlyData.reduce((sum: number, item: any) => sum + (item.carbon || 0), 0),
            totalReduction: result.data.yearlyData.reduce((sum: number, item: any) => sum + (item.reduction || 0), 0),
            totalOrders: result.data.yearlyData.reduce((sum: number, item: any) => sum + (item.orderCount || 0), 0),
          })
        }
        
        if (reportType === 'esg' && result.data.esgData) {
          setEsgData(result.data.esgData)
          setReportSummary({
            totalCarbon: result.data.esgData.environmental?.totalCarbonFootprint || 0,
            totalReduction: result.data.esgData.environmental?.totalCarbonReduction || 0,
            totalOrders: result.data.esgData.social?.totalOrders || 0,
          })
        }

        message.success('报告生成成功')
      } else {
        throw new Error(result?.message || '生成报告失败')
      }
    } catch (error: any) {
      message.error(error.message || '生成报告失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveReport = async () => {
    if (!currentRestaurantId || !currentReportData) {
      message.warning('请先生成报告')
      return
    }

    try {
      const result = await carbonFootprintAPI.saveReport({
        restaurantId: currentRestaurantId,
        type: currentReportData.type,
        period: currentReportData.period,
        reportData: currentReportData.data,
      })

      if (result && result.code === 0) {
        message.success('报告已保存')
        // 刷新历史报告列表
        fetchHistoryReports()
      } else {
        throw new Error(result?.message || '保存报告失败')
      }
    } catch (error: any) {
      message.error(error.message || '保存报告失败，请稍后重试')
    }
  }

  const handleDownload = (format: 'pdf' | 'excel' | 'word') => {
    if (!currentReportData) {
      message.warning('请先生成报告')
      return
    }
    message.success(t('pages.carbon.report.messages.downloadInProgress', { format: format.toUpperCase() }))
    // TODO: 实现报告下载
  }

  const handleShare = () => {
    if (!currentReportData) {
      message.warning('请先生成报告')
      return
    }
    message.success(t('pages.carbon.report.messages.shareInProgress'))
    // TODO: 生成分享链接
  }

  const fetchHistoryReports = async () => {
    if (!currentRestaurantId) {
      setHistoryReports([])
      return
    }

    try {
      setHistoryLoading(true)
      const result = await carbonFootprintAPI.getReports({
        restaurantId: currentRestaurantId,
        page: 1,
        pageSize: 50,
      })

      if (result && result.code === 0 && result.data) {
        setHistoryReports(result.data.reports || [])
      } else {
        setHistoryReports([])
      }
    } catch (error: any) {
      message.error(error.message || '获取历史报告失败，请稍后重试')
      setHistoryReports([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleViewHistoryReport = (report: any) => {
    // 加载历史报告数据
    setCurrentReportData(report)
    if (report.type === 'monthly' && report.data.monthlyData) {
      setMonthlyData(report.data.monthlyData)
      setReportType('monthly')
    } else if (report.type === 'yearly' && report.data.yearlyData) {
      setYearlyData(report.data.yearlyData)
      setReportType('yearly')
    } else if (report.type === 'esg' && report.data.esgData) {
      setEsgData(report.data.esgData)
      setReportType('esg')
    }
    // 切换到预览标签
    message.success('已加载历史报告')
  }

  const handleDeleteHistoryReport = async (reportId: string) => {
    if (!currentRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }

    try {
      const result = await carbonFootprintAPI.deleteReport({
        reportId,
        restaurantId: currentRestaurantId,
      })

      if (result && result.code === 0) {
        message.success('删除成功')
        fetchHistoryReports()
      } else {
        throw new Error(result?.message || '删除报告失败')
      }
    } catch (error: any) {
      message.error(error.message || '删除报告失败，请稍后重试')
    }
  }

  useEffect(() => {
    if (currentRestaurantId) {
      fetchHistoryReports()
    }
  }, [currentRestaurantId])

  // 月度报告表格列
  const monthlyColumns: ColumnsType<any> = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
    },
    {
      title: '碳足迹 (kg CO₂e)',
      dataIndex: 'carbon',
      key: 'carbon',
      render: (value: number) => value.toFixed(2),
    },
    {
      title: '碳减排量 (kg CO₂e)',
      dataIndex: 'reduction',
      key: 'reduction',
      render: (value: number) => (
        <span style={{ color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (value: number) => value || 0,
    },
  ]

  // 年度报告表格列
  const yearlyColumns: ColumnsType<any> = [
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: '碳足迹 (kg CO₂e)',
      dataIndex: 'carbon',
      key: 'carbon',
      render: (value: number) => value.toFixed(2),
    },
    {
      title: '碳减排量 (kg CO₂e)',
      dataIndex: 'reduction',
      key: 'reduction',
      render: (value: number) => (
        <span style={{ color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value.toFixed(2)}
        </span>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (value: number) => value || 0,
    },
  ]

  // 历史报告表格列
  const historyColumns: ColumnsType<any> = [
    {
      title: '报告类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          monthly: { text: '月度报告', color: 'blue' },
          yearly: { text: '年度报告', color: 'green' },
          esg: { text: 'ESG报告', color: 'orange' },
        }
        const config = typeMap[type] || { text: type, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '报告周期',
      dataIndex: 'period',
      key: 'period',
      render: (period: string) => {
        if (period && period.includes('_')) {
          const [start, end] = period.split('_')
          return `${start} 至 ${end}`
        }
        return period || '-'
      },
    },
    {
      title: '生成时间',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewHistoryReport(record)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定要删除这个报告吗？"
            onConfirm={() => handleDeleteHistoryReport(record._id || record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tabItems: TabsProps['items'] = [
    {
      key: 'preview',
      label: t('pages.carbon.report.tabs.preview'),
      children: (
        <Card
          title={reportType === 'monthly' 
            ? t('pages.carbon.report.preview.monthlyTitle')
            : reportType === 'yearly'
            ? t('pages.carbon.report.preview.yearlyTitle')
            : t('pages.carbon.report.preview.esgTitle')}
          extra={
            <Space>
              {currentReportData && (
                <Button icon={<SaveOutlined />} onClick={handleSaveReport}>
                  保存报告
                </Button>
              )}
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
          {/* 报告摘要统计 */}
          {reportSummary && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="总碳足迹"
                    value={reportSummary.totalCarbon || 0}
                    suffix="kg CO₂e"
                    precision={2}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="总碳减排量"
                    value={reportSummary.totalReduction || 0}
                    suffix="kg CO₂e"
                    precision={2}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="总订单数"
                    value={reportSummary.totalOrders || 0}
                    suffix="单"
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* 报告生成信息 */}
          {currentReportData && (
            <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="报告类型">
                {reportType === 'monthly' ? '月度报告' : reportType === 'yearly' ? '年度报告' : 'ESG报告'}
              </Descriptions.Item>
              <Descriptions.Item label="报告周期">
                {currentReportData.period?.replace('_', ' 至 ') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="生成时间">
                {dayjs(currentReportData.generatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          )}
          {reportType === 'monthly' && (
            <div>
              <h3 style={{ marginBottom: 16 }}>{t('pages.carbon.report.preview.monthlyData')}</h3>
              {monthlyData.length > 0 ? (
                <>
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
                  <Table
                    columns={monthlyColumns}
                    dataSource={monthlyData}
                    rowKey="month"
                    pagination={false}
                    style={{ marginTop: 24 }}
                    size="small"
                  />
                </>
              ) : (
                <div style={{ padding: 24, textAlign: 'center' }}>暂无数据</div>
              )}
            </div>
          )}

          {reportType === 'yearly' && (
            <div>
              <h3 style={{ marginBottom: 16 }}>{t('pages.carbon.report.preview.yearlyTrend')}</h3>
              {yearlyData.length > 0 ? (
                <>
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
                  <Table
                    columns={yearlyColumns}
                    dataSource={yearlyData}
                    rowKey="year"
                    pagination={false}
                    style={{ marginTop: 24 }}
                    size="small"
                  />
                </>
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
      ),
    },
    {
      key: 'history',
      label: t('pages.carbon.report.tabs.history'),
      children: (
        <Card
          title="历史报告"
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchHistoryReports}
              loading={historyLoading}
            >
              刷新
            </Button>
          }
        >
          {historyReports.length > 0 ? (
            <Table
              columns={historyColumns}
              dataSource={historyReports}
              rowKey={(record) => record._id || record.id || Math.random().toString()}
              loading={historyLoading}
              pagination={{
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: '#999', marginBottom: 16 }}>暂无历史报告</p>
              <p style={{ color: '#999', fontSize: 12 }}>
                生成报告后，可以点击"保存报告"按钮保存到历史记录
              </p>
            </div>
          )}
        </Card>
      ),
    },
  ]

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
        <Tabs defaultActiveKey="preview" items={tabItems} />
      </Card>
    </div>
  )
}

export default CarbonReport

