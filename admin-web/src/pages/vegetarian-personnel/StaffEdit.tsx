/**
 * 编辑员工页面
 */

import { staffAPI } from '@/services/vegetarianPersonnel'
import { useAppSelector } from '@/store/hooks'
import type { Staff } from '@/types/vegetarianPersonnel'
import { StaffVegetarianType, VegetarianReason } from '@/types/vegetarianPersonnel'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, Row, Select, Space, Switch, message } from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const StaffEditPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [isVegetarian, setIsVegetarian] = useState(false)

  useEffect(() => {
    if (id && currentRestaurantId && currentTenant) {
      loadData()
    }
  }, [id, currentRestaurantId, currentTenant])

  const loadData = async () => {
    if (!id || !currentRestaurantId || !currentTenant) {
      message.warning(t('pages.vegetarianPersonnel.staffEdit.messages.noRestaurant'))
      return
    }
    setLoading(true)
    try {
      const tenantId = currentTenant.id || currentTenant._id || ''
      const result = await staffAPI.list({
        restaurantId: currentRestaurantId,
        tenantId: tenantId,
        search: id,
        page: 1,
        pageSize: 20
      })
      if (result.success && result.data && result.data.list.length > 0) {
        const staffData = result.data.list.find((s: Staff) => s.staffId === id) || result.data.list[0]
        setStaff(staffData)
        setIsVegetarian(staffData.vegetarianInfo?.isVegetarian || false)
        
        form.setFieldsValue({
          name: staffData.basicInfo.name,
          position: staffData.basicInfo.position,
          phone: staffData.basicInfo.phone,
          email: staffData.basicInfo.email,
          joinDate: staffData.basicInfo.joinDate ? dayjs(staffData.basicInfo.joinDate).format('YYYY-MM-DD') : undefined,
          isVegetarian: staffData.vegetarianInfo?.isVegetarian || false,
          vegetarianType: staffData.vegetarianInfo?.vegetarianType,
          vegetarianStartYear: staffData.vegetarianInfo?.vegetarianStartYear,
          vegetarianReason: staffData.vegetarianInfo?.vegetarianReason,
          notes: staffData.vegetarianInfo?.notes
        })
      } else {
        message.error(t('pages.vegetarianPersonnel.staffEdit.messages.staffNotFound'))
        navigate('/vegetarian-personnel/staff')
      }
    } catch (error: any) {
      message.error(error.message || t('pages.vegetarianPersonnel.staffEdit.messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    if (!id || !staff) return
    setLoading(true)
    try {
      const formData = {
        restaurantId: staff.restaurantId,
        tenantId: staff.tenantId,
        basicInfo: {
          name: values.name,
          position: values.position,
          joinDate: values.joinDate ? dayjs(values.joinDate).format('YYYY-MM-DD') : staff.basicInfo.joinDate,
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

      const result = await staffAPI.update(id, formData)
      if (result.success) {
        message.success(t('pages.vegetarianPersonnel.staffEdit.messages.updateSuccess', { name: values.name }))
        navigate('/vegetarian-personnel/staff')
      } else {
        message.error(result.error || t('pages.vegetarianPersonnel.staffEdit.messages.updateFailed'))
      }
    } catch (error: any) {
      console.error('更新员工信息异常:', error)
      message.error(error.message || t('pages.vegetarianPersonnel.staffEdit.messages.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vegetarian-personnel/staff')}>
            {t('pages.vegetarianPersonnel.staffEdit.buttons.back')}
          </Button>
          <span>{t('pages.vegetarianPersonnel.staffEdit.title')}</span>
        </Space>
      }
      loading={loading && !staff}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        validateTrigger={['onChange', 'onBlur']}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label={t('pages.vegetarianPersonnel.staffEdit.form.fields.name')}
              rules={[
                { required: true, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.nameRequired') },
                { max: 50, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.nameMaxLength') },
                { whitespace: true, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.nameWhitespace') }
              ]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.staffEdit.form.placeholders.name')} maxLength={50} showCount />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="position"
              label={t('pages.vegetarianPersonnel.staffEdit.form.fields.position')}
              rules={[
                { required: true, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.positionRequired') },
                { max: 50, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.positionMaxLength') },
                { whitespace: true, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.positionWhitespace') }
              ]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.staffEdit.form.placeholders.position')} maxLength={50} showCount />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="phone"
              label={t('pages.vegetarianPersonnel.staffEdit.form.fields.phone')}
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.phoneInvalid') }
              ]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.staffEdit.form.placeholders.phone')} maxLength={11} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label={t('pages.vegetarianPersonnel.staffEdit.form.fields.email')}
              rules={[
                { type: 'email', message: t('pages.vegetarianPersonnel.staffEdit.form.rules.emailInvalid') }
              ]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.staffEdit.form.placeholders.email')} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="joinDate"
              label={t('pages.vegetarianPersonnel.staffEdit.form.fields.joinDate')}
              rules={[{ required: true, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.joinDateRequired') }]}
            >
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="isVegetarian"
              label={t('pages.vegetarianPersonnel.staffEdit.form.fields.isVegetarian')}
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
                  label={t('pages.vegetarianPersonnel.staffEdit.form.fields.vegetarianType')}
                  rules={[{ required: true, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.vegetarianTypeRequired') }]}
                >
                  <Select placeholder={t('pages.vegetarianPersonnel.staffEdit.form.placeholders.vegetarianType')}>
                    <Select.Option value={StaffVegetarianType.PURE}>{t('pages.vegetarianPersonnel.staffEdit.form.vegetarianTypes.pure')}</Select.Option>
                    <Select.Option value={StaffVegetarianType.OVO_LACTO}>{t('pages.vegetarianPersonnel.staffEdit.form.vegetarianTypes.ovo_lacto')}</Select.Option>
                    <Select.Option value={StaffVegetarianType.FLEXIBLE}>{t('pages.vegetarianPersonnel.staffEdit.form.vegetarianTypes.flexible')}</Select.Option>
                    <Select.Option value={StaffVegetarianType.OTHER}>{t('pages.vegetarianPersonnel.staffEdit.form.vegetarianTypes.other')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
                  <Col span={12}>
                <Form.Item
                  name="vegetarianStartYear"
                  label={t('pages.vegetarianPersonnel.staffEdit.form.fields.vegetarianStartYear')}
                  rules={[
                    { required: true, message: t('pages.vegetarianPersonnel.staffEdit.form.rules.vegetarianStartYearRequired') },
                    { type: 'number', min: 1900, max: new Date().getFullYear(), message: t('pages.vegetarianPersonnel.staffEdit.form.rules.yearRange', { year: new Date().getFullYear() }) }
                  ]}
                >
                  <Input 
                    type="number" 
                    placeholder={t('pages.vegetarianPersonnel.staffEdit.form.placeholders.vegetarianStartYear', { year: new Date().getFullYear() - 5 })} 
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
                  label={t('pages.vegetarianPersonnel.staffEdit.form.fields.vegetarianReason')}
                >
                  <Select placeholder={t('pages.vegetarianPersonnel.staffEdit.form.placeholders.vegetarianReason')} allowClear>
                    <Select.Option value={VegetarianReason.HEALTH}>{t('pages.vegetarianPersonnel.staffEdit.form.vegetarianReasons.health')}</Select.Option>
                    <Select.Option value={VegetarianReason.ENVIRONMENT}>{t('pages.vegetarianPersonnel.staffEdit.form.vegetarianReasons.environment')}</Select.Option>
                    <Select.Option value={VegetarianReason.FAITH}>{t('pages.vegetarianPersonnel.staffEdit.form.vegetarianReasons.faith')}</Select.Option>
                    <Select.Option value={VegetarianReason.OTHER}>{t('pages.vegetarianPersonnel.staffEdit.form.vegetarianReasons.other')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="notes"
                  label={t('pages.vegetarianPersonnel.staffEdit.form.fields.notes')}
                >
                  <Input.TextArea rows={3} placeholder={t('pages.vegetarianPersonnel.staffEdit.form.placeholders.notes')} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Form.Item>
          <Space>
            <Button onClick={() => navigate('/vegetarian-personnel/staff')}>
              {t('pages.vegetarianPersonnel.staffEdit.buttons.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('pages.vegetarianPersonnel.staffEdit.buttons.submit')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default StaffEditPage

