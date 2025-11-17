/**
 * 消息中心列表页
 */

import { messageAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  BellOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Badge, Button, Card, Empty, List, Select, Space, Tag, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

type UserMessage = {
  _id: string
  messageId: string
  userId: string
  status: 'sent' | 'read'
  readAt?: Date
  createdAt: Date
  message?: {
    _id: string
    title: string
    content: string
    type: 'business' | 'system'
    priority: 'urgent' | 'important' | 'normal'
    link?: string
    relatedEntityId?: string
    relatedEntityType?: string
    createdAt: Date
  }
}

const MessageListPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAppSelector((state: any) => state.auth)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<UserMessage[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'read'>('all')
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  })

  const loadMessages = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const result = await messageAPI.getUserMessages({
        userId: user.id,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: pagination.page,
        pageSize: pagination.pageSize,
      })

      if (result.code === 0) {
        setMessages(result.data?.messages || [])
        setPagination({
          ...pagination,
          total: result.data?.total || 0,
        })
      } else {
        message.error(result.message || t('common.loadFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [statusFilter, pagination.page, user?.id])

  // 轮询获取新消息（每30秒），仅在页面可见时轮询
  useEffect(() => {
    // 检查页面可见性 API 支持
    if (typeof document === 'undefined' || !document.visibilityState) {
      // 不支持可见性 API，使用普通轮询
      const interval = setInterval(() => {
        if (statusFilter === 'all' || statusFilter === 'sent') {
          loadMessages()
        }
      }, 30000) // 30秒
      return () => clearInterval(interval)
    }

    let interval: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (interval) return // 已启动
      interval = setInterval(() => {
        if (statusFilter === 'all' || statusFilter === 'sent') {
          loadMessages()
        }
      }, 30000) // 30秒
    }

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    // 初始加载
    if (!document.hidden) {
      startPolling()
    }

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
        // 页面变为可见时立即加载一次
        if (statusFilter === 'all' || statusFilter === 'sent') {
          loadMessages()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [statusFilter, user?.id])

  const handleMarkAsRead = async (userMessage: UserMessage) => {
    if (userMessage.status === 'read') return

    try {
      const result = await messageAPI.markAsRead({
        userMessageId: userMessage._id,
        messageId: userMessage.messageId,
      })

      if (result.code === 0) {
        // 更新本地状态
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === userMessage._id
              ? { ...msg, status: 'read' as const, readAt: new Date() }
              : msg
          )
        )
        message.success(t('common.success'))
      } else {
        message.error(result.message || t('common.updateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.updateFailed'))
    }
  }

  const handleMessageClick = async (userMessage: UserMessage) => {
    // 标记为已读
    if (userMessage.status === 'sent') {
      await handleMarkAsRead(userMessage)
    }

    // 跳转到详情页或相关页面
    if (userMessage.message?.link) {
      navigate(userMessage.message.link)
    } else {
      navigate(`/messages/${userMessage.messageId}`)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'important':
        return <InfoCircleOutlined style={{ color: '#faad14' }} />
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'business':
        return 'orange'
      case 'system':
        return 'blue'
      default:
        return 'default'
    }
  }

  const formatTime = (timestamp: Date | string | number) => {
    const date = dayjs(timestamp)
    const now = dayjs()
    const diff = now.diff(date, 'minute')

    if (diff < 1) return t('messages.justNow')
    if (diff < 60) return t('messages.minutesAgo', { count: diff })
    if (diff < 1440) return t('messages.hoursAgo', { count: Math.floor(diff / 60) })
    if (diff < 10080) return t('messages.daysAgo', { count: Math.floor(diff / 1440) })
    return date.format('YYYY-MM-DD HH:mm')
  }

  const unreadCount = messages.filter((m) => m.status === 'sent').length

  return (
    <Card
      title={
        <Space>
          <BellOutlined />
          <span>{t('messages.title')}</span>
          {unreadCount > 0 && <Badge count={unreadCount} />}
        </Space>
      }
      extra={
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 120 }}
        >
          <Select.Option value="all">{t('messages.filters.all')}</Select.Option>
          <Select.Option value="sent">{t('messages.filters.unread')}</Select.Option>
          <Select.Option value="read">{t('messages.filters.read')}</Select.Option>
        </Select>
      }
    >
      <List
        loading={loading}
        dataSource={messages}
        locale={{
          emptyText: <Empty description={t('messages.empty')} />,
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page) => setPagination({ ...pagination, page }),
          showSizeChanger: false,
        }}
        renderItem={(item) => {
          const msg = item.message
          if (!msg) return null

          return (
            <List.Item
              style={{
                cursor: 'pointer',
                backgroundColor: item.status === 'sent' ? '#f0f9ff' : 'transparent',
                padding: '16px',
                marginBottom: '8px',
                borderRadius: '4px',
              }}
              onClick={() => handleMessageClick(item)}
            >
              <List.Item.Meta
                avatar={
                  <Space direction="vertical" align="center" size="small">
                    {getPriorityIcon(msg.priority)}
                    {item.status === 'sent' && (
                      <Badge dot color="blue" />
                    )}
                  </Space>
                }
                title={
                  <Space>
                    <span style={{ fontWeight: item.status === 'sent' ? 'bold' : 'normal' }}>
                      {msg.title}
                    </span>
                    <Tag color={getTypeColor(msg.type)}>
                      {msg.type === 'business' ? t('messages.types.business') : t('messages.types.system')}
                    </Tag>
                    {msg.priority === 'urgent' && (
                      <Tag color="red">{t('messages.priority.urgent')}</Tag>
                    )}
                    {msg.priority === 'important' && (
                      <Tag color="orange">{t('messages.priority.important')}</Tag>
                    )}
                  </Space>
                }
                description={
                  <div>
                    <div style={{ marginBottom: '8px' }}>{msg.content}</div>
                    <Space size="small">
                      <ClockCircleOutlined />
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        {formatTime(item.createdAt)}
                      </span>
                      {item.status === 'sent' && (
                        <Button
                          type="link"
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(item)
                          }}
                        >
                          {t('messages.markAsRead')}
                        </Button>
                      )}
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )
        }}
      />
    </Card>
  )
}

export default MessageListPage

