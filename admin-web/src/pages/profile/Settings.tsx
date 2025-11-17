import { useAppSelector } from '@/store/hooks'
import { BellOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Space,
  Switch,
  message,
} from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAppSelector((state: any) => state.auth)
  const [passwordForm] = Form.useForm()
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotification: true,
    smsNotification: false,
    orderNotification: true,
    certificationNotification: true,
  })

  const handlePasswordChange = async () => {
    try {
      const values = await passwordForm.validateFields()
      if (values.newPassword !== values.confirmPassword) {
        message.error(t('pages.profile.settings.password.messages.passwordMismatch'))
        return
      }
      // TODO: 调用API修改密码
      // await userAPI.changePassword({
      //   oldPassword: values.oldPassword,
      //   newPassword: values.newPassword,
      // })
      message.success(t('pages.profile.settings.password.messages.changeSuccess'))
      passwordForm.resetFields()
    } catch (error) {
      console.error('修改密码失败:', error)
    }
  }

  const handleNotificationChange = async (key: string, value: boolean) => {
    const newSettings = {
      ...notificationSettings,
      [key]: value,
    }
    setNotificationSettings(newSettings)
    try {
      // TODO: 调用API保存通知设置
      // await userAPI.updateNotificationSettings(newSettings)
      message.success(t('pages.profile.settings.notification.messages.updateSuccess'))
    } catch (error) {
      // 如果保存失败，回滚设置
      setNotificationSettings(notificationSettings)
      message.error(t('pages.profile.settings.notification.messages.updateFailed'))
    }
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <LockOutlined />
            <span>{t('pages.profile.settings.password.title')}</span>
          </Space>
        }
      >
        <Alert
          message={t('pages.profile.settings.password.alert.title')}
          description={t('pages.profile.settings.password.alert.description')}
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Form form={passwordForm} layout="vertical" style={{ maxWidth: 500 }}>
          <Form.Item
            name="oldPassword"
            label={t('pages.profile.settings.password.form.fields.oldPassword')}
            rules={[{ required: true, message: t('pages.profile.settings.password.form.messages.oldPasswordRequired') }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('pages.profile.settings.password.form.placeholders.oldPassword')} />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t('pages.profile.settings.password.form.fields.newPassword')}
            rules={[
              { required: true, message: t('pages.profile.settings.password.form.messages.newPasswordRequired') },
              { min: 8, message: t('pages.profile.settings.password.form.messages.passwordMin') },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                message: t('pages.profile.settings.password.form.messages.passwordPattern'),
              },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('pages.profile.settings.password.form.placeholders.newPassword')} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t('pages.profile.settings.password.form.fields.confirmPassword')}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: t('pages.profile.settings.password.form.messages.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('pages.profile.settings.password.form.messages.passwordMismatch')))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('pages.profile.settings.password.form.placeholders.confirmPassword')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handlePasswordChange}>
              {t('pages.profile.settings.password.buttons.change')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Space>
            <BellOutlined />
            <span>{t('pages.profile.settings.notification.title')}</span>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{t('pages.profile.settings.notification.items.email.title')}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{t('pages.profile.settings.notification.items.email.description')}</div>
            </div>
            <Switch
              checked={notificationSettings.emailNotification}
              onChange={(checked) => handleNotificationChange('emailNotification', checked)}
            />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{t('pages.profile.settings.notification.items.sms.title')}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{t('pages.profile.settings.notification.items.sms.description')}</div>
            </div>
            <Switch
              checked={notificationSettings.smsNotification}
              onChange={(checked) => handleNotificationChange('smsNotification', checked)}
            />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{t('pages.profile.settings.notification.items.order.title')}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{t('pages.profile.settings.notification.items.order.description')}</div>
            </div>
            <Switch
              checked={notificationSettings.orderNotification}
              onChange={(checked) => handleNotificationChange('orderNotification', checked)}
            />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{t('pages.profile.settings.notification.items.certification.title')}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{t('pages.profile.settings.notification.items.certification.description')}</div>
            </div>
            <Switch
              checked={notificationSettings.certificationNotification}
              onChange={(checked) => handleNotificationChange('certificationNotification', checked)}
            />
          </div>
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>{t('pages.profile.settings.security.title')}</span>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{t('pages.profile.settings.security.items.loginProtection.title')}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{t('pages.profile.settings.security.items.loginProtection.description')}</div>
            </div>
            <Switch defaultChecked />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{t('pages.profile.settings.security.items.operationLog.title')}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{t('pages.profile.settings.security.items.operationLog.description')}</div>
            </div>
            <Switch defaultChecked />
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Settings

