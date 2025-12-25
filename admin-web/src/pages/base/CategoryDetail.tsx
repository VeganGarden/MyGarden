/**
 * 食材类别管理 - 类别详情/编辑页
 * 仅平台运营角色可见
 */
import { ingredientStandardAPI } from '@/services/ingredientStandard'
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
  Tag,
} from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { IngredientCategory } from '@/types/ingredientCategory'
import CategoryKeywordManagement from './components/CategoryKeywordManagement'

const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

const CategoryDetail: React.FC = () => {
  const navigate = useNavigate()
  const { categoryCode: categoryCodeParam } = useParams<{ categoryCode: string }>()
  const isNew = categoryCodeParam === 'new'
  const categoryCode = isNew ? '' : decodeURIComponent(categoryCodeParam || '')
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<IngredientCategory>()
  const [originalCategoryCode, setOriginalCategoryCode] = useState<string>('')

  // 加载类别详情
  useEffect(() => {
    if (!isNew && categoryCode) {
      loadCategoryDetail()
    }
  }, [isNew, categoryCode])

  const loadCategoryDetail = async () => {
    setLoading(true)
    try {
      const result = await ingredientStandardAPI.category.get(categoryCode)
      if (result && result.code === 0 && result.data) {
        const data = result.data
        setOriginalCategoryCode(data.categoryCode)
        form.setFieldsValue({
          categoryCode: data.categoryCode,
          categoryName: data.categoryName,
          categoryNameEn: data.categoryNameEn,
          parentCategoryCode: data.parentCategoryCode,
          level: data.level,
          sortOrder: data.sortOrder,
          mapping: data.mapping,
          description: data.description,
          status: data.status,
        })
      } else {
        message.error(result?.message || '获取类别详情失败')
        navigate('/base/categories')
      }
    } catch (error: any) {
      message.error(error.message || '获取类别详情失败')
      navigate('/base/categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      let result
      if (isNew) {
        result = await ingredientStandardAPI.category.create({
          categoryCode: values.categoryCode,
          categoryName: values.categoryName,
          categoryNameEn: values.categoryNameEn,
          parentCategoryCode: values.parentCategoryCode,
          level: values.level,
          sortOrder: values.sortOrder,
          mapping: values.mapping || {
            factorSubCategory: values.categoryCode,
            keywords: [],
          },
          description: values.description,
          status: values.status || 'active',
        })
      } else {
        result = await ingredientStandardAPI.category.update(originalCategoryCode, {
          categoryName: values.categoryName,
          categoryNameEn: values.categoryNameEn,
          parentCategoryCode: values.parentCategoryCode,
          level: values.level,
          sortOrder: values.sortOrder,
          mapping: values.mapping,
          description: values.description,
          status: values.status,
        })
      }

      if (result && result.code === 0) {
        message.success(isNew ? '创建成功' : '更新成功')
        if (isNew) {
          navigate(`/base/categories/${encodeURIComponent(values.categoryCode)}`)
          setOriginalCategoryCode(values.categoryCode)
        } else {
          loadCategoryDetail()
        }
      } else {
        message.error(result?.message || (isNew ? '创建失败' : '更新失败'))
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      console.error('保存失败:', error)
      message.error(error.message || '保存失败')
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
            onClick={() => navigate('/base/categories')}
          >
            返回列表
          </Button>
          <Space>
            <Button onClick={() => navigate('/base/categories')}>取消</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={saving}
            >
              {isNew ? '创建' : '保存'}
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
                  level: 1,
                  sortOrder: 999,
                  status: 'active',
                  mapping: {
                    factorSubCategory: '',
                    keywords: [],
                  },
                }}
              >
                <Form.Item
                  name="categoryCode"
                  label="类别代码"
                  rules={[
                    { required: true, message: '请输入类别代码' },
                    { pattern: /^[a-zA-Z0-9_]+$/, message: '类别代码只能包含字母、数字和下划线' },
                  ]}
                >
                  <Input 
                    placeholder="请输入类别代码（如 vegetables）" 
                    disabled={!isNew}
                  />
                </Form.Item>

                <Form.Item
                  name="categoryName"
                  label="类别名称"
                  rules={[{ required: true, message: '请输入类别名称' }]}
                >
                  <Input placeholder="请输入类别名称（如 蔬菜类）" />
                </Form.Item>

                <Form.Item
                  name="categoryNameEn"
                  label="英文名称"
                >
                  <Input placeholder="请输入英文名称（如 Vegetables）" />
                </Form.Item>

                <Form.Item
                  name="level"
                  label="层级"
                  rules={[{ required: true, message: '请选择层级' }]}
                >
                  <Select placeholder="请选择层级">
                    <Option value={1}>主类别</Option>
                    <Option value={2}>子类别</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="sortOrder"
                  label="排序顺序"
                  rules={[{ required: true, message: '请输入排序顺序' }]}
                >
                  <InputNumber min={0} placeholder="数字越小越靠前" style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  name={['mapping', 'factorSubCategory']}
                  label="映射因子类别"
                  rules={[{ required: true, message: '请输入映射因子类别' }]}
                >
                  <Input placeholder="如 vegetable, bean_product 等" />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="描述"
                >
                  <TextArea rows={3} placeholder="请输入描述" />
                </Form.Item>

                {!isNew && (
                  <Form.Item
                    name="status"
                    label="状态"
                    rules={[{ required: true, message: '请选择状态' }]}
                  >
                    <Select placeholder="请选择状态">
                      <Option value="active">活跃</Option>
                      <Option value="deprecated">已废弃</Option>
                    </Select>
                  </Form.Item>
                )}
              </Form>
            </TabPane>
            {!isNew && (
              <TabPane tab="关键词管理" key="keywords">
                <CategoryKeywordManagement categoryCode={categoryCode} />
              </TabPane>
            )}
          </Tabs>
        </Spin>
      </Card>
    </div>
  )
}

export default CategoryDetail

