/**
 * 菜单环保信息展示配置管理页面
 */
import { menuDisplayConfigAPI } from '@/services/menuDisplayConfig'
import { useAppSelector } from '@/store/hooks'
import {
  CheckCircleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  ColorPicker,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { Title, Text } = Typography
const { TabPane } = Tabs

interface MenuDisplayConfig {
  globalConfig?: {
    defaultDisplayLevel?: string
    enabled?: boolean
    enabledFrom?: string
    enabledTo?: string
    description?: string
  }
  mediaConfig?: {
    physicalMenu?: any
    digitalMenu?: any
    mobileApp?: any
    onlineMenu?: any
    posSystem?: any
    receipt?: any
  }
  styleConfig?: {
    iconSize?: string
    colorScheme?: string
    iconPosition?: string
    customColors?: {
      low?: string
      medium?: string
      high?: string
    }
  }
  features?: {
    enableFilter?: boolean
    enableSort?: boolean
    enableRecommendation?: boolean
    enableAchievement?: boolean
    enableComparison?: boolean
  }
  textConfig?: {
    zh_CN?: any
    en_US?: any
  }
  version?: number
  status?: string
  updatedAt?: string
}

// 媒介类型定义
const MEDIA_TYPES = [
  {
    key: 'physicalMenu',
    label: '纸质菜单',
    description: '餐厅纸质菜单展示配置',
    icon: '📄',
  },
  {
    key: 'digitalMenu',
    label: '电子菜单',
    description: '点餐屏幕/平板展示配置',
    icon: '📱',
  },
  {
    key: 'mobileApp',
    label: '移动端 App/小程序',
    description: '移动端应用展示配置',
    icon: '📲',
  },
  {
    key: 'onlineMenu',
    label: '在线菜单',
    description: '网站/外卖平台展示配置',
    icon: '🌐',
  },
  {
    key: 'posSystem',
    label: '收银系统',
    description: '收银系统展示配置',
    icon: '💳',
  },
  {
    key: 'receipt',
    label: '小票打印',
    description: '小票打印展示配置',
    icon: '🧾',
  },
]

const MenuDisplayConfigPage: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<MenuDisplayConfig | null>(null)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('global')
  const [previewMedia, setPreviewMedia] = useState('basic')
  const [showPreview, setShowPreview] = useState(false)
  const [activeMediaTab, setActiveMediaTab] = useState('physicalMenu')
  const [activeLanguageTab, setActiveLanguageTab] = useState('zh_CN')

  // 加载配置
  const loadConfig = async () => {
    if (!currentRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }

    setLoading(true)
    try {
      const result = await menuDisplayConfigAPI.getConfig(currentRestaurantId)
      if (result.success && result.data) {
        const configData = result.data
        setConfig(configData)
        // 设置表单初始值
        setFormValues(configData)
      } else {
        // 如果没有配置，使用默认值
        setConfig(null)
        setFormValues(null)
      }
    } catch (error: any) {
      console.error('加载配置失败:', error)
      message.error(error?.message || '加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  // 设置表单值
  const setFormValues = (configData: MenuDisplayConfig | null) => {
    const defaultValues = {
      enabled: true,
      defaultDisplayLevel: 'basic',
      iconSize: 'medium',
      colorScheme: 'standard',
      iconPosition: 'afterName',
      enableFilter: true,
      enableSort: true,
      enableRecommendation: true,
      enableAchievement: true,
      enableComparison: false,
    }

    if (!configData) {
      form.setFieldsValue(defaultValues)
      return
    }

    // 设置全局配置
    const globalConfig = configData.globalConfig || {}
    const styleConfig = configData.styleConfig || {}
    const features = configData.features || {}
    const mediaConfig = configData.mediaConfig || {}

    form.setFieldsValue({
      // 全局配置
      enabled: globalConfig.enabled ?? true,
      defaultDisplayLevel: globalConfig.defaultDisplayLevel ?? 'basic',
      enabledFrom: globalConfig.enabledFrom
        ? dayjs(globalConfig.enabledFrom)
        : null,
      enabledTo: globalConfig.enabledTo ? dayjs(globalConfig.enabledTo) : null,
      description: globalConfig.description || '',
      // 样式配置
      iconSize: styleConfig.iconSize ?? 'medium',
      colorScheme: styleConfig.colorScheme ?? 'standard',
      iconPosition: styleConfig.iconPosition ?? 'afterName',
      // 自定义颜色
      customColorLow: styleConfig.customColors?.low || '#4CAF50',
      customColorMedium: styleConfig.customColors?.medium || '#FFC107',
      customColorHigh: styleConfig.customColors?.high || '#FF9800',
      // 功能开关
      enableFilter: features.enableFilter ?? true,
      enableSort: features.enableSort ?? true,
      enableRecommendation: features.enableRecommendation ?? true,
      enableAchievement: features.enableAchievement ?? true,
      enableComparison: features.enableComparison ?? false,
      // 媒介配置
      ...getMediaFormValues(mediaConfig),
      // 文本配置
      ...getTextFormValues(configData.textConfig),
    })
  }

  // 获取媒介配置的表单值
  const getMediaFormValues = (mediaConfig: any) => {
    const values: any = {}
    MEDIA_TYPES.forEach((media) => {
      const mediaData = mediaConfig[media.key] || {}
      values[`${media.key}_useGlobal`] = !mediaData.displayLevel
      values[`${media.key}_displayLevel`] = mediaData.displayLevel || ''
      values[`${media.key}_showIcon`] = mediaData.showContent?.icon ?? true
      values[`${media.key}_showLevelText`] = mediaData.showContent?.levelText ?? false
      values[`${media.key}_showValue`] = mediaData.showContent?.value ?? false
      values[`${media.key}_showReductionPercent`] =
        mediaData.showContent?.reductionPercent ?? false
      values[`${media.key}_showBaseline`] = mediaData.showContent?.baseline ?? false
      values[`${media.key}_showQrCode`] = mediaData.showContent?.qrCode ?? false
      if (media.key === 'receipt') {
        values[`${media.key}_showOrderSummary`] =
          mediaData.showOrderSummary ?? true
        values[`${media.key}_showReductionMessage`] =
          mediaData.showReductionMessage ?? true
      }
    })
    return values
  }

  // 获取文本配置的表单值
  const getTextFormValues = (textConfig: any) => {
    const values: any = {}
    const languages = [
      { key: 'zh_CN', label: '简体中文' },
      { key: 'en_US', label: 'English' },
    ]
    languages.forEach((lang) => {
      const langData = textConfig?.[lang.key] || {}
      values[`${lang.key}_low`] = langData.low || ''
      values[`${lang.key}_medium`] = langData.medium || ''
      values[`${lang.key}_high`] = langData.high || ''
      values[`${lang.key}_reduction`] = langData.reduction || ''
      values[`${lang.key}_carbonFootprint`] = langData.carbonFootprint || ''
      values[`${lang.key}_unit`] = langData.unit || ''
      values[`${lang.key}_thankYou`] = langData.messages?.thankYou || ''
      values[`${lang.key}_recommendation`] = langData.messages?.recommendation || ''
    })
    return values
  }

  useEffect(() => {
    if (currentRestaurantId) {
      loadConfig()
    }
  }, [currentRestaurantId])

  // 保存配置
  const handleSave = async () => {
    if (!currentRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }

    try {
      const values = await form.validateFields()
      setSaving(true)

      // 构建配置对象
      const configData: MenuDisplayConfig = {
        globalConfig: {
          enabled: values.enabled,
          defaultDisplayLevel: values.defaultDisplayLevel,
          enabledFrom: values.enabledFrom
            ? values.enabledFrom.toISOString()
            : undefined,
          enabledTo: values.enabledTo ? values.enabledTo.toISOString() : undefined,
          description: values.description,
        },
        styleConfig: {
          iconSize: values.iconSize,
          colorScheme: values.colorScheme,
          iconPosition: values.iconPosition,
          customColors:
            values.colorScheme === 'colorful'
              ? {
                  low: values.customColorLow,
                  medium: values.customColorMedium,
                  high: values.customColorHigh,
                }
              : undefined,
        },
        features: {
          enableFilter: values.enableFilter,
          enableSort: values.enableSort,
          enableRecommendation: values.enableRecommendation,
          enableAchievement: values.enableAchievement,
          enableComparison: values.enableComparison,
        },
        mediaConfig: buildMediaConfig(values),
        textConfig: buildTextConfig(values),
        version: config?.version,
      }

      // 调用更新接口
      const result = await menuDisplayConfigAPI.updateConfig(
        currentRestaurantId,
        configData,
        config?.version || 0
      )

      if (result.success) {
        message.success('配置保存成功')
        loadConfig()
      } else {
        message.error(result.error || '保存失败')
      }
    } catch (error: any) {
      if (error?.errorFields) {
        // 表单验证错误
        return
      }
      console.error('保存配置失败:', error)
      message.error(error?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 构建媒介配置
  const buildMediaConfig = (values: any) => {
    const mediaConfig: any = {}
    MEDIA_TYPES.forEach((media) => {
      const useGlobal = values[`${media.key}_useGlobal`]
      if (!useGlobal) {
        mediaConfig[media.key] = {
          displayLevel: values[`${media.key}_displayLevel`] || undefined,
          showContent: {
            icon: values[`${media.key}_showIcon`] ?? true,
            levelText: values[`${media.key}_showLevelText`] ?? false,
            value: values[`${media.key}_showValue`] ?? false,
            reductionPercent: values[`${media.key}_showReductionPercent`] ?? false,
            baseline: values[`${media.key}_showBaseline`] ?? false,
            qrCode: values[`${media.key}_showQrCode`] ?? false,
          },
        }
        if (media.key === 'receipt') {
          mediaConfig[media.key].showOrderSummary =
            values[`${media.key}_showOrderSummary`] ?? true
          mediaConfig[media.key].showReductionMessage =
            values[`${media.key}_showReductionMessage`] ?? true
        }
      }
    })
    return mediaConfig
  }

  // 构建文本配置
  const buildTextConfig = (values: any) => {
    const textConfig: any = {}
    const languages = ['zh_CN', 'en_US']
    languages.forEach((lang) => {
      textConfig[lang] = {
        low: values[`${lang}_low`] || '',
        medium: values[`${lang}_medium`] || '',
        high: values[`${lang}_high`] || '',
        reduction: values[`${lang}_reduction`] || '',
        carbonFootprint: values[`${lang}_carbonFootprint`] || '',
        unit: values[`${lang}_unit`] || '',
        messages: {
          thankYou: values[`${lang}_thankYou`] || '',
          recommendation: values[`${lang}_recommendation`] || '',
        },
      }
    })
    return textConfig
  }

  // 重置为默认值
  const handleReset = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置所有配置为默认值吗？此操作不可恢复。',
      onOk: () => {
        setFormValues(null)
        message.success('已重置为默认值')
      },
    })
  }

  // 渲染媒介配置
  const renderMediaConfig = (mediaKey: string) => {
    const media = MEDIA_TYPES.find((m) => m.key === mediaKey)
    if (!media) return null

    return (
      <Card
        title={
          <Space>
            <span>{media.icon}</span>
            <span>{media.label}</span>
          </Space>
        }
        extra={
          <Form.Item
            name={`${mediaKey}_useGlobal`}
            valuePropName="checked"
            style={{ margin: 0 }}
          >
            <Checkbox>使用全局配置</Checkbox>
          </Form.Item>
        }
      >
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const useGlobal = getFieldValue(`${mediaKey}_useGlobal`)
            if (useGlobal) {
              return (
                <Alert
                  message="使用全局配置"
                  description={`当前使用全局默认展示级别：${getFieldValue('defaultDisplayLevel') || 'basic'}`}
                  type="info"
                  showIcon
                />
              )
            }
            return (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  name={`${mediaKey}_displayLevel`}
                  label="展示级别"
                  tooltip="设置此媒介的展示级别，将覆盖全局配置"
                >
                  <Select>
                    <Select.Option value="minimal">极简模式（仅图标）</Select.Option>
                    <Select.Option value="basic">基础模式（图标+等级文字）</Select.Option>
                    <Select.Option value="detailed">详细模式（图标+文字+数值）</Select.Option>
                    <Select.Option value="comprehensive">完整模式（所有信息）</Select.Option>
                  </Select>
                </Form.Item>

                <Divider orientation="left">显示内容</Divider>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={`${mediaKey}_showIcon`}
                      valuePropName="checked"
                    >
                      <Checkbox>显示图标</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={`${mediaKey}_showLevelText`}
                      valuePropName="checked"
                    >
                      <Checkbox>显示等级文字</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={`${mediaKey}_showValue`}
                      valuePropName="checked"
                    >
                      <Checkbox>显示具体数值</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={`${mediaKey}_showReductionPercent`}
                      valuePropName="checked"
                    >
                      <Checkbox>显示减排百分比</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={`${mediaKey}_showBaseline`}
                      valuePropName="checked"
                    >
                      <Checkbox>显示基准值</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={`${mediaKey}_showQrCode`}
                      valuePropName="checked"
                    >
                      <Checkbox>显示二维码</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>

                {mediaKey === 'receipt' && (
                  <>
                    <Divider orientation="left">小票特殊配置</Divider>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name={`${mediaKey}_showOrderSummary`}
                          valuePropName="checked"
                        >
                          <Checkbox>显示订单总碳足迹</Checkbox>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name={`${mediaKey}_showReductionMessage`}
                          valuePropName="checked"
                        >
                          <Checkbox>显示感谢信息</Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}
              </Space>
            )
          }}
        </Form.Item>
      </Card>
    )
  }

  // 渲染预览
  const renderPreview = () => {
    const values = form.getFieldsValue()
    const displayLevel = values.defaultDisplayLevel || 'basic'
    const iconSize = values.iconSize || 'medium'
    const colorScheme = values.colorScheme || 'standard'

    return (
      <Card title="预览效果" extra={<Button onClick={() => setShowPreview(false)}>关闭预览</Button>}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label="选择预览媒介">
            <Select
              value={previewMedia}
              onChange={setPreviewMedia}
              style={{ width: 200 }}
            >
              {MEDIA_TYPES.map((media) => (
                <Select.Option key={media.key} value={media.key}>
                  {media.icon} {media.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Card
            style={{
              border: '1px dashed #d9d9d9',
              background: '#fafafa',
              padding: '20px',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <Text strong>示例菜品：宫保鸡丁</Text>
              {iconSize !== 'small' && (
                <Tag
                  color={
                    colorScheme === 'colorful'
                      ? values.customColorMedium || '#FFC107'
                      : '#FFC107'
                  }
                  style={{ marginLeft: '8px' }}
                >
                  {iconSize === 'large' ? '🌱' : '🌿'} 达标
                </Tag>
              )}
            </div>
            <Text type="secondary">
              展示级别：{displayLevel} | 图标尺寸：{iconSize} | 颜色方案：
              {colorScheme}
            </Text>
          </Card>
        </Space>
      </Card>
    )
  }

  if (!currentRestaurantId) {
    return (
      <Card>
        <Typography>
          <Text type="secondary">请先选择餐厅</Text>
        </Typography>
      </Card>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 页面标题和版本信息 */}
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                <SettingOutlined /> 菜单环保信息展示配置
              </Title>
              <Text type="secondary">
                配置菜单上环保信息（碳标签）的展示方式，支持不同媒介的个性化配置
              </Text>
            </Col>
            <Col>
              {config && (
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="配置版本">
                    <Tag color="blue">v{config.version || 0}</Tag>
                  </Descriptions.Item>
                  {config.updatedAt && (
                    <Descriptions.Item label="更新时间">
                      {dayjs(config.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              )}
            </Col>
          </Row>

          {/* 操作按钮 */}
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadConfig} loading={loading}>
              刷新
            </Button>
            <Button onClick={handleReset}>重置为默认</Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '隐藏预览' : '预览效果'}
            </Button>
          </Space>

          {/* 预览区域 */}
          {showPreview && renderPreview()}

          {/* 配置表单 */}
          <Form form={form} layout="vertical">
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              {/* 全局配置 */}
              <TabPane tab="全局配置" key="global">
                <Card>
                  <Form.Item
                    name="enabled"
                    label="启用环保信息展示"
                    valuePropName="checked"
                    tooltip="控制是否在菜单上显示环保信息"
                  >
                    <Switch checkedChildren="已启用" unCheckedChildren="已禁用" />
                  </Form.Item>

                  <Form.Item
                    name="defaultDisplayLevel"
                    label="默认展示级别"
                    tooltip="设置全局默认的展示级别，各媒介可以单独覆盖"
                    rules={[{ required: true, message: '请选择默认展示级别' }]}
                  >
                    <Select>
                      <Select.Option value="minimal">极简模式（仅图标）</Select.Option>
                      <Select.Option value="basic">基础模式（图标+等级文字）</Select.Option>
                      <Select.Option value="detailed">详细模式（图标+文字+数值）</Select.Option>
                      <Select.Option value="comprehensive">完整模式（所有信息）</Select.Option>
                    </Select>
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="enabledFrom"
                        label="启用开始时间"
                        tooltip="设置启用开始时间，留空表示立即启用"
                      >
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="enabledTo"
                        label="启用结束时间"
                        tooltip="设置启用结束时间，留空表示永久启用"
                      >
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="description" label="配置说明">
                    <Input.TextArea rows={3} placeholder="输入配置说明（可选）" />
                  </Form.Item>
                </Card>
              </TabPane>

              {/* 媒介配置 */}
              <TabPane tab="媒介配置" key="media">
                <Tabs
                  activeKey={activeMediaTab}
                  onChange={setActiveMediaTab}
                  type="card"
                >
                  {MEDIA_TYPES.map((media) => (
                    <TabPane
                      tab={
                        <Space>
                          <span>{media.icon}</span>
                          <span>{media.label}</span>
                        </Space>
                      }
                      key={media.key}
                    >
                      {renderMediaConfig(media.key)}
                    </TabPane>
                  ))}
                </Tabs>
              </TabPane>

              {/* 视觉样式配置 */}
              <TabPane tab="视觉样式" key="style">
                <Card>
                  <Form.Item
                    name="iconSize"
                    label="图标尺寸"
                    tooltip="设置碳标签图标的显示尺寸"
                    rules={[{ required: true, message: '请选择图标尺寸' }]}
                  >
                    <Radio.Group>
                      <Radio value="small">小</Radio>
                      <Radio value="medium">中</Radio>
                      <Radio value="large">大</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item
                    name="colorScheme"
                    label="颜色方案"
                    tooltip="设置碳标签的颜色方案"
                    rules={[{ required: true, message: '请选择颜色方案' }]}
                  >
                    <Radio.Group>
                      <Radio value="standard">标准</Radio>
                      <Radio value="colorful">彩色</Radio>
                      <Radio value="minimal">极简</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item
                    name="iconPosition"
                    label="图标位置"
                    tooltip="设置图标相对于菜品名称的位置"
                    rules={[{ required: true, message: '请选择图标位置' }]}
                  >
                    <Radio.Group>
                      <Radio value="beforeName">名称前</Radio>
                      <Radio value="afterName">名称后</Radio>
                      <Radio value="belowName">名称下方</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const colorScheme = getFieldValue('colorScheme')
                      if (colorScheme === 'colorful') {
                        return (
                          <>
                            <Divider orientation="left">自定义颜色</Divider>
                            <Row gutter={16}>
                              <Col span={8}>
                                <Form.Item
                                  name="customColorLow"
                                  label="低碳颜色"
                                  tooltip="设置低碳标签的颜色"
                                >
                                  <ColorPicker showText />
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item
                                  name="customColorMedium"
                                  label="中碳颜色"
                                  tooltip="设置中碳标签的颜色"
                                >
                                  <ColorPicker showText />
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item
                                  name="customColorHigh"
                                  label="高碳颜色"
                                  tooltip="设置高碳标签的颜色"
                                >
                                  <ColorPicker showText />
                                </Form.Item>
                              </Col>
                            </Row>
                          </>
                        )
                      }
                      return null
                    }}
                  </Form.Item>
                </Card>
              </TabPane>

              {/* 功能开关 */}
              <TabPane tab="功能开关" key="features">
                <Card>
                  <Form.Item
                    name="enableFilter"
                    label="启用筛选功能"
                    valuePropName="checked"
                    tooltip="允许用户按碳等级筛选菜品"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name="enableSort"
                    label="启用排序功能"
                    valuePropName="checked"
                    tooltip="允许用户按碳足迹排序菜品"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name="enableRecommendation"
                    label="启用推荐专区"
                    valuePropName="checked"
                    tooltip="显示低碳菜品推荐专区"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name="enableAchievement"
                    label="启用成就激励"
                    valuePropName="checked"
                    tooltip="显示环保成就和激励信息"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    name="enableComparison"
                    label="启用对比功能"
                    valuePropName="checked"
                    tooltip="允许用户对比不同菜品的碳足迹"
                  >
                    <Switch />
                  </Form.Item>
                </Card>
              </TabPane>

              {/* 文本自定义 */}
              <TabPane tab="文本自定义" key="text">
                <Tabs
                  activeKey={activeLanguageTab}
                  onChange={setActiveLanguageTab}
                  type="card"
                >
                  <TabPane tab="简体中文" key="zh_CN">
                    <Card>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="zh_CN_low"
                            label="低碳文字"
                            tooltip="低碳标签显示的文字"
                          >
                            <Input placeholder="默认：低碳" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="zh_CN_medium"
                            label="中碳文字"
                            tooltip="中碳标签显示的文字"
                          >
                            <Input placeholder="默认：达标" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="zh_CN_high"
                            label="高碳文字"
                            tooltip="高碳标签显示的文字"
                          >
                            <Input placeholder="默认：高碳" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="zh_CN_reduction"
                            label="减排文字"
                            tooltip="减排相关显示的文字"
                          >
                            <Input placeholder="默认：减排" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="zh_CN_carbonFootprint"
                            label="碳足迹文字"
                            tooltip="碳足迹相关显示的文字"
                          >
                            <Input placeholder="默认：碳足迹" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="zh_CN_unit"
                            label="单位文字"
                            tooltip="碳足迹单位显示的文字"
                          >
                            <Input placeholder="默认：kg CO₂e" />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item
                            name="zh_CN_thankYou"
                            label="感谢信息"
                            tooltip="订单完成后的感谢信息"
                          >
                            <Input.TextArea
                              rows={2}
                              placeholder="默认：感谢您为环保做出的贡献！"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item
                            name="zh_CN_recommendation"
                            label="推荐文字"
                            tooltip="推荐专区显示的文字"
                          >
                            <Input placeholder="默认：今日低碳推荐" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </TabPane>
                  <TabPane tab="English" key="en_US">
                    <Card>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="en_US_low"
                            label="Low Carbon Text"
                            tooltip="Text displayed for low carbon label"
                          >
                            <Input placeholder="Default: Low Carbon" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="en_US_medium"
                            label="Standard Text"
                            tooltip="Text displayed for medium carbon label"
                          >
                            <Input placeholder="Default: Standard" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="en_US_high"
                            label="High Carbon Text"
                            tooltip="Text displayed for high carbon label"
                          >
                            <Input placeholder="Default: High Carbon" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="en_US_reduction"
                            label="Reduction Text"
                            tooltip="Text displayed for reduction"
                          >
                            <Input placeholder="Default: Reduction" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="en_US_carbonFootprint"
                            label="Carbon Footprint Text"
                            tooltip="Text displayed for carbon footprint"
                          >
                            <Input placeholder="Default: Carbon Footprint" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="en_US_unit"
                            label="Unit Text"
                            tooltip="Text displayed for unit"
                          >
                            <Input placeholder="Default: kg CO₂e" />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item
                            name="en_US_thankYou"
                            label="Thank You Message"
                            tooltip="Thank you message after order completion"
                          >
                            <Input.TextArea
                              rows={2}
                              placeholder="Default: Thank you for your contribution to environmental protection!"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item
                            name="en_US_recommendation"
                            label="Recommendation Text"
                            tooltip="Text displayed in recommendation section"
                          >
                            <Input placeholder="Default: Today's Low Carbon Recommendations" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </TabPane>
                </Tabs>
              </TabPane>
            </Tabs>
          </Form>
        </Space>
      </Card>
    </div>
  )
}

export default MenuDisplayConfigPage
