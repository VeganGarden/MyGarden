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

const Settings: React.FC = () => {
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
        message.error('两次输入的密码不一致')
        return
      }
      // TODO: 调用API修改密码
      // await userAPI.changePassword({
      //   oldPassword: values.oldPassword,
      //   newPassword: values.newPassword,
      // })
      message.success('密码修改成功')
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
      message.success('通知设置已更新')
    } catch (error) {
      // 如果保存失败，回滚设置
      setNotificationSettings(notificationSettings)
      message.error('通知设置更新失败')
    }
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <LockOutlined />
            <span>修改密码</span>
          </Space>
        }
      >
        <Alert
          message="密码安全提示"
          description="请使用至少8位字符的强密码，包含字母、数字和特殊字符。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Form form={passwordForm} layout="vertical" style={{ maxWidth: 500 }}>
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码长度至少8位' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                message: '密码必须包含大小写字母、数字和特殊字符',
              },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handlePasswordChange}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Space>
            <BellOutlined />
            <span>通知设置</span>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>邮件通知</div>
              <div style={{ color: '#666', fontSize: 12 }}>接收系统重要通知邮件</div>
            </div>
            <Switch
              checked={notificationSettings.emailNotification}
              onChange={(checked) => handleNotificationChange('emailNotification', checked)}
            />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>短信通知</div>
              <div style={{ color: '#666', fontSize: 12 }}>接收重要操作的短信提醒</div>
            </div>
            <Switch
              checked={notificationSettings.smsNotification}
              onChange={(checked) => handleNotificationChange('smsNotification', checked)}
            />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>订单通知</div>
              <div style={{ color: '#666', fontSize: 12 }}>接收新订单和订单状态变更通知</div>
            </div>
            <Switch
              checked={notificationSettings.orderNotification}
              onChange={(checked) => handleNotificationChange('orderNotification', checked)}
            />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>认证通知</div>
              <div style={{ color: '#666', fontSize: 12 }}>接收认证申请进度和结果通知</div>
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
            <span>安全设置</span>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>登录保护</div>
              <div style={{ color: '#666', fontSize: 12 }}>启用后，登录时需要验证码</div>
            </div>
            <Switch defaultChecked />
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>操作日志</div>
              <div style={{ color: '#666', fontSize: 12 }}>记录所有重要操作，便于审计</div>
            </div>
            <Switch defaultChecked />
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Settings

