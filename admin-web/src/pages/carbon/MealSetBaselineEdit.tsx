/**
 * 编辑一餐饭基准值页
 */
import { getMealSetBaselineDetail, updateMealSetBaseline } from '@/services/meal-set-baseline'
import type { MealSetBaseline, MealSetBaselineFormData } from '@/types/meal-set-baseline'
import { Alert, Button, Card, Form, Space, Spin, Steps, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MealSetBaselineForm from './components/MealSetBaselineForm'

const { Step } = Steps

const MealSetBaselineEdit: React.FC = () => {
  const navigate = useNavigate()
  const { baselineId } = useParams<{ baselineId: string }>()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [baseline, setBaseline] = useState<MealSetBaseline | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (baselineId) {
      fetchBaseline()
    }
  }, [baselineId])

  const fetchBaseline = async () => {
    if (!baselineId) return
    
    setFetching(true)
    try {
      const result = await getMealSetBaselineDetail(baselineId)
      if (result.success && result.data) {
        setBaseline(result.data)
        // 填充表单 - 转换类型
        const baseline = result.data
        const formData: Partial<MealSetBaselineFormData> = {
          category: baseline.category,
          carbonFootprint: {
            value: baseline.carbonFootprint.value,
            uncertainty: baseline.carbonFootprint.uncertainty,
            confidenceInterval: baseline.carbonFootprint.confidenceInterval
          },
          breakdown: baseline.breakdown,
          typicalStructure: baseline.typicalStructure,
          source: baseline.source,
          version: baseline.version,
          effectiveDate: typeof baseline.effectiveDate === 'string' 
            ? baseline.effectiveDate 
            : (baseline.effectiveDate instanceof Date ? baseline.effectiveDate.toISOString().split('T')[0] : ''),
          expiryDate: typeof baseline.expiryDate === 'string' 
            ? baseline.expiryDate 
            : (baseline.expiryDate instanceof Date ? baseline.expiryDate.toISOString().split('T')[0] : ''),
          usage: {
            isForCalculation: baseline.usage.isForCalculation,
            notes: baseline.usage.notes,
            researchStatus: baseline.usage.researchStatus,
            observationPeriod: baseline.usage.observationPeriod ? {
              startDate: typeof baseline.usage.observationPeriod.startDate === 'string'
                ? baseline.usage.observationPeriod.startDate
                : (baseline.usage.observationPeriod.startDate instanceof Date 
                  ? baseline.usage.observationPeriod.startDate.toISOString().split('T')[0] 
                  : ''),
              endDate: baseline.usage.observationPeriod.endDate 
                ? (typeof baseline.usage.observationPeriod.endDate === 'string'
                  ? baseline.usage.observationPeriod.endDate
                  : (baseline.usage.observationPeriod.endDate instanceof Date 
                    ? baseline.usage.observationPeriod.endDate.toISOString().split('T')[0] 
                    : undefined))
                : undefined,
              notes: baseline.usage.observationPeriod.notes
            } : undefined
          },
          notes: baseline.notes
        }
        form.setFieldsValue(formData)
      } else {
        message.error(result.error || '获取数据失败')
        navigate('/carbon/meal-set-baselines')
      }
    } catch (error: any) {
      message.error(error.message || '获取数据失败')
      navigate('/carbon/meal-set-baselines')
    } finally {
      setFetching(false)
    }
  }

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
        await form.validateFields([
          ['category', 'mealTime'],
          ['category', 'region'],
          ['category', 'energyType']
        ])
        return true
      } else if (currentStep === 1) {
        await form.validateFields([
          ['carbonFootprint', 'value'],
          ['carbonFootprint', 'uncertainty']
        ])
        return true
      } else if (currentStep === 2) {
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
        await form.validateFields([
          ['typicalStructure', 'mainDishesCount'],
          ['typicalStructure', 'stapleFoodType'],
          ['typicalStructure', 'totalItems'],
          ['typicalStructure', 'description']
        ])
        return true
      } else if (currentStep === 4) {
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

  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    try {
      const isValid = await validateCurrentStep()
      if (!isValid) {
        return
      }

      setLoading(true)
      const values = await form.validateFields()
      
      // 转换日期格式
      const updates: Partial<MealSetBaselineFormData> = {
        ...values,
        effectiveDate: dayjs(values.effectiveDate).format('YYYY-MM-DD'),
        expiryDate: dayjs(values.expiryDate).format('YYYY-MM-DD')
      }
      
      if (!baselineId) {
        message.error('基准值ID不存在')
        return
      }
      
      const result = await updateMealSetBaseline(baselineId, updates)
      
      if (result.success) {
        if (result.data?.approvalRequired) {
          message.success('更新申请已提交，请等待审核')
        } else {
          message.success('更新成功')
        }
        navigate(`/carbon/meal-set-baselines/${baselineId}`)
      } else {
        message.error(result.error || '更新失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请检查表单数据')
      } else {
        message.error(error.message || '更新失败')
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!baseline) {
    return null
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
            message="编辑一餐饭基准值"
            description={`基准值ID: ${baseline.baselineId}`}
            type="info"
            showIcon
          />

          <Steps current={currentStep} items={steps} />

          <MealSetBaselineForm
            form={form}
            initialValues={undefined}
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
            <Button onClick={() => navigate(`/carbon/meal-set-baselines/${baselineId}`)}>
              取消
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

export default MealSetBaselineEdit

