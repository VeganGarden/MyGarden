import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCurrentRestaurant } from '@/store/slices/tenantSlice'
import { ShopOutlined } from '@ant-design/icons'
import { Select, Tag } from 'antd'
import React from 'react'
import styles from './RestaurantSwitcher.module.css'

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
    <div className={styles.restaurantSwitcher}>
      <ShopOutlined style={{ color: 'var(--brand-primary)', fontSize: 18 }} />
      <span className={styles.tenantInfo}>当前租户：{currentTenant.name}</span>
      <Select
        value={currentRestaurantId || 'all'}
        onChange={handleChange}
        className={styles.selectWrapper}
        style={{ minWidth: 200, height: 32 }}
      >
        <Select.Option value="all">
          <span>查看所有餐厅</span>
        </Select.Option>
        {restaurants.map((restaurant: any) => (
          <Select.Option key={restaurant.id} value={restaurant.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{restaurant.name}</span>
              {restaurant.certificationLevel && (
                <Tag
                  color={
                    restaurant.certificationLevel === 'gold'
                      ? 'gold'
                      : restaurant.certificationLevel === 'silver'
                      ? 'default'
                      : restaurant.certificationLevel === 'bronze'
                      ? 'orange'
                      : 'cyan'
                  }
                  style={{ margin: 0, lineHeight: '1.2', padding: '2px 6px', fontSize: '11px' }}
                >
                  {restaurant.certificationLevel === 'gold'
                    ? '金牌'
                    : restaurant.certificationLevel === 'silver'
                    ? '银牌'
                    : restaurant.certificationLevel === 'bronze'
                    ? '铜牌'
                    : '白金'}
                </Tag>
              )}
            </div>
          </Select.Option>
        ))}
      </Select>
      {currentRestaurant && (
        <Tag className={styles.currentTag}>
          当前：{currentRestaurant.name}
        </Tag>
      )}
    </div>
  )
}

export default RestaurantSwitcher

