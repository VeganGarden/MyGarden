import { carbonFootprintAPI, tenantAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import type { MenuItem } from '@/types/menuItem'
import { transformMenuItemList, transformMenuItemData, getCarbonFootprintValue, formatCarbonFootprintValue } from '@/utils/menuItemTransform'
import {
  CalculatorOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { App, Button, Card, Form, InputNumber, Modal, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

// MenuItem类型已从@/types/menuItem导入

const CarbonMenu: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  
  // 编辑菜单项相关状态
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [updating, setUpdating] = useState(false)
  const [editForm] = Form.useForm()

  useEffect(() => {
    // 当餐厅切换时，重新加载数据
    fetchMenuData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRestaurantId])

  // 检查URL参数，如果有highlightId则高亮显示
  useEffect(() => {
    const id = searchParams.get('highlightId')
    if (id) {
      setHighlightId(id)
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

  const columns: ColumnsType<MenuItem> = [
    {
      title: '菜品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '碳足迹值 (kg CO₂e)',
      key: 'carbonFootprintValue',
      width: 120,
      render: (_: any, record: MenuItem) => {
        const value = getCarbonFootprintValue(record.carbonFootprint)
        return formatCarbonFootprintValue(value, 'kg CO₂e', false)
      },
    },
    {
      title: '基准值 (kg CO₂e)',
      key: 'baseline',
      width: 120,
      render: (_: any, record: MenuItem) => {
        const cf = record.carbonFootprint
        if (!cf || typeof cf !== 'object' || cf.baseline === undefined) {
          return '-'
        }
        return formatCarbonFootprintValue(cf.baseline, 'kg CO₂e', false)
      },
    },
    {
      title: '减排值 (kg CO₂e)',
      key: 'reduction',
      width: 120,
      render: (_: any, record: MenuItem) => {
        const cf = record.carbonFootprint
        if (!cf || typeof cf !== 'object' || cf.reduction === undefined) {
          return '-'
        }
        const reduction = Number(cf.reduction)
        const color = reduction >= 0 ? '#52c41a' : '#ff4d4f'
        return <span style={{ color }}>{reduction >= 0 ? '+' : ''}{formatCarbonFootprintValue(reduction, 'kg CO₂e', false)}</span>
      },
    },
    {
      title: '计算级别',
      dataIndex: 'calculationLevel',
      key: 'calculationLevel',
      width: 100,
      render: (level: string) => {
        if (!level) return '-'
        const config: Record<string, { color: string; text: string }> = {
          L1: { color: 'blue', text: 'L1估算级' },
          L2: { color: 'green', text: 'L2核算级' },
          L3: { color: 'purple', text: 'L3实测级' },
        }
        const cfg = config[level] || { color: 'default', text: level }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '碳标签',
      dataIndex: 'carbonLabel',
      key: 'carbonLabel',
      render: (level: string) => {
        const config: Record<string, { color: string; text: string }> = {
          ultra_low: { color: 'green', text: '超低碳' },
          low: { color: 'lime', text: '低碳' },
          medium: { color: 'orange', text: '中碳' },
          high: { color: 'red', text: '高碳' },
        }
        const cfg = config[level] || config.medium
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '碳积分',
      dataIndex: 'carbonScore',
      key: 'carbonScore',
      render: (score: number | string | null | undefined) => {
        if (score === null || score === undefined || score === '') {
          return '-'
        }
        const numScore = typeof score === 'string' ? parseFloat(score) : Number(score)
        if (isNaN(numScore)) {
          return '-'
        }
        return `${numScore} 分`
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: '已上架' },
          inactive: { color: 'default', text: '已下架' },
          published: { color: 'success', text: '已发布' },
          draft: { color: 'default', text: '草稿' },
        }
        const cfg = statusMap[status] || { color: 'default', text: status || '未知' }
        return <Tag color={cfg.color as any}>{cfg.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<CalculatorOutlined />}
            onClick={() => handleCalculate(record.id || record._id || '')}
          >
            重新计算
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditMenuItem(record)}
          >
            碳足迹计算配置
          </Button>
        </Space>
      ),
    },
  ]

  const handleCalculate = async (id: string) => {
    if (!currentRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }

    try {
      message.loading({ content: '正在重新计算碳足迹...', key: 'calculate', duration: 0 })
      
      const result = await carbonFootprintAPI.recalculateMenuItems({
        restaurantId: currentRestaurantId,
        menuItemIds: [id],
      })

      if (result && result.code === 0) {
        message.success({ content: '重新计算成功', key: 'calculate' })
        // 刷新列表
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
      region: menuItem.restaurantRegion || 'national_average',
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
        restaurantRegion: values.region,
      }
      
      // cookingTime 是可选的，只有填写了才更新
      if (values.cookingTime !== undefined && values.cookingTime !== null && values.cookingTime !== '') {
        updateData.cookingTime = Number(values.cookingTime)
      }

      const result = await tenantAPI.updateMenuItem({
        menuItemId: editingMenuItem._id || editingMenuItem.id,
        restaurantId: currentRestaurantId,
        updateData,
      })

      const actualResult = result?.result || result
      
      if (actualResult && actualResult.code === 0) {
        message.success('更新成功')
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

  // 获取分类显示文本
  const getCategoryText = (category?: string) => {
    const categoryMap: Record<string, string> = {
      hot: '热菜',
      cold: '凉菜',
      soup: '汤品',
      staple: '主食',
      dessert: '甜品',
      drink: '饮品',
    }
    return categoryMap[category || ''] || category || '-'
  }

  // 获取烹饪方式显示文本
  const getCookingMethodText = (method?: string) => {
    const methodMap: Record<string, string> = {
      raw: '生食',
      steamed: '蒸',
      boiled: '煮',
      stir_fried: '炒',
      fried: '炸',
      baked: '烤',
    }
    return methodMap[method || ''] || method || '-'
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
        title="菜单碳足迹"
        extra={
          <Button
            icon={<CalculatorOutlined />}
            onClick={handleBatchRecalculate}
          >
            批量重新计算
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select placeholder="按碳标签筛选" style={{ width: 150 }} allowClear>
            <Select.Option value="ultra_low">超低碳</Select.Option>
            <Select.Option value="low">低碳</Select.Option>
            <Select.Option value="medium">中碳</Select.Option>
            <Select.Option value="high">高碳</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey={(record) => record.id || record._id || ''}
          loading={loading}
          rowClassName={(record) => {
            const id = record.id || record._id || ''
            return highlightId === id ? 'highlight-row' : ''
          }}
          locale={{
            emptyText: dataSource.length === 0 && !loading ? '暂无菜单数据' : undefined
          }}
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
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
            region: 'national_average',
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
            label="适用区域"
            name="region"
            rules={[{ required: true, message: '请选择适用区域' }]}
            tooltip="用于匹配碳排放因子和基准值，影响碳足迹计算的准确性"
          >
            <Select placeholder="请选择适用区域">
              <Select.Option value="north_china">华北区域</Select.Option>
              <Select.Option value="northeast">东北区域</Select.Option>
              <Select.Option value="east_china">华东区域</Select.Option>
              <Select.Option value="central_china">华中区域</Select.Option>
              <Select.Option value="south_china">华南区域</Select.Option>
              <Select.Option value="northwest">西北区域</Select.Option>
              <Select.Option value="southwest">西南区域</Select.Option>
              <Select.Option value="national_average">全国平均</Select.Option>
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
      `}</style>
    </div>
  )
}

export default CarbonMenu

