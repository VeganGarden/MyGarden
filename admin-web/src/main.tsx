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
import { initTheme } from './utils/theme'

// 初始化主题
initTheme()

// 初始化云开发环境（异步）
initCloudbase().catch((error) => {
  console.error('云开发环境初始化失败:', error)
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

