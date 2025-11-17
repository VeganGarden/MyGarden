import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  clearAll,
  markAllAsRead,
  markAsRead,
  removeNotification,
} from '@/store/slices/notificationSlice'
import {
  BellOutlined,
  CheckOutlined,
  ClearOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Badge, Button, Dropdown, Empty, List, Tag } from 'antd'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styles from './NotificationCenter.module.css'

/**
 * 通知中心组件
 */
const NotificationCenter: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { notifications, unreadCount } = useAppSelector(
    (state: any) => state.notification
  )

  // 按时间排序，未读的在前
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1
      }
      return b.timestamp - a.timestamp
    })
  }, [notifications])

  // 处理通知点击
  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      dispatch(markAsRead(notification.id))
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  // 处理删除通知
  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    dispatch(removeNotification(id))
  }

  // 获取通知类型图标和颜色
  const getNotificationType = (type: string) => {
    const types: Record<string, { color: string; icon: React.ReactNode }> = {
      info: { color: '#1890ff', icon: <InfoCircleOutlined /> },
      success: { color: '#52c41a', icon: <InfoCircleOutlined /> },
      warning: { color: '#faad14', icon: <InfoCircleOutlined /> },
      error: { color: '#f5222d', icon: <InfoCircleOutlined /> },
    }
    return types[type] || types.info
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return new Date(timestamp).toLocaleDateString()
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
              onClick={() => dispatch(markAllAsRead())}
            >
              {t('notification.markAllRead')}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={() => dispatch(clearAll())}
            >
              {t('notification.clearAll')}
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
            renderItem={(item) => {
              const typeInfo = getNotificationType(item.type)
              return (
                <List.Item
                  className={`${styles.notificationItem} ${
                    !item.read ? styles.unread : ''
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
                          {item.title}
                        </span>
                        {!item.read && (
                          <Tag color="blue" size="small">
                            {t('notification.unread')}
                          </Tag>
                        )}
                      </div>
                      <div className={styles.notificationMessage}>
                        {item.message}
                      </div>
                      <div className={styles.notificationTime}>
                        {formatTime(item.timestamp)}
                      </div>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<ClearOutlined />}
                      className={styles.removeButton}
                      onClick={(e) => handleRemove(e, item.id)}
                    />
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
              // 可以跳转到通知列表页面
              navigate('/notifications')
            }}
          >
            查看全部通知
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
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

