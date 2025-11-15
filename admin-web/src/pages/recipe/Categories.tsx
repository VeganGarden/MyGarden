import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, message, Tag, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

interface Category {
  _id?: string
  name: string
  code: string
  description?: string
  recipeCount?: number
}

const RecipeCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([
    { _id: '1', name: '热菜', code: 'hot', description: '热菜类', recipeCount: 0 },
    { _id: '2', name: '凉菜', code: 'cold', description: '凉菜类', recipeCount: 0 },
    { _id: '3', name: '汤品', code: 'soup', description: '汤品类', recipeCount: 0 },
    { _id: '4', name: '主食', code: 'staple', description: '主食类', recipeCount: 0 },
    { _id: '5', name: '甜品', code: 'dessert', description: '甜品类', recipeCount: 0 },
    { _id: '6', name: '饮品', code: 'drink', description: '饮品类', recipeCount: 0 },
  ])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingCategory(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    form.setFieldsValue(category)
    setModalVisible(true)
  }

  const handleDelete = (categoryId: string) => {
    setCategories(categories.filter(cat => cat._id !== categoryId))
    message.success('删除成功')
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingCategory) {
        // 更新
        setCategories(categories.map(cat => 
          cat._id === editingCategory._id ? { ...cat, ...values } : cat
        ))
        message.success('更新成功')
      } else {
        // 新增
        const newCategory: Category = {
          ...values,
          _id: Date.now().toString(),
          recipeCount: 0,
        }
        setCategories([...categories, newCategory])
        message.success('添加成功')
      }
      setModalVisible(false)
      form.resetFields()
    })
  }

  const columns = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '分类代码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag>{code}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '菜谱数量',
      dataIndex: 'recipeCount',
      key: 'recipeCount',
      render: (count: number) => count || 0,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Category) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
            onConfirm={() => handleDelete(record._id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="菜谱分类管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加分类
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="_id"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item
            label="分类代码"
            name="code"
            rules={[{ required: true, message: '请输入分类代码' }]}
          >
            <Input placeholder="请输入分类代码（英文）" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入分类描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RecipeCategories


