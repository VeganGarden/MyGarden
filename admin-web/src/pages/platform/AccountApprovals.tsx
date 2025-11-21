import { onboardingAPI } from '@/services/cloudbase'
import { DownloadOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Descriptions, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'

const { RangePicker } = DatePicker

type Application = {
  _id: string
  desiredUsername?: string
  organizationName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  city?: string
  restaurantCount?: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt?: string
  note?: string
  rejectedReason?: string
  approvedAt?: string
  rejectedAt?: string
  approvedBy?: string
  rejectedBy?: string
}

const AccountApprovals: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Application[]>([])
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [selectedRecord, setSelectedRecord] = useState<Application | null>(null)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  
  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  // 获取城市列表（从数据中提取）
  const cityOptions = Array.from(new Set(data.map(item => item.city).filter(Boolean))) as string[]

  const load = async () => {
    setLoading(true)
    try {
      const res = await onboardingAPI.listApplications({
        status: activeTab,
        keyword: searchKeyword || undefined,
        page: pagination.current,
        pageSize: pagination.pageSize,
      })
      if (res.code === 0) {
        const list = res.data?.list || res.data || []
        // 应用前端筛选
        let filteredList = list
        
        // 城市筛选
        if (cityFilter) {
          filteredList = filteredList.filter((item: Application) => item.city === cityFilter)
        }
        
        // 日期范围筛选
        if (dateRange) {
          filteredList = filteredList.filter((item: Application) => {
            if (!item.createdAt) return false
            const itemDate = dayjs(item.createdAt)
            return itemDate.isAfter(dateRange[0].startOf('day')) && itemDate.isBefore(dateRange[1].endOf('day'))
          })
        }
        
        setData(filteredList)
        setPagination({
          ...pagination,
          total: res.data?.total || filteredList.length,
        })
      } else {
        message.error(res.message || t('common.loadFailed'))
        setData([])
      }
    } catch (e: any) {
      message.error(e.message || t('common.loadFailed'))
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [activeTab, pagination.current, pagination.pageSize])

  useEffect(() => {
    // Tab切换时重置分页
    setPagination({ ...pagination, current: 1 })
  }, [activeTab])

  const handleApprove = async (id: string) => {
    setLoading(true)
    try {
      const res = await onboardingAPI.approve(id, { createAccount: true })
      if (res.code === 0) {
        message.success(t('pages.platform.accountApprovals.messages.approved'))
        load()
      } else {
        message.error(res.message || t('common.operationFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    setLoading(true)
    try {
      const res = await onboardingAPI.reject(rejectingId, rejectReason)
      if (res.code === 0) {
        message.success(t('pages.platform.accountApprovals.messages.rejected'))
        setRejectingId(null)
        setRejectReason('')
        load()
      } else {
        message.error(res.message || t('common.operationFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (record: Application) => {
    setSelectedRecord(record)
    setIsDetailModalVisible(true)
  }

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    load()
  }

  const handleExport = () => {
    try {
      const exportData = data.map((item, index) => [
        index + 1,
        item.organizationName,
        item.desiredUsername || '-',
        item.contactName,
        item.contactPhone,
        item.contactEmail || '-',
        item.city || '-',
        item.restaurantCount || 0,
        item.status === 'pending' ? t('pages.platform.accountApprovals.status.pending') :
          item.status === 'approved' ? t('pages.platform.accountApprovals.status.approved') :
          t('pages.platform.accountApprovals.status.rejected'),
        item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
      ])

      const ws = XLSX.utils.aoa_to_sheet([
        [
          t('pages.platform.accountApprovals.export.columns.no'),
          t('pages.platform.accountApprovals.table.columns.organizationName'),
          t('pages.platform.accountApprovals.table.columns.desiredUsername'),
          t('pages.platform.accountApprovals.table.columns.contactName'),
          t('pages.platform.accountApprovals.table.columns.contactPhone'),
          t('pages.platform.accountApprovals.table.columns.contactEmail'),
          t('pages.platform.accountApprovals.table.columns.city'),
          t('pages.platform.accountApprovals.table.columns.restaurantCount'),
          t('pages.platform.accountApprovals.table.columns.status'),
          t('pages.platform.accountApprovals.export.columns.createdAt'),
        ],
        ...exportData,
      ])

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t('pages.platform.accountApprovals.export.sheetName'))

      const fileName = `${t('pages.platform.accountApprovals.export.fileName')}_${activeTab}_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      message.success(t('common.exportSuccess'))
    } catch (error: any) {
      message.error(error.message || t('common.exportFailed'))
    }
  }

  const columns = [
    { title: t('pages.platform.accountApprovals.table.columns.organizationName'), dataIndex: 'organizationName', width: 150 },
    { title: t('pages.platform.accountApprovals.table.columns.desiredUsername'), dataIndex: 'desiredUsername', width: 120 },
    { title: t('pages.platform.accountApprovals.table.columns.contactName'), dataIndex: 'contactName', width: 100 },
    { title: t('pages.platform.accountApprovals.table.columns.contactPhone'), dataIndex: 'contactPhone', width: 120 },
    { title: t('pages.platform.accountApprovals.table.columns.contactEmail'), dataIndex: 'contactEmail', width: 150 },
    { title: t('pages.platform.accountApprovals.table.columns.city'), dataIndex: 'city', width: 100 },
    { title: t('pages.platform.accountApprovals.table.columns.restaurantCount'), dataIndex: 'restaurantCount', width: 100 },
    {
      title: t('pages.platform.accountApprovals.table.columns.status'),
      dataIndex: 'status',
      width: 120,
      render: (v: Application['status']) => {
        const color = v === 'pending' ? 'gold' : v === 'approved' ? 'green' : 'red'
        const text = v === 'pending' ? t('pages.platform.accountApprovals.status.pending') : v === 'approved' ? t('pages.platform.accountApprovals.status.approved') : t('pages.platform.accountApprovals.status.rejected')
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: t('pages.platform.accountApprovals.table.columns.createdAt'),
      dataIndex: 'createdAt',
      width: 180,
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: t('pages.platform.accountApprovals.table.columns.actions'),
      key: 'actions',
      width: activeTab === 'pending' ? 280 : 120,
      fixed: 'right' as const,
      render: (_: any, record: Application) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            {t('common.view')}
          </Button>
          {activeTab === 'pending' && (
            <>
              <Button type="primary" size="small" onClick={() => handleApprove(record._id)}>
                {t('pages.platform.accountApprovals.buttons.approve')}
              </Button>
              <Button danger size="small" onClick={() => setRejectingId(record._id)}>
                {t('pages.platform.accountApprovals.buttons.reject')}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={t('pages.platform.accountApprovals.title')}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            {t('common.refresh')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={data.length === 0}>
            {t('common.export')}
          </Button>
        </Space>
      }
      bordered={false}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'pending' | 'approved' | 'rejected')}
        style={{ marginBottom: 16 }}
      >
        <Tabs.TabPane tab={t('pages.platform.accountApprovals.tabs.pending')} key="pending" />
        <Tabs.TabPane tab={t('pages.platform.accountApprovals.tabs.approved')} key="approved" />
        <Tabs.TabPane tab={t('pages.platform.accountApprovals.tabs.rejected')} key="rejected" />
      </Tabs>

      {/* 筛选条件 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('pages.platform.accountApprovals.filters.search')}
          style={{ width: 300 }}
          allowClear
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onSearch={handleSearch}
        />
        <Select
          placeholder={t('pages.platform.accountApprovals.filters.city')}
          style={{ width: 150 }}
          allowClear
          value={cityFilter}
          onChange={(value) => {
            setCityFilter(value || '')
            setPagination({ ...pagination, current: 1 })
          }}
        >
          {cityOptions.map(city => (
            <Select.Option key={city} value={city}>{city}</Select.Option>
          ))}
        </Select>
        <RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
          format="YYYY-MM-DD"
          placeholder={[t('pages.platform.accountApprovals.filters.startDate'), t('pages.platform.accountApprovals.filters.endDate')]}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
          {t('common.search')}
        </Button>
      </Space>

      <Table<Application>
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={columns}
        scroll={{ x: 1200 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, current: page, pageSize })
          },
        }}
      />

      {/* 详情模态框 */}
      <Modal
        title={t('pages.platform.accountApprovals.modal.detail.title')}
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            {t('common.close')}
          </Button>,
        ]}
        width={800}
      >
        {selectedRecord && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.organizationName')}>
              {selectedRecord.organizationName}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.desiredUsername')}>
              {selectedRecord.desiredUsername || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.contactName')}>
              {selectedRecord.contactName}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.contactPhone')}>
              {selectedRecord.contactPhone}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.contactEmail')}>
              {selectedRecord.contactEmail || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.city')}>
              {selectedRecord.city || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.restaurantCount')}>
              {selectedRecord.restaurantCount || 0}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.status')}>
              <Tag color={selectedRecord.status === 'pending' ? 'gold' : selectedRecord.status === 'approved' ? 'green' : 'red'}>
                {selectedRecord.status === 'pending' ? t('pages.platform.accountApprovals.status.pending') :
                  selectedRecord.status === 'approved' ? t('pages.platform.accountApprovals.status.approved') :
                  t('pages.platform.accountApprovals.status.rejected')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.createdAt')}>
              {selectedRecord.createdAt ? dayjs(selectedRecord.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            {selectedRecord.approvedAt && (
              <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.approvedAt')}>
                {dayjs(selectedRecord.approvedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {selectedRecord.rejectedAt && (
              <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.rejectedAt')}>
                {dayjs(selectedRecord.rejectedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {selectedRecord.rejectedReason && (
              <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.rejectedReason')} span={2}>
                {selectedRecord.rejectedReason}
              </Descriptions.Item>
            )}
            {selectedRecord.note && (
              <Descriptions.Item label={t('pages.platform.accountApprovals.detail.fields.note')} span={2}>
                {selectedRecord.note}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 拒绝模态框 */}
      <Modal
        title={t('pages.platform.accountApprovals.modal.reject.title')}
        open={!!rejectingId}
        onCancel={() => {
          setRejectingId(null)
          setRejectReason('')
        }}
        onOk={handleReject}
        confirmLoading={loading}
      >
        <Input.TextArea
          rows={4}
          placeholder={t('pages.platform.accountApprovals.modal.reject.placeholder')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </Card>
  )
}

export default AccountApprovals


