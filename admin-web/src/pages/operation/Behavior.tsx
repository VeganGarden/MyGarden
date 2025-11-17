import { Column } from '@ant-design/charts'
import { Card, Col, DatePicker, Row, Space, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const { RangePicker } = DatePicker

interface BehaviorMetric {
  id: string
  date: string
  lowCarbonRatio: number
  customerBehavior: string
  carbonReduction: number
}

const OperationBehavior: React.FC = () => {
  const { t } = useTranslation()
  const [dataSource] = useState<BehaviorMetric[]>([])

  const columns: ColumnsType<BehaviorMetric> = [
    {
      title: t('pages.operation.behavior.table.columns.date'),
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: t('pages.operation.behavior.table.columns.lowCarbonRatio'),
      dataIndex: 'lowCarbonRatio',
      key: 'lowCarbonRatio',
      render: (value: number) => `${(value * 100).toFixed(1)}%`,
    },
    {
      title: t('pages.operation.behavior.table.columns.customerBehavior'),
      dataIndex: 'customerBehavior',
      key: 'customerBehavior',
    },
    {
      title: t('pages.operation.behavior.table.columns.carbonReduction'),
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      render: (value: number) => `${value.toFixed(2)} kg CO₂e`,
    },
  ]

  const chartData = [
    { date: '1月', ratio: 0.65 },
    { date: '2月', ratio: 0.72 },
    { date: '3月', ratio: 0.68 },
  ]

  return (
    <div>
      <Card title={t('pages.operation.behavior.overview.title')} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={t('pages.operation.behavior.overview.lowCarbonRatio')}
              value={68.5}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.operation.behavior.overview.monthlyCarbonReduction')}
              value={1250}
              suffix="kg CO₂e"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.operation.behavior.overview.customerLowCarbonChoiceRate')}
              value={75.2}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.operation.behavior.overview.behaviorRecordCount')}
              value={1250}
              suffix={t('pages.operation.behavior.overview.unit')}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={t('pages.operation.behavior.trend.title')}
        extra={<RangePicker />}
        style={{ marginBottom: 16 }}
      >
        <Column
          data={chartData}
          xField="date"
          yField="ratio"
          height={300}
          label={{
            position: 'middle',
            formatter: (datum: any) => `${(datum.ratio * 100).toFixed(1)}%`,
          }}
        />
      </Card>

      <Card title={t('pages.operation.behavior.detail.title')}>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker />
        </Space>

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
    </div>
  )
}

export default OperationBehavior

