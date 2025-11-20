import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Category {
  _id?: string
  name: string
  code: string
  description?: string
  recipeCount?: number
}

const RecipeCategories: React.FC = () => {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form] = Form.useForm()

  // 初始化分类数据（使用翻译）
  useEffect(() => {
    setCategories([
      { _id: '1', name: t('pages.recipe.list.filters.category.hot'), code: 'hot', description: t('pages.recipe.list.filters.category.hot'), recipeCount: 0 },
      { _id: '2', name: t('pages.recipe.list.filters.category.cold'), code: 'cold', description: t('pages.recipe.list.filters.category.cold'), recipeCount: 0 },
      { _id: '3', name: t('pages.recipe.list.filters.category.soup'), code: 'soup', description: t('pages.recipe.list.filters.category.soup'), recipeCount: 0 },
      { _id: '4', name: t('pages.recipe.list.filters.category.staple'), code: 'staple', description: t('pages.recipe.list.filters.category.staple'), recipeCount: 0 },
      { _id: '5', name: t('pages.recipe.list.filters.category.dessert'), code: 'dessert', description: t('pages.recipe.list.filters.category.dessert'), recipeCount: 0 },
      { _id: '6', name: t('pages.recipe.list.filters.category.drink'), code: 'drink', description: t('pages.recipe.list.filters.category.drink'), recipeCount: 0 },
    ])
  }, [t])

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
    message.success(t('pages.recipe.categories.messages.deleteSuccess'))
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingCategory) {
        // 更新
        setCategories(categories.map(cat => 
          cat._id === editingCategory._id ? { ...cat, ...values } : cat
        ))
        message.success(t('pages.recipe.categories.messages.updateSuccess'))
      } else {
        // 新增
        const newCategory: Category = {
          ...values,
          _id: Date.now().toString(),
          recipeCount: 0,
        }
        setCategories([...categories, newCategory])
        message.success(t('pages.recipe.categories.messages.addSuccess'))
      }
      setModalVisible(false)
      form.resetFields()
    })
  }

  const columns = [
    {
      title: t('pages.recipe.categories.table.columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('pages.recipe.categories.table.columns.code'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag>{code}</Tag>,
    },
    {
      title: t('pages.recipe.categories.table.columns.description'),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: t('pages.recipe.categories.table.columns.recipeCount'),
      dataIndex: 'recipeCount',
      key: 'recipeCount',
      render: (count: number) => count || 0,
    },
    {
      title: t('pages.recipe.categories.table.columns.actions'),
      key: 'action',
      render: (_: any, record: Category) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('pages.recipe.categories.buttons.edit')}
          </Button>
          <Popconfirm
            title={t('pages.recipe.categories.messages.confirmDelete')}
            onConfirm={() => handleDelete(record._id!)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('pages.recipe.categories.buttons.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={t('pages.recipe.categories.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('pages.recipe.categories.buttons.add')}
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
        title={editingCategory ? t('pages.recipe.categories.modal.editTitle') : t('pages.recipe.categories.modal.addTitle')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t('pages.recipe.categories.modal.fields.name')}
            name="name"
            rules={[{ required: true, message: t('pages.recipe.categories.modal.messages.nameRequired') }]}
          >
            <Input placeholder={t('pages.recipe.categories.modal.placeholders.name')} />
          </Form.Item>
          <Form.Item
            label={t('pages.recipe.categories.modal.fields.code')}
            name="code"
            rules={[{ required: true, message: t('pages.recipe.categories.modal.messages.codeRequired') }]}
          >
            <Input placeholder={t('pages.recipe.categories.modal.placeholders.code')} />
          </Form.Item>
          <Form.Item label={t('pages.recipe.categories.modal.fields.description')} name="description">
            <Input.TextArea rows={3} placeholder={t('pages.recipe.categories.modal.placeholders.description')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RecipeCategories


