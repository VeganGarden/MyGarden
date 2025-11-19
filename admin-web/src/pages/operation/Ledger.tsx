import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LedgerEntry {
  id: string
  date: string
  type: 'energy' | 'waste' | 'training' | 'other'
  description: string
  value: number
  unit: string
}

const OperationLedger: React.FC = () => {
  const { t } = useTranslation()
  const [dataSource, setDataSource] = useState<LedgerEntry[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  const columns: ColumnsType<LedgerEntry> = [
    {
      title: t('pages.operation.ledger.table.columns.date'),
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: t('pages.operation.ledger.table.columns.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config: Record<string, { color: string; text: string }> = {
          energy: { color: 'blue', text: t('pages.operation.ledger.types.energy') },
          waste: { color: 'orange', text: t('pages.operation.ledger.types.waste') },
          training: { color: 'green', text: t('pages.operation.ledger.types.training') },
          other: { color: 'default', text: t('pages.operation.ledger.types.other') },
        }
        const cfg = config[type] || config.other
        return <span style={{ color: cfg.color }}>{cfg.text}</span>
      },
    },
    {
      title: t('pages.operation.ledger.table.columns.description'),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: t('pages.operation.ledger.table.columns.value'),
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: LedgerEntry) => `${value} ${record.unit}`,
    },
    {
      title: t('pages.operation.ledger.table.columns.actions'),
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            {t('common.delete')}
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
      title: t('common.confirmDelete'),
      content: t('common.confirmDeleteMessage'),
      onOk: () => {
        setDataSource(dataSource.filter((item) => item.id !== id))
        message.success(t('common.deleteSuccess'))
      },
    })
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      message.success(t('common.saveSuccess'))
      setIsModalVisible(false)
    })
  }

  const handleBatchImport = () => {
    message.info(t('pages.operation.ledger.messages.batchImportInProgress'))
  }

  return (
    <div>
      <Card
        title={t('pages.operation.ledger.title')}
        extra={
          <Space>
            <Button icon={<UploadOutlined />} onClick={handleBatchImport}>
              {t('common.batchImport')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('pages.operation.ledger.buttons.addRecord')}
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder={t('pages.operation.ledger.filters.search')} style={{ width: 300 }} />
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

      <Modal
        title={t('pages.operation.ledger.modal.title')}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="date" label={t('pages.operation.ledger.form.fields.date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label={t('pages.operation.ledger.form.fields.type')} rules={[{ required: true }]}>
            <Input placeholder={t('pages.operation.ledger.form.placeholders.type')} />
          </Form.Item>
          <Form.Item name="description" label={t('pages.operation.ledger.form.fields.description')} rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder={t('pages.operation.ledger.form.placeholders.description')} />
          </Form.Item>
          <Form.Item name="value" label={t('pages.operation.ledger.form.fields.value')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder={t('pages.operation.ledger.form.placeholders.value')} />
          </Form.Item>
          <Form.Item name="unit" label={t('pages.operation.ledger.form.fields.unit')} rules={[{ required: true }]}>
            <Input placeholder={t('pages.operation.ledger.form.placeholders.unit')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OperationLedger

