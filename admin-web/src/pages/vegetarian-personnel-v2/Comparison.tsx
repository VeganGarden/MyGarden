/**
 * 新旧计算对比页面
 * 并排展示V1和V2版本的计算结果
 */

import { vegetarianPersonnelAPI } from '@/services/vegetarianPersonnel'
import { vegetarianPersonnelV2API } from '@/services/vegetarianPersonnelV2'
import { useAppSelector } from '@/store/hooks'
import type { CarbonEffectAnalysis } from '@/types/vegetarianPersonnel'
import type { CarbonEffectAnalysisV2 } from '@/types/vegetarianPersonnelV2'
import { ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table, Tag, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { RangePicker } = DatePicker

const ComparisonPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [v1Data, setV1Data] = useState<CarbonEffectAnalysis | null>(null)
  const [v2Data, setV2Data] = useState<CarbonEffectAnalysisV2 | null>(null)
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

      // 并行加载V1和V2数据
      const [v1Result, v2Result] = await Promise.all([
        vegetarianPersonnelAPI.stats.getCarbonEffectAnalysis(
          params.tenantId,
          params.restaurantId,
          params.startDate,
          params.endDate
        ),
        vegetarianPersonnelV2API.getCarbonEffectAnalysisV2(
          params.tenantId,
          params.restaurantId,
          params.startDate,
          params.endDate
        )
      ])

      if (v1Result.success && v1Result.data) {
        setV1Data(v1Result.data)
      }

      if (v2Result.success && v2Result.data) {
        setV2Data(v2Result.data)
      }

      if (!v1Result.success && !v2Result.success) {
        message.error('获取数据失败')
      }
    } catch (error: any) {
      console.error('加载对比数据异常:', error)
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  // 计算差异
  const calculateDifference = (v1: number, v2: number) => {
    const diff = v2 - v1
    const percentage = v1 !== 0 ? ((diff / v1) * 100) : 0
    return { diff, percentage }
  }

  // 对比表格数据
  const comparisonTableData = [
    {
      key: 'total',
      metric: '总减碳量',
      v1: v1Data?.totalCarbonEffect || 0,
      v2: v2Data?.totalCarbonEffect || 0,
      diff: v1Data && v2Data ? calculateDifference(v1Data.totalCarbonEffect, v2Data.totalCarbonEffect) : { diff: 0, percentage: 0 }
    },
    {
      key: 'staff',
      metric: '员工减碳量',
      v1: v1Data?.staffCarbonEffect?.totalReduction || 0,
      v2: v2Data?.staffCarbonEffect?.totalReduction || 0,
      diff: v1Data && v2Data ? calculateDifference(
        v1Data.staffCarbonEffect?.totalReduction || 0,
        v2Data.staffCarbonEffect.totalReduction
      ) : { diff: 0, percentage: 0 }
    },
    {
      key: 'customer',
      metric: '客户减碳量',
      v1: v1Data?.customerCarbonEffect?.totalReduction || 0,
      v2: v2Data?.customerCarbonEffect?.totalReduction || 0,
      diff: v1Data && v2Data ? calculateDifference(
        v1Data.customerCarbonEffect?.totalReduction || 0,
        v2Data.customerCarbonEffect.totalReduction
      ) : { diff: 0, percentage: 0 }
    }
  ]

  const comparisonColumns = [
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric',
      width: 150
    },
    {
      title: 'V1版本（原始模型）',
      dataIndex: 'v1',
      key: 'v1',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`
    },
    {
      title: 'V2版本（年限增长模型）',
      dataIndex: 'v2',
      key: 'v2',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`
    },
    {
      title: '差异',
      key: 'diff',
      render: (_: any, record: any) => {
        const { diff, percentage } = record.diff
        const color = diff > 0 ? 'green' : diff < 0 ? 'red' : 'default'
        return (
          <Space>
            <Tag color={color}>
              {diff > 0 ? '+' : ''}{diff.toFixed(2)} kg CO₂e
            </Tag>
            <Tag color={color}>
              {percentage > 0 ? '+' : ''}{percentage.toFixed(2)}%
            </Tag>
          </Space>
        )
      }
    }
  ]

  return (
    <div>
      <Card
        title="新旧计算对比"
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
            <Button onClick={() => navigate('/vegetarian-personnel-v2/dashboard')}>
              返回V2看板
            </Button>
          </Space>
        }
        loading={loading && !v1Data && !v2Data}
      >
        {/* 对比说明 */}
        <Card style={{ marginBottom: 24 }} type="inner">
          <Row gutter={16}>
            <Col span={12}>
              <Card title={<Tag color="default">V1版本（原始模型）</Tag>} size="small">
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>固定值：2.0 kg CO₂e/天/人</li>
                  <li>线性计算：天数 × 固定值</li>
                  <li>客户使用50%系数</li>
                  <li>不考虑年限增长效应</li>
                </ul>
              </Card>
            </Col>
            <Col span={12}>
              <Card title={<Tag color="blue">V2版本（年限增长模型）</Tag>} size="small">
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  <li>基础值 × 类型系数 × 年限增长系数</li>
                  <li>非线性增长：年限越长，系数越大</li>
                  <li>客户按类型系数计算</li>
                  <li>考虑年限增长效应（1.0 → 2.5倍）</li>
                </ul>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 并排对比卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title={<Tag color="default">V1版本计算结果</Tag>}>
              {v1Data ? (
                <>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="员工减碳量"
                        value={v1Data.staffCarbonEffect?.totalReduction || 0}
                        suffix="kg CO₂e"
                        valueStyle={{ color: '#52c41a' }}
                        precision={2}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="客户减碳量"
                        value={v1Data.customerCarbonEffect?.totalReduction || 0}
                        suffix="kg CO₂e"
                        valueStyle={{ color: '#fa8c16' }}
                        precision={2}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="总减碳量"
                        value={v1Data.totalCarbonEffect || 0}
                        suffix="kg CO₂e"
                        valueStyle={{ color: '#cf1322' }}
                        precision={2}
                      />
                    </Col>
                  </Row>
                </>
              ) : (
                <div>暂无数据</div>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title={<Tag color="blue">V2版本计算结果</Tag>}>
              {v2Data ? (
                <>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="员工减碳量"
                        value={v2Data.staffCarbonEffect.totalReduction}
                        suffix="kg CO₂e"
                        valueStyle={{ color: '#52c41a' }}
                        precision={2}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="客户减碳量"
                        value={v2Data.customerCarbonEffect.totalReduction}
                        suffix="kg CO₂e"
                        valueStyle={{ color: '#fa8c16' }}
                        precision={2}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="总减碳量"
                        value={v2Data.totalCarbonEffect}
                        suffix="kg CO₂e"
                        valueStyle={{ color: '#cf1322' }}
                        precision={2}
                      />
                    </Col>
                  </Row>
                  {v2Data.staffCarbonEffect.yearsGrowthCoefficient > 1 && (
                    <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                      <div>员工平均年限增长系数: {v2Data.staffCarbonEffect.yearsGrowthCoefficient.toFixed(2)}</div>
                      <div>客户平均年限增长系数: {v2Data.customerCarbonEffect.yearsGrowthCoefficient.toFixed(2)}</div>
                    </div>
                  )}
                </>
              ) : (
                <div>暂无数据</div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 对比表格 */}
        <Card title="详细对比表">
          <Table
            columns={comparisonColumns}
            dataSource={comparisonTableData}
            pagination={false}
            size="small"
          />
        </Card>

        {/* 分析说明 */}
        {v1Data && v2Data && (
          <Card title="对比分析" style={{ marginTop: 24 }}>
            <div>
              <h4>主要差异说明：</h4>
              <ul>
                <li>
                  <strong>计算模型差异：</strong>
                  V1使用固定值，V2使用可配置的基础值和系数
                </li>
                <li>
                  <strong>年限影响：</strong>
                  V1不考虑年限，V2考虑年限增长系数（1.0-2.5倍）
                </li>
                <li>
                  <strong>客户计算：</strong>
                  V1使用50%固定系数，V2按素食类型系数计算
                </li>
                <li>
                  <strong>适用场景：</strong>
                  V2模型更适合评估长期素食者的累积减碳效果
                </li>
              </ul>
            </div>
          </Card>
        )}
      </Card>
    </div>
  )
}

export default ComparisonPage

