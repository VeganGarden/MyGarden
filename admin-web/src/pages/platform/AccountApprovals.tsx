import { onboardingAPI } from '@/services/cloudbase'
import { Button, Card, Input, Modal, Space, Table, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Application = {
  _id: string
  desiredUsername?: string
  organizationName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  city?: string
  restaurantCount?: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt?: string
}

const AccountApprovals: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Application[]>([])
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await onboardingAPI.listApplications({ status: 'pending' })
      if (res.code === 0) {
        setData(res.data?.list || res.data || [])
      } else {
        message.error(res.message || t('common.loadFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleApprove = async (id: string) => {
    setLoading(true)
    try {
      const res = await onboardingAPI.approve(id, { createAccount: true })
      if (res.code === 0) {
        message.success(t('pages.platform.accountApprovals.messages.approved'))
        load()
      } else {
        message.error(res.message || t('common.operationFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    setLoading(true)
    try {
      const res = await onboardingAPI.reject(rejectingId, rejectReason)
      if (res.code === 0) {
        message.success(t('pages.platform.accountApprovals.messages.rejected'))
        setRejectingId(null)
        setRejectReason('')
        load()
      } else {
        message.error(res.message || t('common.operationFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('common.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title={t('pages.platform.accountApprovals.title')} bordered={false}>
      <Table<Application>
        rowKey="_id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: t('pages.platform.accountApprovals.table.columns.organizationName'), dataIndex: 'organizationName' },
          { title: t('pages.platform.accountApprovals.table.columns.desiredUsername'), dataIndex: 'desiredUsername' },
          { title: t('pages.platform.accountApprovals.table.columns.contactName'), dataIndex: 'contactName' },
          { title: t('pages.platform.accountApprovals.table.columns.contactPhone'), dataIndex: 'contactPhone' },
          { title: t('pages.platform.accountApprovals.table.columns.contactEmail'), dataIndex: 'contactEmail' },
          { title: t('pages.platform.accountApprovals.table.columns.city'), dataIndex: 'city' },
          { title: t('pages.platform.accountApprovals.table.columns.restaurantCount'), dataIndex: 'restaurantCount', width: 100 },
          {
            title: t('pages.platform.accountApprovals.table.columns.status'),
            dataIndex: 'status',
            width: 120,
            render: (v: Application['status']) => {
              const color = v === 'pending' ? 'gold' : v === 'approved' ? 'green' : 'red'
              const text = v === 'pending' ? t('pages.platform.accountApprovals.status.pending') : v === 'approved' ? t('pages.platform.accountApprovals.status.approved') : t('pages.platform.accountApprovals.status.rejected')
              return <Tag color={color}>{text}</Tag>
            },
          },
          {
            title: t('pages.platform.accountApprovals.table.columns.actions'),
            width: 240,
            render: (_, record) => (
              <Space>
                <Button type="primary" onClick={() => handleApprove(record._id)}>
                  {t('pages.platform.accountApprovals.buttons.approve')}
                </Button>
                <Button danger onClick={() => setRejectingId(record._id)}>
                  {t('pages.platform.accountApprovals.buttons.reject')}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={t('pages.platform.accountApprovals.modal.reject.title')}
        open={!!rejectingId}
        onCancel={() => setRejectingId(null)}
        onOk={handleReject}
        confirmLoading={loading}
      >
        <Input.TextArea
          rows={4}
          placeholder={t('pages.platform.accountApprovals.modal.reject.placeholder')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </Card>
  )
}

export default AccountApprovals


