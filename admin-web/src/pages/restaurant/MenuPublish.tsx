/**
 * 菜单发布管理页面
 */
import { tenantAPI } from '@/services/cloudbase'
import { posIntegrationAPI, type PosIntegration } from '@/services/posIntegration'
import { useAppSelector } from '@/store/hooks'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Form,
  Input,
  Modal,
  Progress,
  Radio,
  Select,
  Space,
  Table,
  Tag,
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
  isAvailable?: boolean
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
  const { message } = App.useApp()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [integrations, setIntegrations] = useState<PosIntegration[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedMenuItems, setSelectedMenuItems] = useState<string[]>([])
  const [menuSearchText, setMenuSearchText] = useState<string>('')
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
      } else if (activeIntegrations.length === 0) {
        // 如果没有接口，清空选择
        form.setFieldsValue({ integrationId: undefined })
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
        // 只显示上架的菜单项（统一使用 isAvailable 字段）
        const activeItems = items.filter(
          (item: any) => item.isAvailable !== false // 默认为 true，即上架
        )
        setMenuItems(activeItems)
        
        if (activeItems.length === 0) {
          message.warning('当前没有上架的菜单项，无法进行发布')
        }
      } else {
        setMenuItems([])
      }
    } catch (error: any) {
      console.error('加载菜单项失败:', error)
      message.error(error.message || '加载菜单项失败')
      setMenuItems([])
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

      // 如果有多个接口，必须选择一个
      if (integrations.length > 1 && !integrationId) {
        message.error('请选择要发布到的系统集成接口')
        return
      }

      // 如果只有一个接口，使用该接口
      const finalIntegrationId = integrationId || (integrations.length === 1 ? integrations[0]._id : undefined)
      
      if (!finalIntegrationId) {
        message.error('没有可用的系统集成接口，请先配置')
        return
      }

      setPublishing(true)
      setPublishProgress(0)

      const publishData: {
        restaurantId: string
        syncType: 'full' | 'incremental'
        menuItemIds?: string[]
        integrationId: string
      } = {
        restaurantId: currentRestaurantId!,
        syncType,
        integrationId: finalIntegrationId,
      }

      if (syncType === 'incremental') {
        publishData.menuItemIds = selectedMenuItems
      }

      // 开始进度更新（基于实际请求时间）
      const progressInterval = setInterval(() => {
        setPublishProgress((prev) => {
          if (prev >= 90) {
            return 90
          }
          return prev + 5
        })
      }, 300)

      try {
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
          setMenuSearchText('')
        }
      } catch (error: any) {
        clearInterval(progressInterval)
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
            return 90
          }
          return prev + 5
        })
      }, 300)

      try {
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
        clearInterval(progressInterval)
        throw error
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
            请先配置系统集成接口
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
                  // 过滤菜单项（根据搜索文本）
                  const filteredMenuItems = menuItems.filter((item) => {
                    if (!menuSearchText) return true
                    const searchLower = menuSearchText.toLowerCase()
                    return (
                      item.name.toLowerCase().includes(searchLower) ||
                      (item.category && item.category.toLowerCase().includes(searchLower))
                    )
                  })

                  // 全选/取消全选
                  const handleSelectAll = (checked: boolean) => {
                    if (checked) {
                      setSelectedMenuItems(
                        filteredMenuItems.map((item) => item._id || item.id || '')
                      )
                    } else {
                      setSelectedMenuItems([])
                    }
                  }

                  const allFilteredSelected =
                    filteredMenuItems.length > 0 &&
                    filteredMenuItems.every((item) =>
                      selectedMenuItems.includes(item._id || item.id || '')
                    )

                  return (
                    <Form.Item label="选择菜单项">
                      {menuItems.length === 0 ? (
                        <div
                          style={{
                            padding: '20px',
                            textAlign: 'center',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            color: '#999',
                          }}
                        >
                          暂无上架的菜单项，请先添加菜单项并上架
                        </div>
                      ) : (
                        <>
                          <Space
                            direction="vertical"
                            style={{ width: '100%' }}
                            size="small"
                          >
                            {/* 搜索框 */}
                            <Input
                              placeholder="搜索菜单项（按名称或分类）"
                              value={menuSearchText}
                              onChange={(e) => setMenuSearchText(e.target.value)}
                              allowClear
                            />

                            {/* 全选/取消全选 */}
                            {filteredMenuItems.length > 0 && (
                              <div style={{ marginBottom: '8px' }}>
                                <Checkbox
                                  checked={allFilteredSelected}
                                  indeterminate={
                                    selectedMenuItems.length > 0 &&
                                    !allFilteredSelected
                                  }
                                  onChange={(e) => handleSelectAll(e.target.checked)}
                                >
                                  全选当前筛选结果（{filteredMenuItems.length} 项）
                                </Checkbox>
                              </div>
                            )}

                            {/* 菜单项列表 */}
                            <div
                              style={{
                                maxHeight: '300px',
                                overflowY: 'auto',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px',
                                padding: '8px',
                              }}
                            >
                              {filteredMenuItems.length === 0 ? (
                                <div
                                  style={{
                                    padding: '20px',
                                    textAlign: 'center',
                                    color: '#999',
                                  }}
                                >
                                  {menuSearchText
                                    ? '没有找到匹配的菜单项'
                                    : '暂无菜单项'}
                                </div>
                              ) : (
                                <Checkbox.Group
                                  value={selectedMenuItems}
                                  onChange={(values) =>
                                    setSelectedMenuItems(values as string[])
                                  }
                                  style={{ width: '100%' }}
                                >
                                  <Space direction="vertical" style={{ width: '100%' }}>
                                    {filteredMenuItems.map((item) => (
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
                              )}
                            </div>
                          </Space>
                          <div style={{ marginTop: '8px', color: '#999' }}>
                            已选择 {selectedMenuItems.length} 个菜单项
                            {menuItems.length > 0 && (
                              <span style={{ marginLeft: '8px' }}>
                                （共 {menuItems.length} 个可选项）
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </Form.Item>
                  )
                }
                return null
              }}
            </Form.Item>

            <Form.Item
              name="integrationId"
              label="系统集成接口"
              rules={[
                {
                  required: integrations.length > 1,
                  message: '请选择系统集成接口',
                },
              ]}
            >
              <Select
                placeholder={
                  integrations.length > 1
                    ? '请选择系统集成接口'
                    : integrations.length === 1
                    ? (() => {
                        const integration = integrations[0]
                        if (integration.name) {
                          return integration.name
                        }
                        if (integration.posSystem === 'custom') {
                          try {
                            const url = new URL(integration.apiUrl)
                            return `自定义系统 - ${url.hostname.replace('www.', '')}`
                          } catch {
                            return '自定义系统'
                          }
                        }
                        const systemNames: Record<string, string> = {
                          meituan: '美团收银',
                          dianping: '大众点评',
                          alipay: '支付宝收银',
                          wechat: '微信收银',
                        }
                        return systemNames[integration.posSystem] || integration.posSystem
                      })()
                    : '暂无可用接口'
                }
                disabled={integrations.length === 1}
              >
                {integrations.map((integration) => {
                  // 优先显示自定义名称
                  let displayText = integration.name
                  
                  // 如果没有名称，根据系统类型生成显示文本
                  if (!displayText) {
                    if (integration.posSystem === 'custom') {
                      // 自定义系统：显示"自定义系统" + API地址的域名部分
                      try {
                        const url = new URL(integration.apiUrl)
                        const hostname = url.hostname.replace('www.', '')
                        displayText = `自定义系统 - ${hostname}`
                      } catch {
                        displayText = `自定义系统 - ${integration.apiUrl.substring(0, 30)}...`
                      }
                    } else {
                      // 其他系统类型：显示系统类型名称
                      const systemNames: Record<string, string> = {
                        meituan: '美团收银',
                        dianping: '大众点评',
                        alipay: '支付宝收银',
                        wechat: '微信收银',
                      }
                      displayText = systemNames[integration.posSystem] || integration.posSystem
                    }
                  }
                  
                  return (
                    <Select.Option key={integration._id} value={integration._id}>
                      {displayText}
                      {integration.name && integration.posSystem !== 'custom' && (
                        <span style={{ color: '#999', marginLeft: '8px' }}>
                          ({integration.posSystem})
                        </span>
                      )}
                    </Select.Option>
                  )
                })}
              </Select>
              {integrations.length === 0 && (
                <div style={{ color: '#ff4d4f', marginTop: '4px' }}>
                  请先在"系统集成接口配置"页面添加接口配置
                </div>
              )}
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                onClick={handlePublish}
                loading={publishing}
                disabled={publishing}
              >
                菜单数据发布
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

