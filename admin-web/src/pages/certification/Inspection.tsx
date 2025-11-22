import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const { TextArea } = Input
const { Panel } = Collapse
const { Text } = Typography

interface Inspection {
  id: string
  applicationId: string
  restaurantId: string
  inspectionType: string
  inspectorName: string
  scheduledDate: string
  status: string
  inspectionResult?: string
}

const CertificationInspection: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAppSelector((state: any) => state.auth)
  const [dataSource, setDataSource] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [updateModalVisible, setUpdateModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)
  const [createForm] = Form.useForm()
  const [updateForm] = Form.useForm()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })

  useEffect(() => {
    fetchInspections()
  }, [pagination.current, pagination.pageSize])

  const fetchInspections = async () => {
    try {
      setLoading(true)
      const result = await certificationAPI.listInspections({
        page: pagination.current,
        pageSize: pagination.pageSize,
      })

      if (result.code === 0 && result.data) {
        setDataSource(result.data.list || [])
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination.total,
        }))
      } else {
        message.error(result.message || '获取抽检列表失败')
      }
    } catch (error: any) {
      console.error('获取抽检列表失败:', error)
      message.error(error.message || '获取抽检列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setCreateModalVisible(true)
    createForm.resetFields()
  }

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields()
      
      const result = await certificationAPI.createInspection({
        ...values,
        inspectorId: user?.id || user?._id || 'system',
        inspectorName: user?.name || user?.username || '系统',
      })

      if (result.code === 0) {
        message.success('抽检任务创建成功')
        setCreateModalVisible(false)
        createForm.resetFields()
        fetchInspections()
      } else {
        message.error(result.message || '创建失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      console.error('创建抽检任务失败:', error)
      message.error('创建失败')
    }
  }

  const handleUpdate = (inspection: Inspection) => {
    setSelectedInspection(inspection)
    setUpdateModalVisible(true)
    updateForm.setFieldsValue({
      status: inspection.status,
      inspectionResult: inspection.inspectionResult,
    })
  }

  const handleUpdateSubmit = async () => {
    try {
      const values = await updateForm.validateFields()
      
      if (!selectedInspection) return

      const result = await certificationAPI.updateInspection({
        inspectionId: selectedInspection.id,
        ...values,
      })

      if (result.code === 0) {
        message.success('抽检记录更新成功')
        setUpdateModalVisible(false)
        updateForm.resetFields()
        fetchInspections()
      } else {
        message.error(result.message || '更新失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      console.error('更新抽检记录失败:', error)
      message.error('更新失败')
    }
  }

  const handleViewDetail = async (inspection: Inspection) => {
    try {
      const result = await certificationAPI.getInspection({
        inspectionId: inspection.id,
      })

      if (result.code === 0 && result.data) {
        setSelectedInspection(result.data)
        setDetailModalVisible(true)
      } else {
        message.error(result.message || '获取详情失败')
      }
    } catch (error: any) {
      console.error('获取抽检详情失败:', error)
      message.error('获取详情失败')
    }
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待开始' },
      in_progress: { color: 'processing', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
    }
    const statusInfo = statusMap[status] || { color: 'default', text: status }
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
  }

  const columns: ColumnsType<Inspection> = [
    {
      title: '申请ID',
      dataIndex: 'applicationId',
      key: 'applicationId',
      width: 200,
    },
    {
      title: '抽检类型',
      dataIndex: 'inspectionType',
      key: 'inspectionType',
      width: 120,
      render: (type: string) => (
        <Tag>{type === 'remote' ? '远程抽检' : '现场核查'}</Tag>
      ),
    },
    {
      title: '检查员',
      dataIndex: 'inspectorName',
      key: 'inspectorName',
      width: 120,
    },
    {
      title: '计划日期',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 180,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '结果',
      dataIndex: 'inspectionResult',
      key: 'inspectionResult',
      width: 100,
      render: (result: string) => {
        if (!result) return '-'
        return (
          <Tag color={result === 'pass' ? 'success' : 'error'}>
            {result === 'pass' ? '通过' : '不通过'}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record: Inspection) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.status !== 'completed' && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleUpdate(record)}
            >
              更新
            </Button>
          )}
        </Space>
      ),
    },
  ]

  // 认证标准简要说明
  const standardSummary = [
    { dimension: '低碳菜品占比', requirement: '≥40%，核心菜品需提供碳足迹标签', weight: '40%' },
    { dimension: '食材与供应链', requirement: '本地或可追溯低碳食材占比 ≥30%', weight: '20%' },
    { dimension: '能源与运营', requirement: '年度能源强度下降 ≥10% 或绿色能源证明', weight: '10%' },
    { dimension: '食物浪费管理', requirement: '月度浪费减量目标 ≥15%', weight: '15%' },
    { dimension: '社会传播与教育', requirement: '不少于 3 项低碳倡导举措', weight: '15%' },
  ]

  return (
    <div>
      {/* 认证标准提示卡片 */}
      <Collapse
        defaultActiveKey={[]}
        style={{ marginBottom: 16 }}
        ghost
      >
        <Panel
          header={
            <Space>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              <Text strong>气候餐厅认证标准</Text>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                点击查看详细标准要求（抽检参考）
              </Text>
            </Space>
          }
          key="1"
        >
          <Card size="small" style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>达标标准：</Text>
                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                  <li>所有达标项必须全部满足</li>
                  <li>系统自动评估得分 ≥ 80 分（满分 100 分）</li>
                  <li>人工抽检无重大风险项</li>
                </ul>
              </div>
              <div>
                <Text strong>五大维度评估标准：</Text>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  {standardSummary.map((item, index) => (
                    <Col span={24} key={index}>
                      <Card size="small" style={{ background: '#f5f5f5' }}>
                        <Space>
                          <Text strong>{item.dimension}</Text>
                          <Tag color="blue">{item.weight}</Tag>
                          <Text type="secondary">{item.requirement}</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <Link to="/certification/standard">
                  <Button type="link" size="small">
                    查看详细标准说明 →
                  </Button>
                </Link>
              </div>
            </Space>
          </Card>
        </Panel>
      </Collapse>

      <Card
        title="抽检管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchInspections}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建抽检任务
            </Button>
          </Space>
        }
      >
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

      {/* 创建抽检任务弹窗 */}
      <Modal
        title="创建抽检任务"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          createForm.resetFields()
        }}
        onOk={handleCreateSubmit}
        width={600}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="applicationId"
            label="申请ID"
            rules={[{ required: true, message: '请输入申请ID' }]}
          >
            <Input placeholder="请输入申请ID" />
          </Form.Item>

          <Form.Item
            name="inspectionType"
            label="抽检类型"
            rules={[{ required: true, message: '请选择抽检类型' }]}
          >
            <Select placeholder="请选择抽检类型">
              <Select.Option value="remote">远程抽检</Select.Option>
              <Select.Option value="onSite">现场核查</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="scheduledDate"
            label="计划日期"
            rules={[{ required: true, message: '请选择计划日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="riskItems" label="高风险项">
            <TextArea rows={4} placeholder="请输入高风险项（每行一项）" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 更新抽检记录弹窗 */}
      <Modal
        title="更新抽检记录"
        open={updateModalVisible}
        onCancel={() => {
          setUpdateModalVisible(false)
          updateForm.resetFields()
        }}
        onOk={handleUpdateSubmit}
        width={600}
      >
        <Form form={updateForm} layout="vertical">
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value="pending">待开始</Select.Option>
              <Select.Option value="in_progress">进行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="inspectionResult"
            label="抽检结果"
          >
            <Select placeholder="请选择抽检结果">
              <Select.Option value="pass">
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span>通过</span>
                </Space>
              </Select.Option>
              <Select.Option value="fail">
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <span>不通过</span>
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="inspectionReport" label="抽检报告">
            <TextArea rows={6} placeholder="请输入抽检报告" />
          </Form.Item>

          <Form.Item name="photos" label="照片">
            <Upload
              listType="picture-card"
              maxCount={5}
              beforeUpload={() => false}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="抽检详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[<Button key="close" onClick={() => setDetailModalVisible(false)}>关闭</Button>]}
        width={800}
      >
        {selectedInspection && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="申请ID">
              {selectedInspection.applicationId}
            </Descriptions.Item>
            <Descriptions.Item label="抽检类型">
              <Tag>{selectedInspection.inspectionType === 'remote' ? '远程抽检' : '现场核查'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="检查员">
              {selectedInspection.inspectorName}
            </Descriptions.Item>
            <Descriptions.Item label="计划日期">
              {selectedInspection.scheduledDate
                ? dayjs(selectedInspection.scheduledDate).format('YYYY-MM-DD')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusTag(selectedInspection.status)}
            </Descriptions.Item>
            <Descriptions.Item label="结果">
              {selectedInspection.inspectionResult ? (
                <Tag color={selectedInspection.inspectionResult === 'pass' ? 'success' : 'error'}>
                  {selectedInspection.inspectionResult === 'pass' ? '通过' : '不通过'}
                </Tag>
              ) : (
                '-'
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default CertificationInspection

