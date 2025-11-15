import { EyeOutlined, MessageOutlined } from '@ant-design/icons'
import { Input as AntInput, Button, Card, Form, Input, Modal, Rate, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useState } from 'react'

const { TextArea } = AntInput

interface Review {
  id: string
  orderNo: string
  customerName: string
  rating: number
  content: string
  carbonSatisfaction: number
  reviewDate: string
  reply?: string
  replyDate?: string
}

const OperationReview: React.FC = () => {
  const [dataSource] = useState<Review[]>([])
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [form] = Form.useForm()

  const columns: ColumnsType<Review> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled defaultValue={rating} />,
    },
    {
      title: '评价内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '碳减排满意度',
      dataIndex: 'carbonSatisfaction',
      key: 'carbonSatisfaction',
      render: (satisfaction: number) => (
        <Tag color={satisfaction >= 4 ? 'green' : satisfaction >= 3 ? 'orange' : 'red'}>
          {satisfaction}/5
        </Tag>
      ),
    },
    {
      title: '评价日期',
      dataIndex: 'reviewDate',
      key: 'reviewDate',
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record: Review) => (
        <Tag color={record.reply ? 'success' : 'processing'}>
          {record.reply ? '已回复' : '待回复'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} size="small">
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

  const handleSubmitReply = () => {
    form.validateFields().then((values) => {
      console.log('回复内容:', values)
      // TODO: 提交回复
      setIsReplyModalVisible(false)
    })
  }

  return (
    <div>
      <Card
        title="用户评价管理"
        extra={
          <Space>
            <Input.Search placeholder="搜索订单号或客户名称" style={{ width: 300 }} />
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

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
    </div>
  )
}

export default OperationReview

