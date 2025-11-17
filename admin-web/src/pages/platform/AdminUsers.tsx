import { adminUsersAPI } from '@/services/cloudbase'
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

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

const AdminUsers: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AdminUser[]>([])
  const [createOpen, setCreateOpen] = useState(false)

  const roles = [
    { label: t('pages.platform.adminUsers.roles.systemAdmin'), value: 'system_admin' },
    { label: t('pages.platform.adminUsers.roles.platformOperator'), value: 'platform_operator' },
    { label: t('pages.platform.adminUsers.roles.carbonSpecialist'), value: 'carbon_specialist' },
  ]

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminUsersAPI.list()
      if (res.code === 0) {
        setData(res.data?.list || res.data || [])
      } else {
        message.error(res.message || t('common.loadFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.loadFailed'))
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
        message.success(t('common.createSuccess'))
        setCreateOpen(false)
        load()
      } else {
        message.error(res.message || t('common.createFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.createFailed'))
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
        message.success(t('pages.platform.adminUsers.messages.statusUpdated'))
        load()
      } else {
        message.error(res.message || t('common.updateFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.updateFailed'))
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
          title: t('pages.platform.adminUsers.modal.passwordReset.title'),
          content: t('pages.platform.adminUsers.modal.passwordReset.content', { password: res.data?.password || '' }),
        })
      } else {
        message.error(res.message || t('pages.platform.adminUsers.messages.resetFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('pages.platform.adminUsers.messages.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  const roleMap: Record<string, string> = {
    system_admin: t('pages.platform.adminUsers.roles.systemAdmin'),
    platform_operator: t('pages.platform.adminUsers.roles.platformOperator'),
    carbon_specialist: t('pages.platform.adminUsers.roles.carbonSpecialist'),
  }

  return (
    <Card
      title={
        <Space>
          <span>{t('pages.platform.adminUsers.title')}</span>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            {t('pages.platform.adminUsers.buttons.create')}
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
          { title: t('pages.platform.adminUsers.table.columns.username'), dataIndex: 'username' },
          { title: t('pages.platform.adminUsers.table.columns.name'), dataIndex: 'name' },
          { title: t('pages.platform.adminUsers.table.columns.email'), dataIndex: 'email' },
          { title: t('pages.platform.adminUsers.table.columns.phone'), dataIndex: 'phone' },
          {
            title: t('pages.platform.adminUsers.table.columns.role'),
            dataIndex: 'role',
            render: (v) => roleMap[v] || v,
          },
          {
            title: t('pages.platform.adminUsers.table.columns.status'),
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? t('pages.platform.adminUsers.status.active') : t('pages.platform.adminUsers.status.disabled')}</Tag>,
          },
          {
            title: t('pages.platform.adminUsers.table.columns.actions'),
            render: (_, record) => (
              <Space>
                <Button onClick={() => toggleStatus(record)}>{record.status === 'active' ? t('pages.platform.adminUsers.buttons.disable') : t('pages.platform.adminUsers.buttons.enable')}</Button>
                <Button onClick={() => resetPassword(record)}>{t('pages.platform.adminUsers.buttons.resetPassword')}</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={t('pages.platform.adminUsers.modal.title')} open={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <Form layout="vertical" onFinish={handleCreate}>
          <Form.Item label={t('pages.platform.adminUsers.form.fields.username')} name="username" rules={[{ required: true, message: t('pages.platform.adminUsers.form.messages.usernameRequired') }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label={t('pages.platform.adminUsers.form.fields.password')}
            name="password"
            rules={[
              { required: true, message: t('pages.platform.adminUsers.form.messages.passwordRequired') },
              { min: 6, message: t('pages.platform.adminUsers.form.messages.passwordMin') }
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item label={t('pages.platform.adminUsers.form.fields.name')} name="name">
            <Input />
          </Form.Item>
          <Form.Item label={t('pages.platform.adminUsers.form.fields.email')} name="email" rules={[{ type: 'email', message: t('pages.platform.adminUsers.form.messages.emailInvalid') }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('pages.platform.adminUsers.form.fields.phone')} name="phone">
            <Input />
          </Form.Item>
          <Form.Item
            label={t('pages.platform.adminUsers.form.fields.role')}
            name="role"
            rules={[{ required: true, message: t('pages.platform.adminUsers.form.messages.roleRequired') }]}
            initialValue="platform_operator"
          >
            <Select options={roles} />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {t('common.create')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default AdminUsers


