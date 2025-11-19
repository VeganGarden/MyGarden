import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styles from './BrandLogo.module.css'

interface BrandLogoProps {
  collapsed?: boolean
}

/**
 * 品牌Logo组件
 * 显示"谷秀"品牌Logo，支持折叠/展开状态
 * 根据主题自动切换logo：亮色主题使用logo1.png，暗色主题使用logo2.png
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ collapsed = false }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light')

  // 获取当前主题
  const getTheme = (): 'light' | 'dark' => {
    const theme = document.documentElement.getAttribute('data-theme')
    return theme === 'dark' ? 'dark' : 'light'
  }

  // 监听主题变化
  useEffect(() => {
    // 初始化主题
    setCurrentTheme(getTheme())

    // 创建 MutationObserver 监听 data-theme 属性变化
    const observer = new MutationObserver(() => {
      setCurrentTheme(getTheme())
    })

    // 观察 documentElement 的 attributes 变化
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    // 监听系统主题变化（用于自动模式）
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        setCurrentTheme(getTheme())
      }

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else {
        mediaQuery.addListener(handleChange)
      }

      return () => {
        observer.disconnect()
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange)
        } else {
          mediaQuery.removeListener(handleChange)
        }
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  // 根据主题获取logo路径
  const getLogoPath = (isCollapsed: boolean): string => {
    if (isCollapsed) {
      // 折叠状态：使用图标版本
      return currentTheme === 'dark' ? '/logo2.png' : '/logo1.png'
    }
    // 展开状态：使用完整logo
    return currentTheme === 'dark' ? '/logo2.png' : '/logo1.png'
  }

  const handleClick = () => {
    navigate('/dashboard')
  }

  return (
    <div
      className={`${styles.logo} ${collapsed ? styles.collapsed : ''}`}
      onClick={handleClick}
      title={collapsed ? t('logo.title') : t('logo.goHome')}
    >
      {collapsed ? (
        // 折叠状态：显示简化Logo或图标
        <div className={styles.logoIconCollapsed}>
          <img
            src={getLogoPath(true)}
            alt="谷秀"
            className={styles.logoImage}
            key={currentTheme} // 使用 key 强制重新加载图片
            onError={(e) => {
              // 如果图片不存在，显示文字"谷"
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent && !parent.querySelector('.logo-text-collapsed')) {
                const fallback = document.createElement('span')
                fallback.className = 'logo-text-collapsed'
                fallback.textContent = '谷'
                parent.appendChild(fallback)
              }
            }}
          />
        </div>
      ) : (
        // 展开状态：显示完整Logo
        <div className={styles.logoContent}>
          <img
            src={getLogoPath(false)}
            alt="谷秀 - GOOD SHOW CONSULTING"
            className={styles.logoImage}
            key={currentTheme} // 使用 key 强制重新加载图片
            onError={(e) => {
              // 如果图片不存在，显示文字"谷秀"
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent && !parent.querySelector('.logo-text-fallback')) {
                const fallback = document.createElement('span')
                fallback.className = 'logo-text-fallback'
                fallback.textContent = '谷秀'
                parent.appendChild(fallback)
              }
            }}
          />
          <div className={styles.logoText}>
            <span className={styles.logoTextMain}>{t('logo.title')}</span>
            <span className={styles.logoTextSub}>{t('logo.subtitle')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrandLogo

