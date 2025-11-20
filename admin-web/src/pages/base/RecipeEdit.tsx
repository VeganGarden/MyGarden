import { ingredientAPI, recipeAPI } from '@/services/cloudbase'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Collapse, DatePicker, Form, Input, InputNumber, Select, Space, Spin, Switch, message } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const { TextArea } = Input
const { Option } = Select
const { Panel } = Collapse

// 食谱分类选项
const CATEGORY_OPTIONS = [
  { label: '主食', value: 'staple' },
  { label: '菜品', value: 'dish' },
  { label: '汤品', value: 'soup' },
  { label: '甜品', value: 'dessert' },
  { label: '饮品', value: 'drink' },
  { label: '小食', value: 'snack' },
]

// 烹饪方式选项
const COOKING_METHOD_OPTIONS = [
  { label: '炒', value: 'stir_fried' },
  { label: '煮', value: 'boiled' },
  { label: '蒸', value: 'steamed' },
  { label: '炸', value: 'fried' },
  { label: '烤', value: 'baked' },
  { label: '炖', value: 'stewed' },
  { label: '凉拌', value: 'cold' },
]

// 难度选项
const DIFFICULTY_OPTIONS = [
  { label: '简单', value: 'easy' },
  { label: '中等', value: 'medium' },
  { label: '困难', value: 'hard' },
]

// 状态选项
const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
]

// 季节选项
const SEASON_OPTIONS = [
  { label: '春', value: 'spring' },
  { label: '夏', value: 'summer' },
  { label: '秋', value: 'autumn' },
  { label: '冬', value: 'winter' },
]

// 体质类型选项
const BODY_TYPE_OPTIONS = [
  { label: '平和质', value: 'peaceful' },
  { label: '气虚质', value: 'qi_deficiency' },
  { label: '阳虚质', value: 'yang_deficiency' },
  { label: '阴虚质', value: 'yin_deficiency' },
  { label: '痰湿质', value: 'phlegm_dampness' },
  { label: '湿热质', value: 'damp_heat' },
  { label: '血瘀质', value: 'blood_stasis' },
  { label: '气郁质', value: 'qi_stagnation' },
  { label: '特禀质', value: 'special' },
]

// 人群选项
const GROUP_OPTIONS = [
  { label: '老人', value: 'elderly' },
  { label: '孩子', value: 'children' },
  { label: '运动员', value: 'athletes' },
  { label: '上班族', value: 'office_workers' },
  { label: '孕妇', value: 'pregnant' },
  { label: '学生', value: 'students' },
]

// 认证等级选项
const CERTIFICATION_LEVEL_OPTIONS = [
  { label: '铜牌', value: 'bronze' },
  { label: '银牌', value: 'silver' },
  { label: '金牌', value: 'gold' },
  { label: '钻石', value: 'diamond' },
]

const RecipeEdit: React.FC = () => {
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
      fetchRecipe()
    }
  }, [id])

  const fetchAllIngredients = async () => {
    setLoadingIngredients(true)
    try {
      const result = await ingredientAPI.list({ pageSize: 9999 })
      if (result && result.code === 0 && result.data) {
        setAllIngredients(result.data.data || [])
      }
    } catch (error: any) {
      console.error('获取食材列表失败:', error)
    } finally {
      setLoadingIngredients(false)
    }
  }

  const fetchRecipe = async () => {
    if (!id) return

    setLoading(true)
    try {
      const result = await recipeAPI.get(id)
      if (result && result.code === 0 && result.data) {
        const data = result.data
        // 检查是否为基础食谱
        if (!data.isBaseRecipe) {
          message.warning('只能编辑基础食谱')
          navigate('/base/recipes')
          return
        }
        // 处理日期字段
        if (data.developmentHistory?.inventedAt) {
          data.developmentHistory.inventedAt = dayjs(data.developmentHistory.inventedAt)
        }
        if (data.developmentHistory?.evolutionLog) {
          data.developmentHistory.evolutionLog = data.developmentHistory.evolutionLog.map((log: any) => ({
            ...log,
            date: log.date ? dayjs(log.date) : null,
          }))
        }
        if (data.practitionerCertifications) {
          data.practitionerCertifications = data.practitionerCertifications.map((cert: any) => ({
            ...cert,
            certifiedAt: cert.certifiedAt ? dayjs(cert.certifiedAt) : null,
          }))
        }
        if (data.practiceWisdom?.stories) {
          data.practiceWisdom.stories = data.practiceWisdom.stories.map((story: any) => ({
            ...story,
            date: story.date ? dayjs(story.date) : null,
          }))
        }
        form.setFieldsValue(data)
      } else {
        message.error('获取食谱信息失败')
      }
    } catch (error: any) {
      message.error(error.message || '获取食谱信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 计算碳足迹
  const handleCalculateCarbon = async () => {
    try {
      const values = form.getFieldsValue()
      const ingredients = values.ingredients || []
      const cookingMethod = values.cookingMethod
      const cookingTime = values.cookingTime || 10
      const packaging = values.carbonFootprint?.packaging || 0

      if (ingredients.length === 0) {
        message.warning('请先添加食材')
        return
      }

      if (!cookingMethod) {
        message.warning('请先选择烹饪方式')
        return
      }

      // 1. 计算食材碳足迹
      let ingredientsCarbon = 0
      for (const ing of ingredients) {
        if (!ing.ingredientId || !ing.quantity) continue

        // 从 allIngredients 中查找食材的碳系数
        const ingredient = allIngredients.find((item) => item._id === ing.ingredientId)
        if (ingredient?.carbonFootprint?.coefficient) {
          const coefficient = ingredient.carbonFootprint.coefficient
          const quantity = ing.quantity || 0
          ingredientsCarbon += coefficient * quantity
        } else {
          message.warning(`食材 ${ingredient?.name || ing.ingredientId} 缺少碳系数，请先完善食材信息`)
        }
      }

      // 2. 计算烹饪能耗碳足迹
      const cookingFactors: Record<string, number> = {
        raw: 0,
        steamed: 0.1,
        boiled: 0.15,
        stir_fried: 0.2,
        fried: 0.3,
        baked: 0.25,
        stewed: 0.18,
        cold: 0,
      }
      const factor = cookingFactors[cookingMethod] || 0.15
      const cookingEnergyCarbon = (factor * cookingTime) / 60 // 转换为小时

      // 3. 总碳足迹值
      const totalCarbon = ingredientsCarbon + cookingEnergyCarbon + packaging

      // 4. 更新表单
      form.setFieldsValue({
        carbonFootprint: {
          value: Math.round(totalCarbon * 100) / 100,
          ingredients: Math.round(ingredientsCarbon * 100) / 100,
          cookingEnergy: Math.round(cookingEnergyCarbon * 100) / 100,
          packaging: packaging || 0,
        },
      })

      message.success('碳足迹计算完成')
    } catch (error: any) {
      message.error(error.message || '计算失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 确保是基础食谱
      values.isBaseRecipe = true
      
      // 处理食材列表，确保有 name 字段
      if (values.ingredients) {
        values.ingredients = values.ingredients.map((ing: any) => {
          const selectedIngredient = allIngredients.find(ingItem => ingItem._id === ing.ingredientId)
          return {
            ...ing,
            name: selectedIngredient ? selectedIngredient.name : ing.name || '',
          }
        })
      }

      // 处理日期字段（转换为 Date 对象）
      if (values.developmentHistory?.inventedAt) {
        values.developmentHistory.inventedAt = dayjs(values.developmentHistory.inventedAt).toDate()
      }
      if (values.developmentHistory?.evolutionLog) {
        values.developmentHistory.evolutionLog = values.developmentHistory.evolutionLog.map((log: any) => ({
          ...log,
          date: log.date ? dayjs(log.date).toDate() : new Date(),
        }))
      }
      if (values.practitionerCertifications) {
        values.practitionerCertifications = values.practitionerCertifications.map((cert: any) => ({
          ...cert,
          certifiedAt: cert.certifiedAt ? dayjs(cert.certifiedAt).toDate() : new Date(),
        }))
      }
      if (values.practiceWisdom?.stories) {
        values.practiceWisdom.stories = values.practiceWisdom.stories.map((story: any) => ({
          ...story,
          date: story.date ? dayjs(story.date).toDate() : new Date(),
        }))
      }
      
      setSaving(true)

      if (isEdit) {
        const result = await recipeAPI.updateBase(id!, values)
        if (result && result.code === 0) {
          message.success('更新成功')
          navigate('/base/recipes')
        } else {
          throw new Error(result?.message || '更新失败')
        }
      } else {
        const result = await recipeAPI.createBase(values)
        if (result && result.code === 0) {
          message.success('创建成功')
          navigate('/base/recipes')
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
    <Card title={isEdit ? '编辑食谱' : '新建食谱'}>
      <Spin spinning={loading || loadingIngredients}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            category: 'dish',
            cookingMethod: 'stir_fried',
            difficulty: 'easy',
            ingredients: [],
          }}
        >
          <Collapse defaultActiveKey={['basic', 'carbon']} ghost>
            {/* 基础信息 */}
            <Panel header="基础信息" key="basic">
              <Form.Item
                name="name"
                label="食谱名称"
                rules={[{ required: true, message: '请输入食谱名称' }]}
              >
                <Input placeholder="请输入食谱名称" />
              </Form.Item>

              <Form.Item name="nameEn" label="英文名称">
                <Input placeholder="请输入英文名称" />
              </Form.Item>

              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="cookingMethod"
                label="烹饪方式"
                rules={[{ required: true, message: '请选择烹饪方式' }]}
              >
                <Select placeholder="请选择烹饪方式">
                  {COOKING_METHOD_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="cookingTime" label="烹饪时间（分钟）">
                <InputNumber min={1} placeholder="请输入烹饪时间" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="difficulty" label="难度">
                <Select placeholder="请选择难度">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="description" label="描述">
                <TextArea rows={4} placeholder="请输入食谱描述" />
              </Form.Item>

              <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态">
                  {STATUS_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Panel>

            {/* 食材列表 */}
            <Panel header="食材列表" key="ingredients">
              <Form.List name="ingredients">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'ingredientId']}
                          rules={[{ required: true, message: '请选择食材' }]}
                          style={{ flex: 3 }}
                        >
                          <Select
                            placeholder="选择食材"
                            showSearch
                            filterOption={(input, option) => {
                              const label = option?.label as string | undefined
                              if (label) {
                                return label.toLowerCase().indexOf(input.toLowerCase()) >= 0
                              }
                              return false
                            }}
                          >
                            {allIngredients.map((ing) => (
                              <Option key={ing._id} value={ing._id}>
                                {ing.name}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          rules={[{ required: true, message: '请输入用量' }]}
                          style={{ flex: 1 }}
                        >
                          <InputNumber min={0.1} step={0.1} placeholder="用量" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'unit']}
                          rules={[{ required: true, message: '请输入单位' }]}
                          style={{ flex: 1 }}
                        >
                          <Input placeholder="单位" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'notes']} style={{ flex: 2 }}>
                          <Input placeholder="备注（可选）" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加食材
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Panel>

            {/* 碳足迹信息 */}
            <Panel header="碳足迹信息" key="carbon">
              <Form.Item
                name={['carbonFootprint', 'value']}
                label="参考碳足迹值 (kg CO₂e/份)"
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  placeholder="自动计算"
                  style={{ width: '100%' }}
                  readOnly
                  addonAfter={
                    <Button
                      type="link"
                      size="small"
                      onClick={handleCalculateCarbon}
                      style={{ padding: 0 }}
                    >
                      自动计算
                    </Button>
                  }
                />
              </Form.Item>
              <Form.Item
                name={['carbonFootprint', 'ingredients']}
                label="食材碳足迹 (kg CO₂e)"
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  placeholder="自动计算"
                  style={{ width: '100%' }}
                  readOnly
                />
              </Form.Item>
              <Form.Item
                name={['carbonFootprint', 'cookingEnergy']}
                label="烹饪能耗碳足迹 (kg CO₂e)"
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  placeholder="自动计算"
                  style={{ width: '100%' }}
                  readOnly
                />
              </Form.Item>
              <Form.Item
                name={['carbonFootprint', 'packaging']}
                label="包装碳足迹 (kg CO₂e)（可选）"
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  placeholder="请输入包装碳足迹"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <div style={{ color: '#999', fontSize: '12px', marginTop: '-16px', marginBottom: '16px' }}>
                <div>• 参考值基于食材列表和烹饪方式计算</div>
                <div>• 不涉及地区、用能方式、基准值</div>
                <div>• 餐厅使用时，会结合餐厅情况重新计算</div>
              </div>
            </Panel>

            {/* 实践数据 */}
            <Panel header="实践数据" key="practiceData">
              <Form.Item name={['practiceData', 'tasteScore']} label="口味评分（1-10）">
                <InputNumber min={1} max={10} placeholder="口味评分" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['practiceData', 'nutritionScore']} label="营养评分（1-10）">
                <InputNumber min={1} max={10} placeholder="营养评分" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['practiceData', 'difficultyScore']} label="难度评分（1-10）">
                <InputNumber min={1} max={10} placeholder="难度评分" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['practiceData', 'costScore']} label="成本评分（1-10）">
                <InputNumber min={1} max={10} placeholder="成本评分" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['practiceData', 'successRate']} label="新手成功率（%）">
                <InputNumber min={0} max={100} placeholder="成功率" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['practiceData', 'avgCookingTime']} label="平均烹饪时间（分钟）">
                <InputNumber min={1} placeholder="平均时间" style={{ width: '100%' }} />
              </Form.Item>

              <Form.List name={['practiceData', 'commonFailures']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size="small" style={{ marginBottom: 8 }}>
                        <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'issue']}
                            rules={[{ required: true, message: '请输入问题' }]}
                            style={{ flex: 1 }}
                          >
                            <Input placeholder="常见问题" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'solution']}
                            rules={[{ required: true, message: '请输入解决方案' }]}
                            style={{ flex: 1 }}
                          >
                            <Input placeholder="解决方案" />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        </Space>
                      </Card>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加常见失败案例
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Panel>

            {/* 适用场景 */}
            <Panel header="适用场景" key="suitability">
              <Form.Item name={['suitability', 'seasons']} label="适合季节">
                <Select mode="multiple" placeholder="请选择适合的季节">
                  {SEASON_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name={['suitability', 'bodyTypes']} label="适合体质">
                <Select mode="multiple" placeholder="请选择适合的体质">
                  {BODY_TYPE_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name={['suitability', 'groups']} label="适合人群">
                <Select mode="multiple" placeholder="请选择适合的人群">
                  {GROUP_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Panel>

            {/* 文化故事 */}
            <Panel header="文化故事" key="culturalStory">
              <Form.Item name={['culturalStory', 'background']} label="文化背景">
                <TextArea rows={4} placeholder="请输入文化背景" />
              </Form.Item>

              <Form.Item name={['culturalStory', 'bestPractitioner']} label="最擅长的人">
                <Input placeholder="请输入最擅长制作此食谱的人" />
              </Form.Item>

              <Form.Item name={['culturalStory', 'sharingExperience']} label="印象最深的分享经历">
                <TextArea rows={4} placeholder="请输入分享经历" />
              </Form.Item>
            </Panel>

            {/* 践行者认证 */}
            <Panel header="践行者认证" key="certification">
              <Form.List name="practitionerCertifications">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size="small" style={{ marginBottom: 8 }}>
                        <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'practitionerId']}
                            rules={[{ required: true, message: '请输入践行者ID' }]}
                            style={{ flex: 1 }}
                          >
                            <Input placeholder="践行者ID" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'practitionerName']}
                            rules={[{ required: true, message: '请输入践行者姓名' }]}
                            style={{ flex: 1 }}
                          >
                            <Input placeholder="践行者姓名" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'level']}
                            rules={[{ required: true, message: '请选择认证等级' }]}
                          >
                            <Select placeholder="等级" style={{ width: 100 }}>
                              {CERTIFICATION_LEVEL_OPTIONS.map((opt) => (
                                <Option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'veganYears']}
                            rules={[{ required: true, message: '请输入素食年限' }]}
                          >
                            <InputNumber min={0} placeholder="素食年限" style={{ width: 100 }} />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        </Space>
                        <Form.Item
                          {...restField}
                          name={[name, 'testimony']}
                          rules={[{ required: true, message: '请输入认证证言' }]}
                        >
                          <TextArea rows={2} placeholder="认证证言" />
                        </Form.Item>
                        <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item {...restField} name={[name, 'successRate']} style={{ flex: 1 }}>
                            <InputNumber min={0} max={100} placeholder="制作成功率（%）" style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'timesMade']} style={{ flex: 1 }}>
                            <InputNumber min={0} placeholder="制作次数" style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'avatar']} style={{ flex: 1 }}>
                            <Input placeholder="头像URL（可选）" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'certifiedAt']}>
                            <DatePicker placeholder="认证时间" style={{ width: '100%' }} />
                          </Form.Item>
                        </Space>
                      </Card>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加践行者认证
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Panel>

            {/* 实践智慧 */}
            <Panel header="实践智慧" key="practiceWisdom">
              <Form.Item name={['practiceWisdom', 'bestPractices']} label="最佳实践">
                <Select mode="tags" placeholder="请输入最佳实践（每行一个）" />
              </Form.Item>

              <Form.Item name={['practiceWisdom', 'commonMistakes']} label="常见误区">
                <Select mode="tags" placeholder="请输入常见误区（每行一个）" />
              </Form.Item>

              <Form.Item name={['practiceWisdom', 'tips']} label="小贴士">
                <Select mode="tags" placeholder="请输入小贴士（每行一个）" />
              </Form.Item>

              <Form.List name={['practiceWisdom', 'stories']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size="small" style={{ marginBottom: 8 }}>
                        <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'title']}
                            rules={[{ required: true, message: '请输入故事标题' }]}
                            style={{ flex: 2 }}
                          >
                            <Input placeholder="故事标题" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'author']} style={{ flex: 1 }}>
                            <Input placeholder="作者（可选）" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'date']}>
                            <DatePicker placeholder="日期（可选）" style={{ width: '100%' }} />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        </Space>
                        <Form.Item
                          {...restField}
                          name={[name, 'content']}
                          rules={[{ required: true, message: '请输入故事内容' }]}
                        >
                          <TextArea rows={3} placeholder="故事内容" />
                        </Form.Item>
                      </Card>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加实践故事
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Panel>

            {/* 研发历史 */}
            <Panel header="研发历史" key="developmentHistory">
              <Form.Item name={['developmentHistory', 'inventor']} label="研发者">
                <Input placeholder="请输入研发者" />
              </Form.Item>

              <Form.Item name={['developmentHistory', 'inventedAt']} label="研发时间">
                <DatePicker placeholder="请选择研发时间" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['developmentHistory', 'inspiration']} label="灵感来源">
                <TextArea rows={3} placeholder="请输入灵感来源" />
              </Form.Item>

              <Form.List name={['developmentHistory', 'evolutionLog']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size="small" style={{ marginBottom: 8 }}>
                        <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'version']}
                            rules={[{ required: true, message: '请输入版本号' }]}
                            style={{ flex: 1 }}
                          >
                            <Input placeholder="版本号" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'changes']}
                            rules={[{ required: true, message: '请输入变更内容' }]}
                            style={{ flex: 2 }}
                          >
                            <Input placeholder="变更内容" />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'date']}>
                            <DatePicker placeholder="日期" style={{ width: '100%' }} />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        </Space>
                      </Card>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加演化记录
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Panel>

            {/* 社交属性 */}
            <Panel header="社交属性" key="socialAttributes">
              <Form.Item name={['socialAttributes', 'shareCount']} label="分享次数">
                <InputNumber min={0} placeholder="分享次数" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['socialAttributes', 'likeCount']} label="点赞次数">
                <InputNumber min={0} placeholder="点赞次数" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['socialAttributes', 'commentCount']} label="评论次数">
                <InputNumber min={0} placeholder="评论次数" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name={['socialAttributes', 'isPopular']} label="是否热门" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>

              <Form.Item name={['socialAttributes', 'tags']} label="标签">
                <Select mode="tags" placeholder="请输入标签（每行一个）" />
              </Form.Item>
            </Panel>

            {/* 媒体资源 */}
            <Panel header="媒体资源" key="media">
              <Form.Item name={['media', 'videoUrl']} label="视频教程URL">
                <Input placeholder="请输入视频教程URL" />
              </Form.Item>

              <Form.Item name={['media', 'videoThumbnail']} label="视频缩略图URL">
                <Input placeholder="请输入视频缩略图URL" />
              </Form.Item>

              <Form.List name={['media', 'images']}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name]}
                          rules={[{ required: true, message: '请输入图片URL' }]}
                          style={{ flex: 1 }}
                        >
                          <Input placeholder="图片URL" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加图片
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Panel>
          </Collapse>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" onClick={handleSubmit} loading={saving}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/base/recipes')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  )
}

export default RecipeEdit
