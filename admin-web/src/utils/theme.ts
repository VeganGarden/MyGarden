/**
 * 主题管理工具函数
 */

export type Theme = 'light' | 'dark' | 'auto'

const THEME_STORAGE_KEY = 'app-theme'

/**
 * 获取系统主题偏好
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

/**
 * 获取当前主题
 */
export const getCurrentTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
  return stored || 'light'
}

/**
 * 应用主题
 */
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement

  if (theme === 'auto') {
    const systemTheme = getSystemTheme()
    root.setAttribute('data-theme', systemTheme)
  } else {
    root.setAttribute('data-theme', theme)
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

/**
 * 初始化主题
 */
export const initTheme = () => {
  const theme = getCurrentTheme()
  applyTheme(theme)

  // 监听系统主题变化（仅在自动模式下）
  if (theme === 'auto' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      root.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }

    // 使用 addEventListener（现代浏览器）
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // 兼容旧浏览器
      mediaQuery.addListener(handleChange)
    }
  }
}

/**
 * 切换主题
 */
export const toggleTheme = (): Theme => {
  const current = getCurrentTheme()
  let next: Theme

  if (current === 'light') {
    next = 'dark'
  } else if (current === 'dark') {
    next = 'auto'
  } else {
    next = 'light'
  }

  applyTheme(next)
  return next
}

/**
 * 设置主题
 */
export const setTheme = (theme: Theme) => {
  applyTheme(theme)
}

