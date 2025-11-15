/**
 * 溯源链列表页
 */

import React, { useEffect, useState } from 'react'
import { Button, Card, Input, Select, Table, Space, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { traceChainAPI } from '@/services/traceability'
import type { TraceChain, TraceChainQueryParams } from '@/types/traceability'
import { TraceChainStatus, VerificationStatus } from '@/types/traceability'

const TraceChainListPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [chains, setChains] = useState<TraceChain[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [queryParams, setQueryParams] = useState<TraceChainQueryParams>({
    page: 1,
    pageSize: 20,
    tenantId: 'default'
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await traceChainAPI.list(queryParams)
      if (result.success) {
        setChains(result.data || [])
        setPagination(result.pagination || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      } else {
        message.error(result.error || '加载失败')
        setChains([])
        setPagination({
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      }
    } catch (error: any) {
      console.error('加载溯源链数据失败:', error)
      message.error(error.message || '网络错误')
      setChains([])
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

  const statusMap: Record<TraceChainStatus, { text: string; color: string }> = {
    [TraceChainStatus.DRAFT]: { text: '草稿', color: 'default' },
    [TraceChainStatus.ACTIVE]: { text: '活跃', color: 'green' },
    [TraceChainStatus.ARCHIVED]: { text: '已归档', color: 'gray' },
    [TraceChainStatus.EXPIRED]: { text: '已过期', color: 'red' }
  }

  const verificationStatusMap: Record<VerificationStatus, { text: string; color: string }> = {
    [VerificationStatus.PENDING]: { text: '待验证', color: 'orange' },
    [VerificationStatus.VERIFIED]: { text: '已验证', color: 'green' },
    [VerificationStatus.REJECTED]: { text: '已拒绝', color: 'red' }
  }

  const columns = [
    {
      title: '溯源链ID',
      dataIndex: 'traceId',
      key: 'traceId'
    },
    {
      title: '菜品名称',
      dataIndex: 'menuItemName',
      key: 'menuItemName'
    },
    {
      title: '节点数量',
      dataIndex: 'nodeCount',
      key: 'nodeCount'
    },
    {
      title: '信任度评分',
      dataIndex: 'trustScore',
      key: 'trustScore',
      render: (score: number) => {
        const color = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'
        return <Tag color={color}>{score}分</Tag>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: TraceChainStatus) => {
        const statusInfo = statusMap[status]
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      }
    },
    {
      title: '验证状态',
      dataIndex: 'verificationStatus',
      key: 'verificationStatus',
      render: (status: VerificationStatus) => {
        const statusInfo = verificationStatusMap[status]
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: TraceChain) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/traceability/chains/${record.traceId}`)}
        >
          查看
        </Button>
      )
    }
  ]

  return (
    <Card title="溯源链管理" extra={
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate('/traceability/chains/build')}
      >
        构建溯源链
      </Button>
    }>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Input
            placeholder="搜索菜品名称或溯源链ID"
            style={{ width: 250 }}
            allowClear
            onChange={(e) => {
              setQueryParams({ ...queryParams, keyword: e.target.value, page: 1 })
            }}
            onPressEnter={() => loadData()}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, status: value, page: 1 })
            }}
          >
            <Select.Option value={TraceChainStatus.DRAFT}>草稿</Select.Option>
            <Select.Option value={TraceChainStatus.ACTIVE}>活跃</Select.Option>
            <Select.Option value={TraceChainStatus.ARCHIVED}>已归档</Select.Option>
            <Select.Option value={TraceChainStatus.EXPIRED}>已过期</Select.Option>
          </Select>
          <Select
            placeholder="验证状态"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, verificationStatus: value, page: 1 })
            }}
          >
            <Select.Option value={VerificationStatus.PENDING}>待验证</Select.Option>
            <Select.Option value={VerificationStatus.VERIFIED}>已验证</Select.Option>
            <Select.Option value={VerificationStatus.REJECTED}>已拒绝</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={chains}
          loading={loading}
          rowKey="traceId"
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

export default TraceChainListPage

