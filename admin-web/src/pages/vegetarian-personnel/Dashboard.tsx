/**
 * 综合统计看板页面
 * 展示员工和客户的素食统计数据，以及减碳效应分析
 */

import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, DatePicker, Button, Space, message, Divider } from 'antd'
import { DownloadOutlined, ReloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { vegetarianPersonnelAPI } from '@/services/vegetarianPersonnel'
import type { StaffStats, CustomerStats, CarbonEffectAnalysis } from '@/types/vegetarianPersonnel'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const DashboardPage: React.FC = () => {
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
      message.warning('请先选择餐厅')
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
      }
      if (customerResult.success && customerResult.data) {
        setCustomerStats(customerResult.data)
      }
      if (carbonResult.success && carbonResult.data) {
        setCarbonEffect(carbonResult.data)
      }
    } catch (error: any) {
      message.error(error.message || '加载失败')
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
          message.success('导出成功，文件已开始下载')
        } else {
          message.warning(result.data.note || '导出功能待完善')
        }
      } else {
        message.error(result.error || '导出失败')
      }
    } catch (error: any) {
      message.error(error.message || '导出失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card
        title="素食人员综合统计看板"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="YYYY-MM-DD"
            />
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              刷新
            </Button>
            <Button 
              icon={<FileExcelOutlined />} 
              onClick={() => handleExportESG('excel')}
              loading={loading}
            >
              导出Excel
            </Button>
            <Button 
              icon={<FilePdfOutlined />} 
              onClick={() => handleExportESG('pdf')}
              loading={loading}
            >
              导出PDF
            </Button>
          </Space>
        }
        loading={loading && !staffStats && !customerStats}
      >
        {/* 关键指标卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="员工总数"
                value={staffStats?.totalStaff || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="素食员工数"
                value={staffStats?.vegetarianStaff || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="客户总数"
                value={customerStats?.totalCustomers || 0}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="素食客户数"
                value={customerStats?.vegetarianCustomers || 0}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 素食比例对比 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title="员工素食比例">
              <Statistic
                title="素食比例"
                value={staffStats?.vegetarianRatio ? (staffStats.vegetarianRatio * 100).toFixed(2) : 0}
                suffix="%"
                valueStyle={{ color: '#52c41a', fontSize: 32 }}
              />
              <div style={{ marginTop: 16 }}>
                <Statistic
                  title="平均素食年限"
                  value={staffStats?.averageVegetarianYears || 0}
                  suffix="年"
                  precision={1}
                />
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="客户素食比例">
              <Statistic
                title="素食比例"
                value={customerStats?.vegetarianRatio ? (customerStats.vegetarianRatio * 100).toFixed(2) : 0}
                suffix="%"
                valueStyle={{ color: '#fa8c16', fontSize: 32 }}
              />
            </Card>
          </Col>
        </Row>

        {/* 减碳效应分析 */}
        {carbonEffect && (
          <Card title="减碳效应分析" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="员工减碳总量"
                    value={carbonEffect.staffCarbonEffect?.totalReduction || 0}
                    suffix="kg CO₂e"
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
                    title="客户减碳总量"
                    value={carbonEffect.customerCarbonEffect?.totalReduction || 0}
                    suffix="kg CO₂e"
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
                    title="总减碳量"
                    value={carbonEffect.totalCarbonEffect || 0}
                    suffix="kg CO₂e"
                    valueStyle={{ color: '#cf1322', fontSize: 28 }}
                    precision={2}
                  />
                </Card>
              </Col>
            </Row>

            {/* 减碳分析报告 */}
            {carbonEffect.report && (
              <div style={{ marginTop: 16 }}>
                <Divider>分析报告</Divider>
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
        <Card title="快捷操作" style={{ marginTop: 16 }}>
          <Space>
            <Button onClick={() => navigate('/vegetarian-personnel/staff')}>
              员工管理
            </Button>
            <Button onClick={() => navigate('/vegetarian-personnel/staff/stats')}>
              员工统计
            </Button>
            <Button onClick={() => navigate('/vegetarian-personnel/customers')}>
              客户管理
            </Button>
          </Space>
        </Card>
      </Card>
    </div>
  )
}

export default DashboardPage

