import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

interface CrossTenantData {
  tenantId: string
  restaurantName: string
  dataType: 'order' | 'carbon' | 'user' | 'revenue'
  count: number
  amount?: number
  date: string
}

const CrossTenant: React.FC = () => {
  const { t } = useTranslation()
  const [dataSource, setDataSource] = useState<CrossTenantData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [dataType, setDataType] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // TODO: 调用API获取跨租户数据
      // const result = await platformAPI.crossTenant.getData({
      //   tenantIds: selectedTenants,
      //   startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      //   endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      //   dataType: dataType === 'all' ? 'all' : (dataType as any),
      // })
      // setDataSource(result)
      
      // 模拟数据
      const mockData: CrossTenantData[] = [
        {
          tenantId: 'tenant_001',
          restaurantName: '虹桥素坊',
          dataType: 'order',
          count: 1250,
          date: '2025-01-15',
        },
        {
          tenantId: 'tenant_001',
          restaurantName: '虹桥素坊',
          dataType: 'carbon',
          count: 3650,
          date: '2025-01-15',
        },
        {
          tenantId: 'tenant_001',
          restaurantName: '虹桥素坊',
          dataType: 'revenue',
          count: 1250,
          amount: 125000,
          date: '2025-01-15',
        },
        {
          tenantId: 'tenant_002',
          restaurantName: '绿色餐厅',
          dataType: 'order',
          count: 890,
          date: '2025-01-15',
        },
        {
          tenantId: 'tenant_002',
          restaurantName: '绿色餐厅',
          dataType: 'carbon',
          count: 2100,
          date: '2025-01-15',
        },
        {
          tenantId: 'tenant_002',
          restaurantName: '绿色餐厅',
          dataType: 'revenue',
          count: 890,
          amount: 89000,
          date: '2025-01-15',
        },
        {
          tenantId: 'tenant_003',
          restaurantName: '素食天地',
          dataType: 'user',
          count: 150,
          date: '2025-01-15',
        },
      ]
      setDataSource(mockData)
    } catch (error) {
      message.error(t('pages.platform.crossTenant.messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<CrossTenantData> = [
    {
      title: t('pages.platform.crossTenant.table.columns.tenantId'),
      dataIndex: 'tenantId',
      key: 'tenantId',
      width: 150,
    },
    {
      title: t('pages.platform.crossTenant.table.columns.restaurantName'),
      dataIndex: 'restaurantName',
      key: 'restaurantName',
      width: 150,
    },
    {
      title: t('pages.platform.crossTenant.table.columns.dataType'),
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (type: string) => {
        const config: Record<string, { color: string; text: string }> = {
          order: { color: 'blue', text: t('pages.platform.crossTenant.dataTypes.order') },
          carbon: { color: 'green', text: t('pages.platform.crossTenant.dataTypes.carbon') },
          user: { color: 'purple', text: t('pages.platform.crossTenant.dataTypes.user') },
          revenue: { color: 'gold', text: t('pages.platform.crossTenant.dataTypes.revenue') },
        }
        const cfg = config[type] || { color: 'default', text: type }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.platform.crossTenant.table.columns.count'),
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: t('pages.platform.crossTenant.table.columns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (value?: number) => (value ? `¥${value.toLocaleString()}` : '-'),
    },
    {
      title: t('pages.platform.crossTenant.table.columns.date'),
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
  ]

  const handleSearch = () => {
    fetchData()
  }

  const handleExport = async () => {
    try {
      // TODO: 实现数据导出功能
      // await platformAPI.crossTenant.export({
      //   tenantIds: selectedTenants,
      //   dataType,
      //   startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      //   endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      // })
      message.info(t('pages.platform.crossTenant.messages.exportInProgress'))
    } catch (error) {
      message.error(t('common.exportFailed'))
    }
  }

  // 获取所有租户列表（用于筛选）
  const tenantOptions = Array.from(new Set(dataSource.map((item) => item.tenantId))).map(
    (tenantId) => ({
      label: dataSource.find((item) => item.tenantId === tenantId)?.restaurantName || tenantId,
      value: tenantId,
    })
  )

  return (
    <div>
      <Card title={t('pages.platform.crossTenant.title')}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            mode="multiple"
            placeholder={t('pages.platform.crossTenant.filters.tenant')}
            style={{ width: 300 }}
            value={selectedTenants}
            onChange={setSelectedTenants}
            options={tenantOptions}
            allowClear
          />
          <Select
            placeholder={t('pages.platform.crossTenant.filters.dataType')}
            style={{ width: 150 }}
            value={dataType}
            onChange={setDataType}
            allowClear
          >
            <Select.Option value="all">{t('common.all')}</Select.Option>
            <Select.Option value="order">{t('pages.platform.crossTenant.dataTypes.order')}</Select.Option>
            <Select.Option value="carbon">{t('pages.platform.crossTenant.dataTypes.carbon')}</Select.Option>
            <Select.Option value="user">{t('pages.platform.crossTenant.dataTypes.user')}</Select.Option>
            <Select.Option value="revenue">{t('pages.platform.crossTenant.dataTypes.revenue')}</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="YYYY-MM-DD"
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            {t('common.search')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            {t('common.export')}
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey={(record) => `${record.tenantId}-${record.dataType}-${record.date}`}
          loading={loading}
          pagination={{
            total: dataSource.length,
            pageSize: 20,
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />

        <Card
          title={t('pages.platform.crossTenant.summary.title')}
          style={{ marginTop: 16 }}
          extra={
            <Space>
              <span>{t('pages.platform.crossTenant.summary.totalTenants')}: {new Set(dataSource.map((item) => item.tenantId)).size}</span>
              <span>{t('pages.platform.crossTenant.summary.totalOrders')}: {dataSource.filter((item) => item.dataType === 'order').reduce((sum, item) => sum + item.count, 0).toLocaleString()}</span>
              <span>
                {t('pages.platform.crossTenant.summary.totalCarbonReduction')}: {dataSource.filter((item) => item.dataType === 'carbon').reduce((sum, item) => sum + item.count, 0).toLocaleString()} kg
              </span>
              <span>
                {t('pages.platform.crossTenant.summary.totalRevenue')}: ¥{dataSource.filter((item) => item.dataType === 'revenue' && item.amount).reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}
              </span>
            </Space>
          }
        >
          <div style={{ color: '#666', fontSize: 14 }}>
            <p>{t('pages.platform.crossTenant.summary.description')}</p>
            <p>{t('pages.platform.crossTenant.summary.dataIncludes')}</p>
          </div>
        </Card>
      </Card>
    </div>
  )
}

export default CrossTenant

