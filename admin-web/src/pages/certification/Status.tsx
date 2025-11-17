import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Tag, Timeline } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface AuditRecord {
  id: string
  stage: string
  status: 'pending' | 'approved' | 'rejected'
  comment?: string
  reviewer?: string
  timestamp: string
}

const CertificationStatus: React.FC = () => {
  const { t } = useTranslation()
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [currentStatus, setCurrentStatus] = useState<'pending' | 'reviewing' | 'approved' | 'rejected'>('reviewing')

  useEffect(() => {
    // TODO: 从API获取审核进度
    const mockData: AuditRecord[] = [
      {
        id: '1',
        stage: t('pages.certification.status.stages.documentReview'),
        status: 'approved',
        comment: t('pages.certification.status.comments.documentComplete'),
        reviewer: t('pages.certification.status.reviewer', { name: 'A' }),
        timestamp: '2025-01-15 10:00:00',
      },
      {
        id: '2',
        stage: t('pages.certification.status.stages.onSiteInspection'),
        status: 'pending',
        timestamp: '2025-01-16 14:00:00',
      },
      {
        id: '3',
        stage: t('pages.certification.status.stages.review'),
        status: 'pending',
        timestamp: '',
      },
    ]
    setAuditRecords(mockData)
  }, [])

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'approved':
        return <Tag color="success" icon={<CheckCircleOutlined />}>{t('pages.certification.status.auditStatus.approved')}</Tag>
      case 'rejected':
        return <Tag color="error" icon={<CloseCircleOutlined />}>{t('pages.certification.status.auditStatus.rejected')}</Tag>
      case 'pending':
        return <Tag color="processing" icon={<ClockCircleOutlined />}>{t('pages.certification.status.auditStatus.pending')}</Tag>
      default:
        return null
    }
  }

  const getOverallStatus = () => {
    switch (currentStatus) {
      case 'pending':
        return <Tag color="default">{t('pages.certification.status.overallStatus.pending')}</Tag>
      case 'reviewing':
        return <Tag color="processing">{t('pages.certification.status.overallStatus.reviewing')}</Tag>
      case 'approved':
        return <Tag color="success">{t('pages.certification.status.overallStatus.approved')}</Tag>
      case 'rejected':
        return <Tag color="error">{t('pages.certification.status.overallStatus.rejected')}</Tag>
      default:
        return null
    }
  }

  return (
    <div>
      <Card title={t('pages.certification.status.title')} style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label={t('pages.certification.status.fields.currentStatus')}>
            {getOverallStatus()}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.status.fields.applyTime')}>
            2025-01-15 09:00:00
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.status.fields.estimatedCompletion')}>
            2025-01-25 18:00:00
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.status.fields.certificationLevel')}>
            <Tag color="blue">{t('pages.certification.status.pendingEvaluation')}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('pages.certification.status.auditHistory.title')}>
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
                      {t('pages.certification.status.auditHistory.comment')}: {record.comment}
                    </div>
                  )}
                  {record.reviewer && (
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {t('pages.certification.status.auditHistory.reviewer')}: {record.reviewer}
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
        <Card title={t('pages.certification.status.rejection.title')} style={{ marginTop: 16 }}>
          <p>{t('pages.certification.status.rejection.message')}</p>
          <ul>
            <li>{t('pages.certification.status.rejection.reasons.menuIncomplete')}</li>
            <li>{t('pages.certification.status.rejection.reasons.supplierCertMissing')}</li>
          </ul>
          <Button type="primary" style={{ marginTop: 16 }}>
            {t('pages.certification.status.rejection.buttons.modifyAndResubmit')}
          </Button>
        </Card>
      )}
    </div>
  )
}

export default CertificationStatus


