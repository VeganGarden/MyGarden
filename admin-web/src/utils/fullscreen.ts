/**
 * 全屏API工具函数
 * 封装浏览器全屏API，提供统一的全屏切换接口
 */

/**
 * 切换全屏模式
 */
export const toggleFullscreen = (): void => {
  if (!document.fullscreenElement) {
    // 进入全屏
    const element = document.documentElement
    if (element.requestFullscreen) {
      element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      // Safari
      ;(element as any).webkitRequestFullscreen()
    } else if ((element as any).mozRequestFullScreen) {
      // Firefox
      ;(element as any).mozRequestFullScreen()
    } else if ((element as any).msRequestFullscreen) {
      // IE/Edge
      ;(element as any).msRequestFullscreen()
    }
  } else {
    // 退出全屏
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      // Safari
      ;(document as any).webkitExitFullscreen()
    } else if ((document as any).mozCancelFullScreen) {
      // Firefox
      ;(document as any).mozCancelFullScreen()
    } else if ((document as any).msExitFullscreen) {
      // IE/Edge
      ;(document as any).msExitFullscreen()
    }
  }
}

/**
 * 检查是否处于全屏状态
 */
export const isFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  )
}

/**
 * 监听全屏状态变化
 */
export const onFullscreenChange = (
  callback: (isFullscreen: boolean) => void
): (() => void) => {
  const handler = () => {
    callback(isFullscreen())
  }

  document.addEventListener('fullscreenchange', handler)
  document.addEventListener('webkitfullscreenchange', handler)
  document.addEventListener('mozfullscreenchange', handler)
  document.addEventListener('MSFullscreenChange', handler)

  // 返回清理函数
  return () => {
    document.removeEventListener('fullscreenchange', handler)
    document.removeEventListener('webkitfullscreenchange', handler)
    document.removeEventListener('mozfullscreenchange', handler)
    document.removeEventListener('MSFullscreenChange', handler)
  }
}

