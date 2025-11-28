/**
 * 员工统计页面
 */

import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, DatePicker, Button, Space, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { staffAPI } from '@/services/vegetarianPersonnel'
import type { StaffStats as StaffStatsType } from '@/types/vegetarianPersonnel'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const StaffStatsPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<StaffStatsType | null>(null)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  useEffect(() => {
    if (currentRestaurantId && currentTenant) {
      loadData()
    }
  }, [currentRestaurantId, dateRange])

  const loadData = async () => {
    if (!currentRestaurantId || !currentTenant) {
      message.warning('请先选择餐厅')
      return
    }

    setLoading(true)
    try {
      const tenantId = currentTenant.id || currentTenant._id || ''
      const params: any = {
        restaurantId: currentRestaurantId,
        tenantId: tenantId
      }

      if (dateRange) {
        params.startDate = dateRange[0].toDate()
        params.endDate = dateRange[1].toDate()
      }

      const result = await staffAPI.getStats(params)
      if (result.success && result.data) {
        setStats(result.data)
      } else {
        message.error(result.error || '加载失败')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  const vegetarianTypeColumns = [
    {
      title: '素食类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          pure: '纯素',
          ovo_lacto: '蛋奶素',
          flexible: '弹性素',
          other: '其他'
        }
        return typeMap[type] || type
      }
    },
    {
      title: '人数',
      dataIndex: 'count',
      key: 'count'
    },
    {
      title: '占比',
      dataIndex: 'ratio',
      key: 'ratio',
      render: (ratio: number) => `${(ratio * 100).toFixed(2)}%`
    }
  ]

  const vegetarianTypeData = stats ? [
    {
      key: 'pure',
      type: 'pure',
      count: stats.vegetarianTypeDistribution.pure,
      ratio: stats.totalStaff > 0 ? stats.vegetarianTypeDistribution.pure / stats.totalStaff : 0
    },
    {
      key: 'ovo_lacto',
      type: 'ovo_lacto',
      count: stats.vegetarianTypeDistribution.ovo_lacto,
      ratio: stats.totalStaff > 0 ? stats.vegetarianTypeDistribution.ovo_lacto / stats.totalStaff : 0
    },
    {
      key: 'flexible',
      type: 'flexible',
      count: stats.vegetarianTypeDistribution.flexible,
      ratio: stats.totalStaff > 0 ? stats.vegetarianTypeDistribution.flexible / stats.totalStaff : 0
    },
    {
      key: 'other',
      type: 'other',
      count: stats.vegetarianTypeDistribution.other,
      ratio: stats.totalStaff > 0 ? stats.vegetarianTypeDistribution.other / stats.totalStaff : 0
    }
  ] : []

  return (
    <div>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vegetarian-personnel/staff')}>
              返回
            </Button>
            <span>员工统计</span>
          </Space>
        }
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="YYYY-MM-DD"
            />
            <Button type="primary" onClick={loadData} loading={loading}>
              刷新
            </Button>
          </Space>
        }
        loading={loading && !stats}
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总员工数"
                value={stats?.totalStaff || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="素食员工数"
                value={stats?.vegetarianStaff || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="素食比例"
                value={stats?.vegetarianRatio ? (stats.vegetarianRatio * 100).toFixed(2) : 0}
                suffix="%"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均素食年限"
                value={stats?.averageVegetarianYears || 0}
                suffix="年"
                valueStyle={{ color: '#fa8c16' }}
                precision={1}
              />
            </Card>
          </Col>
        </Row>

        <Card title="素食类型分布" style={{ marginTop: 16 }}>
          <Table
            columns={vegetarianTypeColumns}
            dataSource={vegetarianTypeData}
            pagination={false}
            loading={loading}
          />
        </Card>
      </Card>
    </div>
  )
}

export default StaffStatsPage

