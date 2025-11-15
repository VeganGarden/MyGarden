/**
 * 供应商编辑页
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, message, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { supplierAPI } from '@/services/traceability'
import type { Supplier, SupplierFormData } from '@/types/traceability'
import { SupplierType, RiskLevel } from '@/types/traceability'

const SupplierEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [supplier, setSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await supplierAPI.get(id, 'default')
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
          mainProducts: result.data.businessInfo?.mainProducts?.join(', ')
        })
      } else {
        message.error(result.error || '加载失败')
        navigate('/traceability/suppliers')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
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
        }
      }

      const result = await supplierAPI.update(id, supplier.tenantId, formData)
      if (result.success) {
        message.success('更新成功')
        navigate(`/traceability/suppliers/${id}`)
      } else {
        message.error(result.error || '更新失败')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  if (!supplier) {
    return <div>加载中...</div>
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/traceability/suppliers/${id}`)}>
            返回
          </Button>
          <span>编辑供应商</span>
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
              label="供应商名称"
              rules={[{ required: true, message: '请输入供应商名称' }]}
            >
              <Input placeholder="请输入供应商名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="type"
              label="供应商类型"
              rules={[{ required: true, message: '请选择供应商类型' }]}
            >
              <Select placeholder="请选择供应商类型">
                <Select.Option value={SupplierType.FARM}>农场</Select.Option>
                <Select.Option value={SupplierType.PROCESSOR}>加工商</Select.Option>
                <Select.Option value={SupplierType.DISTRIBUTOR}>分销商</Select.Option>
                <Select.Option value={SupplierType.OTHER}>其他</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="legalName" label="法人名称">
              <Input placeholder="请输入法人名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="registrationNumber" label="注册号/统一社会信用代码">
              <Input placeholder="请输入注册号" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="riskLevel" label="风险等级">
          <Select>
            <Select.Option value={RiskLevel.LOW}>低风险</Select.Option>
            <Select.Option value={RiskLevel.MEDIUM}>中风险</Select.Option>
            <Select.Option value={RiskLevel.HIGH}>高风险</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="联系信息">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话">
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item label="地址信息">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="province" label="省份">
                <Input placeholder="请输入省份" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label="城市">
                <Input placeholder="请输入城市" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label="区县">
                <Input placeholder="请输入区县" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="detail" label="详细地址">
            <Input placeholder="请输入详细地址" />
          </Form.Item>
        </Form.Item>

        <Form.Item name="businessScope" label="经营范围">
          <Input.TextArea rows={3} placeholder="请输入经营范围" />
        </Form.Item>

        <Form.Item name="annualCapacity" label="年产能（吨）">
          <Input type="number" placeholder="请输入年产能" />
        </Form.Item>

        <Form.Item name="mainProducts" label="主要产品（用逗号分隔）">
          <Input placeholder="例如：大米,小麦,玉米" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
            <Button onClick={() => navigate(`/traceability/suppliers/${id}`)}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default SupplierEditPage

