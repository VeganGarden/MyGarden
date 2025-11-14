import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useState } from 'react'

interface Supplier {
  id: string
  name: string
  contact: string
  address: string
  certifications: string[]
  riskLevel: 'low' | 'medium' | 'high'
  status: 'pending' | 'approved' | 'rejected'
}

const TraceabilitySupplier: React.FC = () => {
  const [dataSource, setDataSource] = useState<Supplier[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  const columns: ColumnsType<Supplier> = [
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '认证信息',
      dataIndex: 'certifications',
      key: 'certifications',
      render: (certs: string[]) => (
        <Space>
          {certs.map((cert) => (
            <Tag key={cert} color="green">
              {cert}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level: string) => {
        const config: Record<string, { color: string; text: string }> = {
          low: { color: 'green', text: '低风险' },
          medium: { color: 'orange', text: '中风险' },
          high: { color: 'red', text: '高风险' },
        }
        const cfg = config[level] || config.medium
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          pending: { color: 'processing', text: '待审核' },
          approved: { color: 'success', text: '已通过' },
          rejected: { color: 'error', text: '已拒绝' },
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

  const handleEdit = (record: Supplier) => {
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个供应商吗？',
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
        title="供应商管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加供应商
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="搜索供应商名称" style={{ width: 300 }} />
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
        title="供应商信息"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="供应商名称" rules={[{ required: true }]}>
            <Input placeholder="请输入供应商名称" />
          </Form.Item>
          <Form.Item name="contact" label="联系方式" rules={[{ required: true }]}>
            <Input placeholder="请输入联系电话或邮箱" />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入详细地址" />
          </Form.Item>
          <Form.Item name="certifications" label="认证信息">
            <Input placeholder="请输入认证信息，多个用逗号分隔" />
          </Form.Item>
          <Form.Item name="riskLevel" label="风险等级">
            <Input placeholder="低/中/高风险" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TraceabilitySupplier

