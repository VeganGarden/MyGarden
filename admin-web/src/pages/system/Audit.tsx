import { systemAPI } from '@/services/cloudbase'
import { Button, Card, Input, Table, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'

const Audit: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [filters, setFilters] = useState<{ username?: string; action?: string; status?: string; module?: string; tenantId?: string }>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await systemAPI.getAuditLogs(filters)
      if (res.code === 0) {
        setData(res.data?.list || [])
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

  return (
    <Card title="审计日志" bordered={false} bodyStyle={{ overflowX: 'auto' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' }}>
        <Input placeholder="用户名" allowClear onChange={(e) => setFilters((f) => ({ ...f, username: e.target.value }))} style={{ width: 180, minWidth: 160 }} />
        <Input placeholder="动作" allowClear onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} style={{ width: 180, minWidth: 150 }} />
        <Input placeholder="状态" allowClear onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={{ width: 160, minWidth: 140 }} />
        <Input placeholder="模块" allowClear onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))} style={{ width: 160, minWidth: 140 }} />
        <Input placeholder="租户ID" allowClear onChange={(e) => setFilters((f) => ({ ...f, tenantId: e.target.value }))} style={{ width: 220, minWidth: 180 }} />
        <Button onClick={load} loading={loading} type="primary">
          查询
        </Button>
      </div>
      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: '时间', dataIndex: 'createdAt' },
          { title: '用户', dataIndex: 'username' },
          { title: '角色', dataIndex: 'role' },
          { title: '动作', dataIndex: 'action' },
          { title: '资源', dataIndex: 'resource' },
          { title: '模块', dataIndex: 'module' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'success' ? 'green' : 'red'}>{v || 'success'}</Tag>,
          },
          { title: 'IP', dataIndex: 'ip' },
        ]}
      />
    </Card>
  )
}

export default Audit


