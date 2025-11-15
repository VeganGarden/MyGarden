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
      message.error('获取餐厅列表失败')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<Restaurant> = [
    {
      title: '餐厅名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      key: 'owner',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: '正常' },
          inactive: { color: 'default', text: '未激活' },
          pending: { color: 'processing', text: '待审核' },
          suspended: { color: 'error', text: '已暂停' },
        }
        const cfg = config[status] || config.inactive
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '认证等级',
      dataIndex: 'certificationLevel',
      key: 'certificationLevel',
      width: 120,
      render: (level?: string) => {
        if (!level) return <Tag>未认证</Tag>
        const config: Record<string, { color: string; text: string }> = {
          bronze: { color: 'default', text: '铜牌' },
          silver: { color: 'default', text: '银牌' },
          gold: { color: 'gold', text: '金牌' },
          platinum: { color: 'purple', text: '白金' },
        }
        const cfg = config[level] || config.bronze
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '累计订单',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 100,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: '累计收入',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: '碳减排(kg)',
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: '操作',
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
            详情
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.status === 'active' ? (
            <Button
              type="link"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleSuspend(record.id)}
            >
              暂停
            </Button>
          ) : (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(record.id)}
            >
              激活
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
      title: '确认暂停',
      content: '确定要暂停该餐厅吗？暂停后餐厅将无法使用系统功能。',
      onOk: async () => {
        try {
          // TODO: 调用API暂停餐厅
          // await platformAPI.restaurant.suspend(id)
          setDataSource(
            dataSource.map((item) =>
              item.id === id ? { ...item, status: 'suspended' } : item
            )
          )
          message.success('已暂停餐厅')
        } catch (error) {
          message.error('操作失败')
        }
      },
    })
  }

  const handleActivate = (id: string) => {
    Modal.confirm({
      title: '确认激活',
      content: '确定要激活该餐厅吗？',
      onOk: async () => {
        try {
          // TODO: 调用API激活餐厅
          // await platformAPI.restaurant.activate(id)
          setDataSource(
            dataSource.map((item) =>
              item.id === id ? { ...item, status: 'active' } : item
            )
          )
          message.success('已激活餐厅')
        } catch (error) {
          message.error('操作失败')
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
          message.success('更新成功')
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
          message.success('创建成功')
        }
        setIsModalVisible(false)
      } catch (error) {
        message.error('操作失败')
      }
    })
  }

  return (
    <div>
      <Card
        title="餐厅列表管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加餐厅
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索餐厅名称、负责人、电话"
            style={{ width: 300 }}
            allowClear
            onSearch={(value) => {
              // TODO: 实现搜索功能
              console.log('搜索:', value)
            }}
          />
          <Select
            placeholder="筛选状态"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => {
              // TODO: 实现筛选功能
              console.log('筛选状态:', value)
            }}
          >
            <Select.Option value="active">正常</Select.Option>
            <Select.Option value="inactive">未激活</Select.Option>
            <Select.Option value="pending">待审核</Select.Option>
            <Select.Option value="suspended">已暂停</Select.Option>
          </Select>
          <Select
            placeholder="筛选认证等级"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => {
              // TODO: 实现筛选功能
              console.log('筛选认证等级:', value)
            }}
          >
            <Select.Option value="bronze">铜牌</Select.Option>
            <Select.Option value="silver">银牌</Select.Option>
            <Select.Option value="gold">金牌</Select.Option>
            <Select.Option value="platinum">白金</Select.Option>
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
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="餐厅详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedRecord && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="餐厅名称">{selectedRecord.name}</Descriptions.Item>
            <Descriptions.Item label="负责人">{selectedRecord.owner}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{selectedRecord.phone}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{selectedRecord.email}</Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>
              {selectedRecord.address}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
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
                  ? '正常'
                  : selectedRecord.status === 'pending'
                  ? '待审核'
                  : selectedRecord.status === 'suspended'
                  ? '已暂停'
                  : '未激活'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="认证等级">
              {selectedRecord.certificationLevel ? (
                <Tag color="gold">{selectedRecord.certificationLevel}</Tag>
              ) : (
                <Tag>未认证</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="租户ID">{selectedRecord.tenantId}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{selectedRecord.createdAt}</Descriptions.Item>
            <Descriptions.Item label="累计订单">{selectedRecord.totalOrders.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="累计收入">
              ¥{selectedRecord.totalRevenue.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="累计碳减排">
              {selectedRecord.carbonReduction.toLocaleString()} kg CO₂e
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 编辑/创建模态框 */}
      <Modal
        title={selectedRecord ? '编辑餐厅' : '添加餐厅'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="餐厅名称" rules={[{ required: true, message: '请输入餐厅名称' }]}>
            <Input placeholder="请输入餐厅名称" />
          </Form.Item>
          <Form.Item name="owner" label="负责人" rules={[{ required: true, message: '请输入负责人' }]}>
            <Input placeholder="请输入负责人姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="联系电话"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
            ]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input.TextArea rows={2} placeholder="请输入详细地址" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态">
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="inactive">未激活</Select.Option>
              <Select.Option value="pending">待审核</Select.Option>
              <Select.Option value="suspended">已暂停</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RestaurantList

