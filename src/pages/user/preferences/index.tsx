import React, { useState } from 'react';
import { View, Text, Switch, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

const Preferences: React.FC = () => {
  const [preferences, setPreferences] = useState({
    darkMode: false,
    notifications: true,
    language: 'zh-CN',
  });

  const handleToggle = (field: string) => {
    setPreferences({
      ...preferences,
      [field]: !preferences[field],
    });
  };

  const handleSave = () => {
    Taro.showLoading({ title: '保存中...' });
    // 模拟保存逻辑
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showToast({ title: '偏好设置已保存', icon: 'success' });
    }, 1000);
  };

  return (
    <View className='preferences'>
      <View className='preference-item'>
        <Text className='label'>深色模式</Text>
        <Switch
          checked={preferences.darkMode}
          onChange={() => handleToggle('darkMode')}
        />
      </View>

      <View className='preference-item'>
        <Text className='label'>通知提醒</Text>
        <Switch
          checked={preferences.notifications}
          onChange={() => handleToggle('notifications')}
        />
      </View>

      <View className='preference-item'>
        <Text className='label'>语言</Text>
        <Text className='value'>{preferences.language}</Text>
      </View>

      <Button className='save-button' onClick={handleSave}>保存设置</Button>
    </View>
  );
};

export default Preferences;