/**
 * V2版本综合统计看板页面
 * 展示基于年限增长系数的减碳计算结果
 */

import { vegetarianPersonnelV2API } from '@/services/vegetarianPersonnelV2'
import { useAppSelector } from '@/store/hooks'
import type { CarbonEffectAnalysisV2 } from '@/types/vegetarianPersonnelV2'
import { InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, DatePicker, Descriptions, Divider, Row, Space, Statistic, Tag, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { RangePicker } = DatePicker

const DashboardV2Page: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [carbonEffect, setCarbonEffect] = useState<CarbonEffectAnalysisV2 | null>(null)
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

      const result = await vegetarianPersonnelV2API.getCarbonEffectAnalysisV2(
        params.tenantId,
        params.restaurantId,
        params.startDate,
        params.endDate
      )

      if (result.success && result.data) {
        setCarbonEffect(result.data)
      } else {
        message.error(result.error || '获取数据失败')
      }
    } catch (error: any) {
      console.error('加载统计数据异常:', error)
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <span>减碳分析 V2</span>
            <Tag color="blue">基于年限增长系数模型</Tag>
          </Space>
        }
        extra={
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="YYYY-MM-DD"
            />
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              刷新
            </Button>
            <Button onClick={() => navigate('/vegetarian-personnel-v2/comparison')}>
              新旧对比
            </Button>
          </Space>
        }
        loading={loading && !carbonEffect}
      >
        {/* V2版本说明 */}
        <Alert
          message="V2版本计算模型说明"
          description={
            <div>
              <p>V2版本采用基于年限增长系数的科学计算模型：</p>
              <ul style={{ marginBottom: 0 }}>
                <li>基础减碳量 × 素食类型系数 × 年限增长系数 × 素食天数</li>
                <li>素食年限越长，能量场变化越大，减碳效果越好（非线性增长）</li>
                <li>年限增长系数：1年以下(1.0) → 1-3年(1.2) → 3-5年(1.5) → 5-10年(2.0) → 10年以上(2.5)</li>
              </ul>
            </div>
          }
          type="info"
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 24 }}
        />

        {carbonEffect && (
          <>
            {/* 减碳效应分析 */}
            <Card title="减碳效应分析" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="员工减碳总量"
                      value={carbonEffect.staffCarbonEffect.totalReduction}
                      suffix="kg CO₂e"
                      valueStyle={{ color: '#52c41a' }}
                      precision={2}
                    />
                    <div style={{ marginTop: 16, fontSize: 12 }}>
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="素食人数">{carbonEffect.staffCarbonEffect.count}</Descriptions.Item>
                        <Descriptions.Item label="基础减碳量">{carbonEffect.staffCarbonEffect.baseDailyReduction} kg/天/人</Descriptions.Item>
                        <Descriptions.Item label="类型系数">{carbonEffect.staffCarbonEffect.typeCoefficient}</Descriptions.Item>
                        <Descriptions.Item label="平均年限增长系数">{carbonEffect.staffCarbonEffect.yearsGrowthCoefficient.toFixed(2)}</Descriptions.Item>
                        <Descriptions.Item label="日均减碳量">{carbonEffect.staffCarbonEffect.dailyReduction.toFixed(2)} kg/天/人</Descriptions.Item>
                      </Descriptions>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      {carbonEffect.staffCarbonEffect.description}
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="客户减碳总量"
                      value={carbonEffect.customerCarbonEffect.totalReduction}
                      suffix="kg CO₂e"
                      valueStyle={{ color: '#fa8c16' }}
                      precision={2}
                    />
                    <div style={{ marginTop: 16, fontSize: 12 }}>
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="素食人数">{carbonEffect.customerCarbonEffect.count}</Descriptions.Item>
                        <Descriptions.Item label="基础减碳量">{carbonEffect.customerCarbonEffect.baseDailyReduction} kg/天/人</Descriptions.Item>
                        <Descriptions.Item label="类型系数">{carbonEffect.customerCarbonEffect.typeCoefficient}</Descriptions.Item>
                        <Descriptions.Item label="平均年限增长系数">{carbonEffect.customerCarbonEffect.yearsGrowthCoefficient.toFixed(2)}</Descriptions.Item>
                        <Descriptions.Item label="频率系数">{carbonEffect.customerCarbonEffect.frequencyFactor.toFixed(2)}</Descriptions.Item>
                        <Descriptions.Item label="日均减碳量">{carbonEffect.customerCarbonEffect.dailyReduction.toFixed(2)} kg/天/人</Descriptions.Item>
                      </Descriptions>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      {carbonEffect.customerCarbonEffect.description}
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="总减碳量"
                      value={carbonEffect.totalCarbonEffect}
                      suffix="kg CO₂e"
                      valueStyle={{ color: '#cf1322', fontSize: 28 }}
                      precision={2}
                    />
                  </Card>
                </Col>
              </Row>
            </Card>

            {/* 等效对比 */}
            {carbonEffect.equivalentComparison && (
              <Card title="等效对比" style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="相当于种植树木"
                        value={carbonEffect.equivalentComparison.equivalentTrees}
                        suffix="棵"
                        valueStyle={{ color: '#52c41a' }}
                        precision={0}
                      />
                      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                        每棵树每年吸收约 18 kg CO₂
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="相当于节省电力"
                        value={carbonEffect.equivalentComparison.equivalentElectricity}
                        suffix="度"
                        valueStyle={{ color: '#1890ff' }}
                        precision={0}
                      />
                      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                        每度电约产生 0.5 kg CO₂
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="相当于减少汽车行驶"
                        value={carbonEffect.equivalentComparison.equivalentCarKm}
                        suffix="km"
                        valueStyle={{ color: '#722ed1' }}
                        precision={0}
                      />
                      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                        每km约产生 0.2 kg CO₂
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Card>
            )}

            {/* 年限增长效果分析 */}
            {carbonEffect.yearsGrowthAnalysis && (
              <Card title="年限增长效果分析" style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                  {Object.entries(carbonEffect.yearsGrowthAnalysis.yearGroups).map(([key, group]) => (
                    <Col span={24 / 5} key={key}>
                      <Card>
                        <Statistic
                          title={key}
                          value={group.count}
                          suffix="人"
                          valueStyle={{ color: '#1890ff' }}
                        />
                        {group.averageReduction !== undefined && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, color: '#666' }}>平均减碳量</div>
                            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
                              {group.averageReduction.toFixed(2)} kg
                            </div>
                          </div>
                        )}
                        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                          总减碳量: {group.totalReduction.toFixed(2)} kg
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <Divider />
                <div>
                  <h4>分析洞察：</h4>
                  <ul>
                    {carbonEffect.yearsGrowthAnalysis.insights.map((insight, index) => (
                      <li key={index}>{insight}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            {/* 分析报告 */}
            {carbonEffect.report && (
              <Card title="详细分析报告" style={{ marginBottom: 24 }}>
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
              </Card>
            )}

            {/* 快捷操作 */}
            <Card title="快捷操作">
              <Space>
                <Button onClick={() => navigate('/vegetarian-personnel/staff')}>
                  员工管理
                </Button>
                <Button onClick={() => navigate('/vegetarian-personnel/customers')}>
                  客户管理
                </Button>
                <Button onClick={() => navigate('/vegetarian-personnel/dashboard')}>
                  查看V1版本
                </Button>
              </Space>
            </Card>
          </>
        )}
      </Card>
    </div>
  )
}

export default DashboardV2Page

