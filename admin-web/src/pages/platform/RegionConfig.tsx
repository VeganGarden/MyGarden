/**
 * 区域配置管理页面
 */
import { regionConfigAPI, type RegionConfig } from '@/services/regionConfig'
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { Option } = Select

const RegionConfigPage: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<RegionConfig[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [activeTab, setActiveTab] = useState<'factor_region' | 'baseline_region'>('factor_region')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RegionConfig | null>(null)
  const [form] = Form.useForm()
  const [parentRegions, setParentRegions] = useState<RegionConfig[]>([])

  // 获取列表数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await regionConfigAPI.list({
        configType: activeTab,
        page: pagination.current,
        pageSize: pagination.pageSize,
        status: 'active',
      })

      if (result && result.code === 0) {
        setDataSource(result.data || [])
        setPagination({
          ...pagination,
          total: result.total || result.pagination?.total || 0,
        })
      } else {
        const errorMsg = result?.message || result?.error || '加载失败'
        message.error(errorMsg)
        setDataSource([])
        setPagination({
          ...pagination,
          total: 0,
        })
      }
    } catch (error: any) {
      console.error('获取区域配置列表失败:', error)
      message.error(error?.message || '加载失败，请检查网络连接')
      setDataSource([])
      setPagination({
        ...pagination,
        total: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  // 获取父级区域列表（用于基准值区域）
  const fetchParentRegions = async () => {
    try {
      const result = await regionConfigAPI.list({
        configType: 'factor_region',
        status: 'active',
        page: 1,
        pageSize: 100,
      })

      if (result && result.code === 0) {
        setParentRegions(result.data || [])
      } else {
        setParentRegions([])
      }
    } catch (error) {
      console.error('获取父级区域失败:', error)
      setParentRegions([])
    }
  }

  useEffect(() => {
    fetchData()
    if (activeTab === 'baseline_region') {
      fetchParentRegions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, activeTab])

  // 处理创建/编辑
  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const regionData = {
        ...values,
        configType: activeTab,
        level: values.parentCode ? 2 : 1,
      }

      let result
      if (editingRecord) {
        result = await regionConfigAPI.update(editingRecord._id!, regionData)
      } else {
        result = await regionConfigAPI.create(regionData)
      }

      if (result.code === 0) {
        message.success(editingRecord ? '更新成功' : '创建成功')
        setModalVisible(false)
        form.resetFields()
        setEditingRecord(null)
        fetchData()
        if (activeTab === 'baseline_region') {
          fetchParentRegions()
        }
      } else {
        message.error(result.message || (editingRecord ? '更新失败' : '创建失败'))
      }
    } catch (error: any) {
      message.error(error.message || (editingRecord ? '更新失败' : '创建失败'))
    } finally {
      setLoading(false)
    }
  }

  // 处理编辑
  const handleEdit = (record: RegionConfig) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  // 处理归档
  const handleArchive = async (record: RegionConfig) => {
    setLoading(true)
    try {
      const result = await regionConfigAPI.archive(record._id!)
      if (result && result.code === 0) {
        if (result.data?.warnings && result.data.warnings.length > 0) {
          Modal.warning({
            title: '归档成功',
            content: `区域已归档，但存在依赖关系：${result.data.warnings.join('; ')}`,
          })
        } else {
          message.success('归档成功')
        }
        fetchData()
      } else {
        const errorMsg = result?.message || result?.error || '归档失败'
        message.error(errorMsg)
      }
    } catch (error: any) {
      message.error(error.message || '归档失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理激活
  const handleActivate = async (record: RegionConfig) => {
    setLoading(true)
    try {
      const result = await regionConfigAPI.activate(record._id!)
      if (result && result.code === 0) {
        message.success('激活成功')
        fetchData()
      } else {
        const errorMsg = result?.message || result?.error || '激活失败'
        message.error(errorMsg)
      }
    } catch (error: any) {
      message.error(error.message || '激活失败')
    } finally {
      setLoading(false)
    }
  }

  // 表格列定义
  const columns: ColumnsType<RegionConfig> = [
    {
      title: '区域代码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '区域名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '英文名称',
      dataIndex: 'nameEn',
      key: 'nameEn',
      width: 150,
    },
    {
      title: '国家',
      dataIndex: 'countryName',
      key: 'countryName',
      width: 120,
      render: (text) => text || '-',
    },
    ...(activeTab === 'baseline_region'
      ? [
          {
            title: '父级区域',
            dataIndex: 'parentCode',
            key: 'parentCode',
            width: 120,
            render: (text: string) => {
              const parent = parentRegions.find((r) => r.code === text)
              return parent ? parent.name : text || '-'
            },
          },
        ]
      : []),
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level) => (level === 1 ? '国家' : '子区域'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) =>
        status === 'active' ? (
          <Tag color="success">激活</Tag>
        ) : (
          <Tag color="default">已归档</Tag>
        ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.status === 'active' ? (
            <Popconfirm
              title="确定要归档此区域配置吗？"
              onConfirm={() => handleArchive(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                归档
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(record)}
            >
              激活
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as 'factor_region' | 'baseline_region')
              setPagination({ ...pagination, current: 1 })
            }}
            items={[
              {
                key: 'factor_region',
                label: '因子区域配置',
              },
              {
                key: 'baseline_region',
                label: '基准值区域配置',
              },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null)
              form.resetFields()
              form.setFieldsValue({ configType: activeTab, level: activeTab === 'baseline_region' ? 2 : 1 })
              setModalVisible(true)
            }}
          >
            新建区域
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
            },
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: '暂无数据'
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑区域配置' : '新建区域配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            configType: activeTab,
            level: activeTab === 'baseline_region' ? 2 : 1,
            status: 'active',
            sortOrder: 0,
          }}
        >
          <Form.Item
            name="code"
            label="区域代码"
            rules={[{ required: true, message: '请输入区域代码' }]}
          >
            <Input placeholder="如：CN、CN_NORTH" disabled={!!editingRecord} />
          </Form.Item>

          <Form.Item
            name="name"
            label="区域名称（中文）"
            rules={[{ required: true, message: '请输入区域名称' }]}
          >
            <Input placeholder="如：中国、中国-华北" />
          </Form.Item>

          <Form.Item name="nameEn" label="区域名称（英文）">
            <Input placeholder="如：China、China - North" />
          </Form.Item>

          <Form.Item name="country" label="国家代码">
            <Input placeholder="ISO 3166-1 alpha-2，如：CN、US" />
          </Form.Item>

          <Form.Item name="countryName" label="国家名称">
            <Input placeholder="如：中国、美国" />
          </Form.Item>

          {activeTab === 'baseline_region' && (
            <Form.Item name="parentCode" label="父级区域">
              <Select placeholder="选择父级区域" allowClear>
                {parentRegions.map((region) => (
                  <Option key={region.code} value={region.code}>
                    {region.name} ({region.code})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="sortOrder" label="排序顺序">
            <Input type="number" placeholder="数字越小越靠前" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="区域配置的描述信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RegionConfigPage

