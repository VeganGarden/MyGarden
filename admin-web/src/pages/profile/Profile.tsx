import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import {
    EditOutlined,
    MailOutlined,
    PhoneOutlined,
    SaveOutlined,
    ShopOutlined,
    UserOutlined
} from '@ant-design/icons'
import {
    Avatar,
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Form,
    Input,
    Row,
    Space,
    Tag,
    message,
} from 'antd'
import React, { useEffect, useState } from 'react'

const Profile: React.FC = () => {
  const { user } = useAppSelector((state: any) => state.auth)
  const { currentTenant, restaurants } = useAppSelector((state: any) => state.tenant)
  const dispatch = useAppDispatch()
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      // TODO: 调用API更新用户信息
      // await userAPI.updateProfile(values)
      
      // 更新本地状态
      const updatedUser = {
        ...user,
        ...values,
      }
      dispatch(setCredentials({ user: updatedUser, token: user.token || '' }))
      message.success('个人信息更新成功')
      setIsEditing(false)
    } catch (error) {
      console.error('更新失败:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setIsEditing(false)
  }

  return (
    <div>
      <Card>
        <Row gutter={24}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Avatar
                size={120}
                icon={<UserOutlined />}
                style={{ marginBottom: 16 }}
              >
                {user?.name?.[0]}
              </Avatar>
              <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                {user?.name}
              </div>
              <Tag color={user?.role === 'platform_admin' ? 'purple' : user?.role === 'tenant' ? 'blue' : 'default'}>
                {user?.role === 'platform_admin'
                  ? '平台管理员'
                  : user?.role === 'tenant'
                  ? '租户'
                  : '管理员'}
              </Tag>
            </div>
          </Col>
          <Col span={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>个人信息</h2>
              {!isEditing ? (
                <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                  编辑
                </Button>
              ) : (
                <Space>
                  <Button onClick={handleCancel}>取消</Button>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                    保存
                  </Button>
                </Space>
              )}
            </div>

            {isEditing ? (
              <Form form={form} layout="vertical">
                <Form.Item
                  name="name"
                  label="姓名"
                  rules={[{ required: true, message: '请输入姓名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="请输入姓名" />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="邮箱"
                  rules={[
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="手机号"
                  rules={[
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
                </Form.Item>
              </Form>
            ) : (
              <Descriptions column={1} bordered>
                <Descriptions.Item label="用户ID">{user?.id}</Descriptions.Item>
                <Descriptions.Item label="姓名">{user?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="邮箱">
                  {user?.email || <span style={{ color: '#999' }}>未设置</span>}
                </Descriptions.Item>
                <Descriptions.Item label="手机号">
                  {user?.phone || <span style={{ color: '#999' }}>未设置</span>}
                </Descriptions.Item>
                <Descriptions.Item label="角色">
                  <Tag color={user?.role === 'platform_admin' ? 'purple' : user?.role === 'tenant' ? 'blue' : 'default'}>
                    {user?.role === 'platform_admin'
                      ? '平台管理员'
                      : user?.role === 'tenant'
                      ? '租户'
                      : '管理员'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="租户ID">
                  {user?.tenantId || <span style={{ color: '#999' }}>无</span>}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Col>
        </Row>
      </Card>

      {/* 租户信息卡片 */}
      {currentTenant && user?.role === 'tenant' && (
        <Card
          title={
            <Space>
              <ShopOutlined />
              <span>租户信息</span>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="租户名称">{currentTenant.name}</Descriptions.Item>
            <Descriptions.Item label="租户ID">{currentTenant.id}</Descriptions.Item>
            <Descriptions.Item label="餐厅数量" span={2}>
              {restaurants.length} 家
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">我的餐厅</Divider>
          <Row gutter={16}>
            {restaurants.map((restaurant: any) => (
              <Col span={12} key={restaurant.id} style={{ marginBottom: 16 }}>
                <Card size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{restaurant.name}</div>
                      <div style={{ color: '#666', fontSize: 12 }}>{restaurant.address}</div>
                    </div>
                    <div>
                      {restaurant.certificationLevel && (
                        <Tag
                          color={
                            restaurant.certificationLevel === 'gold'
                              ? 'gold'
                              : restaurant.certificationLevel === 'silver'
                              ? 'default'
                              : restaurant.certificationLevel === 'platinum'
                              ? 'purple'
                              : 'default'
                          }
                        >
                          {restaurant.certificationLevel === 'gold'
                            ? '金牌'
                            : restaurant.certificationLevel === 'silver'
                            ? '银牌'
                            : restaurant.certificationLevel === 'platinum'
                            ? '白金'
                            : '铜牌'}
                        </Tag>
                      )}
                      <Tag color={restaurant.status === 'active' ? 'success' : 'default'}>
                        {restaurant.status === 'active' ? '正常' : '未激活'}
                      </Tag>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  )
}

export default Profile

