/**
 * 碳排放因子智能联想输入组件
 * 
 * 功能：
 * 1. 用户输入食材名称时，自动推荐数据库中的标准因子
 * 2. 显示因子值和数据来源
 * 3. 支持选中后自动填充因子信息
 */

import { factorManageAPI } from '@/services/factor'
import type { CarbonEmissionFactor } from '@/types/factor'
import { AutoComplete, Tag } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { Option } = AutoComplete

export interface FactorAutoCompleteProps {
  value?: string
  onChange?: (value: string, factor?: CarbonEmissionFactor) => void
  placeholder?: string
  disabled?: boolean
  style?: React.CSSProperties
  onSelect?: (value: string, factor: CarbonEmissionFactor) => void
}

const FactorAutoComplete: React.FC<FactorAutoCompleteProps> = ({
  value,
  onChange,
  placeholder = '输入食材名称，自动推荐标准因子',
  disabled = false,
  style,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [options, setOptions] = useState<Array<{ value: string; factor: CarbonEmissionFactor }>>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState(value || '')

  useEffect(() => {
    setSearchValue(value || '')
  }, [value])

  // 搜索因子
  const handleSearch = useCallback(async (searchText: string) => {
    if (!searchText || searchText.trim().length < 1) {
      setOptions([])
      return
    }

    setLoading(true)
    try {
      const result = await factorManageAPI.search(searchText.trim(), 10)
      if (result.success && result.data) {
        const opts = result.data.map((factor: CarbonEmissionFactor) => ({
          value: factor.name,
          factor,
        }))
        setOptions(opts)
      } else {
        setOptions([])
      }
    } catch (error) {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 处理选择
  const handleSelect = (selectedValue: string, option: any) => {
    const factor = option.factor as CarbonEmissionFactor
    setSearchValue(selectedValue)
    
    if (onChange) {
      onChange(selectedValue, factor)
    }
    
    if (onSelect && factor) {
      onSelect(selectedValue, factor)
    }
  }

  // 处理输入变化
  const handleChange = (newValue: string) => {
    setSearchValue(newValue)
    if (onChange) {
      onChange(newValue, undefined)
    }
    
    // 触发搜索
    if (newValue && newValue.trim().length >= 1) {
      handleSearch(newValue)
    } else {
      setOptions([])
    }
  }

  return (
    <AutoComplete
      value={searchValue}
      options={options.map((opt) => ({
        value: opt.value,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{opt.factor.name}</span>
            <div>
              <Tag color="blue" style={{ marginRight: 4 }}>
                {(opt.factor.factorValue ?? 0).toFixed(2)} {opt.factor.unit}
              </Tag>
              <Tag color="default">{opt.factor.source}</Tag>
            </div>
          </div>
        ),
        factor: opt.factor,
      }))}
      onSearch={handleSearch}
      onChange={handleChange}
      onSelect={handleSelect}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      notFoundContent={loading ? '搜索中...' : '暂无匹配的因子'}
      filterOption={false} // 不使用本地过滤，完全依赖后端搜索
      allowClear
    >
      {/* 兼容旧版API，使用Option方式 */}
      {options.map((opt) => (
        <Option key={opt.factor.factorId} value={opt.value} factor={opt.factor}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{opt.factor.name}</span>
            <div>
              <Tag color="blue" style={{ marginRight: 4 }}>
                {(opt.factor.factorValue ?? 0).toFixed(2)} {opt.factor.unit}
              </Tag>
              <Tag color="default">{opt.factor.source}</Tag>
            </div>
          </div>
        </Option>
      ))}
    </AutoComplete>
  )
}

export default FactorAutoComplete

