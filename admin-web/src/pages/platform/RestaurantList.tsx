import { platformAPI, tenantAPI } from '@/services/cloudbase'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'

const { RangePicker } = DatePicker

interface Restaurant {
  id: string
  name: string
  owner: string
  phone: string
  email: string
  address: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  certificationLevel?: 'bronze' | 'silver' | 'gold' | 'platinum'
  tenantId: string
  createdAt: string
  totalOrders: number
  totalRevenue: number
  carbonReduction: number
}

const RestaurantList: React.FC = () => {
  const { t } = useTranslation()
  const [dataSource, setDataSource] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<Restaurant | null>(null)
  const [form] = Form.useForm()
  
  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [certificationFilter, setCertificationFilter] = useState<string>('')
  const [tenantFilter, setTenantFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: string }>>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  useEffect(() => {
    fetchTenantOptions()
  }, [])

  useEffect(() => {
    fetchRestaurants()
  }, [pagination.current, pagination.pageSize, statusFilter, certificationFilter, tenantFilter, searchKeyword])

  const fetchTenantOptions = async () => {
    try {
      const result = await tenantAPI.getAllTenants()
      console.log('获取租户列表结果:', result)
      if (result && result.code === 0 && result.data) {
        const options = result.data.map((tenant: any) => ({
          label: tenant.name || tenant._id,
          value: tenant._id,
        }))
        console.log('租户选项:', options)
        setTenantOptions(options)
      } else {
        console.warn('获取租户列表失败或为空:', result)
        setTenantOptions([])
      }
    } catch (error) {
      console.error('获取租户列表失败:', error)
      setTenantOptions([])
    }
  }

  const fetchRestaurants = async () => {
    setLoading(true)
    try {
      const queryParams = {
        keyword: searchKeyword || undefined,
        status: statusFilter || undefined,
        certificationLevel: certificationFilter || undefined,
        tenantId: tenantFilter || undefined,
        page: pagination.current,
        pageSize: pagination.pageSize,
      }
      console.log('查询餐厅列表参数:', queryParams)
      const result = await platformAPI.restaurant.list(queryParams)
      console.log('查询餐厅列表结果:', result)

      if (result && result.code === 0 && result.data) {
        let { list, total } = result.data
        
        // 前端日期范围筛选
        if (dateRange && list) {
          list = list.filter((item: Restaurant) => {
            if (!item.createdAt) return false
            const itemDate = dayjs(item.createdAt)
            return itemDate.isAfter(dateRange[0].startOf('day')) && itemDate.isBefore(dateRange[1].endOf('day'))
          })
          total = list.length
        }
        
        setDataSource(list || [])
        setPagination({
          ...pagination,
          total: total || 0,
        })
      } else {
        setDataSource([])
        message.error(result?.message || t('pages.platform.restaurantList.messages.loadFailed'))
      }
    } catch (error: any) {
      console.error('获取餐厅列表失败:', error)
      message.error(error.message || t('pages.platform.restaurantList.messages.loadFailed'))
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<Restaurant> = [
    {
      title: t('pages.platform.restaurantList.table.columns.name'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: t('pages.platform.restaurantList.table.columns.owner'),
      dataIndex: 'owner',
      key: 'owner',
      width: 100,
    },
    {
      title: t('pages.platform.restaurantList.table.columns.phone'),
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: t('pages.platform.restaurantList.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: t('pages.platform.restaurantList.status.active') },
          inactive: { color: 'default', text: t('pages.platform.restaurantList.status.inactive') },
          pending: { color: 'processing', text: t('pages.platform.restaurantList.status.pending') },
          suspended: { color: 'error', text: t('pages.platform.restaurantList.status.suspended') },
        }
        const cfg = config[status] || config.inactive
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.platform.restaurantList.table.columns.certificationLevel'),
      dataIndex: 'certificationLevel',
      key: 'certificationLevel',
      width: 120,
      render: (level?: string) => {
        if (!level) return <Tag>{t('pages.platform.restaurantList.certificationLevels.notCertified')}</Tag>
        const config: Record<string, { color: string; text: string }> = {
          bronze: { color: 'default', text: t('pages.platform.restaurantList.certificationLevels.bronze') },
          silver: { color: 'default', text: t('pages.platform.restaurantList.certificationLevels.silver') },
          gold: { color: 'gold', text: t('pages.platform.restaurantList.certificationLevels.gold') },
          platinum: { color: 'purple', text: t('pages.platform.restaurantList.certificationLevels.platinum') },
        }
        const cfg = config[level] || config.bronze
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.platform.restaurantList.table.columns.totalOrders'),
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 100,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: t('pages.platform.restaurantList.table.columns.totalRevenue'),
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 120,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: t('pages.platform.restaurantList.table.columns.carbonReduction'),
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: t('pages.platform.restaurantList.table.columns.actions'),
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            {t('pages.platform.restaurantList.buttons.detail')}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common.edit')}
          </Button>
          {record.status === 'active' ? (
            <Button
              type="link"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleSuspend(record.id)}
            >
              {t('pages.platform.restaurantList.buttons.suspend')}
            </Button>
          ) : (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(record.id)}
            >
              {t('pages.platform.restaurantList.buttons.activate')}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const handleViewDetail = (record: Restaurant) => {
    setSelectedRecord(record)
    setIsDetailModalVisible(true)
  }

  const handleEdit = (record: Restaurant) => {
    form.setFieldsValue(record)
    setSelectedRecord(record)
    setIsModalVisible(true)
  }

  const handleSuspend = (id: string) => {
    Modal.confirm({
      title: t('pages.platform.restaurantList.modal.suspend.title'),
      content: t('pages.platform.restaurantList.modal.suspend.content'),
      onOk: async () => {
        try {
          const result = await platformAPI.restaurant.suspend(id)
          if (result && result.code === 0) {
          message.success(t('pages.platform.restaurantList.messages.suspended'))
            fetchRestaurants() // 重新获取列表
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        } catch (error: any) {
          console.error('暂停餐厅失败:', error)
          message.error(error.message || t('common.operationFailed'))
        }
      },
    })
  }

  const handleActivate = (id: string) => {
    Modal.confirm({
      title: t('pages.platform.restaurantList.modal.activate.title'),
      content: t('pages.platform.restaurantList.modal.activate.content'),
      onOk: async () => {
        try {
          const result = await platformAPI.restaurant.activate(id)
          if (result && result.code === 0) {
          message.success(t('pages.platform.restaurantList.messages.activated'))
            fetchRestaurants() // 重新获取列表
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        } catch (error: any) {
          console.error('激活餐厅失败:', error)
          message.error(error.message || t('common.operationFailed'))
        }
      },
    })
  }

  const handleAdd = () => {
    form.resetFields()
    setSelectedRecord(null)
    setIsModalVisible(true)
  }

  const handleBatchActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('pages.platform.restaurantList.messages.selectRestaurants'))
      return
    }

    Modal.confirm({
      title: t('pages.platform.restaurantList.modal.batchActivate.title'),
      content: t('pages.platform.restaurantList.modal.batchActivate.content', { count: selectedRowKeys.length }),
      onOk: async () => {
        setLoading(true)
        try {
          const promises = selectedRowKeys.map((id) => platformAPI.restaurant.activate(id as string))
          const results = await Promise.all(promises)
          const successCount = results.filter((r) => r && r.code === 0).length
          if (successCount === selectedRowKeys.length) {
            message.success(t('pages.platform.restaurantList.messages.batchActivated', { count: successCount }))
            setSelectedRowKeys([])
            fetchRestaurants()
          } else {
            message.warning(t('pages.platform.restaurantList.messages.batchActivatePartial', { success: successCount, total: selectedRowKeys.length }))
            fetchRestaurants()
          }
        } catch (error: any) {
          console.error('批量激活失败:', error)
          message.error(error.message || t('common.operationFailed'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleBatchSuspend = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('pages.platform.restaurantList.messages.selectRestaurants'))
      return
    }

    Modal.confirm({
      title: t('pages.platform.restaurantList.modal.batchSuspend.title'),
      content: t('pages.platform.restaurantList.modal.batchSuspend.content', { count: selectedRowKeys.length }),
      onOk: async () => {
        setLoading(true)
        try {
          const promises = selectedRowKeys.map((id) => platformAPI.restaurant.suspend(id as string))
          const results = await Promise.all(promises)
          const successCount = results.filter((r) => r && r.code === 0).length
          if (successCount === selectedRowKeys.length) {
            message.success(t('pages.platform.restaurantList.messages.batchSuspended', { count: successCount }))
            setSelectedRowKeys([])
            fetchRestaurants()
          } else {
            message.warning(t('pages.platform.restaurantList.messages.batchSuspendPartial', { success: successCount, total: selectedRowKeys.length }))
            fetchRestaurants()
          }
        } catch (error: any) {
          console.error('批量暂停失败:', error)
          message.error(error.message || t('common.operationFailed'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleExport = () => {
    try {
      const exportData = dataSource.map((item, index) => [
        index + 1,
        item.name,
        item.owner,
        item.phone,
        item.email,
        item.address,
        item.status === 'active' ? t('pages.platform.restaurantList.status.active') :
          item.status === 'pending' ? t('pages.platform.restaurantList.status.pending') :
          item.status === 'suspended' ? t('pages.platform.restaurantList.status.suspended') :
          t('pages.platform.restaurantList.status.inactive'),
        item.certificationLevel ? t(`pages.platform.restaurantList.certificationLevels.${item.certificationLevel}`) : t('pages.platform.restaurantList.certificationLevels.notCertified'),
        item.tenantId,
        item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
        item.totalOrders,
        `¥${item.totalRevenue}`,
        `${item.carbonReduction} kg`,
      ])

      const ws = XLSX.utils.aoa_to_sheet([
        [
          t('pages.platform.restaurantList.export.columns.no'),
          t('pages.platform.restaurantList.table.columns.name'),
          t('pages.platform.restaurantList.table.columns.owner'),
          t('pages.platform.restaurantList.table.columns.phone'),
          t('pages.platform.restaurantList.table.columns.email'),
          t('pages.platform.restaurantList.table.columns.address'),
          t('pages.platform.restaurantList.table.columns.status'),
          t('pages.platform.restaurantList.table.columns.certificationLevel'),
          t('pages.platform.restaurantList.table.columns.tenantId'),
          t('pages.platform.restaurantList.export.columns.createdAt'),
          t('pages.platform.restaurantList.table.columns.totalOrders'),
          t('pages.platform.restaurantList.table.columns.totalRevenue'),
          t('pages.platform.restaurantList.table.columns.carbonReduction'),
        ],
        ...exportData,
      ])

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t('pages.platform.restaurantList.export.sheetName'))

      const fileName = `${t('pages.platform.restaurantList.export.fileName')}_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      message.success(t('common.exportSuccess'))
    } catch (error: any) {
      console.error('导出失败:', error)
      message.error(error.message || t('common.exportFailed'))
    }
  }

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    fetchRestaurants()
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys)
    },
  }

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      try {
        if (selectedRecord) {
          const result = await platformAPI.restaurant.update(selectedRecord.id, values)
          if (result && (result.success || result.code === 0)) {
          message.success(t('common.updateSuccess'))
            setIsModalVisible(false)
            fetchRestaurants() // 重新获取列表
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        } else {
          const result = await platformAPI.restaurant.create(values)
          if (result && (result.success || result.code === 0)) {
          message.success(t('common.createSuccess'))
        setIsModalVisible(false)
            fetchRestaurants() // 重新获取列表
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        }
      } catch (error: any) {
        console.error('提交失败:', error)
        message.error(error.message || t('common.operationFailed'))
      }
    })
  }

  return (
    <div>
      <Card
        title={t('pages.platform.restaurantList.title')}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchRestaurants} loading={loading}>
              {t('common.refresh')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={dataSource.length === 0}>
              {t('common.export')}
            </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('pages.platform.restaurantList.buttons.add')}
          </Button>
          </Space>
        }
      >
        {/* 筛选条件 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder={t('pages.platform.restaurantList.filters.search')}
            style={{ width: 300 }}
            allowClear
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
          />
          <Select
            placeholder={t('pages.platform.restaurantList.filters.status')}
            style={{ width: 150 }}
            allowClear
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value || '')
              setPagination({ ...pagination, current: 1 })
            }}
          >
            <Select.Option value="active">{t('pages.platform.restaurantList.status.active')}</Select.Option>
            <Select.Option value="inactive">{t('pages.platform.restaurantList.status.inactive')}</Select.Option>
            <Select.Option value="pending">{t('pages.platform.restaurantList.status.pending')}</Select.Option>
            <Select.Option value="suspended">{t('pages.platform.restaurantList.status.suspended')}</Select.Option>
          </Select>
          <Select
            placeholder={t('pages.platform.restaurantList.filters.certificationLevel')}
            style={{ width: 150 }}
            allowClear
            value={certificationFilter}
            onChange={(value) => {
              setCertificationFilter(value || '')
              setPagination({ ...pagination, current: 1 })
            }}
          >
            <Select.Option value="bronze">{t('pages.platform.restaurantList.certificationLevels.bronze')}</Select.Option>
            <Select.Option value="silver">{t('pages.platform.restaurantList.certificationLevels.silver')}</Select.Option>
            <Select.Option value="gold">{t('pages.platform.restaurantList.certificationLevels.gold')}</Select.Option>
            <Select.Option value="platinum">{t('pages.platform.restaurantList.certificationLevels.platinum')}</Select.Option>
          </Select>
          <Select
            placeholder={t('pages.platform.restaurantList.filters.tenant')}
            style={{ width: 200 }}
            allowClear
            value={tenantFilter}
            onChange={(value) => {
              setTenantFilter(value || '')
              setPagination({ ...pagination, current: 1 })
            }}
            options={tenantOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="YYYY-MM-DD"
            placeholder={[t('pages.platform.restaurantList.filters.startDate'), t('pages.platform.restaurantList.filters.endDate')]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
            {t('common.search')}
          </Button>
        </Space>

        {/* 批量操作按钮 */}
        {selectedRowKeys.length > 0 && (
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleBatchActivate}
              disabled={loading}
            >
              {t('pages.platform.restaurantList.buttons.batchActivate', { count: selectedRowKeys.length })}
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleBatchSuspend}
              disabled={loading}
            >
              {t('pages.platform.restaurantList.buttons.batchSuspend', { count: selectedRowKeys.length })}
            </Button>
            <span style={{ color: '#666', fontSize: 12 }}>
              {t('pages.platform.restaurantList.messages.selectedCount', { count: selectedRowKeys.length })}
            </span>
          </Space>
        )}

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          rowSelection={rowSelection}
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
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={t('pages.platform.restaurantList.modal.detail.title')}
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
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.name')}>{selectedRecord.name}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.owner')}>{selectedRecord.owner}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.phone')}>{selectedRecord.phone}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.email')}>{selectedRecord.email}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.address')} span={2}>
              {selectedRecord.address}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.status')}>
              <Tag
                color={
                  selectedRecord.status === 'active'
                    ? 'success'
                    : selectedRecord.status === 'pending'
                    ? 'processing'
                    : selectedRecord.status === 'suspended'
                    ? 'error'
                    : 'default'
                }
              >
                {selectedRecord.status === 'active'
                  ? t('pages.platform.restaurantList.status.active')
                  : selectedRecord.status === 'pending'
                  ? t('pages.platform.restaurantList.status.pending')
                  : selectedRecord.status === 'suspended'
                  ? t('pages.platform.restaurantList.status.suspended')
                  : t('pages.platform.restaurantList.status.inactive')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.certificationLevel')}>
              {selectedRecord.certificationLevel ? (
                <Tag color="gold">{selectedRecord.certificationLevel}</Tag>
              ) : (
                <Tag>{t('pages.platform.restaurantList.certificationLevels.notCertified')}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.tenantId')}>{selectedRecord.tenantId}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.createdAt')}>{selectedRecord.createdAt}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.totalOrders')}>{selectedRecord.totalOrders.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.totalRevenue')}>
              ¥{selectedRecord.totalRevenue.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.restaurantList.detail.fields.carbonReduction')}>
              {selectedRecord.carbonReduction.toLocaleString()} kg CO₂e
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 编辑/创建模态框 */}
      <Modal
        title={selectedRecord ? t('pages.platform.restaurantList.modal.edit.title') : t('pages.platform.restaurantList.modal.add.title')}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('pages.platform.restaurantList.form.fields.name')} rules={[{ required: true, message: t('pages.platform.restaurantList.form.messages.nameRequired') }]}>
            <Input placeholder={t('pages.platform.restaurantList.form.placeholders.name')} />
          </Form.Item>
          <Form.Item name="owner" label={t('pages.platform.restaurantList.form.fields.owner')} rules={[{ required: true, message: t('pages.platform.restaurantList.form.messages.ownerRequired') }]}>
            <Input placeholder={t('pages.platform.restaurantList.form.placeholders.owner')} />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t('pages.platform.restaurantList.form.fields.phone')}
            rules={[
              { required: true, message: t('pages.platform.restaurantList.form.messages.phoneRequired') },
              { pattern: /^1[3-9]\d{9}$/, message: t('pages.platform.restaurantList.form.messages.phoneInvalid') },
            ]}
          >
            <Input placeholder={t('pages.platform.restaurantList.form.placeholders.phone')} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('pages.platform.restaurantList.form.fields.email')}
            rules={[
              { required: true, message: t('pages.platform.restaurantList.form.messages.emailRequired') },
              { type: 'email', message: t('pages.platform.restaurantList.form.messages.emailInvalid') },
            ]}
          >
            <Input placeholder={t('pages.platform.restaurantList.form.placeholders.email')} />
          </Form.Item>
          <Form.Item name="address" label={t('pages.platform.restaurantList.form.fields.address')} rules={[{ required: true, message: t('pages.platform.restaurantList.form.messages.addressRequired') }]}>
            <Input.TextArea rows={2} placeholder={t('pages.platform.restaurantList.form.placeholders.address')} />
          </Form.Item>
          <Form.Item name="status" label={t('pages.platform.restaurantList.form.fields.status')}>
            <Select placeholder={t('pages.platform.restaurantList.form.placeholders.status')}>
              <Select.Option value="active">{t('pages.platform.restaurantList.status.active')}</Select.Option>
              <Select.Option value="inactive">{t('pages.platform.restaurantList.status.inactive')}</Select.Option>
              <Select.Option value="pending">{t('pages.platform.restaurantList.status.pending')}</Select.Option>
              <Select.Option value="suspended">{t('pages.platform.restaurantList.status.suspended')}</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RestaurantList

