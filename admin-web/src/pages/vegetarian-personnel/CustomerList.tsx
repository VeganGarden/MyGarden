/**
 * 客户列表页面
 */

import React, { useEffect, useState } from 'react'
import { Button, Card, Input, Select, Table, Space, Tag, message, Modal } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { customerAPI } from '@/services/vegetarianPersonnel'
import type { Customer } from '@/types/vegetarianPersonnel'
import { CustomerVegetarianType, VegetarianYears } from '@/types/vegetarianPersonnel'

const { Search } = Input

const CustomerListPage: React.FC = () => {
  const navigate = useNavigate()
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
    setLoading(true)
    try {
      const result = await customerAPI.list({
        page: pagination.current,
        pageSize: pagination.pageSize,
        restaurantId: '', // TODO: 从用户信息获取
        tenantId: '', // TODO: 从用户信息获取
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
        message.error(result.error || '加载失败')
        setCustomerList([])
        setPagination(prev => ({ ...prev, total: 0 }))
      }
    } catch (error: any) {
      console.error('加载客户数据失败:', error)
      message.error(error.message || '网络错误')
      setCustomerList([])
      setPagination(prev => ({ ...prev, total: 0 }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize, filterVegetarian])

  // 表格列定义
  const columns = [
    {
      title: '客户ID',
      dataIndex: 'customerId',
      key: 'customerId',
      width: 150
    },
    {
      title: '昵称',
      dataIndex: ['basicInfo', 'nickname'],
      key: 'nickname',
      render: (nickname: string) => nickname || '-'
    },
    {
      title: '手机号',
      dataIndex: ['basicInfo', 'phone'],
      key: 'phone',
      render: (phone: string) => phone || '-'
    },
    {
      title: '是否素食',
      dataIndex: ['vegetarianInfo', 'isVegetarian'],
      key: 'isVegetarian',
      render: (isVegetarian: boolean) => (
        <Tag color={isVegetarian ? 'green' : 'default'}>
          {isVegetarian ? '是' : '否'}
        </Tag>
      )
    },
    {
      title: '素食类型',
      dataIndex: ['vegetarianInfo', 'vegetarianType'],
      key: 'vegetarianType',
      render: (type: string) => {
        if (!type) return '-'
        const typeMap: Record<string, string> = {
          regular: '常态素食',
          occasional: '偶尔素食',
          ovo_lacto: '蛋奶素',
          pure: '纯素',
          other: '其他'
        }
        return typeMap[type] || type
      }
    },
    {
      title: '素食年限',
      dataIndex: ['vegetarianInfo', 'vegetarianYears'],
      key: 'vegetarianYears',
      render: (years: string) => {
        if (!years) return '-'
        const yearsMap: Record<string, string> = {
          less_than_1: '1年以下',
          '1_2': '1-2年',
          '3_5': '3-5年',
          '5_10': '5-10年',
          more_than_10: '10年以上'
        }
        return yearsMap[years] || years
      }
    },
    {
      title: '总订单数',
      dataIndex: ['consumptionStats', 'totalOrders'],
      key: 'totalOrders',
      render: (count: number) => count || 0
    },
    {
      title: '最后消费日期',
      dataIndex: ['consumptionStats', 'lastOrderDate'],
      key: 'lastOrderDate',
      render: (date: Date | string) => {
        if (!date) return '-'
        return typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0]
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Customer) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/vegetarian-personnel/customers/${record.customerId}`)}
          >
            查看详情
          </Button>
        </Space>
      )
    }
  ]

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Search
            placeholder="搜索客户ID或手机号"
            style={{ width: 300 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={() => {
              setPagination(prev => ({ ...prev, current: 1 }))
              loadData()
            }}
            allowClear
          />
          <Select
            placeholder="筛选素食"
            style={{ width: 150 }}
            allowClear
            value={filterVegetarian}
            onChange={(value) => {
              setFilterVegetarian(value)
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
          >
            <Select.Option value={true}>素食客户</Select.Option>
            <Select.Option value={false}>非素食客户</Select.Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={customerList}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }))
          }
        }}
      />
    </Card>
  )
}

export default CustomerListPage

