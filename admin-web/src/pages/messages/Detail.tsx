/**
 * 消息详情页
 */

import { messageAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { Button, Card, Descriptions, Empty, Space, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'

type Message = {
  _id: string
  title: string
  content: string
  type: 'business' | 'system'
  priority: 'urgent' | 'important' | 'normal'
  status: string
  link?: string
  relatedEntityId?: string
  relatedEntityType?: string
  createdAt: Date
  sentAt?: Date
}

const MessageDetailPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { messageId } = useParams<{ messageId: string }>()
  const { user } = useAppSelector((state: any) => state.auth)
  const [loading, setLoading] = useState(false)
  const [messageData, setMessageData] = useState<Message | null>(null)
  const [isRead, setIsRead] = useState(false)

  useEffect(() => {
    if (!messageId) return

    loadMessage()
    loadUserMessage()
  }, [messageId, user?.id])

  const loadMessage = async () => {
    if (!messageId) {
      console.error('消息ID为空')
      message.error('消息ID不能为空')
      setTimeout(() => {
        navigate('/messages')
      }, 1500)
      return
    }

    setLoading(true)
    try {
      console.log('加载消息详情，messageId:', messageId)
      const result = await messageAPI.getMessage(messageId)
      console.log('消息详情API返回:', result)
      
      if (result.code === 0 && result.data) {
        setMessageData(result.data)
        console.log('消息数据已设置:', result.data)
      } else {
        console.error('消息不存在或加载失败:', result.message)
        message.error(result.message || t('common.loadFailed') || '加载失败')
        // 如果消息不存在，跳转回列表页
        setTimeout(() => {
          navigate('/messages')
        }, 2000)
      }
    } catch (error: any) {
      console.error('加载消息详情失败:', error)
      message.error(error.message || t('common.loadFailed') || '加载失败')
      // 发生错误时，跳转回列表页
      setTimeout(() => {
        navigate('/messages')
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  const loadUserMessage = async () => {
    if (!messageId || !user?.id) return

    try {
      const result = await messageAPI.getUserMessages({
        userId: user.id,
        page: 1,
        pageSize: 100,
      })

      if (result.code === 0) {
        const userMsg = result.data?.messages?.find(
          (m: any) => m.messageId === messageId
        )
        if (userMsg) {
          setIsRead(userMsg.status === 'read')
        }
      }
    } catch (error) {
      // 静默处理
    }
  }

  const handleMarkAsRead = async () => {
    if (!messageId || !user?.id || isRead) return

    try {
      const result = await messageAPI.markAsRead({
        messageId,
        userId: user.id,
      })

      if (result.code === 0) {
        setIsRead(true)
        message.success(t('messages.markAsReadSuccess'))
      } else {
        message.error(result.message || t('common.updateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.updateFailed'))
    }
  }

  const handleGoToLink = () => {
    if (messageData?.link) {
      navigate(messageData.link)
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

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <Card loading={true}>
        <div style={{ minHeight: '400px' }} />
      </Card>
    )
  }

  // 如果消息数据不存在，显示空状态
  if (!messageData) {
    return (
      <Card>
        <Empty 
          description={t('messages.notFound') || '消息不存在'}
          style={{ padding: '60px 0' }}
        >
          <Button type="primary" onClick={() => navigate('/messages')}>
            返回消息列表
          </Button>
        </Empty>
      </Card>
    )
  }

  return (
    <Card
      title={
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/messages')}
          >
            {t('common.back')}
          </Button>
          <span>{t('messages.detail')}</span>
        </Space>
      }
      extra={
        <Space>
          {!isRead && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleMarkAsRead}
            >
              {t('messages.markAsRead')}
            </Button>
          )}
          {messageData.link && (
            <Button type="primary" onClick={handleGoToLink}>
              {t('messages.goToRelated')}
            </Button>
          )}
        </Space>
      }
    >
      <div style={{ marginBottom: '24px' }}>
        <Space>
          {getPriorityIcon(messageData.priority)}
          <h2 style={{ margin: 0 }}>{messageData.title}</h2>
          <Tag color={getTypeColor(messageData.type)}>
            {messageData.type === 'business'
              ? t('messages.types.business')
              : t('messages.types.system')}
          </Tag>
          {messageData.priority === 'urgent' && (
            <Tag color="red">{t('messages.priority.urgent')}</Tag>
          )}
          {messageData.priority === 'important' && (
            <Tag color="orange">{t('messages.priority.important')}</Tag>
          )}
        </Space>
      </div>

      <div
        style={{
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          marginBottom: '24px',
          whiteSpace: 'pre-wrap',
        }}
      >
        {messageData.content}
      </div>

      <Descriptions bordered column={2}>
        <Descriptions.Item label={t('messages.detail.status')}>
          <Tag color={messageData.status === 'sent' ? 'green' : 'default'}>
            {messageData.status === 'sent'
              ? t('messages.status.sent')
              : t('messages.status.draft')}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('messages.detail.createdAt')}>
          {dayjs(messageData.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        {messageData.sentAt && (
          <Descriptions.Item label={t('messages.detail.sentAt')}>
            {dayjs(messageData.sentAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        )}
        {messageData.relatedEntityType && (
          <Descriptions.Item label={t('messages.detail.relatedEntity')}>
            {messageData.relatedEntityType}: {messageData.relatedEntityId}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  )
}

export default MessageDetailPage

