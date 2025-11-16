import { onboardingAPI } from '@/services/cloudbase'
import { Button, Card, Input, Modal, Space, Table, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'

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
        message.error(res.message || '加载失败')
      }
    } catch (e: any) {
      message.error(e.message || '加载失败')
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
        message.success('已审批通过')
        load()
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e: any) {
      message.error(e.message || '操作失败')
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
        message.success('已驳回')
        setRejectingId(null)
        setRejectReason('')
        load()
      } else {
        message.error(res.message || '操作失败')
      }
    } catch (e: any) {
      message.error(e.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="入驻申请审批" bordered={false}>
      <Table<Application>
        rowKey="_id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '机构/餐厅', dataIndex: 'organizationName' },
          { title: '期望账户名', dataIndex: 'desiredUsername' },
          { title: '联系人', dataIndex: 'contactName' },
          { title: '电话', dataIndex: 'contactPhone' },
          { title: '邮箱', dataIndex: 'contactEmail' },
          { title: '城市', dataIndex: 'city' },
          { title: '门店数', dataIndex: 'restaurantCount', width: 100 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 120,
            render: (v: Application['status']) => {
              const color = v === 'pending' ? 'gold' : v === 'approved' ? 'green' : 'red'
              const text = v === 'pending' ? '待审核' : v === 'approved' ? '已通过' : '已驳回'
              return <Tag color={color}>{text}</Tag>
            },
          },
          {
            title: '操作',
            width: 240,
            render: (_, record) => (
              <Space>
                <Button type="primary" onClick={() => handleApprove(record._id)}>
                  审批通过并创建账号
                </Button>
                <Button danger onClick={() => setRejectingId(record._id)}>
                  驳回
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="驳回申请"
        open={!!rejectingId}
        onCancel={() => setRejectingId(null)}
        onOk={handleReject}
        confirmLoading={loading}
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入驳回原因（可选）"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </Card>
  )
}

export default AccountApprovals


