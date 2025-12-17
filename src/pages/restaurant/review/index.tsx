import React, { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface Review {
  id: string
  orderNo: string
  customerName: string
  rating: number
  content: string
  reviewDate: string
  reply?: string
  replyDate?: string
}

const RestaurantReview: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [activeTab, setActiveTab] = useState<'latest' | 'pending'>('latest')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReviews()
  }, [activeTab])

  const loadReviews = async () => {
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
          action: 'listReviews',
          data: {
            restaurantId,
            status: activeTab === 'pending' ? 'pending' : undefined,
            page: 1,
            pageSize: 50,
          },
        },
      })

      if (result.result && result.result.code === 0) {
        setReviews(result.result.data || [])
      }
    } catch (error) {
      console.error('加载评价失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReply = (review: Review) => {
    setSelectedReview(review)
    setReplyContent('')
    setShowReplyModal(true)
  }

  const handleSubmitReply = async () => {
    if (!selectedReview) return

    if (!replyContent.trim()) {
      Taro.showToast({
        title: '请输入回复内容',
        icon: 'none',
      })
      return
    }

    try {
      const result = await Taro.cloud.callFunction({
        name: 'tenant',
        data: {
          action: 'replyReview',
          data: {
            reviewId: selectedReview.id,
            reply: replyContent,
          },
        },
      })

      if (result.result && result.result.code === 0) {
        Taro.showToast({
          title: '回复成功',
          icon: 'success',
        })
        setShowReplyModal(false)
        loadReviews()
      } else {
        throw new Error(result.result?.message || '回复失败')
      }
    } catch (error) {
      console.error('回复评价失败:', error)
      Taro.showToast({
        title: '回复失败',
        icon: 'none',
      })
    }
  }

  const loadReviewStats = async () => {
    try {
      const restaurantId = Taro.getStorageSync('currentRestaurantId')
      const result = await Taro.cloud.callFunction({
        name: 'tenant',
        data: {
          action: 'getReviewStats',
          data: {
            restaurantId,
          },
        },
      })

      if (result.result && result.result.code === 0) {
        const stats = result.result.data
        Taro.showModal({
          title: '评价统计',
          content: `总评价数: ${stats.totalReviews}\n平均评分: ${stats.avgRating.toFixed(1)}\n好评率: ${(stats.goodRate * 100).toFixed(1)}%\n今日评价: ${stats.trends?.length || 0}`,
          showCancel: false,
        })
      }
    } catch (error) {
      console.error('获取统计失败:', error)
    }
  }

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  return (
    <View className="restaurant-review">
      <View className="header">
        <View className="tabs">
          <View
            className={`tab ${activeTab === 'latest' ? 'active' : ''}`}
            onClick={() => setActiveTab('latest')}
          >
            最新评价
          </View>
          <View
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            待回复
          </View>
        </View>
        <Button className="stats-btn" onClick={loadReviewStats}>
          统计
        </Button>
      </View>

      <ScrollView className="reviews-list" scrollY>
        {reviews.length === 0 ? (
          <View className="empty-state">
            <Text>暂无评价</Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} className="review-card">
              <View className="review-header">
                <View className="customer-info">
                  <Text className="customer-name">{review.customerName}</Text>
                  <Text className="order-no">订单: {review.orderNo}</Text>
                </View>
                <View className="rating">
                  <Text className="stars">{renderStars(review.rating)}</Text>
                </View>
              </View>

              <View className="review-content">
                <Text>{review.content}</Text>
              </View>

              <View className="review-time">
                <Text>{new Date(review.reviewDate).toLocaleString('zh-CN')}</Text>
              </View>

              {review.reply ? (
                <View className="reply-section">
                  <Text className="reply-label">商家回复:</Text>
                  <Text className="reply-content">{review.reply}</Text>
                  {review.replyDate && (
                    <Text className="reply-time">
                      {new Date(review.replyDate).toLocaleString('zh-CN')}
                    </Text>
                  )}
                </View>
              ) : (
                <View className="review-actions">
                  <Button
                    className="reply-btn"
                    onClick={() => handleReply(review)}
                  >
                    回复
                  </Button>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {showReplyModal && selectedReview && (
        <View className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <View className="modal-content" onClick={(e) => e.stopPropagation()}>
            <Text className="modal-title">回复评价</Text>

            <View className="review-preview">
              <Text className="preview-label">客户评价:</Text>
              <Text className="preview-content">{selectedReview.content}</Text>
              <Text className="preview-rating">
                评分: {renderStars(selectedReview.rating)}
              </Text>
            </View>

            <View className="modal-form">
              <Text className="form-label">回复内容</Text>
              <Textarea
                className="form-textarea"
                value={replyContent}
                onInput={(e) => setReplyContent(e.detail.value)}
                placeholder="请输入回复内容"
                maxlength={500}
              />
            </View>

            <View className="modal-actions">
              <Button
                className="modal-btn cancel"
                onClick={() => setShowReplyModal(false)}
              >
                取消
              </Button>
              <Button className="modal-btn confirm" onClick={handleSubmitReply}>
                确认回复
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default RestaurantReview

