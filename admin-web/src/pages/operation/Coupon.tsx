import { DeleteOutlined, EditOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useState } from 'react'

const { RangePicker } = DatePicker

interface Coupon {
  id: string
  name: string
  type: 'discount' | 'cash' | 'full_reduction'
  value: number
  minAmount?: number
  totalCount: number
  usedCount: number
  validFrom: string
  validTo: string
  status: 'active' | 'expired' | 'disabled'
}

const OperationCoupon: React.FC = () => {
  const [dataSource, setDataSource] = useState<Coupon[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  const columns: ColumnsType<Coupon> = [
    {
      title: '优惠券名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config: Record<string, { color: string; text: string }> = {
          discount: { color: 'blue', text: '折扣券' },
          cash: { color: 'green', text: '现金券' },
          full_reduction: { color: 'orange', text: '满减券' },
        }
        const cfg = config[type] || config.discount
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '面值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: Coupon) => {
        if (record.type === 'discount') {
          return `${value}折`
        }
        return `¥${value}`
      },
    },
    {
      title: '使用情况',
      key: 'usage',
      render: (_, record: Coupon) => `${record.usedCount}/${record.totalCount}`,
    },
    {
      title: '有效期',
      key: 'validity',
      render: (_, record: Coupon) => `${record.validFrom} 至 ${record.validTo}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: '有效' },
          expired: { color: 'error', text: '已过期' },
          disabled: { color: 'default', text: '已禁用' },
        }
        const cfg = config[status] || config.active
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<SendOutlined />} size="small">
            发放
          </Button>
          <Button type="link" icon={<EditOutlined />} size="small">
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const handleAdd = () => {
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      console.log('提交数据:', values)
      message.success('保存成功')
      setIsModalVisible(false)
    })
  }

  return (
    <div>
      <Card
        title="优惠券管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            创建优惠券
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="搜索优惠券名称" style={{ width: 300 }} />
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

      <Modal
        title="创建优惠券"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="优惠券名称" rules={[{ required: true }]}>
            <Input placeholder="请输入优惠券名称" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select placeholder="请选择类型">
              <Select.Option value="discount">折扣券</Select.Option>
              <Select.Option value="cash">现金券</Select.Option>
              <Select.Option value="full_reduction">满减券</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="value" label="面值" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="请输入面值" />
          </Form.Item>
          <Form.Item name="minAmount" label="最低消费金额">
            <InputNumber style={{ width: '100%' }} placeholder="请输入最低消费金额" />
          </Form.Item>
          <Form.Item name="totalCount" label="发放数量" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="请输入发放数量" />
          </Form.Item>
          <Form.Item name="validity" label="有效期" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OperationCoupon

