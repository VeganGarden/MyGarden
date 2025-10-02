import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

interface LoadingProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  type?: 'spinner' | 'dots' | 'skeleton';
}

const Loading: React.FC<LoadingProps> = ({ 
  text = '加载中...', 
  size = 'medium',
  type = 'spinner'
}) => {
  return (
    <View className={`loading loading-${size} loading-${type}`}>
      {type === 'spinner' && (
        <View className="spinner">
          <View className="spinner-ring"></View>
        </View>
      )}
      
      {type === 'dots' && (
        <View className="dots">
          <View className="dot"></View>
          <View className="dot"></View>
          <View className="dot"></View>
        </View>
      )}
      
      {type === 'skeleton' && (
        <View className="skeleton">
          <View className="skeleton-line skeleton-line-1"></View>
          <View className="skeleton-line skeleton-line-2"></View>
          <View className="skeleton-line skeleton-line-3"></View>
        </View>
      )}
      
      {text && <Text className="loading-text">{text}</Text>}
    </View>
  );
};

export default Loading;