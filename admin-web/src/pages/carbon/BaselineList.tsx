/**
 * 基准值列表页
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { baselineManageAPI } from '@/services/baseline'
import type { CarbonBaseline, BaselineQueryParams } from '@/types/baseline'
import { MealType, Region, EnergyType, BaselineStatus } from '@/types/baseline'

const { Search } = Input
const { Option } = Select

const BaselineList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<CarbonBaseline[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<BaselineQueryParams>({
    page: 1,
    pageSize: 20,
  })

  // 获取列表数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await baselineManageAPI.list({
        ...filters,
        page: pagination.current,
        pageSize: pagination.pageSize,
      })
      
      if (result.success) {
        setDataSource(result.data || [])
        setPagination({
          ...pagination,
          total: result.pagination?.total || 0,
        })
      } else {
        message.error(result.error || '获取列表失败')
        setDataSource([])
      }
    } catch (error: any) {
      message.error(error.message || '获取列表失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [pagination.current, pagination.pageSize, filters])

  // 处理筛选
  const handleFilterChange = (key: string, value: any) => {
    setFilters({
      ...filters,
      [key]: value || undefined,
    })
    setPagination({ ...pagination, current: 1 })
  }

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters({
      ...filters,
      keyword: value || undefined,
    })
    setPagination({ ...pagination, current: 1 })
  }

  // 处理归档/激活
  const handleArchive = async (record: CarbonBaseline) => {
    try {
      const result = await baselineManageAPI.archive(record.baselineId)
      if (result.success) {
        message.success('归档成功')
        fetchData()
      } else {
        message.error(result.error || '归档失败')
      }
    } catch (error: any) {
      message.error(error.message || '归档失败')
    }
  }

  const handleActivate = async (record: CarbonBaseline) => {
    try {
      const result = await baselineManageAPI.activate(record.baselineId)
      if (result.success) {
        message.success('激活成功')
        fetchData()
      } else {
        message.error(result.error || '激活失败')
      }
    } catch (error: any) {
      message.error(error.message || '激活失败')
    }
  }

  // 表格列定义
  const columns: ColumnsType<CarbonBaseline> = [
    {
      title: '基准值ID',
      dataIndex: 'baselineId',
      key: 'baselineId',
      width: 200,
      ellipsis: true,
      render: (baselineId: string) => baselineId || '-',
    },
    {
      title: '地区',
      key: 'region',
      width: 100,
      render: (_: any, record: CarbonBaseline) => {
        const region = record.category?.region
        if (!region) return '-'
        const regionMap: Record<string, string> = {
          [Region.NORTH_CHINA]: '华北',
          [Region.NORTHEAST]: '东北',
          [Region.EAST_CHINA]: '华东',
          [Region.CENTRAL_CHINA]: '华中',
          [Region.NORTHWEST]: '西北',
          [Region.SOUTH_CHINA]: '南方',
          [Region.NATIONAL_AVERAGE]: '全国平均',
        }
        return regionMap[region] || region
      },
    },
    {
      title: '餐食类型',
      key: 'mealType',
      width: 100,
      render: (_: any, record: CarbonBaseline) => {
        const mealType = record.category?.mealType
        if (!mealType) return '-'
        return mealType === MealType.MEAT_SIMPLE ? '肉食简餐' : '肉食正餐'
      },
    },
    {
      title: '用能方式',
      key: 'energyType',
      width: 100,
      render: (_: any, record: CarbonBaseline) => {
        const energyType = record.category?.energyType
        if (!energyType) return '-'
        const energyMap: Record<string, string> = {
          [EnergyType.ELECTRIC]: '全电',
          [EnergyType.GAS]: '燃气',
          [EnergyType.MIXED]: '混合',
        }
        return energyMap[energyType] || energyType
      },
    },
    {
      title: '基准值',
      key: 'value',
      width: 120,
      render: (_: any, record: CarbonBaseline) => {
        const value = record.carbonFootprint?.value
        if (value === undefined || value === null) {
          return '-'
        }
        return `${value.toFixed(1)} kg CO₂e`
      },
      sorter: (a: CarbonBaseline, b: CarbonBaseline) => {
        const aValue = a.carbonFootprint?.value || 0
        const bValue = b.carbonFootprint?.value || 0
        return aValue - bValue
      },
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (version: string) => version || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        if (!status) return <Tag>-</Tag>
        const statusMap: Record<string, { color: string; text: string }> = {
          [BaselineStatus.ACTIVE]: { color: 'success', text: '活跃' },
          [BaselineStatus.ARCHIVED]: { color: 'default', text: '已归档' },
          [BaselineStatus.DRAFT]: { color: 'warning', text: '草稿' },
        }
        const cfg = statusMap[status] || { color: 'default', text: status }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date: string | Date) => {
        if (!date) return '-'
        try {
          return new Date(date).toLocaleString('zh-CN')
        } catch {
          return '-'
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/carbon/baseline/${record.baselineId}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/carbon/baseline/${record.baselineId}/edit`)}
            disabled={record.status === BaselineStatus.ARCHIVED}
          >
            编辑
          </Button>
          {record.status === BaselineStatus.ACTIVE ? (
            <Popconfirm
              title="确认归档"
              description="确定要归档这条基准值吗？归档后将不再用于查询。"
              onConfirm={() => handleArchive(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" danger>
                归档
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() => handleActivate(record)}
            >
              激活
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="碳足迹基准值管理"
        extra={
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => navigate('/carbon/baseline/import')}
            >
              批量导入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/carbon/baseline/add')}
            >
              添加基准值
            </Button>
          </Space>
        }
      >
        {/* 筛选器 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Search
            placeholder="搜索基准值ID、版本号、机构名称"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            placeholder="地区"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('region', value)}
          >
            <Option value={Region.NORTH_CHINA}>华北</Option>
            <Option value={Region.NORTHEAST}>东北</Option>
            <Option value={Region.EAST_CHINA}>华东</Option>
            <Option value={Region.CENTRAL_CHINA}>华中</Option>
            <Option value={Region.NORTHWEST}>西北</Option>
            <Option value={Region.SOUTH_CHINA}>南方</Option>
          </Select>
          <Select
            placeholder="餐食类型"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('mealType', value)}
          >
            <Option value={MealType.MEAT_SIMPLE}>肉食简餐</Option>
            <Option value={MealType.MEAT_FULL}>肉食正餐</Option>
          </Select>
          <Select
            placeholder="用能方式"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('energyType', value)}
          >
            <Option value={EnergyType.ELECTRIC}>全电</Option>
            <Option value={EnergyType.GAS}>燃气</Option>
          </Select>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('status', value)}
          >
            <Option value={BaselineStatus.ACTIVE}>活跃</Option>
            <Option value={BaselineStatus.ARCHIVED}>已归档</Option>
            <Option value={BaselineStatus.DRAFT}>草稿</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
          >
            刷新
          </Button>
        </Space>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey={(record) => record._id || record.baselineId || Math.random()}
          loading={loading}
          locale={{
            emptyText: dataSource.length === 0 && !loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <p style={{ marginBottom: 16, color: '#999' }}>
                  {dataSource.length === 0 && pagination.total === 0
                    ? '暂无数据，请先初始化数据库或添加基准值'
                    : '暂无数据'}
                </p>
                {dataSource.length === 0 && pagination.total === 0 && (
                  <Space>
                    <Button
                      type="primary"
                      onClick={async () => {
                        try {
                          message.loading('正在初始化数据库...', 0)
                          const { baselineInitAPI } = await import('@/services/baseline')
                          const result = await baselineInitAPI.check()
                          if (result.success) {
                            message.destroy()
                            if (result.data.results?.check?.isComplete) {
                              message.success('数据库已初始化，共 ' + result.data.results.check.found + ' 条数据')
                              fetchData()
                            } else {
                              message.warning('数据库未完整初始化，请调用 carbon-baseline-init 云函数')
                            }
                          } else {
                            message.destroy()
                            message.error(result.error || '检查失败')
                          }
                        } catch (error: any) {
                          message.destroy()
                          message.error('初始化失败: ' + error.message)
                        }
                      }}
                    >
                      检查数据库状态
                    </Button>
                    <Button
                      type="default"
                      icon={<PlusOutlined />}
                      onClick={() => navigate('/carbon/baseline/add')}
                    >
                      添加基准值
                    </Button>
                  </Space>
                )}
              </div>
            ) : undefined,
          }}
          pagination={{
            ...pagination,
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  )
}

export default BaselineList

