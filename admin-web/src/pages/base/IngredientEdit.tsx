import { ingredientAPI } from '@/services/cloudbase'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Collapse, Form, Input, InputNumber, Select, Space, Spin, Switch, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const { TextArea } = Input
const { Option } = Select
const { Panel } = Collapse

// 食材分类选项
const CATEGORY_OPTIONS = [
  { label: '蔬菜类', value: 'vegetables' },
  { label: '豆制品', value: 'beans' },
  { label: '谷物类', value: 'grains' },
  { label: '坚果类', value: 'nuts' },
  { label: '水果类', value: 'fruits' },
  { label: '菌菇类', value: 'mushrooms' },
]

// 状态选项
const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
]

// 中医属性选项
const TCM_NATURE_OPTIONS = [
  { label: '寒', value: 'cold' },
  { label: '凉', value: 'cool' },
  { label: '平', value: 'neutral' },
  { label: '温', value: 'warm' },
  { label: '热', value: 'hot' },
]

const TCM_FLAVOR_OPTIONS = [
  { label: '甘', value: 'sweet' },
  { label: '酸', value: 'sour' },
  { label: '苦', value: 'bitter' },
  { label: '辛', value: 'pungent' },
  { label: '咸', value: 'salty' },
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

// 认证等级选项
const CERTIFICATION_LEVEL_OPTIONS = [
  { label: '铜牌', value: 'bronze' },
  { label: '银牌', value: 'silver' },
  { label: '金牌', value: 'gold' },
  { label: '钻石', value: 'diamond' },
]

// 节气选项（24节气）
const SOLAR_TERM_OPTIONS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
]

const IngredientEdit: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const isEdit = !!id

  useEffect(() => {
    if (isEdit) {
      fetchIngredient()
    }
  }, [id])

  const fetchIngredient = async () => {
    if (!id) return

    setLoading(true)
    try {
      const result = await ingredientAPI.get(id)
      if (result && result.code === 0 && result.data) {
        const data = result.data
        // 处理日期字段
        if (data.carbonFootprint?.verifiedAt) {
          data.carbonFootprint.verifiedAt = new Date(data.carbonFootprint.verifiedAt).toISOString().split('T')[0]
        }
        form.setFieldsValue(data)
      } else {
        message.error('获取食材信息失败')
      }
    } catch (error: any) {
      message.error(error.message || '获取食材信息失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      // 处理日期字段
      if (values.carbonFootprint?.verifiedAt) {
        values.carbonFootprint.verifiedAt = new Date(values.carbonFootprint.verifiedAt)
      }

      if (isEdit) {
        const result = await ingredientAPI.updateBase(id!, values)
        if (result && result.code === 0) {
          message.success('更新成功')
          navigate('/base/ingredients')
        } else {
          throw new Error(result?.message || '更新失败')
        }
      } else {
        const result = await ingredientAPI.createBase(values)
        if (result && result.code === 0) {
          message.success('创建成功')
          navigate('/base/ingredients')
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
    <Card title={isEdit ? '编辑食材' : '新建食材'}>
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            category: 'vegetables',
          }}
        >
          {/* 基础信息 */}
          <Collapse defaultActiveKey={['basic', 'carbon']} ghost>
            <Panel header="基础信息" key="basic">
              <Form.Item
                name="name"
                label="食材名称"
                rules={[{ required: true, message: '请输入食材名称' }]}
              >
                <Input placeholder="请输入食材名称" />
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

              <Form.Item name="description" label="描述">
                <TextArea rows={4} placeholder="请输入食材描述" />
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

            {/* 碳足迹信息 */}
            <Panel header="碳足迹信息" key="carbon">
              <Form.Item
                name={['carbonFootprint', 'coefficient']}
                label="碳系数 (kg CO₂e/kg)"
                rules={[{ required: true, message: '请输入碳系数' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  placeholder="请输入碳系数"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item name={['carbonFootprint', 'source']} label="数据来源">
                <Input placeholder="如：FAO 2021、Our World in Data" />
              </Form.Item>
              <Form.Item name={['carbonFootprint', 'verifiedAt']} label="验证时间">
                <Input type="date" placeholder="选择验证时间" />
              </Form.Item>
              <div style={{ color: '#999', fontSize: '12px', marginTop: '-16px', marginBottom: '16px' }}>
                <div>• 碳系数是食材本身的属性，不涉及地区、用能方式</div>
                <div>• 餐厅使用时，会基于此系数计算</div>
              </div>
            </Panel>

            {/* 中医属性 */}
            <Panel header="中医属性" key="tcm">
              <Form.Item name={['tcmProperties', 'nature']} label="性">
                <Select placeholder="请选择性">
                  {TCM_NATURE_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name={['tcmProperties', 'flavor']} label="味">
                <Select mode="multiple" placeholder="请选择味（可多选）">
                  {TCM_FLAVOR_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name={['tcmProperties', 'meridian']} label="归经">
                <Select mode="tags" placeholder="请输入归经（可多选）" />
              </Form.Item>

              <Form.Item name={['tcmProperties', 'functions']} label="功效">
                <Select mode="tags" placeholder="请输入功效（可多选）" />
              </Form.Item>
            </Panel>

            {/* 体质适配 */}
            <Panel header="体质适配" key="bodyType">
              <Form.Item name={['bodyTypeSuitability', 'suitable']} label="适合的体质">
                <Select mode="multiple" placeholder="请选择适合的体质">
                  {BODY_TYPE_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name={['bodyTypeSuitability', 'unsuitable']} label="不适合的体质">
                <Select mode="multiple" placeholder="请选择不适合的体质">
                  {BODY_TYPE_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name={['bodyTypeSuitability', 'notes']} label="适配说明">
                <TextArea rows={3} placeholder="请输入体质适配说明" />
              </Form.Item>
            </Panel>

            {/* 节气推荐 */}
            <Panel header="节气推荐" key="solarTerm">
              <Form.List name="solarTermRecommendations">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'term']}
                          rules={[{ required: true, message: '请选择节气' }]}
                        >
                          <Select placeholder="选择节气" style={{ width: 120 }}>
                            {SOLAR_TERM_OPTIONS.map((term) => (
                              <Option key={term} value={term}>
                                {term}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'reason']}
                          rules={[{ required: true, message: '请输入推荐原因' }]}
                        >
                          <Input placeholder="推荐原因" style={{ width: 200 }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'usage']}>
                          <Input placeholder="用法建议" style={{ width: 200 }} />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        添加节气推荐
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
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
                            <InputNumber placeholder="素食年限" min={0} style={{ width: 100 }} />
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
                        <Form.Item {...restField} name={[name, 'avatar']}>
                          <Input placeholder="头像URL（可选）" />
                        </Form.Item>
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
          </Collapse>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" onClick={handleSubmit} loading={saving}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/base/ingredients')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  )
}

export default IngredientEdit
