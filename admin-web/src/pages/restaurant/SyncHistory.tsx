/**
 * 发布历史记录页面
 */
import { posIntegrationAPI, type SyncLog } from '@/services/posIntegration'
import { useAppSelector } from '@/store/hooks'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

const SyncHistoryPage: React.FC = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [form] = Form.useForm()
  const [dataSource, setDataSource] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })

  useEffect(() => {
    if (currentRestaurantId) {
      loadData()
    }
  }, [currentRestaurantId, pagination.current, pagination.pageSize])

  const loadData = async () => {
    if (!currentRestaurantId) return

    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: any = {
        restaurantId: currentRestaurantId,
        page: pagination.current,
        pageSize: pagination.pageSize,
      }

      if (values.status) {
        params.status = values.status
      }

      if (values.action) {
        params.action = values.action
      }

      if (values.dateRange && values.dateRange.length === 2) {
        params.startDate = values.dateRange[0].startOf('day').toISOString()
        params.endDate = values.dateRange[1].endOf('day').toISOString()
      }

      const result = await posIntegrationAPI.getSyncHistory(params)

      setDataSource(result.list)
      setPagination((prev) => ({ ...prev, total: result.total }))
    } catch (error: any) {
      message.error(error.message || '加载历史记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    loadData()
  }

  const handleReset = () => {
    form.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    loadData()
  }

  const handleViewDetail = (record: SyncLog) => {
    setSelectedLog(record)
    setDetailModalVisible(true)
  }

  const handleRetry = async (syncId: string) => {
    setRetryingId(syncId)
    try {
      const result = await posIntegrationAPI.retrySync(syncId)
      if (result) {
        message.success(
          `重试成功！成功: ${result.successCount}, 失败: ${result.failedCount}`
        )
        loadData()
        setDetailModalVisible(false)
      }
    } catch (error: any) {
      message.error(error.message || '重试失败')
    } finally {
      setRetryingId(null)
    }
  }

  const columns: ColumnsType<SyncLog> = [
    {
      title: '发布时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        return action === 'pushMenu' ? '菜单发布' : '订单同步'
      },
    },
    {
      title: '收银系统',
      dataIndex: 'posSystem',
      key: 'posSystem',
      width: 150,
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
      filters: [
        { text: '成功', value: 'success' },
        { text: '失败', value: 'failed' },
      ],
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
      width: 220,
      render: (_: any, record: SyncLog) => (
        <span>
          总计: {record.totalCount} | 成功:{' '}
          <span style={{ color: '#52c41a' }}>{record.successCount}</span> |
          失败:{' '}
          <span style={{ color: '#ff4d4f' }}>{record.failedCount}</span>
        </span>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      sorter: true,
      render: (duration: number) => `${duration}ms`,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
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
              loading={retryingId === record._id}
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
          <SearchOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <p style={{ marginTop: 16, color: '#999' }}>请先选择餐厅</p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card
        title="发布历史记录"
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            刷新
          </Button>
        }
      >
        {/* 搜索表单 */}
        <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              <Select.Option value="success">成功</Select.Option>
              <Select.Option value="failed">失败</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="action" label="操作类型">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              <Select.Option value="pushMenu">菜单发布</Select.Option>
              <Select.Option value="syncOrder">订单同步</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label="时间范围">
            <RangePicker />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          rowKey="_id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
            },
          }}
        />
      </Card>

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
              loading={retryingId === selectedLog?._id}
              onClick={() => {
                if (selectedLog) {
                  handleRetry(selectedLog._id)
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
            <Descriptions.Item label="操作类型">
              {selectedLog.action === 'pushMenu' ? '菜单发布' : '订单同步'}
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
            <Descriptions.Item label="耗时">
              {selectedLog.duration}ms
            </Descriptions.Item>
            <Descriptions.Item label="总计">
              {selectedLog.totalCount}
            </Descriptions.Item>
            <Descriptions.Item label="成功">
              <span style={{ color: '#52c41a' }}>
                {selectedLog.successCount}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="失败">
              <span style={{ color: '#ff4d4f' }}>
                {selectedLog.failedCount}
              </span>
            </Descriptions.Item>
            {selectedLog.error && (
              <Descriptions.Item label="错误信息" span={2}>
                <div style={{ color: '#ff4d4f', whiteSpace: 'pre-wrap' }}>
                  {selectedLog.error}
                </div>
              </Descriptions.Item>
            )}
            {selectedLog.failedItems && selectedLog.failedItems.length > 0 && (
              <Descriptions.Item label="失败项详情" span={2}>
                <div
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    padding: '12px',
                  }}
                >
                  {selectedLog.failedItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: '12px',
                        paddingBottom: '12px',
                        borderBottom:
                          index < selectedLog.failedItems!.length - 1
                            ? '1px solid #f0f0f0'
                            : 'none',
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>
                        <Tag color="error">菜单项ID: {item.itemId}</Tag>
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        {item.reason}
                      </div>
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

export default SyncHistoryPage

