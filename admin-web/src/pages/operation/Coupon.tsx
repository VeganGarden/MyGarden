import { DeleteOutlined, EditOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const [dataSource, setDataSource] = useState<Coupon[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  const columns: ColumnsType<Coupon> = [
    {
      title: t('pages.operation.coupon.table.columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('pages.operation.coupon.table.columns.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config: Record<string, { color: string; text: string }> = {
          discount: { color: 'blue', text: t('pages.operation.coupon.types.discount') },
          cash: { color: 'green', text: t('pages.operation.coupon.types.cash') },
          full_reduction: { color: 'orange', text: t('pages.operation.coupon.types.fullReduction') },
        }
        const cfg = config[type] || config.discount
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.operation.coupon.table.columns.value'),
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: Coupon) => {
        if (record.type === 'discount') {
          return `${value}${t('pages.operation.coupon.discountUnit')}`
        }
        return `¥${value}`
      },
    },
    {
      title: t('pages.operation.coupon.table.columns.usage'),
      key: 'usage',
      render: (_, record: Coupon) => `${record.usedCount}/${record.totalCount}`,
    },
    {
      title: t('pages.operation.coupon.table.columns.validity'),
      key: 'validity',
      render: (_, record: Coupon) => `${record.validFrom} ${t('common.to')} ${record.validTo}`,
    },
    {
      title: t('pages.operation.coupon.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: t('pages.operation.coupon.status.active') },
          expired: { color: 'error', text: t('pages.operation.coupon.status.expired') },
          disabled: { color: 'default', text: t('pages.operation.coupon.status.disabled') },
        }
        const cfg = config[status] || config.active
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.operation.coupon.table.columns.actions'),
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<SendOutlined />} size="small">
            {t('pages.operation.coupon.buttons.distribute')}
          </Button>
          <Button type="link" icon={<EditOutlined />} size="small">
            {t('common.edit')}
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
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

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      console.log('提交数据:', values)
      message.success(t('common.saveSuccess'))
      setIsModalVisible(false)
    })
  }

  return (
    <div>
      <Card
        title={t('pages.operation.coupon.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('pages.operation.coupon.buttons.create')}
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder={t('pages.operation.coupon.filters.search')} style={{ width: 300 }} />
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
        title={t('pages.operation.coupon.modal.title')}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('pages.operation.coupon.form.fields.name')} rules={[{ required: true }]}>
            <Input placeholder={t('pages.operation.coupon.form.placeholders.name')} />
          </Form.Item>
          <Form.Item name="type" label={t('pages.operation.coupon.form.fields.type')} rules={[{ required: true }]}>
            <Select placeholder={t('pages.operation.coupon.form.placeholders.type')}>
              <Select.Option value="discount">{t('pages.operation.coupon.types.discount')}</Select.Option>
              <Select.Option value="cash">{t('pages.operation.coupon.types.cash')}</Select.Option>
              <Select.Option value="full_reduction">{t('pages.operation.coupon.types.fullReduction')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="value" label={t('pages.operation.coupon.form.fields.value')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder={t('pages.operation.coupon.form.placeholders.value')} />
          </Form.Item>
          <Form.Item name="minAmount" label={t('pages.operation.coupon.form.fields.minAmount')}>
            <InputNumber style={{ width: '100%' }} placeholder={t('pages.operation.coupon.form.placeholders.minAmount')} />
          </Form.Item>
          <Form.Item name="totalCount" label={t('pages.operation.coupon.form.fields.totalCount')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder={t('pages.operation.coupon.form.placeholders.totalCount')} />
          </Form.Item>
          <Form.Item name="validity" label={t('pages.operation.coupon.form.fields.validity')} rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OperationCoupon

