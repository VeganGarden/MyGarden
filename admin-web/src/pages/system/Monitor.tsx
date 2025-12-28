import { systemAPI } from '@/services/cloudbase'
import { Card, Descriptions, Select, Table, message, Spin, Statistic, Row, Col } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const Monitor: React.FC = () => {
  const { t } = useTranslation()
  const [metrics, setMetrics] = useState<any>({})
  const [domainFilter, setDomainFilter] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await systemAPI.getSystemMetrics()
      if (res.code === 0) {
        setMetrics(res.data || {})
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

  // 获取所有域列表
  const domains = useMemo(() => {
    const list = metrics?.list || []
    const domainSet = new Set<string>(list.map((i: any) => i.domain).filter(Boolean))
    return Array.from(domainSet).sort()
  }, [metrics])

  // 过滤和排序表格数据
  const tableData = useMemo(() => {
    const list = (metrics?.list || []) as any[]
    let filtered = domainFilter 
      ? list.filter((i) => i.domain === domainFilter)
      : list
    return filtered.sort((a, b) => a.collection.localeCompare(b.collection))
  }, [metrics, domainFilter])

  // 计算统计信息
  const stats = useMemo(() => {
    const list = (metrics?.list || []) as any[]
    const totalCollections = list.length
    const totalDocuments = list.reduce((sum, item) => sum + (item.count || 0), 0)
    
    // 按域统计集合数和文档数
    const domainStats = list.reduce((acc: Record<string, { collections: number; documents: number }>, item) => {
      const domain = item.domain || '未知'
      if (!acc[domain]) {
        acc[domain] = { collections: 0, documents: 0 }
      }
      acc[domain].collections += 1
      acc[domain].documents += (item.count || 0)
      return acc
    }, {})

    return {
      totalCollections,
      totalDocuments,
      domainStats,
    }
  }, [metrics])

  // 格式化数字显示
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`
    }
    return num.toLocaleString()
  }

  return (
    <Card title={t('pages.system.monitor.title')} bordered={false}>
      <Spin spinning={loading}>
        {/* 统计信息卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title={t('pages.system.monitor.stats.totalCollections')}
                value={stats.totalCollections}
                suffix="个"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={t('pages.system.monitor.stats.totalDocuments')}
                value={stats.totalDocuments}
                formatter={(value) => formatNumber(Number(value))}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={t('pages.system.monitor.stats.collectionsByDomain')}
                value={Object.keys(stats.domainStats).length}
                suffix="个域"
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选器 */}
        <div style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder={t('pages.system.monitor.filters.domain')}
            style={{ width: 220 }}
            options={domains.map((d) => ({ label: d, value: d }))}
            value={domainFilter}
            onChange={(v) => setDomainFilter(v)}
          />
        </div>

        {/* 数据表格 */}
        <Table
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
          rowKey="collection"
          dataSource={tableData}
          columns={[
            { 
              title: t('pages.system.monitor.table.columns.collection'), 
              dataIndex: 'collection', 
              width: 280,
              fixed: 'left',
            },
            { 
              title: t('pages.system.monitor.table.columns.domain'), 
              dataIndex: 'domain', 
              width: 150,
            },
            { 
              title: t('pages.system.monitor.table.columns.description'), 
              dataIndex: 'description',
              ellipsis: true,
            },
            { 
              title: t('pages.system.monitor.table.columns.count'), 
              dataIndex: 'count', 
              width: 120,
              align: 'right',
              render: (count: number) => formatNumber(count),
              sorter: (a: any, b: any) => (a.count || 0) - (b.count || 0),
            },
          ]}
          scroll={{ x: 'max-content', y: 500 }}
        />

        {/* 按域统计详情 */}
        {Object.keys(stats.domainStats).length > 0 && (
          <Card 
            title={t('pages.system.monitor.stats.collectionsByDomain')} 
            style={{ marginTop: 16 }}
            size="small"
          >
            <Descriptions bordered column={3} size="small">
              {Object.entries(stats.domainStats)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([domain, stat]) => (
                  <Descriptions.Item key={domain} label={domain}>
                    {stat.collections} 个集合，{formatNumber(stat.documents)} 个文档
                  </Descriptions.Item>
                ))}
            </Descriptions>
          </Card>
        )}
      </Spin>
    </Card>
  )
}

export default Monitor


