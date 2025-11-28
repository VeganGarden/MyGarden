/**
 * 添加员工页面
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, message, Row, Col, Switch } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useAppSelector } from '@/store/hooks'
import { staffAPI } from '@/services/vegetarianPersonnel'
import type { StaffFormData } from '@/types/vegetarianPersonnel'
import { StaffVegetarianType, VegetarianReason } from '@/types/vegetarianPersonnel'
import dayjs from 'dayjs'

const StaffAddPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isVegetarian, setIsVegetarian] = useState(false)

  const handleSubmit = async (values: any) => {
    if (!currentRestaurantId || !currentTenant) {
      message.warning('请先选择餐厅')
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
        message.success(`员工"${values.name}"创建成功`)
        navigate('/vegetarian-personnel/staff')
      } else {
        message.error(result.error || '创建失败，请重试')
      }
    } catch (error: any) {
      console.error('创建员工异常:', error)
      message.error(error.message || '网络错误，请检查网络连接后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vegetarian-personnel/staff')}>
            返回
          </Button>
          <span>添加员工</span>
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
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入员工姓名" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="position"
              label="岗位"
              rules={[{ required: true, message: '请输入岗位' }]}
            >
              <Input placeholder="请输入岗位" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
              ]}
            >
              <Input placeholder="请输入11位手机号" maxLength={11} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { type: 'email', message: '请输入正确的邮箱地址' }
              ]}
            >
              <Input placeholder="请输入邮箱地址" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="joinDate"
              label="入职日期"
              rules={[{ required: true, message: '请选择入职日期' }]}
            >
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="isVegetarian"
              label="是否素食"
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
                  label="素食类型"
                  rules={[{ required: true, message: '请选择素食类型' }]}
                >
                  <Select placeholder="请选择素食类型">
                    <Select.Option value={StaffVegetarianType.PURE}>纯素</Select.Option>
                    <Select.Option value={StaffVegetarianType.OVO_LACTO}>蛋奶素</Select.Option>
                    <Select.Option value={StaffVegetarianType.FLEXIBLE}>弹性素</Select.Option>
                    <Select.Option value={StaffVegetarianType.OTHER}>其他</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="vegetarianStartYear"
                  label="素食开始年份"
                  rules={[
                    { required: true, message: '请输入素食开始年份' },
                    { type: 'number', min: 1900, max: new Date().getFullYear(), message: `年份应在 1900-${new Date().getFullYear()} 之间` }
                  ]}
                >
                  <Input 
                    type="number" 
                    placeholder={`例如：${new Date().getFullYear() - 5}`} 
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
                  label="素食原因"
                >
                  <Select placeholder="请选择素食原因" allowClear>
                    <Select.Option value={VegetarianReason.HEALTH}>健康</Select.Option>
                    <Select.Option value={VegetarianReason.ENVIRONMENT}>环保</Select.Option>
                    <Select.Option value={VegetarianReason.FAITH}>信仰</Select.Option>
                    <Select.Option value={VegetarianReason.OTHER}>其他</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="notes"
                  label="备注"
                >
                  <Input.TextArea rows={3} placeholder="请输入备注信息" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Form.Item>
          <Space>
            <Button onClick={() => navigate('/vegetarian-personnel/staff')}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default StaffAddPage

