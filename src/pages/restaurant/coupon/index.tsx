import React, { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface Coupon {
  id: string
  name: string
  type: string
  value: number
  totalCount: number
  usedCount: number
  distributedCount: number
  validFrom: string
  validTo: string
  status: string
}

const RestaurantCoupon: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [userIdInput, setUserIdInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    try {
      setLoading(true)
      const restaurantId = Taro.getStorageSync('currentRestaurantId')
      if (!restaurantId) {
        Taro.showToast({
          title: '请先选择餐厅',
          icon: 'none',
        })
        return
      }

      const result = await Taro.cloud.callFunction({
        name: 'tenant',
        data: {
          action: 'listCoupons',
          data: {
            restaurantId,
            page: 1,
            pageSize: 50,
          },
        },
      })

      if (result.result && result.result.code === 0) {
        setCoupons(result.result.data || [])
      }
    } catch (error) {
      console.error('加载优惠券失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDistribute = (coupon: Coupon) => {
    setSelectedCoupon(coupon)
    setUserIdInput('')
    setShowDistributeModal(true)
  }

  const handleSubmitDistribute = async () => {
    if (!selectedCoupon) return

    if (!userIdInput.trim()) {
      Taro.showToast({
        title: '请输入用户ID',
        icon: 'none',
      })
      return
    }

    try {
      const userIds = userIdInput
        .split('\n')
        .map((id) => id.trim())
        .filter((id) => id)

      if (userIds.length === 0) {
        Taro.showToast({
          title: '请输入有效的用户ID',
          icon: 'none',
        })
        return
      }

      const result = await Taro.cloud.callFunction({
        name: 'tenant',
        data: {
          action: 'distributeCoupon',
          data: {
            couponId: selectedCoupon.id,
            restaurantId: Taro.getStorageSync('currentRestaurantId'),
            userIds,
            distributionType: 'targeted',
          },
        },
      })

      if (result.result && result.result.code === 0) {
        Taro.showToast({
          title: '发放成功',
          icon: 'success',
        })
        setShowDistributeModal(false)
        loadCoupons()
      } else {
        throw new Error(result.result?.message || '发放失败')
      }
    } catch (error) {
      console.error('发放优惠券失败:', error)
      Taro.showToast({
        title: '发放失败',
        icon: 'none',
      })
    }
  }

  const loadCouponStats = async (couponId: string) => {
    try {
      const result = await Taro.cloud.callFunction({
        name: 'tenant',
        data: {
          action: 'getCouponStats',
          data: {
            restaurantId: Taro.getStorageSync('currentRestaurantId'),
            couponId,
          },
        },
      })

      if (result.result && result.result.code === 0) {
        const stats = result.result.data
        Taro.showModal({
          title: '使用统计',
          content: `已发放: ${stats.totalDistributed}\n已使用: ${stats.totalUsed}\n使用率: ${(stats.usageRate * 100).toFixed(1)}%`,
          showCancel: false,
        })
      }
    } catch (error) {
      console.error('获取统计失败:', error)
    }
  }

  return (
    <View className="restaurant-coupon">
      <ScrollView className="coupons-list" scrollY>
        {coupons.length === 0 ? (
          <View className="empty-state">
            <Text>暂无优惠券</Text>
            <Text className="empty-tip">请在Web后台创建优惠券</Text>
          </View>
        ) : (
          coupons.map((coupon) => {
            const remaining = coupon.totalCount - (coupon.distributedCount || 0)
            const usageRate =
              coupon.distributedCount > 0
                ? ((coupon.usedCount / coupon.distributedCount) * 100).toFixed(1)
                : '0'

            return (
              <View key={coupon.id} className="coupon-card">
                <View className="coupon-header">
                  <Text className="coupon-name">{coupon.name}</Text>
                  <View
                    className={`status-badge ${coupon.status === 'active' ? 'active' : ''}`}
                  >
                    <Text>{coupon.status === 'active' ? '进行中' : '已结束'}</Text>
                  </View>
                </View>

                <View className="coupon-info">
                  <View className="info-row">
                    <Text className="label">类型:</Text>
                    <Text className="value">
                      {coupon.type === 'discount'
                        ? '折扣券'
                        : coupon.type === 'cash'
                        ? '现金券'
                        : '满减券'}
                    </Text>
                  </View>
                  <View className="info-row">
                    <Text className="label">面额:</Text>
                    <Text className="value">
                      {coupon.type === 'discount' ? `${coupon.value}折` : `¥${coupon.value}`}
                    </Text>
                  </View>
                  <View className="info-row">
                    <Text className="label">有效期:</Text>
                    <Text className="value">
                      {coupon.validFrom} 至 {coupon.validTo}
                    </Text>
                  </View>
                  <View className="info-row">
                    <Text className="label">剩余数量:</Text>
                    <Text className="value">{remaining}</Text>
                  </View>
                  <View className="info-row">
                    <Text className="label">使用率:</Text>
                    <Text className="value">{usageRate}%</Text>
                  </View>
                </View>

                <View className="coupon-actions">
                  <Button
                    className="action-btn distribute"
                    onClick={() => handleDistribute(coupon)}
                    disabled={remaining === 0 || coupon.status !== 'active'}
                  >
                    发放
                  </Button>
                  <Button
                    className="action-btn stats"
                    onClick={() => loadCouponStats(coupon.id)}
                  >
                    统计
                  </Button>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      {showDistributeModal && selectedCoupon && (
        <View className="modal-overlay" onClick={() => setShowDistributeModal(false)}>
          <View className="modal-content" onClick={(e) => e.stopPropagation()}>
            <Text className="modal-title">发放优惠券</Text>
            <Text className="modal-subtitle">{selectedCoupon.name}</Text>

            <View className="modal-form">
              <Text className="form-label">用户ID列表（每行一个）</Text>
              <Input
                className="form-input"
                type="text"
                value={userIdInput}
                onInput={(e) => setUserIdInput(e.detail.value)}
                placeholder="请输入用户ID，每行一个"
                maxlength={-1}
              />
            </View>

            <View className="modal-actions">
              <Button
                className="modal-btn cancel"
                onClick={() => setShowDistributeModal(false)}
              >
                取消
              </Button>
              <Button className="modal-btn confirm" onClick={handleSubmitDistribute}>
                确认发放
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default RestaurantCoupon

