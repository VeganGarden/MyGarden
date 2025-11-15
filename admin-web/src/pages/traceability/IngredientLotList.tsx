/**
 * 食材批次列表页
 */

import React, { useEffect, useState } from 'react'
import { Button, Card, Input, Select, Table, Space, Tag, message, DatePicker } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { ingredientLotAPI } from '@/services/traceability'
import type { IngredientLot, IngredientLotQueryParams } from '@/types/traceability'
import { InventoryStatus } from '@/types/traceability'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const IngredientLotListPage: React.FC = () => {
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
          message.error(result.error || '加载失败')
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
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [queryParams])

  const handleDelete = (lot: IngredientLot) => {
    // 删除确认逻辑
    message.info('删除功能待实现')
  }

  const statusMap: Record<InventoryStatus, { text: string; color: string }> = {
    [InventoryStatus.IN_STOCK]: { text: '有库存', color: 'green' },
    [InventoryStatus.LOW_STOCK]: { text: '库存不足', color: 'orange' },
    [InventoryStatus.OUT_OF_STOCK]: { text: '缺货', color: 'red' },
    [InventoryStatus.EXPIRED]: { text: '已过期', color: 'red' }
  }

  const columns = [
    {
      title: '批次号',
      dataIndex: 'batchNumber',
      key: 'batchNumber'
    },
    {
      title: '食材名称',
      dataIndex: 'ingredientName',
      key: 'ingredientName'
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName'
    },
    {
      title: '采收日期',
      dataIndex: 'harvestDate',
      key: 'harvestDate',
      render: (date: string | Date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '数量',
      key: 'quantity',
      render: (_: any, record: IngredientLot) => `${record.quantity} ${record.unit}`
    },
    {
      title: '库存',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: InventoryStatus) => {
        if (!status) return '-'
        const statusInfo = statusMap[status]
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: IngredientLot) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/traceability/lots/${record.lotId}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/traceability/lots/${record.lotId}/edit`)}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ]

  return (
    <Card title="食材批次管理" extra={
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate('/traceability/lots/add')}
      >
        添加批次
      </Button>
    }>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Input
            placeholder="搜索食材名称"
            style={{ width: 200 }}
            onChange={(e) => {
              // 搜索功能待实现
            }}
          />
          <Select
            placeholder="供应商"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, supplierId: value, page: 1 })
            }}
          >
            {/* 供应商选项待实现 */}
          </Select>
          <Select
            placeholder="库存状态"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, status: value, page: 1 })
            }}
          >
            <Select.Option value={InventoryStatus.IN_STOCK}>有库存</Select.Option>
            <Select.Option value={InventoryStatus.LOW_STOCK}>库存不足</Select.Option>
            <Select.Option value={InventoryStatus.OUT_OF_STOCK}>缺货</Select.Option>
            <Select.Option value={InventoryStatus.EXPIRED}>已过期</Select.Option>
          </Select>
          <RangePicker
            placeholder={['采收日期开始', '采收日期结束']}
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
            showTotal: (total) => `共 ${total} 条`,
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

