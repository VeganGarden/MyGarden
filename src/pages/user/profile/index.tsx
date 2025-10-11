import React from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

const UserProfile: React.FC = () => {
  const [userInfo, setUserInfo] = React.useState({
    nickname: '用户昵称',
    avatar: '/assets/icons/default-avatar.png',
    gender: '未知',
    email: 'example@example.com',
    phone: '13800138000',
  });

  const handleEditProfile = () => {
    Taro.navigateTo({ url: '/pages/user/profile/edit' });
  };

  return (
    <View className='user-profile'>
      <View className='profile-header'>
        <Image className='avatar' src={userInfo.avatar} />
        <Text className='nickname'>{userInfo.nickname}</Text>
      </View>

      <View className='profile-details'>
        <View className='detail-item'>
          <Text className='label'>性别</Text>
          <Text className='value'>{userInfo.gender}</Text>
        </View>
        <View className='detail-item'>
          <Text className='label'>邮箱</Text>
          <Text className='value'>{userInfo.email}</Text>
        </View>
        <View className='detail-item'>
          <Text className='label'>手机号</Text>
          <Text className='value'>{userInfo.phone}</Text>
        </View>
      </View>

      <Button className='edit-button' onClick={handleEditProfile}>编辑个人信息</Button>
    </View>
  );
};

export default UserProfile;