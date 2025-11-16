import { adminUsersAPI } from '@/services/cloudbase'
import { Button, Card, Space, Table, Tag, message, Modal, Form, Input, Select } from 'antd'
import React, { useEffect, useState } from 'react'

const Users: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()
  const [filters, setFilters] = useState<{ role?: string; status?: 'active' | 'disabled'; keyword?: string }>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminUsersAPI.list(filters)
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

  const toggleStatus = async (record: any) => {
    const next = record.status === 'active' ? 'disabled' : 'active'
    setLoading(true)
    try {
      const res = await adminUsersAPI.updateStatus(record._id, next)
      if (res.code === 0) {
        message.success('已更新状态')
        load()
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e: any) {
      message.error(e.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (record: any) => {
    setLoading(true)
    try {
      const res = await adminUsersAPI.resetPassword(record._id)
      if (res.code === 0) {
        message.success(`已重置：${res.data?.password}`)
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e: any) {
      message.error(e.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const onCreate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const res = await adminUsersAPI.create(values)
      if (res.code === 0) {
        message.success('创建成功')
        setCreateOpen(false)
        form.resetFields()
        load()
      } else {
        message.error(res.message || '创建失败')
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title="用户管理"
      bordered={false}
      extra={
        <Space>
          <Select
            allowClear
            placeholder="角色"
            style={{ width: 180 }}
            options={[
              { label: '全部', value: '' },
              { label: '系统管理员', value: 'system_admin' },
              { label: '平台运营', value: 'platform_operator' },
              { label: '碳核算专员', value: 'carbon_specialist' },
              { label: '政府/外部合作方', value: 'government_partner' },
              { label: '餐厅管理员', value: 'restaurant_admin' },
            ]}
            value={filters.role}
            onChange={(v) => setFilters((f) => ({ ...f, role: v || undefined }))}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            options={[
              { label: 'active', value: 'active' },
              { label: 'disabled', value: 'disabled' },
            ]}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <Input
            allowClear
            placeholder="关键字（用户名）"
            style={{ width: 200 }}
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
          />
          <Button onClick={load} loading={loading}>查询</Button>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            新建用户
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'name', render: (v: string) => v || '-' },
          { title: '角色', dataIndex: 'role' },
          { title: '租户ID', dataIndex: 'tenantId', render: (v: string) => v || '-' },
          { title: '餐厅数', dataIndex: 'restaurantCount', width: 100, render: (v: number) => v ?? 0 },
          {
            title: '状态',
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v || 'active'}</Tag>,
          },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button type="link" onClick={() => toggleStatus(record)}>
                  {record.status === 'active' ? '禁用' : '启用'}
                </Button>
                <Button type="link" onClick={() => resetPassword(record)}>
                  重置密码
                </Button>
                <Button type="link" danger onClick={() => adminUsersAPI.softDelete(record._id).then((res) => {
                  if (res.code === 0) {
                    message.success('已删除')
                    load()
                  } else {
                    message.error(res.message || '删除失败')
                  }
                })}>
                  删除
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title="新建用户"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_\-]{3,20}$/, message: '以字母开头，4-21位，仅字母数字下划线和中划线' },
            ]}
          >
            <Input placeholder="示例：ops_admin01" />
          </Form.Item>
          <Form.Item
            label="初始密码"
            name="password"
            rules={[{ required: true, message: '请输入初始密码' }, { min: 6, message: '至少6位' }]}
          >
            <Input.Password placeholder="至少6位" />
          </Form.Item>
          <Form.Item label="姓名" name="name">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="电话" name="phone">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            initialValue="platform_operator"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              options={[
                { label: '平台运营（platform_operator）', value: 'platform_operator' },
                { label: '碳核算专员（carbon_specialist）', value: 'carbon_specialist' },
                { label: '政府/外部合作方（government_partner）', value: 'government_partner' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default Users


