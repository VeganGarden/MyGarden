import { ingredientAPI, meatIngredientAPI } from '@/services/cloudbase'
import { Button, Card, Collapse, Form, Input, InputNumber, Select, Space, Spin, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const { TextArea } = Input
const { Option } = Select
const { Panel } = Collapse

// 荤食食材分类选项
const CATEGORY_OPTIONS = [
  { label: '红肉类', value: 'red_meat' },
  { label: '禽肉类', value: 'poultry' },
  { label: '水产类', value: 'seafood' },
  { label: '加工肉类', value: 'processed_meat' },
]

// 状态选项
const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
]

// 生产方式选项
const PRODUCTION_METHOD_OPTIONS = [
  { label: '传统', value: 'conventional' },
  { label: '有机', value: 'organic' },
  { label: '养殖', value: 'farmed' },
  { label: '野生', value: 'wild_caught' },
  { label: '加工', value: 'processed' },
]

// 产地选项
const REGION_OPTIONS = [
  { label: '中国平均', value: 'china_average' },
  { label: '进口', value: 'import' },
]

const MeatIngredientEdit: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allIngredients, setAllIngredients] = useState<any[]>([])
  const [loadingIngredients, setLoadingIngredients] = useState(false)
  const isEdit = !!id

  useEffect(() => {
    fetchAllIngredients()
    if (isEdit) {
      fetchMeatIngredient()
    } else {
      form.resetFields()
      form.setFieldsValue({
        status: 'draft',
        category: 'red_meat',
        productionMethod: 'conventional',
        region: 'china_average',
        veganAlternatives: [],
      })
    }
  }, [id])

  const fetchAllIngredients = async () => {
    setLoadingIngredients(true)
    try {
      const result = await ingredientAPI.list({ page: 1, pageSize: 1000 })
      if (result && result.code === 0 && result.data) {
        setAllIngredients(result.data.data || [])
      }
    } catch (error: any) {
      console.error('获取素食食材列表失败:', error)
    } finally {
      setLoadingIngredients(false)
    }
  }

  const fetchMeatIngredient = async () => {
    if (!id) return

    setLoading(true)
    try {
      const result = await meatIngredientAPI.get(id)
      if (result && result.code === 0 && result.data) {
        const data = result.data
        // 处理日期字段
        if (data.verifiedAt) {
          data.verifiedAt = new Date(data.verifiedAt)
        }
        form.setFieldsValue(data)
      } else {
        message.error('获取荤食食材信息失败')
      }
    } catch (error: any) {
      message.error(error.message || '获取荤食食材信息失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      // 处理日期字段
      if (values.verifiedAt) {
        values.verifiedAt = values.verifiedAt.toISOString()
      }

      if (isEdit) {
        const result = await meatIngredientAPI.updateBase(id!, values)
        if (result && result.code === 0) {
          message.success('更新成功')
          navigate('/base/meat-ingredients')
        } else {
          throw new Error(result?.message || '更新失败')
        }
      } else {
        const result = await meatIngredientAPI.createBase(values)
        if (result && result.code === 0) {
          message.success('创建成功')
          navigate('/base/meat-ingredients')
        } else {
          throw new Error(result?.message || '创建失败')
        }
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title={isEdit ? '编辑荤食食材' : '新建荤食食材'}>
      <Spin spinning={loading || loadingIngredients}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            category: 'red_meat',
            productionMethod: 'conventional',
            region: 'china_average',
            veganAlternatives: [],
          }}
        >
          {/* 基础信息 */}
          <Collapse defaultActiveKey={['1', '2', '3', '4', '5']}>
            <Panel header="基础信息" key="1">
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="请输入荤食食材名称" />
              </Form.Item>
              <Form.Item name="nameEn" label="英文名称">
                <Input placeholder="请输入英文名称" />
              </Form.Item>
              <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
                <Select placeholder="请选择分类">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="subcategory" label="子分类">
                <Input placeholder="请输入子分类" />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <TextArea rows={4} placeholder="请输入描述" />
              </Form.Item>
              <Form.Item name="status" label="状态">
                <Select>
                  {STATUS_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Panel>

            <Panel header="碳足迹信息" key="2">
              <div style={{ padding: '16px', color: '#666', fontSize: '14px' }}>
                <div>• 碳足迹因子数据已迁移到因子库统一管理</div>
                <div>• 请前往「因子库管理」查看和管理该荤食食材的碳排放因子</div>
                <div>• 计算碳足迹时将自动从因子库查询对应的因子值</div>
              </div>
            </Panel>

            <Panel header="营养信息" key="3">
              <Form.Item name={['nutrition', 'calories']} label="热量 (kcal/100g)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name={['nutrition', 'protein']} label="蛋白质 (g/100g)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name={['nutrition', 'fat']} label="脂肪 (g/100g)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name={['nutrition', 'carbohydrate']} label="碳水化合物 (g/100g)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name={['nutrition', 'fiber']} label="纤维 (g/100g)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Panel>

            <Panel header="生产与产地信息" key="4">
              <Form.Item name="productionMethod" label="生产方式">
                <Select placeholder="请选择生产方式">
                  {PRODUCTION_METHOD_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="region" label="产地">
                <Select placeholder="请选择产地">
                  {REGION_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="comparisonGroup" label="对比组">
                <Input placeholder="用于数据分析的对比组" />
              </Form.Item>
            </Panel>

            <Panel header="素食替代品" key="5">
              <Form.Item name="veganAlternatives" label="推荐的素食替代品">
                <Select
                  mode="tags"
                  placeholder="输入或选择素食替代品名称（需在基础素食食材中存在）"
                  filterOption={(input, option) => {
                    const children = option?.children as any
                    if (typeof children === 'string') {
                      return children.toLowerCase().includes(input.toLowerCase())
                    }
                    return false
                  }}
                >
                  {allIngredients.map((ing) => (
                    <Option key={ing._id} value={ing.name}>
                      {ing.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <div style={{ color: '#999', fontSize: '12px', marginTop: '-16px', marginBottom: '16px' }}>
                提示：替代品名称需与基础素食食材中的名称完全匹配
              </div>
            </Panel>
          </Collapse>

          {/* 操作按钮 */}
          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" onClick={handleSubmit} loading={saving}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/base/meat-ingredients')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  )
}

export default MeatIngredientEdit

