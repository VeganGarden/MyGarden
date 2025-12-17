/**
 * 供应商详情页
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { Card, Descriptions, Tag, Button, Space, Tabs, Table, message, Modal, Popconfirm } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAppSelector } from '@/store/hooks'
import { supplierAPI } from '@/services/traceability'
import type { Supplier } from '@/types/traceability'
import { SupplierType, SupplierAuditStatus, RiskLevel, CooperationStatus } from '@/types/traceability'

const SupplierDetailPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  
  // 从Redux获取租户和餐厅信息
  const { currentTenant, restaurants } = useAppSelector((state: any) => state.tenant)
  const { user } = useAppSelector((state: any) => state.auth)
  
  // 判断是否为餐厅管理员（可以编辑餐厅关联）
  const isRestaurantAdmin = user?.role === 'restaurant_admin'

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const tenantId = currentTenant?.id || user?.tenantId || 'default'
      const result = await supplierAPI.get(id, tenantId)
      if (result.success && result.data) {
        setSupplier(result.data)
      } else {
        message.error(result.error || t('pages.traceability.supplierDetail.messages.loadFailed'))
        navigate('/traceability/suppliers')
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  // 移除餐厅关联
  const handleRemoveRestaurant = async (restaurantId: string) => {
    if (!id || !supplier) return
    try {
      const result = await supplierAPI.removeRestaurant(id, supplier.tenantId, restaurantId)
      if (result.success) {
        message.success('移除餐厅关联成功')
        loadData() // 重新加载数据
      } else {
        message.error(result.error || '移除餐厅关联失败')
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    }
  }

  // 获取餐厅名称
  const getRestaurantName = (restaurantId: string) => {
    const restaurant = restaurants.find((r: any) => r.id === restaurantId)
    return restaurant?.name || restaurantId
  }

  if (!supplier) {
    return <div>{t('common.loading')}</div>
  }

  const typeMap: Record<SupplierType, string> = {
    [SupplierType.FARM]: t('pages.traceability.supplier.types.farm'),
    [SupplierType.PROCESSOR]: t('pages.traceability.supplier.types.processor'),
    [SupplierType.DISTRIBUTOR]: t('pages.traceability.supplier.types.distributor'),
    [SupplierType.OTHER]: t('pages.traceability.supplier.types.other')
  }

  const auditStatusMap: Record<SupplierAuditStatus, { text: string; color: string }> = {
    [SupplierAuditStatus.PENDING]: { text: t('pages.traceability.supplier.auditStatus.pending'), color: 'orange' },
    [SupplierAuditStatus.APPROVED]: { text: t('pages.traceability.supplier.auditStatus.approved'), color: 'green' },
    [SupplierAuditStatus.REJECTED]: { text: t('pages.traceability.supplier.auditStatus.rejected'), color: 'red' }
  }

  const riskLevelMap: Record<RiskLevel, { text: string; color: string }> = {
    [RiskLevel.LOW]: { text: t('pages.traceability.supplier.riskLevels.low'), color: 'green' },
    [RiskLevel.MEDIUM]: { text: t('pages.traceability.supplier.riskLevels.medium'), color: 'orange' },
    [RiskLevel.HIGH]: { text: t('pages.traceability.supplier.riskLevels.high'), color: 'red' }
  }

  const cooperationStatusMap: Record<CooperationStatus, { text: string; color: string }> = {
    [CooperationStatus.PENDING]: { text: t('pages.traceability.supplierDetail.cooperationStatus.pending'), color: 'default' },
    [CooperationStatus.ACTIVE]: { text: t('pages.traceability.supplierDetail.cooperationStatus.active'), color: 'green' },
    [CooperationStatus.SUSPENDED]: { text: t('pages.traceability.supplierDetail.cooperationStatus.suspended'), color: 'orange' },
    [CooperationStatus.TERMINATED]: { text: t('pages.traceability.supplierDetail.cooperationStatus.terminated'), color: 'red' }
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

  const tabItems = [
    {
      key: 'basic',
      label: t('pages.traceability.supplierDetail.tabs.basic'),
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.supplierId')}>{supplier.supplierId}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.name')}>{supplier.name}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.type')}>{typeMap[supplier.type]}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.legalName')}>{supplier.legalName || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.registrationNumber')}>{supplier.registrationNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.riskLevel')}>
            <Tag color={riskLevelMap[supplier.businessInfo.riskLevel].color}>
              {riskLevelMap[supplier.businessInfo.riskLevel].text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.auditStatus')}>
            <Tag color={auditStatusMap[supplier.audit.status].color}>
              {auditStatusMap[supplier.audit.status].text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.cooperationStatus')}>
            <Tag color={cooperationStatusMap[supplier.cooperation.status].color}>
              {cooperationStatusMap[supplier.cooperation.status].text}
            </Tag>
          </Descriptions.Item>
          {supplier.contact?.phone && (
            <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.phone')}>{supplier.contact.phone}</Descriptions.Item>
          )}
          {supplier.contact?.email && (
            <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.email')}>{supplier.contact.email}</Descriptions.Item>
          )}
          {supplier.contact?.address && (
            <Descriptions.Item label={t('pages.traceability.supplierDetail.fields.address')} span={2}>
              {[
                supplier.contact.address.province,
                supplier.contact.address.city,
                supplier.contact.address.district,
                supplier.contact.address.detail
              ].filter(Boolean).join(' ')}
            </Descriptions.Item>
          )}
        </Descriptions>
      )
    },
    {
      key: 'certifications',
      label: t('pages.traceability.supplierDetail.tabs.certifications'),
      children: (
        <Table
          columns={[
            { title: t('pages.traceability.supplierDetail.certifications.columns.type'), dataIndex: 'type' },
            { title: t('pages.traceability.supplierDetail.certifications.columns.name'), dataIndex: 'name' },
            { title: t('pages.traceability.supplierDetail.certifications.columns.certificateNumber'), dataIndex: 'certificateNumber' },
            { title: t('pages.traceability.supplierDetail.certifications.columns.issuer'), dataIndex: 'issuer' },
            { title: t('pages.traceability.supplierDetail.certifications.columns.issueDate'), dataIndex: 'issueDate', render: (date) => date ? formatDate(date) : '-' },
            { title: t('pages.traceability.supplierDetail.certifications.columns.expiryDate'), dataIndex: 'expiryDate', render: (date) => date ? formatDate(date) : '-' },
            {
              title: t('pages.traceability.supplierDetail.certifications.columns.status'),
              dataIndex: 'status',
              render: (status: string) => {
                const colorMap: Record<string, string> = {
                  valid: 'green',
                  expired: 'orange',
                  revoked: 'red'
                }
                const textMap: Record<string, string> = {
                  valid: t('pages.traceability.supplierDetail.certifications.status.valid'),
                  expired: t('pages.traceability.supplierDetail.certifications.status.expired'),
                  revoked: t('pages.traceability.supplierDetail.certifications.status.revoked')
                }
                return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
              }
            }
          ]}
          dataSource={supplier.certifications || []}
          rowKey="certificateNumber"
          pagination={false}
        />
      )
    },
    {
      key: 'cooperation',
      label: t('pages.traceability.supplierDetail.tabs.cooperation'),
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.cooperation.fields.startDate')}>
            {supplier.cooperation.startDate ? formatDate(supplier.cooperation.startDate) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.cooperation.fields.lastOrderDate')}>
            {supplier.cooperation.lastOrderDate ? formatDate(supplier.cooperation.lastOrderDate) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.cooperation.fields.totalOrders')}>{supplier.cooperation.totalOrders}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.cooperation.fields.totalAmount')}>{supplier.cooperation.totalAmount.toFixed(2)} {t('common.yuan')}</Descriptions.Item>
        </Descriptions>
      )
    },
    {
      key: 'restaurants',
      label: '合作餐厅',
      children: (
        <Table
          columns={[
            {
              title: '餐厅名称',
              dataIndex: 'restaurantId',
              key: 'restaurantId',
              render: (restaurantId: string) => getRestaurantName(restaurantId)
            },
            {
              title: '操作',
              key: 'action',
              width: 120,
              render: (_: any, record: { restaurantId: string }) => (
                isRestaurantAdmin ? (
                  <Popconfirm
                    title="确定要移除该餐厅关联吗？"
                    onConfirm={() => handleRemoveRestaurant(record.restaurantId)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    >
                      移除
                    </Button>
                  </Popconfirm>
                ) : (
                  <span style={{ color: '#999' }}>仅查看</span>
                )
              )
            }
          ]}
          dataSource={supplier.cooperation?.restaurantIds?.map((restaurantId) => ({
            key: restaurantId,
            restaurantId
          })) || []}
          pagination={false}
          locale={{
            emptyText: '暂无合作餐厅'
          }}
        />
      )
    },
    {
      key: 'audit',
      label: t('pages.traceability.supplierDetail.tabs.audit'),
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.audit.fields.submittedAt')}>
            {formatDateTime(supplier.audit.submittedAt)}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.audit.fields.reviewedAt')}>
            {supplier.audit.reviewedAt ? formatDateTime(supplier.audit.reviewedAt) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.audit.fields.reviewedBy')}>{supplier.audit.reviewedBy || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.supplierDetail.audit.fields.version')}>{supplier.audit.version}</Descriptions.Item>
          {supplier.audit.reviewComments && (
            <Descriptions.Item label={t('pages.traceability.supplierDetail.audit.fields.reviewComments')} span={2}>{supplier.audit.reviewComments}</Descriptions.Item>
          )}
        </Descriptions>
      )
    }
  ]

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/suppliers')}>
            {t('common.back')}
          </Button>
          <span>{t('pages.traceability.supplierDetail.title')}</span>
        </Space>
      }
      extra={
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/traceability/suppliers/${id}/edit`)}>
          {t('common.edit')}
        </Button>
      }
      loading={loading}
    >
      <Tabs items={tabItems} />
    </Card>
  )
}

export default SupplierDetailPage

