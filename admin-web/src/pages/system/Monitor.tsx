import { systemAPI } from '@/services/cloudbase'
import { Card, Descriptions, Progress, Select, Table, message } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'

const Monitor: React.FC = () => {
  const [metrics, setMetrics] = useState<any>({})
  const [domainFilter, setDomainFilter] = useState<string | undefined>(undefined)

  const load = async () => {
    try {
      const res = await systemAPI.getSystemMetrics()
      if (res.code === 0) {
        setMetrics(res.data || {})
      } else {
        message.error(res.message || '加载失败')
      }
    } catch (e: any) {
      message.error(e.message || '加载失败')
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
    <Card title="系统监控" bordered={false}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <Select
          allowClear
          placeholder="按域筛选"
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
            { title: '集合', dataIndex: 'collection', width: 320 },
            { title: '域', dataIndex: 'domain', width: 140 },
            { title: '说明', dataIndex: 'description' },
            { title: '文档数', dataIndex: 'count', width: 120 },
          ]}
          scroll={{ y: 360 }}
        />
      </div>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="存储空间使用（模拟）">
          <Progress percent={32} />
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}

export default Monitor


