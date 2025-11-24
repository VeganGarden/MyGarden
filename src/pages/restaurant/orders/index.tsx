import React, { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface Order {
  id: string
  orderNo: string
  customerName: string
  amount: number
  status: 'pending' | 'accepted' | 'preparing' | 'completed' | 'cancelled'
  items: Array<{ name: string; quantity: number; price: number }>
  createdAt: string
}

const RestaurantOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'today' | 'pending'>('today')

  useEffect(() => {
    loadOrders()
    // 设置定时刷新
    const timer = setInterval(() => {
      loadOrders()
    }, 30000) // 每30秒刷新一次

    return () => clearInterval(timer)
  }, [activeTab])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const result = await Taro.cloud.callFunction({
        name: 'tenant',
        data: {
          action: 'listOrders',
          data: {
            restaurantId: Taro.getStorageSync('currentRestaurantId'),
            status: activeTab === 'pending' ? 'pending' : undefined,
            page: 1,
            pageSize: 50,
          },
        },
      })

      if (result.result && result.result.code === 0) {
        setOrders(result.result.data || [])
      }
    } catch (error) {
      console.error('加载订单失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const result = await Taro.cloud.callFunction({
        name: 'restaurant-operation',
        data: {
          action: 'updateOrderStatus',
          data: {
            orderId,
            status,
          },
        },
      })

      if (result.result && result.result.code === 0) {
        Taro.showToast({
          title: '更新成功',
          icon: 'success',
        })
        loadOrders()
      } else {
        throw new Error(result.result?.message || '更新失败')
      }
    } catch (error) {
      console.error('更新订单状态失败:', error)
      Taro.showToast({
        title: '更新失败',
        icon: 'none',
      })
    }
  }

  const handleViewOrderDetail = (order: Order) => {
    Taro.navigateTo({
      url: `/pages/restaurant/orders/detail?id=${order.id}`,
    })
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待接单',
      accepted: '已接单',
      preparing: '制作中',
      completed: '已完成',
      cancelled: '已取消',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: '#ff9800',
      accepted: '#2196f3',
      preparing: '#9c27b0',
      completed: '#4caf50',
      cancelled: '#f44336',
    }
    return colorMap[status] || '#666'
  }

  return (
    <View className="restaurant-orders">
      <View className="tabs">
        <View
          className={`tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          今日订单
        </View>
        <View
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          待处理
        </View>
      </View>

      <ScrollView className="orders-list" scrollY>
        {orders.length === 0 ? (
          <View className="empty-state">
            <Text>暂无订单</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} className="order-card">
              <View className="order-header">
                <Text className="order-no">订单号: {order.orderNo}</Text>
                <View
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  <Text className="status-text">{getStatusText(order.status)}</Text>
                </View>
              </View>

              <View className="order-info">
                <Text className="customer-name">客户: {order.customerName}</Text>
                <Text className="order-amount">¥{order.amount.toFixed(2)}</Text>
              </View>

              <View className="order-items">
                {order.items.slice(0, 3).map((item, idx) => (
                  <Text key={idx} className="item-text">
                    {item.name} x{item.quantity}
                  </Text>
                ))}
                {order.items.length > 3 && (
                  <Text className="item-text">等{order.items.length}项</Text>
                )}
              </View>

              <View className="order-time">
                <Text>{new Date(order.createdAt).toLocaleString('zh-CN')}</Text>
              </View>

              <View className="order-actions">
                {order.status === 'pending' && (
                  <>
                    <Button
                      className="action-btn accept"
                      onClick={() => handleUpdateOrderStatus(order.id, 'accepted')}
                    >
                      接单
                    </Button>
                    <Button
                      className="action-btn reject"
                      onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                    >
                      拒单
                    </Button>
                  </>
                )}
                {order.status === 'accepted' && (
                  <Button
                    className="action-btn preparing"
                    onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                  >
                    开始制作
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button
                    className="action-btn complete"
                    onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                  >
                    完成
                  </Button>
                )}
                <Button
                  className="action-btn detail"
                  onClick={() => handleViewOrderDetail(order)}
                >
                  详情
                </Button>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

export default RestaurantOrders

