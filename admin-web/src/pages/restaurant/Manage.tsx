import { useAppSelector } from '@/store/hooks'
import { tenantAPI } from '@/services/cloudbase'
import {
  EditOutlined,
  PlusOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
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
  _id?: string
  name: string
  address: string
  phone: string
  email: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  certificationLevel?: 'bronze' | 'silver' | 'gold' | 'platinum'
  certificationStatus?: string
  tenantId: string
  createdAt?: string
}

const RestaurantManage: React.FC = () => {
  const { t } = useTranslation()
  const { currentTenant } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Restaurant | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    if (currentTenant?.id) {
      fetchRestaurants()
    }
  }, [currentTenant])

  const fetchRestaurants = async () => {
    if (!currentTenant?.id) {
      return
    }

    setLoading(true)
    try {
      const result = await tenantAPI.getRestaurants({
        tenantId: currentTenant.id,
      })

      if (result && result.code === 0 && result.data) {
        const restaurants = Array.isArray(result.data) ? result.data : []
        setDataSource(
          restaurants.map((r: any) => ({
            id: r._id || r.id || '',
            _id: r._id,
            name: r.name || '',
            address: r.address || '',
            phone: r.phone || '',
            email: r.email || '',
            status: r.status || 'active',
            certificationLevel: r.certificationLevel,
            certificationStatus: r.certificationStatus || 'none',
            tenantId: r.tenantId || currentTenant.id,
            createdAt: r.createdAt || '',
          }))
        )
      } else {
        setDataSource([])
      }
    } catch (error: any) {
      console.error('获取餐厅列表失败:', error)
      message.error(error.message || '获取餐厅列表失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: Restaurant) => {
    setEditingRecord(record)
    form.setFieldsValue({
      name: record.name,
      address: record.address,
      phone: record.phone,
      email: record.email,
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (!currentTenant?.id) {
        message.error('当前租户信息不存在')
        return
      }

      if (editingRecord) {
        // 更新餐厅
        const result = await tenantAPI.updateRestaurant(editingRecord.id, {
          name: values.name,
          address: values.address,
          phone: values.phone,
          email: values.email,
        })

        if (result && result.success) {
          message.success('更新成功')
          setIsModalVisible(false)
          fetchRestaurants()
        } else {
          message.error(result?.message || '更新失败')
        }
      } else {
        // 创建餐厅
        const result = await tenantAPI.createRestaurant({
          tenantId: currentTenant.id,
          name: values.name,
          address: values.address,
          phone: values.phone,
          email: values.email,
        })

        if (result && result.success) {
          message.success('创建成功')
          setIsModalVisible(false)
          fetchRestaurants()
        } else {
          message.error(result?.message || '创建失败')
        }
      }
    } catch (error: any) {
      console.error('提交失败:', error)
      message.error(error.message || '操作失败')
    }
  }

  const handleCancel = () => {
    setIsModalVisible(false)
    setEditingRecord(null)
    form.resetFields()
  }

  const columns: ColumnsType<Restaurant> = [
    {
      title: '餐厅名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 250,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: '正常' },
          inactive: { color: 'default', text: '停用' },
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
          bronze: { color: 'orange', text: '铜牌' },
          silver: { color: 'default', text: '银牌' },
          gold: { color: 'gold', text: '金牌' },
          platinum: { color: 'cyan', text: '白金' },
        }
        const cfg = config[level] || { color: 'default', text: level }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <ShopOutlined />
            <span>餐厅管理</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            创建餐厅
          </Button>
        }
      >
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
      </Card>

      <Modal
        title={editingRecord ? '编辑餐厅' : '创建餐厅'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active',
          }}
        >
          <Form.Item
            name="name"
            label="餐厅名称"
            rules={[{ required: true, message: '请输入餐厅名称' }]}
          >
            <Input placeholder="请输入餐厅名称" />
          </Form.Item>

          <Form.Item
            name="address"
            label="餐厅地址"
            rules={[{ required: true, message: '请输入餐厅地址' }]}
          >
            <Input placeholder="请输入餐厅地址" />
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
        </Form>
      </Modal>
    </div>
  )
}

export default RestaurantManage

