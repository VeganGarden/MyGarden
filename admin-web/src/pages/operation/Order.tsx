import { useAppSelector } from '@/store/hooks'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Input, Row, Select, Space, Statistic, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

interface Order {
  id: string
  orderNo: string
  orderDate: string
  customerName: string
  amount: number
  carbonFootprint: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
}

const OperationOrder: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<Order[]>([])

  useEffect(() => {
    fetchOrderData()
  }, [currentRestaurantId])

  const fetchOrderData = async () => {
    // TODO: 调用API获取订单数据
    // const result = await operationAPI.order.list({
    //   restaurantId: currentRestaurantId,
    // })
    // setDataSource(result)
    
    // 模拟数据
    if (currentRestaurantId) {
      setDataSource([
        {
          id: '1',
          orderNo: `ORD${currentRestaurantId.slice(-3)}001`,
          orderDate: '2025-01-20 10:30:00',
          customerName: '张三',
          amount: 128.00,
          carbonFootprint: 2.5,
          status: 'completed',
        },
      ])
    } else {
      setDataSource([])
    }
  }

  const columns: ColumnsType<Order> = [
    {
      title: t('pages.operation.order.table.columns.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: t('pages.operation.order.table.columns.orderDate'),
      dataIndex: 'orderDate',
      key: 'orderDate',
    },
    {
      title: t('pages.operation.order.table.columns.customerName'),
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: t('pages.operation.order.table.columns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: t('pages.operation.order.table.columns.carbonFootprint'),
      dataIndex: 'carbonFootprint',
      key: 'carbonFootprint',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
    {
      title: t('pages.operation.order.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: t('pages.operation.order.status.pending') },
          processing: { color: 'blue', text: t('pages.operation.order.status.processing') },
          completed: { color: 'green', text: t('pages.operation.order.status.completed') },
          cancelled: { color: 'red', text: t('pages.operation.order.status.cancelled') },
        }
        const cfg = config[status] || config.pending
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.operation.order.table.columns.actions'),
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} size="small">
            {t('pages.operation.order.buttons.viewDetail')}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card title={t('pages.operation.order.statistics.title')} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title={t('pages.operation.order.statistics.todayOrders')} value={0} suffix={t('pages.operation.order.statistics.unit')} valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={6}>
            <Statistic title={t('pages.operation.order.statistics.todayRevenue')} value={0} prefix="¥" valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col span={6}>
            <Statistic title={t('pages.operation.order.statistics.todayCarbonReduction')} value={0} suffix="kg CO₂e" valueStyle={{ color: '#cf1322' }} />
          </Col>
          <Col span={6}>
            <Statistic title={t('pages.operation.order.statistics.avgOrderValue')} value={0} prefix="¥" valueStyle={{ color: '#722ed1' }} />
          </Col>
        </Row>
      </Card>

      <Card
        title={t('pages.operation.order.title')}
        extra={
          <Space>
            <RangePicker />
            <Button icon={<DownloadOutlined />}>{t('pages.operation.order.buttons.export')}</Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder={t('pages.operation.order.filters.search')} style={{ width: 300 }} />
          <Select placeholder={t('pages.operation.order.filters.status')} style={{ width: 150 }} allowClear>
            <Select.Option value="pending">{t('pages.operation.order.status.pending')}</Select.Option>
            <Select.Option value="processing">{t('pages.operation.order.status.processing')}</Select.Option>
            <Select.Option value="completed">{t('pages.operation.order.status.completed')}</Select.Option>
            <Select.Option value="cancelled">{t('pages.operation.order.status.cancelled')}</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
          }}
        />
      </Card>
    </div>
  )
}

export default OperationOrder

