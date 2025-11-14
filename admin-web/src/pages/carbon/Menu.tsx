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
  const { currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<MenuItem[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    // 当餐厅切换时，重新加载数据
    fetchMenuData()
  }, [currentRestaurantId])

  const fetchMenuData = async () => {
    // TODO: 调用API获取菜单数据
    // const result = await carbonFootprintAPI.calculateMenu({
    //   restaurantId: currentRestaurantId,
    // })
    // setDataSource(result)
    
    // 模拟数据 - 根据餐厅返回不同数据
    if (currentRestaurantId === 'restaurant_sukuaixin') {
      setDataSource([
        {
          id: '1',
          name: '素开心招牌面',
          carbonFootprint: 0.85,
          carbonLevel: 'low',
          carbonScore: 85,
          ingredients: '面条200g、青菜100g、豆腐50g',
          status: 'published',
        },
      ])
    } else if (currentRestaurantId === 'restaurant_suhuanle') {
      setDataSource([
        {
          id: '2',
          name: '素欢乐特色菜',
          carbonFootprint: 0.92,
          carbonLevel: 'low',
          carbonScore: 82,
          ingredients: '米饭150g、蔬菜200g、豆制品80g',
          status: 'published',
        },
      ])
    } else {
      setDataSource([])
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
      title: '碳评分',
      dataIndex: 'carbonScore',
      key: 'carbonScore',
      render: (score: number) => `${score}分`,
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
    message.info('碳足迹计算功能开发中')
    // TODO: 调用碳足迹计算API
  }

  const handleEdit = (record: MenuItem) => {
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这道菜品吗？',
      onOk: () => {
        setDataSource(dataSource.filter((item) => item.id !== id))
        message.success('删除成功')
      },
    })
  }

  const handleBatchImport = (file: File) => {
    message.info('批量导入功能开发中')
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
    })
  }

  return (
    <div>
      <Card
        title="菜单碳足迹管理"
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
        {!currentRestaurantId && restaurants.length > 1 && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
            <span style={{ color: '#666' }}>提示：请先选择要管理的餐厅</span>
          </div>
        )}
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="搜索菜品名称" style={{ width: 300 }} />
          <Select placeholder="筛选碳标签" style={{ width: 150 }} allowClear>
            <Select.Option value="ultra_low">超低碳</Select.Option>
            <Select.Option value="low">低碳</Select.Option>
            <Select.Option value="medium">中碳</Select.Option>
            <Select.Option value="high">高碳</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="菜品信息"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="菜品名称" rules={[{ required: true }]}>
            <Input placeholder="请输入菜品名称" />
          </Form.Item>
          <Form.Item name="ingredients" label="食材清单" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="请输入食材及份量，例如：菠菜200g、胡萝卜150g" />
          </Form.Item>
          <Form.Item name="cookingMethod" label="烹饪方式" rules={[{ required: true }]}>
            <Select placeholder="请选择烹饪方式">
              <Select.Option value="raw">生食/凉拌</Select.Option>
              <Select.Option value="steam">蒸</Select.Option>
              <Select.Option value="boil">煮/炖</Select.Option>
              <Select.Option value="fry">炒/煎</Select.Option>
              <Select.Option value="bake">烤/烘焙</Select.Option>
              <Select.Option value="deep_fry">炸</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="portion" label="份量(g)" rules={[{ required: true }]}>
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

