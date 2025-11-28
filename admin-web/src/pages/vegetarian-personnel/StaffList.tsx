/**
 * 餐厅员工管理页面
 */

import React, { useEffect, useState } from 'react'
import { Button, Card, Input, Select, Table, Space, Tag, message, Modal } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { staffAPI } from '@/services/vegetarianPersonnel'
import type { Staff } from '@/types/vegetarianPersonnel'

const { Search } = Input

const StaffListPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentRestaurantId, currentTenant } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  const [searchKeyword, setSearchKeyword] = useState('')

  // 加载数据
  const loadData = async () => {
    if (!currentRestaurantId || !currentTenant) {
      message.warning('请先选择餐厅')
      return
    }

    setLoading(true)
    try {
      const tenantId = currentTenant.id || currentTenant._id || ''
      const result = await staffAPI.list({
        page: pagination.current,
        pageSize: pagination.pageSize,
        restaurantId: currentRestaurantId,
        tenantId: tenantId,
        search: searchKeyword || undefined
      })

      if (result.success && result.data) {
        setStaffList(result.data.list || [])
        setPagination(prev => ({
          ...prev,
          total: result.data!.total || 0
        }))
      } else {
        message.error(result.error || '加载失败')
        setStaffList([])
        setPagination(prev => ({ ...prev, total: 0 }))
      }
    } catch (error: any) {
      console.error('加载员工数据失败:', error)
      message.error(error.message || '网络错误')
      setStaffList([])
      setPagination(prev => ({ ...prev, total: 0 }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentRestaurantId && currentTenant) {
      loadData()
    }
  }, [pagination.current, pagination.pageSize, currentRestaurantId, searchKeyword])

  // 删除确认
  const handleDelete = (staff: Staff) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除员工"${staff.basicInfo.name}"吗？`,
      onOk: async () => {
        const result = await staffAPI.delete(staff.staffId)
        if (result.success) {
          message.success('删除成功')
          loadData()
        } else {
          message.error(result.error || '删除失败')
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
        return typeMap[type] || type || '-'
      }
    },
    {
      title: '素食开始年份',
      dataIndex: ['vegetarianInfo', 'vegetarianStartYear'],
      key: 'vegetarianStartYear',
      render: (year: number) => year || '-'
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
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={() => {
              setPagination(prev => ({ ...prev, current: 1 }))
              loadData()
            }}
            allowClear
          />
        </Space>
        <Space>
          <Button onClick={() => navigate('/vegetarian-personnel/staff/stats')}>
            统计
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/vegetarian-personnel/staff/add')}
          >
            添加员工
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={staffList}
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

export default StaffListPage

