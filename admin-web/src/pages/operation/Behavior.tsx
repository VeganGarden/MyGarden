import { useAppSelector } from '@/store/hooks'
import { operationAPI } from '@/services/cloudbase'
import { Column } from '@ant-design/charts'
import { Card, Col, DatePicker, Row, Space, Statistic, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
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
  const { currentRestaurantId } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<BehaviorMetric[]>([])
  const [chartData, setChartData] = useState<Array<{ date: string; ratio: number }>>([])
  const [statistics, setStatistics] = useState({
    lowCarbonRatio: 0,
    monthlyCarbonReduction: 0,
    customerLowCarbonChoiceRate: 0,
    behaviorRecordCount: 0,
  })

  useEffect(() => {
    fetchBehaviorData()
  }, [currentRestaurantId])

  const fetchBehaviorData = async () => {
    try {
      if (!currentRestaurantId) {
        setDataSource([])
        setChartData([])
        setStatistics({
          lowCarbonRatio: 0,
          monthlyCarbonReduction: 0,
          customerLowCarbonChoiceRate: 0,
          behaviorRecordCount: 0,
        })
        return
      }
      
      const result = await operationAPI.behavior.getMetrics({
        restaurantId: currentRestaurantId,
      })
      
      if (result && result.code === 0 && result.data) {
        const data = result.data
        
        // 设置统计数据
        if (data.statistics) {
          setStatistics({
            lowCarbonRatio: data.statistics.lowCarbonRatio || data.statistics.low_carbon_ratio || 0,
            monthlyCarbonReduction: data.statistics.monthlyCarbonReduction || data.statistics.monthly_carbon_reduction || 0,
            customerLowCarbonChoiceRate: data.statistics.customerLowCarbonChoiceRate || data.statistics.customer_low_carbon_choice_rate || 0,
            behaviorRecordCount: data.statistics.behaviorRecordCount || data.statistics.behavior_record_count || 0,
          })
        }
        
        // 设置图表数据
        if (data.chartData && Array.isArray(data.chartData)) {
          setChartData(data.chartData.map((item: any) => ({
            date: item.date || item.month || '',
            ratio: item.ratio || item.lowCarbonRatio || 0,
          })))
        }
        
        // 设置详细数据
        if (data.details && Array.isArray(data.details)) {
          setDataSource(data.details.map((item: any) => ({
            id: item.id || item._id || '',
            date: item.date || item.createTime || '',
            lowCarbonRatio: item.lowCarbonRatio || item.low_carbon_ratio || 0,
            customerBehavior: item.customerBehavior || item.customer_behavior || '',
            carbonReduction: item.carbonReduction || item.carbon_reduction || 0,
          })))
        } else {
          setDataSource([])
        }
      } else {
        setDataSource([])
        setChartData([])
      }
    } catch (error: any) {
      console.error('获取行为数据失败:', error)
      message.error(error.message || '获取行为数据失败，请稍后重试')
      setDataSource([])
      setChartData([])
    }
  }

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


  return (
    <div>
      <Card title={t('pages.operation.behavior.overview.title')} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={t('pages.operation.behavior.overview.lowCarbonRatio')}
              value={(statistics.lowCarbonRatio * 100).toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.operation.behavior.overview.monthlyCarbonReduction')}
              value={statistics.monthlyCarbonReduction}
              suffix="kg CO₂e"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.operation.behavior.overview.customerLowCarbonChoiceRate')}
              value={(statistics.customerLowCarbonChoiceRate * 100).toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('pages.operation.behavior.overview.behaviorRecordCount')}
              value={statistics.behaviorRecordCount}
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

