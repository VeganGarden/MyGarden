/**
 * 错误边界组件
 * 用于捕获子组件的错误并显示友好的错误界面
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Result, Button, Card } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 如果有自定义的 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误界面
      return (
        <Card>
          <Result
            status="error"
            title="页面加载出错"
            subTitle={
              this.state.error
                ? `错误信息: ${this.state.error.message || '未知错误'}`
                : '发生了未知错误，请刷新页面重试'
            }
            extra={[
              <Button
                key="retry"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
              >
                重试
              </Button>,
              <Button
                key="reload"
                onClick={this.handleReload}
              >
                刷新页面
              </Button>
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <div style={{ 
                marginTop: 24, 
                padding: 16, 
                background: '#f5f5f5', 
                borderRadius: 4,
                maxHeight: 300,
                overflow: 'auto'
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error?.stack}
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
          </Result>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
