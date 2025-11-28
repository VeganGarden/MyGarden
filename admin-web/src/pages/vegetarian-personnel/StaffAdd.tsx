/**
 * 添加员工页面
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, message, Row, Col, Switch } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import { staffAPI } from '@/services/vegetarianPersonnel'
import type { StaffFormData } from '@/types/vegetarianPersonnel'
import { StaffVegetarianType, VegetarianReason } from '@/types/vegetarianPersonnel'
import dayjs from 'dayjs'

const StaffAddPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isVegetarian, setIsVegetarian] = useState(false)

  const handleSubmit = async (values: any) => {
    if (!currentRestaurantId || !currentTenant) {
      message.warning(t('pages.vegetarianPersonnel.staffAdd.messages.noRestaurant'))
      return
    }

    setLoading(true)
    try {
      const tenantId = currentTenant.id || currentTenant._id || ''
      const formData: StaffFormData = {
        restaurantId: currentRestaurantId,
        tenantId: tenantId,
        basicInfo: {
          name: values.name,
          position: values.position,
          joinDate: values.joinDate ? dayjs(values.joinDate).format('YYYY-MM-DD') : new Date().toISOString(),
          phone: values.phone,
          email: values.email
        },
        vegetarianInfo: {
          isVegetarian: isVegetarian,
          vegetarianType: isVegetarian ? values.vegetarianType : undefined,
          vegetarianStartYear: isVegetarian ? values.vegetarianStartYear : undefined,
          vegetarianReason: isVegetarian ? values.vegetarianReason : undefined,
          notes: isVegetarian ? values.notes : undefined
        }
      }

      const result = await staffAPI.create(formData)
      if (result.success) {
        message.success(t('pages.vegetarianPersonnel.staffAdd.messages.createSuccess', { name: values.name }))
        navigate('/vegetarian-personnel/staff')
      } else {
        message.error(result.error || t('pages.vegetarianPersonnel.staffAdd.messages.createFailed'))
      }
    } catch (error: any) {
      console.error('创建员工异常:', error)
      message.error(error.message || t('pages.vegetarianPersonnel.staffAdd.messages.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vegetarian-personnel/staff')}>
            {t('pages.vegetarianPersonnel.staffAdd.buttons.back')}
          </Button>
          <span>{t('pages.vegetarianPersonnel.staffAdd.title')}</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        validateTrigger={['onChange', 'onBlur']}
        initialValues={{
          isVegetarian: false
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label={t('pages.vegetarianPersonnel.staffAdd.form.fields.name')}
              rules={[{ required: true, message: t('pages.vegetarianPersonnel.staffAdd.form.rules.nameRequired') }]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.staffAdd.form.placeholders.name')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="position"
              label={t('pages.vegetarianPersonnel.staffAdd.form.fields.position')}
              rules={[{ required: true, message: t('pages.vegetarianPersonnel.staffAdd.form.rules.positionRequired') }]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.staffAdd.form.placeholders.position')} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="phone"
              label={t('pages.vegetarianPersonnel.staffAdd.form.fields.phone')}
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: t('pages.vegetarianPersonnel.staffAdd.form.rules.phoneInvalid') }
              ]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.staffAdd.form.placeholders.phone')} maxLength={11} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label={t('pages.vegetarianPersonnel.staffAdd.form.fields.email')}
              rules={[
                { type: 'email', message: t('pages.vegetarianPersonnel.staffAdd.form.rules.emailInvalid') }
              ]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.staffAdd.form.placeholders.email')} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="joinDate"
              label={t('pages.vegetarianPersonnel.staffAdd.form.fields.joinDate')}
              rules={[{ required: true, message: t('pages.vegetarianPersonnel.staffAdd.form.rules.joinDateRequired') }]}
            >
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="isVegetarian"
              label={t('pages.vegetarianPersonnel.staffAdd.form.fields.isVegetarian')}
              valuePropName="checked"
            >
              <Switch
                checked={isVegetarian}
                onChange={(checked) => {
                  setIsVegetarian(checked)
                  form.setFieldsValue({ isVegetarian: checked })
                  if (!checked) {
                    form.setFieldsValue({
                      vegetarianType: undefined,
                      vegetarianStartYear: undefined,
                      vegetarianReason: undefined,
                      notes: undefined
                    })
                  }
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        {isVegetarian && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="vegetarianType"
                  label={t('pages.vegetarianPersonnel.staffAdd.form.fields.vegetarianType')}
                  rules={[{ required: true, message: t('pages.vegetarianPersonnel.staffAdd.form.rules.vegetarianTypeRequired') }]}
                >
                  <Select placeholder={t('pages.vegetarianPersonnel.staffAdd.form.placeholders.vegetarianType')}>
                    <Select.Option value={StaffVegetarianType.PURE}>{t('pages.vegetarianPersonnel.staffAdd.form.vegetarianTypes.pure')}</Select.Option>
                    <Select.Option value={StaffVegetarianType.OVO_LACTO}>{t('pages.vegetarianPersonnel.staffAdd.form.vegetarianTypes.ovo_lacto')}</Select.Option>
                    <Select.Option value={StaffVegetarianType.FLEXIBLE}>{t('pages.vegetarianPersonnel.staffAdd.form.vegetarianTypes.flexible')}</Select.Option>
                    <Select.Option value={StaffVegetarianType.OTHER}>{t('pages.vegetarianPersonnel.staffAdd.form.vegetarianTypes.other')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="vegetarianStartYear"
                  label={t('pages.vegetarianPersonnel.staffAdd.form.fields.vegetarianStartYear')}
                  rules={[
                    { required: true, message: t('pages.vegetarianPersonnel.staffAdd.form.rules.vegetarianStartYearRequired') },
                    { type: 'number', min: 1900, max: new Date().getFullYear(), message: t('pages.vegetarianPersonnel.staffAdd.form.rules.yearRange', { year: new Date().getFullYear() }) }
                  ]}
                >
                  <Input 
                    type="number" 
                    placeholder={t('pages.vegetarianPersonnel.staffAdd.form.placeholders.vegetarianStartYear', { year: new Date().getFullYear() - 5 })} 
                    min={1900} 
                    max={new Date().getFullYear()} 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="vegetarianReason"
                  label={t('pages.vegetarianPersonnel.staffAdd.form.fields.vegetarianReason')}
                >
                  <Select placeholder={t('pages.vegetarianPersonnel.staffAdd.form.placeholders.vegetarianReason')} allowClear>
                    <Select.Option value={VegetarianReason.HEALTH}>{t('pages.vegetarianPersonnel.staffAdd.form.vegetarianReasons.health')}</Select.Option>
                    <Select.Option value={VegetarianReason.ENVIRONMENT}>{t('pages.vegetarianPersonnel.staffAdd.form.vegetarianReasons.environment')}</Select.Option>
                    <Select.Option value={VegetarianReason.FAITH}>{t('pages.vegetarianPersonnel.staffAdd.form.vegetarianReasons.faith')}</Select.Option>
                    <Select.Option value={VegetarianReason.OTHER}>{t('pages.vegetarianPersonnel.staffAdd.form.vegetarianReasons.other')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="notes"
                  label={t('pages.vegetarianPersonnel.staffAdd.form.fields.notes')}
                >
                  <Input.TextArea rows={3} placeholder={t('pages.vegetarianPersonnel.staffAdd.form.placeholders.notes')} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Form.Item>
          <Space>
            <Button onClick={() => navigate('/vegetarian-personnel/staff')}>
              {t('pages.vegetarianPersonnel.staffAdd.buttons.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('pages.vegetarianPersonnel.staffAdd.buttons.submit')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default StaffAddPage

