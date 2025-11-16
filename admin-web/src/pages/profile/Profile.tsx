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
import { systemAPI } from '@/services/cloudbase'
import { getCloudbaseApp } from '@/utils/cloudbase-init'
import { Upload } from 'antd'
import type { UploadProps } from 'antd'

const Profile: React.FC = () => {
  const { user } = useAppSelector((state: any) => state.auth)
  const { currentTenant, restaurants } = useAppSelector((state: any) => state.tenant)
  const dispatch = useAppDispatch()
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined) // 用于预览（临时链接）
  const [avatarFileId, setAvatarFileId] = useState<string | undefined>(undefined) // 存库用（fileID）

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
      })
      // user.avatarUrl 可能是 fileID，渲染前换成临时链接
      const init = async () => {
        const val = user.avatarUrl
        if (!val) {
          setAvatarUrl(undefined)
          setAvatarFileId(undefined)
          return
        }
        setAvatarFileId(val) // 认为存库的是 fileID
        try {
          const app = await getCloudbaseApp()
          const tmp = await app.getTempFileURL({ fileList: [val] })
          const url = tmp?.fileList?.[0]?.tempFileURL || val
          setAvatarUrl(url)
        } catch {
          setAvatarUrl(val)
        }
      }
      init()
    }
  }, [user, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const res = await systemAPI.updateProfile({ ...values, avatarUrl: avatarFileId })
      if (res.code !== 0) {
        message.error(res.message || '更新失败')
        return
      }
      
      // 更新本地状态
      const updatedUser = {
        ...user,
        ...values,
        avatarUrl,
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
                size={126}
                shape="circle"
                icon={<UserOutlined />}
                src={avatarUrl}
                style={{ marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                {user?.name?.[0]}
              </Avatar>
              {isEditing && (
                <div style={{ marginTop: 4 }}>
                  <Upload
                    accept="image/png,image/jpeg,image/heic,image/heif"
                    showUploadList={false}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      try {
                        const f = file as File
                        let uploadFileObj = f
                        let targetExt = 'jpg'
                        // 支持 HEIC/HEIF 自动转 JPG
                        if (f.type === 'image/heic' || f.type === 'image/heif' || /\.heic$/i.test(f.name) || /\.heif$/i.test(f.name)) {
                          message.loading({ content: '正在转换 HEIC 图片为 JPG...', key: 'heic' })
                          // 动态加载 heic2any（通过 CDN），避免安装依赖
                          const ensureHeic2Any = () =>
                            new Promise<any>((resolve, reject) => {
                              // @ts-ignore
                              if (window.heic2any) return resolve((window as any).heic2any)
                              const script = document.createElement('script')
                              script.src = 'https://unpkg.com/heic2any/dist/heic2any.min.js'
                              script.async = true
                              script.onload = () => {
                                // @ts-ignore
                                if (window.heic2any) resolve((window as any).heic2any)
                                else reject(new Error('heic2any 未加载'))
                              }
                              script.onerror = () => reject(new Error('heic2any 加载失败'))
                              document.body.appendChild(script)
                            })
                          const heic2any = await ensureHeic2Any()
                          const jpgBlob: Blob = await heic2any({ blob: f, toType: 'image/jpeg', quality: 0.92 })
                          uploadFileObj = new File([jpgBlob], (f.name.replace(/\.(heic|heif)$/i, '') || 'avatar') + '.jpg', { type: 'image/jpeg' })
                          targetExt = 'jpg'
                          message.success({ content: '已转换为 JPG', key: 'heic', duration: 1.2 })
                        }
                        // 非 HEIC 情况：只允许 JPG/PNG
                        if (!['image/png', 'image/jpeg'].includes(uploadFileObj.type)) {
                          message.error('仅支持 JPG/PNG/HEIC（自动转JPG）格式')
                          onError && onError(new Error('Unsupported type'))
                          return
                        }
                        if (uploadFileObj.size > 2 * 1024 * 1024) {
                          message.error('图片大小请小于 2MB')
                          onError && onError(new Error('Too large'))
                          return
                        }
                        const app = await getCloudbaseApp()
                        const ext = targetExt || uploadFileObj.name.split('.').pop() || 'jpg'
                        const key = `avatars/${user?.id || 'u'}/${Date.now()}.${ext}`
                        // 兼容不同 SDK 版本：优先 storage().uploadFile，失败则回退 app.uploadFile
                        // 通过云函数上传（避免浏览器SDK兼容性问题）
                        const toBase64 = (blob: Blob) =>
                          new Promise<string>((resolve, reject) => {
                            const reader = new FileReader()
                            reader.onload = () => resolve((reader.result as string) || '')
                            reader.onerror = reject
                            reader.readAsDataURL(blob)
                          })
                        const b64 = await toBase64(uploadFileObj)
                        const upRes = await systemAPI.uploadAvatar({ base64: b64, ext: targetExt })
                        if (upRes.code !== 0) {
                          throw new Error(upRes.message || '上传失败')
                        }
                        const fileID = upRes.data.fileID
                        const url = upRes.data.url
                        setAvatarFileId(fileID)
                        setAvatarUrl(url)
                        // 保存 fileID（入库），并获取临时可访问链接用于预览
                        setAvatarFileId(res.fileID)
                        onSuccess && onSuccess({}, new XMLHttpRequest())
                        message.success('头像已上传')
                      } catch (e: any) {
                        // eslint-disable-next-line no-console
                        console.error('[avatar-upload] failed', e)
                        onError && onError(e as any)
                        const msg = e?.message || e?.msg || '上传失败'
                        message.error(msg)
                      }
                    }}
                  >
                    <Button size="small">上传头像</Button>
                  </Upload>
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                {user?.name}
              </div>
              <Tag color={
                user?.role === 'system_admin' ? 'red' :
                user?.role === 'platform_operator' ? 'purple' :
                user?.role === 'carbon_specialist' ? 'blue' :
                user?.role === 'government_partner' ? 'cyan' :
                user?.role === 'restaurant_admin' ? 'green' : 'default'
              }>
                {user?.role === 'system_admin' ? '系统管理员' :
                 user?.role === 'platform_operator' ? '平台运营' :
                 user?.role === 'carbon_specialist' ? '碳核算专员' :
                 user?.role === 'government_partner' ? '政府/外部合作方' :
                 user?.role === 'restaurant_admin' ? '餐厅管理员' : (user?.role || '管理员')}
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
                  <Tag color={
                    user?.role === 'system_admin' ? 'red' :
                    user?.role === 'platform_operator' ? 'purple' :
                    user?.role === 'carbon_specialist' ? 'blue' :
                    user?.role === 'government_partner' ? 'cyan' :
                    user?.role === 'restaurant_admin' ? 'green' : 'default'
                  }>
                    {user?.role === 'system_admin' ? '系统管理员' :
                     user?.role === 'platform_operator' ? '平台运营' :
                     user?.role === 'carbon_specialist' ? '碳核算专员' :
                     user?.role === 'government_partner' ? '政府/外部合作方' :
                     user?.role === 'restaurant_admin' ? '餐厅管理员' : (user?.role || '管理员')}
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

