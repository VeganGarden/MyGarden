/**
 * 溯源证书列表页
 */

import { traceCertificateAPI } from '@/services/traceability'
import { EyeOutlined } from '@ant-design/icons'
import { Button, Card, Table, Tag, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface Certificate {
  certificateId: string
  certificateNumber: string
  traceId: string
  menuItemName: string
  status: string
  createdAt: string
}

const CertificateListPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    loadData()
  }, [pagination.page, pagination.pageSize])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await traceCertificateAPI.list({
        tenantId: 'default',
        page: pagination.page,
        pageSize: pagination.pageSize
      })
      if (result.success) {
        setCertificates(result.data || [])
        setPagination(result.pagination || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      } else {
        // 只有在真正失败时才显示错误（排除空数据的情况）
        const isEmpty = result.data && result.data.length === 0 && (!result.pagination || result.pagination.total === 0)
        if (!isEmpty && result.error) {
          message.error(result.error || t('pages.traceability.certificateList.messages.loadFailed'))
        }
        setCertificates([])
        setPagination({
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      }
    } catch (error: any) {
      console.error('加载证书数据失败:', error)
      message.error(error.message || t('common.networkError'))
      setCertificates([])
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: t('pages.traceability.certificateList.table.columns.certificateNumber'),
      dataIndex: 'certificateNumber',
      key: 'certificateNumber'
    },
    {
      title: t('pages.traceability.certificateList.table.columns.menuItemName'),
      dataIndex: 'menuItemName',
      key: 'menuItemName'
    },
    {
      title: t('pages.traceability.certificateList.table.columns.traceId'),
      dataIndex: 'traceId',
      key: 'traceId'
    },
    {
      title: t('pages.traceability.certificateList.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          expired: 'orange',
          revoked: 'red'
        }
        const textMap: Record<string, string> = {
          active: t('pages.traceability.certificateList.status.active'),
          expired: t('pages.traceability.certificateList.status.expired'),
          revoked: t('pages.traceability.certificateList.status.revoked')
        }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      }
    },
    {
      title: t('pages.traceability.certificateList.table.columns.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: t('pages.traceability.certificateList.table.columns.actions'),
      key: 'action',
      width: 100,
      render: (_: any, record: Certificate) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/traceability/certificates/${record.certificateId}`)}
        >
          {t('pages.traceability.certificateList.buttons.view')}
        </Button>
      )
    }
  ]

  return (
    <Card title={t('pages.traceability.certificateList.title')}>
      <Table
        columns={columns}
        dataSource={certificates}
        loading={loading}
        rowKey="certificateId"
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, page, pageSize })
          }
        }}
      />
    </Card>
  )
}

export default CertificateListPage

