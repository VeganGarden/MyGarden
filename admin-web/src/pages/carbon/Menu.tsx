import { useAppSelector } from '@/store/hooks'
import {
  CalculatorOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MenuItem {
  id: string
  name: string
  carbonFootprint: number
  carbonLevel: 'ultra_low' | 'low' | 'medium' | 'high'
  carbonScore: number
  ingredients: string
  status: 'draft' | 'published'
}

const CarbonMenu: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<MenuItem[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    // 当餐厅切换时，重新加载数据
    fetchMenuData()
  }, [currentRestaurantId])

  const fetchMenuData = async () => {
    try {
      if (!currentRestaurantId) {
        setDataSource([])
        return
      }
      
      const result = await carbonFootprintAPI.getMenuList({
        restaurantId: currentRestaurantId,
      })
      
      if (result && result.code === 0 && result.data) {
        const menus = Array.isArray(result.data) ? result.data : []
        setDataSource(menus.map((menu: any) => ({
          id: menu.id || menu._id || '',
          name: menu.name || menu.dishName || '',
          carbonFootprint: menu.carbonFootprint || menu.carbon_footprint || 0,
          carbonLevel: menu.carbonLevel || menu.carbon_level || 'medium',
          carbonScore: menu.carbonScore || menu.carbon_score || 0,
          ingredients: menu.ingredients || menu.ingredient_list || '',
          status: menu.status || 'draft',
        })))
      } else {
        setDataSource([])
      }
    } catch (error: any) {
      console.error('获取菜单数据失败:', error)
      message.error(error.message || '获取菜单数据失败，请稍后重试')
      setDataSource([])
    }
  }

  const columns: ColumnsType<MenuItem> = [
    {
      title: t('pages.carbon.menu.table.columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('pages.carbon.menu.table.columns.carbonFootprint'),
      dataIndex: 'carbonFootprint',
      key: 'carbonFootprint',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
    {
      title: t('pages.carbon.menu.table.columns.carbonLabel'),
      dataIndex: 'carbonLevel',
      key: 'carbonLevel',
      render: (level: string) => {
        const config: Record<string, { color: string; text: string }> = {
          ultra_low: { color: 'green', text: t('pages.recipe.list.filters.carbonLabel.ultraLow') },
          low: { color: 'lime', text: t('pages.recipe.list.filters.carbonLabel.low') },
          medium: { color: 'orange', text: t('pages.recipe.list.filters.carbonLabel.medium') },
          high: { color: 'red', text: t('pages.recipe.list.filters.carbonLabel.high') },
        }
        const cfg = config[level] || config.medium
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: t('pages.carbon.menu.table.columns.carbonScore'),
      dataIndex: 'carbonScore',
      key: 'carbonScore',
      render: (score: number) => `${score}${t('common.minute') === '分钟' ? '分' : 'pts'}`,
    },
    {
      title: t('pages.carbon.menu.table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'success' : 'default'}>
          {status === 'published' ? t('pages.recipe.list.status.published') : t('pages.recipe.list.status.draft')}
        </Tag>
      ),
    },
    {
      title: t('pages.carbon.menu.table.columns.actions'),
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<CalculatorOutlined />}
            onClick={() => handleCalculate(record.id)}
          >
            {t('pages.carbon.menu.buttons.recalculate')}
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('pages.carbon.menu.buttons.edit')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            {t('pages.carbon.menu.buttons.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  const handleCalculate = (id: string) => {
    message.info(t('pages.carbon.menu.messages.calculateInProgress'))
    // TODO: 调用碳足迹计算API
  }

  const handleEdit = (record: MenuItem) => {
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('pages.carbon.menu.messages.deleteConfirm'),
      content: t('pages.carbon.menu.messages.deleteMessage'),
      onOk: () => {
        setDataSource(dataSource.filter((item) => item.id !== id))
        message.success(t('pages.carbon.menu.messages.deleteSuccess'))
      },
    })
  }

  const handleBatchImport = (file: File) => {
    message.info(t('pages.carbon.menu.messages.importInProgress'))
    // TODO: 实现Excel批量导入
    return false
  }

  const handleAdd = () => {
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      console.log('提交数据:', values)
      message.success(t('pages.carbon.menu.messages.saveSuccess'))
      setIsModalVisible(false)
    })
  }

  return (
    <div>
      <Card
        title={t('pages.carbon.menu.title')}
        extra={
          <Space>
            <Upload accept=".xlsx,.xls,.csv" beforeUpload={handleBatchImport} showUploadList={false}>
              <Button icon={<UploadOutlined />}>{t('pages.carbon.menu.buttons.batchImport')}</Button>
            </Upload>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('pages.carbon.menu.buttons.addDish')}
            </Button>
          </Space>
        }
      >
        {!currentRestaurantId && restaurants.length > 1 && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
            <span style={{ color: '#666' }}>{t('pages.carbon.menu.messages.selectRestaurant')}</span>
          </div>
        )}
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder={t('pages.carbon.menu.filters.search')} style={{ width: 300 }} />
          <Select placeholder={t('pages.carbon.menu.filters.carbonLabel')} style={{ width: 150 }} allowClear>
            <Select.Option value="ultra_low">{t('pages.recipe.list.filters.carbonLabel.ultraLow')}</Select.Option>
            <Select.Option value="low">{t('pages.recipe.list.filters.carbonLabel.low')}</Select.Option>
            <Select.Option value="medium">{t('pages.recipe.list.filters.carbonLabel.medium')}</Select.Option>
            <Select.Option value="high">{t('pages.recipe.list.filters.carbonLabel.high')}</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => t('pages.carbon.menu.pagination.total', { total }),
          }}
        />
      </Card>

      <Modal
        title={t('pages.carbon.menu.modal.title')}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('pages.carbon.menu.modal.fields.name')} rules={[{ required: true }]}>
            <Input placeholder={t('pages.carbon.menu.modal.placeholders.name')} />
          </Form.Item>
          <Form.Item name="ingredients" label={t('pages.carbon.menu.modal.fields.ingredients')} rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder={t('pages.carbon.menu.modal.placeholders.ingredients')} />
          </Form.Item>
          <Form.Item name="cookingMethod" label={t('pages.carbon.menu.modal.fields.cookingMethod')} rules={[{ required: true }]}>
            <Select placeholder={t('pages.carbon.menu.modal.placeholders.cookingMethod')}>
              <Select.Option value="raw">{t('pages.carbon.menu.modal.cookingMethods.raw')}</Select.Option>
              <Select.Option value="steam">{t('pages.carbon.menu.modal.cookingMethods.steam')}</Select.Option>
              <Select.Option value="boil">{t('pages.carbon.menu.modal.cookingMethods.boil')}</Select.Option>
              <Select.Option value="fry">{t('pages.carbon.menu.modal.cookingMethods.fry')}</Select.Option>
              <Select.Option value="bake">{t('pages.carbon.menu.modal.cookingMethods.bake')}</Select.Option>
              <Select.Option value="deep_fry">{t('pages.carbon.menu.modal.cookingMethods.deepFry')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="portion" label={t('pages.carbon.menu.modal.fields.portion')} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder={t('pages.carbon.menu.modal.placeholders.portion')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<CalculatorOutlined />} onClick={() => handleCalculate('')}>
              {t('pages.carbon.menu.buttons.calculate')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CarbonMenu

