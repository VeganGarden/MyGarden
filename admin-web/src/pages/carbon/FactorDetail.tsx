/**
 * 碳排放因子详情页
 */
import i18n from '@/i18n'
import { factorManageAPI } from '@/services/factor'
import type { CarbonEmissionFactor } from '@/types/factor'
import { getRegionDisplayName, normalizeRegion } from '@/utils/regionMapper'
import { FactorBoundary, FactorCategory, FactorSource, FactorStatus } from '@/types/factor'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Space,
  Spin,
  Tag,
  message
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

const FactorDetail: React.FC = () => {
  const { t } = useTranslation()
  const { factorId } = useParams<{ factorId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [factor, setFactor] = useState<CarbonEmissionFactor | null>(null)

  useEffect(() => {
    if (factorId) {
      fetchDetail()
    }
  }, [factorId])

  const fetchDetail = async () => {
    if (!factorId) return
    
    setLoading(true)
    try {
      const result = await factorManageAPI.get(factorId)
      if (result.success && result.data) {
        setFactor(result.data)
      } else {
        message.error(result.error || t('pages.carbon.factorDetail.messages.getDetailFailed'))
        navigate('/carbon/factor-library')
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.factorDetail.messages.getDetailFailed'))
      navigate('/carbon/factor-library')
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

  if (!factor) {
    return null
  }

  const categoryMap: Record<string, string> = {
    [FactorCategory.INGREDIENT]: t('pages.carbon.factorLibrary.categories.ingredient'),
    [FactorCategory.ENERGY]: t('pages.carbon.factorLibrary.categories.energy'),
    [FactorCategory.MATERIAL]: t('pages.carbon.factorLibrary.categories.material'),
    [FactorCategory.TRANSPORT]: t('pages.carbon.factorLibrary.categories.transport'),
  }

  const sourceMap: Record<string, string> = {
    [FactorSource.CLCD]: 'CLCD',
    [FactorSource.IPCC]: 'IPCC',
    [FactorSource.CPCD]: 'CPCD',
    [FactorSource.ECOINVENT]: 'Ecoinvent',
  }

  const boundaryMap: Record<string, string> = {
    [FactorBoundary.CRADLE_TO_GATE]: t('pages.carbon.factorForm.options.cradleToGate'),
    [FactorBoundary.CRADLE_TO_FARM]: t('pages.carbon.factorForm.options.cradleToFarm'),
  }

  const statusMap: Record<string, { color: string; text: string }> = {
    [FactorStatus.ACTIVE]: { color: 'success', text: t('pages.carbon.factorLibrary.status.active') },
    [FactorStatus.ARCHIVED]: { color: 'default', text: t('pages.carbon.factorLibrary.status.archived') },
    [FactorStatus.DRAFT]: { color: 'warning', text: t('pages.carbon.factorLibrary.status.draft') },
  }

  // 根据当前语言格式化日期
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
              onClick={() => navigate('/carbon/factor-library')}
            >
              {t('pages.carbon.factorDetail.buttons.back')}
            </Button>
            <span>{t('pages.carbon.factorDetail.title')}</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/carbon/factor-library/${factorId}/edit`)}
              disabled={factor.status === FactorStatus.ARCHIVED}
              style={{
                color: (factor.status === FactorStatus.PENDING || factor.factorValue === null || factor.factorValue === undefined) 
                  ? '#ff7a00' 
                  : undefined
              }}
            >
              {t('pages.carbon.factorDetail.buttons.edit')}
            </Button>
          </Space>
        }
      >
        {/* 基本信息 */}
        <Card title={t('pages.carbon.factorDetail.sections.basicInfo')} style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.factorId')}>
              <span style={{ 
                color: (factor.status === FactorStatus.PENDING || factor.factorValue === null || factor.factorValue === undefined) 
                  ? '#ff7a00' 
                  : 'inherit' 
              }}>
                {factor.factorId}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.name')}>
              {factor.name}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.category')}>
              {categoryMap[factor.category] || factor.category}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.subCategory')}>
              {factor.subCategory || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.status')}>
              <Tag color={statusMap[factor.status]?.color}>
                {statusMap[factor.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.alias')}>
              {factor.alias && factor.alias.length > 0 ? (
                <Space wrap>
                  {factor.alias.map((alias, index) => (
                    <Tag key={index}>{alias}</Tag>
                  ))}
                </Space>
              ) : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 因子数值 */}
        <Card title={t('pages.carbon.factorDetail.sections.factorValue')} style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.factorValue')}>
              <span style={{ 
                color: (factor.status === FactorStatus.PENDING || factor.factorValue === null || factor.factorValue === undefined) 
                  ? '#ff7a00' 
                  : 'inherit' 
              }}>
                {(factor.factorValue ?? 0).toFixed(2)} {factor.unit}
              </span>
            </Descriptions.Item>
            {factor.uncertainty !== undefined && (
              <Descriptions.Item label={t('pages.carbon.factorDetail.fields.uncertainty')}>
                ±{factor.uncertainty}%
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 适用范围与来源 */}
        <Card title={t('pages.carbon.factorDetail.sections.sourceRegion')} style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.region')}>
              {getRegionDisplayName(normalizeRegion(factor.region))}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.source')}>
              {sourceMap[factor.source] || factor.source}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.year')}>
              {factor.year}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.version')}>
              {factor.version}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.carbon.factorDetail.fields.boundary')}>
              {boundaryMap[factor.boundary] || factor.boundary}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 备注 */}
        {factor.notes && (
          <Card title={t('pages.carbon.factorDetail.sections.notes')} style={{ marginBottom: 16 }}>
            <p>{factor.notes}</p>
          </Card>
        )}

        {/* 审计信息 */}
        <Card title={t('pages.carbon.factorDetail.sections.audit')}>
          <Descriptions column={2} bordered>
            {factor.createdAt && (
              <Descriptions.Item label={t('common.createdAt')}>
                {formatDateTime(factor.createdAt)}
              </Descriptions.Item>
            )}
            {factor.updatedAt && (
              <Descriptions.Item label={t('common.updatedAt')}>
                {formatDateTime(factor.updatedAt)}
              </Descriptions.Item>
            )}
            {factor.createdBy && (
              <Descriptions.Item label={t('common.createdBy')}>
                {factor.createdBy}
              </Descriptions.Item>
            )}
            {factor.updatedBy && (
              <Descriptions.Item label={t('common.updatedBy')}>
                {factor.updatedBy}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </Card>
    </div>
  )
}

export default FactorDetail

