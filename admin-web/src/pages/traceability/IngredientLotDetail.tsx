/**
 * 食材批次详情页
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, Descriptions, Tag, Button, Space, Tabs, Table, message } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { ingredientLotAPI } from '@/services/traceability'
import type { IngredientLot } from '@/types/traceability'
import { InventoryStatus } from '@/types/traceability'
import dayjs from 'dayjs'

const IngredientLotDetailPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [lot, setLot] = useState<IngredientLot | null>(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await ingredientLotAPI.get(id, 'default')
      if (result.success && result.data) {
        setLot(result.data)
      } else {
        message.error(result.error || t('pages.traceability.ingredientLotDetail.messages.loadFailed'))
        navigate('/traceability/lots')
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  if (!lot) {
    return <div>{t('common.loading')}</div>
  }

  const statusMap: Record<InventoryStatus, { text: string; color: string }> = {
    [InventoryStatus.IN_STOCK]: { text: t('pages.traceability.ingredientLotList.status.inStock'), color: 'green' },
    [InventoryStatus.LOW_STOCK]: { text: t('pages.traceability.ingredientLotList.status.lowStock'), color: 'orange' },
    [InventoryStatus.OUT_OF_STOCK]: { text: t('pages.traceability.ingredientLotList.status.outOfStock'), color: 'red' },
    [InventoryStatus.EXPIRED]: { text: t('pages.traceability.ingredientLotList.status.expired'), color: 'red' }
  }

  const tabItems = [
    {
      key: 'basic',
      label: t('pages.traceability.ingredientLotDetail.tabs.basic'),
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.lotId')}>{lot.lotId}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.batchNumber')}>{lot.batchNumber}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.ingredientName')}>{lot.ingredientName}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.supplierName')}>{lot.supplierName}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.harvestDate')}>
            {lot.harvestDate ? dayjs(lot.harvestDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.productionDate')}>
            {lot.productionDate ? dayjs(lot.productionDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.expiryDate')}>
            {lot.expiryDate ? dayjs(lot.expiryDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.quantity')}>
            {lot.quantity} {lot.unit}
          </Descriptions.Item>
          {lot.origin && (
            <>
              <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.originProvince')}>{lot.origin.province || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.originCity')}>{lot.origin.city || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.farmName')}>{lot.origin.farmName || '-'}</Descriptions.Item>
            </>
          )}
        </Descriptions>
      )
    },
    {
      key: 'quality',
      label: t('pages.traceability.ingredientLotDetail.tabs.quality'),
      children: lot.quality ? (
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.inspectionDate')}>
            {lot.quality.inspectionDate ? dayjs(lot.quality.inspectionDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.inspector')}>{lot.quality.inspector || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.inspectionResult')}>
            <Tag color={lot.quality.inspectionResult === 'pass' ? 'green' : lot.quality.inspectionResult === 'fail' ? 'red' : 'orange'}>
              {lot.quality.inspectionResult === 'pass' ? t('pages.traceability.ingredientLotDetail.qualityResult.pass') : lot.quality.inspectionResult === 'fail' ? t('pages.traceability.ingredientLotDetail.qualityResult.fail') : t('pages.traceability.ingredientLotDetail.qualityResult.pending')}
            </Tag>
          </Descriptions.Item>
          {lot.quality.testItems && lot.quality.testItems.length > 0 && (
            <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.testItems')} span={2}>
              <Table
                columns={[
                  { title: t('pages.traceability.ingredientLotDetail.qualityTable.columns.item'), dataIndex: 'item' },
                  { title: t('pages.traceability.ingredientLotDetail.qualityTable.columns.standard'), dataIndex: 'standard' },
                  { title: t('pages.traceability.ingredientLotDetail.qualityTable.columns.actual'), dataIndex: 'actual' },
                  {
                    title: t('pages.traceability.ingredientLotDetail.qualityTable.columns.result'),
                    dataIndex: 'result',
                    render: (result: string) => (
                      <Tag color={result === 'pass' ? 'green' : 'red'}>
                        {result === 'pass' ? t('pages.traceability.ingredientLotDetail.qualityResult.pass') : t('pages.traceability.ingredientLotDetail.qualityResult.fail')}
                      </Tag>
                    )
                  }
                ]}
                dataSource={lot.quality.testItems}
                rowKey="item"
                pagination={false}
                size="small"
              />
            </Descriptions.Item>
          )}
        </Descriptions>
      ) : (
        <div>{t('pages.traceability.ingredientLotDetail.messages.noQualityInfo')}</div>
      )
    },
    {
      key: 'logistics',
      label: t('pages.traceability.ingredientLotDetail.tabs.logistics'),
      children: lot.logistics ? (
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.transportMode')}>{lot.logistics.transportMode || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.transportCompany')}>{lot.logistics.transportCompany || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.departureDate')}>
            {lot.logistics.departureDate ? dayjs(lot.logistics.departureDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.arrivalDate')}>
            {lot.logistics.arrivalDate ? dayjs(lot.logistics.arrivalDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.departureLocation')}>{lot.logistics.departureLocation || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.arrivalLocation')}>{lot.logistics.arrivalLocation || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.transportCarbonFootprint')}>
            {lot.logistics.carbonFootprint ? `${lot.logistics.carbonFootprint.toFixed(2)} kg CO₂e` : '-'}
          </Descriptions.Item>
        </Descriptions>
      ) : (
        <div>{t('pages.traceability.ingredientLotDetail.messages.noLogisticsInfo')}</div>
      )
    },
    {
      key: 'inventory',
      label: t('pages.traceability.ingredientLotDetail.tabs.inventory'),
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.currentStock')}>
            {lot.inventory.currentStock} {lot.inventory.unit}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.inventoryStatus')}>
            <Tag color={statusMap[lot.inventory.status].color}>
              {statusMap[lot.inventory.status].text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.location')}>{lot.inventory.location || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.ingredientLotDetail.fields.lastUsedDate')}>
            {lot.inventory.lastUsedDate ? dayjs(lot.inventory.lastUsedDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
        </Descriptions>
      )
    },
    {
      key: 'usage',
      label: t('pages.traceability.ingredientLotDetail.tabs.usage'),
      children: lot.usageRecords && lot.usageRecords.length > 0 ? (
        <Table
          columns={[
            { title: t('pages.traceability.ingredientLotDetail.usageTable.columns.menuItemName'), dataIndex: 'menuItemName' },
            { title: t('pages.traceability.ingredientLotDetail.usageTable.columns.quantity'), dataIndex: 'quantity' },
            {
              title: t('pages.traceability.ingredientLotDetail.usageTable.columns.usedDate'),
              dataIndex: 'usedDate',
              render: (date: string | Date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
            },
            { title: t('pages.traceability.ingredientLotDetail.usageTable.columns.orderId'), dataIndex: 'orderId' }
          ]}
          dataSource={lot.usageRecords}
          rowKey={(record, index) => `${record.menuItemId}-${index}`}
          pagination={false}
        />
      ) : (
        <div>{t('pages.traceability.ingredientLotDetail.messages.noUsageRecords')}</div>
      )
    }
  ]

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/lots')}>
            {t('common.back')}
          </Button>
          <span>{t('pages.traceability.ingredientLotDetail.title')}</span>
        </Space>
      }
      extra={
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/traceability/lots/${id}/edit`)}>
          {t('common.edit')}
        </Button>
      }
      loading={loading}
    >
      <Tabs items={tabItems} />
    </Card>
  )
}

export default IngredientLotDetailPage

