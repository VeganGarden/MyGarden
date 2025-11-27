import { carbonFootprintAPI } from '@/services/cloudbase'
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
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    // 当餐厅切换时，重新加载数据
    fetchMenuData()
  }, [currentRestaurantId])

  const fetchMenuData = async () => {
    try {
      console.log('🔍 菜单碳足迹 - currentRestaurantId:', currentRestaurantId)
      if (!currentRestaurantId) {
        console.log('⚠️ 菜单碳足迹 - currentRestaurantId 为空')
        setDataSource([])
        setLoading(false)
        return
      }
      
      setLoading(true)
      const params = {
        restaurantId: currentRestaurantId,
      }
      console.log('📤 菜单碳足迹 - 请求参数:', params)
      
      const result = await carbonFootprintAPI.getMenuList(params)
      console.log('📥 菜单碳足迹 - API 返回结果:', result)
      
      if (result && result.code === 0 && result.data) {
        // API 返回格式: { menus: [], menuItems: [], total: number }
        const menus = result.data.menus || result.data.menuItems || (Array.isArray(result.data) ? result.data : [])
        setDataSource(menus.map((menu: any) => ({
          id: menu.id || menu._id || '',
          name: menu.name || menu.dishName || '',
          carbonFootprint: menu.carbonFootprint || menu.carbon_footprint || 0,
          carbonLevel: menu.carbonLevel || menu.carbon_level || 'medium',
          carbonScore: menu.carbonScore || menu.carbon_score || 0,
          ingredients: Array.isArray(menu.ingredients) 
            ? menu.ingredients.map((ing: any) => typeof ing === 'string' ? ing : ing.name || ing.ingredientName || '').join(', ')
            : (menu.ingredients || menu.ingredient_list || ''),
          status: menu.status || 'draft',
        })))
      } else {
        setDataSource([])
        if (result && result.message) {
          message.warning(result.message)
        }
      }
    } catch (error: any) {
      console.error('获取菜单数据失败:', error)
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
      title: '碳足迹',
      dataIndex: 'carbonFootprint',
      key: 'carbonFootprint',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
    {
      title: '碳标签',
      dataIndex: 'carbonLevel',
      key: 'carbonLevel',
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
      render: (score: number) => `${score} 分`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'success' : 'default'}>
          {status === 'published' ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<CalculatorOutlined />}
            onClick={() => handleCalculate(record.id)}
          >
            重新计算
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const handleCalculate = (id: string) => {
    message.info('正在重新计算碳足迹...')
    // TODO: 调用碳足迹计算API
  }

  const handleEdit = (record: MenuItem) => {
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个菜品吗？',
      onOk: () => {
        setDataSource(dataSource.filter((item) => item.id !== id))
        message.success('删除成功')
      },
    })
  }

  const handleBatchImport = (file: File) => {
    message.info('正在导入...')
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
      message.success('保存成功')
      setIsModalVisible(false)
      fetchMenuData() // 刷新列表
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
          <Space>
            <Upload accept=".xlsx,.xls,.csv" beforeUpload={handleBatchImport} showUploadList={false}>
              <Button icon={<UploadOutlined />}>批量导入</Button>
            </Upload>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加菜品
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="搜索菜品名称" style={{ width: 300 }} />
          <Select placeholder="碳标签" style={{ width: 150 }} allowClear>
            <Select.Option value="ultra_low">超低碳</Select.Option>
            <Select.Option value="low">低碳</Select.Option>
            <Select.Option value="medium">中碳</Select.Option>
            <Select.Option value="high">高碳</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns.map(col => ({
            ...col,
            title: typeof col.title === 'function' ? col.title : (col.title || ''),
          }))}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
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

      <Modal
        title="编辑菜品"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="菜品名称" rules={[{ required: true }]}>
            <Input placeholder="请输入菜品名称" />
          </Form.Item>
          <Form.Item name="ingredients" label="食材" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="请输入食材列表" />
          </Form.Item>
          <Form.Item name="cookingMethod" label="烹饪方式" rules={[{ required: true }]}>
            <Select placeholder="请选择烹饪方式">
              <Select.Option value="raw">生食</Select.Option>
              <Select.Option value="steam">蒸</Select.Option>
              <Select.Option value="boil">煮</Select.Option>
              <Select.Option value="fry">炒</Select.Option>
              <Select.Option value="bake">烤</Select.Option>
              <Select.Option value="deep_fry">炸</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="portion" label="份量（克）" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入份量" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<CalculatorOutlined />} onClick={() => handleCalculate('')}>
              计算碳足迹
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CarbonMenu

