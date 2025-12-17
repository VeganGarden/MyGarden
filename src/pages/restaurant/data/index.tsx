import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import LineChart from '../../../components/charts/LineChart'
import './index.scss'

interface TodayData {
  orderCount: number
  revenue: number
  carbonReduction: number
}

interface WeekData {
  orderCount: number
  revenue: number
  carbonReduction: number
}

interface MonthData {
  orderCount: number
  revenue: number
  carbonReduction: number
}

interface TrendData {
  date: string
  value: number
}

const RestaurantData: React.FC = () => {
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [monthData, setMonthData] = useState<MonthData | null>(null)
  const [orderTrend, setOrderTrend] = useState<TrendData[]>([])
  const [revenueTrend, setRevenueTrend] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
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

      // 获取今日数据
      if (activeTab === 'today') {
        const todayResult = await Taro.cloud.callFunction({
          name: 'tenant',
          data: {
            action: 'getDashboardData',
            data: {
              restaurantId,
              period: 'today',
            },
          },
        })

        if (todayResult.result && todayResult.result.code === 0) {
          const data = todayResult.result.data
          setTodayData({
            orderCount: data.todayOrders || 0,
            revenue: data.todayRevenue || 0,
            carbonReduction: data.todayCarbonReduction || 0,
          })
        }
      }

      // 获取本周数据
      if (activeTab === 'week') {
        const weekResult = await Taro.cloud.callFunction({
          name: 'tenant',
          data: {
            action: 'getDashboardData',
            data: {
              restaurantId,
              period: 'week',
            },
          },
        })

        if (weekResult.result && weekResult.result.code === 0) {
          const data = weekResult.result.data
          setWeekData({
            orderCount: data.weekOrders || 0,
            revenue: data.weekRevenue || 0,
            carbonReduction: data.weekCarbonReduction || 0,
          })
        }
      }

      // 获取本月数据
      if (activeTab === 'month') {
        const monthResult = await Taro.cloud.callFunction({
          name: 'tenant',
          data: {
            action: 'getDashboardData',
            data: {
              restaurantId,
              period: 'month',
            },
          },
        })

        if (monthResult.result && monthResult.result.code === 0) {
          const data = monthResult.result.data
          setMonthData({
            orderCount: data.monthOrders || 0,
            revenue: data.monthRevenue || 0,
            carbonReduction: data.monthCarbonReduction || 0,
          })
        }
      }

      // 获取趋势数据
      const trendResult = await Taro.cloud.callFunction({
        name: 'tenant',
        data: {
          action: 'getDashboardData',
          data: {
            restaurantId,
            period: activeTab,
            includeTrend: true,
          },
        },
      })

      if (trendResult.result && trendResult.result.code === 0) {
        const trendData = trendResult.result.data?.trends || []
        setOrderTrend(
          trendData.map((item: any) => ({
            date: item.date,
            value: item.orderCount || 0,
          }))
        )
        setRevenueTrend(
          trendData.map((item: any) => ({
            date: item.date,
            value: item.revenue || 0,
          }))
        )
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderDataCards = () => {
    const data = activeTab === 'today' ? todayData : activeTab === 'week' ? weekData : monthData

    if (!data) {
      return (
        <View className="empty-state">
          <Text>暂无数据</Text>
        </View>
      )
    }

    return (
      <View className="data-cards">
        <View className="data-card">
          <Text className="card-label">订单量</Text>
          <Text className="card-value">{data.orderCount}</Text>
          <Text className="card-unit">单</Text>
        </View>
        <View className="data-card">
          <Text className="card-label">收入</Text>
          <Text className="card-value">{data.revenue.toFixed(2)}</Text>
          <Text className="card-unit">元</Text>
        </View>
        <View className="data-card">
          <Text className="card-label">碳减排</Text>
          <Text className="card-value">{data.carbonReduction.toFixed(2)}</Text>
          <Text className="card-unit">kg</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="restaurant-data">
      <View className="tabs">
        <View
          className={`tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          今日
        </View>
        <View
          className={`tab ${activeTab === 'week' ? 'active' : ''}`}
          onClick={() => setActiveTab('week')}
        >
          本周
        </View>
        <View
          className={`tab ${activeTab === 'month' ? 'active' : ''}`}
          onClick={() => setActiveTab('month')}
        >
          本月
        </View>
      </View>

      <ScrollView className="content" scrollY>
        {renderDataCards()}

        {orderTrend.length > 0 && (
          <View className="chart-section">
            <Text className="chart-title">订单趋势</Text>
            <View className="chart-container">
              <LineChart
                data={orderTrend}
                xField="date"
                yField="value"
                height={300}
              />
            </View>
          </View>
        )}

        {revenueTrend.length > 0 && (
          <View className="chart-section">
            <Text className="chart-title">收入趋势</Text>
            <View className="chart-container">
              <LineChart
                data={revenueTrend}
                xField="date"
                yField="value"
                height={300}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default RestaurantData

