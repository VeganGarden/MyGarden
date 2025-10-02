import React, { useState } from 'react'
import { View, Text, Image, Button, Input } from '@tarojs/components'
import './index.scss'

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleUsernameChange = (value: string) => {
    setUsername(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const handleLogin = () => {
    if (!username.trim()) {
      // 显示错误消息
      console.log('请输入用户名');
      return;
    }
    
    if (!password.trim()) {
      // 显示错误消息
      console.log('请输入密码');
      return;
    }

    setLoading(true)
    setError(null)
    
    // 模拟登录逻辑
    setTimeout(() => {
      setLoading(false)
      // 这里应该调用实际的登录API
      console.log('登录请求:', {
        username: username.trim(),
        password: password.trim()
      })
    }, 1000)
  };

  const handleWechatLogin = () => {
    // 微信登录逻辑
    console.log('微信登录');
  };

  const handleRegister = () => {
    // 跳转到注册页面
    console.log('跳转到注册页面');
  };

  const handleForgotPassword = () => {
    // 忘记密码逻辑
    console.log('忘记密码');
  };

  return (
      <View className='login'>
        {/* 顶部logo区域 */}
        <View className='login-header'>
          <Image 
            className='logo' 
            src='/assets/icons/logo.png'
            mode='aspectFit'
          />
          <Text className='app-name'>我的花园</Text>
          <Text className='app-description'>绿色生活，从种植开始</Text>
        </View>

        {/* 登录表单 */}
        <View className='login-form'>
          <View className='form-group'>
            <Input
              name='username'
              className='login-input'
              placeholder='请输入用户名'
              value={username}
              onInput={(e) => handleUsernameChange(e.detail.value)}
            />
          </View>
          
          <View className='form-group'>
            <Input
              name='password'
              className='login-input'
              password
              placeholder='请输入密码'
              value={password}
              onInput={(e) => handlePasswordChange(e.detail.value)}
            />
          </View>

          <View className='form-actions'>
            <Button
              className='login-button primary'
              loading={loading}
              onClick={handleLogin}
            >
              {loading ? '登录中...' : '登录'}
            </Button>

            <Button
              className='wechat-login-button secondary'
              onClick={handleWechatLogin}
            >
              微信一键登录
            </Button>
          </View>

          {/* 辅助功能 */}
          <View className='login-helpers'>
            <Text 
              className='helper-link' 
              onClick={handleRegister}
            >
              注册新账号
            </Text>
            <Text 
              className='helper-link' 
              onClick={handleForgotPassword}
            >
              忘记密码？
            </Text>
          </View>
        </View>

        {/* 底部信息 */}
        <View className='login-footer'>
          <Text className='footer-text'>
            登录即代表您同意
            <Text className='link'>《用户协议》</Text>
            和
            <Text className='link'>《隐私政策》</Text>
          </Text>
        </View>
      </View>
    );
};

export default Login;