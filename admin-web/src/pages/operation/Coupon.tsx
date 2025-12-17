import { useAppSelector } from '@/store/hooks'
import { operationAPI } from '@/services/cloudbase'
import { Column, Line } from '@ant-design/charts'
import { DeleteOutlined, EditOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Statistic, Table, Tabs, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { TabPane } = Tabs

interface Coupon {
  id: string
  name: string
  type: 'discount' | 'cash' | 'full_reduction'
  value: number
  minAmount?: number
  totalCount: number
  usedCount: number
  distributedCount?: number
  validFrom: string
  validTo: string
  status: 'active' | 'expired' | 'disabled'
}

interface CouponStats {
  totalCoupons: number
  totalDistributed: number
  totalUsed: number
  usageRate: number
  conversionRate: number
  totalRevenue: number
  totalCost: number
  roi: number
}

const OperationCoupon: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, tenantId } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<Coupon[]>([])
  const [stats, setStats] = useState<CouponStats | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDistributeModalVisible, setIsDistributeModalVisible] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [form] = Form.useForm()
  const [distributeForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('list')

  useEffect(() => {
    fetchCouponData()
    if (activeTab === 'stats') {
      fetchCouponStats()
    }
  }, [currentRestaurantId, activeTab])

  const fetchCouponData = async () => {
    try {
      if (!currentRestaurantId) {
        setDataSource([])
        return
      }
      
      setLoading(true)
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
          distributedCount: coupon.distributedCount || coupon.distributed_count || 0,
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
    } finally {
      setLoading(false)
    }
  }

  const fetchCouponStats = async () => {
    try {
      if (!currentRestaurantId) return

      const result = await operationAPI.coupon.getStats?.({
        restaurantId: currentRestaurantId,
      })
      if (result && result.code === 0 && result.data) {
        setStats(result.data)
      }
    } catch (error: any) {
      console.error('获取优惠券统计失败:', error)
    }
  }

  const handleDistribute = (coupon: Coupon) => {
    setSelectedCoupon(coupon)
    distributeForm.resetFields()
    setIsDistributeModalVisible(true)
  }

  const handleSubmitDistribute = async () => {
    try {
      const values = await distributeForm.validateFields()
      if (!selectedCoupon || !currentRestaurantId) return

      const result = await operationAPI.coupon.distribute?.({
        couponId: selectedCoupon.id,
        restaurantId: currentRestaurantId,
        userIds: values.userIds || [],
        distributionType: values.distributionType || 'targeted',
      })

      if (result && result.code === 0) {
        message.success('发放成功')
        setIsDistributeModalVisible(false)
        fetchCouponData()
      } else {
        message.error(result?.message || '发放失败')
      }
    } catch (error: any) {
      if (error.errorFields) return
      console.error('发放优惠券失败:', error)
      message.error(error.message || '发放失败')
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon)
    setIsEditMode(true)
    form.setFieldsValue({
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      minAmount: coupon.minAmount,
      totalCount: coupon.totalCount,
      validity: [dayjs(coupon.validFrom), dayjs(coupon.validTo)],
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (coupon: Coupon) => {
    try {
      const result = await operationAPI.coupon.delete(coupon.id)
      if (result && result.code === 0) {
        message.success('删除成功')
        fetchCouponData()
      } else {
        message.error(result?.message || '删除失败')
      }
    } catch (error: any) {
      console.error('删除优惠券失败:', error)
      message.error(error.message || '删除失败')
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
      title: '使用情况',
      key: 'usage',
      render: (_, record: Coupon) => {
        const usageRate = record.totalCount > 0 ? (record.usedCount / record.totalCount * 100).toFixed(1) : '0'
        return (
          <div>
            <div>{record.usedCount}/{record.totalCount}</div>
            <div style={{ fontSize: 12, color: '#999' }}>使用率: {usageRate}%</div>
          </div>
        )
      },
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
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<SendOutlined />} size="small" onClick={() => handleDistribute(record)}>
            发放
          </Button>
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const handleAdd = () => {
    setSelectedCoupon(null)
    setIsEditMode(false)
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
      
      let result
      if (isEditMode && selectedCoupon) {
        result = await operationAPI.coupon.update(selectedCoupon.id, couponData)
      } else {
        result = await operationAPI.coupon.create(couponData)
      }
      
      if (result && result.code === 0) {
        message.success('保存成功')
        setIsModalVisible(false)
        fetchCouponData()
      } else {
        message.error(result?.message || '保存失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      console.error('提交数据失败:', error)
      message.error(error.message || '保存失败，请稍后重试')
    }
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
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="优惠券列表" key="list">
            <Table
              columns={columns}
              dataSource={dataSource}
              rowKey="id"
              loading={loading}
              pagination={{
                total: dataSource.length,
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>

          <TabPane tab="统计分析" key="stats">
            {stats && (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Statistic title="总优惠券数" value={stats.totalCoupons} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="已发放" value={stats.totalDistributed} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="已使用" value={stats.totalUsed} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="使用率" value={(stats.usageRate * 100).toFixed(1)} suffix="%" />
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="ROI分析">
                      <Statistic title="总收入" value={stats.totalRevenue.toFixed(2)} prefix="¥" />
                      <Statistic title="总成本" value={stats.totalCost.toFixed(2)} prefix="¥" />
                      <Statistic title="ROI" value={(stats.roi * 100).toFixed(1)} suffix="%" />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="转化率">
                      <Statistic title="转化率" value={(stats.conversionRate * 100).toFixed(1)} suffix="%" />
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* 创建/编辑优惠券Modal */}
      <Modal
        title={isEditMode ? '编辑优惠券' : '创建优惠券'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false)
          setIsEditMode(false)
          setSelectedCoupon(null)
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="优惠券名称" rules={[{ required: true, message: '请输入优惠券名称' }]}>
            <Input placeholder="请输入优惠券名称" />
          </Form.Item>
          <Form.Item name="type" label="优惠券类型" rules={[{ required: true, message: '请选择优惠券类型' }]}>
            <Select placeholder="请选择优惠券类型">
              <Select.Option value="discount">折扣券</Select.Option>
              <Select.Option value="cash">现金券</Select.Option>
              <Select.Option value="full_reduction">满减券</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="value" label="优惠金额/折扣" rules={[{ required: true, message: '请输入优惠金额或折扣' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="请输入优惠金额或折扣" />
          </Form.Item>
          <Form.Item name="minAmount" label="最低消费金额">
            <InputNumber style={{ width: '100%' }} placeholder="请输入最低消费金额（可选）" />
          </Form.Item>
          <Form.Item name="totalCount" label="发放总数" rules={[{ required: true, message: '请输入发放总数' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="请输入发放总数" min={1} />
          </Form.Item>
          <Form.Item name="validity" label="有效期" rules={[{ required: true, message: '请选择有效期' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发放优惠券Modal */}
      <Modal
        title="发放优惠券"
        open={isDistributeModalVisible}
        onOk={handleSubmitDistribute}
        onCancel={() => {
          setIsDistributeModalVisible(false)
          setSelectedCoupon(null)
        }}
        width={600}
      >
        {selectedCoupon && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>优惠券:</strong> {selectedCoupon.name}</p>
            <p><strong>剩余数量:</strong> {selectedCoupon.totalCount - (selectedCoupon.distributedCount || 0)}</p>
          </div>
        )}
        <Form form={distributeForm} layout="vertical">
          <Form.Item name="distributionType" label="发放方式" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="targeted">定向发放</Select.Option>
              <Select.Option value="public">公开领取</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.distributionType !== currentValues.distributionType}
          >
            {({ getFieldValue }) =>
              getFieldValue('distributionType') === 'targeted' ? (
                <Form.Item name="userIds" label="用户ID列表（每行一个）">
                  <Input.TextArea rows={4} placeholder="请输入用户ID，每行一个" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OperationCoupon

