import { Spin } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './PageLoading.module.css'

/**
 * 页面加载组件
 * 用于页面切换时的加载状态显示
 * 使用品牌色和优化的动画效果
 */
interface PageLoadingProps {
  tip?: string
  size?: 'small' | 'default' | 'large'
}

const PageLoading: React.FC<PageLoadingProps> = ({
  tip,
  size = 'large',
}) => {
  const { t } = useTranslation()
  const loadingText = tip || t('common.loading', '加载中...')

  return (
    <div className={styles.pageLoading}>
      <div className={styles.loadingContainer}>
        <Spin
          size={size}
          tip={loadingText}
          className={styles.brandSpin}
        />
      </div>
    </div>
  )
}

export default PageLoading

