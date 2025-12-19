import IngredientSelector from '@/components/IngredientSelector'
import { carbonAPI } from '@/services/cloudbase'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchIngredients } from '@/store/slices/ingredientSlice'
import { createRecipe, updateRecipe } from '@/store/slices/recipeSlice'
import { ChannelType, Recipe, RecipeIngredient, RecipeStatus } from '@/types'
import { DeleteOutlined, PlusOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  message,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

const { Option } = Select
const { TextArea } = Input

// 这些常量将在组件内部使用翻译函数动态生成

interface RecipeCreateProps {
  editMode?: boolean
  initialData?: Recipe | null
}

const RecipeCreate: React.FC<RecipeCreateProps> = ({ editMode = false, initialData }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const [form] = Form.useForm()
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initialData?.ingredients || [])
  const [ingredientSelectorVisible, setIngredientSelectorVisible] = useState(false)
  const [carbonResult, setCarbonResult] = useState<{
    carbonFootprint?: number
    carbonLabel?: string
    carbonScore?: number
  }>({
    carbonFootprint: initialData?.carbonFootprint,
    carbonLabel: initialData?.carbonLabel,
    carbonScore: initialData?.carbonScore,
  })
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)

  const { ingredients: availableIngredients, loading: ingredientsLoading } =
    useAppSelector((state) => state.ingredient)

  // 使用翻译函数生成分类选项
  const RECIPE_CATEGORIES = [
    { label: t('pages.recipe.list.filters.category.hot'), value: 'hot' },
    { label: t('pages.recipe.list.filters.category.cold'), value: 'cold' },
    { label: t('pages.recipe.list.filters.category.soup'), value: 'soup' },
    { label: t('pages.recipe.list.filters.category.staple'), value: 'staple' },
    { label: t('pages.recipe.list.filters.category.dessert'), value: 'dessert' },
    { label: t('pages.recipe.list.filters.category.drink'), value: 'drink' },
  ]

  // 使用翻译函数生成烹饪方式选项
  const COOKING_METHODS = [
    { label: t('pages.carbon.menu.modal.cookingMethods.steam'), value: 'steamed' },
    { label: t('pages.carbon.menu.modal.cookingMethods.boil'), value: 'boiled' },
    { label: t('pages.carbon.menu.modal.cookingMethods.fry'), value: 'stir_fried' },
    { label: t('pages.carbon.menu.modal.cookingMethods.deepFry'), value: 'fried' },
    { label: t('pages.carbon.menu.modal.cookingMethods.bake'), value: 'baked' },
    { label: t('pages.carbon.menu.modal.cookingMethods.boil'), value: 'stewed' },
    { label: t('pages.carbon.menu.modal.cookingMethods.raw'), value: 'cold_dish' },
    { label: t('pages.carbon.menu.modal.cookingMethods.raw'), value: 'raw' },
  ]

  useEffect(() => {
    dispatch(fetchIngredients({ page: 1, pageSize: 1000 }))
    
    // 如果是编辑模式，填充表单数据
    if (editMode && initialData) {
      form.setFieldsValue({
        name: initialData.name,
        description: initialData.description,
        category: initialData.category,
        cookingMethod: initialData.cookingMethod,
        channels: initialData.channels,
      })
      // 设置食材列表
      if (initialData.ingredients && initialData.ingredients.length > 0) {
        setIngredients(initialData.ingredients)
      }
      // 设置碳足迹结果
      if (initialData.carbonFootprint !== undefined) {
        setCarbonResult({
          carbonFootprint: initialData.carbonFootprint,
          carbonLabel: initialData.carbonLabel,
          carbonScore: initialData.carbonScore,
        })
      }
    }
    
    // 如果是复制模式，填充表单数据
    if (location.state?.copyFrom) {
      const copyFrom = location.state.copyFrom as Recipe
      form.setFieldsValue({
        name: `${copyFrom.name}${t('pages.recipe.create.copy.suffix')}`,
        description: copyFrom.description,
        category: copyFrom.category,
        cookingMethod: copyFrom.cookingMethod,
        channels: copyFrom.channels,
      })
      setIngredients(copyFrom.ingredients || [])
      if (copyFrom.carbonFootprint !== undefined) {
        setCarbonResult({
          carbonFootprint: copyFrom.carbonFootprint,
          carbonLabel: copyFrom.carbonLabel,
          carbonScore: copyFrom.carbonScore,
        })
      }
    }
  }, [dispatch, editMode, initialData, form, location.state])

  const handleAddIngredient = () => {
    setIngredientSelectorVisible(true)
  }

  const handleSelectIngredient = (ingredient: any) => {
    const newIngredient: RecipeIngredient = {
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantity: 0,
      unit: ingredient.unit || 'g',
      carbonCoefficient: ingredient.carbonCoefficient,
    }
    setIngredients([...ingredients, newIngredient])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleUpdateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const handleCalculateCarbon = async () => {
    if (ingredients.length === 0) {
      message.warning(t('pages.recipe.create.messages.addIngredientFirst'))
      return
    }

    const hasZeroQuantity = ingredients.some((ing) => !ing.quantity || ing.quantity <= 0)
    if (hasZeroQuantity) {
      message.warning(t('pages.recipe.create.messages.setQuantity'))
      return
    }

    const cookingMethod = form.getFieldValue('cookingMethod')
    if (!cookingMethod) {
      message.warning(t('pages.recipe.create.messages.selectCookingMethod'))
      return
    }

    setCalculating(true)
    try {
      const result = await carbonAPI.calculateRecipe({
        ingredients: ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit || 'g',
        })),
        cookingMethod,
      })

      if (result.code === 0 && result.data) {
        setCarbonResult({
          carbonFootprint: result.data.carbonFootprint,
          carbonLabel: result.data.carbonLabel,
          carbonScore: result.data.carbonScore,
        })
        message.success(t('pages.recipe.create.messages.calculateSuccess'))
      } else {
        message.error(result.message || t('pages.recipe.create.messages.calculateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('pages.recipe.create.messages.calculateFailed'))
    } finally {
      setCalculating(false)
    }
  }

  const handleSave = async (publish: boolean = false) => {
    try {
      const values = await form.validateFields()
      
      if (ingredients.length === 0) {
        message.warning(t('pages.recipe.create.messages.addAtLeastOne'))
        return
      }

      const hasZeroQuantity = ingredients.some((ing) => !ing.quantity || ing.quantity <= 0)
      if (hasZeroQuantity) {
        message.warning(t('pages.recipe.create.messages.setQuantity'))
        return
      }

      setSaving(true)

      const recipeData: Partial<Recipe> = {
        name: values.name,
        description: values.description,
        category: values.category,
        cookingMethod: values.cookingMethod,
        ingredients,
        carbonFootprint: carbonResult.carbonFootprint,
        carbonLabel: carbonResult.carbonLabel as any,
        carbonScore: carbonResult.carbonScore,
        status: publish ? RecipeStatus.PUBLISHED : RecipeStatus.DRAFT,
        channels: values.channels || [],
        version: 1,
      }

      if (editMode && initialData?._id) {
        await dispatch(updateRecipe({ recipeId: initialData._id, recipe: recipeData })).unwrap()
        message.success(publish ? t('pages.recipe.create.messages.publishSuccess') : t('pages.recipe.create.messages.updateSuccess'))
      } else {
        await dispatch(createRecipe(recipeData)).unwrap()
        message.success(publish ? t('pages.recipe.create.messages.publishSuccess') : t('pages.recipe.create.messages.saveSuccess'))
      }
      navigate('/recipe')
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error.message || t('pages.recipe.create.messages.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const ingredientColumns = [
    {
      title: t('pages.recipe.create.ingredientsTable.columns.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: t('pages.recipe.create.ingredientsTable.columns.quantity'),
      key: 'quantity',
      width: 150,
      render: (_: any, record: RecipeIngredient, index: number) => (
        <InputNumber
          value={record.quantity}
          onChange={(value) => handleUpdateIngredient(index, 'quantity', value || 0)}
          min={0}
          step={0.1}
          precision={2}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: t('pages.recipe.create.ingredientsTable.columns.unit'),
      key: 'unit',
      width: 120,
      render: (_: any, record: RecipeIngredient, index: number) => (
        <Select
          value={record.unit || 'g'}
          onChange={(value) => handleUpdateIngredient(index, 'unit', value)}
          style={{ width: '100%' }}
        >
          <Option value="g">g（克）</Option>
          <Option value="ml">ml（毫升）</Option>
        </Select>
      ),
    },
    {
      title: '备注',
      key: 'notes',
      width: 200,
      render: (_: any, record: RecipeIngredient, index: number) => (
        <Input
          value={record.notes || ''}
          onChange={(e) => handleUpdateIngredient(index, 'notes', e.target.value)}
          placeholder="备注（可选）"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: t('pages.recipe.create.ingredientsTable.columns.actions'),
      key: 'action',
      width: 100,
      render: (_: any, __: RecipeIngredient, index: number) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveIngredient(index)}
        >
          {t('pages.recipe.create.ingredientsTable.actions.delete')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: RecipeStatus.DRAFT,
            channels: [],
          }}
        >
          <Form.Item
            label={t('pages.recipe.create.fields.name')}
            name="name"
            rules={[{ required: true, message: t('pages.recipe.create.messages.nameRequired') }]}
          >
            <Input placeholder={t('pages.recipe.create.placeholders.name')} />
          </Form.Item>

          <Form.Item label={t('pages.recipe.create.fields.description')} name="description">
            <TextArea rows={3} placeholder={t('pages.recipe.create.placeholders.description')} />
          </Form.Item>

          <Form.Item
            label={t('pages.recipe.create.fields.category')}
            name="category"
            rules={[{ required: true, message: t('pages.recipe.create.messages.categoryRequired') }]}
          >
            <Select placeholder={t('pages.recipe.create.placeholders.category')}>
              {RECIPE_CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={t('pages.recipe.create.fields.cookingMethod')}
            name="cookingMethod"
            rules={[{ required: true, message: t('pages.recipe.create.messages.cookingMethodRequired') }]}
          >
            <Select placeholder={t('pages.recipe.create.placeholders.cookingMethod')}>
              {COOKING_METHODS.map((method) => (
                <Option key={method.value} value={method.value}>
                  {method.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label={t('pages.recipe.create.fields.ingredients')}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#666' }}>
                  已添加 {ingredients.length} 种食材
                  {ingredients.length > 0 && (
                    <span style={{ marginLeft: 16, color: '#999' }}>
                      总用量: {ingredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0).toFixed(2)}
                    </span>
                  )}
                </span>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={handleAddIngredient}
                >
                  {t('pages.recipe.create.buttons.addIngredient')}
                </Button>
              </div>
              {ingredients.length > 0 && (
                <Table
                  columns={ingredientColumns}
                  dataSource={ingredients}
                  rowKey={(record, index) => `${record.ingredientId}-${index}`}
                  pagination={false}
                  size="small"
                  bordered
                />
              )}
              {ingredients.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999', border: '1px dashed #d9d9d9', borderRadius: 4 }}>
                  暂无食材，请点击上方按钮添加食材
                </div>
              )}
              {ingredients.length > 0 && (
                <Button
                  type="primary"
                  onClick={handleCalculateCarbon}
                  loading={calculating}
                  block
                >
                  {t('pages.recipe.create.buttons.calculateCarbon')}
                </Button>
              )}
            </Space>
          </Form.Item>

          {carbonResult.carbonFootprint !== undefined && (
            <Form.Item label={t('pages.recipe.create.fields.carbonResult')}>
              <Space direction="vertical">
                <div>
                  <strong>{t('pages.recipe.create.carbonResult.footprint')}</strong>
                  {carbonResult.carbonFootprint.toFixed(2)} kg CO₂e
                </div>
                {carbonResult.carbonLabel && (
                  <div>
                    <strong>{t('pages.recipe.create.carbonResult.label')}</strong>
                    {carbonResult.carbonLabel === 'ultra_low'
                      ? t('pages.recipe.list.filters.carbonLabel.ultraLow')
                      : carbonResult.carbonLabel === 'low'
                      ? t('pages.recipe.list.filters.carbonLabel.low')
                      : carbonResult.carbonLabel === 'medium'
                      ? t('pages.recipe.list.filters.carbonLabel.medium')
                      : t('pages.recipe.list.filters.carbonLabel.high')}
                  </div>
                )}
                {carbonResult.carbonScore !== undefined && (
                  <div>
                    <strong>{t('pages.recipe.create.carbonResult.score')}</strong>
                    {carbonResult.carbonScore} {t('common.minute') === '分钟' ? '分' : 'pts'}
                  </div>
                )}
              </Space>
            </Form.Item>
          )}

          <Form.Item label={t('pages.recipe.create.fields.channels')} name="channels">
            <Checkbox.Group>
              <Checkbox value={ChannelType.DINE_IN}>{t('pages.recipe.create.channels.dineIn')}</Checkbox>
              <Checkbox value={ChannelType.TAKE_OUT}>{t('pages.recipe.create.channels.takeOut')}</Checkbox>
              <Checkbox value={ChannelType.PROMOTION}>{t('pages.recipe.create.channels.promotion')}</Checkbox>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                icon={<SaveOutlined />}
                onClick={() => handleSave(false)}
                loading={saving}
              >
                {t('pages.recipe.create.buttons.saveDraft')}
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSave(true)}
                loading={saving}
              >
                {t('pages.recipe.create.buttons.publish')}
              </Button>
              <Button onClick={() => navigate('/recipe')}>{t('pages.recipe.create.buttons.cancel')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      
      <IngredientSelector
        visible={ingredientSelectorVisible}
        onCancel={() => setIngredientSelectorVisible(false)}
        onSelect={handleSelectIngredient}
        excludeIds={ingredients.map(ing => ing.ingredientId)}
      />
    </div>
  )
}

export default RecipeCreate

