import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Button, Input, Form, Picker, Checkbox } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Loading from '../../components/Loading'
import './create.scss'

// 导入类型定义
import { Recipe, RecipeIngredient, RecipeStatus, ChannelType } from './types'

// 菜谱分类选项
const RECIPE_CATEGORIES = [
  { label: '热菜', value: 'hot' },
  { label: '凉菜', value: 'cold' },
  { label: '汤品', value: 'soup' },
  { label: '主食', value: 'staple' },
  { label: '甜品', value: 'dessert' },
  { label: '饮品', value: 'drink' }
]

// 烹饪方式选项
const COOKING_METHODS = [
  { label: '蒸', value: 'steamed' },
  { label: '煮', value: 'boiled' },
  { label: '炒', value: 'stir_fried' },
  { label: '炸', value: 'fried' },
  { label: '烤', value: 'baked' },
  { label: '炖', value: 'stewed' },
  { label: '凉拌', value: 'cold_dish' },
  { label: '生食', value: 'raw' }
]

const RecipeCreate: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [showIngredientPicker, setShowIngredientPicker] = useState(false)
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([])

  const [formData, setFormData] = useState<Partial<Recipe>>({
    name: '',
    description: '',
    category: '',
    cookingMethod: '',
    status: RecipeStatus.DRAFT,
    channels: [],
    ingredients: [],
    version: 1
  })

  useEffect(() => {
    const pages = Taro.getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const id = currentPage.options?.id

    if (id) {
      setRecipeId(id)
      loadRecipe(id)
    }

    loadAvailableIngredients()
  }, [])

  // 加载菜谱详情
  const loadRecipe = async (id: string) => {
    setLoading(true)
    try {
      const res = await Taro.cloud.callFunction({
        name: 'recipe',
        data: {
          action: 'get',
          recipeId: id
        }
      })

      if (res.result && res.result.code === 0) {
        const recipe = res.result.data
        setFormData(recipe)
        setIngredients(recipe.ingredients || [])
      } else {
        Taro.showToast({
          title: res.result?.message || '加载失败',
          icon: 'none'
        })
        Taro.navigateBack()
      }
    } catch (error) {
      console.error('加载菜谱失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
      Taro.navigateBack()
    } finally {
      setLoading(false)
    }
  }

  // 加载可用食材列表
  const loadAvailableIngredients = async () => {
    try {
      const res = await Taro.cloud.callFunction({
        name: 'ingredient',
        data: {
          action: 'list',
          page: 1,
          pageSize: 1000  // 加载所有食材
        }
      })

      if (res.result && res.result.code === 0) {
        setAvailableIngredients(res.result.data || [])
      } else {
        console.error('加载食材列表失败:', res.result?.message)
        // 如果加载失败，使用空数组
        setAvailableIngredients([])
      }
    } catch (error) {
      console.error('加载食材列表失败:', error)
      // 如果加载失败，使用空数组
      setAvailableIngredients([])
    }
  }

  // 处理表单输入
  const handleInputChange = (field: keyof Recipe, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 添加食材
  const handleAddIngredient = () => {
    setShowIngredientPicker(true)
  }

  // 选择食材
  const handleSelectIngredient = (ingredient: any) => {
    const newIngredient: RecipeIngredient = {
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantity: 0,
      unit: ingredient.unit || 'g',
      carbonCoefficient: ingredient.carbonCoefficient
    }
    setIngredients(prev => [...prev, newIngredient])
    setShowIngredientPicker(false)
  }

  // 更新食材数量
  const handleUpdateIngredientQuantity = (index: number, quantity: number) => {
    const updated = [...ingredients]
    updated[index].quantity = quantity
    setIngredients(updated)
  }

  // 删除食材
  const handleRemoveIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index)
    setIngredients(updated)
  }

  // 切换渠道
  const handleToggleChannel = (channel: ChannelType) => {
    const channels = formData.channels || []
    const index = channels.indexOf(channel)
    if (index > -1) {
      channels.splice(index, 1)
    } else {
      channels.push(channel)
    }
    handleInputChange('channels', channels)
  }

  // 计算碳足迹
  const calculateCarbonFootprint = async () => {
    if (ingredients.length === 0) {
      Taro.showToast({
        title: '请先添加食材',
        icon: 'none'
      })
      return
    }

    // 检查是否有食材数量为0
    const hasZeroQuantity = ingredients.some(ing => !ing.quantity || ing.quantity <= 0)
    if (hasZeroQuantity) {
      Taro.showToast({
        title: '请设置所有食材的数量',
        icon: 'none'
      })
      return
    }

    setLoading(true)
    try {
      const res = await Taro.cloud.callFunction({
        name: 'carbon',
        data: {
          action: 'calculateRecipe',
          data: {
            ingredients: ingredients.map(ing => ({
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit || 'g'
            })),
            cookingMethod: formData.cookingMethod || 'stir_fried'
          }
        }
      })

      if (res.result && res.result.code === 0) {
        const { carbonFootprint, carbonLabel, carbonScore } = res.result.data
        handleInputChange('carbonFootprint', carbonFootprint)
        handleInputChange('carbonLabel', carbonLabel)
        handleInputChange('carbonScore', carbonScore)
        Taro.showToast({
          title: '计算成功',
          icon: 'success'
        })
      } else {
        Taro.showToast({
          title: res.result?.message || '计算失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('计算碳足迹失败:', error)
      Taro.showToast({
        title: '计算失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  // 保存菜谱
  const handleSave = async (publish: boolean = false) => {
    if (!formData.name || !formData.name.trim()) {
      Taro.showToast({
        title: '请输入菜谱名称',
        icon: 'none'
      })
      return
    }

    if (!formData.category) {
      Taro.showToast({
        title: '请选择菜谱分类',
        icon: 'none'
      })
      return
    }

    if (!formData.cookingMethod) {
      Taro.showToast({
        title: '请选择烹饪方式',
        icon: 'none'
      })
      return
    }

    if (ingredients.length === 0) {
      Taro.showToast({
        title: '请至少添加一种食材',
        icon: 'none'
      })
      return
    }

    // 检查是否有食材数量为0
    const hasZeroQuantity = ingredients.some(ing => !ing.quantity || ing.quantity <= 0)
    if (hasZeroQuantity) {
      Taro.showToast({
        title: '请设置所有食材的数量',
        icon: 'none'
      })
      return
    }

    setSaving(true)
    try {
      const recipeData: Partial<Recipe> = {
        name: formData.name.trim(),
        description: formData.description || '',
        category: formData.category,
        cookingMethod: formData.cookingMethod,
        ingredients: ingredients,
        carbonFootprint: formData.carbonFootprint,
        carbonLabel: formData.carbonLabel,
        carbonScore: formData.carbonScore,
        status: publish ? RecipeStatus.PUBLISHED : RecipeStatus.DRAFT,
        channels: formData.channels || [],
        version: recipeId ? (formData.version || 1) + 1 : 1
      }

      const res = await Taro.cloud.callFunction({
        name: 'recipe',
        data: {
          action: recipeId ? 'update' : 'create',
          recipeId,
          recipe: recipeData
        }
      })

      if (res.result && res.result.code === 0) {
        Taro.showToast({
          title: publish ? '发布成功' : '保存成功',
          icon: 'success'
        })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        Taro.showToast({
          title: res.result?.message || '保存失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('保存菜谱失败:', error)
      Taro.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !formData.name) {
    return <Loading />
  }

  return (
    <View className='recipe-create-page'>
      <ScrollView className='form-container' scrollY>
        <Form>
          {/* 基本信息 */}
          <View className='form-section'>
            <Text className='section-title'>基本信息</Text>

            <View className='form-item'>
              <Text className='label required'>菜谱名称</Text>
              <Input
                className='input'
                placeholder='请输入菜谱名称'
                value={formData.name}
                onInput={(e) => handleInputChange('name', e.detail.value)}
              />
            </View>

            <View className='form-item'>
              <Text className='label'>描述</Text>
              <Input
                className='input'
                placeholder='请输入菜谱描述（可选）'
                value={formData.description}
                onInput={(e) => handleInputChange('description', e.detail.value)}
              />
            </View>

            <View className='form-item'>
              <Text className='label required'>分类</Text>
              <Picker
                mode='selector'
                range={RECIPE_CATEGORIES}
                rangeKey='label'
                value={RECIPE_CATEGORIES.findIndex(item => item.value === formData.category)}
                onChange={(e) => handleInputChange('category', RECIPE_CATEGORIES[e.detail.value].value)}
              >
                <View className='picker'>
                  <Text>
                    {RECIPE_CATEGORIES.find(item => item.value === formData.category)?.label || '请选择分类'}
                  </Text>
                </View>
              </Picker>
            </View>

            <View className='form-item'>
              <Text className='label required'>烹饪方式</Text>
              <Picker
                mode='selector'
                range={COOKING_METHODS}
                rangeKey='label'
                value={COOKING_METHODS.findIndex(item => item.value === formData.cookingMethod)}
                onChange={(e) => handleInputChange('cookingMethod', COOKING_METHODS[e.detail.value].value)}
              >
                <View className='picker'>
                  <Text>
                    {COOKING_METHODS.find(item => item.value === formData.cookingMethod)?.label || '请选择烹饪方式'}
                  </Text>
                </View>
              </Picker>
            </View>
          </View>

          {/* 食材配置 */}
          <View className='form-section'>
            <View className='section-header'>
              <Text className='section-title'>食材配置</Text>
              <Button className='add-btn' onClick={handleAddIngredient}>+ 添加食材</Button>
            </View>

            {ingredients.length === 0 ? (
              <View className='empty-ingredients'>
                <Text className='empty-text'>暂无食材，点击上方按钮添加</Text>
              </View>
            ) : (
              <View className='ingredients-list'>
                {ingredients.map((ingredient, index) => (
                  <View key={index} className='ingredient-item'>
                    <View className='ingredient-info'>
                      <Text className='ingredient-name'>{ingredient.name}</Text>
                      <View className='ingredient-quantity'>
                        <Input
                          className='quantity-input'
                          type='number'
                          placeholder='数量'
                          value={ingredient.quantity.toString()}
                          onInput={(e) => handleUpdateIngredientQuantity(index, parseFloat(e.detail.value) || 0)}
                        />
                        <Text className='unit'>{ingredient.unit}</Text>
                      </View>
                    </View>
                    <Button
                      className='remove-btn'
                      onClick={() => handleRemoveIngredient(index)}
                    >
                      删除
                    </Button>
                  </View>
                ))}
              </View>
            )}

            {ingredients.length > 0 && (
              <Button className='calculate-btn' onClick={calculateCarbonFootprint}>
                计算碳足迹
              </Button>
            )}

            {/* 碳足迹显示 */}
            {formData.carbonFootprint !== undefined && (
              <View className='carbon-result'>
                <View className='carbon-item'>
                  <Text className='carbon-label'>碳足迹：</Text>
                  <Text className='carbon-value'>{formData.carbonFootprint.toFixed(2)} kg CO₂e</Text>
                </View>
                {formData.carbonLabel && (
                  <View className='carbon-item'>
                    <Text className='carbon-label'>碳标签：</Text>
                    <Text
                      className='carbon-tag'
                      style={{
                        backgroundColor:
                          formData.carbonLabel === 'ultraLow' ? '#4CAF50' :  // 绿色 🟢
                          formData.carbonLabel === 'low' ? '#FFEB3B' :       // 黄色 🟡
                          formData.carbonLabel === 'medium' ? '#FF9800' :    // 橙色 🟠
                          '#F44336'  // 红色 🔴
                      }}
                    >
                      {formData.carbonLabel === 'ultraLow' ? '超低碳' :
                       formData.carbonLabel === 'low' ? '低碳' :
                       formData.carbonLabel === 'medium' ? '中碳' : '高碳'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 渠道配置 */}
          <View className='form-section'>
            <Text className='section-title'>渠道配置</Text>
            <View className='channels-list'>
              <View
                className={`channel-item ${(formData.channels || []).includes(ChannelType.DINE_IN) ? 'active' : ''}`}
                onClick={() => handleToggleChannel(ChannelType.DINE_IN)}
              >
                <Checkbox
                  checked={(formData.channels || []).includes(ChannelType.DINE_IN)}
                />
                <Text>堂食</Text>
              </View>
              <View
                className={`channel-item ${(formData.channels || []).includes(ChannelType.TAKE_OUT) ? 'active' : ''}`}
                onClick={() => handleToggleChannel(ChannelType.TAKE_OUT)}
              >
                <Checkbox
                  checked={(formData.channels || []).includes(ChannelType.TAKE_OUT)}
                />
                <Text>外卖</Text>
              </View>
              <View
                className={`channel-item ${(formData.channels || []).includes(ChannelType.PROMOTION) ? 'active' : ''}`}
                onClick={() => handleToggleChannel(ChannelType.PROMOTION)}
              >
                <Checkbox
                  checked={(formData.channels || []).includes(ChannelType.PROMOTION)}
                />
                <Text>宣传物料</Text>
              </View>
            </View>
          </View>
        </Form>
      </ScrollView>

      {/* 底部操作栏 */}
      <View className='action-bar'>
        <Button className='save-btn' onClick={() => handleSave(false)} loading={saving}>
          保存草稿
        </Button>
        <Button className='publish-btn' onClick={() => handleSave(true)} loading={saving}>
          发布
        </Button>
      </View>

      {/* 食材选择器弹窗 */}
      {showIngredientPicker && (
        <View className='ingredient-picker-modal'>
          <View className='modal-content'>
            <View className='modal-header'>
              <Text className='modal-title'>选择食材</Text>
              <Button className='close-btn' onClick={() => setShowIngredientPicker(false)}>关闭</Button>
            </View>
            <ScrollView className='ingredient-list' scrollY>
              {availableIngredients.map((ingredient) => (
                <View
                  key={ingredient._id}
                  className='ingredient-option'
                  onClick={() => handleSelectIngredient(ingredient)}
                >
                  <Text className='ingredient-option-name'>{ingredient.name}</Text>
                  {ingredient.carbonCoefficient && (
                    <Text className='ingredient-option-carbon'>
                      碳系数: {ingredient.carbonCoefficient} kg CO₂e/kg
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  )
}

export default RecipeCreate

