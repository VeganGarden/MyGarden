/**
 * 食材批次列表页
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input, Select, Table, Space, Tag, message, DatePicker } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { ingredientLotAPI } from '@/services/traceability'
import type { IngredientLot, IngredientLotQueryParams } from '@/types/traceability'
import { InventoryStatus } from '@/types/traceability'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const IngredientLotListPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [lots, setLots] = useState<IngredientLot[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [queryParams, setQueryParams] = useState<IngredientLotQueryParams>({
    page: 1,
    pageSize: 20,
    tenantId: 'default'
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await ingredientLotAPI.list(queryParams)
      if (result.success) {
        setLots(result.data || [])
        setPagination(result.pagination || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      } else {
        // 只有在真正失败时才显示错误（排除空数据的情况）
        const isEmpty = result.data && result.data.length === 0 && (!result.pagination || result.pagination.total === 0)
        if (!isEmpty && result.error) {
          message.error(result.error || t('pages.traceability.ingredientLotList.messages.loadFailed'))
        }
        setLots([])
        setPagination({
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [queryParams])

  const handleDelete = (lot: IngredientLot) => {
    // 删除确认逻辑
    message.info(t('pages.traceability.ingredientLotList.messages.deleteNotImplemented'))
  }

  const statusMap: Record<InventoryStatus, { text: string; color: string }> = {
    [InventoryStatus.IN_STOCK]: { text: t('pages.traceability.ingredientLotList.status.inStock'), color: 'green' },
    [InventoryStatus.LOW_STOCK]: { text: t('pages.traceability.ingredientLotList.status.lowStock'), color: 'orange' },
    [InventoryStatus.OUT_OF_STOCK]: { text: t('pages.traceability.ingredientLotList.status.outOfStock'), color: 'red' },
    [InventoryStatus.EXPIRED]: { text: t('pages.traceability.ingredientLotList.status.expired'), color: 'red' }
  }

  const columns = [
    {
      title: t('pages.traceability.ingredientLotList.table.columns.batchNumber'),
      dataIndex: 'batchNumber',
      key: 'batchNumber'
    },
    {
      title: t('pages.traceability.ingredientLotList.table.columns.ingredientName'),
      dataIndex: 'ingredientName',
      key: 'ingredientName'
    },
    {
      title: t('pages.traceability.ingredientLotList.table.columns.supplierName'),
      dataIndex: 'supplierName',
      key: 'supplierName'
    },
    {
      title: t('pages.traceability.ingredientLotList.table.columns.harvestDate'),
      dataIndex: 'harvestDate',
      key: 'harvestDate',
      render: (date: string | Date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: t('pages.traceability.ingredientLotList.table.columns.quantity'),
      key: 'quantity',
      render: (_: any, record: IngredientLot) => `${record.quantity} ${record.unit}`
    },
    {
      title: t('pages.traceability.ingredientLotList.table.columns.inventory'),
      key: 'inventory',
      render: (_: any, record: IngredientLot) => {
        const inventory = record.inventory as any
        if (inventory && (inventory.quantity !== undefined || inventory.currentStock !== undefined)) {
          const stock = inventory.quantity || inventory.currentStock
          const unit = inventory.unit || record.unit
          return `${stock} ${unit}`
        }
        return '-'
      }
    },
    {
      title: t('pages.traceability.ingredientLotList.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: InventoryStatus) => {
        if (!status) return '-'
        const statusInfo = statusMap[status]
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      }
    },
    {
      title: t('pages.traceability.ingredientLotList.table.columns.actions'),
      key: 'action',
      width: 200,
      render: (_: any, record: IngredientLot) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/traceability/lots/${record.lotId}`)}
          >
            {t('pages.traceability.ingredientLotList.buttons.view')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/traceability/lots/${record.lotId}/edit`)}
          >
            {t('pages.traceability.ingredientLotList.buttons.edit')}
          </Button>
        </Space>
      )
    }
  ]

  return (
    <Card title={t('pages.traceability.ingredientLotList.title')} extra={
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate('/traceability/lots/add')}
      >
        {t('pages.traceability.ingredientLotList.buttons.add')}
      </Button>
    }>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Input
            placeholder={t('pages.traceability.ingredientLotList.filters.search')}
            style={{ width: 200 }}
            onChange={(e) => {
              // 搜索功能待实现
            }}
          />
          <Select
            placeholder={t('pages.traceability.ingredientLotList.filters.supplier')}
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, supplierId: value, page: 1 })
            }}
          >
            {/* 供应商选项待实现 */}
          </Select>
          <Select
            placeholder={t('pages.traceability.ingredientLotList.filters.status')}
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, status: value, page: 1 })
            }}
          >
            <Select.Option value={InventoryStatus.IN_STOCK}>{t('pages.traceability.ingredientLotList.status.inStock')}</Select.Option>
            <Select.Option value={InventoryStatus.LOW_STOCK}>{t('pages.traceability.ingredientLotList.status.lowStock')}</Select.Option>
            <Select.Option value={InventoryStatus.OUT_OF_STOCK}>{t('pages.traceability.ingredientLotList.status.outOfStock')}</Select.Option>
            <Select.Option value={InventoryStatus.EXPIRED}>{t('pages.traceability.ingredientLotList.status.expired')}</Select.Option>
          </Select>
          <RangePicker
            placeholder={[t('pages.traceability.ingredientLotList.filters.harvestDateStart'), t('pages.traceability.ingredientLotList.filters.harvestDateEnd')]}
            onChange={(dates) => {
              if (dates) {
                setQueryParams({
                  ...queryParams,
                  harvestDateStart: dates[0]?.toDate(),
                  harvestDateEnd: dates[1]?.toDate(),
                  page: 1
                })
              } else {
                setQueryParams({
                  ...queryParams,
                  harvestDateStart: undefined,
                  harvestDateEnd: undefined,
                  page: 1
                })
              }
            }}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={lots}
          loading={loading}
          rowKey="lotId"
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
            onChange: (page, pageSize) => {
              setQueryParams({ ...queryParams, page, pageSize })
            }
          }}
        />
      </Space>
    </Card>
  )
}

export default IngredientLotListPage

