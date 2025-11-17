import { DownloadOutlined, EyeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, QRCode, Space, Tag, message } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const CertificationCertificate: React.FC = () => {
  const { t } = useTranslation()
  const [certificateData] = useState({
    certificateNo: 'CR-2025-001',
    restaurantName: '示例餐厅',
    issueDate: '2025-01-20',
    expiryDate: '2026-01-20',
    level: 'Climate Restaurant Certified',
    status: 'valid',
  })

  const handleDownload = () => {
    message.success(t('pages.certification.certificate.messages.downloadInProgress'))
    // TODO: 实现PDF证书下载
  }

  const handleShare = () => {
    message.success(t('pages.certification.certificate.messages.shareInProgress'))
    // TODO: 生成分享链接或二维码
  }

  const handleView = () => {
    message.info(t('pages.certification.certificate.messages.previewInProgress'))
    // TODO: 打开证书预览弹窗
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
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              {t('pages.certification.certificate.buttons.downloadPdf')}
            </Button>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>
              {t('pages.certification.certificate.buttons.share')}
            </Button>
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.certification.certificate.fields.certificateNo')}>
            {certificateData.certificateNo}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.restaurantName')}>
            {certificateData.restaurantName}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.certificationLevel')}>
            <Tag color="green">{certificateData.level}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.status')}>
            <Tag color={certificateData.status === 'valid' ? 'success' : 'error'}>
              {certificateData.status === 'valid' ? t('pages.certification.certificate.status.valid') : t('pages.certification.certificate.status.expired')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.issueDate')}>
            {certificateData.issueDate}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.certification.certificate.fields.expiryDate')}>
            {certificateData.expiryDate}
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
            <h3 style={{ marginBottom: 24 }}>{certificateData.restaurantName}</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>
              {t('pages.certification.certificate.certificateDisplay.certificateNo')}: {certificateData.certificateNo}
            </p>
            <p style={{ color: '#666' }}>
              {t('pages.certification.certificate.certificateDisplay.validity')}: {certificateData.issueDate} {t('common.to')} {certificateData.expiryDate}
            </p>
            <div style={{ marginTop: 24 }}>
              <QRCode value={`https://example.com/certificate/${certificateData.certificateNo}`} />
            </div>
          </Card>
        </div>

        <Card title={t('pages.certification.certificate.renewal.title')} style={{ marginTop: 24 }}>
          <p>{t('pages.certification.certificate.renewal.message', { date: certificateData.expiryDate })}</p>
          <Button type="primary">{t('pages.certification.certificate.renewal.buttons.apply')}</Button>
        </Card>

        <Card title={t('pages.certification.certificate.upgrade.title')} style={{ marginTop: 16 }}>
          <p>{t('pages.certification.certificate.upgrade.message')}</p>
          <Button>{t('pages.certification.certificate.upgrade.buttons.viewTasks')}</Button>
        </Card>
      </Card>
    </div>
  )
}

export default CertificationCertificate


