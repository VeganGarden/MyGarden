import { App as AntdApp, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App'
import './i18n'; // 初始化 i18n
import './index.css'
import { store } from './store'
import { initCloudbase } from './utils/cloudbase-init'
import { getRegionDisplayName } from './utils/regionHelper'
import { initTheme } from './utils/theme'

// 初始化主题
initTheme()

// 全局错误处理：静默处理浏览器扩展相关的错误
window.addEventListener('error', (event) => {
  // 静默处理浏览器扩展注入脚本的错误（如 React DevTools, Redux DevTools 等）
  if (
    event.filename?.includes('inject.js') ||
    event.filename?.includes('extension://') ||
    event.message?.includes('onPageLoad') ||
    event.message?.includes('Cannot read properties of undefined')
  ) {
    event.preventDefault()
    return false
  }
}, true)

// 全局未捕获的 Promise 错误处理
window.addEventListener('unhandledrejection', (event) => {
  // 静默处理扩展相关的 Promise 错误
  if (
    event.reason?.message?.includes('onPageLoad') ||
    event.reason?.message?.includes('inject.js')
  ) {
    event.preventDefault()
  }
})

// 初始化云开发环境（异步）
initCloudbase().catch((error) => {
  console.error('云开发环境初始化失败:', error)
})

// 预加载区域配置缓存（在应用启动时）
getRegionDisplayName('CN').catch((error) => {
  console.error('预加载区域配置失败:', error)
})

// Ant Design 主题配置 - 使用品牌绿色
const antdTheme = {
  token: {
    colorPrimary: '#22c55e', // 品牌主色：绿色
    colorSuccess: '#52c41a', // 成功色
    colorWarning: '#faad14', // 警告色
    colorError: '#f5222d', // 错误色
    borderRadius: 4, // 圆角
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
  },
  algorithm: theme.defaultAlgorithm, // 使用默认算法，支持亮色/暗色切换
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider locale={zhCN} theme={antdTheme}>
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
)

