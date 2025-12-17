/**
 * 供应商编辑页
 */

import RestaurantSelector from '@/components/traceability/RestaurantSelector'
import { supplierAPI } from '@/services/traceability'
import { useAppSelector } from '@/store/hooks'
import type { Supplier, SupplierFormData } from '@/types/traceability'
import { RiskLevel, SupplierType } from '@/types/traceability'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, Row, Select, Space, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

const SupplierEditPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  
  // 从Redux获取租户信息
  const { currentTenant } = useAppSelector((state: any) => state.tenant)
  const { user } = useAppSelector((state: any) => state.auth)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const tenantId = currentTenant?.id || user?.tenantId || 'default'
      const result = await supplierAPI.get(id, tenantId)
      if (result.success && result.data) {
        setSupplier(result.data)
        form.setFieldsValue({
          name: result.data.name,
          type: result.data.type,
          legalName: result.data.legalName,
          registrationNumber: result.data.registrationNumber,
          phone: result.data.contact?.phone,
          email: result.data.contact?.email,
          province: result.data.contact?.address?.province,
          city: result.data.contact?.address?.city,
          district: result.data.contact?.address?.district,
          detail: result.data.contact?.address?.detail,
          riskLevel: result.data.businessInfo?.riskLevel,
          businessScope: result.data.businessInfo?.businessScope,
          annualCapacity: result.data.businessInfo?.annualCapacity,
          mainProducts: result.data.businessInfo?.mainProducts?.join(', '),
          restaurantIds: result.data.cooperation?.restaurantIds || []
        })
      } else {
        message.error(result.error || t('pages.traceability.supplierEdit.messages.loadFailed'))
        navigate('/traceability/suppliers')
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    if (!id || !supplier) return
    setLoading(true)
    try {
      const formData: Partial<SupplierFormData> = {
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
          riskLevel: values.riskLevel,
          businessScope: values.businessScope,
          annualCapacity: values.annualCapacity,
          mainProducts: values.mainProducts ? values.mainProducts.split(',').map((s: string) => s.trim()) : []
        },
        cooperation: {
          restaurantIds: values.restaurantIds || []
        }
      }

      // 先更新供应商基本信息
      const updateResult = await supplierAPI.update(id, supplier.tenantId, formData)
      
      // 然后更新餐厅关联（使用批量更新接口）
      if (values.restaurantIds && Array.isArray(values.restaurantIds)) {
        const restaurantResult = await supplierAPI.updateRestaurants(
          id,
          supplier.tenantId,
          values.restaurantIds
        )
        if (!restaurantResult.success) {
          message.warning('供应商信息已更新，但餐厅关联更新失败：' + restaurantResult.error)
        }
      }

      if (updateResult.success) {
        message.success(t('pages.traceability.supplierEdit.messages.updateSuccess'))
        navigate(`/traceability/suppliers/${id}`)
      } else {
        message.error(updateResult.error || t('pages.traceability.supplierEdit.messages.updateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  if (!supplier) {
    return <div>{t('common.loading')}</div>
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/traceability/suppliers/${id}`)}>
            {t('common.back')}
          </Button>
          <span>{t('pages.traceability.supplierEdit.title')}</span>
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

        <Form.Item
          name="restaurantIds"
          label="合作餐厅"
          tooltip="选择与该供应商合作的餐厅，可多选"
        >
          <RestaurantSelector placeholder="请选择合作餐厅" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('common.save')}
            </Button>
            <Button onClick={() => navigate(`/traceability/suppliers/${id}`)}>
              {t('common.cancel')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default SupplierEditPage

