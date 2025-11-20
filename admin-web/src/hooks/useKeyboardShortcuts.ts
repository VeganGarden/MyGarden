import { useEffect } from 'react'

interface ShortcutConfig {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  callback: () => void
  description?: string
}

/**
 * 快捷键管理Hook
 * 支持全局快捷键注册和管理
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const {
          key,
          ctrlKey = false,
          metaKey = false,
          shiftKey = false,
          altKey = false,
          callback,
        } = shortcut

        // 检查是否匹配快捷键
        const isMatch =
          event.key.toLowerCase() === key.toLowerCase() &&
          event.ctrlKey === ctrlKey &&
          event.metaKey === metaKey &&
          event.shiftKey === shiftKey &&
          event.altKey === altKey

        if (isMatch) {
          // 检查是否在输入框中（避免在输入时触发）
          const target = event.target as HTMLElement
          const isInput =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable

          // 某些快捷键即使在输入框中也要触发（如ESC）
          const allowInInput = key === 'Escape' || (ctrlKey && key === 'k')

          if (!isInput || allowInInput) {
            event.preventDefault()
            callback()
          }
        }
      })
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts])
}

/**
 * 常用快捷键配置
 */
export const commonShortcuts = {
  // 全局搜索
  globalSearch: {
    key: 'k',
    ctrlKey: true,
    description: '打开全局搜索',
  },
  // 切换侧边栏
  toggleSider: {
    key: 'b',
    ctrlKey: true,
    description: '切换侧边栏折叠/展开',
  },
  // 帮助文档
  help: {
    key: '/',
    ctrlKey: true,
    description: '打开帮助文档',
  },
  // 退出
  escape: {
    key: 'Escape',
    description: '关闭当前弹窗/下拉菜单',
  },
}

