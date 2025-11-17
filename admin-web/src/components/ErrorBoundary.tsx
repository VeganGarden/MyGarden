import { Button, Result } from 'antd'
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './ErrorBoundary.module.css'

/**
 * 错误边界组件
 * 捕获子组件的错误并显示友好的错误页面
 */
interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 可以在这里记录错误到日志服务
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className={styles.errorBoundary}>
          <Result
            status="500"
            title="500"
            subTitle="抱歉，页面出现了错误"
            extra={
              <Button type="primary" onClick={this.handleReset}>
                重试
              </Button>
            }
          />
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

