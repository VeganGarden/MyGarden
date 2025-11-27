/**
 * 餐厅员工管理页面
 */

import React, { useEffect, useState } from 'react'
import { Button, Card, Input, Select, Table, Space, Tag, message, Modal } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { callCloudFunction } from '@/utils/cloudFunction'

const { Search } = Input

interface Staff {
  _id: string
  staffId: string
  basicInfo: {
    name: string
    position: string
    joinDate: string
    phone?: string
    email?: string
  }
  vegetarianInfo: {
    isVegetarian: boolean
    vegetarianType: string
    vegetarianStartYear?: number
    vegetarianReason?: string
  }
  createdAt: string
}

const StaffListPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const result = await callCloudFunction('vegetarian-personnel', {
        action: 'listStaff',
        data: {
          page: pagination.current,
          pageSize: pagination.pageSize,
          restaurantId: '', // TODO: 从用户信息获取
          tenantId: '', // TODO: 从用户信息获取
        }
      })

      if (result.code === 0) {
        setStaffList(result.data.list || [])
        setPagination(prev => ({
          ...prev,
          total: result.data.total || 0
        }))
      } else {
        message.error(result.message || '加载失败')
      }
    } catch (error: any) {
      console.error('加载员工数据失败:', error)
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [pagination.current, pagination.pageSize])

  // 删除确认
  const handleDelete = (staff: Staff) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除员工"${staff.basicInfo.name}"吗？`,
      onOk: async () => {
        try {
          const result = await callCloudFunction('vegetarian-personnel', {
            action: 'deleteStaff',
            data: {
              staffId: staff.staffId
            }
          })
          if (result.code === 0) {
            message.success('删除成功')
            loadData()
          } else {
            message.error(result.message || '删除失败')
          }
        } catch (error: any) {
          message.error(error.message || '删除失败')
        }
      }
    })
  }

  // 表格列定义
  const columns = [
    {
      title: '姓名',
      dataIndex: ['basicInfo', 'name'],
      key: 'name'
    },
    {
      title: '岗位',
      dataIndex: ['basicInfo', 'position'],
      key: 'position'
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
      title: '素食开始年份',
      dataIndex: ['vegetarianInfo', 'vegetarianStartYear'],
      key: 'vegetarianStartYear'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Staff) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/vegetarian-personnel/staff/edit/${record.staffId}`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
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
            placeholder="搜索姓名或员工ID"
            style={{ width: 300 }}
            onSearch={(value) => {
              // TODO: 实现搜索
              loadData()
            }}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/vegetarian-personnel/staff/add')}
        >
          添加员工
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={staffList}
        rowKey="_id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }))
          }
        }}
      />
    </Card>
  )
}

export default StaffListPage

