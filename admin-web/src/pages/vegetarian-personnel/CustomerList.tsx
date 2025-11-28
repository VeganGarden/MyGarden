/**
 * 客户列表页面
 */

import { customerAPI } from '@/services/vegetarianPersonnel'
import { useAppSelector } from '@/store/hooks'
import type { Customer } from '@/types/vegetarianPersonnel'
import { EyeOutlined } from '@ant-design/icons'
import { Button, Card, Input, Select, Space, Table, Tag, message, Skeleton } from 'antd'
import { useTranslation } from 'react-i18next'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const { Search } = Input

const CustomerListPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [customerList, setCustomerList] = useState<Customer[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterVegetarian, setFilterVegetarian] = useState<boolean | undefined>(undefined)

  // 加载数据
  const loadData = async () => {
    if (!currentRestaurantId || !currentTenant) {
      message.warning(t('pages.vegetarianPersonnel.customerList.messages.noRestaurant'))
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const tenantId = currentTenant.id || currentTenant._id || ''
      const result = await customerAPI.list({
        page: pagination.current,
        pageSize: pagination.pageSize,
        restaurantId: currentRestaurantId,
        tenantId: tenantId,
        search: searchKeyword || undefined,
        filters: {
          isVegetarian: filterVegetarian
        }
      })

      if (result.success && result.data) {
        setCustomerList(result.data.list || [])
        setPagination(prev => ({
          ...prev,
          total: result.data!.total || 0
        }))
      } else {
        message.error(result.error || t('pages.vegetarianPersonnel.customerList.messages.loadFailed'))
        setCustomerList([])
        setPagination(prev => ({ ...prev, total: 0 }))
      }
    } catch (error: any) {
      console.error('加载客户数据失败:', error)
      message.error(error.message || t('pages.vegetarianPersonnel.customerList.messages.networkError'))
      setCustomerList([])
      setPagination(prev => ({ ...prev, total: 0 }))
    } finally {
      setLoading(false)
    }
  }

  // 搜索防抖
  useEffect(() => {
    if (!currentRestaurantId || !currentTenant) return

    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, current: 1 }))
      loadData()
    }, 500) // 500ms 防抖

    return () => clearTimeout(timer)
  }, [searchKeyword])

  useEffect(() => {
    if (currentRestaurantId && currentTenant) {
      loadData()
    }
  }, [pagination.current, pagination.pageSize, currentRestaurantId, filterVegetarian])

  // 表格列定义
  const columns = [
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.customerId'),
      dataIndex: 'customerId',
      key: 'customerId',
      width: 150
    },
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.nickname'),
      dataIndex: ['basicInfo', 'nickname'],
      key: 'nickname',
      render: (nickname: string) => nickname || '-'
    },
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.phone'),
      dataIndex: ['basicInfo', 'phone'],
      key: 'phone',
      render: (phone: string) => phone || '-'
    },
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.isVegetarian'),
      dataIndex: ['vegetarianInfo', 'isVegetarian'],
      key: 'isVegetarian',
      render: (isVegetarian: boolean) => (
        <Tag color={isVegetarian ? 'green' : 'default'}>
          {isVegetarian ? t('pages.vegetarianPersonnel.customerList.yes') : t('pages.vegetarianPersonnel.customerList.no')}
        </Tag>
      )
    },
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.vegetarianType'),
      dataIndex: ['vegetarianInfo', 'vegetarianType'],
      key: 'vegetarianType',
      render: (type: string) => {
        if (!type) return '-'
        const typeKey = `pages.vegetarianPersonnel.customerList.vegetarianTypes.${type}`
        const translated = t(typeKey)
        return translated !== typeKey ? translated : type
      }
    },
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.vegetarianYears'),
      dataIndex: ['vegetarianInfo', 'vegetarianYears'],
      key: 'vegetarianYears',
      render: (years: string) => {
        if (!years) return '-'
        const yearsKey = `pages.vegetarianPersonnel.customerList.vegetarianYears.${years}`
        const translated = t(yearsKey)
        return translated !== yearsKey ? translated : years
      }
    },
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.totalOrders'),
      dataIndex: ['consumptionStats', 'totalOrders'],
      key: 'totalOrders',
      render: (count: number) => count || 0
    },
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.lastOrderDate'),
      dataIndex: ['consumptionStats', 'lastOrderDate'],
      key: 'lastOrderDate',
      render: (date: Date | string) => {
        if (!date) return '-'
        return typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0]
      }
    },
    {
      title: t('pages.vegetarianPersonnel.customerList.table.columns.actions'),
      key: 'action',
      render: (_: any, record: Customer) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/vegetarian-personnel/customers/${record.customerId}`)}
          >
            {t('pages.vegetarianPersonnel.customerList.buttons.viewDetail')}
          </Button>
        </Space>
      )
    }
  ]

  if (loading && customerList.length === 0 && pagination.total === 0) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    )
  }

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
        <Space wrap>
          <Search
            placeholder={t('pages.vegetarianPersonnel.customerList.filters.search')}
            style={{ width: 300, maxWidth: '100%' }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={() => {
              setPagination(prev => ({ ...prev, current: 1 }))
              loadData()
            }}
            onPressEnter={() => {
              setPagination(prev => ({ ...prev, current: 1 }))
              loadData()
            }}
            allowClear
          />
          <Select
            placeholder={t('pages.vegetarianPersonnel.customerList.filters.vegetarian')}
            style={{ width: 150 }}
            allowClear
            value={filterVegetarian}
            onChange={(value) => {
              setFilterVegetarian(value)
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
          >
            <Select.Option value={true}>{t('pages.vegetarianPersonnel.customerList.filters.vegetarianCustomer')}</Select.Option>
            <Select.Option value={false}>{t('pages.vegetarianPersonnel.customerList.filters.nonVegetarianCustomer')}</Select.Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={customerList}
        rowKey="_id"
        loading={loading}
        locale={{
          emptyText: searchKeyword || filterVegetarian !== undefined 
            ? t('pages.vegetarianPersonnel.customerList.messages.emptyFilter')
            : t('pages.vegetarianPersonnel.customerList.messages.empty')
        }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => t('common.showTotal', { total }),
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }))
          }
        }}
      />
    </Card>
  )
}

export default CustomerListPage

