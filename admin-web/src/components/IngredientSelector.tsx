import React, { useState, useEffect } from 'react'
import { Modal, Input, Table, Space, Button, message } from 'antd'
import { SearchOutlined, CheckOutlined } from '@ant-design/icons'
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
      onCancel()
    } else {
      message.warning('请先选择一个食材')
    }
  }

  const columns = [
    {
      title: '食材名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record: Ingredient) => (
        <Space>
          <span>{name}</span>
          {record.nameEn && (
            <span style={{ color: '#999', fontSize: 12 }}>({record.nameEn})</span>
          )}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (unit: string) => unit || 'g',
    },
    {
      title: '碳系数',
      dataIndex: 'carbonCoefficient',
      key: 'carbonCoefficient',
      width: 100,
      render: (coeff: number) =>
        coeff !== undefined ? `${coeff.toFixed(2)} kg CO₂e/kg` : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: Ingredient) => (
        <Button
          type={selectedIngredient?._id === record._id ? 'primary' : 'default'}
          size="small"
          icon={selectedIngredient?._id === record._id ? <CheckOutlined /> : null}
          onClick={() => handleSelect(record)}
        >
          {selectedIngredient?._id === record._id ? '已选择' : '选择'}
        </Button>
      ),
    },
  ]

  return (
    <Modal
      title="选择食材"
      open={visible}
      onCancel={onCancel}
      onOk={handleConfirm}
      width={800}
      okText="确认选择"
      cancelText="取消"
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索食材名称、英文名或分类..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          prefix={<SearchOutlined />}
          allowClear
        />
      </div>
      <Table
        columns={columns}
        dataSource={filteredIngredients}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 个食材`,
        }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedIngredient ? [selectedIngredient._id] : [],
          onSelect: (record) => handleSelect(record),
        }}
        size="small"
      />
    </Modal>
  )
}

export default IngredientSelector

