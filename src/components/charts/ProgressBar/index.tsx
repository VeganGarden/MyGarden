import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

interface ProgressBarProps {
  current: number;
  target: number;
  title?: string;
  height?: number;
  showPercentage?: boolean;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  title,
  height = 40,
  showPercentage = true,
  color = '#22c55e'
}) => {
  const percentage = Math.min((current / target) * 100, 100);
  const isCompleted = current >= target;

  return (
    <View className="progress-bar">
      {title && (
        <View className="progress-header">
          <Text className="progress-title">{title}</Text>
          {showPercentage && (
            <Text className="progress-percentage">
              {percentage.toFixed(1)}%
            </Text>
          )}
        </View>
      )}
      
      <View 
        className="progress-container" 
        style={{ height: `${height}px` }}
      >
        <View 
          className="progress-track"
          style={{ backgroundColor: `${color}20` }}
        >
          <View
            className="progress-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </View>
        
        {showPercentage && !title && (
          <Text className="progress-text">
            {current}/{target} ({percentage.toFixed(1)}%)
          </Text>
        )}
      </View>
      
      {!title && showPercentage && (
        <View className="progress-labels">
          <Text className="progress-current">{current}kg</Text>
          <Text className="progress-target">目标: {target}kg</Text>
        </View>
      )}
      
      {isCompleted && (
        <View className="completion-badge">
          <Text className="badge-text">🎉 目标达成!</Text>
        </View>
      )}
    </View>
  );
};

export default ProgressBar;