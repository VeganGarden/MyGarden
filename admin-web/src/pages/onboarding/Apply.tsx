import { onboardingAPI } from '@/services/cloudbase'
import { Button, Card, Form, Input, InputNumber, message } from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const OnboardingApply: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const res = await onboardingAPI.apply(values)
      if (res.code === 0) {
        message.success('申请已提交，平台审核通过后会联系您')
        navigate('/login')
      } else {
        message.error(res.message || '提交失败，请稍后重试')
      }
    } catch (e: any) {
      message.error(e.message || '提交失败，请检查网络')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card title="气候餐厅平台 - 入驻申请" style={{ width: 560 }}>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            label="期望账户名（用于后台登录）"
            name="desiredUsername"
            rules={[
              { required: true, message: '请输入期望账户名' },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_\-]{3,20}$/, message: '以字母开头，4-21位，仅字母数字下划线和中划线' },
            ]}
            tooltip="以字母开头，4-21位；如已被占用，平台会帮您调整或通知确认"
          >
            <Input placeholder="例如：green_vegan_admin" />
          </Form.Item>
          <Form.Item
            label="机构/餐厅名称"
            name="organizationName"
            rules={[{ required: true, message: '请输入机构/餐厅名称' }]}
          >
            <Input placeholder="例如：素开心餐饮管理有限公司 / 素开心（虹桥店）" />
          </Form.Item>
          <Form.Item
            label="联系人姓名"
            name="contactName"
            rules={[{ required: true, message: '请输入联系人姓名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="联系电话"
            name="contactPhone"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^[0-9+\-()\s]{6,20}$/, message: '请输入有效的电话' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="联系邮箱" name="contactEmail" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="门店数量" name="restaurantCount">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="可选，例如 1" />
          </Form.Item>
          <Form.Item label="所在城市" name="city">
            <Input placeholder="可选，例如 上海" />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={4} placeholder="可选，补充说明需求与背景" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              提交申请
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            已有账号？<a href="/login">返回登录</a>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default OnboardingApply


