import React, { useState } from 'react'
import { View, Text, Image, Button, Input } from '@tarojs/components'
import './index.scss'
import Taro from '@tarojs/taro'

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
      Taro.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    
    if (!password.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    setLoading(true)
    setError(null)
    
    // 模拟登录逻辑
    setTimeout(() => {
      setLoading(false)
      Taro.showToast({ title: '登录成功', icon: 'success' });
      Taro.switchTab({ url: '/pages/index/index' });
    }, 1000)
  };

  const handleWechatLogin = async () => {
    try {
      const res = await Taro.login();
      if (res.code) {
        // 调用后端接口，使用 code 换取用户信息
        Taro.showLoading({ title: '登录中...' });
        const loginRes = await Taro.request({
          url: 'https://your-backend-api.com/wechat-login',
          method: 'POST',
          data: { code: res.code },
        });
        Taro.hideLoading();
        if (loginRes.data.success) {
          Taro.showToast({ title: '微信登录成功', icon: 'success' });
          Taro.switchTab({ url: '/pages/index/index' });
        } else {
          Taro.showToast({ title: '登录失败', icon: 'none' });
        }
      } else {
        Taro.showToast({ title: '获取微信登录凭证失败', icon: 'none' });
      }
    } catch (err) {
      Taro.showToast({ title: '微信登录异常', icon: 'none' });
      console.error('微信登录异常:', err);
    }
  };

  const handleRegister = () => {
    Taro.navigateTo({ url: '/pages/register/index' });
  };

  const handleForgotPassword = () => {
    Taro.navigateTo({ url: '/pages/forgot-password/index' });
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