/**
 * 添加基准值页
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Form, Steps, message, Space } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { baselineManageAPI } from '@/services/baseline'
import BaselineForm from './components/BaselineForm'
import type { BaselineFormData } from '@/types/baseline'
import dayjs from 'dayjs'

const { Step } = Steps

const BaselineAdd: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // 生成 baselineId
  const generateBaselineId = (values: any) => {
    const { category } = values
    const parts = [
      category.mealType,
      category.region,
      category.energyType,
      category.city || 'default',
      category.restaurantType || 'default',
    ]
    return parts.join('_')
  }

  // 处理表单值变化
  const handleValuesChange = (changedValues: any, allValues: any) => {
    // 自动计算置信区间
    if (changedValues.carbonFootprint) {
      const { value, uncertainty } = allValues.carbonFootprint || {}
      if (value !== undefined && uncertainty !== undefined) {
        form.setFieldsValue({
          carbonFootprint: {
            ...allValues.carbonFootprint,
            confidenceInterval: {
              lower: Math.round((value - uncertainty) * 10) / 10,
              upper: Math.round((value + uncertainty) * 10) / 10,
            },
          },
        })
      }
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 验证分解数据总和
      const { breakdown, carbonFootprint } = values
      const total = breakdown.ingredients + breakdown.cookingEnergy + breakdown.packaging + breakdown.other
      if (Math.abs(total - carbonFootprint.value) > 0.1) {
        message.error(`分解数据总和(${total.toFixed(2)})应与基准值(${carbonFootprint.value.toFixed(2)})一致`)
        return
      }

      // 生成 baselineId
      const baselineId = generateBaselineId(values)

      // 格式化数据
      const formData: BaselineFormData = {
        category: values.category,
        carbonFootprint: {
          value: values.carbonFootprint.value,
          uncertainty: values.carbonFootprint.uncertainty,
          confidenceInterval: values.carbonFootprint.confidenceInterval || {
            lower: Math.round((values.carbonFootprint.value - values.carbonFootprint.uncertainty) * 10) / 10,
            upper: Math.round((values.carbonFootprint.value + values.carbonFootprint.uncertainty) * 10) / 10,
          },
        },
        breakdown: values.breakdown,
        source: values.source,
        version: values.version,
        effectiveDate: dayjs(values.effectiveDate).toISOString(),
        expiryDate: dayjs(values.expiryDate).toISOString(),
        notes: values.notes,
      }

      setLoading(true)
      const result = await baselineManageAPI.create(formData)
      
      if (result.success) {
        message.success('创建成功')
        navigate(`/carbon/baseline/${baselineId}`)
      } else {
        message.error(result.error || '创建失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        const firstError = error.errorFields[0]
        message.error(`${firstError.name.join('.')}: ${firstError.errors[0]}`)
      } else {
        message.error(error.message || '创建失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      title: '基本信息',
      content: 'category',
    },
    {
      title: '基准值数据',
      content: 'carbonFootprint',
    },
    {
      title: '数据来源与版本',
      content: 'source',
    },
  ]

  const next = () => {
    // 验证当前步骤的字段
    const currentStepFields = getStepFields(currentStep)
    form.validateFields(currentStepFields).then(() => {
      setCurrentStep(currentStep + 1)
    }).catch(() => {
      // 验证失败，不跳转
    })
  }

  const prev = () => {
    setCurrentStep(currentStep - 1)
  }

  const getStepFields = (step: number): string[][] => {
    switch (step) {
      case 0:
        return [
          ['category', 'mealType'],
          ['category', 'region'],
          ['category', 'energyType'],
        ]
      case 1:
        return [
          ['carbonFootprint', 'value'],
          ['carbonFootprint', 'uncertainty'],
          ['breakdown', 'ingredients'],
          ['breakdown', 'cookingEnergy'],
          ['breakdown', 'packaging'],
          ['breakdown', 'other'],
        ]
      case 2:
        return [
          ['source', 'type'],
          ['source', 'organization'],
          ['source', 'report'],
          ['source', 'year'],
          ['source', 'methodology'],
          ['version'],
          ['effectiveDate'],
          ['expiryDate'],
        ]
      default:
        return []
    }
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/carbon/baseline')}
            >
              返回列表
            </Button>
            <span>添加基准值</span>
          </Space>
        }
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map((step) => (
            <Step key={step.title} title={step.title} />
          ))}
        </Steps>

        <BaselineForm form={form} onValuesChange={handleValuesChange} />

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={prev}>上一步</Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={next}>
                下一步
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSubmit}
              >
                提交
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default BaselineAdd

