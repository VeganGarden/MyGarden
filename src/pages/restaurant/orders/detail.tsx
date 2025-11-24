import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './detail.scss'

interface OrderDetail {
  id: string
  orderNo: string
  customerName: string
  customerPhone?: string
  amount: number
  status: string
  items: Array<{ name: string; quantity: number; price: number }>
  createdAt: string
  address?: string
  remark?: string
}

const OrderDetail: React.FC = () => {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orderId = Taro.getCurrentInstance().router?.params?.id
    if (orderId) {
      loadOrderDetail(orderId)
    }
  }, [])

  const loadOrderDetail = async (orderId: string) => {
    try {
      setLoading(true)
      const result = await Taro.cloud.callFunction({
        name: 'tenant',
        data: {
          action: 'getOrder',
          data: { orderId },
        },
      })

      if (result.result && result.result.code === 0) {
        setOrder(result.result.data)
      }
    } catch (error) {
      console.error('加载订单详情失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className="order-detail">
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!order) {
    return (
      <View className="order-detail">
        <Text>订单不存在</Text>
      </View>
    )
  }

  return (
    <ScrollView className="order-detail" scrollY>
      <View className="detail-section">
        <Text className="section-title">订单信息</Text>
        <View className="info-item">
          <Text className="label">订单号:</Text>
          <Text className="value">{order.orderNo}</Text>
        </View>
        <View className="info-item">
          <Text className="label">客户:</Text>
          <Text className="value">{order.customerName}</Text>
        </View>
        {order.customerPhone && (
          <View className="info-item">
            <Text className="label">联系电话:</Text>
            <Text className="value">{order.customerPhone}</Text>
          </View>
        )}
        <View className="info-item">
          <Text className="label">订单状态:</Text>
          <Text className="value">{order.status}</Text>
        </View>
        <View className="info-item">
          <Text className="label">订单时间:</Text>
          <Text className="value">
            {new Date(order.createdAt).toLocaleString('zh-CN')}
          </Text>
        </View>
        <View className="info-item">
          <Text className="label">订单金额:</Text>
          <Text className="value amount">¥{order.amount.toFixed(2)}</Text>
        </View>
      </View>

      <View className="detail-section">
        <Text className="section-title">订单明细</Text>
        {order.items.map((item, idx) => (
          <View key={idx} className="item-row">
            <Text className="item-name">{item.name}</Text>
            <Text className="item-quantity">x{item.quantity}</Text>
            <Text className="item-price">¥{(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
        <View className="item-row total">
          <Text className="item-name">合计</Text>
          <Text className="item-price">¥{order.amount.toFixed(2)}</Text>
        </View>
      </View>

      {order.address && (
        <View className="detail-section">
          <Text className="section-title">配送地址</Text>
          <Text className="address-text">{order.address}</Text>
        </View>
      )}

      {order.remark && (
        <View className="detail-section">
          <Text className="section-title">备注</Text>
          <Text className="remark-text">{order.remark}</Text>
        </View>
      )}
    </ScrollView>
  )
}

export default OrderDetail

