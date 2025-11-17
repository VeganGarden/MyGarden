import { onboardingAPI } from '@/services/cloudbase'
import { Button, Card, Form, Input, InputNumber, message } from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const OnboardingApply: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const res = await onboardingAPI.apply(values)
      if (res.code === 0) {
        message.success(t('pages.onboarding.apply.messages.submitSuccess'))
        navigate('/login')
      } else {
        message.error(res.message || t('pages.onboarding.apply.messages.submitFailed'))
      }
    } catch (e: any) {
      message.error(e.message || t('pages.onboarding.apply.messages.networkError'))
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
        padding: 24,
      }}
    >
      <Card title={t('pages.onboarding.apply.title')} style={{ width: 560 }}>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            label={t('pages.onboarding.apply.form.fields.desiredUsername')}
            name="desiredUsername"
            rules={[
              { required: true, message: t('pages.onboarding.apply.form.messages.desiredUsernameRequired') },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_\-]{3,20}$/, message: t('pages.onboarding.apply.form.messages.desiredUsernamePattern') },
            ]}
            tooltip={t('pages.onboarding.apply.form.tooltips.desiredUsername')}
          >
            <Input placeholder={t('pages.onboarding.apply.form.placeholders.desiredUsername')} />
          </Form.Item>
          <Form.Item
            label={t('pages.onboarding.apply.form.fields.organizationName')}
            name="organizationName"
            rules={[{ required: true, message: t('pages.onboarding.apply.form.messages.organizationNameRequired') }]}
          >
            <Input placeholder={t('pages.onboarding.apply.form.placeholders.organizationName')} />
          </Form.Item>
          <Form.Item
            label={t('pages.onboarding.apply.form.fields.contactName')}
            name="contactName"
            rules={[{ required: true, message: t('pages.onboarding.apply.form.messages.contactNameRequired') }]}
          >
            <Input placeholder={t('pages.onboarding.apply.form.placeholders.contactName')} />
          </Form.Item>
          <Form.Item
            label={t('pages.onboarding.apply.form.fields.contactPhone')}
            name="contactPhone"
            rules={[
              { required: true, message: t('pages.onboarding.apply.form.messages.contactPhoneRequired') },
              { pattern: /^[0-9+\-()\s]{6,20}$/, message: t('pages.onboarding.apply.form.messages.contactPhoneInvalid') },
            ]}
          >
            <Input placeholder={t('pages.onboarding.apply.form.placeholders.contactPhone')} />
          </Form.Item>
          <Form.Item label={t('pages.onboarding.apply.form.fields.contactEmail')} name="contactEmail" rules={[{ type: 'email', message: t('pages.onboarding.apply.form.messages.contactEmailInvalid') }]}>
            <Input placeholder={t('common.optional')} />
          </Form.Item>
          <Form.Item label={t('pages.onboarding.apply.form.fields.restaurantCount')} name="restaurantCount">
            <InputNumber min={1} style={{ width: '100%' }} placeholder={t('pages.onboarding.apply.form.placeholders.restaurantCount')} />
          </Form.Item>
          <Form.Item label={t('pages.onboarding.apply.form.fields.city')} name="city">
            <Input placeholder={t('pages.onboarding.apply.form.placeholders.city')} />
          </Form.Item>
          <Form.Item label={t('pages.onboarding.apply.form.fields.note')} name="note">
            <Input.TextArea rows={4} placeholder={t('pages.onboarding.apply.form.placeholders.note')} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {t('pages.onboarding.apply.buttons.submit')}
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            {t('pages.onboarding.apply.footer.hasAccount')} <a href="/login">{t('pages.onboarding.apply.footer.backToLogin')}</a>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default OnboardingApply


