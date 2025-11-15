/**
 * 供应商详情页
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, Tabs, Table, message } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { supplierAPI } from '@/services/traceability'
import type { Supplier } from '@/types/traceability'
import { SupplierType, SupplierAuditStatus, RiskLevel, CooperationStatus } from '@/types/traceability'

const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [supplier, setSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await supplierAPI.get(id, 'default') // 实际应从用户信息获取tenantId
      if (result.success && result.data) {
        setSupplier(result.data)
      } else {
        message.error(result.error || '加载失败')
        navigate('/traceability/suppliers')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  if (!supplier) {
    return <div>加载中...</div>
  }

  const typeMap: Record<SupplierType, string> = {
    [SupplierType.FARM]: '农场',
    [SupplierType.PROCESSOR]: '加工商',
    [SupplierType.DISTRIBUTOR]: '分销商',
    [SupplierType.OTHER]: '其他'
  }

  const auditStatusMap: Record<SupplierAuditStatus, { text: string; color: string }> = {
    [SupplierAuditStatus.PENDING]: { text: '待审核', color: 'orange' },
    [SupplierAuditStatus.APPROVED]: { text: '已通过', color: 'green' },
    [SupplierAuditStatus.REJECTED]: { text: '已拒绝', color: 'red' }
  }

  const riskLevelMap: Record<RiskLevel, { text: string; color: string }> = {
    [RiskLevel.LOW]: { text: '低风险', color: 'green' },
    [RiskLevel.MEDIUM]: { text: '中风险', color: 'orange' },
    [RiskLevel.HIGH]: { text: '高风险', color: 'red' }
  }

  const cooperationStatusMap: Record<CooperationStatus, { text: string; color: string }> = {
    [CooperationStatus.PENDING]: { text: '待合作', color: 'default' },
    [CooperationStatus.ACTIVE]: { text: '合作中', color: 'green' },
    [CooperationStatus.SUSPENDED]: { text: '已暂停', color: 'orange' },
    [CooperationStatus.TERMINATED]: { text: '已终止', color: 'red' }
  }

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="供应商ID">{supplier.supplierId}</Descriptions.Item>
          <Descriptions.Item label="供应商名称">{supplier.name}</Descriptions.Item>
          <Descriptions.Item label="供应商类型">{typeMap[supplier.type]}</Descriptions.Item>
          <Descriptions.Item label="法人名称">{supplier.legalName || '-'}</Descriptions.Item>
          <Descriptions.Item label="注册号">{supplier.registrationNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="风险等级">
            <Tag color={riskLevelMap[supplier.businessInfo.riskLevel].color}>
              {riskLevelMap[supplier.businessInfo.riskLevel].text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="审核状态">
            <Tag color={auditStatusMap[supplier.audit.status].color}>
              {auditStatusMap[supplier.audit.status].text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="合作状态">
            <Tag color={cooperationStatusMap[supplier.cooperation.status].color}>
              {cooperationStatusMap[supplier.cooperation.status].text}
            </Tag>
          </Descriptions.Item>
          {supplier.contact?.phone && (
            <Descriptions.Item label="联系电话">{supplier.contact.phone}</Descriptions.Item>
          )}
          {supplier.contact?.email && (
            <Descriptions.Item label="邮箱">{supplier.contact.email}</Descriptions.Item>
          )}
          {supplier.contact?.address && (
            <Descriptions.Item label="地址" span={2}>
              {[
                supplier.contact.address.province,
                supplier.contact.address.city,
                supplier.contact.address.district,
                supplier.contact.address.detail
              ].filter(Boolean).join(' ')}
            </Descriptions.Item>
          )}
        </Descriptions>
      )
    },
    {
      key: 'certifications',
      label: '认证信息',
      children: (
        <Table
          columns={[
            { title: '认证类型', dataIndex: 'type' },
            { title: '认证名称', dataIndex: 'name' },
            { title: '证书编号', dataIndex: 'certificateNumber' },
            { title: '发证机构', dataIndex: 'issuer' },
            { title: '发证日期', dataIndex: 'issueDate', render: (date) => date ? new Date(date).toLocaleDateString() : '-' },
            { title: '到期日期', dataIndex: 'expiryDate', render: (date) => date ? new Date(date).toLocaleDateString() : '-' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (status: string) => {
                const colorMap: Record<string, string> = {
                  valid: 'green',
                  expired: 'orange',
                  revoked: 'red'
                }
                return <Tag color={colorMap[status]}>{status === 'valid' ? '有效' : status === 'expired' ? '已过期' : '已撤销'}</Tag>
              }
            }
          ]}
          dataSource={supplier.certifications || []}
          rowKey="certificateNumber"
          pagination={false}
        />
      )
    },
    {
      key: 'cooperation',
      label: '合作记录',
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="合作开始日期">
            {supplier.cooperation.startDate ? new Date(supplier.cooperation.startDate).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="最后订单日期">
            {supplier.cooperation.lastOrderDate ? new Date(supplier.cooperation.lastOrderDate).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="总订单数">{supplier.cooperation.totalOrders}</Descriptions.Item>
          <Descriptions.Item label="总交易金额">{supplier.cooperation.totalAmount.toFixed(2)} 元</Descriptions.Item>
        </Descriptions>
      )
    },
    {
      key: 'audit',
      label: '审核历史',
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="提交时间">
            {new Date(supplier.audit.submittedAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="审核时间">
            {supplier.audit.reviewedAt ? new Date(supplier.audit.reviewedAt).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="审核人">{supplier.audit.reviewedBy || '-'}</Descriptions.Item>
          <Descriptions.Item label="版本">{supplier.audit.version}</Descriptions.Item>
          {supplier.audit.reviewComments && (
            <Descriptions.Item label="审核意见" span={2}>{supplier.audit.reviewComments}</Descriptions.Item>
          )}
        </Descriptions>
      )
    }
  ]

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/suppliers')}>
            返回
          </Button>
          <span>供应商详情</span>
        </Space>
      }
      extra={
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/traceability/suppliers/${id}/edit`)}>
          编辑
        </Button>
      }
      loading={loading}
    >
      <Tabs items={tabItems} />
    </Card>
  )
}

export default SupplierDetailPage

