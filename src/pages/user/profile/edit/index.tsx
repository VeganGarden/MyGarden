import React, { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

const EditProfile: React.FC = () => {
  const [formData, setFormData] = useState({
    nickname: '用户昵称',
    gender: '未知',
    email: 'example@example.com',
    phone: '13800138000',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSubmit = () => {
    Taro.showLoading({ title: '保存中...' });
    // 模拟保存逻辑
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showToast({ title: '保存成功', icon: 'success' });
      Taro.navigateBack();
    }, 1000);
  };

  return (
    <View className='edit-profile'>
      <View className='form-item'>
        <Text className='label'>昵称</Text>
        <Input
          className='input'
          value={formData.nickname}
          onInput={(e) => handleInputChange('nickname', e.detail.value)}
        />
      </View>

      <View className='form-item'>
        <Text className='label'>性别</Text>
        <Input
          className='input'
          value={formData.gender}
          onInput={(e) => handleInputChange('gender', e.detail.value)}
        />
      </View>

      <View className='form-item'>
        <Text className='label'>邮箱</Text>
        <Input
          className='input'
          value={formData.email}
          onInput={(e) => handleInputChange('email', e.detail.value)}
        />
      </View>

      <View className='form-item'>
        <Text className='label'>手机号</Text>
        <Input
          className='input'
          value={formData.phone}
          onInput={(e) => handleInputChange('phone', e.detail.value)}
        />
      </View>

      <Button className='submit-button' onClick={handleSubmit}>保存</Button>
    </View>
  );
};

export default EditProfile;