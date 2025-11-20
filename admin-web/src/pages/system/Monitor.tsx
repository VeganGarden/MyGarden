import { systemAPI } from '@/services/cloudbase'
import { Card, Descriptions, Progress, Select, Table, message } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const Monitor: React.FC = () => {
  const { t } = useTranslation()
  const [metrics, setMetrics] = useState<any>({})
  const [domainFilter, setDomainFilter] = useState<string | undefined>(undefined)

  const load = async () => {
    try {
      const res = await systemAPI.getSystemMetrics()
      if (res.code === 0) {
        setMetrics(res.data || {})
      } else {
        message.error(res.message || t('common.loadFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.loadFailed'))
    }
  }

  useEffect(() => {
    load()
  }, [])

  const domains = useMemo(() => {
    const list = metrics?.list || []
    const set = new Set<string>(list.map((i: any) => i.domain).filter(Boolean))
    return Array.from(set).sort()
  }, [metrics])

  const tableData = useMemo(() => {
    const list = (metrics?.list || []) as any[]
    if (!domainFilter) return list.sort((a, b) => a.collection.localeCompare(b.collection))
    return list.filter((i) => i.domain === domainFilter).sort((a, b) => a.collection.localeCompare(b.collection))
  }, [metrics, domainFilter])

  return (
    <Card title={t('pages.system.monitor.title')} bordered={false}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <Select
          allowClear
          placeholder={t('pages.system.monitor.filters.domain')}
          style={{ width: 220 }}
          options={domains.map((d) => ({ label: d, value: d }))}
          value={domainFilter}
          onChange={(v) => setDomainFilter(v)}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <Table
          size="small"
          pagination={false}
          rowKey="collection"
          dataSource={tableData}
          columns={[
            { title: t('pages.system.monitor.table.columns.collection'), dataIndex: 'collection', width: 320 },
            { title: t('pages.system.monitor.table.columns.domain'), dataIndex: 'domain', width: 140 },
            { title: t('pages.system.monitor.table.columns.description'), dataIndex: 'description' },
            { title: t('pages.system.monitor.table.columns.count'), dataIndex: 'count', width: 120 },
          ]}
          scroll={{ y: 360 }}
        />
      </div>
      <Descriptions bordered column={1}>
        <Descriptions.Item label={t('pages.system.monitor.storage.label')}>
          <Progress percent={32} />
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}

export default Monitor


