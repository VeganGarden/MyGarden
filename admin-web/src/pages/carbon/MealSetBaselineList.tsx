/**
 * 一餐饭基准值列表页
 */
import i18n from '@/i18n'
import { getMealSetBaselineList, archiveMealSetBaseline, activateMealSetBaseline, toggleCalculationUsage } from '@/services/meal-set-baseline'
import type { MealSetBaselineQueryParams, MealSetBaseline } from '@/types/meal-set-baseline'
import { BaselineStatus, EnergyType, Region } from '@/types/baseline'
import { MealTime, MealStructure, HasSoup, RestaurantType, ConsumptionScenario, ResearchStatus } from '@/types/meal-set-baseline'
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { Search } = Input
const { Option } = Select

const MealSetBaselineList: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<MealSetBaseline[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<MealSetBaselineQueryParams>({
    page: 1,
    pageSize: 20,
  })

  // 获取列表数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await getMealSetBaselineList({
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
        message.error(result.error || '加载失败')
        setDataSource([])
      }
    } catch (error: any) {
      message.error(error.message || '加载失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, filters.mealTime, filters.region, filters.energyType, filters.mealStructure, filters.hasSoup, filters.status, filters.keyword])

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
  const handleArchive = async (record: MealSetBaseline) => {
    try {
      const result = await archiveMealSetBaseline(record.baselineId)
      if (result.success) {
        message.success('归档申请已提交，等待审核')
        fetchData()
      } else {
        message.error(result.error || '归档失败')
      }
    } catch (error: any) {
      message.error(error.message || '归档失败')
    }
  }

  const handleActivate = async (record: MealSetBaseline) => {
    try {
      const result = await activateMealSetBaseline(record.baselineId)
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

  // 处理启用/禁用计算
  const handleToggleCalculation = async (record: MealSetBaseline, enabled: boolean) => {
    try {
      const result = await toggleCalculationUsage(record.baselineId, enabled)
      if (result.success) {
        message.success(enabled ? '已启用计算功能' : '已禁用计算功能')
        fetchData()
      } else {
        message.error(result.error || '操作失败')
      }
    } catch (error: any) {
      message.error(error.message || '操作失败')
    }
  }

  // 表格列定义
  const columns: ColumnsType<MealSetBaseline> = [
    {
      title: '基准值ID',
      dataIndex: 'baselineId',
      key: 'baselineId',
      width: 300,
      ellipsis: true,
    },
    {
      title: '餐次类型',
      dataIndex: ['category', 'mealTime'],
      key: 'mealTime',
      width: 100,
      render: (value: string) => {
        const labels: Record<string, string> = {
          breakfast: '早餐',
          lunch: '午餐',
          dinner: '晚餐'
        }
        return labels[value] || value
      },
    },
    {
      title: '区域',
      dataIndex: ['category', 'region'],
      key: 'region',
      width: 120,
      render: (value: string) => {
        const labels: Record<string, string> = {
          north_china: '华北',
          northeast: '东北',
          east_china: '华东',
          central_china: '华中',
          northwest: '西北',
          south_china: '华南',
          national_average: '全国平均'
        }
        return labels[value] || value
      },
    },
    {
      title: '结构类型',
      dataIndex: ['category', 'mealStructure'],
      key: 'mealStructure',
      width: 100,
      render: (value: string) => {
        if (!value || value === 'default') return '-'
        const labels: Record<string, string> = {
          simple: '简餐',
          standard: '标准餐',
          full: '正餐',
          banquet: '宴席'
        }
        return labels[value] || value
      },
    },
    {
      title: '是否有汤',
      dataIndex: ['category', 'hasSoup'],
      key: 'hasSoup',
      width: 100,
      render: (value: string) => {
        if (!value || value === 'default') return '-'
        const labels: Record<string, string> = {
          with_soup: '有汤',
          without_soup: '无汤',
          optional: '可选'
        }
        return labels[value] || value
      },
    },
    {
      title: '基准值',
      dataIndex: ['carbonFootprint', 'value'],
      key: 'value',
      width: 120,
      render: (value: number) => `${value?.toFixed(2) || 0} kg CO₂e`,
      sorter: (a, b) => (a.carbonFootprint?.value || 0) - (b.carbonFootprint?.value || 0),
    },
    {
      title: '典型结构',
      dataIndex: ['typicalStructure', 'description'],
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '研究状态',
      dataIndex: ['usage', 'researchStatus'],
      key: 'researchStatus',
      width: 100,
      render: (value: string) => {
        const colors: Record<string, string> = {
          researching: 'orange',
          completed: 'blue',
          validated: 'green'
        }
        const labels: Record<string, string> = {
          researching: '研究中',
          completed: '已完成',
          validated: '已验证'
        }
        return <Tag color={colors[value]}>{labels[value] || value}</Tag>
      },
    },
    {
      title: '用于计算',
      dataIndex: ['usage', 'isForCalculation'],
      key: 'isForCalculation',
      width: 100,
      render: (value: boolean) => (
        value ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>是</Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />}>否</Tag>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: string) => {
        const colors: Record<string, string> = {
          active: 'green',
          archived: 'default',
          draft: 'orange'
        }
        const labels: Record<string, string> = {
          active: '活跃',
          archived: '已归档',
          draft: '草稿'
        }
        return <Tag color={colors[value]}>{labels[value] || value}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/carbon/meal-set-baselines/${record.baselineId}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/carbon/meal-set-baselines/${record.baselineId}/edit`)}
          >
            编辑
          </Button>
          {record.status === 'active' ? (
            <Popconfirm
              title="确定要归档这条基准值吗？"
              onConfirm={() => handleArchive(record)}
              okText="确定"
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
          {record.status === 'active' && (
            <Popconfirm
              title={record.usage?.isForCalculation ? '确定要禁用计算功能吗？' : '确定要启用计算功能吗？'}
              description={record.usage?.isForCalculation 
                ? '禁用后，该基准值将不再用于碳减排计算' 
                : '启用后，该基准值将可用于碳减排计算（请确保数据已验证）'}
              onConfirm={() => handleToggleCalculation(record, !record.usage?.isForCalculation)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title={record.usage?.isForCalculation ? '禁用计算' : '启用计算'}>
                <Button 
                  type="link" 
                  size="small"
                  danger={record.usage?.isForCalculation}
                >
                  {record.usage?.isForCalculation ? '禁用计算' : '启用计算'}
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 操作栏 */}
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/carbon/meal-set-baselines/add')}
            >
              添加一餐饭基准值
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => navigate('/carbon/meal-set-baselines/import')}
            >
              批量导入
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              刷新
            </Button>
          </Space>

          {/* 筛选栏 */}
          <Space wrap>
            <Select
              placeholder="餐次类型"
              style={{ width: 120 }}
              allowClear
              value={filters.mealTime}
              onChange={(value) => handleFilterChange('mealTime', value)}
            >
              <Option value={MealTime.BREAKFAST}>早餐</Option>
              <Option value={MealTime.LUNCH}>午餐</Option>
              <Option value={MealTime.DINNER}>晚餐</Option>
            </Select>

            <Select
              placeholder="区域"
              style={{ width: 120 }}
              allowClear
              value={filters.region}
              onChange={(value) => handleFilterChange('region', value)}
            >
              <Option value={Region.NORTH_CHINA}>华北</Option>
              <Option value={Region.NORTHEAST}>东北</Option>
              <Option value={Region.EAST_CHINA}>华东</Option>
              <Option value={Region.CENTRAL_CHINA}>华中</Option>
              <Option value={Region.NORTHWEST}>西北</Option>
              <Option value={Region.SOUTH_CHINA}>华南</Option>
              <Option value={Region.NATIONAL_AVERAGE}>全国平均</Option>
            </Select>

            <Select
              placeholder="用能方式"
              style={{ width: 120 }}
              allowClear
              value={filters.energyType}
              onChange={(value) => handleFilterChange('energyType', value)}
            >
              <Option value={EnergyType.ELECTRIC}>全电</Option>
              <Option value={EnergyType.GAS}>燃气</Option>
              <Option value={EnergyType.MIXED}>混合</Option>
            </Select>

            <Select
              placeholder="结构类型"
              style={{ width: 120 }}
              allowClear
              value={filters.mealStructure}
              onChange={(value) => handleFilterChange('mealStructure', value)}
            >
              <Option value={MealStructure.SIMPLE}>简餐</Option>
              <Option value={MealStructure.STANDARD}>标准餐</Option>
              <Option value={MealStructure.FULL}>正餐</Option>
              <Option value={MealStructure.BANQUET}>宴席</Option>
            </Select>

            <Select
              placeholder="是否有汤"
              style={{ width: 120 }}
              allowClear
              value={filters.hasSoup}
              onChange={(value) => handleFilterChange('hasSoup', value)}
            >
              <Option value={HasSoup.WITH_SOUP}>有汤</Option>
              <Option value={HasSoup.WITHOUT_SOUP}>无汤</Option>
              <Option value={HasSoup.OPTIONAL}>可选</Option>
            </Select>

            <Select
              placeholder="状态"
              style={{ width: 120 }}
              allowClear
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value={BaselineStatus.ACTIVE}>活跃</Option>
              <Option value={BaselineStatus.ARCHIVED}>已归档</Option>
              <Option value={BaselineStatus.DRAFT}>草稿</Option>
            </Select>

            <Search
              placeholder="搜索基准值ID、版本号"
              style={{ width: 300 }}
              onSearch={handleSearch}
              allowClear
            />
          </Space>

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="baselineId"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize })
              },
            }}
            scroll={{ x: 1500 }}
          />
        </Space>
      </Card>
    </div>
  )
}

export default MealSetBaselineList

