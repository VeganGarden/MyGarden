import { carbonFootprintAPI, tenantAPI } from '@/services/cloudbase'
import { regionConfigAPI } from '@/services/regionConfig'
import { useAppSelector } from '@/store/hooks'
import type { MenuItem } from '@/types/menuItem'
import { formatCarbonFootprintValue, getCarbonFootprintValue, transformMenuItemData, transformMenuItemList } from '@/utils/menuItemTransform'
import {
  CalculatorOutlined,
  DownOutlined,
  EditOutlined,
  InfoCircleOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { App, Button, Card, Col, Collapse, Descriptions, Divider, Form, InputNumber, Modal, Row, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

const { Panel } = Collapse
const { Text, Title } = Typography

// MenuItem类型已从@/types/menuItem导入，CalculationDetails 也在其中定义

const CarbonMenu: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]) // 展开的卡片ID列表
  
  // 编辑菜单项相关状态
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [updating, setUpdating] = useState(false)
  const [editForm] = Form.useForm()
  const [factorRegionOptions, setFactorRegionOptions] = useState<Array<{ value: string; label: string }>>([])
  const [baselineRegionOptions, setBaselineRegionOptions] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    // 当餐厅切换时，重新加载数据
    fetchMenuData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRestaurantId])

  // 加载因子区域选项和基准值区域选项
  useEffect(() => {
    loadFactorRegionOptions()
    loadBaselineRegionOptions()
  }, [])

  const loadFactorRegionOptions = async () => {
    try {
      const result = await regionConfigAPI.list({
        configType: 'factor_region',
        status: 'active',
        pageSize: 100
      })
      
      const regions = Array.isArray(result.data) 
        ? result.data 
        : result.data?.list || []
      
      // 只加载国家级别（level=1）的因子区域
      const options = regions
        .filter((region: any) => region.level === 1)
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((region: any) => ({
          value: region.code,
          label: `${region.name} (${region.code})`
        }))
      
      setFactorRegionOptions(options)
    } catch (error) {
      console.error('加载因子区域选项失败:', error)
      // 如果加载失败，使用默认选项
      setFactorRegionOptions([
        { value: 'CN', label: '中国 (CN)' },
        { value: 'US', label: '美国 (US)' },
        { value: 'JP', label: '日本 (JP)' },
      ])
    }
  }

  // 加载基准值区域选项
  const loadBaselineRegionOptions = async () => {
    try {
      const result = await regionConfigAPI.list({
        configType: 'baseline_region',
        status: 'active',
        pageSize: 100
      })
      
      const regions = Array.isArray(result.data) 
        ? result.data 
        : result.data?.list || []
      
      // 加载所有激活的基准值区域，按sortOrder排序
      const options = regions
        .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((region: any) => ({
          value: region.code,
          label: region.name
        }))
      
      setBaselineRegionOptions(options)
    } catch (error) {
      console.error('加载基准值区域选项失败:', error)
      // 如果加载失败，使用默认选项
      setBaselineRegionOptions([
        { value: 'north_china', label: '华北区域' },
        { value: 'northeast', label: '东北区域' },
        { value: 'east_china', label: '华东区域' },
        { value: 'central_china', label: '华中区域' },
        { value: 'south_china', label: '华南区域' },
        { value: 'northwest', label: '西北区域' },
        { value: 'southwest', label: '西南区域' },
        { value: 'national_average', label: '全国平均' },
      ])
    }
  }

  // 检查URL参数，如果有highlightId则高亮显示并展开
  useEffect(() => {
    const id = searchParams.get('highlightId')
    if (id) {
      setHighlightId(id)
      setExpandedKeys([id]) // 自动展开
      // 清除URL参数
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('highlightId')
      navigate(`/carbon/menu?${newParams.toString()}`, { replace: true })
      // 2秒后清除高亮
      setTimeout(() => setHighlightId(null), 2000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const fetchMenuData = async () => {
    try {
      if (!currentRestaurantId) {
        setDataSource([])
        setLoading(false)
        return
      }
      
      setLoading(true)
      const params = {
        restaurantId: currentRestaurantId,
      }
      
      // 统一使用tenantAPI.getMenuList
      const result = await tenantAPI.getMenuList(params)
      
      if (result && result.code === 0 && result.data) {
        try {
          // API 返回格式: { menus: [], menuItems: [], total: number } 或直接是数组
          const data = result.data
          const menus = Array.isArray(data) ? data : (data.menus || data.menuItems || [])
          if (Array.isArray(menus)) {
            // 使用统一的数据转换函数
            const transformedItems = transformMenuItemList(menus)
            setDataSource(transformedItems)
            
            // 默认收起所有卡片
          } else {
            setDataSource([])
          }
        } catch (parseError: any) {
          // 数据转换错误，已处理
          setDataSource([])
          message.warning('数据格式错误，请稍后重试')
        }
      } else {
        setDataSource([])
        if (result && result.message) {
          message.warning(result.message)
        }
      }
    } catch (error: any) {
      message.error(error.message || '获取菜单数据失败，请稍后重试')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async (menuItem: MenuItem) => {
    if (!currentRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }

    const menuItemId = menuItem.id || menuItem._id || ''
    try {
      message.loading({ content: '正在重新计算碳足迹...', key: 'calculate', duration: 0 })
      
      const result = await carbonFootprintAPI.recalculateMenuItems({
        restaurantId: currentRestaurantId,
        menuItemIds: [menuItemId],
      })

      if (result && result.code === 0) {
        message.success({ content: '重新计算成功', key: 'calculate' })
        // 刷新列表，新的计算明细会包含在菜单项数据中
        fetchMenuData()
      } else {
        message.error({ content: result?.message || '重新计算失败', key: 'calculate' })
      }
    } catch (error: any) {
      message.error({ content: error.message || '重新计算失败，请稍后重试', key: 'calculate' })
    }
  }

  // 打开碳足迹计算配置Modal
  const handleEditMenuItem = (menuItem: MenuItem) => {
    setEditingMenuItem(menuItem)
    setEditModalVisible(true)
    // 设置表单初始值（只设置碳足迹计算相关配置）
    editForm.setFieldsValue({
      mealType: menuItem.mealType || 'meat_simple',
      energyType: menuItem.energyType || 'electric',
      calculationLevel: menuItem.calculationLevel || 'L2',
      baselineRegion: menuItem.restaurantRegion || 'national_average', // 基准值区域
      factorRegion: menuItem.factorRegion || 'CN', // 因子区域，默认CN
      cookingTime: menuItem.cookingTime || undefined,
    })
  }

  // 保存编辑的菜单项
  const handleUpdateMenuItem = async () => {
    if (!editingMenuItem || !currentRestaurantId) {
      return
    }

    try {
      const values = await editForm.validateFields()
      setUpdating(true)

      // 构建更新数据（表单已验证，值一定存在）
      const updateData: any = {
        mealType: values.mealType,
        energyType: values.energyType,
        calculationLevel: values.calculationLevel,
        restaurantRegion: values.baselineRegion, // 基准值区域代码
        factorRegion: values.factorRegion || 'CN', // 因子区域代码，默认CN
      }
      
      // cookingTime 是可选的，只有填写了才更新
      if (values.cookingTime !== undefined && values.cookingTime !== null && values.cookingTime !== '') {
        updateData.cookingTime = Number(values.cookingTime)
      } else if (editingMenuItem.cookingTime !== undefined) {
        // 如果原来有值但现在清空了，需要删除该字段
        updateData.cookingTime = null
      }

      const result = await tenantAPI.updateMenuItem({
        menuItemId: editingMenuItem._id || editingMenuItem.id,
        restaurantId: currentRestaurantId,
        updateData,
      })

      const actualResult = result?.result || result
      
      if (actualResult && actualResult.code === 0) {
        message.success('配置已更新，建议重新计算碳足迹以应用新配置')
        setEditModalVisible(false)
        setEditingMenuItem(null)
        editForm.resetFields()
        
        // 使用更新后返回的数据直接更新列表，避免再次调用getMenuList
        if (actualResult.data) {
          const updatedItem = transformMenuItemData(actualResult.data)
          setDataSource(prevData => 
            prevData.map(item => 
              (item.id === updatedItem.id || item._id === updatedItem._id) 
                ? updatedItem 
                : item
            )
          )
        } else {
          // 如果返回数据为空，则刷新整个列表
          fetchMenuData()
        }
      } else {
        const errorMsg = actualResult?.message || result?.message || '更新失败'
        message.error(errorMsg)
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error.message || '更新失败')
    } finally {
      setUpdating(false)
    }
  }

  // 处理面板展开/收起
  const handlePanelChange = (keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys]
    setExpandedKeys(keyArray)
  }

  // 渲染计算明细
  const renderCalculationDetails = (menuItem: MenuItem) => {
    // 直接从菜单项数据中读取 calculationDetails
    const details = menuItem.calculationDetails

    // 检查 details 是否有效（不是 null、undefined 或空对象）
    // 对于L2和L3级别，即使ingredients为空数组，只要有total字段就认为是有效的
    const hasValidDetails = details && 
                           typeof details === 'object' && 
                           details !== null &&
                           (Array.isArray(details.ingredients) || details.total !== undefined)

    if (!hasValidDetails) {
      return (
        <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
          <InfoCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <div>暂无计算明细数据</div>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            点击"重新计算"按钮获取详细的计算明细
          </div>
        </div>
      )
    }

    // 过滤掉没有ingredientName的食材数据（避免显示空行）
    const validIngredients = (details.ingredients || []).filter(ing => ing.ingredientName && ing.ingredientName.trim())
    
    // 食材明细表格列定义
    const ingredientColumns: ColumnsType<NonNullable<typeof details.ingredients>[0]> = [
      {
        title: '食材名称',
        dataIndex: 'ingredientName',
        key: 'ingredientName',
        width: 150,
      },
      {
        title: '用量',
        key: 'quantity',
        width: 120,
        render: (_: any, record) => (
          <span>
            {record.quantity} {record.unit}
            {record.weightInKg > 0 && (
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                ({record.weightInKg.toFixed(4)} kg)
              </Text>
            )}
          </span>
        ),
      },
      {
        title: '类别',
        dataIndex: 'category',
        key: 'category',
        width: 100,
        render: (category) => category || '-',
      },
      {
        title: '排放因子',
        key: 'factor',
        width: 180,
        render: (_: any, record) => {
          if (!record.factor) {
            return (
              <Tooltip
                title={
                  <div>
                    <div style={{ marginBottom: '8px' }}>未匹配到排放因子</div>
                    <div style={{ fontSize: '12px', color: '#fff' }}>
                      <div>• 该食材可能未在因子库中</div>
                      <div>• 建议前往「因子库管理」添加该食材的排放因子</div>
                      <div>• 或检查食材名称是否正确</div>
                    </div>
                  </div>
                }
              >
                <Text type="danger">未匹配</Text>
              </Tooltip>
            )
          }
          
          // 匹配级别显示文本
          const matchLevelText: Record<string, string> = {
            exact_region: '精确匹配',
            alias_match: '别名匹配',
            category_fallback: '类别兜底'
          }
          
          const matchLevelColor: Record<string, string> = {
            exact_region: 'green',
            alias_match: 'blue',
            category_fallback: 'orange'
          }
          
          return (
            <div>
              <div>{record.factor.value.toFixed(6)} {record.factor.unit}</div>
              {record.factor.matchLevel && (
                <Tag color={matchLevelColor[record.factor.matchLevel] || 'default'}>
                  {matchLevelText[record.factor.matchLevel] || record.factor.matchLevel}
                </Tag>
              )}
            </div>
          )
        },
      },
      {
        title: '损耗率',
        key: 'wasteRate',
        width: 80,
        render: (_: any, record) => {
          const rate = record.wasteRate || 0
          return `${(rate * 100).toFixed(1)}%`
        },
      },
      {
        title: '碳足迹',
        key: 'carbonFootprint',
        width: 120,
        align: 'right' as const,
        render: (_: any, record) => (
          <Text strong>{formatCarbonFootprintValue(record.carbonFootprint, 'kg CO₂e', false)}</Text>
        ),
      },
      {
        title: '计算公式',
        key: 'formula',
        width: 200,
        render: (_: any, record) => {
          if (record.calculation) {
            return (
              <Tooltip
                title={
                  <div>
                    <div>公式: {record.calculation.formula}</div>
                    <div>EF (因子) = {record.calculation.values.EF}</div>
                    <div>M (重量) = {record.calculation.values.M} kg</div>
                    <div>W (损耗率) = {(record.calculation.values.W * 100).toFixed(1)}%</div>
                    <div>结果 = {record.calculation.values.result.toFixed(6)} kg CO₂e</div>
                  </div>
                }
              >
                <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'pointer' }} />
                <span style={{ marginLeft: '8px', fontSize: '12px' }}>CF = EF × M × (1 + W)</span>
              </Tooltip>
            )
          }
          return '-'
        },
      },
    ]

    const totalIngredientsCarbon = validIngredients.reduce((sum, ing) => sum + (ing.carbonFootprint || 0), 0)

    // 获取计算级别信息
    const calculationLevel = menuItem.calculationLevel || 'L2'
    // 从calculationDetails中获取估算标识（L1级别是估算级）
    const isEstimated = calculationLevel === 'L1'
    // 从calculationDetails中获取计算方法，如果没有则根据计算级别推断
    const calculationMethod = (details as any)?.calculationMethod || (calculationLevel === 'L1' ? 'baseline_estimation' : calculationLevel === 'L3' ? 'measured_data' : 'standard')
    
    // 计算级别说明
    const levelDescriptions: Record<string, { title: string; description: string; color: string }> = {
      L1: {
        title: 'L1 估算级',
        description: '基于餐食类型和地区的行业基准值进行快速估算，适用于快速铺量、小微餐厅、商户数据缺失场景',
        color: '#1890ff'
      },
      L2: {
        title: 'L2 核算级',
        description: '基于标准配方(BOM)和标准能耗模型进行详细计算，适用于常规餐厅和标准菜单',
        color: '#52c41a'
      },
      L3: {
        title: 'L3 实测级',
        description: '基于动态BOM、智能电表实测数据和溯源因子的高精度计算，适用于标杆气候餐厅、碳资产开发场景',
        color: '#722ed1'
      }
    }
    
    const levelInfo = levelDescriptions[calculationLevel] || levelDescriptions.L2

    return (
      <div style={{ marginTop: '16px' }}>
        <Divider orientation="left">计算明细</Divider>
        
        {/* 计算级别标识 */}
        <Card 
          size="small" 
          style={{ 
            marginBottom: '16px', 
            background: calculationLevel === 'L1' ? '#e6f7ff' : calculationLevel === 'L3' ? '#f9f0ff' : '#f6ffed',
            borderColor: levelInfo.color
          }}
        >
          <Space>
            <Tag color={levelInfo.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
              {levelInfo.title}
            </Tag>
            {isEstimated && (
              <Tag color="orange">估算值</Tag>
            )}
            {calculationLevel === 'L3' && (details?.energy as any)?.isMeasured && (
              <Tag color="green">实测能耗</Tag>
            )}
            {calculationLevel === 'L3' && details?.ingredients?.some(ing => (ing as any).traceability) && (
              <Tag color="blue">溯源数据</Tag>
            )}
            <Tooltip title={levelInfo.description}>
              <InfoCircleOutlined style={{ color: levelInfo.color, cursor: 'pointer' }} />
            </Tooltip>
          </Space>
        </Card>
        
        {/* 食材明细 */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>食材碳足迹明细</Title>
          <Table
            columns={ingredientColumns}
            dataSource={validIngredients}
            rowKey={(record, index) => `${record.ingredientName}-${record.quantity}-${record.unit}-${index}`}
            pagination={false}
            size="small"
            summary={(pageData) => {
              const total = pageData.reduce((sum, record) => sum + record.carbonFootprint, 0)
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6}>
                      <Text strong>食材碳足迹合计</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong>{formatCarbonFootprintValue(total, 'kg CO₂e', false)}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )
            }}
          />
        </div>

        {/* 其他明细 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title="烹饪能耗">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="烹饪方式">{details.energy?.method || '-'}</Descriptions.Item>
                <Descriptions.Item label="烹饪时间">{details.energy?.time ? `${details.energy.time} 分钟` : '-'}</Descriptions.Item>
                <Descriptions.Item label="能源类型">{details.energy?.energyType || '-'}</Descriptions.Item>
                <Descriptions.Item label="碳足迹">
                  <Text strong>{formatCarbonFootprintValue(details.energy?.carbonFootprint || 0, 'kg CO₂e', false)}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title="包装">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="碳足迹">
                  <Text strong>{formatCarbonFootprintValue(details.packaging?.carbonFootprint || 0, 'kg CO₂e', false)}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small" title="运输">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="碳足迹">
                  <Text strong>{formatCarbonFootprintValue(details.transport?.carbonFootprint || 0, 'kg CO₂e', false)}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {/* 总计 */}
        <Card 
          size="small" 
          style={{ marginTop: '16px', background: '#f0f9ff', borderColor: '#1890ff' }}
        >
          <Descriptions column={1}>
            <Descriptions.Item label="总碳足迹">
              <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                {formatCarbonFootprintValue(details.total, 'kg CO₂e', false)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="明细构成">
              <Space direction="vertical" size="small">
                <Text>食材: {formatCarbonFootprintValue(totalIngredientsCarbon, 'kg CO₂e', false)}</Text>
                <Text>能耗: {formatCarbonFootprintValue(details.energy?.carbonFootprint || 0, 'kg CO₂e', false)}</Text>
                <Text>包装: {formatCarbonFootprintValue(details.packaging?.carbonFootprint || 0, 'kg CO₂e', false)}</Text>
                <Text>运输: {formatCarbonFootprintValue(details.transport?.carbonFootprint || 0, 'kg CO₂e', false)}</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    )
  }

  const handleBatchRecalculate = async () => {
    if (!currentRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }

    Modal.confirm({
      title: '批量重新计算',
      content: '确定要重新计算所有菜单项的碳足迹吗？这可能需要一些时间。',
      onOk: async () => {
        try {
          message.loading({ content: '正在批量重新计算...', key: 'batch-recalculate', duration: 0 })
          
          const result = await carbonFootprintAPI.recalculateMenuItems({
            restaurantId: currentRestaurantId,
            // 不传menuItemIds表示计算所有菜单项
          })

          if (result && result.code === 0) {
            message.success({ content: '批量重新计算成功', key: 'batch-recalculate' })
            fetchMenuData()
          } else {
            message.error({ content: result?.message || '批量重新计算失败', key: 'batch-recalculate' })
          }
        } catch (error: any) {
          message.error({ content: error.message || '批量重新计算失败，请稍后重试', key: 'batch-recalculate' })
        }
      },
    })
  }

  // 获取碳标签显示
  const getCarbonLabelTag = (label?: string) => {
    const config: Record<string, { color: string; text: string }> = {
      ultra_low: { color: 'green', text: '超低碳' },
      low: { color: 'lime', text: '低碳' },
      medium: { color: 'orange', text: '中碳' },
      high: { color: 'red', text: '高碳' },
    }
    const cfg = config[label || ''] || config.medium
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 获取计算级别显示
  const getCalculationLevelTag = (level?: string) => {
    if (!level) return '-'
    const config: Record<string, { color: string; text: string }> = {
      L1: { color: 'blue', text: 'L1估算级' },
      L2: { color: 'green', text: 'L2核算级' },
      L3: { color: 'purple', text: 'L3实测级' },
    }
    const cfg = config[level] || { color: 'default', text: level }
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 如果没有选择餐厅，显示提示
  if (!currentRestaurantId) {
    return (
      <Card title="菜单碳足迹">
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: 14 }}>
            {restaurants.length > 1 
              ? '请先在顶部标题栏选择餐厅' 
              : '暂无可用餐厅'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card
        title={
          <div>
            <span style={{ fontSize: '18px', fontWeight: 500 }}>菜单碳足迹</span>
            <Tooltip title="展示每个菜品的详细碳足迹计算过程，包括食材、能耗、包装和运输等各个环节的碳足迹明细">
              <InfoCircleOutlined style={{ marginLeft: '8px', color: '#999', cursor: 'help' }} />
            </Tooltip>
          </div>
        }
        extra={
          <Button
            icon={<CalculatorOutlined />}
            onClick={handleBatchRecalculate}
          >
            批量重新计算
          </Button>
        }
      >
        {/* 筛选功能暂时隐藏，后续可扩展 */}

        {/* 使用Collapse展示菜单项卡片 */}
        <Collapse
          activeKey={expandedKeys}
          onChange={handlePanelChange}
          expandIcon={({ isActive }) => isActive ? <UpOutlined /> : <DownOutlined />}
          style={{ background: 'transparent' }}
        >
          {dataSource.map((menuItem) => {
            const menuItemId = menuItem.id || menuItem._id || ''
            const carbonValue = getCarbonFootprintValue(menuItem.carbonFootprint)
            const cf = typeof menuItem.carbonFootprint === 'object' ? menuItem.carbonFootprint : null

            return (
              <Panel
                key={menuItemId}
                header={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                      <Space>
                        <Text strong style={{ fontSize: '16px' }}>{menuItem.name}</Text>
                        {getCarbonLabelTag(menuItem.carbonLabel)}
                        {getCalculationLevelTag(menuItem.calculationLevel)}
                        {menuItem.status && (
                          <Tag color={menuItem.status === 'active' || menuItem.status === 'published' ? 'success' : 'default'}>
                            {menuItem.status === 'active' || menuItem.status === 'published' ? '已上架' : '已下架'}
                          </Tag>
                        )}
                      </Space>
                    </div>
                    <div style={{ marginRight: '40px' }}>
                      <Space>
                        <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                          碳足迹: {formatCarbonFootprintValue(carbonValue, 'kg CO₂e', false)}
                        </Text>
                        {cf?.baseline !== undefined && (
                          <Text type="secondary">
                            基准值: {formatCarbonFootprintValue(cf.baseline, 'kg CO₂e', false)}
                          </Text>
                        )}
                        {cf?.reduction !== undefined && (
                          <Text style={{ color: cf.reduction >= 0 ? '#52c41a' : '#ff4d4f' }}>
                            减排: {cf.reduction >= 0 ? '+' : ''}{formatCarbonFootprintValue(cf.reduction, 'kg CO₂e', false)}
                          </Text>
                        )}
                      </Space>
                    </div>
                  </div>
                }
                extra={
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="link"
                      size="small"
                      icon={<CalculatorOutlined />}
                      onClick={() => handleCalculate(menuItem)}
                    >
                      重新计算
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditMenuItem(menuItem)}
                    >
                      配置
                    </Button>
                  </Space>
                }
                style={{
                  marginBottom: '16px',
                  background: highlightId === menuItemId ? '#e6f7ff' : '#fff',
                  border: highlightId === menuItemId ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  borderRadius: '8px',
                }}
              >
                {renderCalculationDetails(menuItem)}
              </Panel>
            )
          })}
        </Collapse>

        {dataSource.length === 0 && !loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            暂无菜单数据
          </div>
        )}
      </Card>

      {/* 碳足迹计算配置Modal */}
      <Modal
        title="碳足迹计算配置"
        open={editModalVisible}
        onOk={handleUpdateMenuItem}
        onCancel={() => {
          setEditModalVisible(false)
          setEditingMenuItem(null)
          editForm.resetFields()
        }}
        confirmLoading={updating}
        width={600}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          initialValues={{
            mealType: 'meat_simple',
            energyType: 'electric',
            calculationLevel: 'L2',
            baselineRegion: 'national_average',
            factorRegion: 'CN',
          }}
        >
          <Form.Item
            label="餐食类型"
            name="mealType"
            rules={[{ required: true, message: '请选择餐食类型' }]}
            tooltip="用于碳足迹计算，影响基准值的选择"
          >
            <Select placeholder="请选择餐食类型">
              <Select.Option value="meat_simple">肉食简餐</Select.Option>
              <Select.Option value="meat_full">肉食全餐</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="用能方式"
            name="energyType"
            rules={[{ required: true, message: '请选择用能方式' }]}
            tooltip="用于计算烹饪能耗的碳足迹"
          >
            <Select placeholder="请选择用能方式">
              <Select.Option value="electric">电力</Select.Option>
              <Select.Option value="gas">燃气</Select.Option>
              <Select.Option value="mixed">混合</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="计算级别"
            name="calculationLevel"
            rules={[{ required: true, message: '请选择计算级别' }]}
            tooltip="L1: 估算级（基于基准值）| L2: 核算级（标准配方）| L3: 实测级（实测数据）"
          >
            <Select placeholder="请选择计算级别">
              <Select.Option value="L1">L1 估算级</Select.Option>
              <Select.Option value="L2">L2 核算级</Select.Option>
              <Select.Option value="L3">L3 实测级</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="基准值区域"
            name="baselineRegion"
            rules={[{ required: true, message: '请选择基准值区域' }]}
            tooltip="用于基准值查询和电力因子匹配，影响碳足迹计算的准确性"
          >
            <Select placeholder="请选择基准值区域">
              {baselineRegionOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="因子区域"
            name="factorRegion"
            rules={[{ required: true, message: '请选择因子区域' }]}
            tooltip="用于食材、材料、运输、燃气因子的匹配，影响碳足迹计算的准确性。中国的餐厅通常选择'中国 (CN)'。"
            initialValue="CN"
          >
            <Select placeholder="请选择因子区域">
              {factorRegionOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="烹饪时间（分钟）"
            name="cookingTime"
            tooltip="用于计算烹饪能耗的碳足迹，可选"
          >
            <InputNumber
              placeholder="请输入烹饪时间"
              min={0}
              max={999}
              style={{ width: '100%' }}
              addonAfter="分钟"
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .highlight-row {
          background-color: #e6f7ff !important;
          animation: highlightFade 2s ease-out;
        }
        @keyframes highlightFade {
          from { background-color: #fffbe6; }
          to { background-color: #e6f7ff; }
        }
        .ant-collapse-header {
          padding: 16px !important;
        }
        .ant-collapse-content-box {
          padding: 16px !important;
        }
      `}</style>
    </div>
  )
}

export default CarbonMenu
