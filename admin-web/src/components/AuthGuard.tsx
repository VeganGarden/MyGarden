import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout, setCredentials } from '@/store/slices/authSlice'
import { validateUserStorage } from '@/utils/storage'
import React, { useEffect, useRef } from 'react'
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
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    // 如果不在登录页，检查认证状态
    if (location.pathname !== '/login') {
      // 检查是否有token（最基本的认证检查）
      const token = localStorage.getItem('admin_token')
      if (!token) {
        console.log('[AuthGuard] 未找到token，跳转到登录页')
        dispatch(logout())
        navigate('/login', { replace: true })
        return
      }

      // 从localStorage读取用户信息（作为备用，因为Redux store可能还没更新）
      let storedUser = null
      try {
        const storedUserStr = localStorage.getItem('admin_user')
        if (storedUserStr) {
          storedUser = JSON.parse(storedUserStr)
        }
      } catch (error) {
        console.error('[AuthGuard] 解析localStorage用户信息失败:', error)
      }

      // 如果Redux store中没有用户信息，但localStorage中有，则恢复用户信息
      if (!user && storedUser) {
        console.log('[AuthGuard] 从localStorage恢复用户信息到Redux store')
        dispatch(
          setCredentials({
            user: storedUser,
            token: token,
            permissions: storedUser.permissions || [],
          })
        )
        // 恢复后，等待下一个渲染周期再检查
        return
      }

      // 使用Redux store中的user，如果不存在则使用localStorage中的
      const currentUser = user || storedUser

      if (!currentUser) {
        console.log('[AuthGuard] 未找到用户信息，跳转到登录页', {
          hasReduxUser: !!user,
          hasStoredUser: !!storedUser,
        })
        dispatch(logout())
        navigate('/login', { replace: true })
        return
      }

      // 确保用户有必要的字段
      if (!currentUser.id || !currentUser.role) {
        console.error('[AuthGuard] 用户信息不完整:', {
          id: currentUser.id,
          role: currentUser.role,
          user: currentUser,
        })
        dispatch(logout())
        navigate('/login', { replace: true })
        return
      }

      // 验证localStorage中的用户信息是否与当前用户一致
      const isValid = validateUserStorage(currentUser.id, currentUser.role)
      if (!isValid) {
        console.log('[AuthGuard] 用户信息验证失败，清除登录状态', {
          userId: currentUser.id,
          userRole: currentUser.role,
        })
        dispatch(logout())
        navigate('/login', { replace: true })
        return
      }

      // 验证通过
      if (!hasCheckedRef.current) {
        console.log('[AuthGuard] 用户验证通过', {
          userId: currentUser.id,
          role: currentUser.role,
          pathname: location.pathname,
        })
        hasCheckedRef.current = true
      }
    } else {
      // 在登录页时重置检查标志
      hasCheckedRef.current = false
    }
  }, [location.pathname, isAuthenticated, user, navigate, dispatch])

  return <>{children}</>
}

export default AuthGuard


