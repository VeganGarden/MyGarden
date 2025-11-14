/**
 * 编辑基准值页
 */
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Form, message, Space, Modal, Radio } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { baselineManageAPI } from '@/services/baseline'
import BaselineForm from './components/BaselineForm'
import type { BaselineFormData } from '@/types/baseline'
import dayjs from 'dayjs'

const BaselineEdit: React.FC = () => {
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
        message.error(result.error || '获取详情失败')
        navigate('/carbon/baseline')
      }
    } catch (error: any) {
      message.error(error.message || '获取详情失败')
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
        message.error(`分解数据总和(${total.toFixed(2)})应与基准值(${carbonFootprint.value.toFixed(2)})一致`)
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
        message.error(error.message || '更新失败')
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
        message.success('更新成功')
        navigate(`/carbon/baseline/${baselineId}`)
      } else {
        message.error(result.error || '更新失败')
      }
    } catch (error: any) {
      message.error(error.message || '更新失败')
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
              返回详情
            </Button>
            <span>编辑基准值</span>
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
                <Radio value={false}>更新当前版本</Radio>
                <Radio value={true}>创建新版本</Radio>
              </Radio.Group>
            </div>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => navigate(`/carbon/baseline/${baselineId}`)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSubmit}
                >
                  保存
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>

      <Modal
        title="确认创建新版本"
        open={versionModalVisible}
        onOk={handleVersionConfirm}
        onCancel={() => setVersionModalVisible(false)}
      >
        <p>确定要创建新版本吗？当前版本将被保留，新版本将使用新的版本号。</p>
      </Modal>
    </div>
  )
}

export default BaselineEdit

