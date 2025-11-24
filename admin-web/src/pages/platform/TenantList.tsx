import { platformAPI, systemAPI, tenantAPI } from '@/services/cloudbase'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'

const { RangePicker } = DatePicker

interface Tenant {
  _id: string
  name: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  status: 'active' | 'suspended' | 'inactive'
  createdAt?: string
  updatedAt?: string
  // 统计数据（需要从API获取或计算）
  restaurantCount?: number
  totalOrders?: number
  totalRevenue?: number
  totalUsers?: number
  totalCarbonReduction?: number
  // 关联餐厅列表
  restaurants?: Array<{
    _id: string
    name: string
    status: string
  }>
  // 租户配置
  config?: {
    enableCarbonTracking?: boolean
    enableOrderManagement?: boolean
    enableMenuManagement?: boolean
    maxRestaurants?: number
    maxUsers?: number
  }
}

const TenantList: React.FC = () => {
  const { t } = useTranslation()
  const [dataSource, setDataSource] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<Tenant | null>(null)
  const [form] = Form.useForm()
  const [configForm] = Form.useForm()
  const [detailActiveTab, setDetailActiveTab] = useState<string>('basic')
  const [operationLogs, setOperationLogs] = useState<any[]>([])
  const [operationLogsLoading, setOperationLogsLoading] = useState(false)

  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  useEffect(() => {
    fetchTenants()
  }, [pagination.current, pagination.pageSize, statusFilter, searchKeyword])

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const result = await tenantAPI.getAllTenants()

      if (result && result.code === 0) {
        let tenants = result.data || []

        // 前端筛选
        if (searchKeyword) {
          tenants = tenants.filter((tenant: Tenant) => {
            const keyword = searchKeyword.toLowerCase()
            return (
              tenant.name?.toLowerCase().includes(keyword) ||
              tenant.contactName?.toLowerCase().includes(keyword) ||
              tenant.contactPhone?.includes(keyword) ||
              tenant.contactEmail?.toLowerCase().includes(keyword)
            )
          })
        }

        if (statusFilter) {
          tenants = tenants.filter((tenant: Tenant) => tenant.status === statusFilter)
        }

        if (dateRange) {
          tenants = tenants.filter((tenant: Tenant) => {
            if (!tenant.createdAt) return false
            const tenantDate = dayjs(tenant.createdAt)
            return tenantDate.isAfter(dateRange[0].startOf('day')) && tenantDate.isBefore(dateRange[1].endOf('day'))
          })
        }

        // 为每个租户获取统计数据
        // 使用跨租户数据API批量获取统计数据
        let tenantsWithStats: Tenant[] = []
        
        try {
          // 批量获取所有租户的统计数据
          const crossTenantResult = await platformAPI.crossTenant.getData({
            tenantIds: tenants.map((t: Tenant) => t._id),
            dataType: 'all',
            page: 1,
            pageSize: 1000, // 获取所有数据
          })

          // 创建统计数据映射
          const statsMap = new Map<string, any>()
          if (crossTenantResult && crossTenantResult.code === 0 && crossTenantResult.data) {
            const tenantDataList = crossTenantResult.data.tenants || []
            tenantDataList.forEach((td: any) => {
              statsMap.set(td.tenantId, {
                restaurantCount: td.restaurantCount || 0,
                totalOrders: td.statistics?.orders?.total || 0,
                totalRevenue: td.statistics?.revenue?.total || 0,
                totalUsers: td.statistics?.users?.total || 0,
                totalCarbonReduction: td.statistics?.carbonReduction?.total || 0,
              })
            })
          }

          // 合并统计数据（确保不覆盖租户的基本信息，只合并统计字段）
          tenantsWithStats = tenants.map((tenant: Tenant) => {
            const stats = statsMap.get(tenant._id) || {
              restaurantCount: 0,
              totalOrders: 0,
              totalRevenue: 0,
              totalUsers: 0,
              totalCarbonReduction: 0,
            }
            return {
              ...tenant, // 租户基本信息（包括最新的status）优先
              // 只合并统计字段，不覆盖基本信息
              restaurantCount: stats.restaurantCount,
              totalOrders: stats.totalOrders,
              totalRevenue: stats.totalRevenue,
              totalUsers: stats.totalUsers,
              totalCarbonReduction: stats.totalCarbonReduction,
            }
          })
        } catch (error) {
          // 如果获取统计数据失败，至少获取餐厅数量
          tenantsWithStats = await Promise.all(
            tenants.map(async (tenant: Tenant) => {
              try {
                const detailResult = await tenantAPI.getTenant(tenant._id)
                if (detailResult && detailResult.code === 0 && detailResult.data) {
                  const restaurants = detailResult.data.restaurants || []
                  return {
                    ...tenant,
                    restaurantCount: restaurants.length,
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalUsers: 0,
                    totalCarbonReduction: 0,
                  }
                }
                return {
                  ...tenant,
                  restaurantCount: 0,
                  totalOrders: 0,
                  totalRevenue: 0,
                  totalUsers: 0,
                  totalCarbonReduction: 0,
                }
              } catch (err) {
                return {
                  ...tenant,
                  restaurantCount: 0,
                  totalOrders: 0,
                  totalRevenue: 0,
                  totalUsers: 0,
                  totalCarbonReduction: 0,
                }
              }
            })
          )
        }

        // 分页处理
        const total = tenantsWithStats.length
        const start = (pagination.current - 1) * pagination.pageSize
        const end = start + pagination.pageSize
        const paginatedTenants = tenantsWithStats.slice(start, end)

        setDataSource(paginatedTenants)
        setPagination({
          ...pagination,
          total,
        })
      } else {
        setDataSource([])
        const errorMsg = result?.message || t('pages.platform.tenantList.messages.loadFailed')
        message.error(errorMsg)
      }
    } catch (error: any) {
      message.error(error.message || t('pages.platform.tenantList.messages.loadFailed'))
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<Tenant> = [
    {
      title: t('pages.platform.tenantList.table.columns.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: t('pages.platform.tenantList.table.columns.contactName'),
      dataIndex: 'contactName',
      key: 'contactName',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: t('pages.platform.tenantList.table.columns.contactPhone'),
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 130,
      render: (text: string) => text || '-',
    },
    {
      title: t('pages.platform.tenantList.table.columns.contactEmail'),
      dataIndex: 'contactEmail',
      key: 'contactEmail',
      width: 180,
      render: (text: string) => text || '-',
    },
    {
      title: t('pages.platform.tenantList.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: t('pages.platform.tenantList.status.active') },
          inactive: { color: 'default', text: t('pages.platform.tenantList.status.inactive') },
          suspended: { color: 'error', text: t('pages.platform.tenantList.status.suspended') },
        }
        const cfg = config[status] || config.inactive
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.platform.tenantList.table.columns.restaurantCount'),
      dataIndex: 'restaurantCount',
      key: 'restaurantCount',
      width: 100,
      align: 'right',
      render: (value: number) => value?.toLocaleString() || '0',
    },
    {
      title: t('pages.platform.tenantList.table.columns.totalOrders'),
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 120,
      align: 'right',
      render: (value: number) => value?.toLocaleString() || '0',
    },
    {
      title: t('pages.platform.tenantList.table.columns.totalRevenue'),
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 150,
      align: 'right',
      render: (value: number) => `¥${value?.toLocaleString() || '0'}`,
    },
    {
      title: t('pages.platform.tenantList.table.columns.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: t('pages.platform.tenantList.table.columns.actions'),
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
            {t('common.view')}
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
              onClick={() => handleSuspend(record._id)}
            >
              {t('pages.platform.tenantList.buttons.suspend')}
            </Button>
          ) : (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(record._id)}
            >
              {t('pages.platform.tenantList.buttons.activate')}
            </Button>
          )}
          <Button
            type="link"
            danger
            onClick={() => handleDelete(record._id, record.name)}
          >
            {t('pages.platform.tenantList.buttons.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  const handleViewDetail = async (record: Tenant) => {
    try {
      setLoading(true)
      const result = await tenantAPI.getTenant(record._id)
      if (result && result.code === 0 && result.data) {
        const tenantData = result.data
        
        // 获取统计数据
        try {
          const crossTenantResult = await platformAPI.crossTenant.getData({
            tenantIds: [record._id],
            dataType: 'all',
            page: 1,
            pageSize: 1,
          })
          
          if (crossTenantResult && crossTenantResult.code === 0 && crossTenantResult.data) {
            const tenantStats = crossTenantResult.data.tenants?.[0]
            if (tenantStats) {
              tenantData.totalOrders = tenantStats.statistics?.orders?.total || 0
              tenantData.totalRevenue = tenantStats.statistics?.revenue?.total || 0
              tenantData.totalUsers = tenantStats.statistics?.users?.total || 0
              tenantData.totalCarbonReduction = tenantStats.statistics?.carbonReduction?.total || 0
            }
          }
        } catch (error) {
          // 获取统计数据失败，使用默认值
        }
        
        setSelectedRecord(tenantData)
        setIsDetailModalVisible(true)
        setDetailActiveTab('basic')
        
        // 初始化配置表单
        if (tenantData.config) {
          configForm.setFieldsValue(tenantData.config)
        } else {
          configForm.setFieldsValue({
            enableCarbonTracking: true,
            enableOrderManagement: true,
            enableMenuManagement: true,
            maxRestaurants: 100,
            maxUsers: 1000,
          })
        }
      } else {
        message.error(result?.message || t('common.loadFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (tenantId: string, tenantName: string) => {
    Modal.confirm({
      title: t('pages.platform.tenantList.modal.delete.title'),
      content: t('pages.platform.tenantList.modal.delete.content', { name: tenantName }),
      okText: t('common.confirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setLoading(true)
          const result = await tenantAPI.delete(tenantId)
          if (result && result.code === 0) {
            message.success(t('pages.platform.tenantList.messages.deleted'))
            setIsDetailModalVisible(false)
            fetchTenants()
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        } catch (error: any) {
          message.error(error.message || t('common.operationFailed'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const fetchOperationLogs = async () => {
    if (!selectedRecord?._id) return
    
    setOperationLogsLoading(true)
    try {
      const result = await systemAPI.getAuditLogs({
        tenantId: selectedRecord._id,
        page: 1,
        pageSize: 50,
      })
      if (result && result.code === 0 && result.data) {
        setOperationLogs(result.data.list || [])
      }
    } catch (error) {
      // 获取操作日志失败
    } finally {
      setOperationLogsLoading(false)
    }
  }

  const handleConfigSubmit = () => {
    configForm.validateFields().then(async (values) => {
      try {
        if (!selectedRecord?._id) return
        
        setLoading(true)
        const result = await tenantAPI.updateConfig(selectedRecord._id, values)
        if (result && result.code === 0) {
          message.success(t('pages.platform.tenantList.messages.configUpdated'))
          // 更新本地记录
          if (selectedRecord) {
            setSelectedRecord({
              ...selectedRecord,
              config: values,
            })
          }
        } else {
          message.error(result?.message || t('common.operationFailed'))
        }
      } catch (error: any) {
        message.error(error.message || t('common.operationFailed'))
      } finally {
        setLoading(false)
      }
    })
  }

  const handleEdit = (record: Tenant) => {
    form.setFieldsValue({
      name: record.name,
      contactName: record.contactName,
      contactPhone: record.contactPhone,
      contactEmail: record.contactEmail,
    })
    setSelectedRecord(record)
    setIsModalVisible(true)
  }

  const handleSuspend = (tenantId: string) => {
    Modal.confirm({
      title: t('pages.platform.tenantList.modal.suspend.title'),
      content: t('pages.platform.tenantList.modal.suspend.content'),
      onOk: async () => {
        try {
          setLoading(true)
          const result = await tenantAPI.updateStatus(tenantId, 'suspended')
          if (result && result.code === 0) {
            message.success(t('pages.platform.tenantList.messages.suspended'))
            // 立即更新本地状态
            setDataSource((prev) =>
              prev.map((item) => (item._id === tenantId ? { ...item, status: 'suspended' as const } : item))
            )
            // 然后重新获取数据以确保数据一致性
            await fetchTenants()
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        } catch (error: any) {
          message.error(error.message || t('common.operationFailed'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleActivate = (tenantId: string) => {
    Modal.confirm({
      title: t('pages.platform.tenantList.modal.activate.title'),
      content: t('pages.platform.tenantList.modal.activate.content'),
      onOk: async () => {
        try {
          setLoading(true)
          const result = await tenantAPI.updateStatus(tenantId, 'active')
          if (result && result.code === 0) {
            message.success(t('pages.platform.tenantList.messages.activated'))
            // 立即更新本地状态
            setDataSource((prev) =>
              prev.map((item) => (item._id === tenantId ? { ...item, status: 'active' as const } : item))
            )
            // 然后重新获取数据以确保数据一致性
            await fetchTenants()
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        } catch (error: any) {
          message.error(error.message || t('common.operationFailed'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleBatchActivate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('pages.platform.tenantList.messages.selectTenants'))
      return
    }

    Modal.confirm({
      title: t('pages.platform.tenantList.modal.batchActivate.title'),
      content: t('pages.platform.tenantList.modal.batchActivate.content', { count: selectedRowKeys.length }),
      onOk: async () => {
        setLoading(true)
        try {
          const promises = selectedRowKeys.map((id) =>
            tenantAPI.updateStatus(id as string, 'active')
          )
          const results = await Promise.all(promises)
          const successCount = results.filter((r) => r && r.code === 0).length
          if (successCount === selectedRowKeys.length) {
            message.success(t('pages.platform.tenantList.messages.batchActivated', { count: successCount }))
            // 立即更新本地状态
            setDataSource((prev) =>
              prev.map((item) =>
                selectedRowKeys.includes(item._id) ? { ...item, status: 'active' as const } : item
              )
            )
            setSelectedRowKeys([])
            // 然后重新获取数据以确保数据一致性
            await fetchTenants()
          } else {
            message.warning(
              t('pages.platform.tenantList.messages.batchActivatePartial', {
                success: successCount,
                total: selectedRowKeys.length,
              })
            )
            // 更新成功的项
            const successIds = selectedRowKeys.filter((id, index) => results[index] && results[index].code === 0)
            setDataSource((prev) =>
              prev.map((item) =>
                successIds.includes(item._id) ? { ...item, status: 'active' as const } : item
              )
            )
            await fetchTenants()
          }
        } catch (error: any) {
          message.error(error.message || t('common.operationFailed'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleBatchSuspend = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('pages.platform.tenantList.messages.selectTenants'))
      return
    }

    Modal.confirm({
      title: t('pages.platform.tenantList.modal.batchSuspend.title'),
      content: t('pages.platform.tenantList.modal.batchSuspend.content', { count: selectedRowKeys.length }),
      onOk: async () => {
        setLoading(true)
        try {
          const promises = selectedRowKeys.map((id) =>
            tenantAPI.updateStatus(id as string, 'suspended')
          )
          const results = await Promise.all(promises)
          const successCount = results.filter((r) => r && r.code === 0).length
          if (successCount === selectedRowKeys.length) {
            message.success(t('pages.platform.tenantList.messages.batchSuspended', { count: successCount }))
            // 立即更新本地状态
            setDataSource((prev) =>
              prev.map((item) =>
                selectedRowKeys.includes(item._id) ? { ...item, status: 'suspended' as const } : item
              )
            )
            setSelectedRowKeys([])
            // 然后重新获取数据以确保数据一致性
            await fetchTenants()
          } else {
            message.warning(
              t('pages.platform.tenantList.messages.batchSuspendPartial', {
                success: successCount,
                total: selectedRowKeys.length,
              })
            )
            // 更新成功的项
            const successIds = selectedRowKeys.filter((id, index) => results[index] && results[index].code === 0)
            setDataSource((prev) =>
              prev.map((item) =>
                successIds.includes(item._id) ? { ...item, status: 'suspended' as const } : item
              )
            )
            await fetchTenants()
          }
        } catch (error: any) {
          message.error(error.message || t('common.operationFailed'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleAdd = () => {
    form.resetFields()
    setSelectedRecord(null)
    setIsModalVisible(true)
  }

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      try {
        if (selectedRecord) {
          const result = await tenantAPI.update(selectedRecord._id, values)
          if (result && result.code === 0) {
            message.success(t('common.updateSuccess'))
            setIsModalVisible(false)
            fetchTenants()
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        } else {
          const result = await tenantAPI.create(values)
          if (result && (result.success || result.code === 0)) {
            message.success(t('common.createSuccess'))
            setIsModalVisible(false)
            fetchTenants()
          } else {
            message.error(result?.message || t('common.operationFailed'))
          }
        }
      } catch (error: any) {
        message.error(error.message || t('common.operationFailed'))
      }
    })
  }

  const handleExport = () => {
    try {
      const exportData = dataSource.map((item, index) => [
        index + 1,
        item.name,
        item.contactName || '-',
        item.contactPhone || '-',
        item.contactEmail || '-',
        item.status === 'active'
          ? t('pages.platform.tenantList.status.active')
          : item.status === 'suspended'
          ? t('pages.platform.tenantList.status.suspended')
          : t('pages.platform.tenantList.status.inactive'),
        item.restaurantCount || 0,
        item.totalOrders || 0,
        `¥${item.totalRevenue || 0}`,
        item.totalUsers || 0,
        `${item.totalCarbonReduction || 0} kg`,
        item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
      ])

      const ws = XLSX.utils.aoa_to_sheet([
        [
          t('pages.platform.tenantList.export.columns.no'),
          t('pages.platform.tenantList.table.columns.name'),
          t('pages.platform.tenantList.table.columns.contactName'),
          t('pages.platform.tenantList.table.columns.contactPhone'),
          t('pages.platform.tenantList.table.columns.contactEmail'),
          t('pages.platform.tenantList.table.columns.status'),
          t('pages.platform.tenantList.table.columns.restaurantCount'),
          t('pages.platform.tenantList.table.columns.totalOrders'),
          t('pages.platform.tenantList.table.columns.totalRevenue'),
          t('pages.platform.tenantList.table.columns.totalUsers'),
          t('pages.platform.tenantList.table.columns.totalCarbonReduction'),
          t('pages.platform.tenantList.export.columns.createdAt'),
        ],
        ...exportData,
      ])

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, t('pages.platform.tenantList.export.sheetName'))

      const fileName = `${t('pages.platform.tenantList.export.fileName')}_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      message.success(t('common.exportSuccess'))
    } catch (error: any) {
      message.error(error.message || t('common.exportFailed'))
    }
  }

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    fetchTenants()
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys)
    },
  }

  return (
    <div>
      <Card
        title={t('pages.platform.tenantList.title')}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTenants} loading={loading}>
              {t('common.refresh')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={dataSource.length === 0}>
              {t('common.export')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('pages.platform.tenantList.buttons.add')}
            </Button>
          </Space>
        }
      >
        {/* 筛选条件 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder={t('pages.platform.tenantList.filters.search')}
            style={{ width: 300 }}
            allowClear
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
          />
          <Select
            placeholder={t('pages.platform.tenantList.filters.status')}
            style={{ width: 150 }}
            allowClear
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value || '')
              setPagination({ ...pagination, current: 1 })
            }}
          >
            <Select.Option value="active">{t('pages.platform.tenantList.status.active')}</Select.Option>
            <Select.Option value="inactive">{t('pages.platform.tenantList.status.inactive')}</Select.Option>
            <Select.Option value="suspended">{t('pages.platform.tenantList.status.suspended')}</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="YYYY-MM-DD"
            placeholder={[t('pages.platform.tenantList.filters.startDate'), t('pages.platform.tenantList.filters.endDate')]}
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
              {t('pages.platform.tenantList.buttons.batchActivate', { count: selectedRowKeys.length })}
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleBatchSuspend}
              disabled={loading}
            >
              {t('pages.platform.tenantList.buttons.batchSuspend', { count: selectedRowKeys.length })}
            </Button>
            <span style={{ color: '#666', fontSize: 12 }}>
              {t('pages.platform.tenantList.messages.selectedCount', { count: selectedRowKeys.length })}
            </span>
          </Space>
        )}

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1400 }}
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
        title={t('pages.platform.tenantList.modal.detail.title')}
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false)
          setDetailActiveTab('basic')
          setOperationLogs([])
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsDetailModalVisible(false)
            setDetailActiveTab('basic')
            setOperationLogs([])
          }}>
            {t('common.close')}
          </Button>,
        ]}
        width={1000}
      >
        {selectedRecord && (
          <Tabs
            activeKey={detailActiveTab}
            onChange={(key) => {
              setDetailActiveTab(key)
              if (key === 'logs') {
                fetchOperationLogs()
              }
            }}
          >
            {/* 基本信息标签页 */}
            <Tabs.TabPane tab={t('pages.platform.tenantList.detail.tabs.basic')} key="basic">
              <Descriptions column={2} bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label={t('pages.platform.tenantList.detail.fields.name')} span={2}>
                {selectedRecord.name}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.platform.tenantList.detail.fields.contactName')}>
                {selectedRecord.contactName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.platform.tenantList.detail.fields.contactPhone')}>
                {selectedRecord.contactPhone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.platform.tenantList.detail.fields.contactEmail')} span={2}>
                {selectedRecord.contactEmail || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.platform.tenantList.detail.fields.status')}>
                <Tag
                  color={
                    selectedRecord.status === 'active'
                      ? 'success'
                      : selectedRecord.status === 'suspended'
                      ? 'error'
                      : 'default'
                  }
                >
                  {selectedRecord.status === 'active'
                    ? t('pages.platform.tenantList.status.active')
                    : selectedRecord.status === 'suspended'
                    ? t('pages.platform.tenantList.status.suspended')
                    : t('pages.platform.tenantList.status.inactive')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.platform.tenantList.detail.fields.createdAt')}>
                {selectedRecord.createdAt ? dayjs(selectedRecord.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 统计数据 */}
            <Card title={t('pages.platform.tenantList.detail.statistics.title')} style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title={t('pages.platform.tenantList.detail.statistics.restaurantCount')}
                    value={selectedRecord.restaurantCount || 0}
                    prefix={<ShopOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={t('pages.platform.tenantList.detail.statistics.totalOrders')}
                    value={selectedRecord.totalOrders || 0}
                    prefix={<ShoppingCartOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={t('pages.platform.tenantList.detail.statistics.totalRevenue')}
                    value={selectedRecord.totalRevenue || 0}
                    prefix="¥"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={t('pages.platform.tenantList.detail.statistics.totalUsers')}
                    value={selectedRecord.totalUsers || 0}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* 关联餐厅列表 */}
            {selectedRecord.restaurants && selectedRecord.restaurants.length > 0 && (
              <Card title={t('pages.platform.tenantList.detail.restaurants.title')} style={{ marginTop: 16 }}>
                <Table
                  dataSource={selectedRecord.restaurants}
                  rowKey="_id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: t('pages.platform.tenantList.detail.restaurants.columns.name'),
                      dataIndex: 'name',
                      key: 'name',
                    },
                    {
                      title: t('pages.platform.tenantList.detail.restaurants.columns.status'),
                      dataIndex: 'status',
                      key: 'status',
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
                  ]}
                />
              </Card>
            )}
            </Tabs.TabPane>

            {/* 操作日志标签页 */}
            <Tabs.TabPane tab={t('pages.platform.tenantList.detail.tabs.operationLog')} key="logs">
              <Table
                dataSource={operationLogs}
                rowKey="_id"
                loading={operationLogsLoading}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: t('pages.platform.operationLog.table.columns.time'),
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    width: 180,
                    render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
                  },
                  {
                    title: t('pages.platform.operationLog.table.columns.user'),
                    dataIndex: 'username',
                    key: 'username',
                    width: 120,
                  },
                  {
                    title: t('pages.platform.operationLog.table.columns.action'),
                    dataIndex: 'action',
                    key: 'action',
                    width: 120,
                    render: (action: string) => {
                      const actionMap: Record<string, { color: string; text: string }> = {
                        create: { color: 'success', text: t('pages.platform.operationLog.actions.create') },
                        update: { color: 'processing', text: t('pages.platform.operationLog.actions.update') },
                        delete: { color: 'error', text: t('pages.platform.operationLog.actions.delete') },
                        approve: { color: 'success', text: t('pages.platform.operationLog.actions.approve') },
                        reject: { color: 'error', text: t('pages.platform.operationLog.actions.reject') },
                        suspend: { color: 'warning', text: t('pages.platform.operationLog.actions.suspend') },
                        activate: { color: 'success', text: t('pages.platform.operationLog.actions.activate') },
                      }
                      const cfg = actionMap[action] || { color: 'default', text: action }
                      return <Tag color={cfg.color}>{cfg.text}</Tag>
                    },
                  },
                  {
                    title: t('pages.platform.operationLog.table.columns.description'),
                    dataIndex: 'description',
                    key: 'description',
                    ellipsis: true,
                  },
                  {
                    title: t('pages.platform.operationLog.table.columns.status'),
                    dataIndex: 'status',
                    key: 'status',
                    width: 100,
                    render: (status: string) => {
                      const config: Record<string, { color: string; text: string }> = {
                        success: { color: 'success', text: t('pages.platform.operationLog.status.success') },
                        failed: { color: 'error', text: t('pages.platform.operationLog.status.failed') },
                        pending: { color: 'processing', text: t('pages.platform.operationLog.status.pending') },
                      }
                      const cfg = config[status] || { color: 'default', text: status }
                      return <Tag color={cfg.color}>{cfg.text}</Tag>
                    },
                  },
                ]}
              />
            </Tabs.TabPane>

            {/* 配置管理标签页 */}
            <Tabs.TabPane tab={t('pages.platform.tenantList.detail.tabs.config')} key="config">
              <Form
                form={configForm}
                layout="vertical"
                onFinish={handleConfigSubmit}
              >
                <Form.Item
                  name="enableCarbonTracking"
                  label={t('pages.platform.tenantList.config.fields.enableCarbonTracking')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name="enableOrderManagement"
                  label={t('pages.platform.tenantList.config.fields.enableOrderManagement')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name="enableMenuManagement"
                  label={t('pages.platform.tenantList.config.fields.enableMenuManagement')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name="maxRestaurants"
                  label={t('pages.platform.tenantList.config.fields.maxRestaurants')}
                  rules={[{ required: true, message: t('pages.platform.tenantList.config.messages.maxRestaurantsRequired') }]}
                >
                  <Input type="number" min={0} />
                </Form.Item>
                <Form.Item
                  name="maxUsers"
                  label={t('pages.platform.tenantList.config.fields.maxUsers')}
                  rules={[{ required: true, message: t('pages.platform.tenantList.config.messages.maxUsersRequired') }]}
                >
                  <Input type="number" min={0} />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      {t('common.save')}
                    </Button>
                    <Button onClick={() => configForm.resetFields()}>
                      {t('common.reset')}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Tabs.TabPane>
          </Tabs>
        )}
      </Modal>

      {/* 编辑/创建模态框 */}
      <Modal
        title={selectedRecord ? t('pages.platform.tenantList.modal.edit.title') : t('pages.platform.tenantList.modal.add.title')}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t('pages.platform.tenantList.form.fields.name')}
            rules={[{ required: true, message: t('pages.platform.tenantList.form.messages.nameRequired') }]}
          >
            <Input placeholder={t('pages.platform.tenantList.form.placeholders.name')} />
          </Form.Item>
          <Form.Item name="contactName" label={t('pages.platform.tenantList.form.fields.contactName')}>
            <Input placeholder={t('pages.platform.tenantList.form.placeholders.contactName')} />
          </Form.Item>
          <Form.Item
            name="contactPhone"
            label={t('pages.platform.tenantList.form.fields.contactPhone')}
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: t('pages.platform.tenantList.form.messages.phoneInvalid') },
            ]}
          >
            <Input placeholder={t('pages.platform.tenantList.form.placeholders.contactPhone')} />
          </Form.Item>
          <Form.Item
            name="contactEmail"
            label={t('pages.platform.tenantList.form.fields.contactEmail')}
            rules={[{ type: 'email', message: t('pages.platform.tenantList.form.messages.emailInvalid') }]}
          >
            <Input placeholder={t('pages.platform.tenantList.form.placeholders.contactEmail')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TenantList

