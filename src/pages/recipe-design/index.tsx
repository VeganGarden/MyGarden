import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Loading from '../../components/Loading'
import { Recipe, RecipeStatus, ChannelType } from './types'
import './index.scss'

const RecipeDesign: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')

  useEffect(() => {
    loadRecipes()
  }, [])

  // 加载菜谱列表
  const loadRecipes = async () => {
    setLoading(true)
    try {
      const res = await Taro.cloud.callFunction({
        name: 'recipe',
        data: {
          action: 'list',
          keyword: searchKeyword || '',
          page: 1,
          pageSize: 50
        }
      })

      if (res.result && res.result.code === 0) {
        setRecipes(res.result.data || [])
      } else {
        console.error('加载菜谱列表失败:', res.result?.message)
        // 如果加载失败，使用空数组
        setRecipes([])
        if (res.result?.message) {
          Taro.showToast({
            title: res.result.message,
            icon: 'none'
          })
        }
      }
    } catch (error) {
      console.error('加载菜谱失败:', error)
      // 如果加载失败，使用空数组
      setRecipes([])
      Taro.showToast({
        title: '加载失败，请检查网络连接',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  // 跳转到创建菜谱页面
  const handleCreateRecipe = () => {
    Taro.navigateTo({
      url: '/pages/recipe-design/create'
    })
  }

  // 跳转到编辑菜谱页面
  const handleEditRecipe = (recipeId: string) => {
    Taro.navigateTo({
      url: `/pages/recipe-design/create?id=${recipeId}`
    })
  }

  // 删除菜谱
  const handleDeleteRecipe = async (recipeId: string) => {
    const res = await Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个菜谱吗？'
    })

    if (res.confirm) {
      setLoading(true)
      try {
        const result = await Taro.cloud.callFunction({
          name: 'recipe',
          data: {
            action: 'delete',
            recipeId
          }
        })

        if (result.result && result.result.code === 0) {
          Taro.showToast({
            title: '删除成功',
            icon: 'success'
          })
          loadRecipes()
        } else {
          Taro.showToast({
            title: result.result?.message || '删除失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('删除菜谱失败:', error)
        Taro.showToast({
          title: '删除失败',
          icon: 'none'
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // 获取碳标签颜色
  const getCarbonLabelColor = (label?: string) => {
    switch (label) {
      case 'ultraLow':
        return '#4CAF50'  // 绿色 🟢
      case 'low':
        return '#FFEB3B'  // 黄色 🟡
      case 'medium':
        return '#FF9800'  // 橙色 🟠
      case 'high':
        return '#F44336'  // 红色 🔴
      default:
        return '#9E9E9E'  // 灰色
    }
  }

  // 获取碳标签文本
  const getCarbonLabelText = (label?: string) => {
    switch (label) {
      case 'ultraLow':
        return '超低碳'
      case 'low':
        return '低碳'
      case 'medium':
        return '中碳'
      case 'high':
        return '高碳'
      default:
        return '未计算'
    }
  }

  // 获取状态文本
  const getStatusText = (status: RecipeStatus) => {
    switch (status) {
      case RecipeStatus.DRAFT:
        return '草稿'
      case RecipeStatus.PUBLISHED:
        return '已发布'
      case RecipeStatus.ARCHIVED:
        return '已归档'
      default:
        return '未知'
    }
  }

  return (
    <View className='recipe-design-page'>
      {/* 搜索栏 */}
      <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='搜索菜谱名称...'
          value={searchKeyword}
          onInput={(e) => setSearchKeyword(e.detail.value)}
          onConfirm={loadRecipes}
        />
        <Button className='search-btn' onClick={loadRecipes}>搜索</Button>
      </View>

      {/* 操作栏 */}
      <View className='action-bar'>
        <Button className='create-btn' onClick={handleCreateRecipe}>
          + 创建新菜谱
        </Button>
      </View>

      {/* 菜谱列表 */}
      {loading ? (
        <Loading />
      ) : (
        <ScrollView className='recipe-list' scrollY>
          {recipes.length === 0 ? (
            <View className='empty-state'>
              <Text className='empty-text'>暂无菜谱，点击上方按钮创建</Text>
            </View>
          ) : (
            recipes.map((recipe) => (
              <View key={recipe._id} className='recipe-card'>
                <View className='recipe-header'>
                  <Text className='recipe-name'>{recipe.name}</Text>
                  <View
                    className='carbon-label'
                    style={{ backgroundColor: getCarbonLabelColor(recipe.carbonLabel) }}
                  >
                    <Text className='carbon-label-text'>
                      {getCarbonLabelText(recipe.carbonLabel)}
                    </Text>
                  </View>
                </View>

                {recipe.description && (
                  <Text className='recipe-description'>{recipe.description}</Text>
                )}

                <View className='recipe-info'>
                  <View className='info-item'>
                    <Text className='info-label'>分类：</Text>
                    <Text className='info-value'>{recipe.category}</Text>
                  </View>
                  <View className='info-item'>
                    <Text className='info-label'>食材数：</Text>
                    <Text className='info-value'>{recipe.ingredients.length} 种</Text>
                  </View>
                  {recipe.carbonFootprint !== undefined && (
                    <View className='info-item'>
                      <Text className='info-label'>碳足迹：</Text>
                      <Text className='info-value'>{recipe.carbonFootprint.toFixed(2)} kg CO₂e</Text>
                    </View>
                  )}
                  <View className='info-item'>
                    <Text className='info-label'>状态：</Text>
                    <Text className='info-value'>{getStatusText(recipe.status)}</Text>
                  </View>
                  <View className='info-item'>
                    <Text className='info-label'>版本：</Text>
                    <Text className='info-value'>v{recipe.version}</Text>
                  </View>
                </View>

                <View className='recipe-actions'>
                  <Button
                    className='action-btn edit-btn'
                    onClick={() => handleEditRecipe(recipe._id!)}
                  >
                    编辑
                  </Button>
                  <Button
                    className='action-btn delete-btn'
                    onClick={() => handleDeleteRecipe(recipe._id!)}
                  >
                    删除
                  </Button>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

export default RecipeDesign

