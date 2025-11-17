import { systemAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Select, Space, Tag, Timeline } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ActivityLog {
  id: string
  type: 'login' | 'operation' | 'certification' | 'order' | 'menu'
  action: string
  description: string
  timestamp: string
  status?: 'success' | 'pending' | 'failed'
}

const Activity: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAppSelector((state: any) => state.auth)
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const fetchLogs = async (reset = false) => {
    if (!user?.username) {
      setActivities([])
      setTotal(0)
      return
    }
    setLoading(true)
    try {
      const res = await systemAPI.getAuditLogs({
        username: user.username,
        module: moduleFilter,
        page,
        pageSize,
      } as any)
      if (res.code === 0) {
        const list = (res.data?.list || []).map((x: any) => ({
          id: x._id,
          type: (x.module || 'operation') as ActivityLog['type'],
          action: x.action || '',
          description: x.description || '',
          timestamp: x.createdAt ? new Date(x.createdAt).toLocaleString() : '',
          status: x.status as ActivityLog['status'],
        }))
        setTotal(res.data?.total || list.length)
        setActivities((prev) => (reset ? list : [...prev, ...list]))
      } else {
        if (reset) setActivities([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchLogs(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentRestaurantId, moduleFilter])

  const onQuery = () => {
    setPage(1)
    fetchLogs(true)
  }

  const loadMore = async () => {
    const next = page + 1
    setPage(next)
    // 使用 next 页加载更多
    setLoading(true)
    try {
      const res = await systemAPI.getAuditLogs({
        username: user?.username,
        module: moduleFilter,
        page: next,
        pageSize,
      } as any)
      if (res.code === 0) {
        const list = (res.data?.list || []).map((x: any) => ({
          id: x._id,
          type: (x.module || 'operation') as ActivityLog['type'],
          action: x.action || '',
          description: x.description || '',
          timestamp: x.createdAt ? new Date(x.createdAt).toLocaleString() : '',
          status: x.status as ActivityLog['status'],
        }))
        setTotal(res.data?.total || total)
        setActivities((prev) => [...prev, ...list])
      }
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
      case 'certification':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'menu':
      case 'order':
      case 'operation':
        return <FileTextOutlined style={{ color: '#722ed1' }} />
      default:
        return <ClockCircleOutlined />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'blue'
      case 'certification':
        return 'green'
      case 'menu':
        return 'purple'
      case 'order':
        return 'orange'
      case 'operation':
        return 'cyan'
      default:
        return 'default'
    }
  }

  const getStatusTag = (status?: string) => {
    if (!status) return null
    const config: Record<string, { color: string; text: string }> = {
      success: { color: 'success', text: t('pages.profile.activity.status.success') },
      pending: { color: 'processing', text: t('pages.profile.activity.status.pending') },
      failed: { color: 'error', text: t('pages.profile.activity.status.failed') },
    }
    const cfg = config[status] || config.success
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  return (
    <div>
      <Card
        title={t('pages.profile.activity.title')}
        extra={
          <Space>
            <Select
              allowClear
              placeholder={t('pages.profile.activity.filters.module')}
              style={{ width: 180 }}
              options={[
                { label: 'system', value: 'system' },
                { label: 'platform', value: 'platform' },
                { label: 'tenant', value: 'tenant' },
                { label: 'carbon', value: 'carbon' },
                { label: 'recipe', value: 'recipe' },
              ]}
              value={moduleFilter}
              onChange={(v) => setModuleFilter(v)}
            />
            <Button onClick={onQuery} loading={loading}>{t('common.search')}</Button>
          </Space>
        }
      >
        {activities.length === 0 ? (
          <Empty description={t('pages.profile.activity.empty')} />
        ) : (
          <Timeline>
            {activities.map((activity) => (
              <Timeline.Item
                key={activity.id}
                dot={getActivityIcon(activity.type)}
                color={getActivityColor(activity.type)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      <Tag color={getActivityColor(activity.type)}>{activity.action}</Tag>
                      {getStatusTag(activity.status)}
                    </div>
                    <div style={{ color: '#666', marginBottom: 4 }}>{activity.description}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>{activity.timestamp}</div>
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
        {activities.length < total && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Button onClick={loadMore} loading={loading}>
              {t('pages.profile.activity.loadMore', { loaded: activities.length, total })}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Activity

