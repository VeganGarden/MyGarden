import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useState } from 'react'

interface Batch {
  id: string
  batchNo: string
  ingredientName: string
  supplier: string
  purchaseDate: string
  quantity: number
  unit: string
  qualityInfo: string
  status: 'in_stock' | 'used' | 'expired'
}

const TraceabilityBatch: React.FC = () => {
  const [dataSource, setDataSource] = useState<Batch[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  const columns: ColumnsType<Batch> = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
    },
    {
      title: '食材名称',
      dataIndex: 'ingredientName',
      key: 'ingredientName',
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: '采购日期',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value: number, record: Batch) => `${value} ${record.unit}`,
    },
    {
      title: '质检信息',
      dataIndex: 'qualityInfo',
      key: 'qualityInfo',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          in_stock: { color: 'success', text: '在库' },
          used: { color: 'default', text: '已使用' },
          expired: { color: 'error', text: '已过期' },
        }
        const cfg = config[status] || config.in_stock
        return <span style={{ color: cfg.color === 'success' ? '#52c41a' : cfg.color === 'error' ? '#ff4d4f' : '#666' }}>
          {cfg.text}
        </span>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<SearchOutlined />}>
            追踪
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
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

  const handleEdit = (record: Batch) => {
    form.setFieldsValue({
      ...record,
      purchaseDate: record.purchaseDate ? dayjs(record.purchaseDate) : null,
    })
    setIsModalVisible(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个批次吗？',
      onOk: () => {
        setDataSource(dataSource.filter((item) => item.id !== id))
        message.success('删除成功')
      },
    })
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
        title="食材批次管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加批次
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="搜索批次号或食材名称" style={{ width: 300 }} />
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
        title="食材批次信息"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="batchNo" label="批次号" rules={[{ required: true }]}>
            <Input placeholder="请输入批次号" />
          </Form.Item>
          <Form.Item name="ingredientName" label="食材名称" rules={[{ required: true }]}>
            <Input placeholder="请输入食材名称" />
          </Form.Item>
          <Form.Item name="supplier" label="供应商" rules={[{ required: true }]}>
            <Input placeholder="请输入供应商名称" />
          </Form.Item>
          <Form.Item name="purchaseDate" label="采购日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}>
            <Input type="number" placeholder="请输入数量" />
          </Form.Item>
          <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
            <Input placeholder="请输入单位，如：kg、g、L" />
          </Form.Item>
          <Form.Item name="qualityInfo" label="质检信息">
            <Input.TextArea rows={3} placeholder="请输入质检信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TraceabilityBatch

