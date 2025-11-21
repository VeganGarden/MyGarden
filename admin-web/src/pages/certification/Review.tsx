import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
  Badge,
  Divider,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker
const { TextArea } = Input

interface Application {
  id: string
  applicationId: string
  applicationNumber: string
  restaurantId: string
  restaurantName: string
  status: string
  currentStage: string
  submittedAt: string
  systemEvaluation?: any
}

const CertificationReview: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAppSelector((state: any) => state.auth)
  const [dataSource, setDataSource] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [reviewForm] = Form.useForm()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  // 筛选条件
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [pagination.current, pagination.pageSize, statusFilter, stageFilter, dateRange])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
      }

      if (statusFilter) params.status = statusFilter
      if (stageFilter) params.currentStage = stageFilter
      if (dateRange) {
        params.startDate = dateRange[0].startOf('day').toISOString()
        params.endDate = dateRange[1].endOf('day').toISOString()
      }

      const result = await certificationAPI.listApplications(params)

      if (result.code === 0 && result.data) {
        setDataSource(result.data.list || [])
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination.total,
        }))
      } else {
        message.error(result.message || '获取申请列表失败')
      }
    } catch (error: any) {
      console.error('获取申请列表失败:', error)
      message.error(error.message || '获取申请列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = (application: Application) => {
    setSelectedApplication(application)
    setReviewModalVisible(true)
    reviewForm.resetFields()
  }

  const handleViewDetail = (application: Application) => {
    setSelectedApplication(application)
    setDetailModalVisible(true)
  }

  const handleReviewSubmit = async () => {
    try {
      const values = await reviewForm.validateFields()
      
      if (!selectedApplication) return

      const result = await certificationAPI.review({
        applicationId: selectedApplication.id,
        stage: selectedApplication.currentStage,
        result: values.result,
        comment: values.comment,
        reviewerId: user?.id || user?._id || 'system',
        reviewerName: user?.name || user?.username || '系统',
        attachments: values.attachments || []
      })

      if (result.code === 0) {
        message.success('审核完成')
        setReviewModalVisible(false)
        reviewForm.resetFields()
        fetchApplications()
      } else {
        message.error(result.message || '审核失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      console.error('审核失败:', error)
      message.error('审核失败')
    }
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      submitted: { color: 'processing', text: '已提交' },
      reviewing: { color: 'processing', text: '审核中' },
      approved: { color: 'success', text: '已通过' },
      rejected: { color: 'error', text: '已拒绝' },
    }
    const statusInfo = statusMap[status] || { color: 'default', text: status }
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
  }

  const getStageTag = (stage: string) => {
    const stageMap: Record<string, string> = {
      systemEvaluation: '系统评估',
      documentReview: '资料审查',
      onSiteInspection: '现场核查',
      review: '复评',
    }
    return <Tag>{stageMap[stage] || stage}</Tag>
  }

  const columns: ColumnsType<Application> = [
    {
      title: '申请编号',
      dataIndex: 'applicationNumber',
      key: 'applicationNumber',
      width: 180,
    },
    {
      title: '餐厅名称',
      dataIndex: 'restaurantName',
      key: 'restaurantName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '当前阶段',
      dataIndex: 'currentStage',
      key: 'currentStage',
      width: 120,
      render: (stage: string) => getStageTag(stage),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '系统评估',
      key: 'systemEvaluation',
      width: 120,
      render: (_, record: Application) => {
        if (record.systemEvaluation?.score !== undefined) {
          return (
            <Badge
              count={record.systemEvaluation.score}
              style={{ backgroundColor: record.systemEvaluation.passed ? '#52c41a' : '#ff4d4f' }}
            />
          )
        }
        return '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record: Application) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看详情
          </Button>
          {(record.status === 'submitted' || record.status === 'reviewing') && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleReview(record)}
            >
              审核
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="认证审核工作台"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchApplications}>
            刷新
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="筛选状态"
            style={{ width: 150 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Select.Option value="submitted">已提交</Select.Option>
            <Select.Option value="reviewing">审核中</Select.Option>
            <Select.Option value="approved">已通过</Select.Option>
            <Select.Option value="rejected">已拒绝</Select.Option>
          </Select>

          <Select
            placeholder="筛选阶段"
            style={{ width: 150 }}
            allowClear
            value={stageFilter}
            onChange={setStageFilter}
          >
            <Select.Option value="documentReview">资料审查</Select.Option>
            <Select.Option value="onSiteInspection">现场核查</Select.Option>
            <Select.Option value="review">复评</Select.Option>
          </Select>

          <RangePicker
            placeholder={['开始日期', '结束日期']}
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
          />

          <Button type="primary" icon={<SearchOutlined />} onClick={fetchApplications}>
            查询
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }))
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 审核弹窗 */}
      <Modal
        title="审核认证申请"
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false)
          reviewForm.resetFields()
        }}
        onOk={handleReviewSubmit}
        width={600}
      >
        {selectedApplication && (
          <div>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请编号">
                {selectedApplication.applicationNumber}
              </Descriptions.Item>
              <Descriptions.Item label="餐厅名称">
                {selectedApplication.restaurantName}
              </Descriptions.Item>
              <Descriptions.Item label="当前阶段">
                {getStageTag(selectedApplication.currentStage)}
              </Descriptions.Item>
              {selectedApplication.systemEvaluation && (
                <>
                  <Descriptions.Item label="系统评估得分">
                    {selectedApplication.systemEvaluation.score} 分
                  </Descriptions.Item>
                  <Descriptions.Item label="评估结果">
                    <Tag color={selectedApplication.systemEvaluation.passed ? 'success' : 'error'}>
                      {selectedApplication.systemEvaluation.passed ? '通过' : '未通过'}
                    </Tag>
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Divider />

            <Form form={reviewForm} layout="vertical">
              <Form.Item
                name="result"
                label="审核结果"
                rules={[{ required: true, message: '请选择审核结果' }]}
              >
                <Select placeholder="请选择审核结果">
                  <Select.Option value="approved">
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span>通过</span>
                    </Space>
                  </Select.Option>
                  <Select.Option value="rejected">
                    <Space>
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      <span>拒绝</span>
                    </Space>
                  </Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="comment"
                label="审核意见"
                rules={[{ required: true, message: '请输入审核意见' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="请输入审核意见，包括通过/拒绝的原因"
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="申请详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedApplication && (selectedApplication.status === 'submitted' || selectedApplication.status === 'reviewing') && (
            <Button
              key="review"
              type="primary"
              onClick={() => {
                setDetailModalVisible(false)
                handleReview(selectedApplication)
              }}
            >
              审核
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedApplication && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="申请编号">
                {selectedApplication.applicationNumber}
              </Descriptions.Item>
              <Descriptions.Item label="餐厅名称">
                {selectedApplication.restaurantName}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedApplication.status)}
              </Descriptions.Item>
              <Descriptions.Item label="当前阶段">
                {getStageTag(selectedApplication.currentStage)}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {selectedApplication.submittedAt
                  ? dayjs(selectedApplication.submittedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              {selectedApplication.systemEvaluation && (
                <>
                  <Descriptions.Item label="系统评估得分">
                    {selectedApplication.systemEvaluation.score} 分
                  </Descriptions.Item>
                  <Descriptions.Item label="评估结果">
                    <Tag color={selectedApplication.systemEvaluation.passed ? 'success' : 'error'}>
                      {selectedApplication.systemEvaluation.passed ? '通过' : '未通过'}
                    </Tag>
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            {selectedApplication.systemEvaluation?.recommendations && (
              <Card title="改进建议" style={{ marginTop: 16 }}>
                <ul>
                  {selectedApplication.systemEvaluation.recommendations.map((rec: string, index: number) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </Card>
            )}

            {selectedApplication.reviewRecords && selectedApplication.reviewRecords.length > 0 && (
              <Card title="审核记录" style={{ marginTop: 16 }}>
                {selectedApplication.reviewRecords.map((record: any, index: number) => (
                  <div key={index} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                    <Space>
                      <Tag>{record.stage}</Tag>
                      <Tag color={record.reviewResult === 'approved' ? 'success' : 'error'}>
                        {record.reviewResult === 'approved' ? '通过' : '拒绝'}
                      </Tag>
                      <span style={{ color: '#999' }}>
                        {record.reviewerName} - {dayjs(record.reviewedAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                    </Space>
                    {record.reviewComment && (
                      <div style={{ marginTop: 8, color: '#666' }}>
                        {record.reviewComment}
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CertificationReview

