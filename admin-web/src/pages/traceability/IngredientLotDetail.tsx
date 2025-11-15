/**
 * 食材批次详情页
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, Tabs, Table, message } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { ingredientLotAPI } from '@/services/traceability'
import type { IngredientLot } from '@/types/traceability'
import { InventoryStatus } from '@/types/traceability'
import dayjs from 'dayjs'

const IngredientLotDetailPage: React.FC = () => {
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
        message.error(result.error || '加载失败')
        navigate('/traceability/lots')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  if (!lot) {
    return <div>加载中...</div>
  }

  const statusMap: Record<InventoryStatus, { text: string; color: string }> = {
    [InventoryStatus.IN_STOCK]: { text: '有库存', color: 'green' },
    [InventoryStatus.LOW_STOCK]: { text: '库存不足', color: 'orange' },
    [InventoryStatus.OUT_OF_STOCK]: { text: '缺货', color: 'red' },
    [InventoryStatus.EXPIRED]: { text: '已过期', color: 'red' }
  }

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="批次ID">{lot.lotId}</Descriptions.Item>
          <Descriptions.Item label="批次号">{lot.batchNumber}</Descriptions.Item>
          <Descriptions.Item label="食材名称">{lot.ingredientName}</Descriptions.Item>
          <Descriptions.Item label="供应商">{lot.supplierName}</Descriptions.Item>
          <Descriptions.Item label="采收日期">
            {lot.harvestDate ? dayjs(lot.harvestDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="生产日期">
            {lot.productionDate ? dayjs(lot.productionDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="保质期至">
            {lot.expiryDate ? dayjs(lot.expiryDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="数量">
            {lot.quantity} {lot.unit}
          </Descriptions.Item>
          {lot.origin && (
            <>
              <Descriptions.Item label="产地省份">{lot.origin.province || '-'}</Descriptions.Item>
              <Descriptions.Item label="产地城市">{lot.origin.city || '-'}</Descriptions.Item>
              <Descriptions.Item label="农场名称">{lot.origin.farmName || '-'}</Descriptions.Item>
            </>
          )}
        </Descriptions>
      )
    },
    {
      key: 'quality',
      label: '质检信息',
      children: lot.quality ? (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="质检日期">
            {lot.quality.inspectionDate ? dayjs(lot.quality.inspectionDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="质检人">{lot.quality.inspector || '-'}</Descriptions.Item>
          <Descriptions.Item label="质检结果">
            <Tag color={lot.quality.inspectionResult === 'pass' ? 'green' : lot.quality.inspectionResult === 'fail' ? 'red' : 'orange'}>
              {lot.quality.inspectionResult === 'pass' ? '通过' : lot.quality.inspectionResult === 'fail' ? '不通过' : '待检'}
            </Tag>
          </Descriptions.Item>
          {lot.quality.testItems && lot.quality.testItems.length > 0 && (
            <Descriptions.Item label="检测项目" span={2}>
              <Table
                columns={[
                  { title: '检测项目', dataIndex: 'item' },
                  { title: '标准值', dataIndex: 'standard' },
                  { title: '实际值', dataIndex: 'actual' },
                  {
                    title: '结果',
                    dataIndex: 'result',
                    render: (result: string) => (
                      <Tag color={result === 'pass' ? 'green' : 'red'}>
                        {result === 'pass' ? '合格' : '不合格'}
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
        <div>暂无质检信息</div>
      )
    },
    {
      key: 'logistics',
      label: '物流信息',
      children: lot.logistics ? (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="运输方式">{lot.logistics.transportMode || '-'}</Descriptions.Item>
          <Descriptions.Item label="运输公司">{lot.logistics.transportCompany || '-'}</Descriptions.Item>
          <Descriptions.Item label="出发日期">
            {lot.logistics.departureDate ? dayjs(lot.logistics.departureDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="到达日期">
            {lot.logistics.arrivalDate ? dayjs(lot.logistics.arrivalDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="出发地">{lot.logistics.departureLocation || '-'}</Descriptions.Item>
          <Descriptions.Item label="到达地">{lot.logistics.arrivalLocation || '-'}</Descriptions.Item>
          <Descriptions.Item label="运输碳足迹">
            {lot.logistics.carbonFootprint ? `${lot.logistics.carbonFootprint.toFixed(2)} kg CO₂e` : '-'}
          </Descriptions.Item>
        </Descriptions>
      ) : (
        <div>暂无物流信息</div>
      )
    },
    {
      key: 'inventory',
      label: '库存信息',
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="当前库存">
            {lot.inventory.currentStock} {lot.inventory.unit}
          </Descriptions.Item>
          <Descriptions.Item label="库存状态">
            <Tag color={statusMap[lot.inventory.status].color}>
              {statusMap[lot.inventory.status].text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="存储位置">{lot.inventory.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="最后使用日期">
            {lot.inventory.lastUsedDate ? dayjs(lot.inventory.lastUsedDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
        </Descriptions>
      )
    },
    {
      key: 'usage',
      label: '使用记录',
      children: lot.usageRecords && lot.usageRecords.length > 0 ? (
        <Table
          columns={[
            { title: '菜品名称', dataIndex: 'menuItemName' },
            { title: '使用数量', dataIndex: 'quantity' },
            {
              title: '使用日期',
              dataIndex: 'usedDate',
              render: (date: string | Date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
            },
            { title: '订单ID', dataIndex: 'orderId' }
          ]}
          dataSource={lot.usageRecords}
          rowKey={(record, index) => `${record.menuItemId}-${index}`}
          pagination={false}
        />
      ) : (
        <div>暂无使用记录</div>
      )
    }
  ]

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/lots')}>
            返回
          </Button>
          <span>食材批次详情</span>
        </Space>
      }
      extra={
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/traceability/lots/${id}/edit`)}>
          编辑
        </Button>
      }
      loading={loading}
    >
      <Tabs items={tabItems} />
    </Card>
  )
}

export default IngredientLotDetailPage

