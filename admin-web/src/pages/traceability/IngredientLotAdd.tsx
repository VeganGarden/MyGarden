/**
 * 食材批次添加页
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, message, Row, Col, DatePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { ingredientLotAPI } from '@/services/traceability'
import type { IngredientLotFormData } from '@/types/traceability'
import dayjs from 'dayjs'

const IngredientLotAddPage: React.FC = () => {
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
        message.success('创建成功')
        navigate(`/traceability/lots/${result.data?.lotId}`)
      } else {
        message.error(result.error || '创建失败')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/lots')}>
            返回
          </Button>
          <span>添加食材批次</span>
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
              label="食材ID"
              rules={[{ required: true, message: '请输入食材ID' }]}
            >
              <Input placeholder="请输入食材ID" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="supplierId"
              label="供应商ID"
              rules={[{ required: true, message: '请输入供应商ID' }]}
            >
              <Input placeholder="请输入供应商ID" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="batchNumber"
              label="批次号"
              rules={[{ required: true, message: '请输入批次号' }]}
            >
              <Input placeholder="请输入批次号" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="harvestDate"
              label="采收日期"
              rules={[{ required: true, message: '请选择采收日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="productionDate" label="生产日期">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="expiryDate" label="保质期至">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="quantity"
              label="数量"
              rules={[{ required: true, message: '请输入数量' }]}
            >
              <Input type="number" placeholder="请输入数量" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="unit"
              label="单位"
              rules={[{ required: true, message: '请选择单位' }]}
            >
              <Select>
                <Select.Option value="kg">kg</Select.Option>
                <Select.Option value="t">吨</Select.Option>
                <Select.Option value="件">件</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="产地信息">
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
          <Form.Item name="farmName" label="农场名称">
            <Input placeholder="请输入农场名称" />
          </Form.Item>
        </Form.Item>

        <Form.Item name="restaurantId" label="餐厅ID">
          <Input placeholder="请输入餐厅ID（可选）" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交
            </Button>
            <Button onClick={() => navigate('/traceability/lots')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default IngredientLotAddPage

