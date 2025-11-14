import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useState } from 'react'

interface LedgerEntry {
  id: string
  date: string
  type: 'energy' | 'waste' | 'training' | 'other'
  description: string
  value: number
  unit: string
}

const OperationLedger: React.FC = () => {
  const [dataSource, setDataSource] = useState<LedgerEntry[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  const columns: ColumnsType<LedgerEntry> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config: Record<string, { color: string; text: string }> = {
          energy: { color: 'blue', text: '能源使用' },
          waste: { color: 'orange', text: '食物浪费' },
          training: { color: 'green', text: '培训活动' },
          other: { color: 'default', text: '其他' },
        }
        const cfg = config[type] || config.other
        return <span style={{ color: cfg.color }}>{cfg.text}</span>
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: LedgerEntry) => `${value} ${record.unit}`,
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

  const handleEdit = (record: LedgerEntry) => {
    form.setFieldsValue({
      ...record,
      date: record.date ? dayjs(record.date) : null,
    })
    setIsModalVisible(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
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

  const handleBatchImport = () => {
    message.info('批量导入功能开发中')
  }

  return (
    <div>
      <Card
        title="运营台账"
        extra={
          <Space>
            <Button icon={<UploadOutlined />} onClick={handleBatchImport}>
              批量导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加记录
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="搜索描述" style={{ width: 300 }} />
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
        title="运营台账记录"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Input placeholder="能源使用/食物浪费/培训活动/其他" />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入详细描述" />
          </Form.Item>
          <Form.Item name="value" label="数值" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="请输入数值" />
          </Form.Item>
          <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
            <Input placeholder="请输入单位" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OperationLedger

