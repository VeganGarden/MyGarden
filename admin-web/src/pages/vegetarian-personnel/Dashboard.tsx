/**
 * 综合统计看板页面
 * 展示员工和客户的素食统计数据，以及减碳效应分析
 */

import { vegetarianPersonnelAPI } from '@/services/vegetarianPersonnel'
import { useAppSelector } from '@/store/hooks'
import type { CarbonEffectAnalysis, CustomerStats, StaffStats } from '@/types/vegetarianPersonnel'
import { FileExcelOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Divider, Row, Space, Statistic, message } from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const { RangePicker } = DatePicker

const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [staffStats, setStaffStats] = useState<StaffStats | null>(null)
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null)
  const [carbonEffect, setCarbonEffect] = useState<CarbonEffectAnalysis | null>(null)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  useEffect(() => {
    if (currentRestaurantId) {
      loadData()
    }
  }, [currentRestaurantId])

  const loadData = async () => {
    if (!currentRestaurantId || !currentTenant) {
      message.warning(t('pages.vegetarianPersonnel.dashboard.messages.noRestaurant'))
      return
    }

    setLoading(true)
    try {
      const params: any = {
        restaurantId: currentRestaurantId,
        tenantId: currentTenant.id || currentTenant._id || ''
      }

      if (dateRange) {
        params.startDate = dateRange[0].toDate()
        params.endDate = dateRange[1].toDate()
      }

      // 并行加载所有统计数据
      const [staffResult, customerResult, carbonResult] = await Promise.all([
        vegetarianPersonnelAPI.stats.getStaffStats(params.tenantId, params.restaurantId),
        vegetarianPersonnelAPI.stats.getCustomerStats(params.tenantId, params.restaurantId),
        vegetarianPersonnelAPI.stats.getCarbonEffectAnalysis(params.tenantId, params.restaurantId, params.startDate, params.endDate)
      ])

      if (staffResult.success && staffResult.data) {
        setStaffStats(staffResult.data)
      } else if (!staffResult.success) {
        console.error('获取员工统计失败:', staffResult.error)
      }

      if (customerResult.success && customerResult.data) {
        setCustomerStats(customerResult.data)
      } else if (!customerResult.success) {
        console.error('获取客户统计失败:', customerResult.error)
      }

      if (carbonResult.success && carbonResult.data) {
        setCarbonEffect(carbonResult.data)
      } else if (!carbonResult.success) {
        console.error('获取减碳效应分析失败:', carbonResult.error)
      }

      // 如果所有请求都失败，显示错误提示
      if (!staffResult.success && !customerResult.success && !carbonResult.success) {
        message.error(t('pages.vegetarianPersonnel.dashboard.messages.loadFailed'))
      } else if (staffResult.success && customerResult.success && carbonResult.success) {
        // 全部成功时不显示消息，避免干扰
      }
    } catch (error: any) {
      console.error('加载统计数据异常:', error)
      message.error(error.message || t('pages.vegetarianPersonnel.dashboard.messages.networkError'))
    } finally {
      setLoading(false)
    }
  }

  // 导出ESG报告
  const handleExportESG = async (format: 'excel' | 'pdf') => {
    try {
      setLoading(true)
      const params: any = {
        restaurantId: currentRestaurantId || '',
        tenantId: (currentTenant && (currentTenant.id || currentTenant._id)) || '',
        format: format
      }

      if (dateRange) {
        params.startDate = dateRange[0].toDate()
        params.endDate = dateRange[1].toDate()
      }

      const result = await vegetarianPersonnelAPI.export.exportESGReport(params)
      if (result.success && result.data) {
        if (result.data.downloadUrl) {
          window.open(result.data.downloadUrl, '_blank')
          const formatName = format === 'excel' ? 'Excel' : 'PDF'
          message.success(t('pages.vegetarianPersonnel.dashboard.messages.exportSuccess', { format: formatName }))
        } else {
          message.warning(result.data.note || t('pages.vegetarianPersonnel.dashboard.messages.exportNote'))
        }
      } else {
        message.error(result.error || t('pages.vegetarianPersonnel.dashboard.messages.exportFailed'))
      }
    } catch (error: any) {
      console.error('导出ESG报告异常:', error)
      message.error(error.message || t('pages.vegetarianPersonnel.dashboard.messages.exportFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card
        title={t('pages.vegetarianPersonnel.dashboard.title')}
        extra={
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="YYYY-MM-DD"
            />
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              {t('pages.vegetarianPersonnel.dashboard.buttons.refresh')}
            </Button>
            <Button 
              icon={<FileExcelOutlined />} 
              onClick={() => handleExportESG('excel')}
              loading={loading}
            >
              {t('pages.vegetarianPersonnel.dashboard.buttons.exportExcel')}
            </Button>
            <Button 
              icon={<FilePdfOutlined />} 
              onClick={() => handleExportESG('pdf')}
              loading={loading}
            >
              {t('pages.vegetarianPersonnel.dashboard.buttons.exportPdf')}
            </Button>
          </Space>
        }
        loading={loading && !staffStats && !customerStats}
      >
        {/* 关键指标卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={12} lg={6} xl={6}>
            <Card>
              <Statistic
                title={t('pages.vegetarianPersonnel.dashboard.statistics.totalStaff')}
                value={staffStats?.totalStaff || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6} xl={6}>
            <Card>
              <Statistic
                title={t('pages.vegetarianPersonnel.dashboard.statistics.vegetarianStaff')}
                value={staffStats?.vegetarianStaff || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6} xl={6}>
            <Card>
              <Statistic
                title={t('pages.vegetarianPersonnel.dashboard.statistics.totalCustomers')}
                value={customerStats?.totalCustomers || 0}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6} xl={6}>
            <Card>
              <Statistic
                title={t('pages.vegetarianPersonnel.dashboard.statistics.vegetarianCustomers')}
                value={customerStats?.vegetarianCustomers || 0}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

            {/* 素食比例对比 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Card title={t('pages.vegetarianPersonnel.dashboard.sections.staffVegetarianRatio')}>
                  <Statistic
                    title={t('pages.vegetarianPersonnel.dashboard.statistics.staffVegetarianRatio')}
                    value={staffStats?.vegetarianRatio ? Number(staffStats.vegetarianRatio).toFixed(2) : 0}
                    suffix={t('pages.vegetarianPersonnel.dashboard.units.percent')}
                    valueStyle={{ color: '#52c41a', fontSize: 32 }}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Statistic
                      title={t('pages.vegetarianPersonnel.dashboard.statistics.averageVegetarianYears')}
                      value={staffStats?.averageVegetarianYears || 0}
                      suffix={t('pages.vegetarianPersonnel.dashboard.units.year')}
                      precision={1}
                    />
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Card title={t('pages.vegetarianPersonnel.dashboard.sections.customerVegetarianRatio')}>
                  <Statistic
                    title={t('pages.vegetarianPersonnel.dashboard.statistics.customerVegetarianRatio')}
                    value={customerStats?.vegetarianRatio ? Number(customerStats.vegetarianRatio).toFixed(2) : 0}
                    suffix={t('pages.vegetarianPersonnel.dashboard.units.percent')}
                    valueStyle={{ color: '#fa8c16', fontSize: 32 }}
                  />
                </Card>
              </Col>
            </Row>

        {/* 减碳效应分析 */}
        {carbonEffect && (
          <Card title={t('pages.vegetarianPersonnel.dashboard.sections.carbonEffectAnalysis')} style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title={t('pages.vegetarianPersonnel.dashboard.statistics.staffCarbonEffect')}
                    value={carbonEffect.staffCarbonEffect?.totalReduction || 0}
                    suffix={t('pages.vegetarianPersonnel.dashboard.units.carbonUnit')}
                    valueStyle={{ color: '#52c41a' }}
                    precision={2}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    {carbonEffect.staffCarbonEffect?.description || ''}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title={t('pages.vegetarianPersonnel.dashboard.statistics.customerCarbonEffect')}
                    value={carbonEffect.customerCarbonEffect?.totalReduction || 0}
                    suffix={t('pages.vegetarianPersonnel.dashboard.units.carbonUnit')}
                    valueStyle={{ color: '#fa8c16' }}
                    precision={2}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    {carbonEffect.customerCarbonEffect?.description || ''}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title={t('pages.vegetarianPersonnel.dashboard.statistics.totalCarbonEffect')}
                    value={carbonEffect.totalCarbonEffect || 0}
                    suffix={t('pages.vegetarianPersonnel.dashboard.units.carbonUnit')}
                    valueStyle={{ color: '#cf1322', fontSize: 28 }}
                    precision={2}
                  />
                </Card>
              </Col>
            </Row>

            {/* 减碳分析报告 */}
            {carbonEffect.report && (
              <div style={{ marginTop: 16 }}>
                <Divider>{t('pages.vegetarianPersonnel.dashboard.sections.analysisReport')}</Divider>
                <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                  {(() => {
                    try {
                      const report = JSON.parse(carbonEffect.report)
                      return (
                        <div>
                          {report.insights && report.insights.map((insight: string, index: number) => (
                            <div key={index} style={{ marginBottom: 8 }}>• {insight}</div>
                          ))}
                        </div>
                      )
                    } catch (e) {
                      return <div>{carbonEffect.report}</div>
                    }
                  })()}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 快捷操作 */}
        <Card title={t('pages.vegetarianPersonnel.dashboard.sections.quickActions')} style={{ marginTop: 16 }}>
          <Space>
            <Button onClick={() => navigate('/vegetarian-personnel/staff')}>
              {t('pages.vegetarianPersonnel.dashboard.buttons.staffManagement')}
            </Button>
            <Button onClick={() => navigate('/vegetarian-personnel/staff/stats')}>
              {t('pages.vegetarianPersonnel.dashboard.buttons.staffStats')}
            </Button>
            <Button onClick={() => navigate('/vegetarian-personnel/customers')}>
              {t('pages.vegetarianPersonnel.dashboard.buttons.customerManagement')}
            </Button>
          </Space>
        </Card>
      </Card>
    </div>
  )
}

export default DashboardPage

