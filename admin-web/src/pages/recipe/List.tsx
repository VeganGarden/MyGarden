import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { deleteRecipe, fetchRecipes } from '@/store/slices/recipeSlice'
import { Recipe, RecipeStatus } from '@/types'
import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const RecipeList: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { recipes, loading, pagination } = useAppSelector((state) => state.recipe)
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<RecipeStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [carbonLabelFilter, setCarbonLabelFilter] = useState<string>('all')

  useEffect(() => {
    console.log('菜谱列表 - currentRestaurantId 变化:', currentRestaurantId)
    loadRecipes()
  }, [currentRestaurantId])

  const loadRecipes = async () => {
    try {
      console.log('菜谱列表加载参数:', {
        currentRestaurantId,
        searchKeyword,
        statusFilter,
        categoryFilter,
        carbonLabelFilter
      })
      await dispatch(
        fetchRecipes({
          keyword: searchKeyword || undefined,
          restaurantId: currentRestaurantId || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          carbonLabel: carbonLabelFilter !== 'all' ? carbonLabelFilter : undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
        })
      ).unwrap()
    } catch (error: any) {
      message.error(error.message || t('pages.recipe.list.messages.loadFailed'))
    }
  }

  const handleSearch = () => {
    dispatch(
      fetchRecipes({
        keyword: searchKeyword || undefined,
        restaurantId: currentRestaurantId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        carbonLabel: carbonLabelFilter !== 'all' ? carbonLabelFilter : undefined,
        page: 1,
        pageSize: pagination.pageSize,
      })
    )
  }

  const handleFilterChange = () => {
    loadRecipes()
  }

  const handleDelete = async (recipeId: string) => {
    try {
      await dispatch(deleteRecipe(recipeId)).unwrap()
      message.success(t('pages.recipe.list.messages.deleteSuccess'))
      loadRecipes()
    } catch (error: any) {
      message.error(error.message || t('pages.recipe.list.messages.deleteFailed'))
    }
  }

  const getCarbonLabelColor = (label?: string) => {
    switch (label) {
      case 'ultra_low':
      case 'low':
        return 'green'
      case 'medium':
        return 'orange'
      case 'high':
        return 'red'
      default:
        return 'default'
    }
  }

  const getCarbonLabelText = (label?: string) => {
    switch (label) {
      case 'ultra_low':
        return t('pages.recipe.list.filters.carbonLabel.ultraLow')
      case 'low':
        return t('pages.recipe.list.filters.carbonLabel.low')
      case 'medium':
        return t('pages.recipe.list.filters.carbonLabel.medium')
      case 'high':
        return t('pages.recipe.list.filters.carbonLabel.high')
      default:
        return t('pages.recipe.list.filters.carbonLabel.notCalculated')
    }
  }

  const getStatusTag = (status: RecipeStatus) => {
    const statusMap = {
      [RecipeStatus.DRAFT]: { color: 'default', text: t('pages.recipe.list.status.draft') },
      [RecipeStatus.PUBLISHED]: { color: 'success', text: t('pages.recipe.list.status.published') },
      [RecipeStatus.ARCHIVED]: { color: 'default', text: t('pages.recipe.list.status.archived') },
    }
    const statusInfo = statusMap[status] || { color: 'default', text: t('pages.recipe.list.status.unknown') }
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
  }

  const columns = [
    {
      title: t('pages.recipe.list.table.columns.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: t('pages.recipe.list.table.columns.category'),
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: t('pages.recipe.list.table.columns.ingredients'),
      dataIndex: 'ingredients',
      key: 'ingredients',
      width: 100,
      render: (ingredients: any[]) => t('pages.recipe.list.table.ingredientsCount', { count: ingredients?.length || 0 }),
    },
    {
      title: t('pages.recipe.list.table.columns.carbonFootprint'),
      dataIndex: 'carbonFootprint',
      key: 'carbonFootprint',
      width: 120,
      render: (footprint: number) =>
        footprint !== undefined ? `${footprint.toFixed(2)} kg CO₂e` : '-',
    },
    {
      title: t('pages.recipe.list.table.columns.carbonLabel'),
      dataIndex: 'carbonLabel',
      key: 'carbonLabel',
      width: 100,
      render: (label: string) => (
        <Tag color={getCarbonLabelColor(label)}>
          {getCarbonLabelText(label)}
        </Tag>
      ),
    },
    {
      title: t('pages.recipe.list.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: RecipeStatus) => getStatusTag(status),
    },
    {
      title: t('pages.recipe.list.table.columns.version'),
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (version: number) => `v${version}`,
    },
    {
      title: t('pages.recipe.list.table.columns.actions'),
      key: 'action',
      width: 150,
      render: (_: any, record: Recipe) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/recipe/detail/${record._id}`)}
          >
            {t('pages.recipe.list.table.actions.view')}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/recipe/edit/${record._id}`)}
          >
            {t('pages.recipe.list.table.actions.edit')}
          </Button>
          <Button
            type="link"
            icon={<CopyOutlined />}
            onClick={() => navigate('/recipe/create', { state: { copyFrom: record } })}
          >
            {t('pages.recipe.list.table.actions.copy')}
          </Button>
          <Popconfirm
            title={t('pages.recipe.list.messages.confirmDelete')}
            onConfirm={() => handleDelete(record._id!)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('pages.recipe.list.table.actions.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card>
        {!currentRestaurantId && restaurants.length > 1 && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
            <span style={{ color: '#666' }}>{t('pages.recipe.list.tips.viewAllRestaurants')}</span>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Input
                placeholder={t('pages.recipe.list.filters.search')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col span={4}>
              <Select
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value)
                  setTimeout(handleFilterChange, 0)
                }}
                style={{ width: '100%' }}
              >
                <Select.Option value="all">{t('pages.recipe.list.filters.status.all')}</Select.Option>
                <Select.Option value={RecipeStatus.DRAFT}>{t('pages.recipe.list.filters.status.draft')}</Select.Option>
                <Select.Option value={RecipeStatus.PUBLISHED}>{t('pages.recipe.list.filters.status.published')}</Select.Option>
                <Select.Option value={RecipeStatus.ARCHIVED}>{t('pages.recipe.list.filters.status.archived')}</Select.Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value)
                  setTimeout(handleFilterChange, 0)
                }}
                style={{ width: '100%' }}
              >
                <Select.Option value="all">{t('pages.recipe.list.filters.category.all')}</Select.Option>
                <Select.Option value="hot">{t('pages.recipe.list.filters.category.hot')}</Select.Option>
                <Select.Option value="cold">{t('pages.recipe.list.filters.category.cold')}</Select.Option>
                <Select.Option value="soup">{t('pages.recipe.list.filters.category.soup')}</Select.Option>
                <Select.Option value="staple">{t('pages.recipe.list.filters.category.staple')}</Select.Option>
                <Select.Option value="dessert">{t('pages.recipe.list.filters.category.dessert')}</Select.Option>
                <Select.Option value="drink">{t('pages.recipe.list.filters.category.drink')}</Select.Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                value={carbonLabelFilter}
                onChange={(value) => {
                  setCarbonLabelFilter(value)
                  setTimeout(handleFilterChange, 0)
                }}
                style={{ width: '100%' }}
              >
                <Select.Option value="all">{t('pages.recipe.list.filters.carbonLabel.all')}</Select.Option>
                <Select.Option value="ultra_low">{t('pages.recipe.list.filters.carbonLabel.ultraLow')}</Select.Option>
                <Select.Option value="low">{t('pages.recipe.list.filters.carbonLabel.low')}</Select.Option>
                <Select.Option value="medium">{t('pages.recipe.list.filters.carbonLabel.medium')}</Select.Option>
                <Select.Option value="high">{t('pages.recipe.list.filters.carbonLabel.high')}</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  {t('pages.recipe.list.buttons.search')}
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/recipe/create')}
                >
                  {t('pages.recipe.list.buttons.create')}
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={recipes}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => t('pages.recipe.list.pagination.total', { total }),
            onChange: (page, pageSize) => {
              dispatch(
                fetchRecipes({
                  keyword: searchKeyword || undefined,
                  restaurantId: currentRestaurantId || undefined,
                  status: statusFilter !== 'all' ? statusFilter : undefined,
                  category: categoryFilter !== 'all' ? categoryFilter : undefined,
                  carbonLabel: carbonLabelFilter !== 'all' ? carbonLabelFilter : undefined,
                  page,
                  pageSize,
                })
              )
            },
          }}
        />
      </Card>
    </div>
  )
}

export default RecipeList

