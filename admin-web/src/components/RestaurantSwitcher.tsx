import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCurrentRestaurant } from '@/store/slices/tenantSlice'
import { ShopOutlined } from '@ant-design/icons'
import { Select, Space, Tag } from 'antd'
import React from 'react'

const RestaurantSwitcher: React.FC = () => {
  const dispatch = useAppDispatch()
  const { currentTenant, currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const { user } = useAppSelector((state: any) => state.auth)

  // 仅餐厅管理员显示；其余角色隐藏
  if (user?.role !== 'restaurant_admin' || !currentTenant || restaurants.length === 0) {
    return null
  }

  const handleChange = (value: string) => {
    dispatch(setCurrentRestaurant(value === 'all' ? null : value))
  }

  const currentRestaurant = currentRestaurantId
    ? restaurants.find((r: any) => r.id === currentRestaurantId)
    : null

  return (
    <Space>
      <ShopOutlined style={{ color: '#1890ff' }} />
      <span style={{ color: '#666', fontSize: 14 }}>当前租户：{currentTenant.name}</span>
      <Select
        value={currentRestaurantId || 'all'}
        onChange={handleChange}
        style={{ width: 200 }}
        size="small"
      >
        <Select.Option value="all">
          <span>查看所有餐厅</span>
        </Select.Option>
        {restaurants.map((restaurant: any) => (
          <Select.Option key={restaurant.id} value={restaurant.id}>
            <Space>
              <span>{restaurant.name}</span>
              {restaurant.certificationLevel && (
                <Tag color="gold">
                  {restaurant.certificationLevel === 'gold'
                    ? '金牌'
                    : restaurant.certificationLevel === 'silver'
                    ? '银牌'
                    : restaurant.certificationLevel === 'bronze'
                    ? '铜牌'
                    : '白金'}
                </Tag>
              )}
            </Space>
          </Select.Option>
        ))}
      </Select>
      {currentRestaurant && (
        <Tag color="blue" style={{ marginLeft: 8 }}>
          当前：{currentRestaurant.name}
        </Tag>
      )}
    </Space>
  )
}

export default RestaurantSwitcher

