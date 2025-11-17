/**
 * 供应商添加页
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, Form, Input, Select, Button, Space, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { supplierAPI } from '@/services/traceability'
import type { SupplierFormData } from '@/types/traceability'
import { SupplierType, RiskLevel } from '@/types/traceability'

const SupplierAddPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const formData: SupplierFormData & { tenantId: string } = {
        tenantId: 'default', // 实际应从用户信息获取
        name: values.name,
        type: values.type,
        legalName: values.legalName,
        registrationNumber: values.registrationNumber,
        contact: {
          phone: values.phone,
          email: values.email,
          address: {
            province: values.province,
            city: values.city,
            district: values.district,
            detail: values.detail
          }
        },
        businessInfo: {
          riskLevel: values.riskLevel || RiskLevel.MEDIUM,
          establishedDate: values.establishedDate,
          businessScope: values.businessScope,
          annualCapacity: values.annualCapacity,
          mainProducts: values.mainProducts ? values.mainProducts.split(',').map((s: string) => s.trim()) : []
        }
      }

      const result = await supplierAPI.create(formData)
      if (result.success) {
        message.success(t('pages.traceability.supplierAdd.messages.createSuccess'))
        navigate(`/traceability/suppliers/${result.data?.supplierId}`)
      } else {
        message.error(result.error || t('pages.traceability.supplierAdd.messages.createFailed'))
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
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/suppliers')}>
            {t('common.back')}
          </Button>
          <span>{t('pages.traceability.supplierAdd.title')}</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          riskLevel: RiskLevel.MEDIUM
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label={t('pages.traceability.supplierAdd.fields.name')}
              rules={[{ required: true, message: t('pages.traceability.supplierAdd.messages.nameRequired') }]}
            >
              <Input placeholder={t('pages.traceability.supplierAdd.placeholders.name')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="type"
              label={t('pages.traceability.supplierAdd.fields.type')}
              rules={[{ required: true, message: t('pages.traceability.supplierAdd.messages.typeRequired') }]}
            >
              <Select placeholder={t('pages.traceability.supplierAdd.placeholders.type')}>
                <Select.Option value={SupplierType.FARM}>{t('pages.traceability.supplier.types.farm')}</Select.Option>
                <Select.Option value={SupplierType.PROCESSOR}>{t('pages.traceability.supplier.types.processor')}</Select.Option>
                <Select.Option value={SupplierType.DISTRIBUTOR}>{t('pages.traceability.supplier.types.distributor')}</Select.Option>
                <Select.Option value={SupplierType.OTHER}>{t('pages.traceability.supplier.types.other')}</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="legalName" label={t('pages.traceability.supplierAdd.fields.legalName')}>
              <Input placeholder={t('pages.traceability.supplierAdd.placeholders.legalName')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="registrationNumber" label={t('pages.traceability.supplierAdd.fields.registrationNumber')}>
              <Input placeholder={t('pages.traceability.supplierAdd.placeholders.registrationNumber')} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="riskLevel" label={t('pages.traceability.supplierAdd.fields.riskLevel')}>
          <Select>
            <Select.Option value={RiskLevel.LOW}>{t('pages.traceability.supplier.riskLevels.low')}</Select.Option>
            <Select.Option value={RiskLevel.MEDIUM}>{t('pages.traceability.supplier.riskLevels.medium')}</Select.Option>
            <Select.Option value={RiskLevel.HIGH}>{t('pages.traceability.supplier.riskLevels.high')}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label={t('pages.traceability.supplierAdd.sections.contact')}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label={t('pages.traceability.supplierAdd.fields.phone')}>
                <Input placeholder={t('pages.traceability.supplierAdd.placeholders.phone')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label={t('pages.traceability.supplierAdd.fields.email')}>
                <Input placeholder={t('pages.traceability.supplierAdd.placeholders.email')} />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item label={t('pages.traceability.supplierAdd.sections.address')}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="province" label={t('pages.traceability.supplierAdd.fields.province')}>
                <Input placeholder={t('pages.traceability.supplierAdd.placeholders.province')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label={t('pages.traceability.supplierAdd.fields.city')}>
                <Input placeholder={t('pages.traceability.supplierAdd.placeholders.city')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label={t('pages.traceability.supplierAdd.fields.district')}>
                <Input placeholder={t('pages.traceability.supplierAdd.placeholders.district')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="detail" label={t('pages.traceability.supplierAdd.fields.detail')}>
            <Input placeholder={t('pages.traceability.supplierAdd.placeholders.detail')} />
          </Form.Item>
        </Form.Item>

        <Form.Item name="businessScope" label={t('pages.traceability.supplierAdd.fields.businessScope')}>
          <Input.TextArea rows={3} placeholder={t('pages.traceability.supplierAdd.placeholders.businessScope')} />
        </Form.Item>

        <Form.Item name="annualCapacity" label={t('pages.traceability.supplierAdd.fields.annualCapacity')}>
          <Input type="number" placeholder={t('pages.traceability.supplierAdd.placeholders.annualCapacity')} />
        </Form.Item>

        <Form.Item name="mainProducts" label={t('pages.traceability.supplierAdd.fields.mainProducts')}>
          <Input placeholder={t('pages.traceability.supplierAdd.placeholders.mainProducts')} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('common.submit')}
            </Button>
            <Button onClick={() => navigate('/traceability/suppliers')}>
              {t('common.cancel')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default SupplierAddPage

