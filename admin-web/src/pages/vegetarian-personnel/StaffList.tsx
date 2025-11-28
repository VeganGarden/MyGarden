/**
 * 餐厅员工管理页面
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Button, Card, Input, Select, Table, Space, Tag, message, Modal, Skeleton } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { staffAPI } from '@/services/vegetarianPersonnel'
import type { Staff } from '@/types/vegetarianPersonnel'

const { Search } = Input

const StaffListPage: React.FC = () => {
  const { t } = useTranslation()
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
      message.warning(t('pages.vegetarianPersonnel.staffList.messages.noRestaurant'))
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
        message.error(result.error || t('pages.vegetarianPersonnel.staffList.messages.loadFailed'))
        setStaffList([])
        setPagination(prev => ({ ...prev, total: 0 }))
      }
    } catch (error: any) {
      console.error('加载员工数据失败:', error)
      message.error(error.message || t('pages.vegetarianPersonnel.staffList.messages.networkError'))
      setStaffList([])
      setPagination(prev => ({ ...prev, total: 0 }))
    } finally {
      setLoading(false)
    }
  }, [currentRestaurantId, currentTenant, pagination.current, pagination.pageSize, searchKeyword, t])

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
      title: t('pages.vegetarianPersonnel.staffList.messages.deleteConfirm'),
      content: t('pages.vegetarianPersonnel.staffList.messages.deleteConfirmMessage', { name: staff.basicInfo.name }),
      okText: t('pages.vegetarianPersonnel.staffList.buttons.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const result = await staffAPI.delete(staff.staffId)
          if (result.success) {
            message.success(t('pages.vegetarianPersonnel.staffList.messages.deleteSuccess', { name: staff.basicInfo.name }))
            loadData()
          } else {
            message.error(result.error || t('pages.vegetarianPersonnel.staffList.messages.deleteFailed'))
          }
        } catch (error: any) {
          message.error(error.message || t('pages.vegetarianPersonnel.staffList.messages.deleteFailed'))
        }
      }
    })
  }, [loadData, t])

  // 表格列定义（使用 useMemo 优化）
  const columns = useMemo(() => [
    {
      title: t('pages.vegetarianPersonnel.staffList.table.columns.name'),
      dataIndex: ['basicInfo', 'name'],
      key: 'name'
    },
    {
      title: t('pages.vegetarianPersonnel.staffList.table.columns.position'),
      dataIndex: ['basicInfo', 'position'],
      key: 'position'
    },
    {
      title: t('pages.vegetarianPersonnel.staffList.table.columns.isVegetarian'),
      dataIndex: ['vegetarianInfo', 'isVegetarian'],
      key: 'isVegetarian',
      render: (isVegetarian: boolean) => (
        <Tag color={isVegetarian ? 'green' : 'default'}>
          {isVegetarian ? t('pages.vegetarianPersonnel.staffList.yes') : t('pages.vegetarianPersonnel.staffList.no')}
        </Tag>
      )
    },
    {
      title: t('pages.vegetarianPersonnel.staffList.table.columns.vegetarianType'),
      dataIndex: ['vegetarianInfo', 'vegetarianType'],
      key: 'vegetarianType',
      render: (type: string) => {
        if (!type) return '-'
        const typeKey = `pages.vegetarianPersonnel.staffList.vegetarianTypes.${type}`
        const translated = t(typeKey)
        return translated !== typeKey ? translated : type
      }
    },
    {
      title: t('pages.vegetarianPersonnel.staffList.table.columns.vegetarianStartYear'),
      dataIndex: ['vegetarianInfo', 'vegetarianStartYear'],
      key: 'vegetarianStartYear',
      render: (year: number) => year || '-'
    },
    {
      title: t('pages.vegetarianPersonnel.staffList.table.columns.actions'),
      key: 'action',
      render: (_: any, record: Staff) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/vegetarian-personnel/staff/edit/${record.staffId}`)}
          >
            {t('pages.vegetarianPersonnel.staffList.buttons.edit')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            {t('pages.vegetarianPersonnel.staffList.buttons.delete')}
          </Button>
        </Space>
      )
    }
  ], [navigate, handleDelete, t])

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
            placeholder={t('pages.vegetarianPersonnel.staffList.filters.search')}
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
            {t('pages.vegetarianPersonnel.staffList.buttons.stats')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/vegetarian-personnel/staff/add')}
          >
            {t('pages.vegetarianPersonnel.staffList.buttons.add')}
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={staffList}
        rowKey="_id"
        loading={loading}
        locale={{
          emptyText: searchKeyword 
            ? t('pages.vegetarianPersonnel.staffList.messages.emptySearch', { keyword: searchKeyword })
            : t('pages.vegetarianPersonnel.staffList.messages.empty')
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

export default StaffListPage

