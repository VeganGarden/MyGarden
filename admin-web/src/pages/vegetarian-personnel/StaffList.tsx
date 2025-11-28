/**
 * 餐厅员工管理页面
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Button, Card, Input, Select, Table, Space, Tag, message, Modal, Skeleton } from 'antd'
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

  // 加载数据（使用 useCallback 优化）
  const loadData = useCallback(async () => {
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
  }, [currentRestaurantId, currentTenant, pagination.current, pagination.pageSize, searchKeyword])

  // 搜索防抖
  useEffect(() => {
    if (!currentRestaurantId || !currentTenant) return

    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, current: 1 }))
      loadData()
    }, 500) // 500ms 防抖

    return () => clearTimeout(timer)
  }, [searchKeyword, currentRestaurantId, currentTenant, loadData])

  useEffect(() => {
    if (currentRestaurantId && currentTenant) {
      loadData()
    }
  }, [pagination.current, pagination.pageSize, currentRestaurantId, loadData])

  // 删除确认（使用 useCallback 优化）
  const handleDelete = useCallback((staff: Staff) => {
    Modal.confirm({
      title: '确认删除员工',
      content: `确定要删除员工"${staff.basicInfo.name}"吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await staffAPI.delete(staff.staffId)
          if (result.success) {
            message.success(`员工"${staff.basicInfo.name}"已删除`)
            loadData()
          } else {
            message.error(result.error || '删除失败，请重试')
          }
        } catch (error: any) {
          message.error(error.message || '删除失败，请检查网络连接')
        }
      }
    })
  }, [loadData])

  // 表格列定义（使用 useMemo 优化）
  const columns = useMemo(() => [
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
  ], [navigate, handleDelete])

  if (loading && staffList.length === 0 && pagination.total === 0) {
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
            placeholder="搜索姓名或员工ID"
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
        </Space>
        <Space wrap>
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
        locale={{
          emptyText: searchKeyword ? `未找到包含"${searchKeyword}"的员工` : '暂无员工数据，点击"添加员工"开始添加'
        }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total) => `共 ${total} 条`,
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

export default StaffListPage

