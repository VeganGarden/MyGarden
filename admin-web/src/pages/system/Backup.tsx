import { systemAPI } from '@/services/cloudbase'
import { Alert, Button, Card, Space, message } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const Backup: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const onBackup = async () => {
    setLoading(true)
    try {
      const res = await systemAPI.runBackupExport()
      if (res.code === 0) {
        message.success(res.message || t('pages.system.backup.messages.backupTriggered'))
      } else {
        message.error(res.message || t('pages.system.backup.messages.triggerFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('pages.system.backup.messages.triggerFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title={t('pages.system.backup.title')} bordered={false}>
      <Alert
        message={t('pages.system.backup.alert.title')}
        description={t('pages.system.backup.alert.description')}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Space>
        <Button type="primary" onClick={onBackup} loading={loading}>
          {t('pages.system.backup.buttons.backupNow')}
        </Button>
        <Button>{t('pages.system.backup.buttons.exportCollections')}</Button>
        <Button danger>{t('pages.system.backup.buttons.restoreFromBackup')}</Button>
      </Space>
    </Card>
  )
}

export default Backup


