/**
 * 基准值列表页
 */
import i18n from '@/i18n'
import { baselineManageAPI } from '@/services/baseline'
import type { BaselineQueryParams, CarbonBaseline } from '@/types/baseline'
import { BaselineStatus, EnergyType, MealType, Region } from '@/types/baseline'
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined
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
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { Search } = Input
const { Option } = Select

const BaselineList: React.FC = () => {
  const { t } = useTranslation()
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
        message.error(result.error || t('pages.carbon.baselineList.messages.loadFailed'))
        setDataSource([])
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.baselineList.messages.loadFailed'))
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
        // 检查是否已提交审核申请
        if ('data' in result && result.data && typeof result.data === 'object' && 'approvalRequired' in result.data) {
          message.success('归档审核申请已提交，请等待审核')
        } else {
          message.success(t('pages.carbon.baselineList.messages.archiveSuccess'))
        }
        fetchData()
      } else {
        message.error(result.error || t('pages.carbon.baselineList.messages.archiveFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.baselineList.messages.archiveFailed'))
    }
  }

  const handleActivate = async (record: CarbonBaseline) => {
    try {
      const result = await baselineManageAPI.activate(record.baselineId)
      if (result.success) {
        message.success(t('pages.carbon.baselineList.messages.activateSuccess'))
        fetchData()
      } else {
        message.error(result.error || t('pages.carbon.baselineList.messages.activateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.baselineList.messages.activateFailed'))
    }
  }

  // 表格列定义
  const columns: ColumnsType<CarbonBaseline> = [
    {
      title: t('pages.carbon.baselineList.table.columns.baselineId'),
      dataIndex: 'baselineId',
      key: 'baselineId',
      width: 200,
      ellipsis: true,
      render: (baselineId: string) => baselineId || '-',
    },
    {
      title: t('pages.carbon.baselineList.table.columns.region'),
      key: 'region',
      width: 100,
      render: (_: any, record: CarbonBaseline) => {
        const region = record.category?.region
        if (!region) return '-'
        const regionMap: Record<string, string> = {
          [Region.NORTH_CHINA]: t('pages.carbon.baselineList.regions.northChina'),
          [Region.NORTHEAST]: t('pages.carbon.baselineList.regions.northeast'),
          [Region.EAST_CHINA]: t('pages.carbon.baselineList.regions.eastChina'),
          [Region.CENTRAL_CHINA]: t('pages.carbon.baselineList.regions.centralChina'),
          [Region.NORTHWEST]: t('pages.carbon.baselineList.regions.northwest'),
          [Region.SOUTH_CHINA]: t('pages.carbon.baselineList.regions.southChina'),
          [Region.NATIONAL_AVERAGE]: t('pages.carbon.baselineList.regions.nationalAverage'),
        }
        return regionMap[region] || region
      },
    },
    {
      title: t('pages.carbon.baselineList.table.columns.mealType'),
      key: 'mealType',
      width: 100,
      render: (_: any, record: CarbonBaseline) => {
        const mealType = record.category?.mealType
        if (!mealType) return '-'
        return mealType === MealType.MEAT_SIMPLE 
          ? t('pages.carbon.baselineList.mealTypes.meatSimple')
          : t('pages.carbon.baselineList.mealTypes.meatFull')
      },
    },
    {
      title: t('pages.carbon.baselineList.table.columns.energyType'),
      key: 'energyType',
      width: 100,
      render: (_: any, record: CarbonBaseline) => {
        const energyType = record.category?.energyType
        if (!energyType) return '-'
        const energyMap: Record<string, string> = {
          [EnergyType.ELECTRIC]: t('pages.carbon.baselineList.energyTypes.electric'),
          [EnergyType.GAS]: t('pages.carbon.baselineList.energyTypes.gas'),
          [EnergyType.MIXED]: t('pages.carbon.baselineList.energyTypes.mixed'),
        }
        return energyMap[energyType] || energyType
      },
    },
    {
      title: t('pages.carbon.baselineList.table.columns.value'),
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
      title: t('pages.carbon.baselineList.table.columns.version'),
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (version: string) => version || '-',
    },
    {
      title: t('pages.carbon.baselineList.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        if (!status) return <Tag>-</Tag>
        const statusMap: Record<string, { color: string; text: string }> = {
          [BaselineStatus.ACTIVE]: { color: 'success', text: t('pages.carbon.baselineList.status.active') },
          [BaselineStatus.ARCHIVED]: { color: 'default', text: t('pages.carbon.baselineList.status.archived') },
          [BaselineStatus.DRAFT]: { color: 'warning', text: t('pages.carbon.baselineList.status.draft') },
        }
        const cfg = statusMap[status] || { color: 'default', text: status }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.carbon.baselineList.table.columns.updatedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date: string | Date) => {
        if (!date) return '-'
        try {
          const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US'
          return new Date(date).toLocaleString(locale)
        } catch {
          return '-'
        }
      },
    },
    {
      title: t('pages.carbon.baselineList.table.columns.actions'),
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
            {t('pages.carbon.baselineList.table.actions.view')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/carbon/baseline/${record.baselineId}/edit`)}
            disabled={record.status === BaselineStatus.ARCHIVED}
          >
            {t('pages.carbon.baselineList.table.actions.edit')}
          </Button>
          {record.status === BaselineStatus.ACTIVE ? (
            <Popconfirm
              title={t('pages.carbon.baselineList.messages.confirmArchive')}
              description={t('pages.carbon.baselineList.messages.confirmArchiveDescription')}
              onConfirm={() => handleArchive(record)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button type="link" size="small" danger>
                {t('pages.carbon.baselineList.table.actions.archive')}
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() => handleActivate(record)}
            >
              {t('pages.carbon.baselineList.table.actions.activate')}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={t('pages.carbon.baselineList.title')}
        extra={
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => navigate('/carbon/baseline/import')}
            >
              {t('pages.carbon.baselineList.buttons.import')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/carbon/baseline/add')}
            >
              {t('pages.carbon.baselineList.buttons.add')}
            </Button>
          </Space>
        }
      >
        {/* 筛选器 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Search
            placeholder={t('pages.carbon.baselineList.filters.search')}
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            placeholder={t('pages.carbon.baselineList.filters.region')}
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('region', value)}
          >
            <Option value={Region.NORTH_CHINA}>{t('pages.carbon.baselineList.regions.northChina')}</Option>
            <Option value={Region.NORTHEAST}>{t('pages.carbon.baselineList.regions.northeast')}</Option>
            <Option value={Region.EAST_CHINA}>{t('pages.carbon.baselineList.regions.eastChina')}</Option>
            <Option value={Region.CENTRAL_CHINA}>{t('pages.carbon.baselineList.regions.centralChina')}</Option>
            <Option value={Region.NORTHWEST}>{t('pages.carbon.baselineList.regions.northwest')}</Option>
            <Option value={Region.SOUTH_CHINA}>{t('pages.carbon.baselineList.regions.southChina')}</Option>
          </Select>
          <Select
            placeholder={t('pages.carbon.baselineList.filters.mealType')}
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('mealType', value)}
          >
            <Option value={MealType.MEAT_SIMPLE}>{t('pages.carbon.baselineList.mealTypes.meatSimple')}</Option>
            <Option value={MealType.MEAT_FULL}>{t('pages.carbon.baselineList.mealTypes.meatFull')}</Option>
          </Select>
          <Select
            placeholder={t('pages.carbon.baselineList.filters.energyType')}
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('energyType', value)}
          >
            <Option value={EnergyType.ELECTRIC}>{t('pages.carbon.baselineList.energyTypes.electric')}</Option>
            <Option value={EnergyType.GAS}>{t('pages.carbon.baselineList.energyTypes.gas')}</Option>
          </Select>
          <Select
            placeholder={t('pages.carbon.baselineList.filters.status')}
            allowClear
            style={{ width: 120 }}
            onChange={(value) => handleFilterChange('status', value)}
          >
            <Option value={BaselineStatus.ACTIVE}>{t('pages.carbon.baselineList.status.active')}</Option>
            <Option value={BaselineStatus.ARCHIVED}>{t('pages.carbon.baselineList.status.archived')}</Option>
            <Option value={BaselineStatus.DRAFT}>{t('pages.carbon.baselineList.status.draft')}</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
          >
            {t('pages.carbon.baselineList.buttons.refresh')}
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
                    ? t('pages.carbon.baselineList.empty.noData')
                    : t('pages.carbon.baselineList.empty.noDataSimple')}
                </p>
                {dataSource.length === 0 && pagination.total === 0 && (
                  <Space>
                    <Button
                      type="primary"
                      onClick={async () => {
                        try {
                          message.loading(t('pages.carbon.baselineList.messages.initLoading'), 0)
                          const { baselineInitAPI } = await import('@/services/baseline')
                          const result = await baselineInitAPI.check()
                          if (result.success) {
                            message.destroy()
                            if (result.data.results?.check?.isComplete) {
                              message.success(t('pages.carbon.baselineList.messages.initSuccess', { count: result.data.results.check.found }))
                              fetchData()
                            } else {
                              message.warning(t('pages.carbon.baselineList.messages.initIncomplete'))
                            }
                          } else {
                            message.destroy()
                            message.error(result.error || t('pages.carbon.baselineList.messages.initCheckFailed'))
                          }
                        } catch (error: any) {
                          message.destroy()
                          message.error(t('pages.carbon.baselineList.messages.initFailed', { error: error.message }))
                        }
                      }}
                    >
                      {t('pages.carbon.baselineList.buttons.checkDatabase')}
                    </Button>
                    <Button
                      type="default"
                      icon={<PlusOutlined />}
                      onClick={() => navigate('/carbon/baseline/add')}
                    >
                      {t('pages.carbon.baselineList.buttons.add')}
                    </Button>
                  </Space>
                )}
              </div>
            ) : undefined,
          }}
          pagination={{
            ...pagination,
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
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

