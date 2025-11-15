import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { validateUserStorage } from '@/utils/storage'
import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * 认证守卫组件
 * 用于验证用户登录状态和用户信息一致性
 */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAppSelector((state: any) => state.auth)

  useEffect(() => {
    // 如果不在登录页，检查认证状态
    if (location.pathname !== '/login') {
      if (!isAuthenticated || !user) {
        // 未登录，跳转到登录页
        navigate('/login')
        return
      }

      // 验证localStorage中的用户信息是否与当前用户一致
      const isValid = validateUserStorage(user.id || '', user.role || '')
      if (!isValid) {
        // 用户信息不匹配，清除并重新登录
        console.log('用户信息验证失败，清除登录状态')
        dispatch(logout())
        navigate('/login')
        return
      }
    }
  }, [location.pathname, isAuthenticated, user, navigate, dispatch])

  return <>{children}</>
}

export default AuthGuard


