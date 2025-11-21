import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Form, message, Select, Space, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const CertificationExport: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(currentRestaurantId)
  const [exportFields, setExportFields] = useState<string[]>([])

  useEffect(() => {
    if (restaurants.length === 1 && !currentRestaurantId) {
      setSelectedRestaurantId(restaurants[0].id)
    } else if (currentRestaurantId) {
      setSelectedRestaurantId(currentRestaurantId)
    }
  }, [restaurants, currentRestaurantId])

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
      
      if (!selectedRestaurantId) {
        message.warning('请先选择餐厅')
        return
      }

      if (exportFields.length === 0) {
        message.warning('请至少选择一个导出字段')
        return
      }

      setLoading(true)

      const result = await certificationAPI.exportMaterials({
        restaurantId: selectedRestaurantId,
        format: values.format || 'pdf',
        fields: exportFields,
      })

      if (result.code === 0) {
        if (result.data.exportData) {
          // 如果返回了数据，创建下载
          const dataStr = JSON.stringify(result.data.exportData, null, 2)
          const dataBlob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(dataBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `认证资料_${selectedRestaurantId}_${new Date().getTime()}.json`
          link.click()
          URL.revokeObjectURL(url)
        }
        message.success('导出成功')
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

  if (!selectedRestaurantId && restaurants.length > 0) {
    return (
      <Card title="认证资料导出">
        <div style={{ textAlign: 'center', padding: 50 }}>
          <p style={{ color: '#999', marginBottom: 16 }}>请先选择餐厅</p>
          <Select
            placeholder="选择餐厅"
            style={{ width: 300 }}
            value={selectedRestaurantId}
            onChange={setSelectedRestaurantId}
          >
            {restaurants.map((restaurant: any) => (
              <Select.Option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Card>
    )
  }

  return (
    <div>
      {restaurants.length > 1 && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <span>选择餐厅：</span>
            <Select
              style={{ width: 300 }}
              value={selectedRestaurantId}
              onChange={setSelectedRestaurantId}
            >
              {restaurants.map((restaurant: any) => (
                <Select.Option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </Select.Option>
              ))}
            </Select>
          </Space>
        </Card>
      )}

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

