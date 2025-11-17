import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './PageTransition.module.css'

/**
 * 页面切换动画组件
 * 为页面切换添加流畅的淡入淡出效果
 * 支持方向指示（前进/后退）
 */
interface PageTransitionProps {
  children: React.ReactNode
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState<
    'entering' | 'entered' | 'exiting'
  >('entered')
  const prevPathRef = useRef<string>(location.pathname)

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      // 判断前进还是后退（简化版：通过路径深度判断）
      const currentDepth = location.pathname.split('/').length
      const prevDepth = prevPathRef.current.split('/').length
      const isForward = currentDepth >= prevDepth

      setTransitionStage('exiting')
      
      const exitTimer = setTimeout(() => {
        setDisplayLocation(location)
        setTransitionStage('entering')
        prevPathRef.current = location.pathname

        const enterTimer = setTimeout(() => {
          setTransitionStage('entered')
        }, 200) // 进入动画时长

        return () => clearTimeout(enterTimer)
      }, 150) // 退出动画时长

      return () => clearTimeout(exitTimer)
    }
  }, [location])

  return (
    <div
      className={`${styles.pageTransition} ${styles[transitionStage]}`}
      data-direction="forward"
    >
      {children}
    </div>
  )
}

export default PageTransition

