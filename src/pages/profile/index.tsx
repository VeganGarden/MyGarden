import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Loading from '../../components/Loading'
import './index.scss'

const Profile: React.FC = () => {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const stats = {
    gardenCount: 3,
    plantCount: 15,
    carbonFootprint: 245,
    daysActive: 45
  };

  const handleLogin = () => {
    // 跳转到登录页面
    console.log('跳转到登录页面');
  };

  useEffect(() => {
    checkLoginStatus()
  }, [])

  const checkLoginStatus = useCallback(async () => {
    setLoading(true)
    try {
      // 模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 400))
      
      const token = Taro.getStorageSync('token')
      const user = Taro.getStorageSync('userInfo')
      setIsLoggedIn(!!token)
      setUserInfo(user || null)
    } catch (error) {
      console.error('检查登录状态失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    try {
      // 模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 模拟退出登录逻辑
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('userInfo')
      setIsLoggedIn(false)
      setUserInfo(null)
      console.log('退出登录成功')
    } catch (error) {
      console.error('退出登录失败:', error)
    } finally {
      setLoading(false)
    }
  };

  const handleEditProfile = () => {
    // 编辑个人信息
    console.log('编辑个人信息');
  };

  const handleSettings = () => {
    // 跳转到设置页面
    console.log('跳转到设置页面');
  };

  const handleAbout = () => {
    // 关于页面
    console.log('关于页面');
  };

  return (
      <View className='profile'>
        {/* 加载状态 */}
        <Loading visible={loading} text="加载中..." />
        
        {/* 用户信息区域 */}
        <View className='user-section'>
          {isLoggedIn ? (
            <View className='user-info'>
              <Image 
                className='avatar' 
                src={userInfo?.avatarUrl || '/assets/icons/default-avatar.png'}
              />
              <View className='user-details'>
                <Text className='username'>{userInfo?.nickName || '用户'}</Text>
                <Text className='user-id'>ID: {userInfo?.id || '未知'}</Text>
              </View>
              <Button 
                className='edit-btn secondary'
                onClick={handleEditProfile}
              >
                编辑
              </Button>
            </View>
          ) : (
            <View className='login-prompt'>
              <Text className='login-text'>请登录以查看个人信息</Text>
              <Button 
                className='login-btn primary'
                onClick={handleLogin}
              >
                立即登录
              </Button>
            </View>
          )}
        </View>

        {/* 数据统计 */}
        {isLoggedIn && (
          <View className='stats-section'>
            <View className='stats-card'>
              <Text className='stats-title'>我的数据</Text>
              <View className='stats-grid'>
                <View className='stat-item'>
                  <Text className='stat-value'>{stats.gardenCount}</Text>
                  <Text className='stat-label'>花园数量</Text>
                </View>
                <View className='stat-item'>
                  <Text className='stat-value'>{stats.plantCount}</Text>
                  <Text className='stat-label'>植物总数</Text>
                </View>
                <View className='stat-item'>
                  <Text className='stat-value'>{stats.carbonFootprint}</Text>
                  <Text className='stat-label'>碳足迹(kg)</Text>
                </View>
                <View className='stat-item'>
                  <Text className='stat-value'>{stats.daysActive}</Text>
                  <Text className='stat-label'>活跃天数</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 功能菜单 */}
        <View className='menu-section'>
          <View className='menu-list'>
            <View className='menu-item' onClick={handleSettings}>
              <Text className='menu-title'>设置</Text>
              <Text className='menu-arrow'>›</Text>
            </View>
            <View className='menu-item' onClick={handleAbout}>
              <Text className='menu-title'>关于</Text>
              <Text className='menu-arrow'>›</Text>
            </View>
            {isLoggedIn && (
              <View className='menu-item' onClick={handleLogout}>
                <Text className='menu-title'>退出登录</Text>
                <Text className='menu-arrow'>›</Text>
              </View>
            )}
          </View>
        </View>

        {/* 版本信息 */}
        <View className='version-section'>
          <Text className='version-text'>我的花园 v1.0.0</Text>
        </View>
      </View>
    );
};

export default Profile;