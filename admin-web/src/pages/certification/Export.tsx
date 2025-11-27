import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Form, message, Select, Space } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const CertificationExport: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, currentRestaurant } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [exportFields, setExportFields] = useState<string[]>([])

  const allFields = [
    { key: 'basicInfo', label: '基本信息' },
    { key: 'menuInfo', label: '菜单信息' },
    { key: 'supplyChainInfo', label: '供应链信息' },
    { key: 'operationData', label: '运营数据' },
    { key: 'systemEvaluation', label: '系统评估结果' },
    { key: 'reviewRecords', label: '审核记录' },
    { key: 'documents', label: '附件文档' },
  ]

  const handleExport = async () => {
    try {
      const values = await form.validateFields()
      
      if (!currentRestaurantId) {
        message.warning('请先在顶部标题栏选择餐厅')
        return
      }

      if (exportFields.length === 0) {
        message.warning('请至少选择一个导出字段')
        return
      }

      setLoading(true)

      const result = await certificationAPI.exportMaterials({
        restaurantId: currentRestaurantId,
        format: values.format || 'pdf',
        fields: exportFields,
      })

      if (result.code === 0) {
        const format = values.format || 'pdf'
        const restaurantName = currentRestaurant?.name || currentRestaurantId
        const timestamp = new Date().getTime()
        
        if (format === 'json' && result.data.exportData) {
          // JSON格式：直接下载JSON文件
          const dataStr = JSON.stringify(result.data.exportData, null, 2)
          const dataBlob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(dataBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `认证资料_${restaurantName}_${timestamp}.json`
          link.click()
          URL.revokeObjectURL(url)
          message.success('导出成功')
        } else if (result.data.fileUrl) {
          // PDF或Excel格式：下载文件
          const link = document.createElement('a')
          link.href = result.data.fileUrl
          link.download = `认证资料_${restaurantName}_${timestamp}.${format}`
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          message.success('导出成功')
        } else if (result.data.exportData) {
          // 如果没有文件URL，但有数据，提示用户
          message.warning('文件生成功能待完善，当前仅支持JSON格式导出')
        } else {
          message.success('导出请求已提交')
        }
      } else {
        message.error(result.message || '导出失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      console.error('导出失败:', error)
      message.error('导出失败')
    } finally {
      setLoading(false)
    }
  }

  if (!currentRestaurantId) {
    return (
      <Card title="认证资料导出">
        <Alert
          message="请选择餐厅"
          description="请先在顶部标题栏选择要导出资料的餐厅"
          type="info"
          showIcon
        />
      </Card>
    )
  }

  return (
    <div>

      <Card
        title="认证资料导出"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>
            重置
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="format" label="导出格式" initialValue="pdf">
            <Select>
              <Select.Option value="pdf">PDF</Select.Option>
              <Select.Option value="excel">Excel</Select.Option>
              <Select.Option value="json">JSON</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="选择导出字段">
            <Checkbox.Group
              options={allFields.map(f => ({ label: f.label, value: f.key }))}
              value={exportFields}
              onChange={setExportFields}
            />
            <div style={{ marginTop: 8 }}>
              <Button
                type="link"
                size="small"
                onClick={() => setExportFields(allFields.map(f => f.key))}
              >
                全选
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => setExportFields([])}
              >
                清空
              </Button>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={loading}
              onClick={handleExport}
              block
            >
              导出资料
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default CertificationExport

