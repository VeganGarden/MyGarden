import { recipeAPI } from '@/services/cloudbase'
import { debounce } from '@/utils/debounce'
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
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
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

const { Option } = Select

interface BaseRecipe {
  _id: string
  name: string
  nameEn?: string
  category: string
  description?: string
  status: 'draft' | 'published' | 'archived'
  isBaseRecipe: boolean
  certificationCount?: number
  ingredients?: Array<{
    ingredientId: string
    name: string
    quantity: number
    unit: string
  }>
  carbonFootprint?: {
    value?: number
    ingredients?: number
    cookingEnergy?: number
    packaging?: number
  }
  createdAt: string
  updatedAt: string
}

const RecipeList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<BaseRecipe[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false)
  const [batchEditForm] = Form.useForm()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })

  // 使用 useCallback 优化 fetchRecipes
  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      // 调用API，指定 isBaseRecipe = true 来只查询基础食谱
      const result = await recipeAPI.list({
        keyword: searchKeyword || undefined,
        page: pagination.current,
        pageSize: pagination.pageSize,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        isBaseRecipe: true, // 只查询基础食谱
      })

      if (result && result.code === 0 && result.data) {
        const data = result.data.data || []
        const paginationData = result.data.pagination || {}

        setDataSource(data)
        setPagination({
          ...pagination,
          total: paginationData.total || 0,
        })
      } else {
        setDataSource([])
        setPagination((prev) => ({
          ...prev,
          total: 0,
        }))
      }
    } catch (error: any) {
      console.error('获取食谱列表失败:', error)
      message.error(error.message || '获取食谱列表失败')
      setDataSource([])
      setPagination({
        ...pagination,
        total: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, statusFilter, searchKeyword])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  // 使用防抖优化搜索
  const debouncedSearch = useMemo(
    () => debounce(() => {
      setPagination((prev) => ({ ...prev, current: 1 }))
      fetchRecipes()
    }, 500),
    [fetchRecipes]
  )

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    fetchRecipes()
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value)
    debouncedSearch()
  }

  const handleDelete = async (recipeId: string) => {
    try {
      const result = await recipeAPI.deleteBase(recipeId)
      if (result && result.code === 0) {
        message.success('删除成功')
        fetchRecipes()
      } else {
        throw new Error(result?.message || '删除失败')
      }
    } catch (error: any) {
      console.error('删除食谱失败:', error)
      message.error(error.message || '删除失败')
    }
  }

  const handleEdit = (record: BaseRecipe) => {
    navigate(`/base/recipes/${record._id}/edit`)
  }

  const handleView = (record: BaseRecipe) => {
    navigate(`/base/recipes/${record._id}`)
  }

  // 批量操作
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的食谱')
      return
    }

    Modal.confirm({
      title: '确定要批量删除吗？',
      content: `将删除 ${selectedRowKeys.length} 个食谱，此操作不可恢复`,
      onOk: async () => {
        try {
          setLoading(true)
          let successCount = 0
          let failedCount = 0

          for (const id of selectedRowKeys) {
            try {
              const result = await recipeAPI.deleteBase(id as string)
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
          fetchRecipes()
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
      message.warning('请先选择要编辑的食谱')
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
          const result = await recipeAPI.updateBase(id as string, values)
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
      fetchRecipes()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || '批量编辑失败')
    } finally {
      setLoading(false)
    }
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys)
    },
  }

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      published: { color: 'success', text: '已发布' },
      archived: { color: 'error', text: '已归档' },
    }
    const cfg = config[status] || config.draft
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  const columns: ColumnsType<BaseRecipe> = [
    {
      title: '食谱名称',
      dataIndex: 'name',
      key: 'name',
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
      width: 120,
    },
    {
      title: '食材数量',
      key: 'ingredientCount',
      width: 100,
      render: (_, record) => record.ingredients?.length || 0,
    },
    {
      title: '参考碳足迹值',
      dataIndex: ['carbonFootprint', 'value'],
      key: 'carbonValue',
      width: 140,
      render: (value: number) => {
        if (value === undefined || value === null) {
          return <span style={{ color: '#999' }}>-</span>
        }
        return `${value.toFixed(2)} kg CO₂e/份`
      },
      sorter: (a, b) => {
        const aValue = a.carbonFootprint?.value || 0
        const bValue = b.carbonFootprint?.value || 0
        return aValue - bValue
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '认证数量',
      dataIndex: 'certificationCount',
      key: 'certificationCount',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个食谱吗？"
            description="删除后，如果该食谱被餐厅菜单使用，删除操作将失败"
            onConfirm={() => handleDelete(record._id)}
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
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="搜索食谱名称"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={handleSearchInputChange}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            placeholder="状态筛选"
          >
            <Option value="all">全部</Option>
            <Option value="draft">草稿</Option>
            <Option value="published">已发布</Option>
            <Option value="archived">已归档</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/base/recipes/add')}
          >
            新建食谱
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => navigate('/base/import?type=recipe')}
          >
            批量导入
          </Button>
          {selectedRowKeys.length > 0 && (
            <>
              <Button
                onClick={handleBatchEdit}
                disabled={selectedRowKeys.length === 0}
              >
                批量编辑 ({selectedRowKeys.length})
              </Button>
              <Popconfirm
                title="确定要批量删除吗？"
                description={`将删除 ${selectedRowKeys.length} 个食谱，此操作不可恢复`}
                onConfirm={handleBatchDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button danger disabled={selectedRowKeys.length === 0}>
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </div>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="_id"
          rowSelection={rowSelection}
          expandable={{
            expandedRowRender: (record) => {
              if (!record.ingredients || record.ingredients.length === 0) {
                return (
                  <div style={{ padding: '16px', color: '#999' }}>
                    <Text type="secondary">该食谱暂无食材信息</Text>
                  </div>
                )
              }

              const ingredientColumns: ColumnsType<typeof record.ingredients[0]> = [
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
                  render: (_, ingredient) => (
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
                    rowKey={(item, index) => `${item.ingredientId || item.name}-${index}`}
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
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({ ...prev, current: page, pageSize }))
            },
          }}
          scroll={{ x: 1400 }}
          locale={{
            emptyText: searchKeyword ? '未找到匹配的食谱' : '暂无食谱数据',
          }}
        />
      </Spin>

      {/* 批量编辑弹窗 */}
      <Modal
        title="批量编辑食谱"
        open={batchEditModalVisible}
        onOk={handleBatchEditSubmit}
        onCancel={() => setBatchEditModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <p>已选择 {selectedRowKeys.length} 个食谱，将批量更新以下字段：</p>
        <Form form={batchEditForm} layout="vertical">
          <Form.Item name="status" label="状态">
            <Select placeholder="选择状态（留空则不更新）">
              <Option value="draft">草稿</Option>
              <Option value="published">已发布</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select placeholder="选择分类（留空则不更新）">
              <Option value="staple">主食</Option>
              <Option value="dish">菜品</Option>
              <Option value="soup">汤品</Option>
              <Option value="dessert">甜品</Option>
              <Option value="drink">饮品</Option>
              <Option value="snack">小食</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default RecipeList

