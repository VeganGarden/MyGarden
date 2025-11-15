import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Tag, Timeline } from 'antd'
import React, { useEffect, useState } from 'react'

interface AuditRecord {
  id: string
  stage: string
  status: 'pending' | 'approved' | 'rejected'
  comment?: string
  reviewer?: string
  timestamp: string
}

const CertificationStatus: React.FC = () => {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [currentStatus, setCurrentStatus] = useState<'pending' | 'reviewing' | 'approved' | 'rejected'>('reviewing')

  useEffect(() => {
    // TODO: 从API获取审核进度
    const mockData: AuditRecord[] = [
      {
        id: '1',
        stage: '资料审查',
        status: 'approved',
        comment: '资料完整，符合要求',
        reviewer: '审核员A',
        timestamp: '2025-01-15 10:00:00',
      },
      {
        id: '2',
        stage: '现场核查',
        status: 'pending',
        timestamp: '2025-01-16 14:00:00',
      },
      {
        id: '3',
        stage: '复评',
        status: 'pending',
        timestamp: '',
      },
    ]
    setAuditRecords(mockData)
  }, [])

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'approved':
        return <Tag color="success" icon={<CheckCircleOutlined />}>已通过</Tag>
      case 'rejected':
        return <Tag color="error" icon={<CloseCircleOutlined />}>已拒绝</Tag>
      case 'pending':
        return <Tag color="processing" icon={<ClockCircleOutlined />}>待审核</Tag>
      default:
        return null
    }
  }

  const getOverallStatus = () => {
    switch (currentStatus) {
      case 'pending':
        return <Tag color="default">待提交</Tag>
      case 'reviewing':
        return <Tag color="processing">审核中</Tag>
      case 'approved':
        return <Tag color="success">已通过</Tag>
      case 'rejected':
        return <Tag color="error">已拒绝</Tag>
      default:
        return null
    }
  }

  return (
    <div>
      <Card title="认证进度" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="当前状态">
            {getOverallStatus()}
          </Descriptions.Item>
          <Descriptions.Item label="申请时间">
            2025-01-15 09:00:00
          </Descriptions.Item>
          <Descriptions.Item label="预计完成时间">
            2025-01-25 18:00:00
          </Descriptions.Item>
          <Descriptions.Item label="认证等级">
            <Tag color="blue">待评估</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="审核历史">
        <Timeline>
          {auditRecords.map((record) => (
            <Timeline.Item
              key={record.id}
              color={
                record.status === 'approved'
                  ? 'green'
                  : record.status === 'rejected'
                  ? 'red'
                  : 'blue'
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {record.stage}
                  </div>
                  {record.comment && (
                    <div style={{ color: '#666', marginBottom: 4 }}>
                      审核意见: {record.comment}
                    </div>
                  )}
                  {record.reviewer && (
                    <div style={{ color: '#999', fontSize: 12 }}>
                      审核人: {record.reviewer}
                    </div>
                  )}
                  {record.timestamp && (
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {record.timestamp}
                    </div>
                  )}
                </div>
                <div>{getStatusTag(record.status)}</div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>

      {currentStatus === 'rejected' && (
        <Card title="拒绝原因" style={{ marginTop: 16 }}>
          <p>您的认证申请未通过审核，原因如下：</p>
          <ul>
            <li>菜单信息不完整，缺少部分菜品的食材清单</li>
            <li>供应链信息需要补充供应商认证证书</li>
          </ul>
          <Button type="primary" style={{ marginTop: 16 }}>
            修改并重新提交
          </Button>
        </Card>
      )}
    </div>
  )
}

export default CertificationStatus


