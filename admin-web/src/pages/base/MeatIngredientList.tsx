import { meatIngredientAPI } from '@/services/cloudbase'
import { debounce } from '@/utils/debounce'
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
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

interface BaseMeatIngredient {
  _id: string
  name: string
  nameEn?: string
  category: 'red_meat' | 'poultry' | 'seafood' | 'processed_meat'
  subcategory?: string
  description?: string
  carbonFootprint: number
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
}

const { Option } = Select

// 分类选项
const CATEGORY_OPTIONS = [
  { label: '红肉类', value: 'red_meat' },
  { label: '禽肉类', value: 'poultry' },
  { label: '水产类', value: 'seafood' },
  { label: '加工肉类', value: 'processed_meat' },
]

// 状态选项
const STATUS_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
]

const MeatIngredientList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<BaseMeatIngredient[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false)
  const [batchEditForm] = Form.useForm()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })

  // 使用 useCallback 优化 fetchMeatIngredients
  const fetchMeatIngredients = useCallback(async () => {
    setLoading(true)
    try {
      const result = await meatIngredientAPI.list({
        keyword: searchKeyword || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        page: pagination.current,
        pageSize: pagination.pageSize,
      })

      if (result && result.code === 0 && result.data) {
        const data = result.data.data || []
        const paginationData = result.data.pagination || {}
        
        // 状态筛选（前端过滤）
        let filteredData = data
        if (statusFilter !== 'all') {
          filteredData = data.filter((item: BaseMeatIngredient) => item.status === statusFilter)
        }

        setDataSource(filteredData)
        setPagination((prev) => ({
          ...prev,
          total: paginationData.total || filteredData.length,
        }))
      } else {
        setDataSource([])
      }
    } catch (error: any) {
      console.error('获取荤食食材列表失败:', error)
      message.error(error.message || '获取荤食食材列表失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, categoryFilter, statusFilter, searchKeyword])

  useEffect(() => {
    fetchMeatIngredients()
  }, [fetchMeatIngredients])

  // 使用防抖优化搜索
  const debouncedSearch = useMemo(
    () => debounce(() => {
      setPagination((prev) => ({ ...prev, current: 1 }))
      fetchMeatIngredients()
    }, 500),
    [fetchMeatIngredients]
  )

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    fetchMeatIngredients()
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value)
    debouncedSearch()
  }

  const handleDelete = async (ingredientId: string) => {
    try {
      const result = await meatIngredientAPI.deleteBase(ingredientId)
      if (result && result.code === 0) {
        message.success('删除成功')
        fetchMeatIngredients()
      } else {
        throw new Error(result?.message || '删除失败')
      }
    } catch (error: any) {
      console.error('删除荤食食材失败:', error)
      message.error(error.message || '删除失败')
    }
  }

  const handleEdit = (record: BaseMeatIngredient) => {
    navigate(`/base/meat-ingredients/${record._id}/edit`)
  }

  // 批量操作
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的荤食食材')
      return
    }

    Modal.confirm({
      title: '确定要批量删除吗？',
      content: `将删除 ${selectedRowKeys.length} 个荤食食材，此操作不可恢复`,
      onOk: async () => {
        try {
          setLoading(true)
          let successCount = 0
          let failedCount = 0

          for (const id of selectedRowKeys) {
            try {
              const result = await meatIngredientAPI.deleteBase(id as string)
              if (result && result.code === 0) {
                successCount++
              } else {
                failedCount++
              }
            } catch (error) {
              failedCount++
            }
          }

          message.success(`批量删除完成：成功 ${successCount} 个，失败 ${failedCount} 个`)
          setSelectedRowKeys([])
          fetchMeatIngredients()
        } catch (error: any) {
          message.error(error.message || '批量删除失败')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleBatchEdit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要编辑的荤食食材')
      return
    }
    setBatchEditModalVisible(true)
    batchEditForm.resetFields()
  }

  const handleBatchEditSubmit = async () => {
    try {
      const values = await batchEditForm.validateFields()
      setLoading(true)

      let successCount = 0
      let failedCount = 0

      for (const id of selectedRowKeys) {
        try {
          const result = await meatIngredientAPI.updateBase(id as string, values)
          if (result && result.code === 0) {
            successCount++
          } else {
            failedCount++
          }
        } catch (error) {
          failedCount++
        }
      }

      message.success(`批量编辑完成：成功 ${successCount} 个，失败 ${failedCount} 个`)
      setBatchEditModalVisible(false)
      setSelectedRowKeys([])
      batchEditForm.resetFields()
      fetchMeatIngredients()
    } catch (error: any) {
      message.error(error.message || '批量编辑失败')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const option = CATEGORY_OPTIONS.find((opt) => opt.value === category)
    return option?.label || category
  }

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      red_meat: 'red',
      poultry: 'orange',
      seafood: 'blue',
      processed_meat: 'purple',
    }
    return colorMap[category] || 'default'
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: 'default',
      published: 'success',
      archived: 'error',
    }
    return colorMap[status] || 'default'
  }

  const columns: ColumnsType<BaseMeatIngredient> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text: string, record: BaseMeatIngredient) => (
        <Space direction="vertical" size={0}>
          <span>{text}</span>
          {record.nameEn && <span style={{ fontSize: '12px', color: '#999' }}>{record.nameEn}</span>}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>{getCategoryLabel(category)}</Tag>
      ),
    },
    {
      title: '子分类',
      dataIndex: 'subcategory',
      key: 'subcategory',
      width: 120,
    },
    {
      title: '碳排放因子',
      key: 'carbonFactor',
      width: 120,
      render: (_: any, record: BaseMeatIngredient) => {
        return (
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/carbon/factors?search=${encodeURIComponent(record.name)}`)}
          >
            查看因子
          </Button>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, string> = {
          draft: '草稿',
          published: '已发布',
          archived: '已归档',
        }
        return <Tag color={getStatusColor(status)}>{statusMap[status] || status}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: any, record: BaseMeatIngredient) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗？"
            description="删除后不可恢复"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys)
    },
  }

  return (
    <Card
      title="基础荤食食材管理"
      extra={
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/base/meat-ingredients/new')}>
            新建
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 搜索和筛选 */}
        <Space wrap>
          <Input
            placeholder="搜索名称或英文名称"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={handleSearchInputChange}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="分类筛选"
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="all">全部分类</Option>
            {CATEGORY_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="状态筛选"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
        </Space>

        {/* 批量操作 */}
        {selectedRowKeys.length > 0 && (
          <Space>
            <Button onClick={handleBatchEdit}>批量编辑</Button>
            <Button danger onClick={handleBatchDelete}>
              批量删除
            </Button>
            <span>已选择 {selectedRowKeys.length} 项</span>
          </Space>
        )}

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="_id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Space>

      {/* 批量编辑弹窗 */}
      <Modal
        title="批量编辑"
        open={batchEditModalVisible}
        onOk={handleBatchEditSubmit}
        onCancel={() => {
          setBatchEditModalVisible(false)
          batchEditForm.resetFields()
        }}
      >
        <Form form={batchEditForm} layout="vertical">
          <Form.Item name="status" label="状态">
            <Select placeholder="选择状态">
              <Option value="draft">草稿</Option>
              <Option value="published">已发布</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default MeatIngredientList

