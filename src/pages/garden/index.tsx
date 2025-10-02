import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Button, Image } from '@tarojs/components'
import Loading from '../../components/Loading'
import './index.scss'

// 花园场景配置
const GARDEN_SCENES = [
  { id: 'desert', name: '沙漠绿洲', icon: '🌵', color: '#F59E0B', unlocked: true },
  { id: 'rainforest', name: '热带雨林', icon: '🌴', color: '#10B981', unlocked: false },
  { id: 'wetland', name: '滨海湿地', icon: '🦢', color: '#3B82F6', unlocked: false },
  { id: 'future', name: '未来花园', icon: '🚀', color: '#8B5CF6', unlocked: false }
]

// 植物类型配置
const PLANT_TYPES = [
  { id: 'cactus', name: '仙人掌', icon: '🌵', cost: 100, growthTime: 24, color: '#22C55E' },
  { id: 'lavender', name: '薰衣草', icon: '💜', cost: 200, growthTime: 48, color: '#A855F7' },
  { id: 'cherry', name: '樱花树', icon: '🌸', cost: 500, growthTime: 72, color: '#EC4899' },
  { id: 'orchid', name: '蝴蝶兰', icon: '🦋', cost: 1000, growthTime: 96, color: '#06B6D4' }
]

const Garden: React.FC = () => {
  const [currentScene, setCurrentScene] = useState('desert')
  const [userPoints, setUserPoints] = useState(500) // 用户积分
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null)
  const [showPlantMenu, setShowPlantMenu] = useState(false)
  const [loading, setLoading] = useState(false)

  // 加载用户花园数据
  useEffect(() => {
    loadGardenData()
  }, [])

  const loadGardenData = useCallback(async () => {
    setLoading(true)
    try {
      // 模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // 模拟加载用户植物数据
      const userPlants = [
        {
          id: '1',
          type: 'cactus',
          position: { x: 100, y: 200 },
          growth: 80,
          plantedAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12小时前
        }
      ]
      setPlants(userPlants)
    } catch (error) {
      console.error('加载花园数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 切换花园场景
  const handleSceneChange = (sceneId: string) => {
    const scene = GARDEN_SCENES.find(s => s.id === sceneId)
    if (scene && scene.unlocked) {
      setCurrentScene(sceneId)
    }
  }

  // 种植植物
  const handlePlant = async (plantType: string) => {
    const plantConfig = PLANT_TYPES.find(p => p.id === plantType)
    if (!plantConfig) return

    // 检查积分是否足够
    if (userPoints < plantConfig.cost) {
      console.log('积分不足')
      return
    }

    setLoading(true)
    try {
      // 模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 创建新植物
      const newPlant = {
        id: Date.now().toString(),
        type: plantType,
        position: { x: Math.random() * 200 + 50, y: Math.random() * 300 + 100 },
        growth: 0,
        plantedAt: new Date()
      }

      // 更新状态
      setPlants(prev => [...prev, newPlant])
      setUserPoints(prev => prev - plantConfig.cost)
      setShowPlantMenu(false)
      setSelectedPlant(null)
    } catch (error) {
      console.error('种植植物失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 浇水植物
  const handleWaterPlant = (plantId: string) => {
    setPlants(prev => prev.map(plant => 
      plant.id === plantId 
        ? { ...plant, growth: Math.min(100, plant.growth + 10) }
        : plant
    ))
  }

  // 获取植物信息
  const getPlantInfo = (plantType: string) => {
    return PLANT_TYPES.find(p => p.id === plantType) || PLANT_TYPES[0]
  }

  // 获取场景信息
  const getCurrentScene = () => {
    return GARDEN_SCENES.find(s => s.id === currentScene) || GARDEN_SCENES[0]
  }

  return (
    <View className='garden'>
      {/* 加载状态 */}
      <Loading visible={loading} text="操作中..." />
      
      {/* 顶部场景选择器 */}
      <View className='scene-selector'>
        <ScrollView className='scene-list' scrollX>
          {GARDEN_SCENES.map(scene => (
            <View 
              key={scene.id}
              className={`scene-item ${currentScene === scene.id ? 'active' : ''} ${!scene.unlocked ? 'locked' : ''}`}
              onClick={() => handleSceneChange(scene.id)}
            >
              <Text className='scene-icon'>{scene.icon}</Text>
              <Text className='scene-name'>{scene.name}</Text>
              {!scene.unlocked && <Text className='lock-icon'>🔒</Text>}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 花园主场景 */}
      <View className='garden-scene' style={{ backgroundColor: getCurrentScene().color + '20' }}>
        {/* 场景背景 */}
        <View className='scene-background'>
          <Text className='scene-title'>{getCurrentScene().name}</Text>
        </View>

        {/* 植物容器 */}
        <View className='plants-container'>
          {plants.map(plant => {
            const plantInfo = getPlantInfo(plant.type)
            const growthPercent = plant.growth
            const isFullyGrown = growthPercent >= 100

            return (
              <View 
                key={plant.id}
                className='plant'
                style={{
                  left: `${plant.position.x}px`,
                  top: `${plant.position.y}px`
                }}
                onClick={() => !isFullyGrown && handleWaterPlant(plant.id)}
              >
                <Text className='plant-icon' style={{ color: plantInfo.color }}>
                  {plantInfo.icon}
                </Text>
                {!isFullyGrown && (
                  <View className='growth-bar'>
                    <View 
                      className='growth-progress' 
                      style={{ width: `${growthPercent}%` }}
                    />
                  </View>
                )}
                {isFullyGrown && (
                  <Text className='sparkle'>✨</Text>
                )}
              </View>
            )
          })}
        </View>

        {/* 种植按钮 */}
        <Button 
          className='plant-button'
          onClick={() => setShowPlantMenu(true)}
        >
          🌱 种植新植物
        </Button>
      </View>

      {/* 底部信息栏 */}
      <View className='garden-footer'>
        <View className='points-info'>
          <Text className='points-label'>当前积分:</Text>
          <Text className='points-value'>{userPoints}</Text>
        </View>
        <View className='plants-count'>
          <Text>植物数量: {plants.length}</Text>
        </View>
      </View>

      {/* 植物选择菜单 */}
      {showPlantMenu && (
        <View className='plant-menu-overlay' onClick={() => setShowPlantMenu(false)}>
          <View className='plant-menu' onClick={(e) => e.stopPropagation()}>
            <Text className='menu-title'>选择要种植的植物</Text>
            <View className='plant-options'>
              {PLANT_TYPES.map(plant => (
                <View 
                  key={plant.id}
                  className={`plant-option ${userPoints < plant.cost ? 'disabled' : ''}`}
                  onClick={() => userPoints >= plant.cost && handlePlant(plant.id)}
                >
                  <Text className='plant-option-icon' style={{ color: plant.color }}>
                    {plant.icon}
                  </Text>
                  <View className='plant-option-info'>
                    <Text className='plant-name'>{plant.name}</Text>
                    <Text className='plant-cost'>消耗: {plant.cost} 积分</Text>
                    <Text className='plant-time'>生长: {plant.growthTime}小时</Text>
                  </View>
                  {userPoints < plant.cost && (
                    <Text className='insufficient-points'>积分不足</Text>
                  )}
                </View>
              ))}
            </View>
            <Button 
              className='cancel-button'
              onClick={() => setShowPlantMenu(false)}
            >
              取消
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}

export default Garden