/**
 * 添加客户页面
 */

import { customerAPI } from '@/services/vegetarianPersonnel'
import { useAppSelector } from '@/store/hooks'
import type { CustomerFormData } from '@/types/vegetarianPersonnel'
import { CustomerVegetarianType, DataQuality, VegetarianFrequency, VegetarianYears } from '@/types/vegetarianPersonnel'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, DatePicker, Form, Input, Row, Select, Space, Switch, message } from 'antd'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const CustomerAddPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isVegetarian, setIsVegetarian] = useState(false)

  const handleSubmit = async (values: any) => {
    if (!currentRestaurantId || !currentTenant) {
      message.warning(t('pages.vegetarianPersonnel.customerAdd.messages.noRestaurant'))
      return
    }

    setLoading(true)
    try {
      const tenantId = currentTenant.id || currentTenant._id || ''
      const now = new Date()
      
      // 处理素食开始日期和年份
      let vegetarianStartDate: string | undefined
      let vegetarianStartYear: number | undefined
      let dataQuality: DataQuality | undefined

      if (isVegetarian && values.vegetarianStartDate) {
        // 优先使用精确日期
        vegetarianStartDate = dayjs(values.vegetarianStartDate).format('YYYY-MM-DD')
        vegetarianStartYear = dayjs(values.vegetarianStartDate).year()
        dataQuality = DataQuality.PRECISE_DATE
      } else if (isVegetarian && values.vegetarianStartYear) {
        // 使用年份
        vegetarianStartYear = values.vegetarianStartYear
        dataQuality = DataQuality.PRECISE_YEAR
      } else if (isVegetarian && values.vegetarianYears) {
        // 使用年限范围估算
        dataQuality = DataQuality.RANGE_ESTIMATE
      }

      const formData: CustomerFormData = {
        restaurantId: currentRestaurantId,
        tenantId: tenantId,
        basicInfo: {
          nickname: values.nickname,
          phone: values.phone
        },
        vegetarianInfo: {
          isVegetarian: isVegetarian,
          vegetarianType: isVegetarian ? values.vegetarianType : 'other',
          vegetarianYears: isVegetarian ? values.vegetarianYears : VegetarianYears.LESS_THAN_1,
          vegetarianStartYear: vegetarianStartYear,
          vegetarianStartDate: vegetarianStartDate,
          vegetarianFrequency: isVegetarian ? values.vegetarianFrequency : undefined,
          dataQuality: dataQuality
        }
      }

      const result = await customerAPI.createOrUpdate(formData)
      if (result.success) {
        message.success(t('pages.vegetarianPersonnel.customerAdd.messages.createSuccess'))
        navigate('/vegetarian-personnel/customers')
      } else {
        message.error(result.error || t('pages.vegetarianPersonnel.customerAdd.messages.createFailed'))
      }
    } catch (error: any) {
      console.error('创建客户异常:', error)
      message.error(error.message || t('pages.vegetarianPersonnel.customerAdd.messages.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vegetarian-personnel/customers')}>
            {t('pages.vegetarianPersonnel.customerAdd.buttons.back')}
          </Button>
          <span>{t('pages.vegetarianPersonnel.customerAdd.title')}</span>
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
              name="nickname"
              label={t('pages.vegetarianPersonnel.customerAdd.form.fields.nickname')}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.customerAdd.form.placeholders.nickname')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label={t('pages.vegetarianPersonnel.customerAdd.form.fields.phone')}
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: t('pages.vegetarianPersonnel.customerAdd.form.rules.phoneInvalid') }
              ]}
            >
              <Input placeholder={t('pages.vegetarianPersonnel.customerAdd.form.placeholders.phone')} maxLength={11} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="isVegetarian"
              label={t('pages.vegetarianPersonnel.customerAdd.form.fields.isVegetarian')}
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
                      vegetarianStartDate: undefined,
                      vegetarianStartYear: undefined,
                      vegetarianYears: undefined,
                      vegetarianFrequency: undefined
                    })
                  }
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        {isVegetarian && (
          <>
            <Alert
              message={t('pages.vegetarianPersonnel.customerAdd.tips.preciseDate')}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="vegetarianType"
                  label={t('pages.vegetarianPersonnel.customerAdd.form.fields.vegetarianType')}
                  rules={[{ required: true, message: t('pages.vegetarianPersonnel.customerAdd.form.rules.vegetarianTypeRequired') }]}
                >
                  <Select placeholder={t('pages.vegetarianPersonnel.customerAdd.form.placeholders.vegetarianType')}>
                    <Select.Option value={CustomerVegetarianType.PURE}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianTypes.pure')}</Select.Option>
                    <Select.Option value={CustomerVegetarianType.OVO_LACTO}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianTypes.ovo_lacto')}</Select.Option>
                    <Select.Option value={CustomerVegetarianType.REGULAR}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianTypes.regular')}</Select.Option>
                    <Select.Option value={CustomerVegetarianType.OCCASIONAL}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianTypes.occasional')}</Select.Option>
                    <Select.Option value={CustomerVegetarianType.OTHER}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianTypes.other')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="vegetarianFrequency"
                  label={t('pages.vegetarianPersonnel.customerAdd.form.fields.vegetarianFrequency')}
                >
                  <Select placeholder={t('pages.vegetarianPersonnel.customerAdd.form.placeholders.vegetarianFrequency')} allowClear>
                    <Select.Option value={VegetarianFrequency.DAILY}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianFrequency.daily')}</Select.Option>
                    <Select.Option value={VegetarianFrequency.WEEKLY}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianFrequency.weekly')}</Select.Option>
                    <Select.Option value={VegetarianFrequency.OCCASIONAL}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianFrequency.occasional')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="vegetarianStartDate"
                  label={t('pages.vegetarianPersonnel.customerAdd.form.fields.vegetarianStartDate')}
                  tooltip={t('pages.vegetarianPersonnel.customerAdd.form.tooltips.vegetarianStartDate')}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    disabledDate={(current) => current && current > dayjs().endOf('day')}
                    placeholder={t('pages.vegetarianPersonnel.customerAdd.form.placeholders.vegetarianStartDate')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="vegetarianStartYear"
                  label={t('pages.vegetarianPersonnel.customerAdd.form.fields.vegetarianStartYear')}
                  tooltip={t('pages.vegetarianPersonnel.customerAdd.form.tooltips.vegetarianStartYear')}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!getFieldValue('vegetarianStartDate') && !value && !getFieldValue('vegetarianYears')) {
                          return Promise.reject(new Error(t('pages.vegetarianPersonnel.customerAdd.form.rules.vegetarianStartDateOrYearOrYearsRequired')))
                        }
                        if (value && (value < 1900 || value > new Date().getFullYear())) {
                          return Promise.reject(new Error(t('pages.vegetarianPersonnel.customerAdd.form.rules.yearRange', { year: new Date().getFullYear() })))
                        }
                        return Promise.resolve()
                      }
                    })
                  ]}
                >
                  <Input 
                    type="number" 
                    placeholder={t('pages.vegetarianPersonnel.customerAdd.form.placeholders.vegetarianStartYear', { year: new Date().getFullYear() - 5 })} 
                    min={1900} 
                    max={new Date().getFullYear()} 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="vegetarianYears"
                  label={t('pages.vegetarianPersonnel.customerAdd.form.fields.vegetarianYears')}
                  tooltip={t('pages.vegetarianPersonnel.customerAdd.form.tooltips.vegetarianYears')}
                >
                  <Select placeholder={t('pages.vegetarianPersonnel.customerAdd.form.placeholders.vegetarianYears')} allowClear>
                    <Select.Option value={VegetarianYears.LESS_THAN_1}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianYears.less_than_1')}</Select.Option>
                    <Select.Option value={VegetarianYears.YEAR_1_2}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianYears.1_2')}</Select.Option>
                    <Select.Option value={VegetarianYears.YEAR_3_5}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianYears.3_5')}</Select.Option>
                    <Select.Option value={VegetarianYears.YEAR_5_10}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianYears.5_10')}</Select.Option>
                    <Select.Option value={VegetarianYears.MORE_THAN_10}>{t('pages.vegetarianPersonnel.customerAdd.form.vegetarianYears.more_than_10')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Form.Item>
          <Space>
            <Button onClick={() => navigate('/vegetarian-personnel/customers')}>
              {t('pages.vegetarianPersonnel.customerAdd.buttons.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('pages.vegetarianPersonnel.customerAdd.buttons.submit')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default CustomerAddPage

