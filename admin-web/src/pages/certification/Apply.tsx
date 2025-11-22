import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  CheckOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

const { Step } = Steps
const { TextArea } = Input
const { Option } = Select
const { Panel } = Collapse
const { Text } = Typography

interface MenuItem {
  id: string
  name: string
  ingredients: string
  quantity: number
  unit: string
  cookingMethod?: string
}

const CertificationApply: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, restaurants, currentTenantId } = useAppSelector((state: any) => state.tenant)
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(currentRestaurantId)
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({}) // 存储上传后的文件ID
  const [searchParams] = useSearchParams()
  const [isRenewal, setIsRenewal] = useState(false) // 是否为续期申请
  const [dishModalVisible, setDishModalVisible] = useState(false) // 菜品Modal显示状态
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null) // 正在编辑的菜品
  const [dishForm] = Form.useForm() // 菜品表单

  useEffect(() => {
    // 检查URL参数，判断是否为续期申请
    const type = searchParams.get('type')
    if (type === 'renewal') {
      setIsRenewal(true)
      // 可以预填充一些续期申请的数据
    }
  }, [searchParams])

  const currentRestaurant = selectedRestaurantId
    ? restaurants.find((r: any) => r.id === selectedRestaurantId)
    : null

  useEffect(() => {
    // 如果当前选中的餐厅有信息，自动填充表单
    if (currentRestaurant) {
      form.setFieldsValue({
        restaurantName: currentRestaurant.name,
        contactPhone: currentRestaurant.phone,
        address: currentRestaurant.address,
      })
    }
  }, [currentRestaurant, form])

  const steps = [
    {
      title: t('pages.certification.apply.steps.basicInfo'),
      description: t('pages.certification.apply.steps.basicInfoDesc'),
    },
    {
      title: t('pages.certification.apply.steps.menuInfo'),
      description: t('pages.certification.apply.steps.menuInfoDesc'),
    },
    {
      title: t('pages.certification.apply.steps.supplyChain'),
      description: t('pages.certification.apply.steps.supplyChainDesc'),
    },
    {
      title: t('pages.certification.apply.steps.operationData'),
      description: t('pages.certification.apply.steps.operationDataDesc'),
    },
    {
      title: t('pages.certification.apply.steps.documents'),
      description: t('pages.certification.apply.steps.documentsDesc'),
    },
    {
      title: t('pages.certification.apply.steps.preview'),
      description: t('pages.certification.apply.steps.previewDesc'),
    },
  ]

  const handleNext = () => {
    form.validateFields().then(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    })
  }

  const handlePrev = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSaveDraft = async () => {
    if (!selectedRestaurantId && restaurants.length > 1) {
      message.warning(t('pages.certification.apply.messages.selectRestaurantRequired'))
      return
    }

    try {
      setLoading(true)
      const values = form.getFieldsValue()
      const restaurantId = selectedRestaurantId || currentRestaurantId
      const tenantId = currentTenantId

      if (!restaurantId || !tenantId) {
        message.error('餐厅ID或租户ID缺失')
        return
      }

      const draftData = {
        basicInfo: {
          restaurantName: values.restaurantName,
          address: values.address,
          contactPhone: values.contactPhone,
          contactEmail: values.contactEmail,
          legalPerson: values.legalPerson,
          businessLicense: uploadedFiles.businessLicense
        },
        menuInfo: {
          menuItems: menuItems.map(item => ({
            name: item.name,
            ingredients: item.ingredients.split(',').map(i => i.trim()),
            quantity: item.quantity,
            unit: item.unit,
            cookingMethod: item.cookingMethod || 'steamed'
          }))
        },
        supplyChainInfo: {
          suppliers: values.supplierInfo ? [{ name: values.supplierInfo }] : [],
          localIngredientRatio: parseFloat(values.localIngredientRatio) || 0,
          traceabilityInfo: values.ingredientSource || ''
        },
        operationData: {
          energyUsage: values.energyUsage || '',
          wasteReduction: values.wasteReduction || '',
          socialInitiatives: values.socialInitiatives ? values.socialInitiatives.split('\n') : []
        },
        documents: Object.keys(uploadedFiles).map(type => ({
          type,
          fileId: uploadedFiles[type],
          fileName: fileList.find(f => f.uid === uploadedFiles[type])?.name || ''
        }))
      }

      const result = await certificationAPI.saveDraft({
        restaurantId,
        tenantId,
        draftData,
        draftName: `草稿-${new Date().toLocaleString()}`
      })

      if (result.code === 0) {
        message.success(t('pages.certification.apply.messages.draftSaved'))
      } else {
        message.error(result.message || '保存失败')
      }
    } catch (error: any) {
      console.error('保存草稿失败:', error)
      message.error(error.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedRestaurantId && restaurants.length > 1) {
      message.warning(t('pages.certification.apply.messages.selectRestaurantRequired'))
      return
    }

    try {
      await form.validateFields()
      setLoading(true)
      const values = form.getFieldsValue()
      const restaurantId = selectedRestaurantId || currentRestaurantId
      const tenantId = currentTenantId

      if (!restaurantId || !tenantId) {
        message.error('餐厅ID或租户ID缺失')
        return
      }

      const applicationData = {
        restaurantId,
        tenantId,
        basicInfo: {
          restaurantName: values.restaurantName,
          address: values.address,
          contactPhone: values.contactPhone,
          contactEmail: values.contactEmail,
          legalPerson: values.legalPerson,
          businessLicense: uploadedFiles.businessLicense
        },
        menuInfo: {
          menuItems: menuItems.map(item => ({
            name: item.name,
            ingredients: item.ingredients.split(',').map(i => i.trim()),
            quantity: item.quantity,
            unit: item.unit,
            cookingMethod: item.cookingMethod || 'steamed'
          }))
        },
        supplyChainInfo: {
          suppliers: values.supplierInfo ? [{ name: values.supplierInfo }] : [],
          localIngredientRatio: parseFloat(values.localIngredientRatio) || 0,
          traceabilityInfo: values.ingredientSource || ''
        },
        operationData: {
          energyUsage: values.energyUsage || '',
          wasteReduction: values.wasteReduction || '',
          socialInitiatives: values.socialInitiatives ? values.socialInitiatives.split('\n') : []
        },
        documents: Object.keys(uploadedFiles).map(type => ({
          type,
          fileId: uploadedFiles[type],
          fileName: fileList.find(f => f.uid === uploadedFiles[type])?.name || ''
        }))
      }

      const result = await certificationAPI.apply(applicationData)

      if (result.code === 0) {
        message.success(t('pages.certification.apply.messages.submitSuccess'))
        // 跳转到认证进度页面
        navigate('/certification/status')
      } else {
        message.error(result.message || '提交失败')
      }
    } catch (error: any) {
      console.error('提交认证申请失败:', error)
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  const handleMenuImport = (file: File) => {
    // TODO: 实现Excel/CSV批量导入菜单
    message.info(t('pages.certification.apply.messages.menuImportInProgress'))
    return false
  }

  // 打开添加菜品Modal
  const handleAddDish = () => {
    setEditingDish(null)
    dishForm.resetFields()
    setDishModalVisible(true)
  }

  // 打开编辑菜品Modal
  const handleEditDish = (dish: MenuItem) => {
    setEditingDish(dish)
    dishForm.setFieldsValue({
      name: dish.name,
      ingredients: dish.ingredients,
      quantity: dish.quantity,
      unit: dish.unit,
      cookingMethod: dish.cookingMethod || 'steamed',
    })
    setDishModalVisible(true)
  }

  // 删除菜品
  const handleDeleteDish = (dishId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个菜品吗？',
      onOk: () => {
        setMenuItems(prev => prev.filter(item => item.id !== dishId))
        message.success('删除成功')
      },
    })
  }

  // 保存菜品（添加或编辑）
  const handleSaveDish = async () => {
    try {
      const values = await dishForm.validateFields()
      
      if (editingDish) {
        // 编辑模式
        setMenuItems(prev =>
          prev.map(item =>
            item.id === editingDish.id
              ? {
                  ...item,
                  name: values.name,
                  ingredients: values.ingredients,
                  quantity: values.quantity,
                  unit: values.unit,
                  cookingMethod: values.cookingMethod,
                }
              : item
          )
        )
        message.success('编辑成功')
      } else {
        // 添加模式
        const newDish: MenuItem = {
          id: `dish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: values.name,
          ingredients: values.ingredients,
          quantity: values.quantity,
          unit: values.unit,
          cookingMethod: values.cookingMethod,
        }
        setMenuItems(prev => [...prev, newDish])
        message.success('添加成功')
      }
      
      setDishModalVisible(false)
      dishForm.resetFields()
      setEditingDish(null)
    } catch (error) {
      // 表单验证失败
      console.error('表单验证失败:', error)
    }
  }

  // 处理文件上传
  const handleFileUpload = async (file: File, documentType: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string
          const result = await certificationAPI.uploadFile({
            base64,
            fileName: file.name,
            fileType: file.type,
            documentType
          })

          if (result.code === 0) {
            resolve(result.data.fileID)
          } else {
            reject(new Error(result.message || '上传失败'))
          }
        } catch (error: any) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsDataURL(file)
    })
  }

  // 文件上传前的处理
  const beforeUpload = async (file: File, documentType: string) => {
    try {
      setLoading(true)
      const fileID = await handleFileUpload(file, documentType)
      if (fileID) {
        setUploadedFiles(prev => ({ ...prev, [documentType]: fileID }))
        setFileList(prev => [...prev, {
          uid: fileID,
          name: file.name,
          status: 'done',
          url: fileID
        }])
        message.success('文件上传成功')
      }
      return false // 阻止默认上传
    } catch (error: any) {
      message.error(error.message || '上传失败')
      return false
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="restaurantName"
                  label={t('pages.certification.apply.fields.restaurantName')}
                  rules={[{ required: true, message: t('pages.certification.apply.messages.restaurantNameRequired') }]}
                >
                  <Input placeholder={t('pages.certification.apply.placeholders.restaurantName')} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="legalPerson"
                  label={t('pages.certification.apply.fields.legalPerson')}
                  rules={[{ required: true, message: t('pages.certification.apply.messages.legalPersonRequired') }]}
                >
                  <Input placeholder={t('pages.certification.apply.placeholders.legalPerson')} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contactPhone"
                  label={t('pages.certification.apply.fields.contactPhone')}
                  rules={[{ required: true, message: t('pages.certification.apply.messages.contactPhoneRequired') }]}
                >
                  <Input placeholder={t('pages.certification.apply.placeholders.contactPhone')} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="contactEmail"
                  label={t('pages.certification.apply.fields.contactEmail')}
                  rules={[
                    { required: true, message: t('pages.certification.apply.messages.contactEmailRequired') },
                    { type: 'email', message: t('pages.certification.apply.messages.emailInvalid') },
                  ]}
                >
                  <Input placeholder={t('pages.certification.apply.placeholders.contactEmail')} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="address"
              label={t('pages.certification.apply.fields.address')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.addressRequired') }]}
            >
              <TextArea rows={3} placeholder={t('pages.certification.apply.placeholders.address')} />
            </Form.Item>
          </Form>
        )
      case 1:
        return (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Upload
                accept=".xlsx,.xls,.csv"
                beforeUpload={handleMenuImport}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />}>{t('pages.certification.apply.buttons.batchImportMenu')}</Button>
              </Upload>
              <Button type="primary" onClick={handleAddDish}>
                {t('pages.certification.apply.buttons.addDish')}
              </Button>
            </Space>
            <Table
              dataSource={menuItems}
              columns={[
                { 
                  title: t('pages.certification.apply.menuTable.columns.name'), 
                  dataIndex: 'name', 
                  key: 'name' 
                },
                { 
                  title: t('pages.certification.apply.menuTable.columns.ingredients'), 
                  dataIndex: 'ingredients', 
                  key: 'ingredients',
                  render: (text: string) => text || '-'
                },
                { 
                  title: t('pages.certification.apply.menuTable.columns.quantity'), 
                  dataIndex: 'quantity', 
                  key: 'quantity',
                  render: (quantity: number) => quantity || '-'
                },
                { 
                  title: t('pages.certification.apply.menuTable.columns.unit'), 
                  dataIndex: 'unit', 
                  key: 'unit',
                  render: (text: string) => text || '-'
                },
                {
                  title: t('pages.certification.apply.menuTable.columns.actions'),
                  key: 'action',
                  width: 150,
                  render: (_: any, record: MenuItem) => (
                    <Space>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => handleEditDish(record)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button 
                        type="link" 
                        size="small" 
                        danger
                        onClick={() => handleDeleteDish(record.id)}
                      >
                        {t('common.delete')}
                      </Button>
                    </Space>
                  ),
                },
              ]}
              pagination={false}
              rowKey="id"
              locale={{
                emptyText: '暂无菜品，请点击"添加菜品"按钮添加'
              }}
            />
          </div>
        )
      case 2:
        return (
          <Form form={form} layout="vertical">
            <Form.Item
              name="supplierInfo"
              label={t('pages.certification.apply.fields.supplierInfo')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.supplierInfoRequired') }]}
            >
              <TextArea rows={4} placeholder={t('pages.certification.apply.placeholders.supplierInfo')} />
            </Form.Item>
            <Form.Item
              name="ingredientSource"
              label={t('pages.certification.apply.fields.ingredientSource')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.ingredientSourceRequired') }]}
            >
              <TextArea rows={4} placeholder={t('pages.certification.apply.placeholders.ingredientSource')} />
            </Form.Item>
            <Form.Item
              name="localIngredientRatio"
              label={t('pages.certification.apply.fields.localIngredientRatio')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.localIngredientRatioRequired') }]}
            >
              <Input
                type="number"
                placeholder={t('pages.certification.apply.placeholders.percentage')}
                addonAfter="%"
                min={0}
                max={100}
              />
            </Form.Item>
          </Form>
        )
      case 3:
        return (
          <Form form={form} layout="vertical">
            <Form.Item
              name="energyUsage"
              label={t('pages.certification.apply.fields.energyUsage')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.energyUsageRequired') }]}
            >
              <TextArea
                rows={4}
                placeholder={t('pages.certification.apply.placeholders.energyUsage')}
              />
            </Form.Item>
            <Form.Item
              name="wasteReduction"
              label={t('pages.certification.apply.fields.wasteReduction')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.wasteReductionRequired') }]}
            >
              <TextArea
                rows={4}
                placeholder={t('pages.certification.apply.placeholders.wasteReduction')}
              />
            </Form.Item>
            <Form.Item
              name="socialInitiatives"
              label={t('pages.certification.apply.fields.socialInitiatives')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.socialInitiativesRequired') }]}
            >
              <TextArea
                rows={4}
                placeholder={t('pages.certification.apply.placeholders.socialInitiatives')}
              />
            </Form.Item>
          </Form>
        )
      case 4:
        return (
          <div>
            <Form form={form} layout="vertical">
              <Form.Item label={t('pages.certification.apply.documents.businessLicense')}>
                <Upload
                  fileList={fileList.filter(f => uploadedFiles.businessLicense === f.uid)}
                  beforeUpload={(file) => beforeUpload(file, 'businessLicense')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onRemove={() => {
                    setUploadedFiles(prev => {
                      const newFiles = { ...prev }
                      delete newFiles.businessLicense
                      return newFiles
                    })
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={loading}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.foodLicense')}>
                <Upload
                  fileList={fileList.filter(f => uploadedFiles.foodLicense === f.uid)}
                  beforeUpload={(file) => beforeUpload(file, 'foodLicense')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onRemove={() => {
                    setUploadedFiles(prev => {
                      const newFiles = { ...prev }
                      delete newFiles.foodLicense
                      return newFiles
                    })
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={loading}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.supplierCert')}>
                <Upload
                  fileList={fileList.filter(f => uploadedFiles.supplierCert === f.uid)}
                  beforeUpload={(file) => beforeUpload(file, 'supplierCert')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onRemove={() => {
                    setUploadedFiles(prev => {
                      const newFiles = { ...prev }
                      delete newFiles.supplierCert
                      return newFiles
                    })
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={loading}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.otherDocuments')}>
                <Upload
                  fileList={fileList.filter(f => uploadedFiles.other === f.uid)}
                  beforeUpload={(file) => beforeUpload(file, 'other')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onRemove={() => {
                    setUploadedFiles(prev => {
                      const newFiles = { ...prev }
                      delete newFiles.other
                      return newFiles
                    })
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={loading}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
            </Form>
          </div>
        )
      case 5:
        return (
          <Card>
            <h3>{t('pages.certification.apply.preview.confirmMessage')}</h3>
            <Form form={form} layout="vertical">
              <Form.Item label={t('pages.certification.apply.fields.restaurantName')}>
                <Input disabled value={form.getFieldValue('restaurantName')} />
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.preview.contactInfo')}>
                <Input disabled value={form.getFieldValue('contactPhone')} />
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.fields.address')}>
                <TextArea disabled rows={2} value={form.getFieldValue('address')} />
              </Form.Item>
            </Form>
          </Card>
        )
      default:
        return null
    }
  }

  const certificationLevelMap: Record<string, string> = {
    gold: t('pages.certification.apply.certificationLevels.gold'),
    silver: t('pages.certification.apply.certificationLevels.silver'),
    bronze: t('pages.certification.apply.certificationLevels.bronze'),
    platinum: t('pages.certification.apply.certificationLevels.platinum')
  }

  // 认证标准简要说明
  const standardSummary = [
    { dimension: '低碳菜品占比', requirement: '≥40%，核心菜品需提供碳足迹标签', weight: '40%' },
    { dimension: '食材与供应链', requirement: '本地或可追溯低碳食材占比 ≥30%', weight: '20%' },
    { dimension: '能源与运营', requirement: '年度能源强度下降 ≥10% 或绿色能源证明', weight: '10%' },
    { dimension: '食物浪费管理', requirement: '月度浪费减量目标 ≥15%', weight: '15%' },
    { dimension: '社会传播与教育', requirement: '不少于 3 项低碳倡导举措', weight: '15%' },
  ]

  return (
    <div>
      {/* 认证标准提示卡片 */}
      <Collapse
        defaultActiveKey={[]}
        style={{ marginBottom: 16 }}
        ghost
      >
        <Panel
          header={
            <Space>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              <Text strong>气候餐厅认证标准</Text>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                点击查看详细标准要求
              </Text>
            </Space>
          }
          key="1"
        >
          <Card size="small" style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>达标标准：</Text>
                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                  <li>所有达标项必须全部满足</li>
                  <li>系统自动评估得分 ≥ 80 分（满分 100 分）</li>
                  <li>人工抽检无重大风险项</li>
                </ul>
              </div>
              <div>
                <Text strong>五大维度评估标准：</Text>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  {standardSummary.map((item, index) => (
                    <Col span={24} key={index}>
                      <Card size="small" style={{ background: '#f5f5f5' }}>
                        <Space>
                          <Text strong>{item.dimension}</Text>
                          <Tag color="blue">{item.weight}</Tag>
                          <Text type="secondary">{item.requirement}</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <Link to="/certification/standard">
                  <Button type="link" size="small">
                    查看详细标准说明 →
                  </Button>
                </Link>
              </div>
            </Space>
          </Card>
        </Panel>
      </Collapse>

      {!currentRestaurantId && restaurants.length > 1 && (
        <Alert
          message={t('pages.certification.apply.alerts.selectRestaurant')}
          description={
            <div style={{ marginTop: 8 }}>
              <Select
                placeholder={t('pages.certification.apply.placeholders.selectRestaurant')}
                style={{ width: 300 }}
                value={selectedRestaurantId}
                onChange={setSelectedRestaurantId}
              >
                {restaurants.map((restaurant: any) => (
                  <Select.Option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                    {restaurant.certificationStatus === 'certified' && (
                      <span style={{ color: '#52c41a', marginLeft: 8 }}>（{t('pages.certification.apply.status.certified')}）</span>
                    )}
                  </Select.Option>
                ))}
              </Select>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {currentRestaurant && currentRestaurant.certificationStatus === 'certified' && (
        <Alert
          message={t('pages.certification.apply.alerts.restaurantCertified', { name: currentRestaurant.name })}
          description={t('pages.certification.apply.alerts.currentLevel', { level: certificationLevelMap[currentRestaurant.certificationLevel] || currentRestaurant.certificationLevel })}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} description={step.description} />
          ))}
        </Steps>

        <div style={{ minHeight: 400, marginBottom: 24 }}>
          {renderStepContent()}
        </div>

        <div style={{ textAlign: 'right' }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>{t('common.previous')}</Button>
            )}
            <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading}>
              {t('pages.certification.apply.buttons.saveDraft')}
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={handleNext}>
                {t('common.next')}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleSubmit}
                loading={loading}
              >
                {t('pages.certification.apply.buttons.submit')}
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* 添加/编辑菜品Modal */}
      <Modal
        title={editingDish ? '编辑菜品' : '添加菜品'}
        open={dishModalVisible}
        onOk={handleSaveDish}
        onCancel={() => {
          setDishModalVisible(false)
          dishForm.resetFields()
          setEditingDish(null)
        }}
        width={600}
        destroyOnClose
      >
        <Form
          form={dishForm}
          layout="vertical"
          initialValues={{
            unit: 'g',
            cookingMethod: 'steamed',
          }}
        >
          <Form.Item
            name="name"
            label="菜品名称"
            rules={[{ required: true, message: '请输入菜品名称' }]}
          >
            <Input placeholder="请输入菜品名称，如：麻婆豆腐" />
          </Form.Item>

          <Form.Item
            name="ingredients"
            label="食材（用逗号分隔）"
            rules={[{ required: true, message: '请输入食材' }]}
            extra="多个食材请用逗号分隔，如：豆腐,豆瓣酱,花椒"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入食材，多个食材用逗号分隔"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="数量"
                rules={[
                  { required: true, message: '请输入数量' },
                  { type: 'number', min: 0.01, message: '数量必须大于0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入数量"
                  min={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="单位"
                rules={[{ required: true, message: '请选择单位' }]}
              >
                <Select placeholder="请选择单位">
                  <Option value="g">克(g)</Option>
                  <Option value="kg">千克(kg)</Option>
                  <Option value="ml">毫升(ml)</Option>
                  <Option value="l">升(l)</Option>
                  <Option value="个">个</Option>
                  <Option value="份">份</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="cookingMethod"
            label="烹饪方式"
            rules={[{ required: true, message: '请选择烹饪方式' }]}
          >
            <Select placeholder="请选择烹饪方式">
              <Option value="raw">生食</Option>
              <Option value="steamed">蒸</Option>
              <Option value="boiled">煮</Option>
              <Option value="stir_fried">炒</Option>
              <Option value="fried">炸</Option>
              <Option value="baked">烤</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CertificationApply

