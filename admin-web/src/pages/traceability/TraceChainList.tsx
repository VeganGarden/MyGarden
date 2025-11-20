/**
 * 溯源链列表页
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input, Select, Table, Space, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { traceChainAPI } from '@/services/traceability'
import type { TraceChain, TraceChainQueryParams } from '@/types/traceability'
import { TraceChainStatus, VerificationStatus } from '@/types/traceability'

const TraceChainListPage: React.FC = () => {
  const { t } = useTranslation()
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
        message.error(result.error || t('pages.traceability.traceChainList.messages.loadFailed'))
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
      message.error(error.message || t('common.networkError'))
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
    [TraceChainStatus.DRAFT]: { text: t('pages.traceability.traceChainList.status.draft'), color: 'default' },
    [TraceChainStatus.ACTIVE]: { text: t('pages.traceability.traceChainList.status.active'), color: 'green' },
    [TraceChainStatus.ARCHIVED]: { text: t('pages.traceability.traceChainList.status.archived'), color: 'gray' },
    [TraceChainStatus.EXPIRED]: { text: t('pages.traceability.traceChainList.status.expired'), color: 'red' }
  }

  const verificationStatusMap: Record<VerificationStatus, { text: string; color: string }> = {
    [VerificationStatus.PENDING]: { text: t('pages.traceability.traceChainList.verificationStatus.pending'), color: 'orange' },
    [VerificationStatus.VERIFIED]: { text: t('pages.traceability.traceChainList.verificationStatus.verified'), color: 'green' },
    [VerificationStatus.REJECTED]: { text: t('pages.traceability.traceChainList.verificationStatus.rejected'), color: 'red' }
  }

  const columns = [
    {
      title: t('pages.traceability.traceChainList.table.columns.traceId'),
      dataIndex: 'traceId',
      key: 'traceId'
    },
    {
      title: t('pages.traceability.traceChainList.table.columns.menuItemName'),
      dataIndex: 'menuItemName',
      key: 'menuItemName'
    },
    {
      title: t('pages.traceability.traceChainList.table.columns.nodeCount'),
      dataIndex: 'nodeCount',
      key: 'nodeCount'
    },
    {
      title: t('pages.traceability.traceChainList.table.columns.trustScore'),
      dataIndex: 'trustScore',
      key: 'trustScore',
      render: (score: number) => {
        const color = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'
        return <Tag color={color}>{score}{t('pages.traceability.traceChainList.table.columns.scoreUnit')}</Tag>
      }
    },
    {
      title: t('pages.traceability.traceChainList.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: TraceChainStatus) => {
        const statusInfo = statusMap[status]
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      }
    },
    {
      title: t('pages.traceability.traceChainList.table.columns.verificationStatus'),
      dataIndex: 'verificationStatus',
      key: 'verificationStatus',
      render: (status: VerificationStatus) => {
        const statusInfo = verificationStatusMap[status]
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      }
    },
    {
      title: t('pages.traceability.traceChainList.table.columns.actions'),
      key: 'action',
      width: 150,
      render: (_: any, record: TraceChain) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/traceability/chains/${record.traceId}`)}
        >
          {t('pages.traceability.traceChainList.buttons.view')}
        </Button>
      )
    }
  ]

  return (
    <Card title={t('pages.traceability.traceChainList.title')} extra={
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate('/traceability/chains/build')}
      >
        {t('pages.traceability.traceChainList.buttons.build')}
      </Button>
    }>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Input
            placeholder={t('pages.traceability.traceChainList.filters.search')}
            style={{ width: 250 }}
            allowClear
            onChange={(e) => {
              setQueryParams({ ...queryParams, keyword: e.target.value, page: 1 })
            }}
            onPressEnter={() => loadData()}
          />
          <Select
            placeholder={t('pages.traceability.traceChainList.filters.status')}
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, status: value, page: 1 })
            }}
          >
            <Select.Option value={TraceChainStatus.DRAFT}>{t('pages.traceability.traceChainList.status.draft')}</Select.Option>
            <Select.Option value={TraceChainStatus.ACTIVE}>{t('pages.traceability.traceChainList.status.active')}</Select.Option>
            <Select.Option value={TraceChainStatus.ARCHIVED}>{t('pages.traceability.traceChainList.status.archived')}</Select.Option>
            <Select.Option value={TraceChainStatus.EXPIRED}>{t('pages.traceability.traceChainList.status.expired')}</Select.Option>
          </Select>
          <Select
            placeholder={t('pages.traceability.traceChainList.filters.verificationStatus')}
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setQueryParams({ ...queryParams, verificationStatus: value, page: 1 })
            }}
          >
            <Select.Option value={VerificationStatus.PENDING}>{t('pages.traceability.traceChainList.verificationStatus.pending')}</Select.Option>
            <Select.Option value={VerificationStatus.VERIFIED}>{t('pages.traceability.traceChainList.verificationStatus.verified')}</Select.Option>
            <Select.Option value={VerificationStatus.REJECTED}>{t('pages.traceability.traceChainList.verificationStatus.rejected')}</Select.Option>
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

export default TraceChainListPage

