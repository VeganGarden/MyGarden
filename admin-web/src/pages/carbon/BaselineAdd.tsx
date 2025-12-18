/**
 * 添加基准值页
 */
import { baselineManageAPI } from '@/services/baseline'
import type { BaselineFormData } from '@/types/baseline'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { App, Button, Card, Form, Space, Steps } from 'antd'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import BaselineForm from './components/BaselineForm'

const { Step } = Steps

const BaselineAdd: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
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
        message.error(t('pages.carbon.baselineAdd.messages.breakdownMismatch', {
          total: total.toFixed(2),
          value: carbonFootprint.value.toFixed(2)
        }))
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
        // 检查是否已提交审核申请
        if (result.data?.approvalRequired) {
          message.success('审核申请已提交，请等待审核')
          navigate(`/carbon/baseline`)
        } else {
          message.success(t('pages.carbon.baselineAdd.messages.createSuccess'))
          navigate(`/carbon/baseline/${baselineId}`)
        }
      } else {
        message.error(result.error || t('pages.carbon.baselineAdd.messages.createFailed'))
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        const firstError = error.errorFields[0]
        message.error(`${firstError.name.join('.')}: ${firstError.errors[0]}`)
      } else {
        message.error(error.message || t('pages.carbon.baselineAdd.messages.createFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      title: t('pages.carbon.baselineAdd.steps.basicInfo'),
      content: 'category',
    },
    {
      title: t('pages.carbon.baselineAdd.steps.baselineData'),
      content: 'carbonFootprint',
    },
    {
      title: t('pages.carbon.baselineAdd.steps.sourceVersion'),
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
              {t('pages.carbon.baselineAdd.buttons.back')}
            </Button>
            <span>{t('pages.carbon.baselineAdd.title')}</span>
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
              <Button onClick={prev}>{t('pages.carbon.baselineAdd.buttons.prev')}</Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={next}>
                {t('pages.carbon.baselineAdd.buttons.next')}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSubmit}
              >
                {t('pages.carbon.baselineAdd.buttons.submit')}
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default BaselineAdd

