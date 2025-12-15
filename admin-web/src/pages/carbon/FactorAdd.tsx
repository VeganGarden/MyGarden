/**
 * 添加碳排放因子页
 */
import { factorManageAPI } from '@/services/factor'
import type { FactorFormData } from '@/types/factor'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Card, Form, Space, message } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import FactorForm from './components/FactorForm'

const FactorAdd: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 生成 factorId
  const generateFactorId = (values: any) => {
    const { name, category, subCategory, region, year } = values
    // 将名称转换为小写，替换空格为下划线
    const namePart = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const categoryPart = category || 'general'
    const subCategoryPart = subCategory ? `_${subCategory.toLowerCase().replace(/\s+/g, '_')}` : ''
    const regionPart = region ? `_${region.toLowerCase()}` : ''
    const yearPart = year ? `_${year}` : ''
    
    return `ef_${namePart}${subCategoryPart}${regionPart}${yearPart}`
  }

  // 处理表单值变化
  const handleValuesChange = (changedValues: any, allValues: any) => {
    // 自动生成factorId
    if (changedValues.name || changedValues.category || changedValues.subCategory || 
        changedValues.region || changedValues.year) {
      const factorId = generateFactorId(allValues)
      form.setFieldsValue({
        factorId,
      })
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 生成 factorId
      const factorId = generateFactorId(values)

      // 格式化数据
      const formData: FactorFormData = {
        name: values.name,
        alias: values.alias || [],
        category: values.category,
        subCategory: values.subCategory,
        factorValue: values.factorValue,
        unit: values.unit,
        uncertainty: values.uncertainty,
        region: values.region,
        source: values.source,
        year: values.year,
        version: values.version,
        boundary: values.boundary,
        status: values.status || 'draft',
        notes: values.notes,
      }

      setLoading(true)
      const result = await factorManageAPI.create(formData)
      
      if (result.success) {
        message.success(t('pages.carbon.factorAdd.messages.createSuccess'))
        navigate(`/carbon/factor-library`)
      } else {
        message.error(result.error || t('pages.carbon.factorAdd.messages.createFailed'))
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        const firstError = error.errorFields[0]
        message.error(`${firstError.name.join('.')}: ${firstError.errors[0]}`)
      } else {
        message.error(error.message || t('pages.carbon.factorAdd.messages.createFailed'))
      }
    } finally {
      setLoading(false)
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
              onClick={() => navigate('/carbon/factor-library')}
            >
              {t('pages.carbon.factorAdd.buttons.back')}
            </Button>
            <span>{t('pages.carbon.factorAdd.title')}</span>
          </Space>
        }
      >
        <FactorForm form={form} onValuesChange={handleValuesChange} />

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => navigate('/carbon/factor-library')}>
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSubmit}
            >
              {t('pages.carbon.factorAdd.buttons.submit')}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default FactorAdd

