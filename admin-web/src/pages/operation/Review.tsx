import { EyeOutlined, MessageOutlined } from '@ant-design/icons'
import { Input as AntInput, Button, Card, Form, Input, Modal, Rate, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const [dataSource] = useState<Review[]>([])
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [form] = Form.useForm()

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
      title: t('pages.operation.review.table.columns.actions'),
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} size="small">
            {t('pages.operation.review.buttons.viewDetail')}
          </Button>
          {!record.reply && (
            <Button
              type="link"
              icon={<MessageOutlined />}
              size="small"
              onClick={() => handleReply(record)}
            >
              {t('pages.operation.review.buttons.reply')}
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
        title={t('pages.operation.review.title')}
        extra={
          <Space>
            <Input.Search placeholder={t('pages.operation.review.filters.search')} style={{ width: 300 }} />
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
            showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
          }}
        />
      </Card>

      <Modal
        title={t('pages.operation.review.modal.title')}
        open={isReplyModalVisible}
        onOk={handleSubmitReply}
        onCancel={() => setIsReplyModalVisible(false)}
        width={600}
      >
        {selectedReview && (
          <div style={{ marginBottom: 16 }}>
            <p>
              <strong>{t('pages.operation.review.modal.customerReview')}:</strong> {selectedReview.content}
            </p>
            <p>
              <strong>{t('pages.operation.review.modal.rating')}:</strong> <Rate disabled defaultValue={selectedReview.rating} />
            </p>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="reply"
            label={t('pages.operation.review.modal.fields.reply')}
            rules={[{ required: true, message: t('pages.operation.review.modal.messages.replyRequired') }]}
          >
            <TextArea rows={4} placeholder={t('pages.operation.review.modal.placeholders.reply')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OperationReview

