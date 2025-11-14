import { DownloadOutlined, EyeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, QRCode, Space, Tag, message } from 'antd'
import React, { useState } from 'react'

const CertificationCertificate: React.FC = () => {
  const [certificateData] = useState({
    certificateNo: 'CR-2025-001',
    restaurantName: '示例餐厅',
    issueDate: '2025-01-20',
    expiryDate: '2026-01-20',
    level: 'Climate Restaurant Certified',
    status: 'valid',
  })

  const handleDownload = () => {
    message.success('证书下载功能开发中')
    // TODO: 实现PDF证书下载
  }

  const handleShare = () => {
    message.success('证书分享功能开发中')
    // TODO: 生成分享链接或二维码
  }

  const handleView = () => {
    message.info('证书预览功能开发中')
    // TODO: 打开证书预览弹窗
  }

  return (
    <div>
      <Card
        title="认证证书"
        extra={
          <Space>
            <Button icon={<EyeOutlined />} onClick={handleView}>
              预览
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              下载PDF
            </Button>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>
              分享
            </Button>
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="证书编号">
            {certificateData.certificateNo}
          </Descriptions.Item>
          <Descriptions.Item label="餐厅名称">
            {certificateData.restaurantName}
          </Descriptions.Item>
          <Descriptions.Item label="认证等级">
            <Tag color="green">{certificateData.level}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="证书状态">
            <Tag color={certificateData.status === 'valid' ? 'success' : 'error'}>
              {certificateData.status === 'valid' ? '有效' : '已过期'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="颁发日期">
            {certificateData.issueDate}
          </Descriptions.Item>
          <Descriptions.Item label="有效期至">
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
              证书编号: {certificateData.certificateNo}
            </p>
            <p style={{ color: '#666' }}>
              有效期: {certificateData.issueDate} 至 {certificateData.expiryDate}
            </p>
            <div style={{ marginTop: 24 }}>
              <QRCode value={`https://example.com/certificate/${certificateData.certificateNo}`} />
            </div>
          </Card>
        </div>

        <Card title="续费提醒" style={{ marginTop: 24 }}>
          <p>您的证书将于 {certificateData.expiryDate} 到期，请提前30天办理续费手续。</p>
          <Button type="primary">申请续费</Button>
        </Card>

        <Card title="证书升级" style={{ marginTop: 16 }}>
          <p>完成成长激励任务可解锁勋章、曝光位等权益。</p>
          <Button>查看成长任务</Button>
        </Card>
      </Card>
    </div>
  )
}

export default CertificationCertificate

