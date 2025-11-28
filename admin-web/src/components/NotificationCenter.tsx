import { messageAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  BellOutlined,
  CheckOutlined,
  ClearOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Badge, Button, Dropdown, Empty, List, Tag, message as antdMessage } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styles from './NotificationCenter.module.css'
import dayjs from 'dayjs'

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
    createdAt: Date
  }
}

/**
 * 通知中心组件
 * 集成真实的消息API，支持轮询更新
 */
const NotificationCenter: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAppSelector((state: any) => state.auth)
  const [notifications, setNotifications] = useState<UserMessage[]>([])
  const [loading, setLoading] = useState(false)

  // 加载消息列表（最近10条）
  const loadMessages = async () => {
    if (!user?.id) return

    try {
      const result = await messageAPI.getUserMessages({
        userId: user.id,
        page: 1,
        pageSize: 10,
      })

      if (result.code === 0) {
        setNotifications(result.data?.messages || [])
      }
    } catch (error) {
      // 静默处理错误，不显示提示
    }
  }

  // 初始加载
  useEffect(() => {
    loadMessages()
  }, [user?.id])

  // 轮询更新（每30秒），仅在页面可见时轮询
  useEffect(() => {
    // 检查页面可见性 API 支持
    if (typeof document === 'undefined' || !document.visibilityState) {
      // 不支持可见性 API，使用普通轮询
      const interval = setInterval(() => {
        loadMessages()
      }, 30000) // 30秒
      return () => clearInterval(interval)
    }

    let interval: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (interval) return // 已启动
      interval = setInterval(() => {
        loadMessages()
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
        loadMessages()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id])

  // 未读消息数量
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => n.status === 'sent').length
  }, [notifications])

  // 按时间排序，未读的在前
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'sent' ? -1 : 1
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [notifications])

  // 处理通知点击
  const handleNotificationClick = async (userMessage: UserMessage) => {
    // 标记为已读
    if (userMessage.status === 'sent') {
      try {
        await messageAPI.markAsRead({
          userMessageId: userMessage._id,
          messageId: userMessage.messageId,
          userId: user?.id || user?._id, // 确保传递userId
        })
        // 更新本地状态
        setNotifications((prev) =>
          prev.map((msg) =>
            msg._id === userMessage._id
              ? { ...msg, status: 'read' as const, readAt: new Date() }
              : msg
          )
        )
      } catch (error) {
        console.error('标记已读失败:', error)
        // 静默处理，继续跳转
      }
    }

    // 跳转逻辑
    if (userMessage.message?.link) {
      // 如果有link，直接跳转
      navigate(userMessage.message.link)
    } else if (userMessage.messageId) {
      // 如果有messageId，跳转到消息详情页
      navigate(`/messages/${userMessage.messageId}`)
    } else if (userMessage.message?._id) {
      // 如果message对象有_id，使用它
      navigate(`/messages/${userMessage.message._id}`)
    } else {
      // 如果都没有，跳转到消息列表页
      antdMessage.warning('消息链接无效，已跳转到消息列表')
      navigate('/messages')
    }
  }

  // 处理全部标记为已读
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return

    if (!user?.id && !user?._id) {
      antdMessage.error('用户信息缺失，无法标记已读')
      return
    }

    setLoading(true)
    try {
      // 使用批量标记API
      const result = await messageAPI.markAllAsRead({
        userId: user?.id || user?._id,
      })

      if (result.code === 0) {
        // 重新加载消息列表以确保数据同步
        await loadMessages()
        antdMessage.success(t('notification.markAllReadSuccess'))
      } else {
        antdMessage.error(result.message || t('common.updateFailed'))
      }
    } catch (error: any) {
      console.error('标记全部已读失败:', error)
      antdMessage.error(error.message || t('common.updateFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 获取通知类型图标和颜色
  const getNotificationType = (msg: UserMessage['message']) => {
    if (!msg) return { color: '#1890ff', icon: <InfoCircleOutlined /> }

    const priority = msg.priority
    if (priority === 'urgent') {
      return { color: '#ff4d4f', icon: <InfoCircleOutlined /> }
    }
    if (priority === 'important') {
      return { color: '#faad14', icon: <InfoCircleOutlined /> }
    }
    return { color: '#1890ff', icon: <InfoCircleOutlined /> }
  }

  // 格式化时间
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

  // 下拉菜单内容
  const dropdownContent = (
    <div className={styles.notificationPanel}>
      <div className={styles.notificationHeader}>
        <span className={styles.notificationTitle}>{t('notification.title')}</span>
        <div className={styles.notificationActions}>
          {unreadCount > 0 && (
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={handleMarkAllAsRead}
              loading={loading}
            >
              {t('notification.markAllRead')}
            </Button>
          )}
        </div>
      </div>
      <div className={styles.notificationList}>
        {sortedNotifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('notification.empty')}
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={sortedNotifications}
            loading={loading}
            renderItem={(item) => {
              if (!item.message) return null
              const typeInfo = getNotificationType(item.message)
              return (
                <List.Item
                  className={`${styles.notificationItem} ${
                    item.status === 'sent' ? styles.unread : ''
                  }`}
                  onClick={() => handleNotificationClick(item)}
                >
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationIcon}>
                      <span
                        style={{
                          color: typeInfo.color,
                          fontSize: 16,
                        }}
                      >
                        {typeInfo.icon}
                      </span>
                    </div>
                    <div className={styles.notificationBody}>
                      <div className={styles.notificationTitleRow}>
                        <span className={styles.notificationTitleText}>
                          {item.message.title}
                        </span>
                        {item.status === 'sent' && (
                          <Tag color="blue">
                            {t('notification.unread')}
                          </Tag>
                        )}
                      </div>
                      <div className={styles.notificationMessage}>
                        {item.message.content}
                      </div>
                      <div className={styles.notificationTime}>
                        {formatTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </div>
      {sortedNotifications.length > 0 && (
        <div className={styles.notificationFooter}>
          <Button
            type="link"
            block
            onClick={() => {
              navigate('/messages')
            }}
          >
            {t('messages.viewAll')}
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Dropdown
      popupRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
      overlayClassName={styles.notificationDropdown}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Button
          type="text"
          icon={<BellOutlined />}
          className={styles.notificationButton}
          title={t('notification.title')}
        />
      </Badge>
    </Dropdown>
  )
}

export default NotificationCenter

