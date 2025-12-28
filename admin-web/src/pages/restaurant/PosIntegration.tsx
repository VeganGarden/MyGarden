/**
 * 收银系统集成配置页面
 */
import { posIntegrationAPI, type PosIntegration } from '@/services/posIntegration'
import { useAppSelector } from '@/store/hooks'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const PosIntegrationPage: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<PosIntegration[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PosIntegration | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    if (currentRestaurantId) {
      loadData()
    }
  }, [currentRestaurantId])

  const loadData = async () => {
    if (!currentRestaurantId) return

    setLoading(true)
    try {
      const integrations = await posIntegrationAPI.getIntegrations(
        currentRestaurantId
      )
      setDataSource(integrations)
    } catch (error: any) {
      message.error(error.message || '加载集成配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: PosIntegration) => {
    setEditingRecord(record)
    form.setFieldsValue({
      posSystem: record.posSystem,
      name: record.name,
      apiUrl: record.apiUrl,
      apiKey: record.apiKey,
      webhookUrl: record.webhookUrl,
      status: record.status,
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await posIntegrationAPI.deleteIntegration(id)
      message.success('删除成功')
      loadData()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const handleTestConnection = async (id: string) => {
    setTestingId(id)
    try {
      const result = await posIntegrationAPI.testConnection(id)
      if (result.success) {
        message.success(result.message || '连接成功')
      } else {
        message.error(result.message || '连接失败')
      }
    } catch (error: any) {
      message.error(error.message || '测试连接失败')
    } finally {
      setTestingId(null)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!currentRestaurantId) {
        message.error('请先选择餐厅')
        return
      }

      // 处理name字段：如果为空字符串，转换为undefined（不保存空字符串）
      const submitData = {
        ...values,
        name: values.name && values.name.trim() ? values.name.trim() : undefined,
      }

      if (editingRecord) {
        // 更新
        await posIntegrationAPI.updateIntegration(editingRecord._id, submitData)
        message.success('更新成功')
      } else {
        // 创建
        await posIntegrationAPI.createIntegration({
          restaurantId: currentRestaurantId,
          ...submitData,
        })
        message.success('创建成功')
      }

      setIsModalVisible(false)
      loadData()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    }
  }

  const handleCancel = () => {
    setIsModalVisible(false)
    setEditingRecord(null)
    form.resetFields()
  }

  const columns: ColumnsType<PosIntegration> = [
    {
      title: '接口名称',
      key: 'displayName',
      width: 200,
      render: (_: any, record: PosIntegration) => {
        // 优先显示自定义名称，如果没有则根据系统类型生成显示文本
        let displayName = record.name
        if (!displayName || !displayName.trim()) {
          if (record.posSystem === 'custom') {
            // 自定义系统：显示"自定义系统" + API地址的域名部分
            try {
              const url = new URL(record.apiUrl)
              const hostname = url.hostname.replace('www.', '')
              displayName = `自定义系统 - ${hostname}`
            } catch {
              displayName = `自定义系统 - ${record.apiUrl.substring(0, 30)}...`
            }
          } else {
            // 其他系统类型：显示系统类型名称
            const systemNames: Record<string, string> = {
              meituan: '美团收银',
              dianping: '大众点评',
              alipay: '支付宝收银',
              wechat: '微信收银',
            }
            displayName = systemNames[record.posSystem] || record.posSystem
          }
        }
        
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{displayName}</div>
            {record.name && record.name.trim() && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                {record.posSystem === 'custom' ? '自定义系统' : record.posSystem}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'API地址',
      dataIndex: 'apiUrl',
      key: 'apiUrl',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        return status === 'active' ? (
          <Tag color="success">已启用</Tag>
        ) : (
          <Tag color="default">已禁用</Tag>
        )
      },
    },
    {
      title: '最后同步',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      width: 180,
      render: (text: string) => {
        return text ? new Date(text).toLocaleString('zh-CN') : '-'
      },
    },
    {
      title: '同步统计',
      key: 'syncStats',
      width: 200,
      render: (_: any, record: PosIntegration) => {
        const stats = record.syncStats || {}
        return (
          <span>
            总计: {stats.totalSyncs || 0} | 成功: {stats.successSyncs || 0} |
            失败: {stats.failedSyncs || 0}
          </span>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_: any, record: PosIntegration) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            loading={testingId === record._id}
            onClick={() => handleTestConnection(record._id)}
          >
            测试连接
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个集成配置吗？"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (!currentRestaurantId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <SettingOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <p style={{ marginTop: 16, color: '#999' }}>
            请先选择餐厅
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>收银系统集成配置</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加集成配置
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          rowKey="_id"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑集成配置' : '添加集成配置'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="posSystem"
            label="收银系统类型"
            rules={[{ required: true, message: '请选择收银系统类型' }]}
          >
            <Select placeholder="请选择收银系统类型">
              <Select.Option value="custom">自定义系统</Select.Option>
              <Select.Option value="meituan">美团收银</Select.Option>
              <Select.Option value="dianping">大众点评</Select.Option>
              <Select.Option value="alipay">支付宝收银</Select.Option>
              <Select.Option value="wechat">微信收银</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="接口名称"
            tooltip="用于区分多个相同类型的接口，例如：美团收银-门店A、美团收银-门店B"
            rules={[
              { max: 50, message: '接口名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入接口名称（可选，用于区分多个相同类型的接口）" />
          </Form.Item>

          <Form.Item
            name="apiUrl"
            label="API地址"
            rules={[
              { required: true, message: '请输入API地址' },
              { type: 'url', message: '请输入有效的URL地址' },
            ]}
          >
            <Input placeholder="https://api.example.com/v1" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API密钥"
            rules={[{ required: true, message: '请输入API密钥' }]}
          >
            <Input.Password placeholder="请输入API密钥" />
          </Form.Item>

          <Form.Item
            name="secretKey"
            label="签名密钥"
            rules={[{ required: !editingRecord, message: '请输入签名密钥' }]}
            help={editingRecord ? '留空则不更新签名密钥' : undefined}
          >
            <Input.Password placeholder="请输入签名密钥" />
          </Form.Item>

          <Form.Item name="webhookUrl" label="Webhook回调地址">
            <Input placeholder="https://api.example.com/webhook" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            getValueFromEvent={(checked) => (checked ? 'active' : 'inactive')}
            getValueProps={(value) => ({ checked: value === 'active' })}
            initialValue="active"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PosIntegrationPage

