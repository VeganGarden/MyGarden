import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import React from 'react'
import styles from './DataCard.module.css'

/**
 * 数据卡片组件
 * 用于展示关键数据指标
 */
interface DataCardProps {
  title: string
  value: string | number
  trend?: {
    value: number
    type: 'up' | 'down'
    label?: string
  }
  icon?: React.ReactNode
  suffix?: string
  onClick?: () => void
}

const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  trend,
  icon,
  suffix,
  onClick,
}) => {
  return (
    <div
      className={`${styles.dataCard} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
    >
      <div className={styles.dataCardHeader}>
        <span className={styles.dataCardTitle}>{title}</span>
        {icon && <div className={styles.dataCardIcon}>{icon}</div>}
      </div>
      <div className={styles.dataCardValue}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className={styles.dataCardSuffix}>{suffix}</span>}
      </div>
      {trend && (
        <div
          className={`${styles.dataCardTrend} ${
            trend.type === 'up' ? styles.dataCardTrendUp : styles.dataCardTrendDown
          }`}
        >
          {trend.type === 'up' ? (
            <ArrowUpOutlined />
          ) : (
            <ArrowDownOutlined />
          )}
          <span>{Math.abs(trend.value)}%</span>
          {trend.label && <span className={styles.dataCardTrendLabel}>{trend.label}</span>}
        </div>
      )}
    </div>
  )
}

export default DataCard

