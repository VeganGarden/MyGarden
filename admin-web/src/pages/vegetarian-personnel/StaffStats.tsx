/**
 * 员工统计页面
 */

import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, DatePicker, Button, Space, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { staffAPI } from '@/services/vegetarianPersonnel'
import type { StaffStats as StaffStatsType } from '@/types/vegetarianPersonnel'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const StaffStatsPage: React.FC = () => {
  const { t } = useTranslation()
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
      message.warning(t('pages.vegetarianPersonnel.staffStats.messages.noRestaurant'))
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
        message.error(result.error || t('pages.vegetarianPersonnel.staffStats.messages.loadFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('pages.vegetarianPersonnel.staffStats.messages.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const vegetarianTypeColumns = [
    {
      title: t('pages.vegetarianPersonnel.staffStats.table.columns.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeKey = `pages.vegetarianPersonnel.staffStats.vegetarianTypes.${type}`
        const translated = t(typeKey)
        return translated !== typeKey ? translated : type
      }
    },
    {
      title: t('pages.vegetarianPersonnel.staffStats.table.columns.count'),
      dataIndex: 'count',
      key: 'count'
    },
    {
      title: t('pages.vegetarianPersonnel.staffStats.table.columns.ratio'),
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
              {t('pages.vegetarianPersonnel.staffStats.buttons.back')}
            </Button>
            <span>{t('pages.vegetarianPersonnel.staffStats.title')}</span>
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
              {t('pages.vegetarianPersonnel.staffStats.buttons.refresh')}
            </Button>
          </Space>
        }
        loading={loading && !stats}
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.vegetarianPersonnel.staffStats.statistics.totalStaff')}
                value={stats?.totalStaff || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.vegetarianPersonnel.staffStats.statistics.vegetarianStaff')}
                value={stats?.vegetarianStaff || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.vegetarianPersonnel.staffStats.statistics.vegetarianRatio')}
                value={stats?.vegetarianRatio ? Number(stats.vegetarianRatio).toFixed(2) : 0}
                suffix={t('pages.vegetarianPersonnel.staffStats.units.percent')}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('pages.vegetarianPersonnel.staffStats.statistics.averageVegetarianYears')}
                value={stats?.averageVegetarianYears || 0}
                suffix={t('pages.vegetarianPersonnel.staffStats.units.year')}
                valueStyle={{ color: '#fa8c16' }}
                precision={1}
              />
            </Card>
          </Col>
        </Row>

        <Card title={t('pages.vegetarianPersonnel.staffStats.table.title')} style={{ marginTop: 16 }}>
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

