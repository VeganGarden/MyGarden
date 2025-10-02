import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('组件渲染错误:', error, errorInfo);
    // 可以在这里上报错误到监控系统
    Taro.reportAnalytics('error_boundary', {
      error_message: error.message,
      error_stack: error.stack?.substring(0, 200) || '',
      component_stack: errorInfo.componentStack?.substring(0, 200) || ''
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoHome = () => {
    Taro.reLaunch({
      url: '/pages/index/index'
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="error-boundary">
          <View className="error-content">
            <Text className="error-icon">⚠️</Text>
            <Text className="error-title">页面加载失败</Text>
            <Text className="error-message">
              {this.state.error?.message || '未知错误'}
            </Text>
            <View className="error-actions">
              <Button className="retry-button" onClick={this.handleRetry}>
                重试
              </Button>
              <Button className="home-button" onClick={this.handleGoHome}>
                返回首页
              </Button>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;