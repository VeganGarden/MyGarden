/**
 * 供应商管理页面
 */

import React, { useEffect, useState } from 'react'
import { Button, Card, Input, Select, Table, Space, Tag, message, Modal } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, AuditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { supplierAPI } from '@/services/traceability'
import type { Supplier, SupplierQueryParams } from '@/types/traceability'
import { SupplierType, SupplierAuditStatus, RiskLevel } from '@/types/traceability'

const { Search } = Input

const SupplierPage: React.FC = () => {
  const navigate = useNavigate()
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
    tenantId: 'default' // 实际应从用户信息获取
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
        message.error(result.error || '加载失败')
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
      message.error(error.message || '网络错误')
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

  useEffect(() => {
    loadData()
  }, [queryParams])

  // 删除确认
  const handleDelete = (supplier: Supplier) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除供应商"${supplier.name}"吗？`,
      onOk: async () => {
        const result = await supplierAPI.delete(supplier.supplierId, supplier.tenantId)
        if (result.success) {
          message.success('删除成功')
          loadData()
        } else {
          message.error(result.error || '删除失败')
        }
      }
    })
  }

  // 表格列定义
  const columns = [
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '供应商ID',
      dataIndex: 'supplierId',
      key: 'supplierId',
      width: 180
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: SupplierType) => {
        const typeMap: Record<SupplierType, string> = {
          [SupplierType.FARM]: '农场',
          [SupplierType.PROCESSOR]: '加工商',
          [SupplierType.DISTRIBUTOR]: '分销商',
          [SupplierType.OTHER]: '其他'
        }
        return typeMap[type] || type
      }
    },
    {
      title: '风险等级',
      dataIndex: ['businessInfo', 'riskLevel'],
      key: 'riskLevel',
      render: (level: RiskLevel) => {
        const colorMap: Record<RiskLevel, string> = {
          [RiskLevel.LOW]: 'green',
          [RiskLevel.MEDIUM]: 'orange',
          [RiskLevel.HIGH]: 'red'
        }
        const textMap: Record<RiskLevel, string> = {
          [RiskLevel.LOW]: '低风险',
          [RiskLevel.MEDIUM]: '中风险',
          [RiskLevel.HIGH]: '高风险'
        }
        return <Tag color={colorMap[level]}>{textMap[level]}</Tag>
      }
    },
    {
      title: '审核状态',
      dataIndex: ['audit', 'status'],
      key: 'auditStatus',
      render: (status: SupplierAuditStatus) => {
        const colorMap: Record<SupplierAuditStatus, string> = {
          [SupplierAuditStatus.PENDING]: 'orange',
          [SupplierAuditStatus.APPROVED]: 'green',
          [SupplierAuditStatus.REJECTED]: 'red'
        }
        const textMap: Record<SupplierAuditStatus, string> = {
          [SupplierAuditStatus.PENDING]: '待审核',
          [SupplierAuditStatus.APPROVED]: '已通过',
          [SupplierAuditStatus.REJECTED]: '已拒绝'
        }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Supplier) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/traceability/suppliers/${record.supplierId}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/traceability/suppliers/${record.supplierId}/edit`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <Card title="供应商管理" extra={
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate('/traceability/suppliers/add')}
      >
        添加供应商
      </Button>
    }>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 筛选器 */}
        <Space>
          <Search
            placeholder="搜索供应商名称、注册号"
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setQueryParams({ ...queryParams, keyword: value, page: 1 })
            }}
          />
          <Select
            placeholder="供应商类型"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, type: value, page: 1 })
            }}
          >
            <Select.Option value={SupplierType.FARM}>农场</Select.Option>
            <Select.Option value={SupplierType.PROCESSOR}>加工商</Select.Option>
            <Select.Option value={SupplierType.DISTRIBUTOR}>分销商</Select.Option>
            <Select.Option value={SupplierType.OTHER}>其他</Select.Option>
          </Select>
          <Select
            placeholder="审核状态"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, status: value, page: 1 })
            }}
          >
            <Select.Option value={SupplierAuditStatus.PENDING}>待审核</Select.Option>
            <Select.Option value={SupplierAuditStatus.APPROVED}>已通过</Select.Option>
            <Select.Option value={SupplierAuditStatus.REJECTED}>已拒绝</Select.Option>
          </Select>
          <Select
            placeholder="风险等级"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, riskLevel: value, page: 1 })
            }}
          >
            <Select.Option value={RiskLevel.LOW}>低风险</Select.Option>
            <Select.Option value={RiskLevel.MEDIUM}>中风险</Select.Option>
            <Select.Option value={RiskLevel.HIGH}>高风险</Select.Option>
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
            showTotal: (total) => `共 ${total} 条`,
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
