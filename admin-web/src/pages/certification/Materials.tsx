import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  HistoryOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Space,
  Spin,
  Tabs,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { TextArea } = Input
const { TabPane } = Tabs

const CertificationMaterials: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, currentRestaurant } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basicInfo')
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (currentRestaurantId) {
      loadCurrentMaterials()
    }
  }, [currentRestaurantId, activeTab])

  const loadCurrentMaterials = async () => {
    if (!currentRestaurantId) return

    try {
      setLoadingData(true)
      // 获取当前认证申请的最新资料
      const statusResult = await certificationAPI.getStatus({
        restaurantId: currentRestaurantId
      })

      if (statusResult.code === 0 && statusResult.data) {
        // 根据当前标签页填充表单数据
        const appData = statusResult.data
        const formData: any = {}

        if (activeTab === 'basicInfo' && appData.basicInfo) {
          // 基本信息
          Object.assign(formData, {
            restaurantName: appData.basicInfo.restaurantName,
            address: appData.basicInfo.address,
            contactPhone: appData.basicInfo.contactPhone,
            contactEmail: appData.basicInfo.contactEmail,
            legalPerson: appData.basicInfo.legalPerson,
          })
        } else if (activeTab === 'menuInfo' && appData.menuInfo) {
          // 菜单信息：将菜单项数组转换为JSON字符串
          if (appData.menuInfo.menuItems && Array.isArray(appData.menuInfo.menuItems)) {
            formData.menuItems = JSON.stringify(appData.menuInfo.menuItems, null, 2)
          } else if (appData.menuInfo.menuItems) {
            formData.menuItems = typeof appData.menuInfo.menuItems === 'string' 
              ? appData.menuInfo.menuItems 
              : JSON.stringify(appData.menuInfo.menuItems, null, 2)
          }
        } else if (activeTab === 'supplyChainInfo' && appData.supplyChainInfo) {
          // 供应链信息
          Object.assign(formData, {
            suppliers: appData.supplyChainInfo.suppliers 
              ? (Array.isArray(appData.supplyChainInfo.suppliers) 
                  ? JSON.stringify(appData.supplyChainInfo.suppliers, null, 2)
                  : appData.supplyChainInfo.suppliers)
              : '',
            localIngredientRatio: appData.supplyChainInfo.localIngredientRatio,
            traceabilityInfo: appData.supplyChainInfo.traceabilityInfo || appData.supplyChainInfo.ingredientSource,
          })
        } else if (activeTab === 'operationData' && appData.operationData) {
          // 运营数据
          Object.assign(formData, {
            energyUsage: appData.operationData.energyUsage,
            wasteReduction: appData.operationData.wasteReduction,
            socialInitiatives: appData.operationData.socialInitiatives,
          })
        }

        form.setFieldsValue(formData)
      } else if (statusResult.code === 404) {
        // 没有找到申请，清空表单
        form.resetFields()
      }
    } catch (error) {
      console.error('加载当前资料失败:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!currentRestaurantId) {
        message.warning('请先在顶部标题栏选择餐厅')
        return
      }

      setLoading(true)

      // 处理菜单信息：如果是JSON字符串，尝试解析
      let processedValues = { ...values }
      if (activeTab === 'menuInfo' && values.menuItems) {
        try {
          processedValues.menuItems = JSON.parse(values.menuItems)
        } catch {
          // 如果不是有效的JSON，保持原样
        }
      }

      const materialData = {
        restaurantId: currentRestaurantId,
        materialType: activeTab,
        materialData: processedValues,
        changeReason: values.changeReason || '资料更新',
      }

      const result = await certificationAPI.updateMaterials(materialData)

      if (result.code === 0) {
        message.success('资料更新成功')
        // 重新加载当前资料
        await loadCurrentMaterials()
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
    if (!currentRestaurantId) {
      message.warning('请先在顶部标题栏选择餐厅')
      return
    }
    navigate(`/certification/materials/history?restaurantId=${currentRestaurantId}&materialType=${activeTab}`)
  }

  if (!currentRestaurantId) {
    return (
      <Card title="认证资料维护">
        <Alert
          message="请选择餐厅"
          description="请先在顶部标题栏选择要维护资料的餐厅"
          type="info"
          showIcon
        />
      </Card>
    )
  }

  return (
    <div>

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
        {loadingData && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />
          </div>
        )}
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

