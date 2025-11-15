/**
 * 溯源证书列表页
 */

import React, { useEffect, useState } from 'react'
import { Button, Card, Table, Space, Tag, message } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { traceCertificateAPI } from '@/services/traceability'
import dayjs from 'dayjs'

interface Certificate {
  certificateId: string
  certificateNumber: string
  traceId: string
  menuItemName: string
  status: string
  createdAt: string
}

const CertificateListPage: React.FC = () => {
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
          message.error(result.error || '加载失败')
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
      message.error(error.message || '网络错误')
      setCertificates([])
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '证书编号',
      dataIndex: 'certificateNumber',
      key: 'certificateNumber'
    },
    {
      title: '菜品名称',
      dataIndex: 'menuItemName',
      key: 'menuItemName'
    },
    {
      title: '溯源链ID',
      dataIndex: 'traceId',
      key: 'traceId'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          expired: 'orange',
          revoked: 'red'
        }
        return <Tag color={colorMap[status]}>{status === 'active' ? '有效' : status === 'expired' ? '已过期' : '已撤销'}</Tag>
      }
    },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Certificate) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/traceability/certificates/${record.certificateId}`)}
        >
          查看
        </Button>
      )
    }
  ]

  return (
    <Card title="溯源证书">
      <Table
        columns={columns}
        dataSource={certificates}
        loading={loading}
        rowKey="certificateId"
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, page, pageSize })
          }
        }}
      />
    </Card>
  )
}

export default CertificateListPage

