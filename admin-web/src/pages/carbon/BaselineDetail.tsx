/**
 * 基准值详情页
 */
import i18n from '@/i18n'
import { baselineManageAPI } from '@/services/baseline'
import type { CarbonBaseline } from '@/types/baseline'
import { BaselineStatus, EnergyType, MealType, Region } from '@/types/baseline'
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
  message
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

const BaselineDetail: React.FC = () => {
  const { t } = useTranslation()
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
        message.error(result.error || t('pages.carbon.baselineDetail.messages.getDetailFailed'))
        navigate('/carbon/baseline')
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.baselineDetail.messages.getDetailFailed'))
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
    [Region.NORTH_CHINA]: t('pages.carbon.baselineList.regions.northChina'),
    [Region.NORTHEAST]: t('pages.carbon.baselineList.regions.northeast'),
    [Region.EAST_CHINA]: t('pages.carbon.baselineList.regions.eastChina'),
    [Region.CENTRAL_CHINA]: t('pages.carbon.baselineList.regions.centralChina'),
    [Region.NORTHWEST]: t('pages.carbon.baselineList.regions.northwest'),
    [Region.SOUTH_CHINA]: t('pages.carbon.baselineList.regions.southChina'),
    [Region.NATIONAL_AVERAGE]: t('pages.carbon.baselineList.regions.nationalAverage'),
  }

  const mealTypeMap: Record<string, string> = {
    [MealType.MEAT_SIMPLE]: t('pages.carbon.baselineList.mealTypes.meatSimple'),
    [MealType.MEAT_FULL]: t('pages.carbon.baselineList.mealTypes.meatFull'),
  }

  const energyTypeMap: Record<string, string> = {
    [EnergyType.ELECTRIC]: t('pages.carbon.baselineList.energyTypes.electric'),
    [EnergyType.GAS]: t('pages.carbon.baselineList.energyTypes.gas'),
    [EnergyType.MIXED]: t('pages.carbon.baselineList.energyTypes.mixed'),
  }

  const statusMap: Record<string, { color: string; text: string }> = {
    [BaselineStatus.ACTIVE]: { color: 'success', text: t('pages.carbon.baselineList.status.active') },
    [BaselineStatus.ARCHIVED]: { color: 'default', text: t('pages.carbon.baselineList.status.archived') },
    [BaselineStatus.DRAFT]: { color: 'warning', text: t('pages.carbon.baselineList.status.draft') },
  }

  // 根据当前语言格式化日期
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'
    return dateObj.toLocaleDateString(locale)
  }

  const formatDateTime = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'
    return dateObj.toLocaleString(locale)
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
              {t('pages.carbon.baselineDetail.buttons.back')}
            </Button>
            <span>{t('pages.carbon.baselineDetail.title')}</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/carbon/baseline/${baselineId}/edit`)}
              disabled={baseline.status === BaselineStatus.ARCHIVED}
            >
              {t('pages.carbon.baselineDetail.buttons.edit')}
            </Button>
          </Space>
        }
      >
        {/* 基本信息 */}
        <Card title={t('pages.carbon.baselineDetail.sections.basicInfo')} style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.baselineId')}>{baseline.baselineId}</Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.status')}>
              <Tag color={statusMap[baseline.status]?.color}>
                {statusMap[baseline.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.region')}>
              {regionMap[baseline.category.region] || baseline.category.region}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.mealType')}>
              {mealTypeMap[baseline.category.mealType] || baseline.category.mealType}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.energyType')}>
              {energyTypeMap[baseline.category.energyType] || baseline.category.energyType}
            </Descriptions.Item>
            {baseline.category.city && (
              <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.city')}>{baseline.category.city}</Descriptions.Item>
            )}
            {baseline.category.restaurantType && (
              <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.restaurantType')}>
                {baseline.category.restaurantType}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 基准值数据 */}
        <Card title={t('pages.carbon.baselineDetail.sections.baselineData')} style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title={t('pages.carbon.baselineDetail.fields.baselineValue')}
                value={baseline.carbonFootprint.value}
                suffix="kg CO₂e"
                precision={1}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('pages.carbon.baselineDetail.fields.uncertainty')}
                value={baseline.carbonFootprint.uncertainty}
                suffix="kg CO₂e"
                precision={1}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('pages.carbon.baselineDetail.fields.confidenceLower')}
                value={baseline.carbonFootprint.confidenceInterval.lower}
                suffix="kg CO₂e"
                precision={1}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('pages.carbon.baselineDetail.fields.confidenceUpper')}
                value={baseline.carbonFootprint.confidenceInterval.upper}
                suffix="kg CO₂e"
                precision={1}
              />
            </Col>
          </Row>

          <div style={{ marginTop: 24 }}>
            <h4>{t('pages.carbon.baselineDetail.fields.breakdown')}</h4>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={t('pages.carbon.baselineDetail.fields.ingredients')}
                  value={baseline.breakdown.ingredients}
                  suffix="kg CO₂e"
                  precision={1}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t('pages.carbon.baselineDetail.fields.cookingEnergy')}
                  value={baseline.breakdown.cookingEnergy}
                  suffix="kg CO₂e"
                  precision={1}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t('pages.carbon.baselineDetail.fields.packaging')}
                  value={baseline.breakdown.packaging}
                  suffix="kg CO₂e"
                  precision={1}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={t('pages.carbon.baselineDetail.fields.other')}
                  value={baseline.breakdown.other}
                  suffix="kg CO₂e"
                  precision={1}
                />
              </Col>
            </Row>
          </div>
        </Card>

        {/* 数据来源 */}
        <Card title={t('pages.carbon.baselineDetail.sections.source')} style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.sourceType')}>{baseline.source.type}</Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.organization')}>{baseline.source.organization}</Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.report')} span={2}>
              {baseline.source.report}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.year')}>{baseline.source.year}</Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.methodology')} span={2}>
              {baseline.source.methodology}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 版本信息 */}
        <Card title={t('pages.carbon.baselineDetail.sections.version')} style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.version')}>{baseline.version}</Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.usageCount')}>{baseline.usageCount || 0}</Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.effectiveDate')}>
              {formatDate(baseline.effectiveDate)}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.expiryDate')}>
              {formatDate(baseline.expiryDate)}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.createdAt')}>
              {baseline.createdAt
                ? formatDateTime(baseline.createdAt)
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.updatedAt')}>
              {baseline.updatedAt
                ? formatDateTime(baseline.updatedAt)
                : '-'}
            </Descriptions.Item>
            {baseline.createdBy && (
              <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.createdBy')}>{baseline.createdBy}</Descriptions.Item>
            )}
            {baseline.updatedBy && (
              <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.updatedBy')}>{baseline.updatedBy}</Descriptions.Item>
            )}
            {baseline.lastUsedAt && (
              <Descriptions.Item label={t('pages.carbon.baselineDetail.fields.lastUsedAt')} span={2}>
                {formatDateTime(baseline.lastUsedAt)}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 备注 */}
        {baseline.notes && (
          <Card title={t('pages.carbon.baselineDetail.sections.notes')}>
            <p>{baseline.notes}</p>
          </Card>
        )}
      </Card>
    </div>
  )
}

export default BaselineDetail

