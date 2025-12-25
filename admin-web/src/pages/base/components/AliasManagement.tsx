/**
 * 别名管理组件
 */
import { ingredientStandardAPI } from '@/services/ingredientStandard'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'

interface Alias {
  _id?: string
  alias: string
  standardName: string
  confidence?: number
  source?: 'manual' | 'auto' | 'import'
  status: 'active' | 'deprecated'
  createdAt?: string
  updatedAt?: string
}

interface AliasManagementProps {
  standardName: string
}

const AliasManagement: React.FC<AliasManagementProps> = ({ standardName }) => {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<Alias[]>([])
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [batchAddModalVisible, setBatchAddModalVisible] = useState(false)
  const [batchAddForm] = Form.useForm()

  // 加载别名列表
  const loadAliases = async () => {
    if (!standardName) return
    
    setLoading(true)
    try {
      const result = await ingredientStandardAPI.alias.list(standardName)
      if (result && result.code === 0 && result.data) {
        const data = result.data.data || result.data.list || result.data || []
        setDataSource(Array.isArray(data) ? data : [])
      } else {
        setDataSource([])
      }
    } catch (error: any) {
      console.error('获取别名列表失败:', error)
      message.error(error.message || '获取别名列表失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAliases()
  }, [standardName])

  // 添加别名
  const handleAdd = async () => {
    try {
      const values = await form.validateFields()
      const result = await ingredientStandardAPI.alias.add({
        standardName,
        alias: values.alias,
        confidence: values.confidence || 1.0,
        source: 'manual',
      })

      if (result && result.code === 0) {
        message.success('添加别名成功')
        setAddModalVisible(false)
        form.resetFields()
        loadAliases()
      } else {
        message.error(result?.message || '添加别名失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || '添加别名失败')
    }
  }

  // 批量添加别名
  const handleBatchAdd = async () => {
    try {
      const values = await batchAddForm.validateFields()
      const aliases = values.aliases
        .split('\n')
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0)

      if (aliases.length === 0) {
        message.warning('请输入至少一个别名')
        return
      }

      const result = await ingredientStandardAPI.alias.batchAdd(standardName, aliases)

      if (result && result.code === 0) {
        message.success(`成功添加 ${aliases.length} 个别名`)
        setBatchAddModalVisible(false)
        batchAddForm.resetFields()
        loadAliases()
      } else {
        message.error(result?.message || '批量添加别名失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error(error.message || '批量添加别名失败')
    }
  }

  // 删除别名
  const handleDelete = async (alias: string) => {
    try {
      const result = await ingredientStandardAPI.alias.remove(standardName, alias)
      if (result && result.code === 0) {
        message.success('删除别名成功')
        loadAliases()
      } else {
        message.error(result?.message || '删除别名失败')
      }
    } catch (error: any) {
      message.error(error.message || '删除别名失败')
    }
  }

  const getSourceTag = (source?: string) => {
    const config: Record<string, { color: string; text: string }> = {
      manual: { color: 'blue', text: '手动' },
      auto: { color: 'green', text: '自动' },
      import: { color: 'orange', text: '导入' },
    }
    const cfg = config[source || 'manual'] || config.manual
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      active: { color: 'success', text: '活跃' },
      deprecated: { color: 'default', text: '已废弃' },
    }
    const cfg = config[status] || config.active
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  const columns: ColumnsType<Alias> = [
    {
      title: '别名',
      dataIndex: 'alias',
      key: 'alias',
      width: 200,
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (value: number) => value ? (value * 100).toFixed(0) + '%' : '-',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => getSourceTag(source),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="确定要删除此别名吗？"
          onConfirm={() => handleDelete(record.alias)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <strong>标准名称：{standardName}</strong>
          <div style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}>
            管理该标准名称的所有别名。别名用于在导入和查询时匹配到标准名称。
          </div>
        </div>
        <Space>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setBatchAddModalVisible(true)}
          >
            批量添加
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalVisible(true)}
          >
            添加别名
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="alias"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 添加别名对话框 */}
      <Modal
        title="添加别名"
        open={addModalVisible}
        onOk={handleAdd}
        onCancel={() => {
          setAddModalVisible(false)
          form.resetFields()
        }}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="alias"
            label="别名"
            rules={[
              { required: true, message: '请输入别名' },
              { max: 100, message: '别名不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入别名" />
          </Form.Item>
          <Form.Item
            name="confidence"
            label="置信度（0-1）"
            rules={[
              { type: 'number', min: 0, max: 1, message: '置信度必须在0-1之间' },
            ]}
          >
            <Input
              type="number"
              placeholder="1.0"
              step={0.1}
              min={0}
              max={1}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量添加别名对话框 */}
      <Modal
        title="批量添加别名"
        open={batchAddModalVisible}
        onOk={handleBatchAdd}
        onCancel={() => {
          setBatchAddModalVisible(false)
          batchAddForm.resetFields()
        }}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={batchAddForm} layout="vertical">
          <Form.Item
            name="aliases"
            label="别名列表（每行一个）"
            rules={[{ required: true, message: '请输入别名列表' }]}
          >
            <Input.TextArea
              placeholder="每行输入一个别名，例如：&#10;小白菜&#10;大白菜&#10;白菜叶"
              rows={8}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AliasManagement
