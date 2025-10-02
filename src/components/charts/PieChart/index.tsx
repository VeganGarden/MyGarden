import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  size?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, title, size = 200 }) => {
  if (!data || data.length === 0) {
    return (
      <View className="pie-chart">
        {title && <Text className="chart-title">{title}</Text>}
        <View className="chart-container" style={{ width: `${size}px`, height: `${size}px` }}>
          <Text className="no-data">暂无数据</Text>
        </View>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <View className="pie-chart">
      {title && <Text className="chart-title">{title}</Text>}
      <View className="chart-content">
        <View className="pie-container" style={{ width: `${size}px`, height: `${size}px` }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (item.value / total) * 360;
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const x1 = size / 2 + (size / 2) * Math.cos(currentAngle * Math.PI / 180);
              const y1 = size / 2 + (size / 2) * Math.sin(currentAngle * Math.PI / 180);
              
              const x2 = size / 2 + (size / 2) * Math.cos((currentAngle + angle) * Math.PI / 180);
              const y2 = size / 2 + (size / 2) * Math.sin((currentAngle + angle) * Math.PI / 180);
              
              const path = `M ${size/2} ${size/2} L ${x1} ${y1} A ${size/2} ${size/2} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
              
              const segment = (
                <path
                  key={index}
                  d={path}
                  fill={item.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              );
              
              currentAngle += angle;
              return segment;
            })}
          </svg>
          
          <View className="center-text">
            <Text className="total-value">{total}kg</Text>
            <Text className="total-label">总减排</Text>
          </View>
        </View>
        
        <View className="legend">
          {data.map((item, index) => (
            <View key={index} className="legend-item">
              <View className="legend-color" style={{ backgroundColor: item.color }} />
              <Text className="legend-name">{item.name}</Text>
              <Text className="legend-value">
                {((item.value / total) * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default PieChart;