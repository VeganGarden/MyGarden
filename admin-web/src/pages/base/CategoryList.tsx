/**
 * 食材类别管理 - 类别列表页
 * 仅平台运营角色可见
 */
import { ingredientStandardAPI } from '@/services/ingredientStandard'
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { IngredientCategory } from '@/types/ingredientCategory'

const { Search } = Input
const { Option } = Select

const CategoryList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<IngredientCategory[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })

  // 获取类别列表
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ingredientStandardAPI.category.list({
        keyword: searchKeyword || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'deprecated'),
        page: pagination.current,
        pageSize: pagination.pageSize,
      })

      if (result && result.code === 0 && result.data) {
        const data = result.data.list || []
        const paginationData = result.data.pagination || {}
        
        setDataSource(data)
        setPagination((prev) => ({
          ...prev,
          total: paginationData.total || data.length,
        }))
      } else {
        setDataSource([])
      }
    } catch (error: any) {
      console.error('获取类别列表失败:', error)
      message.error(error.message || '获取类别列表失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, statusFilter, searchKeyword])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // 使用防抖优化搜索
  const debouncedSearch = useMemo(
    () => {
      let timer: NodeJS.Timeout
      return (value: string) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          setSearchKeyword(value)
          setPagination((prev) => ({ ...prev, current: 1 }))
        }, 300)
      }
    },
    []
  )

  // 处理搜索
  const handleSearch = (value: string) => {
    debouncedSearch(value)
  }

  // 处理筛选
  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  // 处理编辑
  const handleEdit = (record: IngredientCategory) => {
    navigate(`/base/categories/${encodeURIComponent(record.categoryCode)}`)
  }

  // 处理删除
  const handleDelete = async (record: IngredientCategory) => {
    try {
      const result = await ingredientStandardAPI.category.delete(record.categoryCode)
      if (result && result.code === 0) {
        message.success('删除成功')
        fetchCategories()
      } else {
        message.error(result?.message || '删除失败')
      }
    } catch (error: any) {
      console.error('删除类别失败:', error)
      message.error(error.message || '删除类别失败')
    }
  }

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'success', text: '活跃' },
      deprecated: { color: 'default', text: '已废弃' },
    }
    const cfg = statusMap[status] || { color: 'default', text: status }
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  const columns: ColumnsType<IngredientCategory> = [
    {
      title: '类别代码',
      dataIndex: 'categoryCode',
      key: 'categoryCode',
      width: 150,
      fixed: 'left',
    },
    {
      title: '类别名称',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
    },
    {
      title: '英文名称',
      dataIndex: 'categoryNameEn',
      key: 'categoryNameEn',
      width: 150,
    },
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => level === 1 ? '主类别' : '子类别',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '映射因子类别',
      dataIndex: ['mapping', 'factorSubCategory'],
      key: 'factorSubCategory',
      width: 120,
    },
    {
      title: '关键词数量',
      key: 'keywordsCount',
      width: 100,
      render: (_, record) => (record.mapping?.keywords?.length || 0),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title="确定要删除这个类别吗？"
              description="删除后类别将被标记为废弃状态"
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Search
              placeholder="搜索类别代码或名称"
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  setSearchKeyword('')
                  setPagination((prev) => ({ ...prev, current: 1 }))
                }
              }}
            />
            <Select
              value={statusFilter}
              style={{ width: 150 }}
              onChange={handleStatusChange}
            >
              <Option value="all">全部状态</Option>
              <Option value="active">活跃</Option>
              <Option value="deprecated">已废弃</Option>
            </Select>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/base/categories/new')}
          >
            新建类别
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="categoryCode"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPagination((prev) => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize || prev.pageSize,
                }))
              },
            }}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </Card>
    </div>
  )
}

export default CategoryList

