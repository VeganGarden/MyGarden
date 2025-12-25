/**
 * 食材标准库管理 - 标准名称列表页
 * 仅平台运营角色可见
 */
import { ingredientStandardAPI } from '@/services/ingredientStandard'
import { useCategoryMap } from '@/hooks/useIngredientCategories'
import { DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons'
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

interface IngredientStandard {
  _id?: string
  standardName: string
  nameEn?: string
  category: string
  subCategory?: string
  description?: string
  defaultUnit?: string
  carbonCoefficient?: number
  status: 'active' | 'deprecated'
  version?: number
  createdAt?: string
  updatedAt?: string
}

const { Search } = Input
const { Option } = Select

const StandardList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<IngredientStandard[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  
  // 获取类别映射和选项
  const { getCategoryName, categories } = useCategoryMap()
  const categoryOptions = useMemo(() => {
    const opts = categories.map(cat => ({
      label: cat.categoryName,
      value: cat.categoryCode,
    }))
    opts.unshift({ label: '全部分类', value: 'all' })
    return opts
  }, [categories])

  // 获取标准名称列表
  const fetchStandards = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ingredientStandardAPI.standard.list({
        keyword: searchKeyword || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'deprecated'),
        page: pagination.current,
        pageSize: pagination.pageSize,
      })

      if (result && result.code === 0 && result.data) {
        const data = result.data.data || result.data.list || []
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
      console.error('获取标准名称列表失败:', error)
      message.error(error.message || '获取标准名称列表失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, categoryFilter, statusFilter, searchKeyword])

  useEffect(() => {
    fetchStandards()
  }, [fetchStandards])

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
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  // 处理删除/废弃
  const handleDeprecate = async (record: IngredientStandard) => {
    try {
      setLoading(true)
      const result = await ingredientStandardAPI.standard.deprecate(record.standardName)
      if (result && result.code === 0) {
        message.success('废弃成功')
        fetchStandards()
      } else {
        message.error(result?.message || '废弃失败')
      }
    } catch (error: any) {
      message.error(error.message || '废弃失败')
    } finally {
      setLoading(false)
    }
  }

  // 批量同步到因子库
  const handleSyncToFactors = async () => {
    try {
      setLoading(true)
      const result = await ingredientStandardAPI.batch.syncToFactors()
      if (result && result.code === 0) {
        message.success('同步到因子库成功')
      } else {
        message.error(result?.message || '同步失败')
      }
    } catch (error: any) {
      message.error(error.message || '同步失败')
    } finally {
      setLoading(false)
    }
  }

  // 批量同步到ingredients库
  const handleSyncToIngredients = async () => {
    try {
      setLoading(true)
      const result = await ingredientStandardAPI.batch.syncToIngredients()
      if (result && result.code === 0) {
        message.success('同步到ingredients库成功')
      } else {
        message.error(result?.message || '同步失败')
      }
    } catch (error: any) {
      message.error(error.message || '同步失败')
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      active: { color: 'success', text: '活跃' },
      deprecated: { color: 'default', text: '已废弃' },
    }
    const cfg = config[status] || config.active
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  const getCategoryTag = (category: string) => {
    const categoryName = getCategoryName(category)
    return <Tag>{categoryName}</Tag>
  }

  const columns: ColumnsType<IngredientStandard> = [
    {
      title: '标准名称',
      dataIndex: 'standardName',
      key: 'standardName',
      width: 200,
      fixed: 'left',
    },
    {
      title: '英文名称',
      dataIndex: 'nameEn',
      key: 'nameEn',
      width: 150,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => getCategoryTag(category),
    },
    {
      title: '子分类',
      dataIndex: 'subCategory',
      key: 'subCategory',
      width: 120,
    },
    {
      title: '默认单位',
      dataIndex: 'defaultUnit',
      key: 'defaultUnit',
      width: 100,
    },
    {
      title: '碳系数',
      dataIndex: 'carbonCoefficient',
      key: 'carbonCoefficient',
      width: 100,
      render: (value: number) => value ? value.toFixed(4) : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text: string) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/base/standards/${encodeURIComponent(record.standardName)}`)}
          >
            编辑
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title="确定要废弃此标准名称吗？"
              description="废弃后，该标准名称将不再使用，但不会删除相关数据。"
              onConfirm={() => handleDeprecate(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                废弃
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
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
            <Search
              placeholder="搜索标准名称、英文名称"
              allowClear
              enterButton={<SearchOutlined />}
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
              value={categoryFilter}
              style={{ width: 150 }}
              onChange={handleCategoryChange}
            >
              {categoryOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              style={{ width: 120 }}
              onChange={handleStatusChange}
            >
              <Option value="all">全部状态</Option>
              <Option value="active">活跃</Option>
              <Option value="deprecated">已废弃</Option>
            </Select>
          </div>
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={handleSyncToFactors}
              title="同步到因子库"
            >
              同步到因子库
            </Button>
            <Button
              icon={<LinkOutlined />}
              onClick={handleSyncToIngredients}
              title="同步到ingredients库"
            >
              同步到ingredients库
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/base/standards/new')}
            >
              新建标准名称
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchStandards}>
              刷新
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="standardName"
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
            scroll={{ x: 1400 }}
          />
        </Spin>
      </Card>
    </div>
  )
}

export default StandardList
