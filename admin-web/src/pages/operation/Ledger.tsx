/**
 * 运营台账管理页面
 */

import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, message, Tag, Tabs, Row, Col, Statistic } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { operationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { Column, Line } from '@ant-design/charts'

const { RangePicker } = DatePicker
const { TextArea } = Input

interface LedgerEntry {
  id: string
  ledgerId: string
  restaurantId: string
  tenantId: string
  type: 'energy' | 'waste' | 'training' | 'other'
  date: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  description: string
  value: number
  unit: string
  energyType?: string
  wasteType?: string
  trainingType?: string
  participants?: number
  status: string
  createdAt: string
  updatedAt: string
}

const OperationLedger: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<LedgerEntry[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LedgerEntry | null>(null)
  const [form] = Form.useForm()
  
  // 筛选条件
  const [filters, setFilters] = useState({
    type: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  })
  const [activeTab, setActiveTab] = useState('list')
  const [statsData, setStatsData] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // 获取当前餐厅和租户信息
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const { user } = useAppSelector((state: any) => state.auth)

  const restaurantId = currentRestaurantId
  const tenantId = currentTenant?.id || user?.tenantId || 'default'

  // 加载数据
  const loadData = async () => {
    if (!restaurantId || !tenantId) {
      message.warning('请先选择餐厅')
      return
    }

    setLoading(true)
    try {
      const result = await operationAPI.ledger.list({
        restaurantId,
        tenantId,
        type: filters.type,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: pagination.page,
        pageSize: pagination.pageSize,
      })

      if (result && result.code === 0) {
        setDataSource(result.data || [])
        setPagination(result.pagination || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        })
      } else {
        message.error(result?.message || '加载失败')
        setDataSource([])
      }
    } catch (error: any) {
      console.error('加载运营台账数据失败:', error)
      message.error(error.message || '加载失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [pagination.page, pagination.pageSize, filters.type, filters.startDate, filters.endDate, restaurantId, tenantId])

  // 加载统计数据
  const loadStats = async () => {
    if (!restaurantId || !tenantId) {
      return
    }

    setStatsLoading(true)
    try {
      const result = await operationAPI.ledger.getStats({
        restaurantId,
        tenantId,
        type: filters.type,
        startDate: filters.startDate,
        endDate: filters.endDate,
        period: 'monthly',
      })

      if (result && result.code === 0) {
        setStatsData(result.data)
      } else {
        message.error(result?.message || '加载统计数据失败')
      }
    } catch (error: any) {
      console.error('加载统计数据失败:', error)
      message.error(error.message || '加载统计数据失败')
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats()
    }
  }, [activeTab, filters.type, filters.startDate, filters.endDate, restaurantId, tenantId])

  const columns: ColumnsType<LedgerEntry> = [
    {
      title: t('pages.operation.ledger.table.columns.date'),
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
      sorter: true,
    },
    {
      title: t('pages.operation.ledger.table.columns.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config: Record<string, { color: string; text: string }> = {
          energy: { color: 'blue', text: t('pages.operation.ledger.types.energy') },
          waste: { color: 'orange', text: t('pages.operation.ledger.types.waste') },
          training: { color: 'green', text: t('pages.operation.ledger.types.training') },
          other: { color: 'default', text: t('pages.operation.ledger.types.other') },
        }
        const cfg = config[type] || config.other
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
      filters: [
        { text: t('pages.operation.ledger.types.energy'), value: 'energy' },
        { text: t('pages.operation.ledger.types.waste'), value: 'waste' },
        { text: t('pages.operation.ledger.types.training'), value: 'training' },
        { text: t('pages.operation.ledger.types.other'), value: 'other' },
      ],
    },
    {
      title: t('pages.operation.ledger.table.columns.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('pages.operation.ledger.table.columns.value'),
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: LedgerEntry) => `${value} ${record.unit}`,
      sorter: true,
    },
    {
      title: t('pages.operation.ledger.table.columns.actions'),
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small">
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: LedgerEntry) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      date: record.date ? dayjs(record.date) : null,
    })
    setIsModalVisible(true)
  }

  const handleDelete = (record: LedgerEntry) => {
    Modal.confirm({
      title: t('common.confirmDelete'),
      content: t('common.confirmDeleteMessage'),
      onOk: async () => {
        try {
          setLoading(true)
          const result = await operationAPI.ledger.delete(record.ledgerId, tenantId)
          if (result && result.code === 0) {
            message.success(t('common.deleteSuccess'))
            loadData()
          } else {
            message.error(result?.message || t('common.deleteFailed'))
          }
        } catch (error: any) {
          message.error(error.message || t('common.deleteFailed'))
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!restaurantId || !tenantId) {
        message.warning('请先选择餐厅')
        return
      }

      setLoading(true)
      
      const formData = {
        restaurantId,
        tenantId,
        type: values.type,
        date: values.date ? values.date.format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10),
        period: values.period || 'daily',
        description: values.description || '',
        value: values.value,
        unit: values.unit || '',
        energyType: values.energyType || null,
        wasteType: values.wasteType || null,
        trainingType: values.trainingType || null,
        participants: values.participants || null,
        status: 'draft',
      }

      let result
      if (editingRecord) {
        // 更新
        result = await operationAPI.ledger.update(editingRecord.ledgerId, formData)
      } else {
        // 创建
        result = await operationAPI.ledger.create(formData)
      }

      if (result && result.code === 0) {
        message.success(editingRecord ? t('common.updateSuccess') : t('common.createSuccess'))
        setIsModalVisible(false)
        form.resetFields()
        setEditingRecord(null)
        loadData()
      } else {
        message.error(result?.message || (editingRecord ? t('common.updateFailed') : t('common.createFailed')))
      }
    } catch (error: any) {
      console.error('提交失败:', error)
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error.message || (editingRecord ? t('common.updateFailed') : t('common.createFailed')))
    } finally {
      setLoading(false)
    }
  }

  const handleBatchImport = () => {
    message.info(t('pages.operation.ledger.messages.batchImportInProgress'))
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setPagination(prev => ({
      ...prev,
      page: 1 // 重置到第一页
    }))
  }

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0]!.format('YYYY-MM-DD'),
        endDate: dates[1]!.format('YYYY-MM-DD'),
      }))
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: undefined,
        endDate: undefined,
      }))
    }
    setPagination(prev => ({
      ...prev,
      page: 1
    }))
  }

  // 根据类型显示不同的表单字段
  const renderTypeSpecificFields = () => {
    const type = form.getFieldValue('type')
    
    if (type === 'energy') {
      return (
        <Form.Item
          name="energyType"
          label="能源类型"
          rules={[{ required: true, message: '请选择能源类型' }]}
        >
          <Select placeholder="请选择能源类型">
            <Select.Option value="electricity">电力</Select.Option>
            <Select.Option value="gas">燃气</Select.Option>
            <Select.Option value="water">水</Select.Option>
            <Select.Option value="other">其他</Select.Option>
          </Select>
        </Form.Item>
      )
    }
    
    if (type === 'waste') {
      return (
        <Form.Item
          name="wasteType"
          label="浪费类型"
          rules={[{ required: true, message: '请选择浪费类型' }]}
        >
          <Select placeholder="请选择浪费类型">
            <Select.Option value="kitchen_waste">厨余垃圾</Select.Option>
            <Select.Option value="expired">过期食材</Select.Option>
            <Select.Option value="processing_loss">加工损耗</Select.Option>
            <Select.Option value="other">其他</Select.Option>
          </Select>
        </Form.Item>
      )
    }
    
    if (type === 'training') {
      return (
        <>
          <Form.Item
            name="trainingType"
            label="培训类型"
            rules={[{ required: true, message: '请选择培训类型' }]}
          >
            <Select placeholder="请选择培训类型">
              <Select.Option value="staff">员工培训</Select.Option>
              <Select.Option value="customer">顾客教育</Select.Option>
              <Select.Option value="public">公益活动</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="participants"
            label="参与人数"
            rules={[{ required: true, message: '请输入参与人数' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入参与人数" />
          </Form.Item>
        </>
      )
    }
    
    return null
  }

  // 渲染统计视图
  const renderStatsView = () => {
    if (!statsData) {
      return <div style={{ textAlign: 'center', padding: '40px' }}>暂无统计数据</div>
    }

    const trendConfig = {
      data: statsData.trend || [],
      xField: 'period',
      yField: 'value',
      point: {
        size: 5,
        shape: 'diamond',
      },
      label: {
        style: {
          fill: '#aaa',
        },
      },
    }

    const distributionConfig = {
      data: statsData.distribution || [],
      xField: 'type',
      yField: 'value',
      meta: {
        type: { alias: '类型' },
        value: { alias: '数值' },
      },
      label: {
        position: 'middle',
        style: {
          fill: '#FFFFFF',
          opacity: 0.6,
        },
      },
    }

    return (
      <div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总记录数"
                value={statsData.total || 0}
                suffix="条"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总值"
                value={statsData.totalValue || 0}
                suffix={statsData.distribution?.[0]?.unit || ''}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均值"
                value={statsData.avgValue || 0}
                suffix={statsData.distribution?.[0]?.unit || ''}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="最大值"
                value={statsData.maxValue || 0}
                suffix={statsData.distribution?.[0]?.unit || ''}
                precision={2}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Card title="趋势分析" loading={statsLoading}>
              {statsData.trend && statsData.trend.length > 0 ? (
                <Line {...trendConfig} height={300} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>暂无趋势数据</div>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="类型分布" loading={statsLoading}>
              {statsData.distribution && statsData.distribution.length > 0 ? (
                <Column {...distributionConfig} height={300} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>暂无分布数据</div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <div>
      <Card
        title={t('pages.operation.ledger.title')}
        extra={
          <Space>
            {activeTab === 'list' && (
              <>
                <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                  {t('common.refresh')}
                </Button>
                <Button icon={<UploadOutlined />} onClick={handleBatchImport}>
                  {t('common.batchImport')}
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  {t('pages.operation.ledger.buttons.addRecord')}
                </Button>
              </>
            )}
            {activeTab === 'stats' && (
              <Button icon={<ReloadOutlined />} onClick={loadStats} loading={statsLoading}>
                {t('common.refresh')}
              </Button>
            )}
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '台账列表',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }} wrap>
                    <Select
                      placeholder="台账类型"
                      allowClear
                      style={{ width: 150 }}
                      value={filters.type}
                      onChange={(value) => handleFilterChange('type', value)}
                    >
                      <Select.Option value="energy">{t('pages.operation.ledger.types.energy')}</Select.Option>
                      <Select.Option value="waste">{t('pages.operation.ledger.types.waste')}</Select.Option>
                      <Select.Option value="training">{t('pages.operation.ledger.types.training')}</Select.Option>
                      <Select.Option value="other">{t('pages.operation.ledger.types.other')}</Select.Option>
                    </Select>
                    <RangePicker
                      placeholder={['开始日期', '结束日期']}
                      onChange={handleDateRangeChange}
                      value={
                        filters.startDate && filters.endDate
                          ? [dayjs(filters.startDate), dayjs(filters.endDate)]
                          : null
                      }
                    />
                  </Space>

                  <Table
                    columns={columns}
                    dataSource={dataSource}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      current: pagination.page,
                      pageSize: pagination.pageSize,
                      total: pagination.total,
                      showTotal: (total) => t('pages.carbon.baselineList.pagination.total', { total }),
                      onChange: (page, pageSize) => {
                        setPagination(prev => ({
                          ...prev,
                          page,
                          pageSize,
                        }))
                      },
                    }}
                  />
                </>
              ),
            },
            {
              key: 'stats',
              label: (
                <span>
                  <BarChartOutlined /> 统计分析
                </span>
              ),
              children: (
                <>
                  <Space style={{ marginBottom: 16 }} wrap>
                    <Select
                      placeholder="台账类型"
                      allowClear
                      style={{ width: 150 }}
                      value={filters.type}
                      onChange={(value) => handleFilterChange('type', value)}
                    >
                      <Select.Option value="energy">{t('pages.operation.ledger.types.energy')}</Select.Option>
                      <Select.Option value="waste">{t('pages.operation.ledger.types.waste')}</Select.Option>
                      <Select.Option value="training">{t('pages.operation.ledger.types.training')}</Select.Option>
                      <Select.Option value="other">{t('pages.operation.ledger.types.other')}</Select.Option>
                    </Select>
                    <RangePicker
                      placeholder={['开始日期', '结束日期']}
                      onChange={handleDateRangeChange}
                      value={
                        filters.startDate && filters.endDate
                          ? [dayjs(filters.startDate), dayjs(filters.endDate)]
                          : null
                      }
                    />
                  </Space>
                  {renderStatsView()}
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingRecord ? t('common.edit') : t('pages.operation.ledger.modal.title')}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        width={600}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="date"
            label={t('pages.operation.ledger.form.fields.date')}
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="type"
            label={t('pages.operation.ledger.form.fields.type')}
            rules={[{ required: true, message: '请选择台账类型' }]}
          >
            <Select placeholder="请选择台账类型" onChange={() => {
              // 切换类型时清空类型相关字段
              form.setFieldsValue({
                energyType: undefined,
                wasteType: undefined,
                trainingType: undefined,
                participants: undefined,
              })
            }}>
              <Select.Option value="energy">{t('pages.operation.ledger.types.energy')}</Select.Option>
              <Select.Option value="waste">{t('pages.operation.ledger.types.waste')}</Select.Option>
              <Select.Option value="training">{t('pages.operation.ledger.types.training')}</Select.Option>
              <Select.Option value="other">{t('pages.operation.ledger.types.other')}</Select.Option>
            </Select>
          </Form.Item>
          {renderTypeSpecificFields()}
          <Form.Item
            name="period"
            label="记录周期"
            initialValue="daily"
          >
            <Select>
              <Select.Option value="daily">日</Select.Option>
              <Select.Option value="weekly">周</Select.Option>
              <Select.Option value="monthly">月</Select.Option>
              <Select.Option value="yearly">年</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label={t('pages.operation.ledger.form.fields.description')}
            rules={[{ required: true, message: '请输入说明' }]}
          >
            <TextArea rows={3} placeholder={t('pages.operation.ledger.form.placeholders.description')} />
          </Form.Item>
          <Form.Item
            name="value"
            label={t('pages.operation.ledger.form.fields.value')}
            rules={[{ required: true, message: '请输入数值' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder={t('pages.operation.ledger.form.placeholders.value')} min={0} />
          </Form.Item>
          <Form.Item
            name="unit"
            label={t('pages.operation.ledger.form.fields.unit')}
            rules={[{ required: true, message: '请输入单位' }]}
          >
            <Input placeholder={t('pages.operation.ledger.form.placeholders.unit')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OperationLedger
