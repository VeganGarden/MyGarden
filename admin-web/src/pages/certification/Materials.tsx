import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  EditOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Select,
  Space,
  Tabs,
  Upload,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { TextArea } = Input
const { TabPane } = Tabs

const CertificationMaterials: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basicInfo')
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(currentRestaurantId)

  useEffect(() => {
    if (restaurants.length === 1 && !currentRestaurantId) {
      setSelectedRestaurantId(restaurants[0].id)
    } else if (currentRestaurantId) {
      setSelectedRestaurantId(currentRestaurantId)
    }
  }, [restaurants, currentRestaurantId])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!selectedRestaurantId) {
        message.warning('请先选择餐厅')
        return
      }

      setLoading(true)

      const materialData = {
        restaurantId: selectedRestaurantId,
        materialType: activeTab,
        materialData: values,
        changeReason: values.changeReason || '资料更新',
      }

      const result = await certificationAPI.updateMaterials(materialData)

      if (result.code === 0) {
        message.success('资料更新成功')
        form.resetFields()
      } else {
        message.error(result.message || '更新失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      console.error('更新资料失败:', error)
      message.error('更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleViewHistory = () => {
    if (!selectedRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }
    navigate(`/certification/materials/history?restaurantId=${selectedRestaurantId}&materialType=${activeTab}`)
  }

  if (!selectedRestaurantId && restaurants.length > 0) {
    return (
      <Card title="认证资料维护">
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
        title="认证资料维护"
        extra={
          <Space>
            <Button icon={<HistoryOutlined />} onClick={handleViewHistory}>
              查看历史版本
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSubmit}
            >
              保存更新
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="基本信息" key="basicInfo">
            <Form form={form} layout="vertical">
              <Form.Item name="restaurantName" label="餐厅名称">
                <Input placeholder="请输入餐厅名称" />
              </Form.Item>
              <Form.Item name="address" label="地址">
                <Input placeholder="请输入地址" />
              </Form.Item>
              <Form.Item name="contactPhone" label="联系电话">
                <Input placeholder="请输入联系电话" />
              </Form.Item>
              <Form.Item name="contactEmail" label="联系邮箱">
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
              <Form.Item name="legalPerson" label="法人代表">
                <Input placeholder="请输入法人代表" />
              </Form.Item>
              <Form.Item name="changeReason" label="变更原因">
                <TextArea rows={3} placeholder="请输入变更原因" />
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="菜单信息" key="menuInfo">
            <Form form={form} layout="vertical">
              <Form.Item name="menuItems" label="菜单项">
                <TextArea
                  rows={10}
                  placeholder="请输入菜单信息（JSON格式或文本描述）"
                />
              </Form.Item>
              <Form.Item name="changeReason" label="变更原因">
                <TextArea rows={3} placeholder="请输入变更原因" />
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="供应链信息" key="supplyChainInfo">
            <Form form={form} layout="vertical">
              <Form.Item name="suppliers" label="供应商信息">
                <TextArea rows={6} placeholder="请输入供应商信息" />
              </Form.Item>
              <Form.Item name="localIngredientRatio" label="本地食材占比 (%)">
                <Input type="number" placeholder="请输入本地食材占比" />
              </Form.Item>
              <Form.Item name="traceabilityInfo" label="可追溯信息">
                <TextArea rows={4} placeholder="请输入可追溯信息" />
              </Form.Item>
              <Form.Item name="changeReason" label="变更原因">
                <TextArea rows={3} placeholder="请输入变更原因" />
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="运营数据" key="operationData">
            <Form form={form} layout="vertical">
              <Form.Item name="energyUsage" label="能源使用情况">
                <TextArea rows={4} placeholder="请输入能源使用情况" />
              </Form.Item>
              <Form.Item name="wasteReduction" label="浪费减少 (%)">
                <Input type="number" placeholder="请输入浪费减少百分比" />
              </Form.Item>
              <Form.Item name="socialInitiatives" label="社会传播与教育举措">
                <TextArea rows={6} placeholder="请输入社会传播与教育举措" />
              </Form.Item>
              <Form.Item name="changeReason" label="变更原因">
                <TextArea rows={3} placeholder="请输入变更原因" />
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default CertificationMaterials

