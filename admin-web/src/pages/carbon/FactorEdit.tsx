/**
 * 编辑碳排放因子页
 */
import { factorManageAPI } from '@/services/factor'
import type { FactorFormData } from '@/types/factor'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Card, Form, Space, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import FactorForm from './components/FactorForm'

const FactorEdit: React.FC = () => {
  const { t } = useTranslation()
  const { factorId } = useParams<{ factorId: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [factor, setFactor] = useState<any>(null)

  useEffect(() => {
    if (factorId) {
      fetchDetail()
    }
  }, [factorId])

  const fetchDetail = async () => {
    if (!factorId) return
    
    try {
      const result = await factorManageAPI.get(factorId)
      if (result.success && result.data) {
        const data = result.data
        setFactor(data)
        
        // 填充表单
        form.setFieldsValue({
          name: data.name,
          factorId: data.factorId,
          alias: data.alias || [],
          category: data.category,
          subCategory: data.subCategory,
          factorValue: data.factorValue,
          unit: data.unit,
          uncertainty: data.uncertainty,
          region: data.region,
          source: data.source,
          year: data.year,
          version: data.version,
          boundary: data.boundary,
          status: data.status,
          notes: data.notes,
        })
      } else {
        message.error(result.error || t('pages.carbon.factorEdit.messages.getDetailFailed'))
        navigate('/carbon/factor-library')
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.factorEdit.messages.getDetailFailed'))
      navigate('/carbon/factor-library')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!factorId) return

      // 格式化数据
      const formData: Partial<FactorFormData> = {
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
        status: values.status,
        notes: values.notes,
      }

      setLoading(true)
      const result = await factorManageAPI.update(factorId, formData)
      
      if (result.success) {
        message.success(t('pages.carbon.factorEdit.messages.updateSuccess'))
        navigate(`/carbon/factor-library/${factorId}`)
      } else {
        message.error(result.error || t('pages.carbon.factorEdit.messages.updateFailed'))
      }
    } catch (error: any) {
      if (error.errorFields) {
        const firstError = error.errorFields[0]
        message.error(`${firstError.name.join('.')}: ${firstError.errors[0]}`)
      } else {
        message.error(error.message || t('pages.carbon.factorEdit.messages.updateFailed'))
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
              onClick={() => navigate(`/carbon/factor-library/${factorId}`)}
            >
              {t('pages.carbon.factorEdit.buttons.back')}
            </Button>
            <span>{t('pages.carbon.factorEdit.title')}</span>
          </Space>
        }
      >
        {factor && (
          <>
            <FactorForm form={form} initialValues={factor} />

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => navigate(`/carbon/factor-library/${factorId}`)}>
                  {t('pages.carbon.factorEdit.buttons.cancel')}
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSubmit}
                >
                  {t('pages.carbon.factorEdit.buttons.save')}
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default FactorEdit

