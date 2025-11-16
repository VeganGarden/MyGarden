import { systemAPI } from '@/services/cloudbase'
import { Alert, Button, Card, Space, message } from 'antd'
import React, { useState } from 'react'

const Backup: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const onBackup = async () => {
    setLoading(true)
    try {
      const res = await systemAPI.runBackupExport()
      if (res.code === 0) {
        message.success(res.message || '已触发备份')
      } else {
        message.error(res.message || '触发失败')
      }
    } catch (e: any) {
      message.error(e.message || '触发失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="数据备份" bordered={false}>
      <Alert
        message="说明"
        description="这里将提供数据库集合导出、备份计划管理与一键恢复能力。当前为占位页面，后续接入云函数。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Space>
        <Button type="primary" onClick={onBackup} loading={loading}>
          立即备份
        </Button>
        <Button>导出集合</Button>
        <Button danger>从备份恢复</Button>
      </Space>
    </Card>
  )
}

export default Backup


