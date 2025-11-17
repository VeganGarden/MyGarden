import { systemAPI } from '@/services/cloudbase'
import { Button, Card, Input, Table, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const Audit: React.FC = () => {
  const { t } = useTranslation()
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

  return (
    <Card title={t('pages.system.audit.title')} bordered={false} bodyStyle={{ overflowX: 'auto' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' }}>
        <Input placeholder={t('pages.system.audit.filters.username')} allowClear onChange={(e) => setFilters((f) => ({ ...f, username: e.target.value }))} style={{ width: 180, minWidth: 160 }} />
        <Input placeholder={t('pages.system.audit.filters.action')} allowClear onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} style={{ width: 180, minWidth: 150 }} />
        <Input placeholder={t('pages.system.audit.filters.status')} allowClear onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={{ width: 160, minWidth: 140 }} />
        <Input placeholder={t('pages.system.audit.filters.module')} allowClear onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))} style={{ width: 160, minWidth: 140 }} />
        <Input placeholder={t('pages.system.audit.filters.tenantId')} allowClear onChange={(e) => setFilters((f) => ({ ...f, tenantId: e.target.value }))} style={{ width: 220, minWidth: 180 }} />
        <Button onClick={load} loading={loading} type="primary">
          {t('common.search')}
        </Button>
      </div>
      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: t('pages.system.audit.table.columns.time'), dataIndex: 'createdAt' },
          { title: t('pages.system.audit.table.columns.username'), dataIndex: 'username' },
          { title: t('pages.system.audit.table.columns.role'), dataIndex: 'role' },
          { title: t('pages.system.audit.table.columns.action'), dataIndex: 'action' },
          { title: t('pages.system.audit.table.columns.resource'), dataIndex: 'resource' },
          { title: t('pages.system.audit.table.columns.module'), dataIndex: 'module' },
          {
            title: t('pages.system.audit.table.columns.status'),
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'success' ? 'green' : 'red'}>{v || 'success'}</Tag>,
          },
          { title: t('pages.system.audit.table.columns.ip'), dataIndex: 'ip' },
        ]}
      />
    </Card>
  )
}

export default Audit


