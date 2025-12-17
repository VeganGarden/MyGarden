/**
 * 供应商管理页面
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input, Select, Table, Space, Tag, message, Modal } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, AuditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { supplierAPI } from '@/services/traceability'
import type { Supplier, SupplierQueryParams } from '@/types/traceability'
import { SupplierType, SupplierAuditStatus, RiskLevel } from '@/types/traceability'

const { Search } = Input

const SupplierPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  // 从Redux store获取当前选中的餐厅ID（Header中的RestaurantSwitcher控制）
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const { user } = useAppSelector((state: any) => state.auth)
  
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [queryParams, setQueryParams] = useState<SupplierQueryParams>({
    page: 1,
    pageSize: 20,
    tenantId: currentTenant?.id || user?.tenantId || 'default',
    restaurantId: currentRestaurantId || undefined // 从Header的RestaurantSwitcher获取
  })

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const result = await supplierAPI.list(queryParams)
      if (result.success) {
        setSuppliers(result.data || [])
        setPagination(result.pagination || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      } else {
        message.error(result.error || t('pages.traceability.supplier.messages.loadFailed'))
        setSuppliers([])
        setPagination({
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      }
    } catch (error: any) {
      console.error('加载供应商数据失败:', error)
      message.error(error.message || t('common.networkError'))
      setSuppliers([])
      setPagination({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // 当queryParams变化时，重新加载数据
  useEffect(() => {
    loadData()
  }, [queryParams])

  // 当Header中的餐厅切换时，更新queryParams并重新加载
  useEffect(() => {
    setQueryParams(prev => ({
      ...prev,
      restaurantId: currentRestaurantId || undefined,
      page: 1 // 切换餐厅时重置到第一页
    }))
  }, [currentRestaurantId])

  // 删除确认
  const handleDelete = (supplier: Supplier) => {
    Modal.confirm({
      title: t('pages.traceability.supplier.messages.deleteConfirm'),
      content: t('pages.traceability.supplier.messages.deleteMessage', { name: supplier.name }),
      onOk: async () => {
        const result = await supplierAPI.delete(supplier.supplierId, supplier.tenantId)
        if (result.success) {
          message.success(t('pages.traceability.supplier.messages.deleteSuccess'))
          loadData()
        } else {
          message.error(result.error || t('pages.traceability.supplier.messages.deleteFailed'))
        }
      }
    })
  }

  // 表格列定义
  const columns = [
    {
      title: t('pages.traceability.supplier.table.columns.name'),
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: t('pages.traceability.supplier.table.columns.supplierId'),
      dataIndex: 'supplierId',
      key: 'supplierId',
      width: 180
    },
    {
      title: t('pages.traceability.supplier.table.columns.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: SupplierType) => {
        const typeMap: Record<SupplierType, string> = {
          [SupplierType.FARM]: t('pages.traceability.supplier.types.farm'),
          [SupplierType.PROCESSOR]: t('pages.traceability.supplier.types.processor'),
          [SupplierType.DISTRIBUTOR]: t('pages.traceability.supplier.types.distributor'),
          [SupplierType.OTHER]: t('pages.traceability.supplier.types.other')
        }
        return typeMap[type] || type
      }
    },
    {
      title: t('pages.traceability.supplier.table.columns.riskLevel'),
      dataIndex: ['businessInfo', 'riskLevel'],
      key: 'riskLevel',
      render: (level: RiskLevel) => {
        const colorMap: Record<RiskLevel, string> = {
          [RiskLevel.LOW]: 'green',
          [RiskLevel.MEDIUM]: 'orange',
          [RiskLevel.HIGH]: 'red'
        }
        const textMap: Record<RiskLevel, string> = {
          [RiskLevel.LOW]: t('pages.traceability.supplier.riskLevels.low'),
          [RiskLevel.MEDIUM]: t('pages.traceability.supplier.riskLevels.medium'),
          [RiskLevel.HIGH]: t('pages.traceability.supplier.riskLevels.high')
        }
        return <Tag color={colorMap[level]}>{textMap[level]}</Tag>
      }
    },
    {
      title: t('pages.traceability.supplier.table.columns.auditStatus'),
      dataIndex: ['audit', 'status'],
      key: 'auditStatus',
      render: (status: SupplierAuditStatus) => {
        const colorMap: Record<SupplierAuditStatus, string> = {
          [SupplierAuditStatus.PENDING]: 'orange',
          [SupplierAuditStatus.APPROVED]: 'green',
          [SupplierAuditStatus.REJECTED]: 'red'
        }
        const textMap: Record<SupplierAuditStatus, string> = {
          [SupplierAuditStatus.PENDING]: t('pages.traceability.supplier.auditStatus.pending'),
          [SupplierAuditStatus.APPROVED]: t('pages.traceability.supplier.auditStatus.approved'),
          [SupplierAuditStatus.REJECTED]: t('pages.traceability.supplier.auditStatus.rejected')
        }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      }
    },
    {
      title: t('pages.traceability.supplier.table.columns.actions'),
      key: 'action',
      width: 200,
      render: (_: any, record: Supplier) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/traceability/suppliers/${record.supplierId}`)}
          >
            {t('pages.traceability.supplier.buttons.view')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/traceability/suppliers/${record.supplierId}/edit`)}
          >
            {t('pages.traceability.supplier.buttons.edit')}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            {t('pages.traceability.supplier.buttons.delete')}
          </Button>
        </Space>
      )
    }
  ]

  return (
    <Card title={t('pages.traceability.supplier.title')} extra={
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate('/traceability/suppliers/add')}
      >
        {t('pages.traceability.supplier.buttons.add')}
      </Button>
    }>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 筛选器 */}
        <Space>
          <Search
            placeholder={t('pages.traceability.supplier.filters.search')}
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setQueryParams({ ...queryParams, keyword: value, page: 1 })
            }}
          />
          <Select
            placeholder={t('pages.traceability.supplier.filters.type')}
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, type: value, page: 1 })
            }}
          >
            <Select.Option value={SupplierType.FARM}>{t('pages.traceability.supplier.types.farm')}</Select.Option>
            <Select.Option value={SupplierType.PROCESSOR}>{t('pages.traceability.supplier.types.processor')}</Select.Option>
            <Select.Option value={SupplierType.DISTRIBUTOR}>{t('pages.traceability.supplier.types.distributor')}</Select.Option>
            <Select.Option value={SupplierType.OTHER}>{t('pages.traceability.supplier.types.other')}</Select.Option>
          </Select>
          <Select
            placeholder={t('pages.traceability.supplier.filters.auditStatus')}
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, status: value, page: 1 })
            }}
          >
            <Select.Option value={SupplierAuditStatus.PENDING}>{t('pages.traceability.supplier.auditStatus.pending')}</Select.Option>
            <Select.Option value={SupplierAuditStatus.APPROVED}>{t('pages.traceability.supplier.auditStatus.approved')}</Select.Option>
            <Select.Option value={SupplierAuditStatus.REJECTED}>{t('pages.traceability.supplier.auditStatus.rejected')}</Select.Option>
          </Select>
          <Select
            placeholder={t('pages.traceability.supplier.filters.riskLevel')}
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, riskLevel: value, page: 1 })
            }}
          >
            <Select.Option value={RiskLevel.LOW}>{t('pages.traceability.supplier.riskLevels.low')}</Select.Option>
            <Select.Option value={RiskLevel.MEDIUM}>{t('pages.traceability.supplier.riskLevels.medium')}</Select.Option>
            <Select.Option value={RiskLevel.HIGH}>{t('pages.traceability.supplier.riskLevels.high')}</Select.Option>
          </Select>
        </Space>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={suppliers}
          loading={loading}
          rowKey="_id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
            onChange: (page, pageSize) => {
              setQueryParams({ ...queryParams, page, pageSize })
            }
          }}
        />
      </Space>
    </Card>
  )
}

export default SupplierPage
