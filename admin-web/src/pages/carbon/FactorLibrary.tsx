/**
 * 碳排放因子库列表页
 */
import i18n from '@/i18n'
import { factorManageAPI } from '@/services/factor'
import type { CarbonEmissionFactor, FactorQueryParams } from '@/types/factor'
import { FactorCategory, FactorSource, FactorStatus } from '@/types/factor'
import { getRegionDisplayName, normalizeRegion } from '@/utils/regionMapper'
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
import { useLocation, useNavigate } from 'react-router-dom'

const { Search } = Input
const { Option } = Select

const FactorLibrary: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<CarbonEmissionFactor[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  
  // 从URL查询参数中读取keyword
  const getKeywordFromUrl = () => {
    const params = new URLSearchParams(location.search)
    return params.get('keyword') || undefined
  }
  
  const initialKeyword = getKeywordFromUrl()
  const [filters, setFilters] = useState<FactorQueryParams>({
    page: 1,
    pageSize: 20,
    keyword: initialKeyword,
  })
  
  // 搜索框的值（用于显示）
  const [searchValue, setSearchValue] = useState(initialKeyword || '')

  // 获取列表数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await factorManageAPI.list({
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
        message.error(result.error || t('pages.carbon.factorLibrary.messages.loadFailed'))
        setDataSource([])
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.factorLibrary.messages.loadFailed'))
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, filters.category, filters.source, filters.status, filters.keyword])

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
    setSearchValue(value)
    setFilters({
      ...filters,
      keyword: value || undefined,
    })
    setPagination({ ...pagination, current: 1 })
  }
  
  // 当URL查询参数变化时，更新搜索框和筛选条件
  useEffect(() => {
    const keywordFromUrl = getKeywordFromUrl()
    if (keywordFromUrl !== filters.keyword) {
      setSearchValue(keywordFromUrl || '')
      setFilters({
        ...filters,
        keyword: keywordFromUrl,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  // 处理归档/激活
  const handleArchive = async (record: CarbonEmissionFactor) => {
    try {
      const result = await factorManageAPI.archive(record.factorId)
      if (result.success) {
        // 检查是否已提交审核申请
        if (result.data?.approvalRequired) {
          message.success('归档审核申请已提交，请等待审核')
        } else {
          message.success(t('pages.carbon.factorLibrary.messages.archiveSuccess'))
        }
        fetchData()
      } else {
        message.error(result.error || t('pages.carbon.factorLibrary.messages.archiveFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.factorLibrary.messages.archiveFailed'))
    }
  }

  const handleActivate = async (record: CarbonEmissionFactor) => {
    try {
      const result = await factorManageAPI.activate(record.factorId)
      if (result.success) {
        message.success(t('pages.carbon.factorLibrary.messages.activateSuccess'))
        fetchData()
      } else {
        message.error(result.error || t('pages.carbon.factorLibrary.messages.activateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.factorLibrary.messages.activateFailed'))
    }
  }

  // 表格列定义
  const columns: ColumnsType<CarbonEmissionFactor> = [
    {
      title: t('pages.carbon.factorLibrary.table.columns.factorId'),
      dataIndex: 'factorId',
      key: 'factorId',
      width: 200,
      ellipsis: true,
      render: (factorId: string, record: CarbonEmissionFactor) => {
        // 判断是否需要补充数据：status为pending或factorValue为null/undefined
        const isPending = record.status === FactorStatus.PENDING || record.factorValue === null || record.factorValue === undefined;
        return (
          <span style={{ color: isPending ? '#ff7a00' : 'inherit' }}>
            {factorId || '-'}
          </span>
        );
      },
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.name'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.category'),
      key: 'category',
      width: 120,
      render: (_: any, record: CarbonEmissionFactor) => {
        const categoryMap: Record<string, string> = {
          [FactorCategory.INGREDIENT]: t('pages.carbon.factorLibrary.categories.ingredient'),
          [FactorCategory.ENERGY]: t('pages.carbon.factorLibrary.categories.energy'),
          [FactorCategory.MATERIAL]: t('pages.carbon.factorLibrary.categories.material'),
          [FactorCategory.TRANSPORT]: t('pages.carbon.factorLibrary.categories.transport'),
        }
        return categoryMap[record.category] || record.category
      },
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.subCategory'),
      dataIndex: 'subCategory',
      key: 'subCategory',
      width: 120,
      render: (subCategory: string) => subCategory || '-',
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.factorValue'),
      key: 'factorValue',
      width: 150,
      render: (_: any, record: CarbonEmissionFactor) => {
        // 如果factorValue为null/undefined，使用0作为默认值
        const value = record.factorValue ?? 0
        const unit = record.unit || 'kgCO2e/kg'
        const isPending = record.status === 'pending' || record.factorValue === null || record.factorValue === undefined;
        
        return (
          <span style={{ color: isPending ? '#ff7a00' : 'inherit' }}>
            {value.toFixed(2)} {unit}
          </span>
        );
      },
      sorter: (a: CarbonEmissionFactor, b: CarbonEmissionFactor) => {
        const aValue = a.factorValue ?? 0
        const bValue = b.factorValue ?? 0
        return aValue - bValue
      },
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.source'),
      key: 'source',
      width: 100,
      render: (_: any, record: CarbonEmissionFactor) => {
        const sourceMap: Record<string, string> = {
          [FactorSource.CLCD]: 'CLCD',
          [FactorSource.IPCC]: 'IPCC',
          [FactorSource.CPCD]: 'CPCD',
          [FactorSource.ECOINVENT]: 'Ecoinvent',
        }
        return sourceMap[record.source] || record.source
      },
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.year'),
      dataIndex: 'year',
      key: 'year',
      width: 80,
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.region'),
      dataIndex: 'region',
      key: 'region',
      width: 100,
      render: (region: string) => region ? getRegionDisplayName(normalizeRegion(region)) : '-',
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.version'),
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (version: string) => version || '-',
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        if (!status) return <Tag>-</Tag>
        const statusMap: Record<string, { color: string; text: string }> = {
          [FactorStatus.ACTIVE]: { color: 'success', text: t('pages.carbon.factorLibrary.status.active') },
          [FactorStatus.ARCHIVED]: { color: 'default', text: t('pages.carbon.factorLibrary.status.archived') },
          [FactorStatus.DRAFT]: { color: 'warning', text: t('pages.carbon.factorLibrary.status.draft') },
        }
        const cfg = statusMap[status] || { color: 'default', text: status }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.carbon.factorLibrary.table.columns.updatedAt'),
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
      title: t('pages.carbon.factorLibrary.table.columns.actions'),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        // 判断是否需要补充数据：status为pending或factorValue为null/undefined
        const isPending = record.status === FactorStatus.PENDING || record.factorValue === null || record.factorValue === undefined;
        const linkColor = isPending ? '#ff7a00' : undefined;
        
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/carbon/factor-library/${record.factorId}`)}
              style={{ color: linkColor }}
            >
              {t('pages.carbon.factorLibrary.table.actions.view')}
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/carbon/factor-library/${record.factorId}/edit`)}
              disabled={record.status === FactorStatus.ARCHIVED}
              style={{ color: linkColor }}
            >
              {t('pages.carbon.factorLibrary.table.actions.edit')}
            </Button>
          {record.status === FactorStatus.ACTIVE ? (
            <Popconfirm
              title={t('pages.carbon.factorLibrary.messages.confirmArchive')}
              description={t('pages.carbon.factorLibrary.messages.confirmArchiveDescription')}
              onConfirm={() => handleArchive(record)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button type="link" size="small" danger>
                {t('pages.carbon.factorLibrary.table.actions.archive')}
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() => handleActivate(record)}
            >
              {t('pages.carbon.factorLibrary.table.actions.activate')}
            </Button>
          )}
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <Card
        title={t('pages.carbon.factorLibrary.title')}
        extra={
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => navigate('/carbon/factor-library/import')}
            >
              {t('pages.carbon.factorLibrary.buttons.import')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/carbon/factor-library/add')}
            >
              {t('pages.carbon.factorLibrary.buttons.add')}
            </Button>
          </Space>
        }
      >
        {/* 筛选器 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Search
            placeholder={t('pages.carbon.factorLibrary.filters.search')}
            allowClear
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            placeholder={t('pages.carbon.factorLibrary.filters.category')}
            allowClear
            style={{ width: 120 }}
            value={filters.category}
            onChange={(value) => handleFilterChange('category', value)}
          >
            <Option value={FactorCategory.INGREDIENT}>{t('pages.carbon.factorLibrary.categories.ingredient')}</Option>
            <Option value={FactorCategory.ENERGY}>{t('pages.carbon.factorLibrary.categories.energy')}</Option>
            <Option value={FactorCategory.MATERIAL}>{t('pages.carbon.factorLibrary.categories.material')}</Option>
            <Option value={FactorCategory.TRANSPORT}>{t('pages.carbon.factorLibrary.categories.transport')}</Option>
          </Select>
          <Select
            placeholder={t('pages.carbon.factorLibrary.filters.source')}
            allowClear
            style={{ width: 120 }}
            value={filters.source}
            onChange={(value) => handleFilterChange('source', value)}
          >
            <Option value={FactorSource.CLCD}>CLCD</Option>
            <Option value={FactorSource.IPCC}>IPCC</Option>
            <Option value={FactorSource.CPCD}>CPCD</Option>
            <Option value={FactorSource.ECOINVENT}>Ecoinvent</Option>
          </Select>
          <Select
            placeholder={t('pages.carbon.factorLibrary.filters.status')}
            allowClear
            style={{ width: 120 }}
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
          >
            <Option value={FactorStatus.ACTIVE}>{t('pages.carbon.factorLibrary.status.active')}</Option>
            <Option value={FactorStatus.ARCHIVED}>{t('pages.carbon.factorLibrary.status.archived')}</Option>
            <Option value={FactorStatus.DRAFT}>{t('pages.carbon.factorLibrary.status.draft')}</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
          >
            {t('pages.carbon.factorLibrary.buttons.refresh')}
          </Button>
        </Space>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey={(record) => record._id || record.factorId || Math.random()}
          loading={loading}
          locale={{
            emptyText: t('pages.carbon.factorLibrary.empty.noData'),
          }}
          pagination={{
            ...pagination,
            showTotal: (total) => t('pages.carbon.factorLibrary.pagination.total', { total }),
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
            },
          }}
          scroll={{ x: 1500 }}
        />
      </Card>
    </div>
  )
}

export default FactorLibrary

