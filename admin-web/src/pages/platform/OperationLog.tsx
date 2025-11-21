import { systemAPI, tenantAPI } from '@/services/cloudbase'
import {
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
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

interface AuditLog {
  _id: string
  userId?: string
  username: string
  role?: string
  action: string
  resource: string
  module: string
  description: string
  status: 'success' | 'failed' | 'pending'
  tenantId?: string
  ip?: string
  userAgent?: string
  createdAt: string
  // 扩展字段（如果有）
  details?: any
  targetId?: string
  targetName?: string
  oldValue?: any
  newValue?: any
}

const OperationLog: React.FC = () => {
  const { t } = useTranslation()
  const [dataSource, setDataSource] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AuditLog | null>(null)

  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [moduleFilter, setModuleFilter] = useState<string>('')
  const [tenantFilter, setTenantFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: string }>>([])

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })

  useEffect(() => {
    fetchTenantOptions()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [pagination.current, pagination.pageSize, actionFilter, statusFilter, moduleFilter, tenantFilter, dateRange, searchKeyword])

  const fetchTenantOptions = async () => {
    try {
      const result = await tenantAPI.getAllTenants()
      if (result && result.code === 0 && result.data) {
        setTenantOptions(
          result.data.map((tenant: any) => ({
            label: tenant.name || tenant._id,
            value: tenant._id,
          }))
        )
      }
    } catch (error) {
      setTenantOptions([])
    }
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = {
        keyword: searchKeyword || undefined,
        action: actionFilter || undefined,
        status: statusFilter || undefined,
        module: moduleFilter || undefined,
        tenantId: tenantFilter || undefined,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        page: pagination.current,
        pageSize: pagination.pageSize,
      }

      const result = await systemAPI.getAuditLogs(params)

      if (result && result.code === 0 && result.data) {
        setDataSource(result.data.list || [])
        setPagination({
          ...pagination,
          total: result.data.total || 0,
        })
      } else {
        setDataSource([])
        message.error(result?.message || t('pages.platform.operationLog.messages.loadFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('pages.platform.operationLog.messages.loadFailed'))
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (record: AuditLog) => {
    setSelectedRecord(record)
    setIsDetailModalVisible(true)
  }

  const columns: ColumnsType<AuditLog> = [
    {
      title: t('pages.platform.operationLog.table.columns.time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
      sorter: true,
    },
    {
      title: t('pages.platform.operationLog.table.columns.user'),
      dataIndex: 'username',
      key: 'username',
      width: 220,
      ellipsis: true,
      render: (text: string, record: AuditLog) => (
        <Space wrap>
          <span>{text || '-'}</span>
          {record.role && (
            <Tag color={record.role === 'system_admin' ? 'red' : record.role === 'platform_operator' ? 'blue' : 'default'}>
              {record.role === 'system_admin'
                ? t('pages.platform.operationLog.roles.systemAdmin')
                : record.role === 'platform_operator'
                ? t('pages.platform.operationLog.roles.platformOperator')
                : record.role}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('pages.platform.operationLog.table.columns.module'),
      dataIndex: 'module',
      key: 'module',
      width: 200,
      ellipsis: true,
      render: (module: string) => {
        const moduleMap: Record<string, string> = {
          system: t('pages.platform.operationLog.modules.system'),
          platform: t('pages.platform.operationLog.modules.platform'),
          tenant: t('pages.platform.operationLog.modules.tenant'),
          restaurant: t('pages.platform.operationLog.modules.restaurant'),
          onboarding: t('pages.platform.operationLog.modules.onboarding'),
          user: t('pages.platform.operationLog.modules.user'),
          carbon: t('pages.platform.operationLog.modules.carbon'),
          recipe: t('pages.platform.operationLog.modules.recipe'),
          order: t('pages.platform.operationLog.modules.order'),
          traceability: t('pages.platform.operationLog.modules.traceability'),
          message: t('pages.platform.operationLog.modules.message'),
        }
        return moduleMap[module] || module
      },
    },
    {
      title: t('pages.platform.operationLog.table.columns.action'),
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const actionMap: Record<string, { color: string; text: string }> = {
          login: { color: 'success', text: t('pages.platform.operationLog.actions.login') },
          logout: { color: 'default', text: t('pages.platform.operationLog.actions.logout') },
          create: { color: 'success', text: t('pages.platform.operationLog.actions.create') },
          update: { color: 'processing', text: t('pages.platform.operationLog.actions.update') },
          delete: { color: 'error', text: t('pages.platform.operationLog.actions.delete') },
          approve: { color: 'success', text: t('pages.platform.operationLog.actions.approve') },
          reject: { color: 'error', text: t('pages.platform.operationLog.actions.reject') },
          suspend: { color: 'warning', text: t('pages.platform.operationLog.actions.suspend') },
          activate: { color: 'success', text: t('pages.platform.operationLog.actions.activate') },
          export: { color: 'processing', text: t('pages.platform.operationLog.actions.export') },
          view: { color: 'default', text: t('pages.platform.operationLog.actions.view') },
          deploy: { color: 'processing', text: t('pages.platform.operationLog.actions.deploy') },
          migrate: { color: 'processing', text: t('pages.platform.operationLog.actions.migrate') },
          calculate: { color: 'processing', text: t('pages.platform.operationLog.actions.calculate') },
          import: { color: 'processing', text: t('pages.platform.operationLog.actions.import') },
          reset: { color: 'warning', text: t('pages.platform.operationLog.actions.reset') },
        }
        const cfg = actionMap[action] || { color: 'default', text: action }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.platform.operationLog.table.columns.resource'),
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
      render: (resource: string) => {
        const resourceMap: Record<string, string> = {
          user: t('pages.platform.operationLog.resources.user'),
          tenant: t('pages.platform.operationLog.resources.tenant'),
          restaurant: t('pages.platform.operationLog.resources.restaurant'),
          application: t('pages.platform.operationLog.resources.application'),
          auditLog: t('pages.platform.operationLog.resources.auditLog'),
          systemConfig: t('pages.platform.operationLog.resources.systemConfig'),
          menuItem: t('pages.platform.operationLog.resources.menuItem'),
          order: t('pages.platform.operationLog.resources.order'),
          coupon: t('pages.platform.operationLog.resources.coupon'),
          baseline: t('pages.platform.operationLog.resources.baseline'),
          ingredientLot: t('pages.platform.operationLog.resources.ingredientLot'),
          supplier: t('pages.platform.operationLog.resources.supplier'),
          traceChain: t('pages.platform.operationLog.resources.traceChain'),
        }
        return resourceMap[resource] || resource
      },
    },
    {
      title: t('pages.platform.operationLog.table.columns.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
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
    {
      title: t('pages.platform.operationLog.table.columns.actions'),
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          {t('common.view')}
        </Button>
      ),
    },
  ]

  const handleExport = async () => {
    try {
      setLoading(true)
      message.loading(t('pages.platform.operationLog.messages.exportInProgress'), 0)

      const result = await systemAPI.getAuditLogs({
        keyword: searchKeyword || undefined,
        action: actionFilter || undefined,
        status: statusFilter || undefined,
        module: moduleFilter || undefined,
        tenantId: tenantFilter || undefined,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        page: 1,
        pageSize: 9999, // 获取所有数据
      })

      if (result && result.code === 0 && result.data) {
        const exportData = result.data.list.map((item: AuditLog, index: number) => [
          index + 1,
          item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
          item.username || '-',
          item.role || '-',
          item.module || '-',
          item.action || '-',
          item.resource || '-',
          item.description || '-',
          item.status === 'success'
            ? t('pages.platform.operationLog.status.success')
            : item.status === 'failed'
            ? t('pages.platform.operationLog.status.failed')
            : item.status || '-',
          item.tenantId || '-',
          item.ip || '-',
        ])

        const ws = XLSX.utils.aoa_to_sheet([
          [
            t('pages.platform.operationLog.export.columns.no'),
            t('pages.platform.operationLog.table.columns.time'),
            t('pages.platform.operationLog.table.columns.user'),
            t('pages.platform.operationLog.table.columns.role'),
            t('pages.platform.operationLog.table.columns.module'),
            t('pages.platform.operationLog.table.columns.action'),
            t('pages.platform.operationLog.table.columns.resource'),
            t('pages.platform.operationLog.table.columns.description'),
            t('pages.platform.operationLog.table.columns.status'),
            t('pages.platform.operationLog.export.columns.tenantId'),
            t('pages.platform.operationLog.export.columns.ip'),
          ],
          ...exportData,
        ])

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, t('pages.platform.operationLog.title'))

        const fileName = `${t('pages.platform.operationLog.export.fileName')}_${dayjs().format('YYYY-MM-DD')}.xlsx`
        XLSX.writeFile(wb, fileName)

        message.destroy()
        message.success(t('common.exportSuccess'))
      } else {
        message.destroy()
        message.error(result?.message || t('common.exportFailed'))
      }
    } catch (error: any) {
      message.destroy()
      message.error(error.message || t('common.exportFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    fetchLogs()
  }

  return (
    <div>
      <Card
        title={t('pages.platform.operationLog.title')}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
              {t('common.refresh')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={dataSource.length === 0}>
              {t('common.export')}
            </Button>
          </Space>
        }
      >
        {/* 筛选条件 */}
        <div style={{ marginBottom: 16, padding: '16px', background: '#fafafa', borderRadius: '6px' }}>
          <Space wrap size="middle" style={{ width: '100%' }}>
            <Input.Search
              placeholder={t('pages.platform.operationLog.filters.search')}
              style={{ width: 280 }}
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={handleSearch}
            />
            <Select
              placeholder={t('pages.platform.operationLog.filters.action')}
              style={{ width: 140 }}
              allowClear
              value={actionFilter}
              onChange={(value) => {
                setActionFilter(value || '')
                setPagination({ ...pagination, current: 1 })
              }}
            >
              <Select.Option value="create">{t('pages.platform.operationLog.actions.create')}</Select.Option>
              <Select.Option value="update">{t('pages.platform.operationLog.actions.update')}</Select.Option>
              <Select.Option value="delete">{t('pages.platform.operationLog.actions.delete')}</Select.Option>
              <Select.Option value="approve">{t('pages.platform.operationLog.actions.approve')}</Select.Option>
              <Select.Option value="reject">{t('pages.platform.operationLog.actions.reject')}</Select.Option>
              <Select.Option value="suspend">{t('pages.platform.operationLog.actions.suspend')}</Select.Option>
              <Select.Option value="activate">{t('pages.platform.operationLog.actions.activate')}</Select.Option>
              <Select.Option value="login">{t('pages.platform.operationLog.actions.login')}</Select.Option>
              <Select.Option value="logout">{t('pages.platform.operationLog.actions.logout')}</Select.Option>
              <Select.Option value="export">{t('pages.platform.operationLog.actions.export')}</Select.Option>
              <Select.Option value="view">{t('pages.platform.operationLog.actions.view')}</Select.Option>
            </Select>
            <Select
              placeholder={t('pages.platform.operationLog.filters.status')}
              style={{ width: 120 }}
              allowClear
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value || '')
                setPagination({ ...pagination, current: 1 })
              }}
            >
              <Select.Option value="success">{t('pages.platform.operationLog.status.success')}</Select.Option>
              <Select.Option value="failed">{t('pages.platform.operationLog.status.failed')}</Select.Option>
              <Select.Option value="pending">{t('pages.platform.operationLog.status.pending')}</Select.Option>
            </Select>
            <Select
              placeholder={t('pages.platform.operationLog.filters.module')}
              style={{ width: 140 }}
              allowClear
              value={moduleFilter}
              onChange={(value) => {
                setModuleFilter(value || '')
                setPagination({ ...pagination, current: 1 })
              }}
            >
              <Select.Option value="system">{t('pages.platform.operationLog.modules.system')}</Select.Option>
              <Select.Option value="platform">{t('pages.platform.operationLog.modules.platform')}</Select.Option>
              <Select.Option value="tenant">{t('pages.platform.operationLog.modules.tenant')}</Select.Option>
              <Select.Option value="restaurant">{t('pages.platform.operationLog.modules.restaurant')}</Select.Option>
              <Select.Option value="onboarding">{t('pages.platform.operationLog.modules.onboarding')}</Select.Option>
              <Select.Option value="user">{t('pages.platform.operationLog.modules.user')}</Select.Option>
              <Select.Option value="carbon">{t('pages.platform.operationLog.modules.carbon')}</Select.Option>
              <Select.Option value="recipe">{t('pages.platform.operationLog.modules.recipe')}</Select.Option>
              <Select.Option value="order">{t('pages.platform.operationLog.modules.order')}</Select.Option>
              <Select.Option value="traceability">{t('pages.platform.operationLog.modules.traceability')}</Select.Option>
              <Select.Option value="message">{t('pages.platform.operationLog.modules.message')}</Select.Option>
            </Select>
            <Select
              placeholder={t('pages.platform.operationLog.filters.tenant')}
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
              style={{ width: 240 }}
              placeholder={[t('pages.platform.operationLog.filters.startDate'), t('pages.platform.operationLog.filters.endDate')]}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
              {t('common.search')}
            </Button>
            <Button
              onClick={() => {
                setSearchKeyword('')
                setActionFilter('')
                setStatusFilter('')
                setModuleFilter('')
                setTenantFilter('')
                setDateRange(null)
                setPagination({ ...pagination, current: 1 })
              }}
            >
              {t('common.reset')}
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `共 ${total} 条`,
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
        title={t('pages.platform.operationLog.modal.detail.title')}
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            {t('common.close')}
          </Button>,
        ]}
        width={900}
      >
        {selectedRecord && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.time')} span={2}>
              {selectedRecord.createdAt ? dayjs(selectedRecord.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.user')}>
              {selectedRecord.username || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.role')}>
              {selectedRecord.role ? (
                <Tag color={selectedRecord.role === 'system_admin' ? 'red' : selectedRecord.role === 'platform_operator' ? 'blue' : 'default'}>
                  {selectedRecord.role === 'system_admin'
                    ? t('pages.platform.operationLog.roles.systemAdmin')
                    : selectedRecord.role === 'platform_operator'
                    ? t('pages.platform.operationLog.roles.platformOperator')
                    : selectedRecord.role}
                </Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.module')}>
              {selectedRecord.module ? (() => {
                const moduleMap: Record<string, string> = {
                  system: t('pages.platform.operationLog.modules.system'),
                  platform: t('pages.platform.operationLog.modules.platform'),
                  tenant: t('pages.platform.operationLog.modules.tenant'),
                  restaurant: t('pages.platform.operationLog.modules.restaurant'),
                  onboarding: t('pages.platform.operationLog.modules.onboarding'),
                  user: t('pages.platform.operationLog.modules.user'),
                  carbon: t('pages.platform.operationLog.modules.carbon'),
                  recipe: t('pages.platform.operationLog.modules.recipe'),
                  order: t('pages.platform.operationLog.modules.order'),
                  traceability: t('pages.platform.operationLog.modules.traceability'),
                  message: t('pages.platform.operationLog.modules.message'),
                }
                return moduleMap[selectedRecord.module] || selectedRecord.module
              })() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.action')}>
              {selectedRecord.action ? (() => {
                const actionMap: Record<string, { color: string; text: string }> = {
                  create: { color: 'success', text: t('pages.platform.operationLog.actions.create') },
                  update: { color: 'processing', text: t('pages.platform.operationLog.actions.update') },
                  delete: { color: 'error', text: t('pages.platform.operationLog.actions.delete') },
                  approve: { color: 'success', text: t('pages.platform.operationLog.actions.approve') },
                  reject: { color: 'error', text: t('pages.platform.operationLog.actions.reject') },
                  suspend: { color: 'warning', text: t('pages.platform.operationLog.actions.suspend') },
                  activate: { color: 'success', text: t('pages.platform.operationLog.actions.activate') },
                  login: { color: 'success', text: t('pages.platform.operationLog.actions.login') },
                  logout: { color: 'default', text: t('pages.platform.operationLog.actions.logout') },
                  export: { color: 'processing', text: t('pages.platform.operationLog.actions.export') },
                  view: { color: 'default', text: t('pages.platform.operationLog.actions.view') },
                  deploy: { color: 'processing', text: t('pages.platform.operationLog.actions.deploy') },
                  migrate: { color: 'processing', text: t('pages.platform.operationLog.actions.migrate') },
                  calculate: { color: 'processing', text: t('pages.platform.operationLog.actions.calculate') },
                  import: { color: 'processing', text: t('pages.platform.operationLog.actions.import') },
                  reset: { color: 'warning', text: t('pages.platform.operationLog.actions.reset') },
                }
                const cfg = actionMap[selectedRecord.action] || { color: 'default', text: selectedRecord.action }
                return <Tag color={cfg.color}>{cfg.text}</Tag>
              })() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.resource')}>
              {selectedRecord.resource ? (() => {
                const resourceMap: Record<string, string> = {
                  user: t('pages.platform.operationLog.resources.user'),
                  tenant: t('pages.platform.operationLog.resources.tenant'),
                  restaurant: t('pages.platform.operationLog.resources.restaurant'),
                  application: t('pages.platform.operationLog.resources.application'),
                  auditLog: t('pages.platform.operationLog.resources.auditLog'),
                  systemConfig: t('pages.platform.operationLog.resources.systemConfig'),
                  menuItem: t('pages.platform.operationLog.resources.menuItem'),
                  order: t('pages.platform.operationLog.resources.order'),
                  coupon: t('pages.platform.operationLog.resources.coupon'),
                  baseline: t('pages.platform.operationLog.resources.baseline'),
                  ingredientLot: t('pages.platform.operationLog.resources.ingredientLot'),
                  supplier: t('pages.platform.operationLog.resources.supplier'),
                  traceChain: t('pages.platform.operationLog.resources.traceChain'),
                }
                return resourceMap[selectedRecord.resource] || selectedRecord.resource
              })() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.status')} span={2}>
              <Tag
                color={
                  selectedRecord.status === 'success'
                    ? 'success'
                    : selectedRecord.status === 'failed'
                    ? 'error'
                    : 'processing'
                }
              >
                {selectedRecord.status === 'success'
                  ? t('pages.platform.operationLog.status.success')
                  : selectedRecord.status === 'failed'
                  ? t('pages.platform.operationLog.status.failed')
                  : t('pages.platform.operationLog.status.pending')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.description')} span={2}>
              {selectedRecord.description || '-'}
            </Descriptions.Item>
            {selectedRecord.tenantId && (
              <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.tenantId')}>
                {selectedRecord.tenantId}
              </Descriptions.Item>
            )}
            {selectedRecord.ip && (
              <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.ip')}>
                {selectedRecord.ip}
              </Descriptions.Item>
            )}
            {selectedRecord.userAgent && (
              <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.userAgent')} span={2}>
                {selectedRecord.userAgent}
              </Descriptions.Item>
            )}
            {selectedRecord.details && (
              <Descriptions.Item label={t('pages.platform.operationLog.detail.fields.details')} span={2}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(selectedRecord.details, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default OperationLog

