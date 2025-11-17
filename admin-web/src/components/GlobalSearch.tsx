import { SearchOutlined } from '@ant-design/icons'
import { AutoComplete, Input } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './GlobalSearch.module.css'

interface SearchItem {
  key: string
  label: string
  path: string
  type: 'menu' | 'page' | 'action'
  icon?: React.ReactNode
}

/**
 * 全局搜索组件
 * 支持搜索菜单项、页面和常用操作
 */
const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  // 菜单项数据（可以从配置或路由中获取）
  const menuItems: SearchItem[] = useMemo(() => {
    return [
      // 数据看板
      { key: 'dashboard', label: '数据看板', path: '/dashboard', type: 'menu' },
      
      // 气候餐厅认证
      { key: 'certification-apply', label: '认证申请', path: '/certification/apply', type: 'menu' },
      { key: 'certification-status', label: '认证进度', path: '/certification/status', type: 'menu' },
      { key: 'certification-certificate', label: '证书管理', path: '/certification/certificate', type: 'menu' },
      
      // 碳足迹核算
      { key: 'carbon-menu', label: '菜单碳足迹', path: '/carbon/menu', type: 'menu' },
      { key: 'carbon-order', label: '订单碳统计', path: '/carbon/order', type: 'menu' },
      { key: 'carbon-report', label: '碳报告', path: '/carbon/report', type: 'menu' },
      { key: 'carbon-baseline', label: '基准值管理', path: '/carbon/baseline', type: 'menu' },
      
      // 供应链溯源
      { key: 'traceability-suppliers', label: '供应商管理', path: '/traceability/suppliers', type: 'menu' },
      { key: 'traceability-lots', label: '食材批次', path: '/traceability/lots', type: 'menu' },
      { key: 'traceability-chains', label: '溯源链', path: '/traceability/chains', type: 'menu' },
      { key: 'traceability-certificates', label: '溯源证书', path: '/traceability/certificates', type: 'menu' },
      
      // 餐厅运营
      { key: 'operation-order', label: '订单管理', path: '/operation/order', type: 'menu' },
      { key: 'operation-ledger', label: '运营台账', path: '/operation/ledger', type: 'menu' },
      { key: 'operation-behavior', label: '行为统计', path: '/operation/behavior', type: 'menu' },
      { key: 'operation-coupon', label: '优惠券管理', path: '/operation/coupon', type: 'menu' },
      { key: 'operation-review', label: '用户评价', path: '/operation/review', type: 'menu' },
      
      // 报表与生态
      { key: 'report-business', label: '经营数据报表', path: '/report/business', type: 'menu' },
      { key: 'report-carbon', label: '碳减排报表', path: '/report/carbon', type: 'menu' },
      { key: 'report-esg', label: 'ESG报告', path: '/report/esg', type: 'menu' },
      { key: 'report-dashboard', label: '数据看板', path: '/report/dashboard', type: 'menu' },
      
      // 菜谱管理
      { key: 'recipe-list', label: '菜谱列表', path: '/recipe/list', type: 'menu' },
      { key: 'recipe-create', label: '创建菜谱', path: '/recipe/create', type: 'menu' },
      { key: 'recipe-categories', label: '分类管理', path: '/recipe/categories', type: 'menu' },
      
      // 个人中心
      { key: 'profile', label: '个人中心', path: '/profile', type: 'menu' },
    ]
  }, [])

  // 过滤搜索结果
  const filteredOptions = useMemo(() => {
    if (!searchValue.trim()) {
      return []
    }

    const keyword = searchValue.toLowerCase()
    return menuItems
      .filter((item) => {
        // 支持中文、拼音首字母搜索
        const label = item.label.toLowerCase()
        return label.includes(keyword) || label.includes(keyword)
      })
      .slice(0, 10) // 限制显示10条结果
      .map((item) => ({
        value: item.label,
        label: (
          <div className={styles.searchOption}>
            <span className={styles.searchLabel}>{item.label}</span>
            <span className={styles.searchPath}>{item.path}</span>
          </div>
        ),
        item,
      }))
  }, [searchValue, menuItems])

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchValue(value)
    if (value) {
      setOpen(true)
    }
  }

  // 处理选择
  const handleSelect = (value: string, option: any) => {
    const selectedItem = option.item as SearchItem
    if (selectedItem) {
      navigate(selectedItem.path)
      setOpen(false)
      setSearchValue('')
    }
  }

  // 快捷键支持 (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        // 聚焦到搜索框
        setTimeout(() => {
          const input = document.querySelector(
            '.global-search-input input'
          ) as HTMLInputElement
          input?.focus()
        }, 100)
      }
      // ESC 关闭
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setSearchValue('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <AutoComplete
      open={open}
      onOpenChange={setOpen}
      value={searchValue}
      options={filteredOptions}
      onSearch={handleSearch}
      onSelect={handleSelect}
      className={styles.globalSearch}
      popupClassName={styles.searchDropdown}
      placeholder={`${t('header.searchPlaceholder')} (Ctrl+K)`}
      style={{ width: 300, height: 32 }}
    >
      <Input
        prefix={<SearchOutlined className={styles.searchIcon} />}
        className={`global-search-input ${styles.searchInput}`}
        allowClear
        onPressEnter={() => {
          // 回车选择第一个结果
          if (filteredOptions.length > 0) {
            const firstOption = filteredOptions[0]
            handleSelect(firstOption.value, firstOption)
          }
        }}
      />
    </AutoComplete>
  )
}

export default GlobalSearch

