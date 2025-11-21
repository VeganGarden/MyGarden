import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setCurrentRestaurant } from '@/store/slices/tenantSlice'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Select, Spin, Tag, Timeline, message, Empty, Alert } from 'antd'
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
  const dispatch = useAppDispatch()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [currentStatus, setCurrentStatus] = useState<'pending' | 'reviewing' | 'approved' | 'rejected'>('reviewing')
  const [loading, setLoading] = useState(true)
  const [statusData, setStatusData] = useState<any>(null)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(currentRestaurantId)

  useEffect(() => {
    // 如果只有一个餐厅，自动选择它
    if (restaurants.length === 1 && !currentRestaurantId) {
      const restaurant = restaurants[0]
      setSelectedRestaurantId(restaurant.id)
      dispatch(setCurrentRestaurant(restaurant.id))
    } else if (currentRestaurantId) {
      setSelectedRestaurantId(currentRestaurantId)
    }
  }, [restaurants, currentRestaurantId, dispatch])

  useEffect(() => {
    if (selectedRestaurantId) {
      loadStatus()
    } else {
      setLoading(false)
    }
  }, [selectedRestaurantId])

  const handleRestaurantChange = (value: string) => {
    setSelectedRestaurantId(value)
    dispatch(setCurrentRestaurant(value))
  }

  const loadStatus = async () => {
    if (!selectedRestaurantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const result = await certificationAPI.getStatus({
        restaurantId: selectedRestaurantId
      })

      if (result.code === 0 && result.data) {
        const data = result.data
        setStatusData(data)
        
        // 更新状态
        if (data.status === 'submitted' || data.status === 'reviewing') {
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
            status = stage.result === 'pass' ? 'approved' : 'rejected'
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
  if (!selectedRestaurantId) {
    return (
      <div>
        <Card title={t('pages.certification.status.title')}>
          {restaurants.length > 0 ? (
            <div>
              <Alert
                message="请选择餐厅"
                description="请先选择要查看认证进度的餐厅"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Select
                placeholder={t('pages.certification.apply.placeholders.selectRestaurant')}
                style={{ width: '100%' }}
                value={selectedRestaurantId}
                onChange={handleRestaurantChange}
              >
                {restaurants.map((restaurant: any) => (
                  <Select.Option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          ) : (
            <Empty
              description="暂无餐厅数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      </div>
    )
  }

  return (
    <div>
      {restaurants.length > 1 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>选择餐厅：</span>
            <Select
              style={{ flex: 1, maxWidth: 300 }}
              value={selectedRestaurantId}
              onChange={handleRestaurantChange}
            >
              {restaurants.map((restaurant: any) => (
                <Select.Option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        </Card>
      )}
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
            <Tag color="blue">
              {statusData?.certificationLevel || t('pages.certification.status.pendingEvaluation')}
            </Tag>
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


