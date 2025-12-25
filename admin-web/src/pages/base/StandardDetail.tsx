/**
 * 食材标准库管理 - 标准名称详情/编辑页
 * 仅平台运营角色可见
 */
import { ingredientStandardAPI } from '@/services/ingredientStandard'
import { useCategoryOptions } from '@/hooks/useIngredientCategories'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Tabs,
  message,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AliasManagement from './components/AliasManagement'

const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

interface IngredientStandard {
  standardName: string
  nameEn?: string
  category: string
  subCategory?: string
  description?: string
  defaultUnit?: string
  carbonCoefficient?: number
  status?: 'active' | 'deprecated'
  version?: number
}

const StandardDetail: React.FC = () => {
  const navigate = useNavigate()
  const { standardName: standardNameParam } = useParams<{ standardName: string }>()
  const isNew = standardNameParam === 'new'
  const standardName = isNew ? '' : decodeURIComponent(standardNameParam || '')
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<IngredientStandard>()
  const [originalStandardName, setOriginalStandardName] = useState<string>('')
  
  // 获取类别选项
  const { options: categoryOptions, loading: categoriesLoading } = useCategoryOptions({
    status: 'active',
  })

  // 加载标准名称详情
  useEffect(() => {
    if (!isNew && standardName) {
      loadStandardDetail()
    }
  }, [isNew, standardName])

  const loadStandardDetail = async () => {
    setLoading(true)
    try {
      const result = await ingredientStandardAPI.standard.get(standardName)
      if (result && result.code === 0 && result.data) {
        const data = result.data
        setOriginalStandardName(data.standardName)
        form.setFieldsValue({
          standardName: data.standardName,
          nameEn: data.nameEn,
          category: data.category,
          subCategory: data.subCategory,
          description: data.description,
          defaultUnit: data.defaultUnit,
          carbonCoefficient: data.carbonCoefficient,
        })
      } else {
        message.error(result?.message || '获取标准名称详情失败')
        navigate('/base/standards')
      }
    } catch (error: any) {
      message.error(error.message || '获取标准名称详情失败')
      navigate('/base/standards')
    } finally {
      setLoading(false)
    }
  }

  // 保存标准名称
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      let result
      if (isNew) {
        // 创建新标准名称
        result = await ingredientStandardAPI.standard.create({
          standardName: values.standardName,
          nameEn: values.nameEn,
          category: values.category,
          subCategory: values.subCategory,
          description: values.description,
          defaultUnit: values.defaultUnit,
          carbonCoefficient: values.carbonCoefficient,
        })
      } else {
        // 更新现有标准名称
        result = await ingredientStandardAPI.standard.update(originalStandardName, {
          standardName: values.standardName !== originalStandardName ? values.standardName : undefined,
          nameEn: values.nameEn,
          category: values.category,
          subCategory: values.subCategory,
          description: values.description,
          defaultUnit: values.defaultUnit,
          carbonCoefficient: values.carbonCoefficient,
        })
      }

      if (result && result.code === 0) {
        message.success(isNew ? '创建成功' : '更新成功')
        if (isNew || values.standardName !== originalStandardName) {
          navigate(`/base/standards/${encodeURIComponent(values.standardName)}`)
          setOriginalStandardName(values.standardName)
        } else {
          loadStandardDetail()
        }
      } else {
        message.error(result?.message || (isNew ? '创建失败' : '更新失败'))
      }
    } catch (error: any) {
      if (error.errorFields) {
        return // 表单验证错误，不显示错误消息
      }
      message.error(error.message || (isNew ? '创建失败' : '更新失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/base/standards')}
          >
            返回列表
          </Button>
          <Space>
            <Button onClick={() => navigate('/base/standards')}>取消</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存
            </Button>
          </Space>
        </div>

        <Spin spinning={loading}>
          <Tabs defaultActiveKey="basic">
            <TabPane tab="基本信息" key="basic">
              <Form
                form={form}
                layout="vertical"
                style={{ maxWidth: 800, marginTop: '24px' }}
                initialValues={{
                  category: 'vegetables',
                  defaultUnit: 'g',
                  status: 'active',
                }}
              >
                <Form.Item
                  name="standardName"
                  label="标准名称"
                  rules={[
                    { required: true, message: '请输入标准名称' },
                    { max: 100, message: '标准名称不能超过100个字符' },
                  ]}
                >
                  <Input placeholder="请输入标准名称" disabled={!isNew} />
                </Form.Item>

                <Form.Item
                  name="nameEn"
                  label="英文名称"
                  rules={[{ max: 100, message: '英文名称不能超过100个字符' }]}
                >
                  <Input placeholder="请输入英文名称" />
                </Form.Item>

                <Form.Item
                  name="category"
                  label="分类"
                  rules={[{ required: true, message: '请选择分类' }]}
                >
                  <Select 
                    placeholder="请选择分类"
                    loading={categoriesLoading}
                    notFoundContent={categoriesLoading ? '加载中...' : '暂无类别'}
                  >
                    {categoryOptions.map((opt) => (
                      <Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="subCategory"
                  label="子分类"
                >
                  <Input placeholder="请输入子分类（可选）" />
                </Form.Item>

                <Form.Item
                  name="defaultUnit"
                  label="默认单位"
                  rules={[{ required: true, message: '请输入默认单位' }]}
                >
                  <Select placeholder="请选择默认单位">
                    <Option value="g">克(g)</Option>
                    <Option value="kg">千克(kg)</Option>
                    <Option value="ml">毫升(ml)</Option>
                    <Option value="l">升(l)</Option>
                    <Option value="piece">个</Option>
                    <Option value="cup">杯</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="carbonCoefficient"
                  label="碳系数"
                >
                  <InputNumber
                    placeholder="请输入碳系数（可选）"
                    style={{ width: '100%' }}
                    min={0}
                    precision={4}
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="描述"
                >
                  <TextArea
                    placeholder="请输入描述（可选）"
                    rows={4}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </Form>
            </TabPane>
            {!isNew && (
              <TabPane tab="别名管理" key="aliases">
                <AliasManagement standardName={standardName} />
              </TabPane>
            )}
          </Tabs>
        </Spin>
      </Card>
    </div>
  )
}

export default StandardDetail
