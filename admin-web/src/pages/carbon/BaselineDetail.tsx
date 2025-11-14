/**
 * 基准值详情页
 */
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  message,
  Spin,
  Timeline,
  Statistic,
  Row,
  Col,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { baselineManageAPI } from '@/services/baseline'
import type { CarbonBaseline } from '@/types/baseline'
import { MealType, Region, EnergyType, BaselineStatus } from '@/types/baseline'

const BaselineDetail: React.FC = () => {
  const { baselineId } = useParams<{ baselineId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [baseline, setBaseline] = useState<CarbonBaseline | null>(null)

  useEffect(() => {
    if (baselineId) {
      fetchDetail()
    }
  }, [baselineId])

  const fetchDetail = async () => {
    if (!baselineId) return
    
    setLoading(true)
    try {
      const result = await baselineManageAPI.get(baselineId)
      if (result.success && result.data) {
        setBaseline(result.data)
      } else {
        message.error(result.error || '获取详情失败')
        navigate('/carbon/baseline')
      }
    } catch (error: any) {
      message.error(error.message || '获取详情失败')
      navigate('/carbon/baseline')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!baseline) {
    return null
  }

  const regionMap: Record<string, string> = {
    [Region.NORTH_CHINA]: '华北区域',
    [Region.NORTHEAST]: '东北区域',
    [Region.EAST_CHINA]: '华东区域',
    [Region.CENTRAL_CHINA]: '华中区域',
    [Region.NORTHWEST]: '西北区域',
    [Region.SOUTH_CHINA]: '南方区域',
    [Region.NATIONAL_AVERAGE]: '全国平均',
  }

  const mealTypeMap: Record<string, string> = {
    [MealType.MEAT_SIMPLE]: '肉食简餐',
    [MealType.MEAT_FULL]: '肉食正餐',
  }

  const energyTypeMap: Record<string, string> = {
    [EnergyType.ELECTRIC]: '全电厨房',
    [EnergyType.GAS]: '燃气厨房',
    [EnergyType.MIXED]: '混合用能',
  }

  const statusMap: Record<string, { color: string; text: string }> = {
    [BaselineStatus.ACTIVE]: { color: 'success', text: '活跃' },
    [BaselineStatus.ARCHIVED]: { color: 'default', text: '已归档' },
    [BaselineStatus.DRAFT]: { color: 'warning', text: '草稿' },
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/carbon/baseline')}
            >
              返回列表
            </Button>
            <span>基准值详情</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/carbon/baseline/${baselineId}/edit`)}
              disabled={baseline.status === BaselineStatus.ARCHIVED}
            >
              编辑
            </Button>
          </Space>
        }
      >
        {/* 基本信息 */}
        <Card title="基本信息" style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="基准值ID">{baseline.baselineId}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[baseline.status]?.color}>
                {statusMap[baseline.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="地区">
              {regionMap[baseline.category.region] || baseline.category.region}
            </Descriptions.Item>
            <Descriptions.Item label="餐食类型">
              {mealTypeMap[baseline.category.mealType] || baseline.category.mealType}
            </Descriptions.Item>
            <Descriptions.Item label="用能方式">
              {energyTypeMap[baseline.category.energyType] || baseline.category.energyType}
            </Descriptions.Item>
            {baseline.category.city && (
              <Descriptions.Item label="城市">{baseline.category.city}</Descriptions.Item>
            )}
            {baseline.category.restaurantType && (
              <Descriptions.Item label="餐厅类型">
                {baseline.category.restaurantType}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 基准值数据 */}
        <Card title="基准值数据" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="基准值"
                value={baseline.carbonFootprint.value}
                suffix="kg CO₂e"
                precision={1}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="不确定性"
                value={baseline.carbonFootprint.uncertainty}
                suffix="kg CO₂e"
                precision={1}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="置信区间下限"
                value={baseline.carbonFootprint.confidenceInterval.lower}
                suffix="kg CO₂e"
                precision={1}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="置信区间上限"
                value={baseline.carbonFootprint.confidenceInterval.upper}
                suffix="kg CO₂e"
                precision={1}
              />
            </Col>
          </Row>

          <div style={{ marginTop: 24 }}>
            <h4>分解数据</h4>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="食材"
                  value={baseline.breakdown.ingredients}
                  suffix="kg CO₂e"
                  precision={1}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="烹饪能耗"
                  value={baseline.breakdown.cookingEnergy}
                  suffix="kg CO₂e"
                  precision={1}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="包装"
                  value={baseline.breakdown.packaging}
                  suffix="kg CO₂e"
                  precision={1}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="其他"
                  value={baseline.breakdown.other}
                  suffix="kg CO₂e"
                  precision={1}
                />
              </Col>
            </Row>
          </div>
        </Card>

        {/* 数据来源 */}
        <Card title="数据来源" style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="来源类型">{baseline.source.type}</Descriptions.Item>
            <Descriptions.Item label="机构名称">{baseline.source.organization}</Descriptions.Item>
            <Descriptions.Item label="报告名称" span={2}>
              {baseline.source.report}
            </Descriptions.Item>
            <Descriptions.Item label="年份">{baseline.source.year}</Descriptions.Item>
            <Descriptions.Item label="计算方法" span={2}>
              {baseline.source.methodology}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 版本信息 */}
        <Card title="版本信息" style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="版本号">{baseline.version}</Descriptions.Item>
            <Descriptions.Item label="使用次数">{baseline.usageCount || 0}</Descriptions.Item>
            <Descriptions.Item label="有效日期">
              {new Date(baseline.effectiveDate).toLocaleDateString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="失效日期">
              {new Date(baseline.expiryDate).toLocaleDateString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {baseline.createdAt
                ? new Date(baseline.createdAt).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {baseline.updatedAt
                ? new Date(baseline.updatedAt).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            {baseline.createdBy && (
              <Descriptions.Item label="创建人">{baseline.createdBy}</Descriptions.Item>
            )}
            {baseline.updatedBy && (
              <Descriptions.Item label="更新人">{baseline.updatedBy}</Descriptions.Item>
            )}
            {baseline.lastUsedAt && (
              <Descriptions.Item label="最后使用时间" span={2}>
                {new Date(baseline.lastUsedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 备注 */}
        {baseline.notes && (
          <Card title="备注">
            <p>{baseline.notes}</p>
          </Card>
        )}
      </Card>
    </div>
  )
}

export default BaselineDetail

