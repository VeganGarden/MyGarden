import { useAppSelector } from '@/store/hooks'
import { operationAPI } from '@/services/cloudbase'
import { DeleteOutlined, EditOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
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
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<Coupon[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCouponData()
  }, [currentRestaurantId])

  const fetchCouponData = async () => {
    try {
      if (!currentRestaurantId) {
        setDataSource([])
        return
      }
      
      const result = await operationAPI.coupon.list({
        restaurantId: currentRestaurantId,
      })
      
      if (result && result.code === 0 && result.data) {
        const coupons = Array.isArray(result.data) ? result.data : []
        setDataSource(coupons.map((coupon: any) => ({
          id: coupon.id || coupon._id || '',
          name: coupon.name || coupon.title || '',
          type: coupon.type || 'discount',
          value: coupon.value || coupon.amount || 0,
          minAmount: coupon.minAmount || coupon.min_amount || undefined,
          totalCount: coupon.totalCount || coupon.total_count || 0,
          usedCount: coupon.usedCount || coupon.used_count || 0,
          validFrom: coupon.validFrom || coupon.valid_from || coupon.startTime || '',
          validTo: coupon.validTo || coupon.valid_to || coupon.endTime || '',
          status: coupon.status || 'active',
        })))
      } else {
        setDataSource([])
      }
    } catch (error: any) {
      console.error('获取优惠券数据失败:', error)
      message.error(error.message || '获取优惠券数据失败，请稍后重试')
      setDataSource([])
    }
  }

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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!currentRestaurantId) {
        message.error('请先选择餐厅')
        return
      }
      
      const validity = values.validity
      const couponData = {
        ...values,
        restaurantId: currentRestaurantId,
        validFrom: validity?.[0]?.format('YYYY-MM-DD') || '',
        validTo: validity?.[1]?.format('YYYY-MM-DD') || '',
      }
      delete couponData.validity
      
      const result = await operationAPI.coupon.create(couponData)
      
      if (result && result.code === 0) {
        message.success(t('common.saveSuccess'))
        setIsModalVisible(false)
        fetchCouponData() // 重新获取数据
      } else {
        message.error(result?.message || '保存失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      console.error('提交数据失败:', error)
      message.error(error.message || '保存失败，请稍后重试')
    }
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

