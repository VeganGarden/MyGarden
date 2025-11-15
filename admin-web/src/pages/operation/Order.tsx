import { useAppSelector } from '@/store/hooks'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Input, Row, Select, Space, Statistic, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'

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
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: '订单日期',
      dataIndex: 'orderDate',
      key: 'orderDate',
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: '订单金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: '碳足迹',
      dataIndex: 'carbonFootprint',
      key: 'carbonFootprint',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待处理' },
          processing: { color: 'blue', text: '处理中' },
          completed: { color: 'green', text: '已完成' },
          cancelled: { color: 'red', text: '已取消' },
        }
        const cfg = config[status] || config.pending
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} size="small">
            查看详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card title="订单统计" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="今日订单" value={0} suffix="单" valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={6}>
            <Statistic title="今日收入" value={0} prefix="¥" valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col span={6}>
            <Statistic title="今日碳减排" value={0} suffix="kg CO₂e" valueStyle={{ color: '#cf1322' }} />
          </Col>
          <Col span={6}>
            <Statistic title="平均客单价" value={0} prefix="¥" valueStyle={{ color: '#722ed1' }} />
          </Col>
        </Row>
      </Card>

      <Card
        title="订单管理"
        extra={
          <Space>
            <RangePicker />
            <Button icon={<DownloadOutlined />}>导出数据</Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="搜索订单号或客户名称" style={{ width: 300 }} />
          <Select placeholder="筛选状态" style={{ width: 150 }} allowClear>
            <Select.Option value="pending">待处理</Select.Option>
            <Select.Option value="processing">处理中</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
            <Select.Option value="cancelled">已取消</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  )
}

export default OperationOrder

