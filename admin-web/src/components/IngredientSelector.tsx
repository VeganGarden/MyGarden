import React, { useState, useEffect } from 'react'
import { Modal, Input, Table, Space, Button, message, Card, Tag, Select, Row, Col, Divider } from 'antd'
import { SearchOutlined, CheckOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { fetchIngredients } from '@/store/slices/ingredientSlice'
import { Ingredient } from '@/types'

interface IngredientSelectorProps {
  visible: boolean
  onCancel: () => void
  onSelect: (ingredient: Ingredient) => void
  excludeIds?: string[] // 已选择的食材ID，用于排除
}

const IngredientSelector: React.FC<IngredientSelectorProps> = ({
  visible,
  onCancel,
  onSelect,
  excludeIds = [],
}) => {
  const dispatch = useAppDispatch()
  const { ingredients, loading } = useAppSelector((state) => state.ingredient)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  
  // 获取所有分类选项
  const categories = Array.from(new Set(ingredients.map(ing => ing.category).filter(Boolean)))
  const categoryOptions = [
    { label: '全部分类', value: 'all' },
    ...categories.map(cat => ({ label: cat, value: cat }))
  ]
  
  // 获取分类显示文本
  const getCategoryText = (category?: string) => {
    const categoryMap: Record<string, string> = {
      vegetables: '蔬菜',
      fruits: '水果',
      grains: '谷物',
      beans: '豆类',
      nuts: '坚果',
      mushrooms: '菌菇',
      seasonings: '调料',
      oils: '油脂',
      others: '其他',
    }
    return categoryMap[category || ''] || category || '其他'
  }
  
  // 获取分类颜色
  const getCategoryColor = (category?: string) => {
    const colorMap: Record<string, string> = {
      vegetables: 'green',
      fruits: 'orange',
      grains: 'gold',
      beans: 'cyan',
      nuts: 'purple',
      mushrooms: 'volcano',
      seasonings: 'magenta',
      oils: 'lime',
      others: 'default',
    }
    return colorMap[category || ''] || 'default'
  }

  useEffect(() => {
    if (visible) {
      dispatch(fetchIngredients({ page: 1, pageSize: 1000 }))
    }
  }, [visible, dispatch])

  // 过滤食材
  const filteredIngredients = ingredients.filter((ing) => {
    // 排除已选择的食材
    if (excludeIds.includes(ing._id)) {
      return false
    }
    // 分类过滤
    if (categoryFilter !== 'all' && ing.category !== categoryFilter) {
      return false
    }
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      return (
        ing.name.toLowerCase().includes(keyword) ||
        ing.nameEn?.toLowerCase().includes(keyword) ||
        ing.category?.toLowerCase().includes(keyword)
      )
    }
    return true
  })

  const handleSelect = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient)
  }

  const handleConfirm = () => {
    if (selectedIngredient) {
      onSelect(selectedIngredient)
      setSelectedIngredient(null)
      setSearchKeyword('')
      setCategoryFilter('all')
      onCancel()
    } else {
      message.warning('请先选择一个食材')
    }
  }
  
  const handleCancel = () => {
    setSelectedIngredient(null)
    setSearchKeyword('')
    setCategoryFilter('all')
    onCancel()
  }

  const columns = [
    {
      title: '食材名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: Ingredient) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{name}</div>
          {record.nameEn && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.nameEn}</div>
          )}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryText(category)}
        </Tag>
      ),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center' as const,
      render: (unit: string) => (
        <span style={{ color: '#666' }}>{unit || 'g'}</span>
      ),
    },
    {
      title: '碳系数',
      dataIndex: 'carbonCoefficient',
      key: 'carbonCoefficient',
      width: 140,
      align: 'right' as const,
      render: (coeff: number) => {
        if (coeff === undefined || coeff === null) {
          return <span style={{ color: '#999' }}>-</span>
        }
        return (
          <div>
            <div style={{ fontWeight: 500, color: '#52c41a' }}>
              {coeff.toFixed(2)}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>kg CO₂e/kg</div>
          </div>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: Ingredient) => (
        <Button
          type={selectedIngredient?._id === record._id ? 'primary' : 'default'}
          size="small"
          icon={selectedIngredient?._id === record._id ? <CheckOutlined /> : null}
          onClick={() => handleSelect(record)}
          style={{
            minWidth: 80,
          }}
        >
          {selectedIngredient?._id === record._id ? '已选择' : '选择'}
        </Button>
      ),
    },
  ]

  return (
    <Modal
      title={
        <div style={{ fontSize: 18, fontWeight: 500 }}>
          选择食材
          <span style={{ fontSize: 14, fontWeight: 400, color: '#666', marginLeft: 8 }}>
            （为菜谱添加食材）
          </span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleConfirm}
      width={1000}
      okText="确认选择"
      cancelText="取消"
      centered={true}
      style={{ marginLeft: 200 }}
      destroyOnClose={true}
      maskClosable={false}
    >
      {/* 搜索和筛选区域 */}
      <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Input
              placeholder="搜索食材名称、英文名或分类..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              allowClear
              size="large"
              style={{
                borderRadius: 6,
              }}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="全部分类"
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
              size="large"
              allowClear
            >
              {categoryOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Button
              onClick={() => {
                setSearchKeyword('')
                setCategoryFilter('all')
              }}
              style={{ width: '100%' }}
            >
              重置
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 统计信息 */}
      <div style={{ marginBottom: 12, fontSize: 13, color: '#666' }}>
        {selectedIngredient ? (
          <Space>
            <CheckOutlined style={{ color: '#52c41a' }} />
            <span>已选择：<strong style={{ color: '#1890ff' }}>{selectedIngredient.name}</strong></span>
          </Space>
        ) : (
          <span>请从下方列表中选择一个食材</span>
        )}
      </div>

      {/* 食材列表表格 */}
      <Table
        columns={columns}
        dataSource={filteredIngredients}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50'],
          showTotal: (total) => `共 ${total} 个食材`,
          style: { marginTop: 16 },
        }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedIngredient ? [selectedIngredient._id] : [],
          onSelect: (record) => handleSelect(record),
          columnWidth: 50,
        }}
        size="middle"
        style={{
          backgroundColor: '#fff',
        }}
        rowClassName={(record) => 
          selectedIngredient?._id === record._id ? 'ingredient-row-selected' : ''
        }
      />

      <style>{`
        .ingredient-row-selected {
          background-color: #e6f7ff !important;
        }
        .ingredient-row-selected:hover {
          background-color: #bae7ff !important;
        }
      `}</style>
    </Modal>
  )
}

export default IngredientSelector

