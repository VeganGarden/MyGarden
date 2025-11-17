import { isFullscreen, onFullscreenChange, toggleFullscreen } from '@/utils/fullscreen'
import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import React, { useEffect, useState } from 'react'
import styles from './FullscreenToggle.module.css'

/**
 * 全屏切换组件
 */
const FullscreenToggle: React.FC = () => {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    // 初始化全屏状态
    setFullscreen(isFullscreen())

    // 监听全屏状态变化
    const cleanup = onFullscreenChange((isFullscreen) => {
      setFullscreen(isFullscreen)
    })

    return cleanup
  }, [])

  const handleToggle = () => {
    toggleFullscreen()
  }

  return (
    <Button
      type="text"
      icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
      onClick={handleToggle}
      className={styles.fullscreenButton}
      title={fullscreen ? '退出全屏' : '全屏'}
    />
  )
}

export default FullscreenToggle

