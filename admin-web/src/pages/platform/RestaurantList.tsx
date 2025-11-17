import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined
} from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Restaurant {
  id: string
  name: string
  owner: string
  phone: string
  email: string
  address: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  certificationLevel?: 'bronze' | 'silver' | 'gold' | 'platinum'
  tenantId: string
  createdAt: string
  totalOrders: number
  totalRevenue: number
  carbonReduction: number
}

const RestaurantList: React.FC = () => {
  const { t } = useTranslation()
  const [dataSource, setDataSource] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<Restaurant | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    setLoading(true)
    try {
      // TODO: 调用API获取餐厅列表
      // const result = await platformAPI.restaurant.list()
      // setDataSource(result)
      
      // 模拟数据
      const mockData: Restaurant[] = [
        {
          id: '1',
          name: '虹桥素坊',
          owner: '张经理',
          phone: '13800138000',
          email: 'zhang@example.com',
          address: '上海市虹桥区XX路123号',
          status: 'active',
          certificationLevel: 'gold',
          tenantId: 'tenant_001',
          createdAt: '2024-01-15',
          totalOrders: 1250,
          totalRevenue: 125000,
          carbonReduction: 3650,
        },
        {
          id: '2',
          name: '绿色餐厅',
          owner: '李经理',
          phone: '13900139000',
          email: 'li@example.com',
          address: '北京市朝阳区XX街456号',
          status: 'active',
          certificationLevel: 'silver',
          tenantId: 'tenant_002',
          createdAt: '2024-02-20',
          totalOrders: 890,
          totalRevenue: 89000,
          carbonReduction: 2100,
        },
        {
          id: '3',
          name: '素食天地',
          owner: '王经理',
          phone: '13700137000',
          email: 'wang@example.com',
          address: '广州市天河区XX大道789号',
          status: 'pending',
          tenantId: 'tenant_003',
          createdAt: '2025-01-10',
          totalOrders: 0,
          totalRevenue: 0,
          carbonReduction: 0,
        },
      ]
      setDataSource(mockData)
    } catch (error) {
      message.error(t('pages.platform.restaurantList.messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<Restaurant> = [
    {
      title: t('pages.platform.restaurantList.table.columns.name'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: t('pages.platform.restaurantList.table.columns.owner'),
      dataIndex: 'owner',
      key: 'owner',
      width: 100,
    },
    {
      title: t('pages.platform.restaurantList.table.columns.phone'),
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: t('pages.platform.restaurantList.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: t('pages.platform.restaurantList.status.active') },
          inactive: { color: 'default', text: t('pages.platform.restaurantList.status.inactive') },
          pending: { color: 'processing', text: t('pages.platform.restaurantList.status.pending') },
          suspended: { color: 'error', text: t('pages.platform.restaurantList.status.suspended') },
        }
        const cfg = config[status] || config.inactive
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.platform.restaurantList.table.columns.certificationLevel'),
      dataIndex: 'certificationLevel',
      key: 'certificationLevel',
      width: 120,
      render: (level?: string) => {
        if (!level) return <Tag>{t('pages.platform.restaurantList.certificationLevels.notCertified')}</Tag>
        const config: Record<string, { color: string; text: string }> = {
          bronze: { color: 'default', text: t('pages.platform.restaurantList.certificationLevels.bronze') },
          silver: { color: 'default', text: t('pages.platform.restaurantList.certificationLevels.silver') },
          gold: { color: 'gold', text: t('pages.platform.restaurantList.certificationLevels.gold') },
          platinum: { color: 'purple', text: t('pages.platform.restaurantList.certificationLevels.platinum') },
        }
        const cfg = config[level] || config.bronze
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.platform.restaurantList.table.columns.totalOrders'),
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 100,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: t('pages.platform.restaurantList.table.columns.totalRevenue'),
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: t('pages.platform.restaurantList.table.columns.carbonReduction'),
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: t('pages.platform.restaurantList.table.columns.actions'),
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            {t('pages.platform.restaurantList.buttons.detail')}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common.edit')}
          </Button>
          {record.status === 'active' ? (
            <Button
              type="link"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleSuspend(record.id)}
            >
              {t('pages.platform.restaurantList.buttons.suspend')}
            </Button>
          ) : (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(record.id)}
            >
              {t('pages.platform.restaurantList.buttons.activate')}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const handleViewDetail = (record: Restaurant) => {
    setSelectedRecord(record)
    setIsDetailModalVisible(true)
  }

  const handleEdit = (record: Restaurant) => {
    form.setFieldsValue(record)
    setSelectedRecord(record)
    setIsModalVisible(true)
  }

  const handleSuspend = (id: string) => {
    Modal.confirm({
      title: t('pages.platform.restaurantList.modal.suspend.title'),
      content: t('pages.platform.restaurantList.modal.suspend.content'),
      onOk: async () => {
        try {
          // TODO: 调用API暂停餐厅
          // await platformAPI.restaurant.suspend(id)
          setDataSource(
            dataSource.map((item) =>
              item.id === id ? { ...item, status: 'suspended' } : item
            )
          )
          message.success(t('pages.platform.restaurantList.messages.suspended'))
        } catch (error) {
          message.error(t('common.operationFailed'))
        }
      },
    })
  }

  const handleActivate = (id: string) => {
    Modal.confirm({
      title: t('pages.platform.restaurantList.modal.activate.title'),
      content: t('pages.platform.restaurantList.modal.activate.content'),
      onOk: async () => {
        try {
          // TODO: 调用API激活餐厅
          // await platformAPI.restaurant.activate(id)
          setDataSource(
            dataSource.map((item) =>
              item.id === id ? { ...item, status: 'active' } : item
            )
          )
          message.success(t('pages.platform.restaurantList.messages.activated'))
        } catch (error) {
          message.error(t('common.operationFailed'))
        }
      },
    })
  }

  const handleAdd = () => {
    form.resetFields()
    setSelectedRecord(null)
    setIsModalVisible(true)
  }

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      try {
        if (selectedRecord) {
          // TODO: 调用API更新餐厅
          // await platformAPI.restaurant.update(selectedRecord.id, values)
          setDataSource(
            dataSource.map((item) =>
              item.id === selectedRecord.id ? { ...item, ...values } : item
            )
          )
          message.success(t('common.updateSuccess'))
        } else {
          // TODO: 调用API创建餐厅
          // await platformAPI.restaurant.create(values)
          const newRestaurant: Restaurant = {
            ...values,
            id: Date.now().toString(),
            status: 'pending',
            tenantId: `tenant_${Date.now()}`,
            createdAt: new Date().toISOString().split('T')[0],
            totalOrders: 0,
            totalRevenue: 0,
            carbonReduction: 0,
          }
          setDataSource([...dataSource, newRestaurant])
          message.success(t('common.createSuccess'))
        }
        setIsModalVisible(false)
      } catch (error) {
        message.error(t('common.operationFailed'))
      }
    })
  }

  return (
    <div>
      <Card
        title={t('pages.platform.restaurantList.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('pages.platform.restaurantList.buttons.add')}
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder={t('pages.platform.restaurantList.filters.search')}
            style={{ width: 300 }}
            allowClear
            onSearch={(value) => {
              // TODO: 实现搜索功能
              console.log('搜索:', value)
            }}
          />
          <Select
            placeholder={t('pages.platform.restaurantList.filters.status')}
            style={{ width: 150 }}
            allowClear
            onChange={(value) => {
              // TODO: 实现筛选功能
              console.log('筛选状态:', value)
            }}
          >
            <Select.Option value="active">{t('pages.platform.restaurantList.status.active')}</Select.Option>
            <Select.Option value="inactive">{t('pages.platform.restaurantList.status.inactive')}</Select.Option>
            <Select.Option value="pending">{t('pages.platform.restaurantList.status.pending')}</Select.Option>
            <Select.Option value="suspended">{t('pages.platform.restaurantList.status.suspended')}</Select.Option>
          </Select>
          <Select
            placeholder={t('pages.platform.restaurantList.filters.certificationLevel')}
            style={{ width: 150 }}
            allowClear
            onChange={(value) => {
              // TODO: 实现筛选功能
              console.log('筛选认证等级:', value)
            }}
          >
            <Select.Option value="bronze">{t('pages.platform.restaurantList.certificationLevels.bronze')}</Select.Option>
            <Select.Option value="silver">{t('pages.platform.restaurantList.certificationLevels.silver')}</Select.Option>
            <Select.Option value="gold">{t('pages.platform.restaurantList.certificationLevels.gold')}</Select.Option>
            <Select.Option value="platinum">{t('pages.platform.restaurantList.certificationLevels.platinum')}</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={t('pages.platform.restaurantList.modal.detail.title')}
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            {t('common.close')}
          </Button>,
        ]}
        width={800}
      >
        {selectedRecord && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.name')}>{selectedRecord.name}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.owner')}>{selectedRecord.owner}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.phone')}>{selectedRecord.phone}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.email')}>{selectedRecord.email}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.address')} span={2}>
              {selectedRecord.address}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.status')}>
              <Tag
                color={
                  selectedRecord.status === 'active'
                    ? 'success'
                    : selectedRecord.status === 'pending'
                    ? 'processing'
                    : selectedRecord.status === 'suspended'
                    ? 'error'
                    : 'default'
                }
              >
                {selectedRecord.status === 'active'
                  ? t('pages.platform.restaurantList.status.active')
                  : selectedRecord.status === 'pending'
                  ? t('pages.platform.restaurantList.status.pending')
                  : selectedRecord.status === 'suspended'
                  ? t('pages.platform.restaurantList.status.suspended')
                  : t('pages.platform.restaurantList.status.inactive')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.certificationLevel')}>
              {selectedRecord.certificationLevel ? (
                <Tag color="gold">{selectedRecord.certificationLevel}</Tag>
              ) : (
                <Tag>{t('pages.platform.restaurantList.certificationLevels.notCertified')}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.tenantId')}>{selectedRecord.tenantId}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.createdAt')}>{selectedRecord.createdAt}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.totalOrders')}>{selectedRecord.totalOrders.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.totalRevenue')}>
              ¥{selectedRecord.totalRevenue.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.carbonReduction')}>
              {selectedRecord.carbonReduction.toLocaleString()} kg CO₂e
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 编辑/创建模态框 */}
      <Modal
        title={selectedRecord ? t('pages.platform.restaurantList.modal.edit.title') : t('pages.platform.restaurantList.modal.add.title')}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('pages.platform.restaurantList.form.fields.name')} rules={[{ required: true, message: t('pages.platform.restaurantList.form.messages.nameRequired') }]}>
            <Input placeholder={t('pages.platform.restaurantList.form.placeholders.name')} />
          </Form.Item>
          <Form.Item name="owner" label={t('pages.platform.restaurantList.form.fields.owner')} rules={[{ required: true, message: t('pages.platform.restaurantList.form.messages.ownerRequired') }]}>
            <Input placeholder={t('pages.platform.restaurantList.form.placeholders.owner')} />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t('pages.platform.restaurantList.form.fields.phone')}
            rules={[
              { required: true, message: t('pages.platform.restaurantList.form.messages.phoneRequired') },
              { pattern: /^1[3-9]\d{9}$/, message: t('pages.platform.restaurantList.form.messages.phoneInvalid') },
            ]}
          >
            <Input placeholder={t('pages.platform.restaurantList.form.placeholders.phone')} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('pages.platform.restaurantList.form.fields.email')}
            rules={[
              { required: true, message: t('pages.platform.restaurantList.form.messages.emailRequired') },
              { type: 'email', message: t('pages.platform.restaurantList.form.messages.emailInvalid') },
            ]}
          >
            <Input placeholder={t('pages.platform.restaurantList.form.placeholders.email')} />
          </Form.Item>
          <Form.Item name="address" label={t('pages.platform.restaurantList.form.fields.address')} rules={[{ required: true, message: t('pages.platform.restaurantList.form.messages.addressRequired') }]}>
            <Input.TextArea rows={2} placeholder={t('pages.platform.restaurantList.form.placeholders.address')} />
          </Form.Item>
          <Form.Item name="status" label={t('pages.platform.restaurantList.form.fields.status')}>
            <Select placeholder={t('pages.platform.restaurantList.form.placeholders.status')}>
              <Select.Option value="active">{t('pages.platform.restaurantList.status.active')}</Select.Option>
              <Select.Option value="inactive">{t('pages.platform.restaurantList.status.inactive')}</Select.Option>
              <Select.Option value="pending">{t('pages.platform.restaurantList.status.pending')}</Select.Option>
              <Select.Option value="suspended">{t('pages.platform.restaurantList.status.suspended')}</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RestaurantList

