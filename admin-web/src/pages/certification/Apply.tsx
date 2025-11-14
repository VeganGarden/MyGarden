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
      title: '基本信息',
      description: '填写餐厅基本信息',
    },
    {
      title: '菜单信息',
      description: '上传菜单和菜品信息',
    },
    {
      title: '供应链信息',
      description: '填写供应商和食材来源',
    },
    {
      title: '运营数据',
      description: '填写能源使用和浪费管理数据',
    },
    {
      title: '资料上传',
      description: '上传相关证明文件',
    },
    {
      title: '预览确认',
      description: '确认并提交申请',
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
    message.success('草稿已保存')
  }

  const handleSubmit = () => {
    if (!selectedRestaurantId && restaurants.length > 1) {
      message.warning('请先选择要申请认证的餐厅')
      return
    }
    form.validateFields().then((values) => {
      const restaurantId = selectedRestaurantId || currentRestaurantId
      console.log('提交数据:', { ...values, restaurantId })
      message.success('认证申请已提交，等待审核')
    })
  }

  const handleMenuImport = (file: File) => {
    // TODO: 实现Excel/CSV批量导入菜单
    message.info('菜单批量导入功能开发中')
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
                  label="餐厅名称"
                  rules={[{ required: true, message: '请输入餐厅名称' }]}
                >
                  <Input placeholder="请输入餐厅名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="legalPerson"
                  label="法人代表"
                  rules={[{ required: true, message: '请输入法人代表' }]}
                >
                  <Input placeholder="请输入法人代表" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contactPhone"
                  label="联系电话"
                  rules={[{ required: true, message: '请输入联系电话' }]}
                >
                  <Input placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="contactEmail"
                  label="联系邮箱"
                  rules={[
                    { required: true, message: '请输入联系邮箱' },
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Input placeholder="请输入联系邮箱" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="address"
              label="餐厅地址"
              rules={[{ required: true, message: '请输入餐厅地址' }]}
            >
              <TextArea rows={3} placeholder="请输入详细地址" />
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
                <Button icon={<UploadOutlined />}>批量导入菜单</Button>
              </Upload>
              <Button type="primary">添加菜品</Button>
            </Space>
            <Table
              dataSource={menuItems}
              columns={[
                { title: '菜品名称', dataIndex: 'name', key: 'name' },
                { title: '食材', dataIndex: 'ingredients', key: 'ingredients' },
                { title: '份量', dataIndex: 'quantity', key: 'quantity' },
                { title: '单位', dataIndex: 'unit', key: 'unit' },
                {
                  title: '操作',
                  key: 'action',
                  render: () => (
                    <Space>
                      <Button type="link" size="small">
                        编辑
                      </Button>
                      <Button type="link" size="small" danger>
                        删除
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
              label="供应商信息"
              rules={[{ required: true, message: '请输入供应商信息' }]}
            >
              <TextArea rows={4} placeholder="请填写主要供应商名称、联系方式、认证信息等" />
            </Form.Item>
            <Form.Item
              name="ingredientSource"
              label="食材来源"
              rules={[{ required: true, message: '请输入食材来源' }]}
            >
              <TextArea rows={4} placeholder="请填写食材产地、运输方式、可追溯性等信息" />
            </Form.Item>
            <Form.Item
              name="localIngredientRatio"
              label="本地食材占比"
              rules={[{ required: true, message: '请输入本地食材占比' }]}
            >
              <Input
                type="number"
                placeholder="请输入百分比"
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
              label="能源使用情况"
              rules={[{ required: true, message: '请填写能源使用情况' }]}
            >
              <TextArea
                rows={4}
                placeholder="请填写年度能源消耗数据、能源类型、节能措施等"
              />
            </Form.Item>
            <Form.Item
              name="wasteReduction"
              label="食物浪费管理"
              rules={[{ required: true, message: '请填写食物浪费管理情况' }]}
            >
              <TextArea
                rows={4}
                placeholder="请填写月度浪费减量目标、监测流程、数据记录等"
              />
            </Form.Item>
            <Form.Item
              name="socialInitiatives"
              label="社会传播与教育"
              rules={[{ required: true, message: '请填写社会传播与教育举措' }]}
            >
              <TextArea
                rows={4}
                placeholder="请填写不少于3项低碳倡导举措（如顾客教育、员工培训、公益活动等）"
              />
            </Form.Item>
          </Form>
        )
      case 4:
        return (
          <div>
            <Form form={form} layout="vertical">
              <Form.Item label="营业执照">
                <Upload
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  accept=".pdf,.jpg,.jpeg,.png"
                >
                  <Button icon={<UploadOutlined />}>上传文件</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="食品经营许可证">
                <Upload accept=".pdf,.jpg,.jpeg,.png">
                  <Button icon={<UploadOutlined />}>上传文件</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="供应商认证证书">
                <Upload accept=".pdf,.jpg,.jpeg,.png">
                  <Button icon={<UploadOutlined />}>上传文件</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="其他证明文件">
                <Upload accept=".pdf,.jpg,.jpeg,.png">
                  <Button icon={<UploadOutlined />}>上传文件</Button>
                </Upload>
              </Form.Item>
            </Form>
          </div>
        )
      case 5:
        return (
          <Card>
            <h3>请确认以下信息无误后提交申请</h3>
            <Form form={form} layout="vertical">
              <Form.Item label="餐厅名称">
                <Input disabled value={form.getFieldValue('restaurantName')} />
              </Form.Item>
              <Form.Item label="联系信息">
                <Input disabled value={form.getFieldValue('contactPhone')} />
              </Form.Item>
              <Form.Item label="餐厅地址">
                <TextArea disabled rows={2} value={form.getFieldValue('address')} />
              </Form.Item>
            </Form>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div>
      {!currentRestaurantId && restaurants.length > 1 && (
        <Alert
          message="请选择要申请认证的餐厅"
          description={
            <div style={{ marginTop: 8 }}>
              <Select
                placeholder="选择餐厅"
                style={{ width: 300 }}
                value={selectedRestaurantId}
                onChange={setSelectedRestaurantId}
              >
                {restaurants.map((restaurant: any) => (
                  <Select.Option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                    {restaurant.certificationStatus === 'certified' && (
                      <span style={{ color: '#52c41a', marginLeft: 8 }}>（已认证）</span>
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
          message={`${currentRestaurant.name}已获得认证`}
          description={`当前认证等级：${currentRestaurant.certificationLevel === 'gold' ? '金牌' : currentRestaurant.certificationLevel === 'silver' ? '银牌' : currentRestaurant.certificationLevel === 'bronze' ? '铜牌' : '白金'}`}
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
              <Button onClick={handlePrev}>上一步</Button>
            )}
            <Button icon={<SaveOutlined />} onClick={handleSaveDraft}>
              保存草稿
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleSubmit}
              >
                提交申请
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default CertificationApply

