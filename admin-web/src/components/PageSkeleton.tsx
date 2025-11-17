import { Skeleton } from 'antd'
import React from 'react'
import styles from './PageSkeleton.module.css'

/**
 * 页面骨架屏组件
 * 用于数据加载时的占位显示
 */
interface PageSkeletonProps {
  rows?: number
  showTitle?: boolean
  showAvatar?: boolean
  showButton?: boolean
}

const PageSkeleton: React.FC<PageSkeletonProps> = ({
  rows = 4,
  showTitle = true,
  showAvatar = false,
  showButton = false,
}) => {
  return (
    <div className={styles.pageSkeleton}>
      {showTitle && (
        <Skeleton
          active
          title={{ width: '40%' }}
          paragraph={false}
          className={styles.skeletonTitle}
        />
      )}
      {showAvatar && (
        <Skeleton
          active
          avatar
          paragraph={{ rows: 3 }}
          className={styles.skeletonAvatar}
        />
      )}
      <Skeleton active paragraph={{ rows }} />
      {showButton && (
        <div className={styles.skeletonButtons}>
          <Skeleton.Button active size="large" style={{ width: 120 }} />
          <Skeleton.Button active size="large" style={{ width: 120 }} />
        </div>
      )}
    </div>
  )
}

export default PageSkeleton

