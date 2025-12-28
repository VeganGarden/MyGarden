/**
 * 菜单发布管理页面
 */
import { posIntegrationAPI, type PosIntegration, type PublishMenuResult } from '@/services/posIntegration'
import { tenantAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Modal,
  Progress,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MenuItem {
  _id: string
  id?: string
  name: string
  category?: string
  price?: number
  status?: string
}

interface SyncLog {
  _id: string
  restaurantId: string
  action: 'pushMenu' | 'syncOrder'
  posSystem: string
  syncType: 'full' | 'incremental'
  status: 'success' | 'failed'
  totalCount: number
  successCount: number
  failedCount: number
  failedItems: Array<{
    itemId: string
    reason: string
  }>
  duration: number
  error?: string
  createdAt: string
}

const MenuPublishPage: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [integrations, setIntegrations] = useState<PosIntegration[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [publishProgress, setPublishProgress] = useState(0)
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  useEffect(() => {
    if (currentRestaurantId) {
      loadIntegrations()
      loadMenuItems()
      loadSyncHistory()
    }
  }, [currentRestaurantId])

  const loadIntegrations = async () => {
    if (!currentRestaurantId) return

    try {
      const list = await posIntegrationAPI.getIntegrations(currentRestaurantId)
      const activeIntegrations = list.filter((item) => item.status === 'active')
      setIntegrations(activeIntegrations)

      // 如果只有一个激活的集成，自动选择
      if (activeIntegrations.length === 1) {
        form.setFieldsValue({ integrationId: activeIntegrations[0]._id })
      }
    } catch (error: any) {
      message.error(error.message || '加载集成配置失败')
    }
  }

  const loadMenuItems = async () => {
    if (!currentRestaurantId) return

    try {
      const result = await tenantAPI.getMenuList({
        restaurantId: currentRestaurantId,
      })

      if (result && result.code === 0 && result.data) {
        const data = result.data
        const items = Array.isArray(data) ? data : data.menuItems || data.menus || []
        // 只显示上架的菜单项
        const activeItems = items.filter(
          (item: any) => item.status === 'active' || item.status === 'published'
        )
        setMenuItems(activeItems)
      }
    } catch (error: any) {
      console.error('加载菜单项失败:', error)
    }
  }

  const loadSyncHistory = async () => {
    if (!currentRestaurantId) return

    setHistoryLoading(true)
    try {
      const result = await posIntegrationAPI.getSyncHistory({
        restaurantId: currentRestaurantId,
        page: pagination.current,
        pageSize: pagination.pageSize,
        action: 'pushMenu',
      })

      setSyncHistory(result.list)
      setPagination((prev) => ({ ...prev, total: result.total }))
    } catch (error: any) {
      message.error(error.message || '加载发布历史失败')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!currentRestaurantId) {
      message.error('请先选择餐厅')
      return
    }

    try {
      const values = await form.validateFields()
      const { syncType, integrationId } = values

      if (syncType === 'incremental' && selectedMenuItems.length === 0) {
        message.error('增量发布请至少选择一个菜单项')
        return
      }

      setPublishing(true)
      setPublishProgress(0)

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setPublishProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const publishData: any = {
        restaurantId: currentRestaurantId,
        syncType,
      }

      if (syncType === 'incremental') {
        publishData.menuItemIds = selectedMenuItems
      }

      if (integrationId) {
        publishData.integrationId = integrationId
      }

      const result = await posIntegrationAPI.publishMenu(publishData)

      clearInterval(progressInterval)
      setPublishProgress(100)

      if (result) {
        message.success(
          `发布成功！成功: ${result.successCount}, 失败: ${result.failedCount}`
        )
        // 刷新历史记录
        loadSyncHistory()
        // 重置表单
        form.resetFields()
        setSelectedMenuItems([])
      }
    } catch (error: any) {
      message.error(error.message || '发布失败')
    } finally {
      setPublishing(false)
      setTimeout(() => setPublishProgress(0), 2000)
    }
  }

  const handleViewDetail = (record: SyncLog) => {
    setSelectedLog(record)
    setDetailModalVisible(true)
  }

  const handleRetry = async (syncId: string) => {
    try {
      setPublishing(true)
      setPublishProgress(0)

      const progressInterval = setInterval(() => {
        setPublishProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const result = await posIntegrationAPI.retrySync(syncId)

      clearInterval(progressInterval)
      setPublishProgress(100)

      if (result) {
        message.success(
          `重试成功！成功: ${result.successCount}, 失败: ${result.failedCount}`
        )
        loadSyncHistory()
      }
    } catch (error: any) {
      message.error(error.message || '重试失败')
    } finally {
      setPublishing(false)
      setTimeout(() => setPublishProgress(0), 2000)
    }
  }

  const columns: ColumnsType<SyncLog> = [
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '收银系统',
      dataIndex: 'posSystem',
      key: 'posSystem',
      width: 120,
    },
    {
      title: '发布类型',
      dataIndex: 'syncType',
      key: 'syncType',
      width: 100,
      render: (type: string) => (type === 'full' ? '全量' : '增量'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        return status === 'success' ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            成功
          </Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            失败
          </Tag>
        )
      },
    },
    {
      title: '统计',
      key: 'stats',
      width: 200,
      render: (_: any, record: SyncLog) => (
        <span>
          总计: {record.totalCount} | 成功: {record.successCount} | 失败:{' '}
          {record.failedCount}
        </span>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => `${duration}ms`,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: SyncLog) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetail(record)}
          >
            查看详情
          </Button>
          {record.status === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetry(record._id)}
            >
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ]

  if (!currentRestaurantId) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CloudUploadOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <p style={{ marginTop: 16, color: '#999' }}>请先选择餐厅</p>
        </div>
      </Card>
    )
  }

  if (integrations.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CloudUploadOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <p style={{ marginTop: 16, color: '#999' }}>
            请先配置收银系统集成
          </p>
          <Button
            type="primary"
            style={{ marginTop: 16 }}
            onClick={() => {
              window.location.href = '/restaurant/pos-integration'
            }}
          >
            前往配置
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 发布配置区域 */}
        <Card title="发布配置">
          <Form form={form} layout="vertical">
            <Form.Item
              name="syncType"
              label="发布类型"
              rules={[{ required: true, message: '请选择发布类型' }]}
              initialValue="full"
            >
              <Radio.Group>
                <Radio value="full">全量发布（所有上架菜单）</Radio>
                <Radio value="incremental">增量发布（选择菜单项）</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.syncType !== currentValues.syncType
              }
            >
              {({ getFieldValue }) => {
                const syncType = getFieldValue('syncType')
                if (syncType === 'incremental') {
                  return (
                    <Form.Item label="选择菜单项">
                      <div
                        style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          border: '1px solid #d9d9d9',
                          borderRadius: '4px',
                          padding: '8px',
                        }}
                      >
                        <Checkbox.Group
                          value={selectedMenuItems}
                          onChange={(values) =>
                            setSelectedMenuItems(values as string[])
                          }
                          style={{ width: '100%' }}
                        >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {menuItems.map((item) => (
                              <Checkbox
                                key={item._id || item.id}
                                value={item._id || item.id}
                              >
                                {item.name} ({item.category || '未分类'}) - ¥
                                {item.price || 0}
                              </Checkbox>
                            ))}
                          </Space>
                        </Checkbox.Group>
                      </div>
                      <div style={{ marginTop: '8px', color: '#999' }}>
                        已选择 {selectedMenuItems.length} 个菜单项
                      </div>
                    </Form.Item>
                  )
                }
                return null
              }}
            </Form.Item>

            {integrations.length > 1 && (
              <Form.Item name="integrationId" label="目标收银系统">
                <Select placeholder="请选择收银系统（不选则使用默认）">
                  {integrations.map((integration) => (
                    <Select.Option
                      key={integration._id}
                      value={integration._id}
                    >
                      {integration.posSystem}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                onClick={handlePublish}
                loading={publishing}
                disabled={publishing}
              >
                发布到收银系统
              </Button>
            </Form.Item>

            {publishing && (
              <Form.Item>
                <Progress percent={publishProgress} status="active" />
              </Form.Item>
            )}
          </Form>
        </Card>

        {/* 发布历史区域 */}
        <Card
          title="发布历史"
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={loadSyncHistory}
              loading={historyLoading}
            >
              刷新
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={syncHistory}
            loading={historyLoading}
            rowKey="_id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize })
                loadSyncHistory()
              },
            }}
          />
        </Card>
      </Space>

      {/* 详情Modal */}
      <Modal
        title="发布详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          selectedLog?.status === 'failed' && (
            <Button
              key="retry"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                if (selectedLog) {
                  handleRetry(selectedLog._id)
                  setDetailModalVisible(false)
                }
              }}
            >
              重试发布
            </Button>
          ),
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedLog && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="发布时间">
              {new Date(selectedLog.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="收银系统">
              {selectedLog.posSystem}
            </Descriptions.Item>
            <Descriptions.Item label="发布类型">
              {selectedLog.syncType === 'full' ? '全量' : '增量'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedLog.status === 'success' ? (
                <Tag color="success">成功</Tag>
              ) : (
                <Tag color="error">失败</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="总计">
              {selectedLog.totalCount}
            </Descriptions.Item>
            <Descriptions.Item label="成功">
              {selectedLog.successCount}
            </Descriptions.Item>
            <Descriptions.Item label="失败">
              {selectedLog.failedCount}
            </Descriptions.Item>
            <Descriptions.Item label="耗时">
              {selectedLog.duration}ms
            </Descriptions.Item>
            {selectedLog.error && (
              <Descriptions.Item label="错误信息" span={2}>
                <div style={{ color: '#ff4d4f' }}>{selectedLog.error}</div>
              </Descriptions.Item>
            )}
            {selectedLog.failedItems && selectedLog.failedItems.length > 0 && (
              <Descriptions.Item label="失败项" span={2}>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedLog.failedItems.map((item, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <Tag color="error">{item.itemId}</Tag>
                      <span>{item.reason}</span>
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default MenuPublishPage

