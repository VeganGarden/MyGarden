/**
 * 编辑员工页面
 */

import { staffAPI } from '@/services/vegetarianPersonnel'
import { useAppSelector } from '@/store/hooks'
import type { Staff } from '@/types/vegetarianPersonnel'
import { StaffVegetarianType, VegetarianReason } from '@/types/vegetarianPersonnel'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, Row, Select, Space, Switch, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const StaffEditPage: React.FC = () => {
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
      message.warning('请先选择餐厅')
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
        message.error('员工不存在')
        navigate('/vegetarian-personnel/staff')
      }
    } catch (error: any) {
      message.error(error.message || '加载失败')
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
        message.success(`员工"${values.name}"信息更新成功`)
        navigate('/vegetarian-personnel/staff')
      } else {
        message.error(result.error || '更新失败，请重试')
      }
    } catch (error: any) {
      console.error('更新员工信息异常:', error)
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
          <span>编辑员工</span>
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
              label="姓名"
              rules={[
                { required: true, message: '请输入姓名' },
                { max: 50, message: '姓名不能超过50个字符' },
                { whitespace: true, message: '姓名不能为空格' }
              ]}
            >
              <Input placeholder="请输入员工姓名" maxLength={50} showCount />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="position"
              label="岗位"
              rules={[
                { required: true, message: '请输入岗位' },
                { max: 50, message: '岗位名称不能超过50个字符' },
                { whitespace: true, message: '岗位名称不能为空格' }
              ]}
            >
              <Input placeholder="请输入岗位" maxLength={50} showCount />
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

export default StaffEditPage

