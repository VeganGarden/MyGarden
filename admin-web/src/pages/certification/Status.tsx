import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Spin, Tag, Timeline, message, Alert } from 'antd'
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
  const { currentRestaurantId, currentRestaurant } = useAppSelector((state: any) => state.tenant)
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [currentStatus, setCurrentStatus] = useState<'pending' | 'reviewing' | 'approved' | 'rejected'>('reviewing')
  const [loading, setLoading] = useState(true)
  const [statusData, setStatusData] = useState<any>(null)

  useEffect(() => {
    if (currentRestaurantId) {
      loadStatus()
    } else {
      setLoading(false)
    }
  }, [currentRestaurantId])

  const loadStatus = async () => {
    if (!currentRestaurantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const result = await certificationAPI.getStatus({
        restaurantId: currentRestaurantId
      })

      if (result.code === 0 && result.data) {
        const data = result.data
        setStatusData(data)
        
        // 更新状态 - 优先检查餐厅的认证状态
        if (currentRestaurant?.certificationStatus === 'certified') {
          setCurrentStatus('approved')
        } else if (data.status === 'submitted' || data.status === 'reviewing') {
          setCurrentStatus('reviewing')
        } else if (data.status === 'approved') {
          setCurrentStatus('approved')
        } else if (data.status === 'rejected') {
          setCurrentStatus('rejected')
        } else {
          setCurrentStatus('pending')
        }

        // 转换阶段数据为审核记录
        const records: AuditRecord[] = data.stages?.map((stage: any, index: number) => {
          let status: 'pending' | 'approved' | 'rejected' = 'pending'
          if (stage.status === 'completed') {
            // 处理不同的结果格式
            if (stage.result === 'pass' || stage.result === 'approved') {
              status = 'approved'
            } else if (stage.result === 'fail' || stage.result === 'rejected') {
              status = 'rejected'
            }
          }

          return {
            id: String(index + 1),
            stage: stage.stageName || stage.stageType,
            status,
            comment: stage.comment,
            reviewer: stage.operatorName,
            timestamp: stage.endTime ? new Date(stage.endTime).toLocaleString() : 
                      stage.startTime ? new Date(stage.startTime).toLocaleString() : ''
          }
        }) || []

        setAuditRecords(records)
      } else if (result.code === 404) {
        // 没有找到申请，可能是新餐厅或未提交申请
        setStatusData(null)
        setCurrentStatus('pending')
        setAuditRecords([])
      } else {
        message.error(result.message || '获取状态失败')
      }
    } catch (error: any) {
      console.error('获取认证状态失败:', error)
      message.error(error.message || '获取状态失败')
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  // 如果没有选择餐厅，显示空状态
  if (!currentRestaurantId) {
    return (
      <div>
        <Card title={t('pages.certification.status.title')}>
          <Alert
            message="请选择餐厅"
            description="请先在顶部标题栏选择要查看认证进度的餐厅"
            type="info"
            showIcon
          />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <Card title={t('pages.certification.status.title')} style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label={t('pages.certification.status.fields.currentStatus')}>
            {getOverallStatus()}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.status.fields.applyTime')}>
            {statusData?.submittedAt ? new Date(statusData.submittedAt).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.status.fields.estimatedCompletion')}>
            {statusData?.estimatedCompletion ? new Date(statusData.estimatedCompletion).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.status.fields.certificationLevel')}>
            <Tag color={currentStatus === 'approved' ? 'success' : 'default'}>
              {statusData?.certificationLevel 
                ? (statusData.certificationLevel === 'bronze' ? '铜牌' : 
                   statusData.certificationLevel === 'silver' ? '银牌' : 
                   statusData.certificationLevel === 'gold' ? '金牌' : 
                   statusData.certificationLevel)
                : (currentStatus === 'approved' ? '待评估' : t('pages.certification.status.pendingEvaluation'))}
            </Tag>
          </Descriptions.Item>
          {statusData?.certificateInfo && (
            <>
              <Descriptions.Item label="证书编号">
                {statusData.certificateInfo.certificateNumber}
              </Descriptions.Item>
              <Descriptions.Item label="证书颁发时间">
                {statusData.certificateInfo.issuedAt 
                  ? new Date(statusData.certificateInfo.issuedAt).toLocaleString() 
                  : '-'}
              </Descriptions.Item>
              {statusData.certificateInfo.expiryDate && (
                <Descriptions.Item label="证书有效期至">
                  {new Date(statusData.certificateInfo.expiryDate).toLocaleString()}
                </Descriptions.Item>
              )}
            </>
          )}
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


