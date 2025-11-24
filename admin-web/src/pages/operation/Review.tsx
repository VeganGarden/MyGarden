import { useAppSelector } from '@/store/hooks'
import { operationAPI } from '@/services/cloudbase'
import { Column, Line, Pie } from '@ant-design/charts'
import { EyeOutlined, MessageOutlined } from '@ant-design/icons'
import { Input as AntInput, Button, Card, Col, DatePicker, Form, Input, Modal, Rate, Row, Select, Space, Statistic, Table, Tabs, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { TextArea } = AntInput
const { RangePicker } = DatePicker
const { TabPane } = Tabs

interface Review {
  id: string
  orderNo: string
  customerName: string
  rating: number
  content: string
  images?: string[]
  carbonSatisfaction: number
  reviewDate: string
  reply?: string
  replyDate?: string
}

interface ReviewStats {
  totalReviews: number
  avgRating: number
  goodRate: number
  badRate: number
  neutralRate: number
  replyRate: number
  repliedCount: number
  pendingReplyCount: number
  trends: Array<{ date: string; count: number; avgRating: number }>
  distribution: Array<{ rating: number; count: number; label: string }>
}

interface ReviewAnalysis {
  topKeywords: Array<{ word: string; count: number }>
  sentimentAnalysis: { positive: number; neutral: number; negative: number }
  themes: { dish: number; service: number; environment: number; price: number; carbon: number }
}

const OperationReview: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null)
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [reviewDetail, setReviewDetail] = useState<any>(null)
  const [form] = Form.useForm()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [keyword, setKeyword] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('list')

  useEffect(() => {
    fetchReviewData()
    if (activeTab === 'stats') {
      fetchReviewStats()
    } else if (activeTab === 'analysis') {
      fetchReviewAnalysis()
    }
  }, [currentRestaurantId, dateRange, ratingFilter, statusFilter, activeTab])

  const fetchReviewData = async () => {
    try {
      if (!currentRestaurantId) {
        setDataSource([])
        return
      }
      
      setLoading(true)
      const params: any = {
        restaurantId: currentRestaurantId,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      if (ratingFilter) {
        params.rating = ratingFilter
      }

      if (statusFilter) {
        params.status = statusFilter
      }

      if (keyword) {
        params.keyword = keyword
      }
      
      const result = await operationAPI.review.list(params)
      
      if (result && result.code === 0 && result.data) {
        const reviews = Array.isArray(result.data) ? result.data : []
        setDataSource(reviews.map((review: any) => ({
          id: review.id || review._id || '',
          orderNo: review.orderNo || review.order_id || '',
          customerName: review.customerName || review.customer_name || review.userName || '',
          rating: review.rating || review.score || 0,
          content: review.content || review.comment || '',
          images: review.images || [],
          carbonSatisfaction: review.carbonSatisfaction || review.carbon_satisfaction || 0,
          reviewDate: review.reviewDate || review.createTime || review.createdAt || '',
          reply: review.reply || '',
          replyDate: review.replyDate || review.reply_time || '',
        })))
      } else {
        setDataSource([])
      }
    } catch (error: any) {
      console.error('获取评价数据失败:', error)
      message.error(error.message || '获取评价数据失败，请稍后重试')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  const fetchReviewStats = async () => {
    try {
      if (!currentRestaurantId) return

      const params: any = {
        restaurantId: currentRestaurantId,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      const result = await operationAPI.review.getStats?.(params)
      if (result && result.code === 0 && result.data) {
        setStats(result.data)
      }
    } catch (error: any) {
      console.error('获取评价统计失败:', error)
    }
  }

  const fetchReviewAnalysis = async () => {
    try {
      if (!currentRestaurantId) return

      const params: any = {
        restaurantId: currentRestaurantId,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      const result = await operationAPI.review.analyze?.(params)
      if (result && result.code === 0 && result.data) {
        setAnalysis(result.data)
      }
    } catch (error: any) {
      console.error('获取评价分析失败:', error)
    }
  }

  const handleViewDetail = async (review: Review) => {
    try {
      const result = await operationAPI.review.getDetail?.(review.id)
      if (result && result.code === 0 && result.data) {
        setReviewDetail(result.data)
        setIsDetailModalVisible(true)
      }
    } catch (error: any) {
      console.error('获取评价详情失败:', error)
      message.error('获取评价详情失败')
    }
  }

  const columns: ColumnsType<Review> = [
    {
      title: t('pages.operation.review.table.columns.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: t('pages.operation.review.table.columns.customerName'),
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: t('pages.operation.review.table.columns.rating'),
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled defaultValue={rating} />,
    },
    {
      title: t('pages.operation.review.table.columns.content'),
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: t('pages.operation.review.table.columns.carbonSatisfaction'),
      dataIndex: 'carbonSatisfaction',
      key: 'carbonSatisfaction',
      render: (satisfaction: number) => (
        <Tag color={satisfaction >= 4 ? 'green' : satisfaction >= 3 ? 'orange' : 'red'}>
          {satisfaction}/5
        </Tag>
      ),
    },
    {
      title: t('pages.operation.review.table.columns.reviewDate'),
      dataIndex: 'reviewDate',
      key: 'reviewDate',
    },
    {
      title: t('pages.operation.review.table.columns.status'),
      key: 'status',
      render: (_, record: Review) => (
        <Tag color={record.reply ? 'success' : 'processing'}>
          {record.reply ? t('pages.operation.review.status.replied') : t('pages.operation.review.status.pending')}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)}>
            查看详情
          </Button>
          {!record.reply && (
            <Button
              type="link"
              icon={<MessageOutlined />}
              size="small"
              onClick={() => handleReply(record)}
            >
              回复
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const handleReply = (review: Review) => {
    setSelectedReview(review)
    form.resetFields()
    setIsReplyModalVisible(true)
  }

  const handleSubmitReply = async () => {
    try {
      const values = await form.validateFields()
      if (!selectedReview) return
      
      const result = await operationAPI.review.reply(selectedReview.id, values.reply)
      
      if (result && result.code === 0) {
        message.success('回复成功')
        setIsReplyModalVisible(false)
        fetchReviewData() // 重新获取数据
      } else {
        message.error(result?.message || '回复失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      console.error('提交回复失败:', error)
      message.error(error.message || '提交回复失败，请稍后重试')
    }
  }

  return (
    <div>
      <Card
        title="用户评价管理"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
            />
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="评价列表" key="list">
            <Space style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="搜索评价内容或客户名称"
                style={{ width: 300 }}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={fetchReviewData}
              />
              <Select
                placeholder="评分"
                style={{ width: 120 }}
                allowClear
                value={ratingFilter}
                onChange={setRatingFilter}
              >
                <Select.Option value={5}>5星</Select.Option>
                <Select.Option value={4}>4星</Select.Option>
                <Select.Option value={3}>3星</Select.Option>
                <Select.Option value={2}>2星</Select.Option>
                <Select.Option value={1}>1星</Select.Option>
              </Select>
              <Select
                placeholder="状态"
                style={{ width: 120 }}
                allowClear
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Select.Option value="pending">待回复</Select.Option>
                <Select.Option value="replied">已回复</Select.Option>
              </Select>
            </Space>

            <Table
              columns={columns}
              dataSource={dataSource}
              rowKey="id"
              loading={loading}
              pagination={{
                total: dataSource.length,
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>

          <TabPane tab="评价统计" key="stats">
            {stats && (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Statistic title="总评价数" value={stats.totalReviews} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="平均评分" value={stats.avgRating.toFixed(1)} suffix="/5" />
                  </Col>
                  <Col span={6}>
                    <Statistic title="好评率" value={(stats.goodRate * 100).toFixed(1)} suffix="%" />
                  </Col>
                  <Col span={6}>
                    <Statistic title="回复率" value={(stats.replyRate * 100).toFixed(1)} suffix="%" />
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="评价趋势">
                      <Line
                        data={stats.trends.map((t) => ({
                          date: t.date,
                          value: t.count,
                          type: '评价数',
                        }))}
                        xField="date"
                        yField="value"
                        height={300}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="评分分布">
                      <Pie
                        data={stats.distribution}
                        angleField="count"
                        colorField="label"
                        height={300}
                      />
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </TabPane>

          <TabPane tab="评价分析" key="analysis">
            {analysis && (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Card title="情感分析">
                      <Statistic title="正面" value={analysis.sentimentAnalysis.positive} />
                      <Statistic title="中性" value={analysis.sentimentAnalysis.neutral} />
                      <Statistic title="负面" value={analysis.sentimentAnalysis.negative} />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="主题分析">
                      <p>菜品: {analysis.themes.dish}</p>
                      <p>服务: {analysis.themes.service}</p>
                      <p>环境: {analysis.themes.environment}</p>
                      <p>价格: {analysis.themes.price}</p>
                      <p>碳减排: {analysis.themes.carbon}</p>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="高频关键词">
                      {analysis.topKeywords.slice(0, 10).map((kw, idx) => (
                        <Tag key={idx} style={{ marginBottom: 8 }}>
                          {kw.word} ({kw.count})
                        </Tag>
                      ))}
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* 回复评价Modal */}
      <Modal
        title="回复评价"
        open={isReplyModalVisible}
        onOk={handleSubmitReply}
        onCancel={() => setIsReplyModalVisible(false)}
        width={600}
      >
        {selectedReview && (
          <div style={{ marginBottom: 16 }}>
            <p>
              <strong>客户评价:</strong> {selectedReview.content}
            </p>
            <p>
              <strong>评分:</strong> <Rate disabled defaultValue={selectedReview.rating} />
            </p>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="reply"
            label="回复内容"
            rules={[{ required: true, message: '请输入回复内容' }]}
          >
            <TextArea rows={4} placeholder="请输入回复内容" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 评价详情Modal */}
      <Modal
        title="评价详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={800}
        footer={null}
      >
        {reviewDetail && (
          <div>
            <Card title="评价信息" style={{ marginBottom: 16 }}>
              <p><strong>客户:</strong> {reviewDetail.customerName}</p>
              <p><strong>评分:</strong> <Rate disabled defaultValue={reviewDetail.rating} /></p>
              <p><strong>评价内容:</strong> {reviewDetail.content}</p>
              {reviewDetail.images && reviewDetail.images.length > 0 && (
                <div>
                  <strong>图片:</strong>
                  <div>
                    {reviewDetail.images.map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`评价图片${idx + 1}`} style={{ width: 100, marginRight: 8 }} />
                    ))}
                  </div>
                </div>
              )}
            </Card>
            {reviewDetail.orderInfo && (
              <Card title="订单信息" style={{ marginBottom: 16 }}>
                <p><strong>订单号:</strong> {reviewDetail.orderInfo.orderNo}</p>
                <p><strong>订单时间:</strong> {reviewDetail.orderInfo.orderDate}</p>
                <p><strong>订单金额:</strong> ¥{reviewDetail.orderInfo.amount.toFixed(2)}</p>
              </Card>
            )}
            {reviewDetail.userHistoryReviews && reviewDetail.userHistoryReviews.length > 0 && (
              <Card title="用户历史评价">
                {reviewDetail.userHistoryReviews.map((r: any) => (
                  <div key={r.id} style={{ marginBottom: 8 }}>
                    <Rate disabled defaultValue={r.rating} />
                    <span style={{ marginLeft: 8 }}>{r.content}</span>
                    <span style={{ marginLeft: 8, color: '#999' }}>{r.reviewDate}</span>
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

export default OperationReview

