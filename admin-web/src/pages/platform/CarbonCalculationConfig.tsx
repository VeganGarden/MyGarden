/**
 * 碳足迹计算配置管理页面
 */
import {
  carbonCalculationConfigAPI,
  type CarbonCalculationConfig,
  type ConfigGroup
} from '@/services/carbonCalculationConfig'
import { EditOutlined, SaveOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Space,
  Table,
  Tabs,
  Typography,
  message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { Title, Text } = Typography
const { TabPane } = Tabs

const CarbonCalculationConfigPage: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('waste_rate')
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form] = Form.useForm()

  // 配置类型映射
  const configTypeMap: Record<string, { label: string; key: string }> = {
    waste_rate: { label: '食材损耗率', key: 'ingredient_waste_rate' },
    energy_factor: { label: '默认能源因子', key: 'default_electric_factor' },
    cooking_time: { label: '标准工时模型', key: 'standard_time_model' },
    cooking_power: { label: '标准功率模型', key: 'standard_power_model' },
    packaging: { label: '包装重量', key: 'packaging_weight' },
    carbon_level: { label: '碳等级配置', key: 'carbon_level_threshold' }
  }

  // 获取配置数据
  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const result = await carbonCalculationConfigAPI.getGroups()

      if (result && result.code === 0) {
        setConfigGroups(result.data || [])
        
        // 设置默认tab（如果有数据）
        if (result.data && result.data.length > 0 && !activeTab) {
          const firstGroup = result.data[0]
          const firstType = Object.entries(configTypeMap).find(
            ([_, v]) => v.key === firstGroup.configKey
          )?.[0]
          if (firstType) {
            setActiveTab(firstType)
          }
        }
      } else {
        message.error(result?.message || '加载失败')
      }
    } catch (error: any) {
      console.error('获取配置失败:', error)
      message.error(error?.message || '加载失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  // 保存单个配置
  const handleSave = async (record: CarbonCalculationConfig) => {
    try {
      const values = await form.validateFields()
      
      const updateParams: any = {
        id: record._id
      }

      if (values.value !== undefined) {
        updateParams.value = values.value
      }
      if (values.description !== undefined) {
        updateParams.description = values.description
      }
      if (values.source !== undefined) {
        updateParams.source = values.source
      }
      if (values.version !== undefined) {
        updateParams.version = values.version
      }

      const result = await carbonCalculationConfigAPI.update(updateParams)

      if (result && result.code === 0) {
        message.success('更新成功')
        setEditingKey(null)
        form.resetFields()
        fetchConfigs()
      } else {
        message.error(result?.message || '更新失败')
      }
    } catch (error: any) {
      if (error?.errorFields) {
        // 表单验证错误
        return
      }
      console.error('保存配置失败:', error)
      message.error(error?.message || '保存失败')
    }
  }

  // 开始编辑
  const handleEdit = (record: CarbonCalculationConfig) => {
    setEditingKey(record._id || '')
    form.setFieldsValue({
      value: record.value,
      description: record.description,
      source: record.source,
      version: record.version
    })
  }

  // 取消编辑
  const handleCancel = () => {
    setEditingKey(null)
    form.resetFields()
  }

  // 渲染可编辑单元格
  const renderEditableCell = (
    record: CarbonCalculationConfig,
    dataIndex: string,
    inputType: 'number' | 'text' | 'color' = 'text'
  ): React.ReactNode => {
    const isEditing = editingKey === record._id
    const isColorConfig = record.configKey === 'carbon_level_color'
    const isThresholdConfig = record.configKey === 'carbon_level_threshold'

    if (isEditing && dataIndex !== 'category' && dataIndex !== 'configKey') {
      return (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: dataIndex === 'value',
              message: '此字段必填'
            },
            ...(isColorConfig && dataIndex === 'value'
              ? [
                  {
                    pattern: /^#[0-9A-Fa-f]{6}$/,
                    message: '颜色值必须是有效的十六进制格式（如 #52c41a）'
                  }
                ]
              : []),
            ...(isThresholdConfig && dataIndex === 'value'
              ? [
                  {
                    validator: async (_, value) => {
                      if (value === undefined || value === null) {
                        return Promise.reject(new Error('阈值不能为空'))
                      }
                      // 验证阈值逻辑：ultra_low < low < medium < high
                      const currentGroup = getCurrentConfigGroup()
                      if (currentGroup && currentGroup.items) {
                        const thresholds: Record<string, number> = {}
                        currentGroup.items.forEach((item) => {
                          if (item.category && item._id !== record._id) {
                            thresholds[item.category] = Number(item.value)
                          }
                        })
                        thresholds[record.category] = Number(value)

                        if (
                          thresholds.ultra_low !== undefined &&
                          thresholds.low !== undefined &&
                          thresholds.ultra_low >= thresholds.low
                        ) {
                          return Promise.reject(
                            new Error('超低碳阈值必须小于低碳阈值')
                          )
                        }
                        if (
                          thresholds.low !== undefined &&
                          thresholds.medium !== undefined &&
                          thresholds.low >= thresholds.medium
                        ) {
                          return Promise.reject(
                            new Error('低碳阈值必须小于中碳阈值')
                          )
                        }
                        if (
                          thresholds.medium !== undefined &&
                          thresholds.high !== undefined &&
                          thresholds.medium >= thresholds.high
                        ) {
                          return Promise.reject(
                            new Error('中碳阈值必须小于高碳阈值')
                          )
                        }
                      }
                      return Promise.resolve()
                    }
                  }
                ]
              : [])
          ]}
        >
          {inputType === 'color' || isColorConfig ? (
            <ColorPicker
              showText
              format="hex"
              style={{ width: '100%' }}
              onChange={(color) => {
                form.setFieldValue('value', color.toHexString())
              }}
            />
          ) : inputType === 'number' ? (
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={dataIndex === 'value' ? 0.01 : undefined}
            />
          ) : (
            <Input />
          )}
        </Form.Item>
      )
    }

    // 显示值
    if (dataIndex === 'value') {
      if (isColorConfig) {
        return (
          <Space>
            <div
              style={{
                width: 20,
                height: 20,
                backgroundColor: String(record.value),
                border: '1px solid #d9d9d9',
                borderRadius: 4
              }}
            />
            <span>{String(record.value)}</span>
          </Space>
        )
      }
      return `${record.value} ${record.unit}`
    }

    const value = record[dataIndex as keyof CarbonCalculationConfig]
    return value != null ? String(value) : '-'
  }

  // 获取当前tab的配置组
  const getCurrentConfigGroup = (): ConfigGroup | undefined => {
    const configTypeInfo = configTypeMap[activeTab]
    if (!configTypeInfo) return undefined

    // 对于碳等级配置，需要合并阈值和颜色两个配置组
    if (activeTab === 'carbon_level') {
      const thresholdGroup = configGroups.find(
        (group) => group.configKey === 'carbon_level_threshold'
      )
      const colorGroup = configGroups.find(
        (group) => group.configKey === 'carbon_level_color'
      )

      if (thresholdGroup && colorGroup) {
        // 返回合并后的配置组，先显示阈值，再显示颜色
        return {
          configKey: 'carbon_level',
          configType: 'carbon_level',
          description: '碳等级阈值和颜色配置',
          items: [...thresholdGroup.items, ...colorGroup.items]
        }
      } else if (thresholdGroup) {
        return thresholdGroup
      } else if (colorGroup) {
        return colorGroup
      }
      return undefined
    }

    return configGroups.find((group) => group.configKey === configTypeInfo.key)
  }

  // 生成表格列
  const getColumns = (): ColumnsType<CarbonCalculationConfig> => {
    return [
      {
        title: '类别',
        dataIndex: 'category',
        key: 'category',
        width: 150,
        render: (text) => {
          const categoryNames: Record<string, string> = {
            vegetables: '蔬菜类',
            meat: '肉类',
            seafood: '海鲜类',
            grains: '干货类',
            default: '默认值',
            electric: '电力',
            gas: '燃气',
            raw: '生食',
            steamed: '蒸',
            boiled: '煮',
            stir_fried: '快炒',
            fried: '炸',
            baked: '烤',
            meal_box: '简餐盒',
            beverage_cup: '饮料杯',
            paper_bag: '纸袋',
            ultra_low: '超低碳',
            low: '低碳',
            medium: '中碳',
            high: '高碳'
          }
          return categoryNames[text] || text
        }
      },
      {
        title: '配置值',
        dataIndex: 'value',
        key: 'value',
        width: 200,
        render: (_, record) => {
          const inputType =
            record.configKey === 'carbon_level_color'
              ? 'color'
              : record.configKey === 'carbon_level_threshold'
                ? 'number'
                : 'number'
          return renderEditableCell(record, 'value', inputType)
        }
      },
      {
        title: '单位',
        dataIndex: 'unit',
        key: 'unit',
        width: 120
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (_, record) => renderEditableCell(record, 'description', 'text')
      },
      {
        title: '来源依据',
        dataIndex: 'source',
        key: 'source',
        ellipsis: true,
        render: (_, record) => renderEditableCell(record, 'source', 'text')
      },
      {
        title: '版本',
        dataIndex: 'version',
        key: 'version',
        width: 100,
        render: (_, record) => renderEditableCell(record, 'version', 'text')
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => {
          const isEditing = editingKey === record._id

          if (isEditing) {
            return (
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={() => handleSave(record)}
                >
                  保存
                </Button>
                <Button type="link" size="small" onClick={handleCancel}>
                  取消
                </Button>
              </Space>
            )
          }

          return (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )
        }
      }
    ]
  }

  const currentGroup = getCurrentConfigGroup()

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={4}>碳足迹计算默认参数配置</Title>
        <Text type="secondary">
          管理碳足迹计算相关的默认参数，包括食材损耗率、默认能源因子、标准工时模型、标准功率模型、包装重量和碳等级配置等配置项。
        </Text>

        <div style={{ marginTop: 24 }}>
          <Form form={form} component={false}>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                setActiveTab(key)
                setEditingKey(null)
                form.resetFields()
              }}
            >
              {Object.entries(configTypeMap).map(([key, { label }]) => (
                <TabPane tab={label} key={key}>
                  {currentGroup && currentGroup && currentGroup.items ? (
                    <>
                      {key === 'carbon_level' && (
                        <div style={{ marginBottom: 16 }}>
                          <Text type="secondary">
                            配置碳等级的阈值和颜色。阈值必须满足：超低碳 &lt; 低碳 &lt; 中碳 &lt; 高碳
                          </Text>
                        </div>
                      )}
                      <Table
                        columns={getColumns()}
                        dataSource={currentGroup.items}
                        rowKey="_id"
                        loading={loading}
                        pagination={false}
                        size="small"
                      />
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      {loading ? '加载中...' : '暂无配置数据'}
                    </div>
                  )}
                </TabPane>
              ))}
            </Tabs>
          </Form>
        </div>
      </Card>
    </div>
  )
}

export default CarbonCalculationConfigPage

