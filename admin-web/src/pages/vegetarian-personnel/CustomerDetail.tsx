/**
 * 客户详情页面
 */

import { customerAPI } from '@/services/vegetarianPersonnel'
import { useAppSelector } from '@/store/hooks'
import type { Customer } from '@/types/vegetarianPersonnel'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Space, Tag, Timeline, message } from 'antd'
import { useTranslation } from 'react-i18next'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const CustomerDetailPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    if (id && currentRestaurantId) {
      loadData()
    }
  }, [id, currentRestaurantId])

  const loadData = async () => {
    if (!id || !currentRestaurantId) {
      message.warning(t('pages.vegetarianPersonnel.customerDetail.messages.noRestaurant'))
      return
    }
    setLoading(true)
    try {
      const result = await customerAPI.get(id, currentRestaurantId)
      if (result.success && result.data) {
        setCustomer(result.data)
      } else {
        message.error(result.error || t('pages.vegetarianPersonnel.customerDetail.messages.loadFailed'))
        navigate('/vegetarian-personnel/customers')
      }
    } catch (error: any) {
      message.error(error.message || t('pages.vegetarianPersonnel.customerDetail.messages.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const getVegetarianTypeLabel = (type: string) => {
    const typeKey = `pages.vegetarianPersonnel.customerDetail.vegetarianTypes.${type}`
    const translated = t(typeKey)
    return translated !== typeKey ? translated : type
  }

  const getVegetarianYearsLabel = (years: string) => {
    const yearsKey = `pages.vegetarianPersonnel.customerDetail.vegetarianYears.${years}`
    const translated = t(yearsKey)
    return translated !== yearsKey ? translated : years
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-'
    if (typeof date === 'string') {
      return date.split('T')[0]
    }
    return date.toISOString().split('T')[0]
  }

  if (!customer) {
    return null
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vegetarian-personnel/customers')}>
              {t('pages.vegetarianPersonnel.customerDetail.buttons.back')}
            </Button>
            <span>{t('pages.vegetarianPersonnel.customerDetail.title')}</span>
          </Space>
        }
        loading={loading}
      >
        <Descriptions title={t('pages.vegetarianPersonnel.customerDetail.sections.basicInfo')} bordered column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.customerId')}>{customer.customerId}</Descriptions.Item>
          <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.userId')}>{customer.userId || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.nickname')}>{customer.basicInfo?.nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.phone')}>{customer.basicInfo?.phone || '-'}</Descriptions.Item>
        </Descriptions>

        <Card title={t('pages.vegetarianPersonnel.customerDetail.sections.vegetarianInfo')} style={{ marginBottom: 24 }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.isVegetarian')}>
              <Tag color={customer.vegetarianInfo?.isVegetarian ? 'green' : 'default'}>
                {customer.vegetarianInfo?.isVegetarian ? t('pages.vegetarianPersonnel.customerDetail.yes') : t('pages.vegetarianPersonnel.customerDetail.no')}
              </Tag>
            </Descriptions.Item>
            {customer.vegetarianInfo?.isVegetarian && (
              <>
                <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.vegetarianType')}>
                  {customer.vegetarianInfo?.vegetarianType
                    ? getVegetarianTypeLabel(customer.vegetarianInfo.vegetarianType)
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.vegetarianYears')}>
                  {customer.vegetarianInfo?.vegetarianYears
                    ? getVegetarianYearsLabel(customer.vegetarianInfo.vegetarianYears)
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.vegetarianStartYear')}>
                  {customer.vegetarianInfo?.vegetarianStartYear || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.firstRecordDate')}>
                  {formatDate(customer.vegetarianInfo?.firstRecordDate)}
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.lastUpdateDate')}>
                  {formatDate(customer.vegetarianInfo?.lastUpdateDate)}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>

        <Card title={t('pages.vegetarianPersonnel.customerDetail.sections.consumptionStats')} style={{ marginBottom: 24 }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.totalOrders')}>
              {customer.consumptionStats?.totalOrders || 0}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.totalAmount')}>
              {t('pages.vegetarianPersonnel.customerDetail.currency')}{(customer.consumptionStats?.totalAmount || 0).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.averageOrderAmount')}>
              {t('pages.vegetarianPersonnel.customerDetail.currency')}{(customer.consumptionStats?.averageOrderAmount || 0).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.firstOrderDate')}>
              {formatDate(customer.consumptionStats?.firstOrderDate)}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.vegetarianPersonnel.customerDetail.fields.lastOrderDate')}>
              {formatDate(customer.consumptionStats?.lastOrderDate)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {customer.history && customer.history.length > 0 && (
          <Card title={t('pages.vegetarianPersonnel.customerDetail.sections.history')}>
            <Timeline>
              {customer.history.map((item, index) => (
                <Timeline.Item key={index}>
                  <div>
                    <div>
                      <strong>{t('pages.vegetarianPersonnel.customerDetail.fields.updatedAt')}：</strong>
                      {formatDate(item.updatedAt)}
                    </div>
                    <div>
                      <strong>{t('pages.vegetarianPersonnel.customerDetail.fields.updatedBy')}：</strong>
                      {item.updatedBy}
                    </div>
                    {item.vegetarianInfo && (
                      <div style={{ marginTop: 8 }}>
                        <Tag color={item.vegetarianInfo.isVegetarian ? 'green' : 'default'}>
                          {item.vegetarianInfo.isVegetarian ? t('pages.vegetarianPersonnel.customerDetail.tags.vegetarian') : t('pages.vegetarianPersonnel.customerDetail.tags.nonVegetarian')}
                        </Tag>
                        {item.vegetarianInfo.vegetarianType && (
                          <Tag>{getVegetarianTypeLabel(item.vegetarianInfo.vegetarianType)}</Tag>
                        )}
                      </div>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        )}
      </Card>
    </div>
  )
}

export default CustomerDetailPage

