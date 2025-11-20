import { useAppSelector } from '@/store/hooks'
import {
    CheckOutlined,
    SaveOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import {
    Alert,
    Button,
    Card,
    Col,
    Form,
    Input,
    Row,
    Select,
    Space,
    Steps,
    Table,
    Upload,
    message,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { Step } = Steps
const { TextArea } = Input
const { Option } = Select

interface MenuItem {
  id: string
  name: string
  ingredients: string
  quantity: number
  unit: string
}

const CertificationApply: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(currentRestaurantId)

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

  const handleSaveDraft = () => {
    message.success(t('pages.certification.apply.messages.draftSaved'))
  }

  const handleSubmit = () => {
    if (!selectedRestaurantId && restaurants.length > 1) {
      message.warning(t('pages.certification.apply.messages.selectRestaurantRequired'))
      return
    }
    form.validateFields().then((values) => {
      const restaurantId = selectedRestaurantId || currentRestaurantId
      console.log('提交数据:', { ...values, restaurantId })
      message.success(t('pages.certification.apply.messages.submitSuccess'))
    })
  }

  const handleMenuImport = (file: File) => {
    // TODO: 实现Excel/CSV批量导入菜单
    message.info(t('pages.certification.apply.messages.menuImportInProgress'))
    return false
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
              <Button type="primary">{t('pages.certification.apply.buttons.addDish')}</Button>
            </Space>
            <Table
              dataSource={menuItems}
              columns={[
                { title: t('pages.certification.apply.menuTable.columns.name'), dataIndex: 'name', key: 'name' },
                { title: t('pages.certification.apply.menuTable.columns.ingredients'), dataIndex: 'ingredients', key: 'ingredients' },
                { title: t('pages.certification.apply.menuTable.columns.quantity'), dataIndex: 'quantity', key: 'quantity' },
                { title: t('pages.certification.apply.menuTable.columns.unit'), dataIndex: 'unit', key: 'unit' },
                {
                  title: t('pages.certification.apply.menuTable.columns.actions'),
                  key: 'action',
                  render: () => (
                    <Space>
                      <Button type="link" size="small">
                        {t('common.edit')}
                      </Button>
                      <Button type="link" size="small" danger>
                        {t('common.delete')}
                      </Button>
                    </Space>
                  ),
                },
              ]}
              pagination={false}
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
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  accept=".pdf,.jpg,.jpeg,.png"
                >
                  <Button icon={<UploadOutlined />}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.foodLicense')}>
                <Upload accept=".pdf,.jpg,.jpeg,.png">
                  <Button icon={<UploadOutlined />}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.supplierCert')}>
                <Upload accept=".pdf,.jpg,.jpeg,.png">
                  <Button icon={<UploadOutlined />}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.otherDocuments')}>
                <Upload accept=".pdf,.jpg,.jpeg,.png">
                  <Button icon={<UploadOutlined />}>{t('common.upload')}</Button>
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

  return (
    <div>
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
            <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
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
              >
                {t('pages.certification.apply.buttons.submit')}
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default CertificationApply

