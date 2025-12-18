import IngredientSelector from '@/components/IngredientSelector'
import { recipeAPI, tenantAPI } from '@/services/cloudbase'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchIngredients } from '@/store/slices/ingredientSlice'
import { RecipeIngredient, RecipeStatus } from '@/types'
import { CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, ShoppingCartOutlined, UploadOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'

const { Text } = Typography
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

// 菜单项接口
interface MenuItem {
  _id: string
  id: string
  name: string
  description?: string
  price?: number
  carbonFootprint?: number | {
    value: number
    baseline: number
    reduction: number
    breakdown?: {
      ingredients: number
      energy: number
      packaging: number
      transport: number
    }
  }
  carbonLabel?: string
  category?: string
  ingredients?: any[]
  status?: string
  isAvailable?: boolean
  baseRecipeId?: string
  restaurantId: string
  mealType?: 'meat_simple' | 'meat_full'
  energyType?: 'electric' | 'gas' | 'mixed'
  calculationLevel?: 'L1' | 'L2' | 'L3'
  cookingMethod?: string
  cookingTime?: number
  baselineInfo?: {
    baselineId: string | null
    version: string | null
    source: string | null
  }
}

// 基础菜谱接口
interface BaseRecipe {
  _id: string
  name: string
  category?: string
  carbonFootprint?: number | { value: number }
  carbonLabel?: string
  ingredients?: any[]
  description?: string
  cookingMethod?: string
}

const RecipeList: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  
  // 菜单项相关状态
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  
  // 搜索和筛选
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  
  // 基础菜谱选择器相关状态
  const [baseRecipeSelectorVisible, setBaseRecipeSelectorVisible] = useState(false)
  const [baseRecipes, setBaseRecipes] = useState<BaseRecipe[]>([])
  const [baseRecipesLoading, setBaseRecipesLoading] = useState(false)
  const [baseRecipeSearchKeyword, setBaseRecipeSearchKeyword] = useState('')
  const [baseRecipeCategoryFilter, setBaseRecipeCategoryFilter] = useState<string>('all')
  const [selectedBaseRecipe, setSelectedBaseRecipe] = useState<BaseRecipe | null>(null)
  const [addToMenuForm] = Form.useForm()
  const [addingToMenu, setAddingToMenu] = useState(false)
  const [baseRecipesPagination, setBaseRecipesPagination] = useState({ page: 1, pageSize: 10, total: 0 })
  const [addedBaseRecipeIds, setAddedBaseRecipeIds] = useState<Set<string>>(new Set())
  const [showAddedRecipes, setShowAddedRecipes] = useState(true) // 是否显示已添加的菜谱

  // 编辑菜单项相关状态
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [editForm] = Form.useForm()
  const [updating, setUpdating] = useState(false)
  const [editIngredients, setEditIngredients] = useState<RecipeIngredient[]>([])
  const [editIngredientSelectorVisible, setEditIngredientSelectorVisible] = useState(false)

  // 手工创建菜谱相关状态
  const [createRecipeModalVisible, setCreateRecipeModalVisible] = useState(false)
  const [createRecipeForm] = Form.useForm()
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([])
  const [ingredientSelectorVisible, setIngredientSelectorVisible] = useState(false)
  const [creatingRecipe, setCreatingRecipe] = useState(false)

  // 加载餐厅菜单项
  useEffect(() => {
    if (currentRestaurantId) {
      loadMenuItems()
    } else {
      setMenuItems([])
      setPagination({ page: 1, pageSize: 20, total: 0 })
    }
  }, [currentRestaurantId, pagination.page, pagination.pageSize])

  // 检查URL参数，如果有editId则自动打开编辑弹窗
  useEffect(() => {
    const editId = searchParams.get('editId')
    if (editId && menuItems.length > 0 && !editModalVisible) {
      const menuItem = menuItems.find(item => (item._id === editId || item.id === editId))
      if (menuItem) {
        handleEditMenuItem(menuItem)
        // 清除URL参数
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('editId')
        setSearchParams(newParams, { replace: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, menuItems, editModalVisible])

  // 加载菜单项列表
  const loadMenuItems = async () => {
    if (!currentRestaurantId) {
      return
    }

    try {
      setLoading(true)
      const result = await (tenantAPI as any).getMenuList({
        restaurantId: currentRestaurantId,
        page: pagination.page,
        pageSize: pagination.pageSize,
      })

      if (result && result.code === 0 && result.data) {
        const data = result.data
        const items = Array.isArray(data) ? data : (data.menus || data.menuItems || [])
        setMenuItems(items)
        // 如果没有返回总数，使用当前数据长度作为总数（分页可能不准确，但至少能显示）
        setPagination(prev => ({
          ...prev,
          total: data.total || data.totalCount || items.length,
        }))
      } else {
        message.error(result?.message || '加载菜单项失败')
      }
    } catch (error: any) {
      console.error('加载菜单项失败:', error)
      message.error(error.message || '加载菜单项失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载基础菜谱列表（用于选择器）
  const loadBaseRecipes = async (page = 1) => {
    try {
      setBaseRecipesLoading(true)
      const result = await recipeAPI.list({
        isBaseRecipe: true,
        keyword: baseRecipeSearchKeyword || undefined,
        category: baseRecipeCategoryFilter !== 'all' ? baseRecipeCategoryFilter : undefined,
        page: page,
        pageSize: baseRecipesPagination.pageSize,
      })

      // 处理返回结果
      const actualResult = result?.result || result
      
      if (actualResult && actualResult.code === 0) {
        // 基础菜谱查询返回格式：{ code: 0, data: { data: [...], pagination: {...} } }
        const data = actualResult.data
        const recipes = data?.data || data || []
        
        // 过滤已添加的菜谱（如果设置了不显示）
        let filteredRecipes = recipes
        if (!showAddedRecipes && currentRestaurantId && addedBaseRecipeIds.size > 0) {
          filteredRecipes = recipes.filter((recipe: BaseRecipe) => !addedBaseRecipeIds.has(recipe._id))
        }
        
        setBaseRecipes(filteredRecipes)
        
        // 更新分页信息
        if (data?.pagination) {
          const total = data.pagination.total || 0
          // 如果隐藏已添加的菜谱，需要调整总数
          let adjustedTotal = total
          if (!showAddedRecipes && currentRestaurantId && addedBaseRecipeIds.size > 0) {
            // 这里简化处理：如果当前页过滤后数量少于预期，说明有已添加的菜谱被过滤
            // 实际应该查询总数后再过滤，但为了性能，这里使用当前页的结果估算
            adjustedTotal = Math.max(0, total - addedBaseRecipeIds.size)
          }
          
          setBaseRecipesPagination(prev => ({
            ...prev,
            page: data.pagination.page || page,
            total: adjustedTotal,
          }))
        } else {
          setBaseRecipesPagination(prev => ({
            ...prev,
            page: page,
            total: filteredRecipes.length,
          }))
        }
      } else {
        const errorMsg = actualResult?.message || result?.message || '加载基础菜谱失败'
        message.error(errorMsg)
      }
    } catch (error: any) {
      console.error('加载基础菜谱异常:', error)
      message.error(error.message || '加载基础菜谱失败')
    } finally {
      setBaseRecipesLoading(false)
    }
  }

  // 加载已添加到菜单的基础菜谱ID列表
  const loadAddedBaseRecipeIds = async () => {
    if (!currentRestaurantId) {
      setAddedBaseRecipeIds(new Set())
      return
    }

    try {
      const result = await tenantAPI.getAddedBaseRecipeIds({
        restaurantId: currentRestaurantId,
      })

      if (result && result.code === 0 && result.data && result.data.baseRecipeIds) {
        setAddedBaseRecipeIds(new Set(result.data.baseRecipeIds))
      } else {
        setAddedBaseRecipeIds(new Set())
      }
    } catch (error: any) {
      console.error('查询已添加到菜单的基础菜谱ID列表失败:', error)
      setAddedBaseRecipeIds(new Set())
    }
  }

  // 打开基础菜谱选择器
  const handleOpenBaseRecipeSelector = () => {
    if (!currentRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }
    setBaseRecipeSelectorVisible(true)
    setBaseRecipeSearchKeyword('')
    setBaseRecipeCategoryFilter('all')
    setSelectedBaseRecipe(null)
    setBaseRecipes([])
    setBaseRecipesPagination({ page: 1, pageSize: 10, total: 0 })
    // 加载已添加的菜谱ID列表
    loadAddedBaseRecipeIds()
    // 延迟加载，确保 Modal 已经渲染
    setTimeout(() => {
      loadBaseRecipes(1)
    }, 100)
  }

  // 搜索菜单项
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    loadMenuItems()
  }

  // 删除菜单项
  const handleDeleteMenuItem = async (menuItem: MenuItem) => {
    try {
      // 如果菜单项有 baseRecipeId，说明是从基础菜谱添加的，使用 removeRecipeFromMenu
      if (menuItem.baseRecipeId) {
        const result = await tenantAPI.removeRecipeFromMenu({
          recipeId: menuItem.baseRecipeId,
          restaurantId: currentRestaurantId!,
        })

        // callCloudFunction 已经处理了返回格式，直接返回 { code, message, data }
        // 但为了兼容，也支持 { result: { code, message, data } } 格式
        const actualResult = result?.result || result
        
        // 检查返回结果
        if (actualResult && actualResult.code === 0) {
          message.success('移出成功')
          loadMenuItems()
        } else {
          // 如果返回的 code 不是 0，先刷新列表
          // 然后重新查询列表，检查是否真的删除了
          await loadMenuItems()
          
          // 延迟重新查询列表，确认删除状态
          setTimeout(async () => {
            try {
              const checkResult = await tenantAPI.getMenuList({
                restaurantId: currentRestaurantId,
                page: pagination.page,
                pageSize: pagination.pageSize,
              })
              
              const checkData = checkResult?.result || checkResult
              const checkItems = checkData?.data?.data || checkData?.data || []
              
              // 检查是否还存在该项
              const itemStillExists = checkItems.some((item: MenuItem) => 
                (item._id === menuItem._id || item.id === menuItem.id) && 
                item.baseRecipeId === menuItem.baseRecipeId
              )
              
              if (!itemStillExists) {
                // 如果列表中已经没有该项，说明删除成功
                message.success('移出成功')
              } else {
                // 如果仍然存在，显示错误消息
                const errorMsg = actualResult?.message || result?.message || '移出失败'
                message.error(errorMsg)
              }
            } catch (checkError) {
              console.error('检查删除状态失败:', checkError)
              // 如果检查失败，假设删除成功（因为用户反馈数据已删除）
              message.success('移出成功')
            }
          }, 500)
        }
      } else {
        // 如果是餐厅自己创建的菜单项，直接删除（需要添加删除菜单项的API）
        // 暂时使用 removeRecipeFromMenu，传入菜单项ID
        message.warning('删除餐厅自定义菜单项功能开发中')
      }
    } catch (error: any) {
      console.error('删除菜单项失败:', error)
      // 即使出错，也尝试刷新列表，因为删除可能已经成功
      await loadMenuItems()
      
      // 延迟重新查询列表，确认删除状态
      setTimeout(async () => {
        try {
          const checkResult = await tenantAPI.getMenuList({
            restaurantId: currentRestaurantId,
            page: pagination.page,
            pageSize: pagination.pageSize,
          })
          
          const checkData = checkResult?.result || checkResult
          const checkItems = checkData?.data?.data || checkData?.data || []
          
          const itemStillExists = checkItems.some((item: MenuItem) => 
            (item._id === menuItem._id || item.id === menuItem.id) && 
            item.baseRecipeId === menuItem.baseRecipeId
          )
          
          if (!itemStillExists) {
            message.success('移出成功')
          } else {
            message.error(error.message || '移出失败')
          }
        } catch (checkError) {
          console.error('检查删除状态失败:', checkError)
          message.error(error.message || '移出失败')
        }
      }, 500)
    }
  }

  // 打开编辑菜单项Modal
  const handleEditMenuItem = (menuItem: MenuItem) => {
    setEditingMenuItem(menuItem)
    setEditModalVisible(true)
    // 设置表单初始值
    editForm.setFieldsValue({
      name: menuItem.name,
      description: menuItem.description || '',
      price: menuItem.price || 0,
      category: menuItem.category || '',
      status: menuItem.status || 'active',
      isAvailable: menuItem.isAvailable !== false, // 默认为true
    })
    // 设置食材列表
    if (menuItem.ingredients && menuItem.ingredients.length > 0) {
      setEditIngredients(menuItem.ingredients)
    } else {
      setEditIngredients([])
    }
  }

  // 保存编辑的菜单项
  const handleUpdateMenuItem = async () => {
    if (!editingMenuItem || !currentRestaurantId) {
      return
    }

    try {
      const values = await editForm.validateFields()
      setUpdating(true)

      // 确保食材数据格式正确
      const ingredientsData = editIngredients.map(ing => ({
        ingredientId: ing.ingredientId,
        name: ing.name,
        quantity: ing.quantity || 0,
        unit: ing.unit || 'g',
        notes: ing.notes || '',
        carbonCoefficient: ing.carbonCoefficient,
      }))

      const result = await tenantAPI.updateMenuItem({
        menuItemId: editingMenuItem._id || editingMenuItem.id,
        restaurantId: currentRestaurantId,
        updateData: {
          name: values.name,
          description: values.description,
          price: values.price,
          category: values.category,
          status: values.status,
          isAvailable: values.isAvailable,
          ingredients: ingredientsData, // 添加食材数据
        },
      })

      const actualResult = result?.result || result
      if (actualResult && actualResult.code === 0) {
        message.success('更新成功')
        setEditModalVisible(false)
        setEditingMenuItem(null)
        editForm.resetFields()
        setEditIngredients([])
        loadMenuItems()
      } else {
        message.error(actualResult?.message || result?.message || '更新失败')
      }
    } catch (error: any) {
      console.error('更新菜单项失败:', error)
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error.message || '更新失败')
    } finally {
      setUpdating(false)
    }
  }

  // 编辑模式下的食材操作
  const handleAddEditIngredient = () => {
    setEditIngredientSelectorVisible(true)
  }

  const handleSelectEditIngredient = (ingredient: any) => {
    const newIngredient: RecipeIngredient = {
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantity: 0,
      unit: ingredient.unit || 'g',
      carbonCoefficient: ingredient.carbonCoefficient,
    }
    setEditIngredients([...editIngredients, newIngredient])
  }

  const handleRemoveEditIngredient = (index: number) => {
    setEditIngredients(editIngredients.filter((_, i) => i !== index))
  }

  const handleUpdateEditIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...editIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setEditIngredients(updated)
  }

  // 选择基础菜谱并添加到菜单
  const handleSelectBaseRecipe = (recipe: BaseRecipe) => {
    setSelectedBaseRecipe(recipe)
    addToMenuForm.setFieldsValue({
      price: 0,
      isAvailable: true,
    })
  }

  // 提交添加到菜单
  const handleAddToMenuSubmit = async () => {
    if (!selectedBaseRecipe || !currentRestaurantId) {
      return
    }

    try {
      const values = await addToMenuForm.validateFields()
      setAddingToMenu(true)

      const result = await tenantAPI.createMenuItemFromRecipe({
        recipeId: selectedBaseRecipe._id,
        restaurantId: currentRestaurantId,
        customFields: {
          price: values.price,
          isAvailable: values.isAvailable,
        },
      })

      const actualResult = result?.result || result
      if (actualResult && actualResult.code === 0) {
        message.success('已成功添加到菜单')
        // 刷新已添加的菜谱ID列表
        await loadAddedBaseRecipeIds()
        // 刷新当前页的基础菜谱列表（更新状态标记）
        loadBaseRecipes(baseRecipesPagination.page)
        // 刷新主菜单列表
        loadMenuItems()
        // 关闭选择器（可选，也可以保持打开让用户继续添加）
        // setBaseRecipeSelectorVisible(false)
        addToMenuForm.resetFields()
        setSelectedBaseRecipe(null)
      } else if (actualResult?.code === 409 || result?.code === 409) {
        message.warning('该菜谱已添加到菜单中')
        // 即使已添加，也刷新已添加列表
        await loadAddedBaseRecipeIds()
        loadBaseRecipes(baseRecipesPagination.page)
      } else {
        message.error(actualResult?.message || result?.message || '添加到菜单失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || '添加到菜单失败')
    } finally {
      setAddingToMenu(false)
    }
  }

  // 批量导入菜谱
  const handleBatchImport = (file: File) => {
    message.info('正在导入...')
    // 批量导入功能开发中
    return false
  }

  // 手工创建菜谱相关函数
  const handleAddRecipeIngredient = () => {
    setIngredientSelectorVisible(true)
  }

  const handleSelectRecipeIngredient = (ingredient: any) => {
    const newIngredient: RecipeIngredient = {
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantity: 0,
      unit: ingredient.unit || 'g',
    }
    setRecipeIngredients([...recipeIngredients, newIngredient])
  }

  const handleRemoveRecipeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))
  }

  const handleUpdateRecipeIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...recipeIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setRecipeIngredients(updated)
  }

  const handleCreateRecipe = async () => {
    try {
      const values = await createRecipeForm.validateFields()
      
      if (recipeIngredients.length === 0) {
        message.warning('请至少添加一种食材')
        return
      }

      const hasZeroQuantity = recipeIngredients.some((ing) => !ing.quantity || ing.quantity <= 0)
      if (hasZeroQuantity) {
        message.warning('请设置所有食材的数量')
        return
      }

      if (!currentRestaurantId) {
        message.warning('请先选择餐厅')
        return
      }

      setCreatingRecipe(true)

      // 1. 先创建菜谱
      const recipeData: any = {
        name: values.name,
        description: values.description,
        category: values.category,
        cookingMethod: values.cookingMethod,
        ingredients: recipeIngredients,
        status: RecipeStatus.DRAFT,
        version: 1,
        isBaseRecipe: true, // 设置为true，这样才能通过createMenuItemFromRecipe添加到菜单
        restaurantId: currentRestaurantId, // 添加餐厅ID
      }

      // 调用 recipeAPI.create 时传递 restaurantId
      const createResult = await recipeAPI.create(recipeData, currentRestaurantId)
      
      // 检查返回结果格式
      const actualCreateResult = createResult?.result || createResult
      if (actualCreateResult && actualCreateResult.code === 0 && actualCreateResult.data && actualCreateResult.data._id) {
        // 2. 创建成功后，立即将其添加到菜单中
        const addToMenuResult = await tenantAPI.createMenuItemFromRecipe({
          recipeId: actualCreateResult.data._id,
          restaurantId: currentRestaurantId,
          customFields: {
            price: values.price || 0,
            isAvailable: values.isAvailable !== false,
          },
        })

        const actualResult = addToMenuResult?.result || addToMenuResult
        if (actualResult && actualResult.code === 0) {
          message.success('创建成功并已添加到菜单')
          setCreateRecipeModalVisible(false)
          createRecipeForm.resetFields()
          setRecipeIngredients([])
          // 刷新菜单列表
          loadMenuItems()
        } else {
          message.warning('菜谱创建成功，但添加到菜单失败：' + (actualResult?.message || '未知错误'))
          // 即使添加到菜单失败，也关闭弹窗，因为菜谱已经创建成功了
          setCreateRecipeModalVisible(false)
          createRecipeForm.resetFields()
          setRecipeIngredients([])
        }
      } else {
        message.error(actualCreateResult?.message || createResult?.message || '创建菜谱失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || '创建失败')
    } finally {
      setCreatingRecipe(false)
    }
  }

  // 菜单项表格列定义
  const menuItemColumns = [
    {
      title: '菜品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '价格（元）',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => price !== undefined && price !== null ? `¥${price.toFixed(2)}` : '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: MenuItem) => {
        if (record.isAvailable === false) {
          return <Tag color="red">不可用</Tag>
        }
        if (status === 'active' || !status) {
          return <Tag color="green">可用</Tag>
        }
        return <Tag>{status}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: MenuItem) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => navigate(`/carbon/menu?highlightId=${record.id || record._id}`)}
            size="small"
          >
            查看碳足迹详情
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditMenuItem(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个菜品吗？"
            onConfirm={() => handleDeleteMenuItem(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // 获取分类显示文本
  const getCategoryText = (category?: string) => {
    const categoryMap: Record<string, string> = {
      hot: '热菜',
      cold: '凉菜',
      soup: '汤品',
      staple: '主食',
      dessert: '甜品',
      drink: '饮品',
    }
    return categoryMap[category || ''] || category || '-'
  }

  // 获取烹饪方式显示文本
  const getCookingMethodText = (method?: string) => {
    const methodMap: Record<string, string> = {
      raw: '生食',
      steamed: '蒸',
      boiled: '煮',
      stir_fried: '炒',
      fried: '炸',
      baked: '烤',
    }
    return methodMap[method || ''] || method || '-'
  }

  // 基础菜谱表格列定义（用于选择器）
  const baseRecipeColumns = [
    {
      title: '菜谱名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: BaseRecipe) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
          {record.description && (
            <div style={{ fontSize: 12, color: '#999', lineHeight: 1.4 }}>
              {record.description.length > 30 
                ? `${record.description.substring(0, 30)}...` 
                : record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (category: string) => (
        <Tag color="blue">{getCategoryText(category)}</Tag>
      ),
    },
    {
      title: '食材数',
      dataIndex: 'ingredients',
      key: 'ingredients',
      width: 80,
      render: (ingredients: any[]) => {
        const count = Array.isArray(ingredients) ? ingredients.length : 0
        return <span>{count} 种</span>
      },
    },
    {
      title: '烹饪方式',
      dataIndex: 'cookingMethod',
      key: 'cookingMethod',
      width: 100,
      render: (method: string) => getCookingMethodText(method),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: BaseRecipe) => {
        const isAdded = addedBaseRecipeIds.has(record._id)
        if (isAdded) {
          return (
            <Tag color="green" icon={<CheckOutlined />}>
              已添加
            </Tag>
          )
        }
        return <Tag color="default">未添加</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: BaseRecipe) => {
        const isAdded = addedBaseRecipeIds.has(record._id)
        if (isAdded) {
          return (
            <Button type="link" disabled style={{ color: '#999' }}>
              已添加
            </Button>
          )
        }
        return (
          <Button
            type="primary"
            size="small"
            onClick={() => handleSelectBaseRecipe(record)}
          >
            选择
          </Button>
        )
      },
    },
  ]

  // 当前选中的餐厅
  const currentRestaurant = currentRestaurantId
    ? restaurants.find((r: any) => r.id === currentRestaurantId)
    : null

  return (
    <div>
      <Card>
        {/* 提示信息 */}
        {!currentRestaurantId && restaurants.length > 1 && (
          <Alert
            message="请先选择餐厅"
            description="请从顶部标题栏选择餐厅，然后查看和管理该餐厅的菜单项。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {currentRestaurantId && (
          <>
            {/* 操作栏 */}
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <Space>
                    <Input
                      placeholder="搜索菜品名称..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onPressEnter={handleSearch}
                      prefix={<SearchOutlined />}
                      style={{ width: 300 }}
                    />
                    <Button type="primary" onClick={handleSearch}>
                      搜索
                    </Button>
                  </Space>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Space>
                    <Upload 
                      accept=".xlsx,.xls,.csv" 
                      beforeUpload={handleBatchImport} 
                      showUploadList={false}
                    >
                      <Button icon={<UploadOutlined />}>
                        批量导入
                      </Button>
                    </Upload>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        if (!currentRestaurantId) {
                          message.warning('请先选择餐厅')
                          return
                        }
                        dispatch(fetchIngredients({ page: 1, pageSize: 1000 }))
                        setCreateRecipeModalVisible(true)
                      }}
                    >
                      手工创建菜谱
                    </Button>
                    <Button
                      type="primary"
                      icon={<ShoppingCartOutlined />}
                      onClick={handleOpenBaseRecipeSelector}
                    >
                      从基础菜谱库添加
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>

            {/* 菜单项表格 */}
            <Table
              columns={menuItemColumns}
              dataSource={menuItems}
              rowKey="_id"
              loading={loading}
              expandable={{
                expandedRowRender: (record) => {
                  if (!record.ingredients || record.ingredients.length === 0) {
                    return (
                      <div style={{ padding: '16px', color: '#999' }}>
                        <Text type="secondary">该菜品暂无食材信息</Text>
                      </div>
                    )
                  }

                  const ingredientColumns = [
                    {
                      title: '食材名称',
                      dataIndex: 'name',
                      key: 'name',
                      width: 200,
                    },
                    {
                      title: '用量',
                      key: 'quantity',
                      width: 150,
                      render: (_: any, ingredient: any) => (
                        <Text>
                          {ingredient.quantity} {ingredient.unit || 'g'}
                        </Text>
                      ),
                    },
                    {
                      title: '备注',
                      dataIndex: 'notes',
                      key: 'notes',
                      render: (notes: string) => notes || <Text type="secondary">-</Text>,
                    },
                  ]

                  return (
                    <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                      <Text strong style={{ marginBottom: '12px', display: 'block' }}>
                        食材详情（共 {record.ingredients.length} 种）
                      </Text>
                      <Table
                        columns={ingredientColumns}
                        dataSource={record.ingredients}
                        rowKey={(item, index) => `${item.ingredientId || item.name || index}-${index}`}
                        pagination={false}
                        size="small"
                        bordered
                      />
                    </div>
                  )
                },
                rowExpandable: (record) => true,
                expandRowByClick: false,
              }}
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, page, pageSize }))
                },
              }}
            />
          </>
        )}

        {currentRestaurantId && menuItems.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <p>暂无菜单项</p>
            <p style={{ marginTop: 8, fontSize: 12 }}>
              点击"从基础菜谱库添加"按钮，选择基础菜谱添加到菜单
            </p>
          </div>
        )}
      </Card>

      {/* 基础菜谱选择器弹窗样式 */}
      <style>{`
        .recipe-row-added {
          background-color: #f6ffed !important;
        }
        .recipe-row-added:hover {
          background-color: #f0f9e8 !important;
        }
      `}</style>

      {/* 基础菜谱选择器弹窗 */}
        <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 500 }}>
            从基础菜谱库选择
            {currentRestaurantId && (
              <span style={{ fontSize: 14, fontWeight: 400, color: '#666', marginLeft: 8 }}>
                （为当前餐厅添加菜品）
              </span>
            )}
          </div>
        }
        open={baseRecipeSelectorVisible}
          onCancel={() => {
            setBaseRecipeSelectorVisible(false)
            setSelectedBaseRecipe(null)
            setBaseRecipeSearchKeyword('')
            setBaseRecipeCategoryFilter('all')
            setShowAddedRecipes(true)
            setBaseRecipesPagination({ page: 1, pageSize: 10, total: 0 })
            // 延迟重置表单，确保在 Modal 关闭后执行
            setTimeout(() => {
              try {
                addToMenuForm.resetFields()
              } catch (error) {
                // 忽略表单重置错误（可能表单已卸载）
              }
            }, 0)
          }}
          footer={null}
          width={1200}
          destroyOnClose={true}
          maskClosable={false}
          centered={true}
          style={{ marginLeft: 200 }}
        >
          {/* 搜索和筛选区域 */}
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
            <Row gutter={16} align="middle">
              <Col span={8}>
                <Input
                  placeholder="搜索菜谱名称、描述..."
                  value={baseRecipeSearchKeyword}
                  onChange={(e) => {
                    setBaseRecipeSearchKeyword(e.target.value)
                  }}
                  onPressEnter={() => loadBaseRecipes(1)}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Col>
              <Col span={5}>
                <Select
                  value={baseRecipeCategoryFilter}
                  onChange={(value) => {
                    setBaseRecipeCategoryFilter(value)
                    setTimeout(() => loadBaseRecipes(1), 0)
                  }}
                  style={{ width: '100%' }}
                  placeholder="选择分类"
                >
                  <Select.Option value="all">全部分类</Select.Option>
                  <Select.Option value="hot">热菜</Select.Option>
                  <Select.Option value="cold">凉菜</Select.Option>
                  <Select.Option value="soup">汤品</Select.Option>
                  <Select.Option value="staple">主食</Select.Option>
                  <Select.Option value="dessert">甜品</Select.Option>
                  <Select.Option value="drink">饮品</Select.Option>
                </Select>
              </Col>
              <Col span={6}>
                <Space>
                  <span style={{ color: '#666' }}>显示已添加：</span>
                  <Switch
                    checked={showAddedRecipes}
                    onChange={(checked) => {
                      setShowAddedRecipes(checked)
                      setTimeout(() => loadBaseRecipes(1), 0)
                    }}
                    checkedChildren="是"
                    unCheckedChildren="否"
                  />
                </Space>
              </Col>
              <Col span={5} style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => loadBaseRecipes(1)}>重置</Button>
                  <Button type="primary" onClick={() => loadBaseRecipes(1)}>
                    搜索
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* 菜谱列表表格 */}
          <Table
            columns={baseRecipeColumns}
            dataSource={baseRecipes}
            rowKey="_id"
            loading={baseRecipesLoading}
            pagination={{
              current: baseRecipesPagination.page,
              pageSize: baseRecipesPagination.pageSize,
              total: baseRecipesPagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条基础菜谱`,
              pageSizeOptions: ['10', '20', '30', '50'],
              onChange: (page, pageSize) => {
                setBaseRecipesPagination(prev => ({ ...prev, page, pageSize }))
                loadBaseRecipes(page)
              },
              onShowSizeChange: (current, size) => {
                setBaseRecipesPagination(prev => ({ ...prev, page: 1, pageSize: size }))
                loadBaseRecipes(1)
              },
            }}
            size="middle"
            scroll={{ y: 400 }}
            locale={{
              emptyText: baseRecipeSearchKeyword || baseRecipeCategoryFilter !== 'all'
                ? '未找到匹配的基础菜谱，请尝试调整搜索条件'
                : '暂无基础菜谱',
            }}
            rowClassName={(record) => {
              return addedBaseRecipeIds.has(record._id) ? 'recipe-row-added' : ''
            }}
          />

        {/* 选择菜谱后的表单 */}
        {selectedBaseRecipe && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                  <span>添加 "{selectedBaseRecipe.name}" 到菜单</span>
                </div>
              }
              style={{ marginTop: 16, backgroundColor: '#f9f9f9' }}
              extra={
                <Button
                  type="link"
                  onClick={() => {
                    try {
                      addToMenuForm.resetFields()
                    } catch (error) {
                      // 忽略表单重置错误
                    }
                    setSelectedBaseRecipe(null)
                  }}
                >
                  取消选择
                </Button>
              }
            >
              {/* 菜谱基本信息展示 */}
              <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', marginRight: 8 }}>菜谱名称：</span>
                    <span style={{ fontWeight: 500 }}>{selectedBaseRecipe.name}</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', marginRight: 8 }}>分类：</span>
                    <Tag color="blue">{getCategoryText(selectedBaseRecipe.category)}</Tag>
                  </div>
                  <div>
                    <span style={{ color: '#666', marginRight: 8 }}>烹饪方式：</span>
                    <span>{getCookingMethodText(selectedBaseRecipe.cookingMethod)}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <span style={{ color: '#666', marginRight: 8 }}>食材数量：</span>
                    <span>
                      {Array.isArray(selectedBaseRecipe.ingredients) 
                        ? selectedBaseRecipe.ingredients.length 
                        : 0} 种
                    </span>
                  </div>
                </Col>
              </Row>

              {/* 添加表单 */}
              <Form form={addToMenuForm} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="price"
                      label="价格（元）"
                      rules={[
                        { required: true, message: '请输入价格' },
                        { type: 'number', min: 0, message: '价格必须大于等于0' },
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="请输入菜品价格"
                        min={0}
                        precision={2}
                        prefix="¥"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="isAvailable"
                      label="是否可用"
                      valuePropName="checked"
                      initialValue={true}
                    >
                      <Switch checkedChildren="可用" unCheckedChildren="不可用" />
                    </Form.Item>
                  </Col>
                </Row>

              </Form>
              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      try {
                        addToMenuForm.resetFields()
                      } catch (error) {
                        // 忽略表单重置错误
                      }
                      setSelectedBaseRecipe(null)
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    loading={addingToMenu}
                    onClick={handleAddToMenuSubmit}
                    icon={<ShoppingCartOutlined />}
                  >
                    确认添加到菜单
                  </Button>
                </Space>
              </div>
            </Card>
          </>
        )}
      </Modal>

      {/* 编辑菜单项Modal */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>
            <EditOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            编辑菜单项
            {editingMenuItem && (
              <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c', marginLeft: 8 }}>
                {editingMenuItem.name}
              </span>
            )}
          </div>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          setEditingMenuItem(null)
          editForm.resetFields()
          setEditIngredients([])
        }}
        onOk={handleUpdateMenuItem}
        confirmLoading={updating}
        width={1000}
        destroyOnClose={true}
        maskClosable={false}
        centered={true}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ size: 'large' }}
        cancelButtonProps={{ size: 'large' }}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 8 }}>
          {/* 基本信息卡片 */}
          <Card 
            size="small" 
            title={<span style={{ fontSize: 15, fontWeight: 500 }}>基本信息</span>}
            style={{ marginBottom: 16 }}
            headStyle={{ backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="name"
                  label={<span style={{ fontWeight: 500 }}>菜品名称</span>}
                  rules={[{ required: true, message: '请输入菜品名称' }]}
                >
                  <Input 
                    placeholder="请输入菜品名称" 
                    size="large"
                    style={{ borderRadius: 4 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label={<span style={{ fontWeight: 500 }}>菜品描述</span>}
            >
              <Input.TextArea 
                rows={3} 
                placeholder="请输入菜品描述（可选）"
                style={{ borderRadius: 4 }}
                showCount
                maxLength={200}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="price"
                  label={<span style={{ fontWeight: 500 }}>价格（元）</span>}
                  rules={[
                    { required: true, message: '请输入价格' },
                    { type: 'number', min: 0, message: '价格必须大于等于0' },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入价格"
                    min={0}
                    precision={2}
                    size="large"
                    prefix="¥"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="category"
                  label={<span style={{ fontWeight: 500 }}>分类</span>}
                >
                  <Select placeholder="请选择分类" allowClear size="large">
                    <Select.Option value="hot">热菜</Select.Option>
                    <Select.Option value="cold">凉菜</Select.Option>
                    <Select.Option value="soup">汤品</Select.Option>
                    <Select.Option value="staple">主食</Select.Option>
                    <Select.Option value="dessert">甜品</Select.Option>
                    <Select.Option value="drink">饮品</Select.Option>
                    <Select.Option value="asian_fusion">亚洲融合</Select.Option>
                    <Select.Option value="western">西式</Select.Option>
                    <Select.Option value="other">其他</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="status"
                  label={<span style={{ fontWeight: 500 }}>状态</span>}
                >
                  <Select placeholder="请选择状态" size="large">
                    <Select.Option value="active">可用</Select.Option>
                    <Select.Option value="inactive">不可用</Select.Option>
                    <Select.Option value="available">上架</Select.Option>
                    <Select.Option value="unavailable">下架</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="isAvailable"
                  label={<span style={{ fontWeight: 500 }}>是否可用</span>}
                  valuePropName="checked"
                >
                  <Switch 
                    checkedChildren="可用" 
                    unCheckedChildren="不可用"
                    size="default"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 食材列表卡片 */}
          <Card 
            size="small" 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>食材列表</span>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddEditIngredient}
                  size="small"
                  style={{ borderRadius: 4 }}
                >
                  添加食材
                </Button>
              </div>
            }
            headStyle={{ backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}
          >
            {editIngredients.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 4,
                  marginBottom: 8
                }}>
                  <Space>
                    <Tag color="blue" style={{ margin: 0 }}>
                      共 {editIngredients.length} 种食材
                    </Tag>
                    <Tag color="green" style={{ margin: 0 }}>
                      总用量: {editIngredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0).toFixed(2)}
                    </Tag>
                  </Space>
                </div>
                <Table
                  columns={[
                    {
                      title: <span style={{ fontWeight: 500 }}>食材名称</span>,
                      dataIndex: 'name',
                      key: 'name',
                      width: 180,
                      render: (name: string) => (
                        <span style={{ fontWeight: 500, color: '#262626' }}>{name || '-'}</span>
                      ),
                    },
                    {
                      title: <span style={{ fontWeight: 500 }}>用量</span>,
                      key: 'quantity',
                      width: 140,
                      render: (_: any, record: RecipeIngredient, index: number) => (
                        <InputNumber
                          value={record.quantity}
                          onChange={(value) => handleUpdateEditIngredient(index, 'quantity', value || 0)}
                          min={0}
                          step={0.1}
                          precision={2}
                          style={{ width: '100%' }}
                          size="small"
                          placeholder="用量"
                        />
                      ),
                    },
                    {
                      title: <span style={{ fontWeight: 500 }}>单位</span>,
                      key: 'unit',
                      width: 100,
                      render: (_: any, record: RecipeIngredient, index: number) => (
                        <Input
                          value={record.unit}
                          onChange={(e) => handleUpdateEditIngredient(index, 'unit', e.target.value)}
                          placeholder="单位"
                          style={{ width: '100%' }}
                          size="small"
                        />
                      ),
                    },
                    {
                      title: <span style={{ fontWeight: 500 }}>备注</span>,
                      key: 'notes',
                      width: 200,
                      render: (_: any, record: RecipeIngredient, index: number) => (
                        <Input
                          value={record.notes || ''}
                          onChange={(e) => handleUpdateEditIngredient(index, 'notes', e.target.value)}
                          placeholder="备注（可选）"
                          style={{ width: '100%' }}
                          size="small"
                        />
                      ),
                    },
                    {
                      title: <span style={{ fontWeight: 500 }}>操作</span>,
                      key: 'action',
                      width: 80,
                      fixed: 'right' as const,
                      render: (_: any, __: RecipeIngredient, index: number) => (
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveEditIngredient(index)}
                          size="small"
                        >
                          删除
                        </Button>
                      ),
                    },
                  ]}
                  dataSource={editIngredients}
                  rowKey={(record, index) => `${record.ingredientId}-${index}`}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 700 }}
                  style={{ marginTop: 8 }}
                />
              </Space>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: '#8c8c8c',
                border: '2px dashed #d9d9d9', 
                borderRadius: 4,
                backgroundColor: '#fafafa'
              }}>
                <PlusOutlined style={{ fontSize: 32, color: '#bfbfbf', marginBottom: 12, display: 'block' }} />
                <div style={{ fontSize: 14, marginBottom: 8 }}>暂无食材</div>
                <div style={{ fontSize: 12, color: '#bfbfbf' }}>请点击上方"添加食材"按钮添加食材</div>
              </div>
            )}
          </Card>
        </Form>
      </Modal>

      {/* 手工创建菜谱Modal */}
      <Modal
        title="手工创建菜谱"
        open={createRecipeModalVisible}
        onCancel={() => {
          setCreateRecipeModalVisible(false)
          createRecipeForm.resetFields()
          setRecipeIngredients([])
        }}
        onOk={handleCreateRecipe}
        confirmLoading={creatingRecipe}
        width={800}
        destroyOnClose={true}
        maskClosable={false}
        centered={true}
      >
        <Form form={createRecipeForm} layout="vertical">
          <Form.Item
            name="name"
            label="菜谱名称"
            rules={[{ required: true, message: '请输入菜谱名称' }]}
          >
            <Input placeholder="请输入菜谱名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="请输入菜谱描述（可选）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  <Select.Option value="hot">热菜</Select.Option>
                  <Select.Option value="cold">凉菜</Select.Option>
                  <Select.Option value="soup">汤品</Select.Option>
                  <Select.Option value="staple">主食</Select.Option>
                  <Select.Option value="dessert">甜品</Select.Option>
                  <Select.Option value="drink">饮品</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cookingMethod"
                label="烹饪方式"
                rules={[{ required: true, message: '请选择烹饪方式' }]}
              >
                <Select placeholder="请选择烹饪方式">
                  <Select.Option value="steamed">蒸</Select.Option>
                  <Select.Option value="boiled">煮</Select.Option>
                  <Select.Option value="stir_fried">炒</Select.Option>
                  <Select.Option value="fried">炸</Select.Option>
                  <Select.Option value="baked">烤</Select.Option>
                  <Select.Option value="stewed">炖</Select.Option>
                  <Select.Option value="cold_dish">凉拌</Select.Option>
                  <Select.Option value="raw">生食</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="价格（元）"
                rules={[
                  { required: true, message: '请输入价格' },
                  { type: 'number', min: 0, message: '价格必须大于等于0' },
                ]}
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入菜品价格"
                  min={0}
                  precision={2}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isAvailable"
                label="是否可用"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="可用" unCheckedChildren="不可用" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="食材配置">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddRecipeIngredient}
                block
              >
                添加食材
              </Button>
              {recipeIngredients.length > 0 && (
                <Table
                  columns={[
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
                          onChange={(value) => handleUpdateRecipeIngredient(index, 'quantity', value || 0)}
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
                          onClick={() => handleRemoveRecipeIngredient(index)}
                        >
                          删除
                        </Button>
                      ),
                    },
                  ]}
                  dataSource={recipeIngredients}
                  rowKey={(record, index) => `${record.ingredientId}-${index}`}
                  pagination={false}
                  size="small"
                />
              )}
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 食材选择器 */}
      <IngredientSelector
        visible={ingredientSelectorVisible}
        onCancel={() => setIngredientSelectorVisible(false)}
        onSelect={handleSelectRecipeIngredient}
        excludeIds={recipeIngredients.map(ing => ing.ingredientId)}
      />

      {/* 编辑模式下的食材选择器 */}
      <IngredientSelector
        visible={editIngredientSelectorVisible}
        onCancel={() => setEditIngredientSelectorVisible(false)}
        onSelect={handleSelectEditIngredient}
        excludeIds={editIngredients.map(ing => ing.ingredientId)}
      />
    </div>
  )
}

export default RecipeList


