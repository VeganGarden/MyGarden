import React, { useState, useEffect } from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import Loading from '../../components/Loading'
import './index.scss'

const Index: React.FC = () => {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [gardenCount, setGardenCount] = useState(0)
  const [plantCount, setPlantCount] = useState(0)
  const [carbonFootprint, setCarbonFootprint] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 模拟数据加载
    loadDashboardData()
  }, [])

  // 错误处理函数
  const handleError = (errorMsg: string) => {
    setError(errorMsg)
    setLoading(false)
    console.error('首页数据加载错误:', errorMsg)
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 这里应该调用API获取数据
      setGardenCount(3)
      setPlantCount(15)
      setCarbonFootprint(245)
      
      setLoading(false)
    } catch (err) {
      handleError('数据加载失败，请检查网络连接')
    }
  }

  const handleCreateGarden = () => {
    // 跳转到创建花园页面
    console.log('跳转到创建花园页面')
  }

  const handleViewGarden = () => {
    // 跳转到我的花园页面
    console.log('跳转到我的花园页面')
  }

  // 错误状态显示
  if (error) {
    return (
      <View className='index error-state'>
        <View className='error-container'>
          <Text className='error-icon'>⚠️</Text>
          <Text className='error-message'>{error}</Text>
          <Button 
            className='retry-button'
            onClick={loadDashboardData}
          >
            重试
          </Button>
        </View>
      </View>
    )
  }

  return (
      <View className='index'>
        {/* 加载状态 */}
        <Loading visible={loading} text="加载中..." />
        {/* 欢迎区域 */}
        <View className='welcome-section'>
          <Text className='welcome-title'>欢迎来到我的花园</Text>
          <Text className='welcome-subtitle'>
            {userInfo ? `你好，${userInfo?.nickName}` : '请先登录'}
          </Text>
        </View>

        {/* 数据概览 */}
        <View className='stats-section'>
          <View className='stats-card'>
            <Text className='stats-title'>数据概览</Text>
            <View className='stats-grid'>
              <View className='stat-item'>
                <Text className='stat-value'>{gardenCount}</Text>
                <Text className='stat-label'>我的花园</Text>
              </View>
              <View className='stat-item'>
                <Text className='stat-value'>{plantCount}</Text>
                <Text className='stat-label'>植物总数</Text>
              </View>
              <View className='stat-item'>
                <Text className='stat-value'>{carbonFootprint}</Text>
                <Text className='stat-label'>碳足迹(kg)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 快速操作 */}
        <View className='actions-section'>
          <View className='actions-card'>
            <Text className='actions-title'>快速操作</Text>
            <View className='action-buttons'>
              <Button 
                className='action-button primary'
                onClick={handleCreateGarden}
              >
                创建新花园
              </Button>
              <Button 
                className='action-button secondary'
                onClick={handleViewGarden}
              >
                查看我的花园
              </Button>
            </View>
          </View>
        </View>

        {/* 今日任务 */}
        <View className='tasks-section'>
          <View className='tasks-card'>
            <Text className='tasks-title'>今日任务</Text>
            <View className='task-list'>
              <View className='task-item'>
                <Text>浇水提醒：花园1需要浇水</Text>
              </View>
              <View className='task-item'>
                <Text>施肥提醒：花园2需要施肥</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
  );
};

export default Index;