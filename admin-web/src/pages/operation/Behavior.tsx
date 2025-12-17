import { useAppSelector } from '@/store/hooks'
import { operationAPI } from '@/services/cloudbase'
import { Column, Line } from '@ant-design/charts'
import { Card, Col, DatePicker, Row, Space, Statistic, Table, Tabs, message, Select, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { TabPane } = Tabs

interface BehaviorMetric {
  id: string
  date: string
  lowCarbonRatio: number
  customerBehavior: string
  carbonReduction: number
}

interface RestaurantMetrics {
  lowCarbonDishRatio: number
  localIngredientRatio: number
  organicIngredientRatio: number
  energyIntensity: number
  energyIntensityReduction: number
  wasteReduction: number
  wasteReductionRate: number
}

interface CustomerMetrics {
  avgFrequency: number
  peakHours: string[]
  avgAmount: number
  lowCarbonChoiceRate: number
  smallPortionRate: number
  noUtensilsRate: number
}

const OperationBehavior: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, tenantId } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<BehaviorMetric[]>([])
  const [chartData, setChartData] = useState<Array<{ date: string; ratio: number }>>([])
  const [restaurantMetrics, setRestaurantMetrics] = useState<RestaurantMetrics>({
    lowCarbonDishRatio: 0,
    localIngredientRatio: 0,
    organicIngredientRatio: 0,
    energyIntensity: 0,
    energyIntensityReduction: 0,
    wasteReduction: 0,
    wasteReductionRate: 0,
  })
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics>({
    avgFrequency: 0,
    peakHours: [],
    avgAmount: 0,
    lowCarbonChoiceRate: 0,
    smallPortionRate: 0,
    noUtensilsRate: 0,
  })
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [period, setPeriod] = useState<string>('daily')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBehaviorData()
  }, [currentRestaurantId, dateRange, period])

  const fetchBehaviorData = async () => {
    try {
      if (!currentRestaurantId) {
        resetData()
        return
      }
      
      setLoading(true)
      const params: any = {
        restaurantId: currentRestaurantId,
        tenantId: tenantId,
        period: period,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }
      
      const result = await operationAPI.behavior.getMetrics(params)
      
      if (result && result.code === 0 && result.data) {
        const data = result.data
        
        // 设置餐厅行为指标
        if (data.restaurantMetrics) {
          setRestaurantMetrics({
            lowCarbonDishRatio: data.restaurantMetrics.lowCarbonDishRatio || 0,
            localIngredientRatio: data.restaurantMetrics.localIngredientRatio || 0,
            organicIngredientRatio: data.restaurantMetrics.organicIngredientRatio || 0,
            energyIntensity: data.restaurantMetrics.energyIntensity || 0,
            energyIntensityReduction: data.restaurantMetrics.energyIntensityReduction || 0,
            wasteReduction: data.restaurantMetrics.wasteReduction || 0,
            wasteReductionRate: data.restaurantMetrics.wasteReductionRate || 0,
          })
        }
        
        // 设置顾客行为指标
        if (data.customerMetrics) {
          setCustomerMetrics({
            avgFrequency: data.customerMetrics.avgFrequency || 0,
            peakHours: data.customerMetrics.peakHours || [],
            avgAmount: data.customerMetrics.avgAmount || 0,
            lowCarbonChoiceRate: data.customerMetrics.lowCarbonChoiceRate || 0,
            smallPortionRate: data.customerMetrics.smallPortionRate || 0,
            noUtensilsRate: data.customerMetrics.noUtensilsRate || 0,
          })
        }
        
        // 设置图表数据
        if (data.chartData && Array.isArray(data.chartData)) {
          setChartData(data.chartData.map((item: any) => ({
            date: item.date || item.month || '',
            ratio: item.ratio || item.lowCarbonRatio || 0,
          })))
        }
        
        // 设置快照数据
        if (data.snapshots && Array.isArray(data.snapshots)) {
          setSnapshots(data.snapshots)
          setDataSource(data.snapshots.map((snapshot: any) => ({
            id: snapshot.metricId || snapshot._id || '',
            date: snapshot.snapshotDate || snapshot.snapshot_date || '',
            lowCarbonRatio: snapshot.restaurantMetrics?.lowCarbonDishRatio || 0,
            customerBehavior: `${snapshot.customerMetrics?.avgFrequency?.toFixed(1) || 0}次/月`,
            carbonReduction: snapshot.restaurantMetrics?.wasteReduction || 0,
          })))
        } else {
          setSnapshots([])
          setDataSource([])
        }
      } else {
        resetData()
      }
    } catch (error: any) {
      console.error('获取行为数据失败:', error)
      message.error(error.message || '获取行为数据失败，请稍后重试')
      resetData()
    } finally {
      setLoading(false)
    }
  }

  const resetData = () => {
    setDataSource([])
    setChartData([])
    setRestaurantMetrics({
      lowCarbonDishRatio: 0,
      localIngredientRatio: 0,
      organicIngredientRatio: 0,
      energyIntensity: 0,
      energyIntensityReduction: 0,
      wasteReduction: 0,
      wasteReductionRate: 0,
    })
    setCustomerMetrics({
      avgFrequency: 0,
      peakHours: [],
      avgAmount: 0,
      lowCarbonChoiceRate: 0,
      smallPortionRate: 0,
      noUtensilsRate: 0,
    })
    setSnapshots([])
  }

  const handleGenerateSnapshot = async () => {
    try {
      if (!currentRestaurantId) {
        message.warning('请先选择餐厅')
        return
      }

      setLoading(true)
      const result = await operationAPI.behavior.generateSnapshot?.({
        restaurantId: currentRestaurantId,
        tenantId: tenantId,
        period: period,
      })

      if (result && result.code === 0) {
        message.success('快照生成成功')
        fetchBehaviorData()
      } else {
        message.error(result?.message || '快照生成失败')
      }
    } catch (error: any) {
      console.error('生成快照失败:', error)
      message.error(error.message || '生成快照失败')
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<BehaviorMetric> = [
    {
      title: '快照日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '低碳菜品占比',
      dataIndex: 'lowCarbonRatio',
      key: 'lowCarbonRatio',
      render: (value: number) => `${(value * 100).toFixed(1)}%`,
    },
    {
      title: '平均消费频次',
      dataIndex: 'customerBehavior',
      key: 'customerBehavior',
    },
    {
      title: '浪费减量',
      dataIndex: 'carbonReduction',
      key: 'carbonReduction',
      render: (value: number) => `${value.toFixed(2)} kg`,
    },
  ]

  return (
    <div>
      {/* 餐厅行为指标概览 */}
      <Card title="餐厅行为指标概览" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="低碳菜品占比"
              value={(restaurantMetrics.lowCarbonDishRatio * 100).toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="本地食材占比"
              value={(restaurantMetrics.localIngredientRatio * 100).toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="有机食材占比"
              value={(restaurantMetrics.organicIngredientRatio * 100).toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="浪费减量率"
              value={(restaurantMetrics.wasteReductionRate * 100).toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 顾客行为指标概览 */}
      <Card title="顾客行为指标概览" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="平均消费频次"
              value={customerMetrics.avgFrequency.toFixed(1)}
              suffix="次/月"
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均消费金额"
              value={customerMetrics.avgAmount.toFixed(2)}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="低碳选择率"
              value={(customerMetrics.lowCarbonChoiceRate * 100).toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="高峰时段"
              value={customerMetrics.peakHours.join(', ') || '暂无'}
              valueStyle={{ color: '#cf1322', fontSize: 14 }}
            />
          </Col>
        </Row>
      </Card>

      {/* 趋势图表 */}
      <Card
        title="行为指标趋势"
        extra={
          <Space>
            <Select
              value={period}
              onChange={setPeriod}
              style={{ width: 120 }}
            >
              <Select.Option value="daily">日度</Select.Option>
              <Select.Option value="weekly">周度</Select.Option>
              <Select.Option value="monthly">月度</Select.Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
            />
            <Button onClick={handleGenerateSnapshot} loading={loading}>
              生成快照
            </Button>
          </Space>
        }
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

      {/* 快照详情 */}
      <Card title="历史快照">
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
      </Card>
    </div>
  )
}

export default OperationBehavior

