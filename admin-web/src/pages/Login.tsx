import { authAPI } from '@/services/cloudbase'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { clearTenant, setTenant } from '@/store/slices/tenantSlice'
import { validateUserStorage } from '@/utils/storage'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, message } from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const Login: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      // 调用认证云函数
      const result = await authAPI.login(values.username, values.password)

      if (result.code !== 0) {
        message.error(result.message || t('pages.login.messages.loginFailed'))
        return
      }

      const { token, user, expiresIn } = result.data

      // 禁用账号拦截
      if (user?.status && user.status !== 'active') {
        message.error(t('pages.login.messages.accountDisabled'))
        return
      }

      // 验证并清除旧的用户信息（如果存在且不匹配）
      validateUserStorage(user.id, user.role)

      // 设置新的用户信息和权限
      dispatch(
        setCredentials({
          user,
          token,
          permissions: user.permissions || [],
        })
      )

      // 如果是餐厅管理员且有租户ID，尝试加载租户数据
      if (user.tenantId && user.role === 'restaurant_admin') {
        // TODO: 从云函数加载租户数据
        // 暂时使用本地模拟数据（如果用户名包含"小苹果"）
        if (values.username.includes('小苹果') || values.username.includes('xiaopingguo')) {
          const tenantData = {
            id: 'tenant_xiaopingguo',
            name: '小苹果',
            restaurants: [
              {
                id: 'restaurant_sukuaixin',
                name: '素开心',
                address: '上海市虹桥区XX路123号',
                phone: '021-12345678',
                status: 'active' as const,
                certificationLevel: 'gold' as const,
                certificationStatus: 'certified' as const,
                createdAt: '2024-01-15',
              },
              {
                id: 'restaurant_suhuanle',
                name: '素欢乐',
                address: '上海市浦东新区XX街456号',
                phone: '021-87654321',
                status: 'active' as const,
                certificationLevel: 'silver' as const,
                certificationStatus: 'certified' as const,
                createdAt: '2024-02-20',
              },
            ],
          }
          dispatch(setTenant(tenantData))
        }
      } else {
        // 非餐厅管理员：清空本地租户态，避免顶栏显示租户切换器
        dispatch(clearTenant())
      }

      message.success(t('pages.login.messages.loginSuccess'))
      navigate('/dashboard')
    } catch (error: any) {
      console.error('登录失败:', error)
      message.error(error.message || t('pages.login.messages.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        title={
          <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold' }}>
            {t('pages.login.title')}
          </div>
        }
        style={{ width: 400 }}
      >
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('pages.login.form.messages.usernameRequired') }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('pages.login.form.placeholders.username')}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('pages.login.form.messages.passwordRequired') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('pages.login.form.placeholders.password')}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              {t('pages.login.buttons.login')}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          {t('pages.login.footer.noAccount')} <a onClick={() => navigate('/apply')}>{t('pages.login.footer.apply')}</a>
          <span style={{ margin: '0 8px', color: '#ddd' }}>|</span>
          <a>{t('pages.login.footer.forgotPassword')}</a>
        </div>

        {/* 底部提示移除测试账号信息 */}
      </Card>
    </div>
  )
}

export default Login

