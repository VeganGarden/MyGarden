import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'

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
      message.error('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<CrossTenantData> = [
    {
      title: '租户ID',
      dataIndex: 'tenantId',
      key: 'tenantId',
      width: 150,
    },
    {
      title: '餐厅名称',
      dataIndex: 'restaurantName',
      key: 'restaurantName',
      width: 150,
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (type: string) => {
        const config: Record<string, { color: string; text: string }> = {
          order: { color: 'blue', text: '订单' },
          carbon: { color: 'green', text: '碳减排' },
          user: { color: 'purple', text: '用户' },
          revenue: { color: 'gold', text: '收入' },
        }
        const cfg = config[type] || { color: 'default', text: type }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (value?: number) => (value ? `¥${value.toLocaleString()}` : '-'),
    },
    {
      title: '日期',
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
      message.info('导出功能开发中')
    } catch (error) {
      message.error('导出失败')
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
      <Card title="跨租户数据查看">
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            mode="multiple"
            placeholder="选择租户（可多选）"
            style={{ width: 300 }}
            value={selectedTenants}
            onChange={setSelectedTenants}
            options={tenantOptions}
            allowClear
          />
          <Select
            placeholder="数据类型"
            style={{ width: 150 }}
            value={dataType}
            onChange={setDataType}
            allowClear
          >
            <Select.Option value="all">全部</Select.Option>
            <Select.Option value="order">订单</Select.Option>
            <Select.Option value="carbon">碳减排</Select.Option>
            <Select.Option value="user">用户</Select.Option>
            <Select.Option value="revenue">收入</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="YYYY-MM-DD"
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出
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
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />

        <Card
          title="数据汇总"
          style={{ marginTop: 16 }}
          extra={
            <Space>
              <span>总租户数: {new Set(dataSource.map((item) => item.tenantId)).size}</span>
              <span>总订单数: {dataSource.filter((item) => item.dataType === 'order').reduce((sum, item) => sum + item.count, 0).toLocaleString()}</span>
              <span>
                总碳减排: {dataSource.filter((item) => item.dataType === 'carbon').reduce((sum, item) => sum + item.count, 0).toLocaleString()} kg
              </span>
              <span>
                总收入: ¥{dataSource.filter((item) => item.dataType === 'revenue' && item.amount).reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}
              </span>
            </Space>
          }
        >
          <div style={{ color: '#666', fontSize: 14 }}>
            <p>说明：跨租户数据查看功能允许平台管理员查看所有租户的数据，用于平台级的数据分析和监控。</p>
            <p>数据包括：订单数据、碳减排数据、用户数据、收入数据等。</p>
          </div>
        </Card>
      </Card>
    </div>
  )
}

export default CrossTenant

