/**
 * 食材批次添加页
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, Form, Input, Select, Button, Space, message, Row, Col, DatePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { ingredientLotAPI } from '@/services/traceability'
import type { IngredientLotFormData } from '@/types/traceability'
import dayjs from 'dayjs'

const IngredientLotAddPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const formData: IngredientLotFormData & { tenantId: string } = {
        tenantId: 'default',
        ingredientId: values.ingredientId,
        supplierId: values.supplierId,
        batchNumber: values.batchNumber,
        harvestDate: values.harvestDate ? values.harvestDate.toDate() : new Date(),
        productionDate: values.productionDate ? values.productionDate.toDate() : undefined,
        expiryDate: values.expiryDate ? values.expiryDate.toDate() : undefined,
        quantity: values.quantity,
        unit: values.unit || 'kg',
        origin: {
          province: values.province,
          city: values.city,
          district: values.district,
          farmName: values.farmName
        },
        quality: {
          inspectionResult: 'pending'
        },
        restaurantId: values.restaurantId
      }

      const result = await ingredientLotAPI.create(formData)
      if (result.success) {
        message.success(t('pages.traceability.ingredientLotAdd.messages.createSuccess'))
        navigate(`/traceability/lots/${result.data?.lotId}`)
      } else {
        message.error(result.error || t('pages.traceability.ingredientLotAdd.messages.createFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/lots')}>
            {t('common.back')}
          </Button>
          <span>{t('pages.traceability.ingredientLotAdd.title')}</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          unit: 'kg'
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="ingredientId"
              label={t('pages.traceability.ingredientLotAdd.fields.ingredientId')}
              rules={[{ required: true, message: t('pages.traceability.ingredientLotAdd.messages.ingredientIdRequired') }]}
            >
              <Input placeholder={t('pages.traceability.ingredientLotAdd.placeholders.ingredientId')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="supplierId"
              label={t('pages.traceability.ingredientLotAdd.fields.supplierId')}
              rules={[{ required: true, message: t('pages.traceability.ingredientLotAdd.messages.supplierIdRequired') }]}
            >
              <Input placeholder={t('pages.traceability.ingredientLotAdd.placeholders.supplierId')} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="batchNumber"
              label={t('pages.traceability.ingredientLotAdd.fields.batchNumber')}
              rules={[{ required: true, message: t('pages.traceability.ingredientLotAdd.messages.batchNumberRequired') }]}
            >
              <Input placeholder={t('pages.traceability.ingredientLotAdd.placeholders.batchNumber')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="harvestDate"
              label={t('pages.traceability.ingredientLotAdd.fields.harvestDate')}
              rules={[{ required: true, message: t('pages.traceability.ingredientLotAdd.messages.harvestDateRequired') }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="productionDate" label={t('pages.traceability.ingredientLotAdd.fields.productionDate')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="expiryDate" label={t('pages.traceability.ingredientLotAdd.fields.expiryDate')}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="quantity"
              label={t('pages.traceability.ingredientLotAdd.fields.quantity')}
              rules={[{ required: true, message: t('pages.traceability.ingredientLotAdd.messages.quantityRequired') }]}
            >
              <Input type="number" placeholder={t('pages.traceability.ingredientLotAdd.placeholders.quantity')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="unit"
              label={t('pages.traceability.ingredientLotAdd.fields.unit')}
              rules={[{ required: true, message: t('pages.traceability.ingredientLotAdd.messages.unitRequired') }]}
            >
              <Select>
                <Select.Option value="kg">kg</Select.Option>
                <Select.Option value="t">{t('pages.traceability.ingredientLotAdd.units.ton')}</Select.Option>
                <Select.Option value="件">{t('pages.traceability.ingredientLotAdd.units.piece')}</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label={t('pages.traceability.ingredientLotAdd.sections.origin')}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="province" label={t('pages.traceability.ingredientLotAdd.fields.province')}>
                <Input placeholder={t('pages.traceability.ingredientLotAdd.placeholders.province')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label={t('pages.traceability.ingredientLotAdd.fields.city')}>
                <Input placeholder={t('pages.traceability.ingredientLotAdd.placeholders.city')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label={t('pages.traceability.ingredientLotAdd.fields.district')}>
                <Input placeholder={t('pages.traceability.ingredientLotAdd.placeholders.district')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="farmName" label={t('pages.traceability.ingredientLotAdd.fields.farmName')}>
            <Input placeholder={t('pages.traceability.ingredientLotAdd.placeholders.farmName')} />
          </Form.Item>
        </Form.Item>

        <Form.Item name="restaurantId" label={t('pages.traceability.ingredientLotAdd.fields.restaurantId')}>
          <Input placeholder={t('pages.traceability.ingredientLotAdd.placeholders.restaurantId')} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('common.submit')}
            </Button>
            <Button onClick={() => navigate('/traceability/lots')}>
              {t('common.cancel')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default IngredientLotAddPage

