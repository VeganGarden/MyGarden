import {
  BulbOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Space } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getCurrentTheme,
  initTheme,
  setTheme,
  Theme,
  toggleTheme,
} from '@/utils/theme'
import styles from './ThemeToggle.module.css'

/**
 * 主题切换组件
 * 支持亮色/暗色/自动三种模式
 */
const ThemeToggle: React.FC = () => {
  const { t } = useTranslation()
  const [currentTheme, setCurrentTheme] = useState<Theme>('light')

  useEffect(() => {
    // 初始化主题
    initTheme()
    setCurrentTheme(getCurrentTheme())

    // 监听主题变化（用于自动模式）
    const handleStorageChange = () => {
      setCurrentTheme(getCurrentTheme())
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleToggle = () => {
    const newTheme = toggleTheme()
    setCurrentTheme(newTheme)
  }

  const handleSelectTheme = (theme: Theme) => {
    setTheme(theme)
    setCurrentTheme(theme)
  }

  const getThemeIcon = () => {
    if (currentTheme === 'auto') {
      return <BulbOutlined />
    }
    return currentTheme === 'dark' ? <MoonOutlined /> : <SunOutlined />
  }

  const getThemeLabel = () => {
    if (currentTheme === 'auto') {
      return t('theme.auto', '自动')
    }
    return currentTheme === 'dark' ? t('theme.dark', '暗色') : t('theme.light', '亮色')
  }

  const menuItems = [
    {
      key: 'light',
      label: (
        <Space>
          <SunOutlined />
          <span>{t('theme.light', '亮色')}</span>
          {currentTheme === 'light' && (
            <span className={styles.checkmark}>✓</span>
          )}
        </Space>
      ),
      onClick: () => handleSelectTheme('light'),
    },
    {
      key: 'dark',
      label: (
        <Space>
          <MoonOutlined />
          <span>{t('theme.dark', '暗色')}</span>
          {currentTheme === 'dark' && (
            <span className={styles.checkmark}>✓</span>
          )}
        </Space>
      ),
      onClick: () => handleSelectTheme('dark'),
    },
    {
      key: 'auto',
      label: (
        <Space>
          <BulbOutlined />
          <span>{t('theme.auto', '自动')}</span>
          {currentTheme === 'auto' && (
            <span className={styles.checkmark}>✓</span>
          )}
        </Space>
      ),
      onClick: () => handleSelectTheme('auto'),
    },
  ]

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button
        type="text"
        icon={getThemeIcon()}
        className={styles.themeButton}
        title={t('theme.switch', '切换主题')}
        onClick={handleToggle}
      >
        {getThemeLabel()}
      </Button>
    </Dropdown>
  )
}

export default ThemeToggle

