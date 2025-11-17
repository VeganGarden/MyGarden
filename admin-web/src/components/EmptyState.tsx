import { Button, Empty } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styles from './EmptyState.module.css'

/**
 * 空状态组件
 * 用于数据为空时的友好提示
 */
interface EmptyStateProps {
  title?: string
  description?: string
  image?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  type?: 'default' | 'search' | 'data' | 'error'
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  image,
  action,
  type = 'default',
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const defaultConfig = {
    default: {
      title: title || t('common.noData', '暂无数据'),
      description: description || t('empty.default', '当前没有数据，请稍后再试'),
    },
    search: {
      title: t('empty.search', '未找到相关内容'),
      description: t('empty.searchDesc', '请尝试其他关键词或调整搜索条件'),
    },
    data: {
      title: t('empty.data', '暂无数据'),
      description: t('empty.dataDesc', '数据加载中或暂无相关数据'),
    },
    error: {
      title: t('empty.error', '加载失败'),
      description: t('empty.errorDesc', '数据加载失败，请刷新重试'),
    },
  }

  const config = defaultConfig[type]

  const handleAction = () => {
    if (action) {
      action.onClick()
    } else {
      navigate(-1)
    }
  }

  return (
    <div className={styles.emptyState}>
      <Empty
        image={image || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div className={styles.emptyContent}>
            <div className={styles.emptyTitle}>{config.title}</div>
            <div className={styles.emptyDescription}>{config.description}</div>
          </div>
        }
      >
        {action && (
          <Button
            type="primary"
            onClick={handleAction}
            className={styles.emptyAction}
          >
            {action.label}
          </Button>
        )}
      </Empty>
    </div>
  )
}

export default EmptyState

