import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { setTenant } from '@/store/slices/tenantSlice'
import { validateUserStorage } from '@/utils/storage'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, message } from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      // TODO: 实现真实的登录逻辑
      // 这里先模拟登录成功
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 模拟用户信息 - 根据用户名判断角色
      let mockUser: any
      if (values.username === 'platform' || values.username === 'platform_admin') {
        // 平台管理员账号
        mockUser = {
          id: 'platform_admin_001',
          name: '平台管理员',
          role: 'platform_admin',
          tenantId: null, // 平台管理员没有租户ID
        }
      } else if (
        values.username === '小苹果' ||
        values.username === 'xiaopingguo' ||
        values.username === '' ||
        !values.username.trim()
      ) {
        // 小苹果租户账号（默认账号，空用户名也默认登录为小苹果）
        mockUser = {
          id: 'tenant_xiaopingguo',
          name: '小苹果',
          role: 'tenant',
          tenantId: 'tenant_xiaopingguo',
        }
      } else {
        // 普通管理员账号
        mockUser = {
          id: 'admin_001',
          name: '管理员',
          role: 'admin',
          tenantId: 'restaurant_001',
        }
      }

      const mockToken = 'mock_token_' + Date.now()

      // 验证并清除旧的用户信息（如果存在且不匹配）
      validateUserStorage(mockUser.id, mockUser.role)
      
      // 设置新的用户信息
      dispatch(setCredentials({ user: mockUser, token: mockToken }))
      
      // 如果是小苹果租户，初始化租户数据
      if (mockUser.tenantId === 'tenant_xiaopingguo') {
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
      
      message.success('登录成功')
      navigate('/dashboard')
    } catch (error) {
      message.error('登录失败，请检查用户名和密码')
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
            气候餐厅管理后台
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
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
          <p>测试账号：</p>
          <p><strong>默认租户：小苹果（直接登录或输入"小苹果"）</strong></p>
          <p>普通管理员：admin / admin123</p>
          <p>平台管理员：platform / admin123</p>
        </div>
      </Card>
    </div>
  )
}

export default Login

