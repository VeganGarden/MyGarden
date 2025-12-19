/**
 * 添加一餐饭基准值页
 */
import { createMealSetBaseline } from '@/services/meal-set-baseline'
import type { MealSetBaselineFormData } from '@/types/meal-set-baseline'
import { Button, Card, Form, message, Space, Steps, Alert } from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MealSetBaselineForm from './components/MealSetBaselineForm'
import dayjs from 'dayjs'

const { Step } = Steps

const MealSetBaselineAdd: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // 处理表单值变化，自动计算置信区间
  const handleValuesChange = (changedValues: any, allValues: any) => {
    // 自动计算置信区间
    if (changedValues.carbonFootprint?.value !== undefined || 
        changedValues.carbonFootprint?.uncertainty !== undefined) {
      const value = allValues.carbonFootprint?.value || 0
      const uncertainty = allValues.carbonFootprint?.uncertainty || 0
      
      if (value > 0 && uncertainty >= 0) {
        form.setFieldsValue({
          carbonFootprint: {
            ...allValues.carbonFootprint,
            confidenceInterval: {
              lower: Math.max(0, value - uncertainty),
              upper: value + uncertainty
            }
          }
        })
      }
    }

    // 自动生成结构描述
    if (changedValues.typicalStructure) {
      const typicalStructure = allValues.typicalStructure
      if (typicalStructure) {
        const parts = []
        if (typicalStructure.mainDishesCount) {
          parts.push(`${typicalStructure.mainDishesCount}道主菜`)
        }
        if (typicalStructure.stapleFoodType) {
          parts.push(typicalStructure.stapleFoodType)
        }
        if (typicalStructure.hasSoup) {
          parts.push('汤')
        }
        if (typicalStructure.hasDessert) {
          parts.push('甜点')
        }
        
        const description = parts.join('+') || ''
        form.setFieldsValue({
          typicalStructure: {
            ...typicalStructure,
            description
          }
        })
      }
    }
  }

  // 验证当前步骤
  const validateCurrentStep = async (): Promise<boolean> => {
    try {
      const values = form.getFieldsValue()
      
      if (currentStep === 0) {
        // 验证分类信息
        await form.validateFields([
          ['category', 'mealTime'],
          ['category', 'region'],
          ['category', 'energyType']
        ])
        return true
      } else if (currentStep === 1) {
        // 验证基准值数据
        await form.validateFields([
          ['carbonFootprint', 'value'],
          ['carbonFootprint', 'uncertainty']
        ])
        return true
      } else if (currentStep === 2) {
        // 验证分解数据
        await form.validateFields([
          ['breakdown', 'mainDishes'],
          ['breakdown', 'stapleFood'],
          ['breakdown', 'soup'],
          ['breakdown', 'dessert'],
          ['breakdown', 'beverage'],
          ['breakdown', 'sideDishes'],
          ['breakdown', 'condiments'],
          ['breakdown', 'cookingEnergy'],
          ['breakdown', 'packaging'],
          ['breakdown', 'transport'],
          ['breakdown', 'other']
        ])
        
        // 验证分解数据总和
        const breakdown = values.breakdown
        const total = 
          (breakdown.mainDishes || 0) +
          (breakdown.stapleFood || 0) +
          (breakdown.soup || 0) +
          (breakdown.dessert || 0) +
          (breakdown.beverage || 0) +
          (breakdown.sideDishes || 0) +
          (breakdown.condiments || 0) +
          (breakdown.cookingEnergy || 0) +
          (breakdown.packaging || 0) +
          (breakdown.transport || 0) +
          (breakdown.other || 0)
        
        const baselineValue = values.carbonFootprint?.value || 0
        const diff = Math.abs(total - baselineValue)
        
        if (diff > 0.01) {
          message.error(`分解数据总和(${total.toFixed(2)})应与基准值(${baselineValue.toFixed(2)})一致，差异: ${diff.toFixed(2)}`)
          return false
        }
        
        return true
      } else if (currentStep === 3) {
        // 验证典型结构
        await form.validateFields([
          ['typicalStructure', 'mainDishesCount'],
          ['typicalStructure', 'stapleFoodType'],
          ['typicalStructure', 'totalItems'],
          ['typicalStructure', 'description']
        ])
        return true
      } else if (currentStep === 4) {
        // 验证数据来源和版本信息
        await form.validateFields([
          ['source', 'type'],
          ['source', 'organization'],
          ['source', 'report'],
          ['source', 'year'],
          ['source', 'methodology'],
          'version',
          'effectiveDate',
          'expiryDate',
          ['usage', 'researchStatus']
        ])
        return true
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  // 下一步
  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid) {
      setCurrentStep(currentStep + 1)
    }
  }

  // 上一步
  const handlePrev = () => {
    setCurrentStep(currentStep - 1)
  }

  // 提交
  const handleSubmit = async () => {
    try {
      const isValid = await validateCurrentStep()
      if (!isValid) {
        return
      }

      setLoading(true)
      const values = await form.validateFields()
      
      // 转换日期格式
      const formData: MealSetBaselineFormData = {
        ...values,
        effectiveDate: dayjs(values.effectiveDate).format('YYYY-MM-DD'),
        expiryDate: dayjs(values.expiryDate).format('YYYY-MM-DD')
      }
      
      const result = await createMealSetBaseline(formData)
      
      if (result.success) {
        if (result.data?.approvalRequired) {
          message.success('添加申请已提交，请等待审核')
        } else {
          message.success('添加成功')
        }
        navigate('/carbon/meal-set-baselines')
      } else {
        if (result.errors && result.errors.length > 0) {
          message.error(result.errors.join(', '))
        } else {
          message.error(result.error || '添加失败')
        }
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        message.error('请检查表单数据')
      } else {
        message.error(error.message || '添加失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      title: '分类信息',
      description: '选择餐次类型、区域、用能方式等'
    },
    {
      title: '基准值数据',
      description: '输入基准值和不确定性'
    },
    {
      title: '分解数据',
      description: '输入各组成部分的碳排放'
    },
    {
      title: '典型结构',
      description: '描述一餐饭的典型结构'
    },
    {
      title: '数据来源与版本',
      description: '输入数据来源和版本信息'
    }
  ]

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="一餐饭基准值管理"
            description="一餐饭基准值包含所有可能维度，暂时不用于计算，仅作为参考数据。只有在数据验证完成且观察期结束后，才可以启用计算功能。"
            type="info"
            showIcon
          />

          <Steps current={currentStep} items={steps} />

          <MealSetBaselineForm
            form={form}
            onSubmit={handleSubmit}
          />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                上一步
              </Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button type="primary" loading={loading} onClick={handleSubmit}>
                提交
              </Button>
            )}
            <Button onClick={() => navigate('/carbon/meal-set-baselines')}>
              取消
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

export default MealSetBaselineAdd

