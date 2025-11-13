import React, { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  Table,
  message,
  InputNumber,
  Checkbox,
} from 'antd'
import { SaveOutlined, SendOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createRecipe, updateRecipe } from '@/store/slices/recipeSlice'
import { fetchIngredients } from '@/store/slices/ingredientSlice'
import { carbonAPI } from '@/services/cloudbase'
import { Recipe, RecipeIngredient, RecipeStatus, ChannelType } from '@/types'

const { Option } = Select
const { TextArea } = Input

const RECIPE_CATEGORIES = [
  { label: '热菜', value: 'hot' },
  { label: '凉菜', value: 'cold' },
  { label: '汤品', value: 'soup' },
  { label: '主食', value: 'staple' },
  { label: '甜品', value: 'dessert' },
  { label: '饮品', value: 'drink' },
]

const COOKING_METHODS = [
  { label: '蒸', value: 'steamed' },
  { label: '煮', value: 'boiled' },
  { label: '炒', value: 'stir_fried' },
  { label: '炸', value: 'fried' },
  { label: '烤', value: 'baked' },
  { label: '炖', value: 'stewed' },
  { label: '凉拌', value: 'cold_dish' },
  { label: '生食', value: 'raw' },
]

interface RecipeCreateProps {
  editMode?: boolean
  initialData?: Recipe | null
}

const RecipeCreate: React.FC<RecipeCreateProps> = ({ editMode = false, initialData }) => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [form] = Form.useForm()
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initialData?.ingredients || [])
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
    }
  }, [dispatch, editMode, initialData, form])

  const handleAddIngredient = () => {
    if (availableIngredients.length === 0) {
      message.warning('请先加载食材列表')
      return
    }
    // 打开食材选择弹窗（简化版：直接添加第一个）
    const firstIngredient = availableIngredients[0]
    const newIngredient: RecipeIngredient = {
      ingredientId: firstIngredient._id,
      name: firstIngredient.name,
      quantity: 0,
      unit: firstIngredient.unit || 'g',
      carbonCoefficient: firstIngredient.carbonCoefficient,
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
      message.warning('请先添加食材')
      return
    }

    const hasZeroQuantity = ingredients.some((ing) => !ing.quantity || ing.quantity <= 0)
    if (hasZeroQuantity) {
      message.warning('请设置所有食材的数量')
      return
    }

    const cookingMethod = form.getFieldValue('cookingMethod')
    if (!cookingMethod) {
      message.warning('请先选择烹饪方式')
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
        message.success('碳足迹计算成功')
      } else {
        message.error(result.message || '计算失败')
      }
    } catch (error: any) {
      message.error(error.message || '计算失败')
    } finally {
      setCalculating(false)
    }
  }

  const handleSave = async (publish: boolean = false) => {
    try {
      const values = await form.validateFields()
      
      if (ingredients.length === 0) {
        message.warning('请至少添加一种食材')
        return
      }

      const hasZeroQuantity = ingredients.some((ing) => !ing.quantity || ing.quantity <= 0)
      if (hasZeroQuantity) {
        message.warning('请设置所有食材的数量')
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
        message.success(publish ? '发布成功' : '更新成功')
      } else {
        await dispatch(createRecipe(recipeData)).unwrap()
        message.success(publish ? '发布成功' : '保存成功')
      }
      navigate('/recipe')
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const ingredientColumns = [
    {
      title: '食材名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '数量',
      key: 'quantity',
      width: 150,
      render: (_: any, record: RecipeIngredient, index: number) => (
        <InputNumber
          value={record.quantity}
          onChange={(value) => handleUpdateIngredient(index, 'quantity', value || 0)}
          min={0}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, __: RecipeIngredient, index: number) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveIngredient(index)}
        >
          删除
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
            label="菜谱名称"
            name="name"
            rules={[{ required: true, message: '请输入菜谱名称' }]}
          >
            <Input placeholder="请输入菜谱名称" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={3} placeholder="请输入菜谱描述（可选）" />
          </Form.Item>

          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类">
              {RECIPE_CATEGORIES.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="烹饪方式"
            name="cookingMethod"
            rules={[{ required: true, message: '请选择烹饪方式' }]}
          >
            <Select placeholder="请选择烹饪方式">
              {COOKING_METHODS.map((method) => (
                <Option key={method.value} value={method.value}>
                  {method.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="食材配置">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddIngredient}
                block
              >
                添加食材
              </Button>
              {ingredients.length > 0 && (
                <Table
                  columns={ingredientColumns}
                  dataSource={ingredients}
                  rowKey={(record, index) => `${record.ingredientId}-${index}`}
                  pagination={false}
                  size="small"
                />
              )}
              {ingredients.length > 0 && (
                <Button
                  type="primary"
                  onClick={handleCalculateCarbon}
                  loading={calculating}
                >
                  计算碳足迹
                </Button>
              )}
            </Space>
          </Form.Item>

          {carbonResult.carbonFootprint !== undefined && (
            <Form.Item label="碳足迹结果">
              <Space direction="vertical">
                <div>
                  <strong>碳足迹：</strong>
                  {carbonResult.carbonFootprint.toFixed(2)} kg CO₂e
                </div>
                {carbonResult.carbonLabel && (
                  <div>
                    <strong>碳标签：</strong>
                    {carbonResult.carbonLabel === 'ultra_low'
                      ? '超低碳'
                      : carbonResult.carbonLabel === 'low'
                      ? '低碳'
                      : carbonResult.carbonLabel === 'medium'
                      ? '中碳'
                      : '高碳'}
                  </div>
                )}
                {carbonResult.carbonScore !== undefined && (
                  <div>
                    <strong>碳评分：</strong>
                    {carbonResult.carbonScore} 分
                  </div>
                )}
              </Space>
            </Form.Item>
          )}

          <Form.Item label="渠道配置" name="channels">
            <Checkbox.Group>
              <Checkbox value={ChannelType.DINE_IN}>堂食</Checkbox>
              <Checkbox value={ChannelType.TAKE_OUT}>外卖</Checkbox>
              <Checkbox value={ChannelType.PROMOTION}>宣传物料</Checkbox>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                icon={<SaveOutlined />}
                onClick={() => handleSave(false)}
                loading={saving}
              >
                保存草稿
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSave(true)}
                loading={saving}
              >
                发布
              </Button>
              <Button onClick={() => navigate('/recipe')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default RecipeCreate

