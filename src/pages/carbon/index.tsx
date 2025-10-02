import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, Form, Input, Picker, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { LineChart, PieChart, BarChart, ProgressBar } from '../../components/charts'
import Loading from '../../components/Loading'
import './index.scss'

// 食材类型选项
const FOOD_TYPES = [
  { label: '蔬菜类', value: 'vegetables' },
  { label: '豆制品', value: 'beans' },
  { label: '谷物', value: 'grains' }
]

// 蔬菜子类
const VEGETABLE_CATEGORIES = [
  { label: '叶菜类', value: 'leafy' },
  { label: '根茎类', value: 'root' },
  { label: '果菜类', value: 'fruit' },
  { label: '菌菇类', value: 'mushroom' }
]

// 豆制品子类
const BEAN_CATEGORIES = [
  { label: '豆腐', value: 'tofu' },
  { label: '豆浆', value: 'soy_milk' },
  { label: '天贝', value: 'tempeh' }
]

// 谷物子类
const GRAIN_CATEGORIES = [
  { label: '大米', value: 'rice' },
  { label: '小麦', value: 'wheat' },
  { label: '玉米', value: 'corn' }
]

// 烹饪方式
const COOKING_METHODS = [
  { label: '生食', value: 'raw' },
  { label: '蒸', value: 'steamed' },
  { label: '煮', value: 'boiled' },
  { label: '炒', value: 'stir_fried' },
  { label: '炸', value: 'fried' },
  { label: '烤', value: 'baked' }
]

// 模拟数据 - 实际项目中应从云函数获取
const mockCarbonData = {
  // 最近7天碳足迹数据
  weeklyTrend: [
    { date: '2025-09-25', value: 1.2 },
    { date: '2025-09-26', value: 0.8 },
    { date: '2025-09-27', value: 1.5 },
    { date: '2025-09-28', value: 1.0 },
    { date: '2025-09-29', value: 1.3 },
    { date: '2025-09-30', value: 0.9 },
    { date: '2025-10-01', value: 1.1 }
  ],
  
  // 食物类型占比
  foodTypeDistribution: [
    { name: '蔬菜类', value: 45, color: '#22c55e' },
    { name: '豆制品', value: 30, color: '#16a34a' },
    { name: '谷物', value: 25, color: '#84cc16' }
  ],
  
  // 月度对比数据
  monthlyComparison: [
    { label: '9月', value: 28.5 },
    { label: '10月', value: 7.8 }
  ],
  
  // 目标进度
  currentCarbonReduction: 36.3,
  monthlyTarget: 50
}

const CarbonRecord: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'stats'>('record')
  const [carbonData, setCarbonData] = useState(mockCarbonData)
  const [formData, setFormData] = useState({
    mealName: '',
    foodType: 'vegetables',
    foodCategory: 'leafy',
    weight: '',
    cookingMethod: 'steamed'
  })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState(VEGETABLE_CATEGORIES)

  // 加载碳足迹数据
  useEffect(() => {
    loadCarbonData()
  }, [])

  const loadCarbonData = useCallback(async () => {
    setLoading(true)
    try {
      // 模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 实际项目中调用云函数获取数据
      // const result = await Taro.cloud.callFunction({
      //   name: 'carbon',
      //   data: { action: 'getCarbonStats' }
      // })
      // setCarbonData(result.result.data)
    } catch (error) {
      console.error('加载碳足迹数据失败:', error)
      Taro.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  // 根据食材类型更新子类选项
  const handleFoodTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, foodType: value, foodCategory: '' }))
    
    switch (value) {
      case 'vegetables':
        setCategories(VEGETABLE_CATEGORIES)
        break
      case 'beans':
        setCategories(BEAN_CATEGORIES)
        break
      case 'grains':
        setCategories(GRAIN_CATEGORIES)
        break
      default:
        setCategories(VEGETABLE_CATEGORIES)
    }
  }

  // 处理表单输入
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // 提交碳足迹记录
  const handleSubmit = async () => {
    if (!formData.mealName || !formData.weight) {
      Taro.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    setLoading(true)
    try {
      // 调用碳足迹计算云函数
      const result = await Taro.cloud.callFunction({
        name: 'carbon',
        data: {
          action: 'calculateMealCarbon',
          data: {
            ingredients: [{
              name: formData.mealName,
              type: formData.foodType,
              category: formData.foodCategory,
              weight: parseFloat(formData.weight)
            }],
            cookingMethod: formData.cookingMethod
          }
        }
      })

      // 处理云函数返回结果
      const response = result.result as any
      if (response && response.code === 0) {
        const carbonData = response.data
        
        Taro.showModal({
          title: '碳足迹计算结果',
          content: `本次餐食碳足迹：${carbonData.carbonFootprint?.toFixed(2) || '0.00'} kg CO2e\n碳减排量：${carbonData.carbonReduction?.toFixed(2) || '0.00'} kg CO2e\n获得经验值：${carbonData.experienceGained || '0'}`,
          showCancel: false,
          success: () => {
            // 重置表单
            setFormData({
              mealName: '',
              foodType: 'vegetables',
              foodCategory: 'leafy',
              weight: '',
              cookingMethod: 'steamed'
            })
            // 重新加载数据
            loadCarbonData()
          }
        })
      } else {
        throw new Error(response?.message || '计算失败')
      }
    } catch (error) {
      console.error('碳足迹计算失败:', error)
      Taro.showToast({
        title: '计算失败，请重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='carbon-page'>
      {/* 加载状态 */}
      <Loading visible={loading} text="加载中..." />
      
      {/* 顶部统计信息 */}
      <View className='carbon-stats'>
        <View className='stat-item'>
          <Text className='stat-value'>{carbonData.currentCarbonReduction.toFixed(1)}</Text>
          <Text className='stat-label'>累计减排(kg)</Text>
        </View>
        <View className='stat-item'>
          <Text className='stat-value'>{carbonData.weeklyTrend.reduce((sum, day) => sum + day.value, 0).toFixed(1)}</Text>
          <Text className='stat-label'>本周减排</Text>
        </View>
        <View className='stat-item'>
          <Text className='stat-value'>{carbonData.foodTypeDistribution.length}</Text>
          <Text className='stat-label'>食物种类</Text>
        </View>
      </View>

      {/* 标签页切换 */}
      <View className='tab-container'>
        <View 
          className={`tab ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          <Text>记录餐食</Text>
        </View>
        <View 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <Text>数据统计</Text>
        </View>
      </View>

      {activeTab === 'record' ? (
        // 记录餐食表单
        <ScrollView className='record-section' scrollY>
          <View className='header'>
            <Text className='title'>记录素食餐食</Text>
            <Text className='subtitle'>计算您的碳足迹贡献</Text>
          </View>

          <Form className='record-form'>
            {/* 餐食名称 */}
            <View className='form-item'>
              <Text className='label'>餐食名称</Text>
              <Input
                className='input'
                placeholder='请输入餐食名称'
                value={formData.mealName}
                onInput={(e) => handleInputChange('mealName', e.detail.value)}
              />
            </View>

            {/* 食材类型 */}
            <View className='form-item'>
              <Text className='label'>食材类型</Text>
              <Picker
                mode='selector'
                range={FOOD_TYPES}
                rangeKey='label'
                value={FOOD_TYPES.findIndex(item => item.value === formData.foodType)}
                onChange={(e) => handleFoodTypeChange(FOOD_TYPES[e.detail.value].value)}
              >
                <View className='picker'>
                  <Text>{FOOD_TYPES.find(item => item.value === formData.foodType)?.label || '请选择'}</Text>
                </View>
              </Picker>
            </View>

            {/* 食材子类 */}
            <View className='form-item'>
              <Text className='label'>食材子类</Text>
              <Picker
                mode='selector'
                range={categories}
                rangeKey='label'
                value={categories.findIndex(item => item.value === formData.foodCategory)}
                onChange={(e) => handleInputChange('foodCategory', categories[e.detail.value].value)}
              >
                <View className='picker'>
                  <Text>{categories.find(item => item.value === formData.foodCategory)?.label || '请选择'}</Text>
                </View>
              </Picker>
            </View>

            {/* 重量 */}
            <View className='form-item'>
              <Text className='label'>重量 (克)</Text>
              <Input
                className='input'
                type='number'
                placeholder='请输入食材重量'
                value={formData.weight}
                onInput={(e) => handleInputChange('weight', e.detail.value)}
              />
            </View>

            {/* 烹饪方式 */}
            <View className='form-item'>
              <Text className='label'>烹饪方式</Text>
              <Picker
                mode='selector'
                range={COOKING_METHODS}
                rangeKey='label'
                value={COOKING_METHODS.findIndex(item => item.value === formData.cookingMethod)}
                onChange={(e) => handleInputChange('cookingMethod', COOKING_METHODS[e.detail.value].value)}
              >
                <View className='picker'>
                  <Text>{COOKING_METHODS.find(item => item.value === formData.cookingMethod)?.label || '请选择'}</Text>
                </View>
              </Picker>
            </View>

            {/* 提交按钮 */}
            <Button className='submit-button' onClick={handleSubmit}>
              计算碳足迹
            </Button>
          </Form>

          {/* 说明信息 */}
          <View className='info-section'>
            <Text className='info-title'>碳足迹说明</Text>
            <Text className='info-text'>
              • 素食餐食相比肉类餐食可显著减少碳排放\n
              • 记录您的素食餐食，计算碳减排贡献\n
              • 积累经验值可用于解锁花园新功能
            </Text>
          </View>
        </ScrollView>
      ) : (
        // 数据统计页面
        <ScrollView className='stats-section' scrollY>
          {/* 月度目标进度 */}
          <View className='chart-card'>
            <ProgressBar
              current={carbonData.currentCarbonReduction}
              target={carbonData.monthlyTarget}
              title="月度减排目标"
              height={40}
            />
          </View>

          {/* 碳足迹趋势图 */}
          <View className='chart-card'>
            <LineChart
              data={carbonData.weeklyTrend}
              title="最近7天碳足迹趋势"
              height={200}
            />
          </View>

          {/* 食物类型占比 */}
          <View className='chart-card'>
            <PieChart
              data={carbonData.foodTypeDistribution}
              title="食物类型碳足迹占比"
              size={250}
            />
          </View>

          {/* 月度对比 */}
          <View className='chart-card'>
            <BarChart
              data={carbonData.monthlyComparison}
              title="月度碳足迹对比"
              height={200}
              showValues={true}
            />
          </View>

          {/* 统计摘要 */}
          <View className='summary-section'>
            <Text className='summary-title'>统计摘要</Text>
            <View className='summary-grid'>
              <View className='summary-item'>
                <Text className='summary-label'>平均每日减排</Text>
                <Text className='summary-value'>
                  {(carbonData.weeklyTrend.reduce((sum, day) => sum + day.value, 0) / 7).toFixed(2)}kg
                </Text>
              </View>
              <View className='summary-item'>
                <Text className='summary-label'>减排完成度</Text>
                <Text className='summary-value'>
                  {((carbonData.currentCarbonReduction / carbonData.monthlyTarget) * 100).toFixed(1)}%
                </Text>
              </View>
              <View className='summary-item'>
                <Text className='summary-label'>主要食物类型</Text>
                <Text className='summary-value'>
                  {carbonData.foodTypeDistribution[0]?.name || '-'}
                </Text>
              </View>
              <View className='summary-item'>
                <Text className='summary-label'>记录天数</Text>
                <Text className='summary-value'>
                  {carbonData.weeklyTrend.filter(day => day.value > 0).length}天
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

export default CarbonRecord