import { systemAPI } from '@/services/cloudbase'
import { Button, Card, Modal, Space, Table, Tag, Form, Input, message, Tree } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const Roles: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [permOpen, setPermOpen] = useState<{ open: boolean; role?: any }>({ open: false })
  const [form] = Form.useForm()
  const [permForm] = Form.useForm()
  const [permTree, setPermTree] = useState<any[]>([])
  const [checkedPerms, setCheckedPerms] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const res = await systemAPI.listRoleConfigs()
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

  const loadPerms = async () => {
    const res = await systemAPI.listPermissions()
    if (res.code === 0) {
      setPermTree(res.data?.tree || [])
    }
  }

  const onCreate = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const res = await systemAPI.createRoleConfig({
        roleCode: values.roleCode,
        roleName: values.roleName,
        description: values.description,
        permissions: (values.permissions || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s),
        status: 'active',
      })
      if (res.code === 0) {
        message.success(t('common.createSuccess'))
        setCreateOpen(false)
        form.resetFields()
        load()
      } else {
        message.error(res.message || t('common.createFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const onUpdatePerm = async () => {
    try {
      setLoading(true)
      const res = await systemAPI.updateRolePermissions(permOpen.role.roleCode, checkedPerms)
      if (res.code === 0) {
        message.success(t('pages.system.roles.messages.permissionsUpdated'))
        setPermOpen({ open: false })
        setCheckedPerms([])
        load()
      } else {
        message.error(res.message || t('common.updateFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (record: any) => {
    const next = record.status === 'active' ? 'inactive' : 'active'
    setLoading(true)
    try {
      const res = await systemAPI.updateRoleStatus(record.roleCode, next)
      if (res.code === 0) {
        message.success(t('pages.system.roles.messages.statusUpdated'))
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

  return (
    <Card
      title={t('pages.system.roles.title')}
      bordered={false}
      extra={
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          {t('pages.system.roles.buttons.create')}
        </Button>
      }
    >
      <Table
        rowKey="roleCode"
        loading={loading}
        dataSource={data}
        columns={[
          { title: t('pages.system.roles.table.columns.roleCode'), dataIndex: 'roleCode' },
          { title: t('pages.system.roles.table.columns.roleName'), dataIndex: 'roleName' },
          {
            title: t('pages.system.roles.table.columns.status'),
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v || 'active'}</Tag>,
          },
          {
            title: t('pages.system.roles.table.columns.actions'),
            render: (_, record) => (
              <Space>
                <Button
                  type="link"
                  onClick={() => {
                    loadPerms()
                    setPermOpen({ open: true, role: record })
                    setCheckedPerms(record.permissions || [])
                  }}
                >
                  {t('pages.system.roles.buttons.editPermissions')}
                </Button>
                <Button type="link" onClick={() => toggleStatus(record)}>
                  {record.status === 'active' ? t('pages.system.roles.buttons.disable') : t('pages.system.roles.buttons.enable')}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={t('pages.system.roles.modal.create.title')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="roleCode" label={t('pages.system.roles.form.fields.roleCode')} rules={[{ required: true, message: t('pages.system.roles.form.messages.roleCodeRequired') }]}>
            <Input placeholder={t('pages.system.roles.form.placeholders.roleCode')} />
          </Form.Item>
          <Form.Item name="roleName" label={t('pages.system.roles.form.fields.roleName')} rules={[{ required: true, message: t('pages.system.roles.form.messages.roleNameRequired') }]}>
            <Input placeholder={t('pages.system.roles.form.placeholders.roleName')} />
          </Form.Item>
          <Form.Item name="description" label={t('pages.system.roles.form.fields.description')}>
            <Input.TextArea rows={3} placeholder={t('common.optional')} />
          </Form.Item>
          <Form.Item name="permissions" label={t('pages.system.roles.form.fields.permissions')}>
            <Input placeholder={t('pages.system.roles.form.placeholders.permissions')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('pages.system.roles.modal.editPermissions.title', { roleCode: permOpen.role?.roleCode || '' })}
        open={permOpen.open}
        onCancel={() => setPermOpen({ open: false })}
        onOk={onUpdatePerm}
        confirmLoading={loading}
      >
        <Tree
          checkable
          defaultExpandAll
          treeData={permTree}
          checkedKeys={checkedPerms}
          onCheck={(keys: any) => {
            const arr = Array.isArray(keys) ? keys : keys.checked
            // 只保留叶子节点（权限码）
            const leaf = arr.filter((k: string) => k.includes(':'))
            setCheckedPerms(leaf)
          }}
        />
      </Modal>
    </Card>
  )
}

export default Roles


