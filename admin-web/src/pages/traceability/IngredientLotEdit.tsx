/**
 * 食材批次编辑页
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, Form, Input, Select, Button, Space, message, Row, Col, DatePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { ingredientLotAPI } from '@/services/traceability'
import type { IngredientLot, IngredientLotFormData } from '@/types/traceability'
import dayjs from 'dayjs'

const IngredientLotEditPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [lot, setLot] = useState<IngredientLot | null>(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await ingredientLotAPI.get(id, 'default')
      if (result.success && result.data) {
        setLot(result.data)
        form.setFieldsValue({
          ingredientId: result.data.ingredientId,
          supplierId: result.data.supplierId,
          batchNumber: result.data.batchNumber,
          harvestDate: result.data.harvestDate ? dayjs(result.data.harvestDate) : null,
          productionDate: result.data.productionDate ? dayjs(result.data.productionDate) : null,
          expiryDate: result.data.expiryDate ? dayjs(result.data.expiryDate) : null,
          quantity: result.data.quantity,
          unit: result.data.unit,
          province: result.data.origin?.province,
          city: result.data.origin?.city,
          district: result.data.origin?.district,
          farmName: result.data.origin?.farmName,
          restaurantId: result.data.inventory?.restaurantId
        })
      } else {
        message.error(result.error || t('pages.traceability.ingredientLotEdit.messages.loadFailed'))
        navigate('/traceability/lots')
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    if (!id || !lot) return
    setLoading(true)
    try {
      const formData: Partial<IngredientLotFormData> = {
        ingredientId: values.ingredientId,
        supplierId: values.supplierId,
        batchNumber: values.batchNumber,
        harvestDate: values.harvestDate ? values.harvestDate.toDate() : undefined,
        productionDate: values.productionDate ? values.productionDate.toDate() : undefined,
        expiryDate: values.expiryDate ? values.expiryDate.toDate() : undefined,
        quantity: values.quantity,
        unit: values.unit,
        origin: {
          province: values.province,
          city: values.city,
          district: values.district,
          farmName: values.farmName
        },
        restaurantId: values.restaurantId
      }

      const result = await ingredientLotAPI.update(id, lot.tenantId, formData)
      if (result.success) {
        message.success(t('pages.traceability.ingredientLotEdit.messages.updateSuccess'))
        navigate(`/traceability/lots/${id}`)
      } else {
        message.error(result.error || t('pages.traceability.ingredientLotEdit.messages.updateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  if (!lot) {
    return <div>{t('common.loading')}</div>
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/traceability/lots/${id}`)}>
            {t('common.back')}
          </Button>
          <span>{t('pages.traceability.ingredientLotEdit.title')}</span>
        </Space>
      }
      loading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
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
              {t('common.save')}
            </Button>
            <Button onClick={() => navigate(`/traceability/lots/${id}`)}>
              {t('common.cancel')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default IngredientLotEditPage

