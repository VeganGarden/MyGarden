import React, { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  message,
  Popconfirm,
  Card,
  Select,
  Row,
  Col,
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CopyOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRecipes, deleteRecipe } from '@/store/slices/recipeSlice'
import { Recipe, RecipeStatus, ChannelType } from '@/types'

const RecipeList: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { recipes, loading, pagination } = useAppSelector((state) => state.recipe)
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<RecipeStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [carbonLabelFilter, setCarbonLabelFilter] = useState<string>('all')

  useEffect(() => {
    loadRecipes()
  }, [currentRestaurantId])

  const loadRecipes = async () => {
    try {
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
      message.error(error.message || '加载菜谱列表失败')
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
      message.success('删除成功')
      loadRecipes()
    } catch (error: any) {
      message.error(error.message || '删除失败')
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

  const getStatusTag = (status: RecipeStatus) => {
    const statusMap = {
      [RecipeStatus.DRAFT]: { color: 'default', text: '草稿' },
      [RecipeStatus.PUBLISHED]: { color: 'success', text: '已发布' },
      [RecipeStatus.ARCHIVED]: { color: 'default', text: '已归档' },
    }
    const statusInfo = statusMap[status] || { color: 'default', text: '未知' }
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
  }

  const columns = [
    {
      title: '菜谱名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '食材数',
      dataIndex: 'ingredients',
      key: 'ingredients',
      width: 100,
      render: (ingredients: any[]) => `${ingredients?.length || 0} 种`,
    },
    {
      title: '碳足迹',
      dataIndex: 'carbonFootprint',
      key: 'carbonFootprint',
      width: 120,
      render: (footprint: number) =>
        footprint !== undefined ? `${footprint.toFixed(2)} kg CO₂e` : '-',
    },
    {
      title: '碳标签',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: RecipeStatus) => getStatusTag(status),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (version: number) => `v${version}`,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Recipe) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/recipe/detail/${record._id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/recipe/edit/${record._id}`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<CopyOutlined />}
            onClick={() => navigate('/recipe/create', { state: { copyFrom: record } })}
          >
            复制
          </Button>
          <Popconfirm
            title="确定要删除这个菜谱吗？"
            onConfirm={() => handleDelete(record._id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
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
            <span style={{ color: '#666' }}>提示：当前查看所有餐厅的菜谱，可在右上角切换查看具体餐厅的菜谱</span>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Input
                placeholder="搜索菜谱名称..."
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
                <Select.Option value="all">全部状态</Select.Option>
                <Select.Option value={RecipeStatus.DRAFT}>草稿</Select.Option>
                <Select.Option value={RecipeStatus.PUBLISHED}>已发布</Select.Option>
                <Select.Option value={RecipeStatus.ARCHIVED}>已归档</Select.Option>
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
                <Select.Option value="all">全部分类</Select.Option>
                <Select.Option value="hot">热菜</Select.Option>
                <Select.Option value="cold">凉菜</Select.Option>
                <Select.Option value="soup">汤品</Select.Option>
                <Select.Option value="staple">主食</Select.Option>
                <Select.Option value="dessert">甜品</Select.Option>
                <Select.Option value="drink">饮品</Select.Option>
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
                <Select.Option value="all">全部碳标签</Select.Option>
                <Select.Option value="ultra_low">超低碳</Select.Option>
                <Select.Option value="low">低碳</Select.Option>
                <Select.Option value="medium">中碳</Select.Option>
                <Select.Option value="high">高碳</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  搜索
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/recipe/create')}
                >
                  创建新菜谱
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
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              dispatch(
                fetchRecipes({
                  keyword: searchKeyword || undefined,
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

