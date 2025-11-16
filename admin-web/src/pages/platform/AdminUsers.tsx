import { adminUsersAPI } from '@/services/cloudbase'
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'

type AdminUser = {
  _id: string
  username: string
  name?: string
  email?: string
  phone?: string
  role: 'system_admin' | 'platform_operator' | 'carbon_specialist'
  status: 'active' | 'disabled'
  createdAt?: string
}

const roles = [
  { label: '系统管理员', value: 'system_admin' },
  { label: '平台运营', value: 'platform_operator' },
  { label: '碳核算专员', value: 'carbon_specialist' },
]

const AdminUsers: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AdminUser[]>([])
  const [createOpen, setCreateOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminUsersAPI.list()
      if (res.code === 0) {
        setData(res.data?.list || res.data || [])
      } else {
        message.error(res.message || '加载失败')
      }
    } catch (e: any) {
      message.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (values: any) => {
    setLoading(true)
    try {
      const res = await adminUsersAPI.create(values)
      if (res.code === 0) {
        message.success('创建成功')
        setCreateOpen(false)
        load()
      } else {
        message.error(res.message || '创建失败')
      }
    } catch (e: any) {
      message.error(e.message || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (record: AdminUser) => {
    const next = record.status === 'active' ? 'disabled' : 'active'
    setLoading(true)
    try {
      const res = await adminUsersAPI.updateStatus(record._id, next)
      if (res.code === 0) {
        message.success('已更新状态')
        load()
      } else {
        message.error(res.message || '更新失败')
      }
    } catch (e: any) {
      message.error(e.message || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (record: AdminUser) => {
    setLoading(true)
    try {
      const res = await adminUsersAPI.resetPassword(record._id)
      if (res.code === 0) {
        Modal.info({
          title: '密码已重置',
          content: `新密码：${res.data?.password || ''}（请尽快通知用户并要求修改密码）`,
        })
      } else {
        message.error(res.message || '重置失败')
      }
    } catch (e: any) {
      message.error(e.message || '重置失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <span>管理员账号管理（仅邀请/创建，不对外注册）</span>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            邀请/创建管理员
          </Button>
        </Space>
      }
    >
      <Table<AdminUser>
        rowKey="_id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'name' },
          { title: '邮箱', dataIndex: 'email' },
          { title: '电话', dataIndex: 'phone' },
          {
            title: '角色',
            dataIndex: 'role',
            render: (v) => {
              const map: any = {
                system_admin: '系统管理员',
                platform_operator: '平台运营',
                carbon_specialist: '碳核算专员',
              }
              return map[v] || v
            },
          },
          {
            title: '状态',
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? '启用' : '停用'}</Tag>,
          },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button onClick={() => toggleStatus(record)}>{record.status === 'active' ? '停用' : '启用'}</Button>
                <Button onClick={() => resetPassword(record)}>重置密码</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal title="邀请/创建管理员" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <Form layout="vertical" onFinish={handleCreate}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="初始密码"
            name="password"
            rules={[{ required: true, message: '请输入初始密码' }, { min: 6, message: '至少6位' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item label="姓名" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="电话" name="phone">
            <Input />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
            initialValue="platform_operator"
          >
            <Select options={roles} />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default AdminUsers


