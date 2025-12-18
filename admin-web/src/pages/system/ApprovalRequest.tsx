/**
 * 审核申请管理页面
 */
import { approvalAPI } from '@/services/approval'
import type { ApprovalRequest } from '@/types/approval'
import { ApprovalStatus, BusinessType, OperationType } from '@/types/approval'
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ReloadOutlined,
  RollbackOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import TextArea from 'antd/es/input/TextArea'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { Search } = Input
const { Option } = Select

const ApprovalRequestPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ApprovalRequest[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'all'>('pending')
  const [filters, setFilters] = useState({
    businessType: undefined as BusinessType | undefined,
    operationType: undefined as OperationType | undefined,
    status: undefined as ApprovalStatus | undefined,
  })
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [actionModalVisible, setActionModalVisible] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'return' | null>(null)
  const [actionComment, setActionComment] = useState('')

  // 加载数据
  const fetchData = async () => {
    setLoading(true)
    try {
      let result
      if (activeTab === 'pending') {
        result = await approvalAPI.getMyPendingApprovals()
        if (result.success) {
          setDataSource(result.data || [])
          setPagination({ ...pagination, total: result.data?.length || 0 })
        } else {
          message.error(result.error || '加载失败')
          setDataSource([])
        }
      } else {
        const queryParams: any = {
          page: pagination.current,
          pageSize: pagination.pageSize,
        }
        if (activeTab === 'submitted') {
          // 这里应该传递当前用户ID，暂时先查询所有
        }
        if (filters.businessType) queryParams.businessType = filters.businessType
        if (filters.operationType) queryParams.operationType = filters.operationType
        if (filters.status) queryParams.status = filters.status

        result = await approvalAPI.listRequests(queryParams)
        if (result.success) {
          setDataSource(result.data || [])
          setPagination({
            ...pagination,
            total: result.pagination?.total || 0,
          })
        } else {
          // 如果是401错误，不显示错误消息，让RouteGuard或认证系统处理
          if (result.error && (result.error.includes('未授权') || result.error.includes('401'))) {
            console.error('权限验证失败:', result.error)
            // 不清除数据源，避免页面闪烁
          } else {
            message.error(result.error || '加载失败')
          }
          setDataSource([])
        }
      }
    } catch (error: any) {
      // 如果是401错误，不显示错误消息，让RouteGuard或认证系统处理
      if (error.message && (error.message.includes('未授权') || error.message.includes('401'))) {
        console.error('权限验证失败:', error.message)
        // 不清除数据源，避免页面闪烁
      } else {
        message.error(error.message || '加载失败')
      }
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, activeTab, filters.businessType, filters.operationType, filters.status])

  // 查看详情
  const handleViewDetail = async (request: ApprovalRequest) => {
    const result = await approvalAPI.getRequest(request.requestId)
    if (result.success && result.data) {
      setSelectedRequest(result.data)
      setDetailModalVisible(true)
    } else {
      message.error(result.error || '获取详情失败')
    }
  }

  // 处理审核操作
  const handleProcessAction = async (request: ApprovalRequest, action: 'approve' | 'reject' | 'return') => {
    setSelectedRequest(request)
    setActionType(action)
    setActionComment('')
    setActionModalVisible(true)
  }

  // 确认审核操作
  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return

    setLoading(true)
    try {
      let result
      if (actionType === 'approve') {
        result = await approvalAPI.approve(selectedRequest.requestId, actionComment)
      } else if (actionType === 'reject') {
        result = await approvalAPI.reject(selectedRequest.requestId, actionComment)
      } else {
        result = await approvalAPI.return(selectedRequest.requestId, actionComment)
      }

      if (result.success) {
        message.success('操作成功')
        setActionModalVisible(false)
        setSelectedRequest(null)
        setActionType(null)
        setActionComment('')
        fetchData()
      } else {
        message.error(result.error || '操作失败')
      }
    } catch (error: any) {
      message.error(error.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  // 取消申请
  const handleCancel = async (request: ApprovalRequest) => {
    try {
      const result = await approvalAPI.cancel(request.requestId)
      if (result.success) {
        message.success('取消成功')
        fetchData()
      } else {
        message.error(result.error || '取消失败')
      }
    } catch (error: any) {
      message.error(error.message || '取消失败')
    }
  }

  // 状态标签映射
  const getStatusTag = (status: ApprovalStatus) => {
    const statusMap: Record<ApprovalStatus, { color: string; text: string }> = {
      [ApprovalStatus.PENDING]: { color: 'default', text: '待审核' },
      [ApprovalStatus.APPROVING]: { color: 'processing', text: '审核中' },
      [ApprovalStatus.APPROVED]: { color: 'success', text: '已通过' },
      [ApprovalStatus.REJECTED]: { color: 'error', text: '已拒绝' },
      [ApprovalStatus.CANCELLED]: { color: 'default', text: '已取消' },
      [ApprovalStatus.EXPIRED]: { color: 'warning', text: '已过期' },
    }
    const cfg = statusMap[status] || { color: 'default', text: status }
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 业务类型标签
  const getBusinessTypeLabel = (type: BusinessType) => {
    const typeMap: Record<BusinessType, string> = {
      [BusinessType.CARBON_FACTOR]: '因子库',
      [BusinessType.CARBON_BASELINE]: '基准值',
    }
    return typeMap[type] || type
  }

  // 操作类型标签
  const getOperationTypeLabel = (type: OperationType) => {
    const typeMap: Record<OperationType, string> = {
      [OperationType.CREATE]: '创建',
      [OperationType.UPDATE]: '更新',
      [OperationType.DELETE]: '删除',
      [OperationType.ARCHIVE]: '归档',
    }
    return typeMap[type] || type
  }

  // 表格列定义
  const columns: ColumnsType<ApprovalRequest> = [
    {
      title: '申请ID',
      dataIndex: 'requestId',
      key: 'requestId',
      width: 200,
      ellipsis: true,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '业务类型',
      dataIndex: 'businessType',
      key: 'businessType',
      width: 100,
      render: (type: BusinessType) => getBusinessTypeLabel(type),
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 100,
      render: (type: OperationType) => getOperationTypeLabel(type),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ApprovalStatus) => getStatusTag(status),
    },
    {
      title: '提交人',
      dataIndex: 'submitterName',
      key: 'submitterName',
      width: 120,
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180,
      render: (date: string | Date) => {
        if (!date) return '-'
        try {
          return new Date(date).toLocaleString('zh-CN')
        } catch {
          return '-'
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {activeTab === 'pending' && (record.status === ApprovalStatus.PENDING || record.status === ApprovalStatus.APPROVING) && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleProcessAction(record, 'approve')}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleProcessAction(record, 'reject')}
              >
                拒绝
              </Button>
              <Button
                type="link"
                size="small"
                icon={<RollbackOutlined />}
                onClick={() => handleProcessAction(record, 'return')}
              >
                退回
              </Button>
            </>
          )}
          {activeTab === 'submitted' && (record.status === ApprovalStatus.PENDING || record.status === ApprovalStatus.APPROVING) && (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleCancel(record)}
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="审核申请管理"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        }
      >
        {/* 标签页 */}
        <Space style={{ marginBottom: 16 }}>
          <Button
            type={activeTab === 'pending' ? 'primary' : 'default'}
            onClick={() => {
              setActiveTab('pending')
              setPagination({ ...pagination, current: 1 })
            }}
          >
            待我审核
          </Button>
          <Button
            type={activeTab === 'submitted' ? 'primary' : 'default'}
            onClick={() => {
              setActiveTab('submitted')
              setPagination({ ...pagination, current: 1 })
            }}
          >
            我提交的
          </Button>
          <Button
            type={activeTab === 'all' ? 'primary' : 'default'}
            onClick={() => {
              setActiveTab('all')
              setPagination({ ...pagination, current: 1 })
            }}
          >
            全部
          </Button>
        </Space>

        {/* 筛选器 */}
        {activeTab !== 'pending' && (
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="业务类型"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, businessType: value })}
            >
              <Option value={BusinessType.CARBON_FACTOR}>因子库</Option>
              <Option value={BusinessType.CARBON_BASELINE}>基准值</Option>
            </Select>
            <Select
              placeholder="操作类型"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, operationType: value })}
            >
              <Option value={OperationType.CREATE}>创建</Option>
              <Option value={OperationType.UPDATE}>更新</Option>
              <Option value={OperationType.DELETE}>删除</Option>
              <Option value={OperationType.ARCHIVE}>归档</Option>
            </Select>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Option value={ApprovalStatus.PENDING}>待审核</Option>
              <Option value={ApprovalStatus.APPROVING}>审核中</Option>
              <Option value={ApprovalStatus.APPROVED}>已通过</Option>
              <Option value={ApprovalStatus.REJECTED}>已拒绝</Option>
              <Option value={ApprovalStatus.CANCELLED}>已取消</Option>
            </Select>
          </Space>
        )}

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey={(record) => record._id || record.requestId}
          loading={loading}
          pagination={{
            ...pagination,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
            },
          }}
          scroll={{ x: 1500 }}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="审核申请详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedRequest(null)
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedRequest && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="申请ID">{selectedRequest.requestId}</Descriptions.Item>
            <Descriptions.Item label="标题">{selectedRequest.title}</Descriptions.Item>
            <Descriptions.Item label="业务类型">{getBusinessTypeLabel(selectedRequest.businessType)}</Descriptions.Item>
            <Descriptions.Item label="操作类型">{getOperationTypeLabel(selectedRequest.operationType)}</Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag(selectedRequest.status)}</Descriptions.Item>
            <Descriptions.Item label="提交人">{selectedRequest.submitterName}</Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {selectedRequest.submittedAt ? new Date(selectedRequest.submittedAt).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="完成时间">
              {selectedRequest.completedAt ? new Date(selectedRequest.completedAt).toLocaleString('zh-CN') : '-'}
            </Descriptions.Item>
            {selectedRequest.description && (
              <Descriptions.Item label="描述" span={2}>
                {selectedRequest.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 审核操作模态框 */}
      <Modal
        title={actionType === 'approve' ? '审核通过' : actionType === 'reject' ? '审核拒绝' : '退回申请'}
        open={actionModalVisible}
        onOk={handleConfirmAction}
        onCancel={() => {
          setActionModalVisible(false)
          setActionType(null)
          setActionComment('')
        }}
        confirmLoading={loading}
      >
        <div style={{ marginBottom: 16 }}>
          <TextArea
            placeholder={actionType === 'approve' ? '请输入审核意见（可选）' : '请输入审核意见'}
            rows={4}
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}

export default ApprovalRequestPage

