/**
 * 餐厅选择器组件（表单多选用）
 * 
 * 功能说明：
 * - 用于创建/编辑供应商时选择多个合作餐厅
 * - 支持多选模式
 * - 从Redux store读取当前租户的餐厅列表
 * - 与Header中的RestaurantSwitcher不同：RestaurantSwitcher是单选用于筛选，这个是多选用于表单
 */

import { useAppSelector } from '@/store/hooks'
import { Select } from 'antd'
import React from 'react'

interface RestaurantSelectorProps {
  value?: string[]
  onChange?: (restaurantIds: string[]) => void
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
}

const RestaurantSelector: React.FC<RestaurantSelectorProps> = ({
  value,
  onChange,
  placeholder = '请选择合作餐厅',
  disabled = false,
  allowClear = true,
}) => {
  // 从Redux store获取当前租户的餐厅列表
  const { restaurants, currentTenant } = useAppSelector((state: any) => state.tenant)

  const handleChange = (selectedValues: string[]) => {
    if (onChange) {
      onChange(selectedValues)
    }
  }

  // 如果没有餐厅数据，显示提示
  if (!currentTenant || restaurants.length === 0) {
    return (
      <Select
        mode="multiple"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={true}
        allowClear={allowClear}
        style={{ width: '100%' }}
      >
        <Select.Option value="" disabled>
          当前租户下暂无餐厅
        </Select.Option>
      </Select>
    )
  }

  return (
    <Select
      mode="multiple"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
      options={restaurants.map((restaurant: any) => ({
        value: restaurant.id,
        label: restaurant.name,
      }))}
    />
  )
}

export default RestaurantSelector

