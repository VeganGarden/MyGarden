/**
 * 客户详情页面
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, message, Timeline } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { customerAPI } from '@/services/vegetarianPersonnel'
import type { Customer } from '@/types/vegetarianPersonnel'
import { CustomerVegetarianType, VegetarianYears } from '@/types/vegetarianPersonnel'

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await customerAPI.get(id)
      if (result.success && result.data) {
        setCustomer(result.data)
      } else {
        message.error(result.error || '加载失败')
        navigate('/vegetarian-personnel/customers')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  const getVegetarianTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      regular: '常态素食',
      occasional: '偶尔素食',
      ovo_lacto: '蛋奶素',
      pure: '纯素',
      other: '其他'
    }
    return typeMap[type] || type
  }

  const getVegetarianYearsLabel = (years: string) => {
    const yearsMap: Record<string, string> = {
      less_than_1: '1年以下',
      '1_2': '1-2年',
      '3_5': '3-5年',
      '5_10': '5-10年',
      more_than_10: '10年以上'
    }
    return yearsMap[years] || years
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-'
    if (typeof date === 'string') {
      return date.split('T')[0]
    }
    return date.toISOString().split('T')[0]
  }

  if (!customer) {
    return null
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vegetarian-personnel/customers')}>
              返回
            </Button>
            <span>客户详情</span>
          </Space>
        }
        loading={loading}
      >
        <Descriptions title="基本信息" bordered column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="客户ID">{customer.customerId}</Descriptions.Item>
          <Descriptions.Item label="用户ID">{customer.userId || '-'}</Descriptions.Item>
          <Descriptions.Item label="昵称">{customer.basicInfo?.nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{customer.basicInfo?.phone || '-'}</Descriptions.Item>
        </Descriptions>

        <Card title="素食信息" style={{ marginBottom: 24 }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="是否素食">
              <Tag color={customer.vegetarianInfo?.isVegetarian ? 'green' : 'default'}>
                {customer.vegetarianInfo?.isVegetarian ? '是' : '否'}
              </Tag>
            </Descriptions.Item>
            {customer.vegetarianInfo?.isVegetarian && (
              <>
                <Descriptions.Item label="素食类型">
                  {customer.vegetarianInfo?.vegetarianType
                    ? getVegetarianTypeLabel(customer.vegetarianInfo.vegetarianType)
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="素食年限">
                  {customer.vegetarianInfo?.vegetarianYears
                    ? getVegetarianYearsLabel(customer.vegetarianInfo.vegetarianYears)
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="素食开始年份">
                  {customer.vegetarianInfo?.vegetarianStartYear || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="首次记录日期">
                  {formatDate(customer.vegetarianInfo?.firstRecordDate)}
                </Descriptions.Item>
                <Descriptions.Item label="最后更新日期">
                  {formatDate(customer.vegetarianInfo?.lastUpdateDate)}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>

        <Card title="消费统计" style={{ marginBottom: 24 }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="总订单数">
              {customer.consumptionStats?.totalOrders || 0}
            </Descriptions.Item>
            <Descriptions.Item label="总消费金额">
              ¥{(customer.consumptionStats?.totalAmount || 0).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="平均订单金额">
              ¥{(customer.consumptionStats?.averageOrderAmount || 0).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="首次消费日期">
              {formatDate(customer.consumptionStats?.firstOrderDate)}
            </Descriptions.Item>
            <Descriptions.Item label="最后消费日期">
              {formatDate(customer.consumptionStats?.lastOrderDate)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {customer.history && customer.history.length > 0 && (
          <Card title="历史记录">
            <Timeline>
              {customer.history.map((item, index) => (
                <Timeline.Item key={index}>
                  <div>
                    <div>
                      <strong>更新日期：</strong>
                      {formatDate(item.updatedAt)}
                    </div>
                    <div>
                      <strong>更新人：</strong>
                      {item.updatedBy}
                    </div>
                    {item.vegetarianInfo && (
                      <div style={{ marginTop: 8 }}>
                        <Tag color={item.vegetarianInfo.isVegetarian ? 'green' : 'default'}>
                          {item.vegetarianInfo.isVegetarian ? '素食' : '非素食'}
                        </Tag>
                        {item.vegetarianInfo.vegetarianType && (
                          <Tag>{getVegetarianTypeLabel(item.vegetarianInfo.vegetarianType)}</Tag>
                        )}
                      </div>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        )}
      </Card>
    </div>
  )
}

export default CustomerDetailPage

