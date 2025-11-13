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
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRecipes, deleteRecipe } from '@/store/slices/recipeSlice'
import { Recipe, RecipeStatus, ChannelType } from '@/types'

const RecipeList: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { recipes, loading, pagination } = useAppSelector((state) => state.recipe)
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    try {
      await dispatch(
        fetchRecipes({
          keyword: searchKeyword || undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
        })
      ).unwrap()
    } catch (error: any) {
      message.error(error.message || '加载菜谱列表失败')
    }
  }

  const handleSearch = () => {
    dispatch(fetchRecipes({ keyword: searchKeyword || undefined, page: 1, pageSize: 20 }))
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
            icon={<EditOutlined />}
            onClick={() => navigate(`/recipe/edit/${record._id}`)}
          >
            编辑
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
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="搜索菜谱名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/recipe/create')}
          >
            创建新菜谱
          </Button>
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

