import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { getCloudbaseApp } from '@/utils/cloudbase-init'
import { CopyOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Descriptions, Empty, List, Modal, Progress, QRCode, Space, Spin, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const CertificationCertificate: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, currentRestaurant } = useAppSelector((state: any) => state.tenant)
  const [certificateData, setCertificateData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [renewalReminder, setRenewalReminder] = useState<{ daysLeft: number; showReminder: boolean } | null>(null)
  const [upgradeTasks, setUpgradeTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  useEffect(() => {
    if (currentRestaurantId) {
      loadCertificate()
    } else {
      setLoading(false)
    }
  }, [currentRestaurantId])

  const loadCertificate = async () => {
    if (!currentRestaurantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const result = await certificationAPI.getCertificate({
        restaurantId: currentRestaurantId
      })

      if (result.code === 0 && result.data) {
        setCertificateData(result.data)
        
        // 检查续期提醒
        if (result.data.expiryDate) {
          const expiryDate = new Date(result.data.expiryDate)
          const today = new Date()
          const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysLeft <= 30 && daysLeft > 0) {
            setRenewalReminder({
              daysLeft,
              showReminder: true
            })
          } else if (daysLeft <= 0) {
            setRenewalReminder({
              daysLeft: 0,
              showReminder: true
            })
          }
        }
        
        // 加载升级任务（如果有成长激励数据）
        if (result.data.growthIncentives) {
          loadUpgradeTasks(result.data.growthIncentives)
        }
      } else if (result.code === 404) {
        // 证书不存在，这是正常情况
        setCertificateData(null)
      } else {
        message.error(result.message || '获取证书失败')
      }
    } catch (error: any) {
      console.error('获取证书失败:', error)
      message.error(error.message || '获取证书失败')
    } finally {
      setLoading(false)
    }
  }

  const loadUpgradeTasks = async (growthIncentives: any) => {
    if (!growthIncentives || !Array.isArray(growthIncentives.tasks)) {
      return
    }

    try {
      setLoadingTasks(true)
      // 这里可以从growthIncentives中获取任务列表
      // 或者调用API获取任务详情
      const tasks = growthIncentives.tasks.map((task: any, index: number) => ({
        id: task.id || `task_${index}`,
        title: task.title || task.name || `任务 ${index + 1}`,
        description: task.description || '',
        progress: task.progress || 0,
        target: task.target || 100,
        status: task.status || 'pending',
        reward: task.reward || ''
      }))
      setUpgradeTasks(tasks)
    } catch (error: any) {
      console.error('加载升级任务失败:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleRenewal = () => {
    // 跳转到认证申请页面，并标记为续期申请
    navigate('/certification/apply?type=renewal')
  }

  const handleDownload = async () => {
    if (!certificateData?.certificateFile) {
      message.warning('证书文件不存在')
      return
    }

    try {
      message.loading('正在获取证书文件...', 0)
      
      // 获取云存储文件临时URL
      const app = await getCloudbaseApp()
      const fileID = certificateData.certificateFile
      
      let fileUrl = fileID
      try {
        const tmp = await app.getTempFileURL({ fileList: [fileID] })
        fileUrl = tmp?.fileList?.[0]?.tempFileURL || fileID
      } catch (err) {
        console.warn('获取临时URL失败，使用原始文件ID:', err)
      }
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = `证书_${certificateData.certificateNumber || certificateData.certificateId || 'certificate'}.pdf`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      message.destroy()
      message.success('证书下载成功')
    } catch (error: any) {
      message.destroy()
      console.error('下载证书失败:', error)
      message.error('下载失败，请稍后重试')
    }
  }

  const handleShare = () => {
    if (!certificateData?.shareLink) {
      message.warning('分享链接不存在')
      return
    }

    // 复制分享链接到剪贴板
    navigator.clipboard.writeText(certificateData.shareLink).then(() => {
      message.success('分享链接已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败，请手动复制')
    })
  }

  const handleView = () => {
    setPreviewVisible(true)
  }

  const handleCopyLink = () => {
    if (certificateData?.shareLink) {
      navigator.clipboard.writeText(certificateData.shareLink).then(() => {
        message.success('链接已复制')
      })
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
        <Card title={t('pages.certification.certificate.title')}>
          <Alert
            message="请选择餐厅"
            description="请先在顶部标题栏选择要查看证书的餐厅"
            type="info"
            showIcon
          />
        </Card>
      </div>
    )
  }

  if (!certificateData) {
    return (
      <div>
        <Card title={t('pages.certification.certificate.title')}>
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Empty
              description={
                <div>
                  <p style={{ color: '#999', marginBottom: 8 }}>暂无证书信息</p>
                  <p style={{ color: '#999', fontSize: 12 }}>
                    {currentRestaurant?.name || '当前餐厅'} 尚未获得认证证书
                  </p>
                  <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                    请先完成认证申请并通过审核
                  </p>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <Card
        title={t('pages.certification.certificate.title')}
        extra={
          <Space>
            <Button icon={<EyeOutlined />} onClick={handleView}>
              {t('pages.certification.certificate.buttons.preview')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownload} disabled={!certificateData.certificateFile}>
              {t('pages.certification.certificate.buttons.downloadPdf')}
            </Button>
            <Button icon={<ShareAltOutlined />} onClick={handleShare} disabled={!certificateData.shareLink}>
              {t('pages.certification.certificate.buttons.share')}
            </Button>
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.certification.certificate.fields.certificateNo')}>
            {certificateData.certificateNumber || certificateData.certificateId}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.restaurantName')}>
            {certificateData.restaurantName || currentRestaurant?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.certificationLevel')}>
            <Tag color="green">{certificateData.certLevel || 'Climate Restaurant Certified'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.status')}>
            <Tag color={certificateData.status === 'valid' ? 'success' : 'error'}>
              {certificateData.status === 'valid' ? t('pages.certification.certificate.status.valid') : t('pages.certification.certificate.status.expired')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.issueDate')}>
            {certificateData.issueDate ? new Date(certificateData.issueDate).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.expiryDate')}>
            {certificateData.expiryDate ? new Date(certificateData.expiryDate).toLocaleDateString() : '-'}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Card
            style={{
              display: 'inline-block',
              padding: 32,
              border: '2px solid #1890ff',
              borderRadius: 8,
            }}
          >
            <h2 style={{ marginBottom: 16 }}>Climate Restaurant Certified</h2>
            <h3 style={{ marginBottom: 24 }}>{certificateData.restaurantName || currentRestaurant?.name || '-'}</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              {t('pages.certification.certificate.certificateDisplay.certificateNo')}: {certificateData.certificateNumber || certificateData.certificateId}
            </p>
            <p style={{ color: '#666' }}>
              {t('pages.certification.certificate.certificateDisplay.validity')}: {
                certificateData.issueDate ? new Date(certificateData.issueDate).toLocaleDateString() : '-'
              } {t('common.to')} {
                certificateData.expiryDate ? new Date(certificateData.expiryDate).toLocaleDateString() : '-'
              }
            </p>
            {certificateData.shareLink && (
              <div style={{ marginTop: 24 }}>
                <QRCode value={certificateData.shareLink} />
                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                  <Space>
                    <span>分享链接:</span>
                    <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {certificateData.shareLink}
                    </span>
                    <Button 
                      type="link" 
                      size="small" 
                      icon={<CopyOutlined />} 
                      onClick={handleCopyLink}
                    >
                      复制
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </Card>
        </div>

        {certificateData.expiryDate && (
          <Card 
            title={t('pages.certification.certificate.renewal.title')} 
            style={{ marginTop: 24 }}
            extra={
              renewalReminder?.showReminder && (
                <Tag color={renewalReminder.daysLeft <= 0 ? 'error' : 'warning'}>
                  {renewalReminder.daysLeft <= 0 ? '已过期' : `还有 ${renewalReminder.daysLeft} 天到期`}
                </Tag>
              )
            }
          >
            {renewalReminder?.showReminder && (
              <Alert
                message={renewalReminder.daysLeft <= 0 ? '证书已过期' : `证书将在 ${renewalReminder.daysLeft} 天后到期`}
                description={renewalReminder.daysLeft <= 0 
                  ? '请尽快申请续期以保持认证状态' 
                  : '建议提前申请续期，确保认证连续性'}
                type={renewalReminder.daysLeft <= 0 ? 'error' : 'warning'}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <p>{t('pages.certification.certificate.renewal.message', { 
              date: new Date(certificateData.expiryDate).toLocaleDateString() 
            })}</p>
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleRenewal}>
              {t('pages.certification.certificate.renewal.buttons.apply')}
            </Button>
          </Card>
        )}

        <Card title={t('pages.certification.certificate.upgrade.title')} style={{ marginTop: 16 }}>
          <p>{t('pages.certification.certificate.upgrade.message')}</p>
          {loadingTasks ? (
            <Spin />
          ) : upgradeTasks.length > 0 ? (
            <List
              dataSource={upgradeTasks}
              renderItem={(task) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{task.title}</span>
                        <Tag color={task.status === 'completed' ? 'success' : 'processing'}>
                          {task.status === 'completed' ? '已完成' : '进行中'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <p>{task.description}</p>
                        <Progress 
                          percent={Math.min((task.progress / task.target) * 100, 100)} 
                          size="small"
                          style={{ marginTop: 8 }}
                        />
                        {task.reward && (
                          <p style={{ marginTop: 4, color: '#1890ff', fontSize: 12 }}>
                            奖励: {task.reward}
                          </p>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
              <p>暂无升级任务</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                完成更多认证要求可解锁升级任务
              </p>
            </div>
          )}
        </Card>
      </Card>

      {/* 证书预览弹窗 */}
      <Modal
        title="证书预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
            下载PDF
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {certificateData && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="证书编号">
                {certificateData.certificateNumber || certificateData.certificateId}
              </Descriptions.Item>
              <Descriptions.Item label="餐厅名称">
                {certificateData.restaurantName || currentRestaurant?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="认证等级">
                <Tag color="green">{certificateData.certLevel}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={certificateData.status === 'valid' ? 'success' : 'error'}>
                  {certificateData.status === 'valid' ? '有效' : '已过期'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="颁发日期">
                {certificateData.issueDate ? new Date(certificateData.issueDate).toLocaleDateString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="到期日期">
                {certificateData.expiryDate ? new Date(certificateData.expiryDate).toLocaleDateString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="颁发机构">
                {certificateData.issuedBy || '我的花园平台'}
              </Descriptions.Item>
            </Descriptions>
            {certificateData.shareLink && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <QRCode value={certificateData.shareLink} />
                <p style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                  扫描二维码验证证书
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CertificationCertificate


