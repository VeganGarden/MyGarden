import { useAppSelector } from '@/store/hooks'
import { Result, Button } from 'antd'
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * 路由权限守卫组件
 * 用于控制特定路由的访问权限
 * 
 * @param allowedRoles 允许访问的角色列表
 * @param children 子组件
 */
interface RouteGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallbackPath?: string
}

const RouteGuard: React.FC<RouteGuardProps> = ({ 
  allowedRoles, 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { user } = useAppSelector((state: any) => state.auth)

  // 如果没有用户信息，等待AuthGuard处理
  if (!user) {
    return null
  }

  // 检查用户角色是否在允许列表中
  const userRole = user?.role
  const hasPermission = allowedRoles.includes(userRole)

  if (!hasPermission) {
    return (
      <Result
        status="403"
        title="403"
        subTitle={t('common.noPermission') || '抱歉，您没有权限访问此页面。'}
        extra={
          <Button type="primary" onClick={() => navigate(fallbackPath)}>
            {t('common.backToDashboard')}
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}

export default RouteGuard

