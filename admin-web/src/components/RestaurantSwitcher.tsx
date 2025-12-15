import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCurrentRestaurant } from '@/store/slices/tenantSlice'
import { ShopOutlined } from '@ant-design/icons'
import { Select, Tag } from 'antd'
import React from 'react'
import styles from './RestaurantSwitcher.module.css'

/**
 * 餐厅切换器组件
 * 
 * 功能说明：
 * - 对餐厅管理员（restaurant_admin）和碳核算专员（carbon_specialist）角色显示
 * - 允许用户在同一租户下的多个餐厅之间切换查看数据
 * - 其他角色（平台运营、系统管理员）不显示此组件
 *   原因：
 *   1. 平台运营：查看全平台汇总数据，不需要切换餐厅
 *   2. 系统管理员：关注系统级指标，不需要切换餐厅
 *   3. 特定筛选需求可在各自的功能页面实现（如租户管理、碳数据报表等）
 * 
 * 显示条件：
 * - 用户角色必须是 restaurant_admin 或 carbon_specialist
 * - 必须存在当前租户信息（currentTenant）
 */
const RestaurantSwitcher: React.FC = () => {
  const dispatch = useAppDispatch()
  const { currentTenant, currentRestaurantId, restaurants } = useAppSelector((state: any) => state.tenant)
  const { user } = useAppSelector((state: any) => state.auth)

  // 餐厅管理员和碳核算专员显示；其余角色隐藏
  // 即使餐厅列表为空，只要有租户信息就显示（但会提示没有餐厅）
  const canShowSwitcher = (user?.role === 'restaurant_admin' || user?.role === 'carbon_specialist') && currentTenant
  if (!canShowSwitcher) {
    return null
  }
  
  // 如果没有餐厅，显示提示信息
  if (restaurants.length === 0) {
    return (
      <div className={styles.restaurantSwitcher}>
        <ShopOutlined style={{ color: 'var(--brand-primary)', fontSize: 18 }} />
        <span className={styles.tenantInfo}>当前租户：{currentTenant.name}</span>
        <span style={{ color: '#ff4d4f', marginLeft: 8, fontSize: 12 }}>
          （该租户下暂无餐厅数据）
        </span>
      </div>
    )
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

