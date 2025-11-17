import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styles from './BrandLogo.module.css'

interface BrandLogoProps {
  collapsed?: boolean
}

/**
 * 品牌Logo组件
 * 显示"谷秀"品牌Logo，支持折叠/展开状态
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ collapsed = false }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()

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
            src="/logo-icon.svg"
            alt="谷秀"
            className={styles.logoImage}
            onError={(e) => {
              // 如果 SVG 不存在，尝试 PNG
              const target = e.target as HTMLImageElement
              if (target.src.endsWith('.svg')) {
                target.src = '/logo-icon.png'
              } else if (target.src.endsWith('.png')) {
                // PNG 也不存在，显示文字"谷"
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent && !parent.querySelector('.logo-text-collapsed')) {
                  const fallback = document.createElement('span')
                  fallback.className = 'logo-text-collapsed'
                  fallback.textContent = '谷'
                  parent.appendChild(fallback)
                }
              }
            }}
          />
        </div>
      ) : (
        // 展开状态：显示完整Logo
        <div className={styles.logoContent}>
          <img
            src="/logo.svg"
            alt="谷秀 - GOOD SHOW CONSULTING"
            className={styles.logoImage}
            onError={(e) => {
              // 如果 SVG 不存在，尝试 PNG
              const target = e.target as HTMLImageElement
              if (target.src.endsWith('.svg')) {
                target.src = '/logo.png'
              } else if (target.src.endsWith('.png')) {
                // PNG 也不存在，显示文字"谷秀"
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent && !parent.querySelector('.logo-text-fallback')) {
                  const fallback = document.createElement('span')
                  fallback.className = 'logo-text-fallback'
                  fallback.textContent = '谷秀'
                  parent.appendChild(fallback)
                }
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

