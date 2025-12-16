import { ingredientAPI } from '@/services/cloudbase'
import { debounce } from '@/utils/debounce'
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
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

interface BaseIngredient {
  _id: string
  name: string
  nameEn?: string
  category: string
  description?: string
  status: 'draft' | 'published' | 'archived'
  certificationCount?: number
  carbonFootprint?: {
    coefficient?: number
    source?: string
    verifiedAt?: string
  }
  createdAt: string
  updatedAt: string
}

const { Option } = Select

const IngredientList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<BaseIngredient[]>([])
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

  // 使用 useCallback 优化 fetchIngredients
  const fetchIngredients = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ingredientAPI.list({
        keyword: searchKeyword || undefined,
        page: pagination.current,
        pageSize: pagination.pageSize,
      })

      if (result && result.code === 0 && result.data) {
        const data = result.data.data || []
        const paginationData = result.data.pagination || {}
        
        // 状态筛选应该在后端完成，这里只做前端兼容处理
        // 如果后端已经过滤，则直接使用；否则前端过滤
        let filteredData = data
        if (statusFilter !== 'all') {
          filteredData = data.filter((item: BaseIngredient) => item.status === statusFilter)
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
      console.error('获取食材列表失败:', error)
      message.error(error.message || '获取食材列表失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, statusFilter, searchKeyword])

  useEffect(() => {
    fetchIngredients()
  }, [fetchIngredients])

  // 使用防抖优化搜索
  const debouncedSearch = useMemo(
    () => debounce(() => {
      setPagination((prev) => ({ ...prev, current: 1 }))
      fetchIngredients()
    }, 500),
    [fetchIngredients]
  )

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    fetchIngredients()
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value)
    debouncedSearch()
  }

  const handleDelete = async (ingredientId: string) => {
    try {
      const result = await ingredientAPI.deleteBase(ingredientId)
      if (result && result.code === 0) {
        message.success('删除成功')
        fetchIngredients()
      } else {
        throw new Error(result?.message || '删除失败')
      }
    } catch (error: any) {
      console.error('删除食材失败:', error)
      message.error(error.message || '删除失败')
    }
  }

  const handleEdit = (record: BaseIngredient) => {
    navigate(`/base/ingredients/${record._id}/edit`)
  }

  // 批量操作
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的食材')
      return
    }

    Modal.confirm({
      title: '确定要批量删除吗？',
      content: `将删除 ${selectedRowKeys.length} 个食材，此操作不可恢复`,
      onOk: async () => {
        try {
          setLoading(true)
          let successCount = 0
          let failedCount = 0

          for (const id of selectedRowKeys) {
            try {
              const result = await ingredientAPI.deleteBase(id as string)
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
          fetchIngredients()
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
      message.warning('请先选择要编辑的食材')
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
          const result = await ingredientAPI.updateBase(id as string, values)
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
      fetchIngredients()
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

  const columns: ColumnsType<BaseIngredient> = [
    {
      title: '食材名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
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
      title: '碳排放因子',
      key: 'carbonFactor',
      width: 120,
      render: (_: any, record: BaseIngredient) => {
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
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个食材吗？"
            description="删除后，如果该食材被食谱使用，删除操作将失败"
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
            placeholder="搜索食材名称"
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
            onClick={() => navigate('/base/ingredients/add')}
          >
            新建食材
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => navigate('/base/import?type=ingredient')}
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
                description={`将删除 ${selectedRowKeys.length} 个食材，此操作不可恢复`}
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
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({ ...prev, current: page, pageSize }))
            },
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: searchKeyword ? '未找到匹配的食材' : '暂无食材数据',
          }}
        />
      </Spin>

      {/* 批量编辑弹窗 */}
      <Modal
        title="批量编辑食材"
        open={batchEditModalVisible}
        onOk={handleBatchEditSubmit}
        onCancel={() => setBatchEditModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <p>已选择 {selectedRowKeys.length} 个食材，将批量更新以下字段：</p>
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
              <Option value="vegetables">蔬菜类</Option>
              <Option value="beans">豆制品</Option>
              <Option value="grains">谷物类</Option>
              <Option value="nuts">坚果类</Option>
              <Option value="fruits">水果类</Option>
              <Option value="mushrooms">菌菇类</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default IngredientList

