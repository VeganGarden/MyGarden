/**
 * 一餐饭基准值详情页
 */
import { getMealSetBaselineDetail } from '@/services/meal-set-baseline'
import type { MealSetBaseline } from '@/types/meal-set-baseline'
import { BaselineStatus, EnergyType, Region } from '@/types/baseline'
import { MealTime, MealStructure, HasSoup, RestaurantType, ConsumptionScenario, ResearchStatus } from '@/types/meal-set-baseline'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  message,
  Divider
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const MealSetBaselineDetail: React.FC = () => {
  const { baselineId } = useParams<{ baselineId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [baseline, setBaseline] = useState<MealSetBaseline | null>(null)

  useEffect(() => {
    if (baselineId) {
      fetchDetail()
    }
  }, [baselineId])

  const fetchDetail = async () => {
    if (!baselineId) return
    
    setLoading(true)
    try {
      const result = await getMealSetBaselineDetail(baselineId)
      if (result.success && result.data) {
        setBaseline(result.data)
      } else {
        message.error(result.error || '获取详情失败')
        navigate('/carbon/meal-set-baselines')
      }
    } catch (error: any) {
      message.error(error.message || '获取详情失败')
      navigate('/carbon/meal-set-baselines')
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
    [Region.NORTH_CHINA]: '华北',
    [Region.NORTHEAST]: '东北',
    [Region.EAST_CHINA]: '华东',
    [Region.CENTRAL_CHINA]: '华中',
    [Region.NORTHWEST]: '西北',
    [Region.SOUTH_CHINA]: '华南',
    [Region.NATIONAL_AVERAGE]: '全国平均',
  }

  const mealTimeMap: Record<string, string> = {
    [MealTime.BREAKFAST]: '早餐',
    [MealTime.LUNCH]: '午餐',
    [MealTime.DINNER]: '晚餐',
  }

  const mealStructureMap: Record<string, string> = {
    [MealStructure.SIMPLE]: '简餐',
    [MealStructure.STANDARD]: '标准餐',
    [MealStructure.FULL]: '正餐',
    [MealStructure.BANQUET]: '宴席',
  }

  const hasSoupMap: Record<string, string> = {
    [HasSoup.WITH_SOUP]: '有汤',
    [HasSoup.WITHOUT_SOUP]: '无汤',
    [HasSoup.OPTIONAL]: '可选',
  }

  const restaurantTypeMap: Record<string, string> = {
    [RestaurantType.FAST_FOOD]: '快餐店',
    [RestaurantType.FORMAL]: '正餐厅',
    [RestaurantType.BUFFET]: '自助餐',
    [RestaurantType.HOTPOT]: '火锅店',
    [RestaurantType.OTHER]: '其他',
  }

  const consumptionScenarioMap: Record<string, string> = {
    [ConsumptionScenario.DINE_IN]: '堂食',
    [ConsumptionScenario.TAKEAWAY]: '外卖',
    [ConsumptionScenario.PACKAGED]: '打包',
  }

  const energyTypeMap: Record<string, string> = {
    [EnergyType.ELECTRIC]: '全电',
    [EnergyType.GAS]: '燃气',
    [EnergyType.MIXED]: '混合',
  }

  const statusMap: Record<string, { color: string; text: string }> = {
    [BaselineStatus.ACTIVE]: { color: 'green', text: '活跃' },
    [BaselineStatus.ARCHIVED]: { color: 'default', text: '已归档' },
    [BaselineStatus.DRAFT]: { color: 'orange', text: '草稿' },
  }

  const researchStatusMap: Record<string, { color: string; text: string }> = {
    [ResearchStatus.RESEARCHING]: { color: 'orange', text: '研究中' },
    [ResearchStatus.COMPLETED]: { color: 'blue', text: '已完成' },
    [ResearchStatus.VALIDATED]: { color: 'green', text: '已验证' },
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '-'
    try {
      return new Date(date).toLocaleString('zh-CN')
    } catch {
      return '-'
    }
  }

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 标题栏 */}
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/carbon/meal-set-baselines')}>
              返回列表
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/carbon/meal-set-baselines/${baselineId}/edit`)}
            >
              编辑
            </Button>
          </Space>

          {/* 基本信息 */}
          <Card title="基本信息" size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="基准值ID">
                {baseline.baselineId}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[baseline.status]?.color}>
                  {statusMap[baseline.status]?.text || baseline.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="餐次类型">
                {mealTimeMap[baseline.category.mealTime] || baseline.category.mealTime}
              </Descriptions.Item>
              <Descriptions.Item label="区域">
                {regionMap[baseline.category.region] || baseline.category.region}
              </Descriptions.Item>
              <Descriptions.Item label="用能方式">
                {energyTypeMap[baseline.category.energyType] || baseline.category.energyType}
              </Descriptions.Item>
              <Descriptions.Item label="一餐饭结构类型">
                {baseline.category.mealStructure 
                  ? mealStructureMap[baseline.category.mealStructure] || baseline.category.mealStructure
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="是否有汤">
                {baseline.category.hasSoup
                  ? hasSoupMap[baseline.category.hasSoup] || baseline.category.hasSoup
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="餐厅类型">
                {baseline.category.restaurantType
                  ? restaurantTypeMap[baseline.category.restaurantType] || baseline.category.restaurantType
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="消费场景">
                {baseline.category.consumptionScenario
                  ? consumptionScenarioMap[baseline.category.consumptionScenario] || baseline.category.consumptionScenario
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="城市">
                {baseline.category.city || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                {baseline.version || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="有效日期">
                {formatDate(baseline.effectiveDate)} ~ {formatDate(baseline.expiryDate)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 基准值数据 */}
          <Card title="基准值数据" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="基准值"
                  value={baseline.carbonFootprint?.value || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="不确定性"
                  value={baseline.carbonFootprint?.uncertainty || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="置信区间"
                  value={`${baseline.carbonFootprint?.confidenceInterval?.lower || 0} ~ ${baseline.carbonFootprint?.confidenceInterval?.upper || 0}`}
                  suffix="kg CO₂e"
                />
              </Col>
            </Row>
          </Card>

          {/* 分解数据 */}
          <Card title="分解数据" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="主菜"
                  value={baseline.breakdown?.mainDishes || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="主食"
                  value={baseline.breakdown?.stapleFood || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="汤类"
                  value={baseline.breakdown?.soup || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="甜点"
                  value={baseline.breakdown?.dessert || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="饮品"
                  value={baseline.breakdown?.beverage || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="配菜"
                  value={baseline.breakdown?.sideDishes || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="调料"
                  value={baseline.breakdown?.condiments || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="烹饪能耗"
                  value={baseline.breakdown?.cookingEnergy || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="包装"
                  value={baseline.breakdown?.packaging || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="运输"
                  value={baseline.breakdown?.transport || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="其他"
                  value={baseline.breakdown?.other || 0}
                  suffix="kg CO₂e"
                  precision={2}
                />
              </Col>
            </Row>
          </Card>

          {/* 典型结构 */}
          <Card title="典型结构" size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="主菜数量">
                {baseline.typicalStructure?.mainDishesCount || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="主食类型">
                {baseline.typicalStructure?.stapleFoodType || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="是否有汤">
                {baseline.typicalStructure?.hasSoup ? '是' : '否'}
              </Descriptions.Item>
              <Descriptions.Item label="是否有甜点">
                {baseline.typicalStructure?.hasDessert ? '是' : '否'}
              </Descriptions.Item>
              <Descriptions.Item label="总菜品数量">
                {baseline.typicalStructure?.totalItems || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="结构描述" span={2}>
                {baseline.typicalStructure?.description || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 使用信息 */}
          <Card title="使用信息" size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="是否用于计算">
                <Tag color={baseline.usage?.isForCalculation ? 'green' : 'default'}>
                  {baseline.usage?.isForCalculation ? '是' : '否'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="研究状态">
                <Tag color={researchStatusMap[baseline.usage?.researchStatus]?.color}>
                  {researchStatusMap[baseline.usage?.researchStatus]?.text || baseline.usage?.researchStatus || '-'}
                </Tag>
              </Descriptions.Item>
              {baseline.usage?.enabledAt && (
                <Descriptions.Item label="启用时间">
                  {formatDate(baseline.usage.enabledAt)}
                </Descriptions.Item>
              )}
              {baseline.usage?.enabledBy && (
                <Descriptions.Item label="启用人">
                  {baseline.usage.enabledBy}
                </Descriptions.Item>
              )}
              {baseline.usage?.observationPeriod && (
                <>
                  <Descriptions.Item label="观察期开始">
                    {formatDate(baseline.usage.observationPeriod.startDate)}
                  </Descriptions.Item>
                  <Descriptions.Item label="观察期结束">
                    {baseline.usage.observationPeriod.endDate 
                      ? formatDate(baseline.usage.observationPeriod.endDate)
                      : '进行中'}
                  </Descriptions.Item>
                  {baseline.usage.observationPeriod.notes && (
                    <Descriptions.Item label="观察期说明" span={2}>
                      {baseline.usage.observationPeriod.notes}
                    </Descriptions.Item>
                  )}
                </>
              )}
              <Descriptions.Item label="使用说明" span={2}>
                {baseline.usage?.notes || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="使用次数">
                {baseline.usageCount || 0}
              </Descriptions.Item>
              <Descriptions.Item label="最后使用时间">
                {baseline.lastUsedAt ? formatDate(baseline.lastUsedAt) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 数据来源 */}
          <Card title="数据来源" size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="来源类型">
                {baseline.source?.type || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="机构名称">
                {baseline.source?.organization || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="报告名称" span={2}>
                {baseline.source?.report || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="年份">
                {baseline.source?.year || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="计算方法" span={2}>
                {baseline.source?.methodology || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 元数据 */}
          <Card title="元数据" size="small">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="创建时间">
                {formatDate(baseline.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {formatDate(baseline.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">
                {baseline.createdBy || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="更新人">
                {baseline.updatedBy || '-'}
              </Descriptions.Item>
              {baseline.notes && (
                <Descriptions.Item label="备注" span={2}>
                  {baseline.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Space>
      </Card>
    </div>
  )
}

export default MealSetBaselineDetail

