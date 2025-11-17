import { adminUsersAPI } from '@/services/cloudbase'
import { Button, Card, Space, Table, Tag, message, Modal, Form, Input, Select } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const Users: React.FC = () => {
  const { t } = useTranslation()
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

  const toggleStatus = async (record: any) => {
    const next = record.status === 'active' ? 'disabled' : 'active'
    setLoading(true)
    try {
      const res = await adminUsersAPI.updateStatus(record._id, next)
      if (res.code === 0) {
        message.success(t('pages.system.users.messages.statusUpdated'))
        load()
      } else {
        message.error(res.message || t('common.operationFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (record: any) => {
    setLoading(true)
    try {
      const res = await adminUsersAPI.resetPassword(record._id)
      if (res.code === 0) {
        message.success(t('pages.system.users.messages.passwordReset', { password: res.data?.password }))
      } else {
        message.error(res.message || t('common.operationFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.operationFailed'))
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
        message.success(t('common.createSuccess'))
        setCreateOpen(false)
        form.resetFields()
        load()
      } else {
        message.error(res.message || t('common.createFailed'))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const roleOptions = [
    { label: t('pages.system.users.filters.roles.all'), value: '' },
    { label: t('pages.system.users.filters.roles.systemAdmin'), value: 'system_admin' },
    { label: t('pages.system.users.filters.roles.platformOperator'), value: 'platform_operator' },
    { label: t('pages.system.users.filters.roles.carbonSpecialist'), value: 'carbon_specialist' },
    { label: t('pages.system.users.filters.roles.governmentPartner'), value: 'government_partner' },
    { label: t('pages.system.users.filters.roles.restaurantAdmin'), value: 'restaurant_admin' },
  ]

  const createRoleOptions = [
    { label: t('pages.system.users.form.roles.platformOperator'), value: 'platform_operator' },
    { label: t('pages.system.users.form.roles.carbonSpecialist'), value: 'carbon_specialist' },
    { label: t('pages.system.users.form.roles.governmentPartner'), value: 'government_partner' },
  ]

  return (
    <Card
      title={t('pages.system.users.title')}
      bordered={false}
      extra={
        <Space>
          <Select
            allowClear
            placeholder={t('pages.system.users.filters.role')}
            style={{ width: 180 }}
            options={roleOptions}
            value={filters.role}
            onChange={(v) => setFilters((f) => ({ ...f, role: v || undefined }))}
          />
          <Select
            allowClear
            placeholder={t('pages.system.users.filters.status')}
            style={{ width: 140 }}
            options={[
              { label: 'active', value: 'active' },
              { label: 'disabled', value: 'disabled' },
            ]}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <Input
            allowClear
            placeholder={t('pages.system.users.filters.keyword')}
            style={{ width: 200 }}
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
          />
          <Button onClick={load} loading={loading}>{t('common.search')}</Button>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            {t('pages.system.users.buttons.create')}
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: t('pages.system.users.table.columns.username'), dataIndex: 'username' },
          { title: t('pages.system.users.table.columns.name'), dataIndex: 'name', render: (v: string) => v || '-' },
          { title: t('pages.system.users.table.columns.role'), dataIndex: 'role' },
          { title: t('pages.system.users.table.columns.tenantId'), dataIndex: 'tenantId', render: (v: string) => v || '-' },
          { title: t('pages.system.users.table.columns.restaurantCount'), dataIndex: 'restaurantCount', width: 100, render: (v: number) => v ?? 0 },
          {
            title: t('pages.system.users.table.columns.status'),
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v || 'active'}</Tag>,
          },
          {
            title: t('pages.system.users.table.columns.actions'),
            render: (_, record) => (
              <Space>
                <Button type="link" onClick={() => toggleStatus(record)}>
                  {record.status === 'active' ? t('pages.system.users.buttons.disable') : t('pages.system.users.buttons.enable')}
                </Button>
                <Button type="link" onClick={() => resetPassword(record)}>
                  {t('pages.system.users.buttons.resetPassword')}
                </Button>
                <Button type="link" danger onClick={() => adminUsersAPI.softDelete(record._id).then((res) => {
                  if (res.code === 0) {
                    message.success(t('common.deleteSuccess'))
                    load()
                  } else {
                    message.error(res.message || t('common.deleteFailed'))
                  }
                })}>
                  {t('common.delete')}
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={t('pages.system.users.modal.title')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t('pages.system.users.form.fields.username')}
            name="username"
            rules={[
              { required: true, message: t('pages.system.users.form.messages.usernameRequired') },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_\-]{3,20}$/, message: t('pages.system.users.form.messages.usernamePattern') },
            ]}
          >
            <Input placeholder={t('pages.system.users.form.placeholders.username')} />
          </Form.Item>
          <Form.Item
            label={t('pages.system.users.form.fields.password')}
            name="password"
            rules={[
              { required: true, message: t('pages.system.users.form.messages.passwordRequired') },
              { min: 6, message: t('pages.system.users.form.messages.passwordMin') }
            ]}
          >
            <Input.Password placeholder={t('pages.system.users.form.placeholders.password')} />
          </Form.Item>
          <Form.Item label={t('pages.system.users.form.fields.name')} name="name">
            <Input placeholder={t('common.optional')} />
          </Form.Item>
          <Form.Item label={t('pages.system.users.form.fields.email')} name="email" rules={[{ type: 'email', message: t('pages.system.users.form.messages.emailInvalid') }]}>
            <Input placeholder={t('common.optional')} />
          </Form.Item>
          <Form.Item label={t('pages.system.users.form.fields.phone')} name="phone">
            <Input placeholder={t('common.optional')} />
          </Form.Item>
          <Form.Item
            label={t('pages.system.users.form.fields.role')}
            name="role"
            initialValue="platform_operator"
            rules={[{ required: true, message: t('pages.system.users.form.messages.roleRequired') }]}
          >
            <Select options={createRoleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default Users


