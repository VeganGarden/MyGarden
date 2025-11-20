import { systemAPI } from '@/services/cloudbase'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { getCloudbaseApp } from '@/utils/cloudbase-init'
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
  Upload,
  message,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const Profile: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAppSelector((state: any) => state.auth)
  const { currentTenant, restaurants } = useAppSelector((state: any) => state.tenant)
  const dispatch = useAppDispatch()
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined) // 用于预览（临时链接）
  const [avatarFileId, setAvatarFileId] = useState<string | undefined>(undefined) // 存库用（fileID）

  const roleMap: Record<string, string> = {
    system_admin: t('pages.profile.roles.systemAdmin'),
    platform_operator: t('pages.profile.roles.platformOperator'),
    carbon_specialist: t('pages.profile.roles.carbonSpecialist'),
    government_partner: t('pages.profile.roles.governmentPartner'),
    restaurant_admin: t('pages.profile.roles.restaurantAdmin'),
  }

  const certificationLevelMap: Record<string, string> = {
    gold: t('pages.profile.certificationLevels.gold'),
    silver: t('pages.profile.certificationLevels.silver'),
    platinum: t('pages.profile.certificationLevels.platinum'),
    bronze: t('pages.profile.certificationLevels.bronze'),
  }

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
        message.error(res.message || t('common.updateFailed'))
        return
      }
      
      // 更新本地状态
      const updatedUser = {
        ...user,
        ...values,
        avatarUrl,
      }
      dispatch(setCredentials({ user: updatedUser, token: user.token || '' }))
      message.success(t('pages.profile.messages.updateSuccess'))
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
                          message.loading({ content: t('pages.profile.upload.convertingHeic'), key: 'heic' })
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
                          message.success({ content: t('pages.profile.upload.convertedToJpg'), key: 'heic', duration: 1.2 })
                        }
                        // 非 HEIC 情况：只允许 JPG/PNG
                        if (!['image/png', 'image/jpeg'].includes(uploadFileObj.type)) {
                          message.error(t('pages.profile.upload.unsupportedFormat'))
                          onError && onError(new Error('Unsupported type'))
                          return
                        }
                        if (uploadFileObj.size > 2 * 1024 * 1024) {
                          message.error(t('pages.profile.upload.fileTooLarge'))
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
                        onSuccess && onSuccess({}, new XMLHttpRequest())
                        message.success(t('pages.profile.upload.uploadSuccess'))
                      } catch (e: any) {
                        // eslint-disable-next-line no-console
                        console.error('[avatar-upload] failed', e)
                        onError && onError(e as any)
                        const msg = e?.message || e?.msg || t('pages.profile.upload.uploadFailed')
                        message.error(msg)
                      }
                    }}
                  >
                    <Button size="small">{t('pages.profile.upload.uploadAvatar')}</Button>
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
                {roleMap[user?.role || ''] || user?.role || t('pages.profile.roles.admin')}
              </Tag>
            </div>
          </Col>
          <Col span={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{t('pages.profile.title')}</h2>
              {!isEditing ? (
                <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                  {t('common.edit')}
                </Button>
              ) : (
                <Space>
                  <Button onClick={handleCancel}>{t('common.cancel')}</Button>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                    {t('common.save')}
                  </Button>
                </Space>
              )}
            </div>

            {isEditing ? (
              <Form form={form} layout="vertical">
                <Form.Item
                  name="name"
                  label={t('pages.profile.form.fields.name')}
                  rules={[{ required: true, message: t('pages.profile.form.messages.nameRequired') }]}
                >
                  <Input prefix={<UserOutlined />} placeholder={t('pages.profile.form.placeholders.name')} />
                </Form.Item>
                <Form.Item
                  name="email"
                  label={t('pages.profile.form.fields.email')}
                  rules={[
                    { type: 'email', message: t('pages.profile.form.messages.emailInvalid') },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder={t('pages.profile.form.placeholders.email')} />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label={t('pages.profile.form.fields.phone')}
                  rules={[
                    { pattern: /^1[3-9]\d{9}$/, message: t('pages.profile.form.messages.phoneInvalid') },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder={t('pages.profile.form.placeholders.phone')} />
                </Form.Item>
              </Form>
            ) : (
              <Descriptions column={1} bordered>
                <Descriptions.Item label={t('pages.profile.detail.fields.userId')}>{user?.id}</Descriptions.Item>
                <Descriptions.Item label={t('pages.profile.detail.fields.name')}>{user?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('pages.profile.detail.fields.email')}>
                  {user?.email || <span style={{ color: '#999' }}>{t('pages.profile.detail.notSet')}</span>}
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.profile.detail.fields.phone')}>
                  {user?.phone || <span style={{ color: '#999' }}>{t('pages.profile.detail.notSet')}</span>}
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.profile.detail.fields.role')}>
                  <Tag color={
                    user?.role === 'system_admin' ? 'red' :
                    user?.role === 'platform_operator' ? 'purple' :
                    user?.role === 'carbon_specialist' ? 'blue' :
                    user?.role === 'government_partner' ? 'cyan' :
                    user?.role === 'restaurant_admin' ? 'green' : 'default'
                  }>
                    {roleMap[user?.role || ''] || user?.role || t('pages.profile.roles.admin')}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.profile.detail.fields.tenantId')}>
                  {user?.tenantId || <span style={{ color: '#999' }}>{t('pages.profile.detail.none')}</span>}
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
              <span>{t('pages.profile.tenant.title')}</span>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label={t('pages.profile.tenant.fields.name')}>{currentTenant.name}</Descriptions.Item>
            <Descriptions.Item label={t('pages.profile.tenant.fields.id')}>{currentTenant.id}</Descriptions.Item>
            <Descriptions.Item label={t('pages.profile.tenant.fields.restaurantCount')} span={2}>
              {t('pages.profile.tenant.restaurantCount', { count: restaurants.length })}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">{t('pages.profile.tenant.myRestaurants')}</Divider>
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
                          {certificationLevelMap[restaurant.certificationLevel] || certificationLevelMap.bronze}
                        </Tag>
                      )}
                      <Tag color={restaurant.status === 'active' ? 'success' : 'default'}>
                        {restaurant.status === 'active' ? t('pages.profile.restaurant.status.active') : t('pages.profile.restaurant.status.inactive')}
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

