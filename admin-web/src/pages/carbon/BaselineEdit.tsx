/**
 * 编辑基准值页
 */
import { baselineManageAPI } from '@/services/baseline'
import type { BaselineFormData } from '@/types/baseline'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { App, Button, Card, Form, Modal, Radio, Space } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import BaselineForm from './components/BaselineForm'

const BaselineEdit: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { baselineId } = useParams<{ baselineId: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [baseline, setBaseline] = useState<any>(null)
  const [versionModalVisible, setVersionModalVisible] = useState(false)
  const [createNewVersion, setCreateNewVersion] = useState(false)

  useEffect(() => {
    if (baselineId) {
      fetchDetail()
    }
  }, [baselineId])

  const fetchDetail = async () => {
    if (!baselineId) return
    
    try {
      const result = await baselineManageAPI.get(baselineId)
      if (result.success && result.data) {
        const data = result.data
        setBaseline(data)
        
        // 填充表单
        form.setFieldsValue({
          category: data.category,
          carbonFootprint: {
            value: data.carbonFootprint.value,
            uncertainty: data.carbonFootprint.uncertainty,
            confidenceInterval: data.carbonFootprint.confidenceInterval,
          },
          breakdown: data.breakdown,
          source: data.source,
          version: data.version,
          effectiveDate: dayjs(data.effectiveDate),
          expiryDate: dayjs(data.expiryDate),
          notes: data.notes,
        })
      } else {
        message.error(result.error || t('pages.carbon.baselineEdit.messages.getDetailFailed'))
        navigate('/carbon/baseline')
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.baselineEdit.messages.getDetailFailed'))
      navigate('/carbon/baseline')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 验证分解数据总和
      const { breakdown, carbonFootprint } = values
      const total = breakdown.ingredients + breakdown.cookingEnergy + breakdown.packaging + breakdown.other
      if (Math.abs(total - carbonFootprint.value) > 0.1) {
        message.error(t('pages.carbon.baselineEdit.messages.breakdownMismatch', {
          total: total.toFixed(2),
          value: carbonFootprint.value.toFixed(2)
        }))
        return
      }

      // 如果创建新版本，需要确认
      if (createNewVersion) {
        setVersionModalVisible(true)
        return
      }

      await doSubmit(values)
    } catch (error: any) {
      if (error.errorFields) {
        const firstError = error.errorFields[0]
        message.error(`${firstError.name.join('.')}: ${firstError.errors[0]}`)
      } else {
        message.error(error.message || t('pages.carbon.baselineEdit.messages.updateFailed'))
      }
    }
  }

  const doSubmit = async (values: any) => {
    if (!baselineId) return

    // 格式化数据
    const formData: Partial<BaselineFormData> = {
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
    try {
      const result = await baselineManageAPI.update(baselineId, formData, createNewVersion)
      
      if (result.success) {
        // 检查是否已提交审核申请
        if (result.data?.approvalRequired) {
          message.success('审核申请已提交，请等待审核')
        } else {
          message.success(t('pages.carbon.baselineEdit.messages.updateSuccess'))
        }
        navigate(`/carbon/baseline/${baselineId}`)
      } else {
        message.error(result.error || t('pages.carbon.baselineEdit.messages.updateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('pages.carbon.baselineEdit.messages.updateFailed'))
    } finally {
      setLoading(false)
      setVersionModalVisible(false)
    }
  }

  const handleVersionConfirm = () => {
    form.validateFields().then((values) => {
      doSubmit(values)
    })
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/carbon/baseline/${baselineId}`)}
            >
              {t('pages.carbon.baselineEdit.buttons.back')}
            </Button>
            <span>{t('pages.carbon.baselineEdit.title')}</span>
          </Space>
        }
      >
        {baseline && (
          <>
            <BaselineForm form={form} initialValues={baseline} />

            <div style={{ marginTop: 24 }}>
              <Radio.Group
                value={createNewVersion}
                onChange={(e) => setCreateNewVersion(e.target.value)}
              >
                <Radio value={false}>{t('pages.carbon.baselineEdit.version.updateCurrent')}</Radio>
                <Radio value={true}>{t('pages.carbon.baselineEdit.version.createNew')}</Radio>
              </Radio.Group>
            </div>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => navigate(`/carbon/baseline/${baselineId}`)}>
                  {t('pages.carbon.baselineEdit.buttons.cancel')}
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSubmit}
                >
                  {t('pages.carbon.baselineEdit.buttons.save')}
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>

      <Modal
        title={t('pages.carbon.baselineEdit.version.confirmTitle')}
        open={versionModalVisible}
        onOk={handleVersionConfirm}
        onCancel={() => setVersionModalVisible(false)}
      >
        <p>{t('pages.carbon.baselineEdit.version.confirmMessage')}</p>
      </Modal>
    </div>
  )
}

export default BaselineEdit

