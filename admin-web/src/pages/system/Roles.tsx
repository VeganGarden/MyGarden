import { systemAPI } from '@/services/cloudbase'
import { Button, Card, Modal, Space, Table, Tag, Form, Input, message, Tree } from 'antd'
import React, { useEffect, useState } from 'react'

const Roles: React.FC = () => {
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
        message.success('创建成功')
        setCreateOpen(false)
        form.resetFields()
        load()
      } else {
        message.error(res.message || '创建失败')
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
        message.success('已更新权限')
        setPermOpen({ open: false })
        setCheckedPerms([])
        load()
      } else {
        message.error(res.message || '更新失败')
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

  return (
    <Card
      title="角色权限配置"
      bordered={false}
      extra={
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          新建角色
        </Button>
      }
    >
      <Table
        rowKey="roleCode"
        loading={loading}
        dataSource={data}
        columns={[
          { title: '角色代码', dataIndex: 'roleCode' },
          { title: '角色名称', dataIndex: 'roleName' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v || 'active'}</Tag>,
          },
          {
            title: '操作',
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
                  编辑权限
                </Button>
                <Button type="link" onClick={() => toggleStatus(record)}>
                  {record.status === 'active' ? '禁用' : '启用'}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="新建角色"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="roleCode" label="角色代码" rules={[{ required: true, message: '请输入角色代码' }]}>
            <Input placeholder="例如: custom_role" />
          </Form.Item>
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="角色中文名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
          <Form.Item name="permissions" label="初始权限(逗号分隔)">
            <Input placeholder="例如: system:user:manage,system:role:manage" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`编辑权限 - ${permOpen.role?.roleCode || ''}`}
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


