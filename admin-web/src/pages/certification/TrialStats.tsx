import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { ReloadOutlined } from '@ant-design/icons'
import { Card, Col, Row, Statistic, Table, Tag, Typography, Button, Alert, Spin, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { Title, Text } = Typography

interface TrialStatsData {
  menuInfo: {
    menuItems: any[]
    totalDishes: number
  }
  orderInfo: {
    totalOrders: number
    totalAmount: number
    lowCarbonMenuRatio: number
    period: string
  }
  supplyChainInfo: {
    suppliers: any[]
    localIngredientRatio: number
    totalSuppliers: number
  }
  operationData: {
    energyUsage: string
    wasteReduction: string
    socialInitiatives: string[]
  }
  carbonFootprint: {
    totalCarbonFootprint: number
    averagePerOrder: number
  }
  trialPeriod: {
    startDate: string | null
    endDate: string | null
    daysRemaining: number | null
  }
}

const CertificationTrialStats: React.FC = () => {
  const { t } = useTranslation()
  const { currentRestaurantId, restaurants, currentTenantId } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [trialData, setTrialData] = useState<TrialStatsData | null>(null)

  const currentRestaurant = currentRestaurantId
    ? restaurants.find((r: any) => r.id === currentRestaurantId)
    : null

  useEffect(() => {
    if (currentRestaurant?.certificationStatus === 'trial' && currentRestaurantId && currentTenantId) {
      fetchTrialData()
    }
  }, [currentRestaurantId, currentTenantId, currentRestaurant])

  const fetchTrialData = async () => {
    if (!currentRestaurantId || !currentTenantId) {
      message.warning('请先选择餐厅')
      return
    }

    try {
      setLoading(true)
      const result = await certificationAPI.getTrialData({
        restaurantId: currentRestaurantId,
        tenantId: currentTenantId,
      })

      if (result.code === 0 && result.data) {
        setTrialData(result.data)
      } else {
        message.error(result.message || '获取试运营数据失败')
      }
    } catch (error: any) {
      console.error('获取试运营数据失败:', error)
      message.error(error.message || '获取试运营数据失败')
    } finally {
      setLoading(false)
    }
  }

  if (!currentRestaurant || currentRestaurant.certificationStatus !== 'trial') {
    return (
      <Card>
        <Alert
          message="当前餐厅不在试运营状态"
          description="只有处于试运营状态的餐厅才能查看试运营数据统计。"
          type="warning"
          showIcon
        />
      </Card>
    )
  }

  const menuColumns = [
    {
      title: '菜品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '食材',
      dataIndex: 'ingredients',
      key: 'ingredients',
      render: (text: string) => text || '-',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: any) => `${quantity} ${record.unit || ''}`,
    },
    {
      title: '碳足迹',
      dataIndex: 'carbonFootprint',
      key: 'carbonFootprint',
      render: (value: number) => value ? `${value.toFixed(2)} kg CO₂e` : '-',
    },
    {
      title: '销量',
      dataIndex: 'salesCount',
      key: 'salesCount',
      render: (count: number) => count || 0,
    },
  ]

  const supplierColumns = [
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => text || '-',
    },
    {
      title: '距离',
      dataIndex: 'distance',
      key: 'distance',
      render: (distance: number) => distance ? `${distance} km` : '-',
    },
    {
      title: '是否本地',
      dataIndex: 'isLocal',
      key: 'isLocal',
      render: (isLocal: boolean) => (
        <Tag color={isLocal ? 'green' : 'default'}>{isLocal ? '本地' : '外地'}</Tag>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="试运营数据统计"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchTrialData} loading={loading}>
            刷新
          </Button>
        }
      >
        <Spin spinning={loading}>
          {trialData ? (
            <>
              {/* 试运营期限提醒 */}
              {trialData.trialPeriod && (
                <Alert
                  message="试运营期限"
                  description={
                    <div>
                      {trialData.trialPeriod.daysRemaining !== null && (
                        <div style={{ marginTop: 8 }}>
                          {trialData.trialPeriod.daysRemaining > 0 ? (
                            <Text>
                              剩余天数：<Text strong style={{ color: '#1890ff' }}>
                                {trialData.trialPeriod.daysRemaining} 天
                              </Text>
                            </Text>
                          ) : (
                            <Text type="danger">试运营已到期，请尽快提交认证申请</Text>
                          )}
                        </div>
                      )}
                      {trialData.trialPeriod.startDate && (
                        <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                          开始时间：{dayjs(trialData.trialPeriod.startDate).format('YYYY-MM-DD')}
                          {trialData.trialPeriod.endDate && (
                            <> | 结束时间：{dayjs(trialData.trialPeriod.endDate).format('YYYY-MM-DD')}</>
                          )}
                        </div>
                      )}
                    </div>
                  }
                  type={trialData.trialPeriod.daysRemaining !== null && trialData.trialPeriod.daysRemaining > 0 ? 'info' : 'warning'}
                  showIcon
                  style={{ marginBottom: 24 }}
                />
              )}

              {/* 核心指标统计 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="菜品总数"
                      value={trialData.menuInfo?.totalDishes || 0}
                      suffix="个"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="订单总数"
                      value={trialData.orderInfo?.totalOrders || 0}
                      suffix="单"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="低碳菜品占比"
                      value={trialData.orderInfo?.lowCarbonMenuRatio || 0}
                      precision={2}
                      suffix="%"
                      valueStyle={{ color: trialData.orderInfo?.lowCarbonMenuRatio >= 40 ? '#3f8600' : '#cf1322' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="本地食材占比"
                      value={trialData.supplyChainInfo?.localIngredientRatio || 0}
                      precision={2}
                      suffix="%"
                      valueStyle={{ color: trialData.supplyChainInfo?.localIngredientRatio >= 30 ? '#3f8600' : '#cf1322' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 碳足迹统计 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12}>
                  <Card>
                    <Statistic
                      title="总碳足迹"
                      value={trialData.carbonFootprint?.totalCarbonFootprint || 0}
                      precision={2}
                      suffix="kg CO₂e"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card>
                    <Statistic
                      title="平均每单碳足迹"
                      value={trialData.carbonFootprint?.averagePerOrder || 0}
                      precision={2}
                      suffix="kg CO₂e"
                    />
                  </Card>
                </Col>
              </Row>

              {/* 菜单详情 */}
              <Card title="菜单详情" style={{ marginBottom: 24 }}>
                <Table
                  columns={menuColumns}
                  dataSource={trialData.menuInfo?.menuItems || []}
                  rowKey={(record, index) => `menu-${index}`}
                  pagination={false}
                  size="small"
                />
              </Card>

              {/* 供应链详情 */}
              <Card title="供应链详情" style={{ marginBottom: 24 }}>
                <Table
                  columns={supplierColumns}
                  dataSource={trialData.supplyChainInfo?.suppliers || []}
                  rowKey={(record, index) => `supplier-${index}`}
                  pagination={false}
                  size="small"
                />
              </Card>

              {/* 运营数据 */}
              {(trialData.operationData?.energyUsage || trialData.operationData?.wasteReduction || trialData.operationData?.socialInitiatives?.length) && (
                <Card title="运营数据">
                  {trialData.operationData.energyUsage && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>能源使用：</Text>
                      <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                        {trialData.operationData.energyUsage}
                      </div>
                    </div>
                  )}
                  {trialData.operationData.wasteReduction && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>浪费减少：</Text>
                      <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                        {trialData.operationData.wasteReduction}
                      </div>
                    </div>
                  )}
                  {trialData.operationData.socialInitiatives && trialData.operationData.socialInitiatives.length > 0 && (
                    <div>
                      <Text strong>社会传播与教育举措：</Text>
                      <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                        {trialData.operationData.socialInitiatives.map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}
            </>
          ) : (
            <Alert
              message="暂无试运营数据"
              description="试运营数据正在收集中，请稍后再试。"
              type="info"
              showIcon
            />
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default CertificationTrialStats

