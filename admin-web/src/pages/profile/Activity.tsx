import { useAppSelector } from '@/store/hooks'
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import { Card, Empty, Tag, Timeline } from 'antd'
import React, { useEffect, useState } from 'react'

interface ActivityLog {
  id: string
  type: 'login' | 'operation' | 'certification' | 'order' | 'menu'
  action: string
  description: string
  timestamp: string
  status?: 'success' | 'pending' | 'failed'
}

const Activity: React.FC = () => {
  const { user } = useAppSelector((state: any) => state.auth)
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [activities, setActivities] = useState<ActivityLog[]>([])

  useEffect(() => {
    // TODO: 从API获取活动日志
    // const result = await userAPI.getActivityLogs({
    //   userId: user?.id,
    //   restaurantId: currentRestaurantId,
    // })
    // setActivities(result)
    
    // 模拟数据
    const mockActivities: ActivityLog[] = [
      {
        id: '1',
        type: 'login',
        action: '登录系统',
        description: '成功登录系统',
        timestamp: '2025-01-20 09:30:00',
        status: 'success',
      },
      {
        id: '2',
        type: 'certification',
        action: '提交认证申请',
        description: '为素开心餐厅提交了气候餐厅认证申请',
        timestamp: '2025-01-19 14:20:00',
        status: 'pending',
      },
      {
        id: '3',
        type: 'menu',
        action: '添加菜单',
        description: '在素开心餐厅添加了5道新菜品',
        timestamp: '2025-01-18 16:45:00',
        status: 'success',
      },
      {
        id: '4',
        type: 'order',
        action: '处理订单',
        description: '处理了10笔订单',
        timestamp: '2025-01-17 11:20:00',
        status: 'success',
      },
      {
        id: '5',
        type: 'operation',
        action: '修改个人信息',
        description: '更新了个人邮箱和手机号',
        timestamp: '2025-01-16 10:15:00',
        status: 'success',
      },
    ]
    setActivities(mockActivities)
  }, [user, currentRestaurantId])

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
      success: { color: 'success', text: '成功' },
      pending: { color: 'processing', text: '进行中' },
      failed: { color: 'error', text: '失败' },
    }
    const cfg = config[status] || config.success
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  return (
    <div>
      <Card title="活动日志">
        {activities.length === 0 ? (
          <Empty description="暂无活动记录" />
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
      </Card>
    </div>
  )
}

export default Activity

