import { authAPI } from '@/services/cloudbase'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { clearTenant, setTenant } from '@/store/slices/tenantSlice'
import { validateUserStorage } from '@/utils/storage'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, message } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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

      // 如果是餐厅管理员且有租户ID，从云函数加载租户数据
      if (user.tenantId && user.role === 'restaurant_admin') {
        try {
          // 从云函数获取租户信息（getTenant已包含餐厅列表，无需单独调用getRestaurants）
          const { tenantAPI } = await import('@/services/cloudbase')
          const tenantResult = await tenantAPI.getTenant(user.tenantId)
          
          if (tenantResult.code === 0 && tenantResult.data) {
            // getTenant返回的数据已包含restaurants数组
            const restaurantsList = tenantResult.data.restaurants || []
            
            const tenantData = {
              id: tenantResult.data._id || tenantResult.data.id,
              name: tenantResult.data.name,
              restaurants: restaurantsList.map((r: any) => ({
                id: r._id || r.id,
                name: r.name,
                address: r.address,
                phone: r.phone,
                status: r.status || 'active',
                certificationLevel: r.certificationLevel,
                certificationStatus: r.certificationStatus,
                createdAt: r.createdAt || r.created_at,
              })),
            }
            dispatch(setTenant(tenantData))
          } else {
            dispatch(clearTenant())
          }
        } catch (error) {
          console.error('加载租户数据失败:', error)
          // 如果加载失败，清空租户信息
          dispatch(clearTenant())
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
        position: 'relative',
      }}
    >
      {/* 语言切换按钮 - 右上角 */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            padding: '4px',
          }}
        >
          <LanguageSwitcher />
        </div>
      </div>

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

