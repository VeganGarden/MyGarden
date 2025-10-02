import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

interface LineChartProps {
  data: Array<{
    date: string;
    value: number;
  }>;
  title?: string;
  height?: number;
}

const LineChart: React.FC<LineChartProps> = ({ data, title, height = 200 }) => {
  if (!data || data.length === 0) {
    return (
      <View className="line-chart">
        {title && <Text className="chart-title">{title}</Text>}
        <View className="chart-container" style={{ height: `${height}px` }}>
          <Text className="no-data">暂无数据</Text>
        </View>
      </View>
    );
  }

  const values = data.map(item => item.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  return (
    <View className="line-chart">
      {title && <Text className="chart-title">{title}</Text>}
      <View className="chart-container" style={{ height: `${height}px` }}>
        <View className="chart-grid">
          {/* Y轴刻度 */}
          <View className="y-axis">
            <Text className="y-label">{maxValue.toFixed(1)}kg</Text>
            <Text className="y-label">{((maxValue + minValue) / 2).toFixed(1)}kg</Text>
            <Text className="y-label">{minValue.toFixed(1)}kg</Text>
          </View>
          
          {/* 图表内容 */}
          <View className="chart-content">
            {/* 网格线 */}
            <View className="grid-line" style={{ top: '0%' }} />
            <View className="grid-line" style={{ top: '50%' }} />
            <View className="grid-line" style={{ top: '100%' }} />
            
            {/* 折线 */}
            <View className="line-path">
              {data.map((item, index) => (
                <View
                  key={index}
                  className="data-point"
                  style={{
                    left: `${(index / (data.length - 1)) * 100}%`,
                    bottom: `${((item.value - minValue) / range) * 100}%`
                  }}
                >
                  <View className="point" />
                  <Text className="point-value">{item.value}kg</Text>
                </View>
              ))}
            </View>
            
            {/* X轴标签 */}
            <View className="x-axis">
              {data.map((item, index) => (
                <Text
                  key={index}
                  className="x-label"
                  style={{ left: `${(index / (data.length - 1)) * 100}%` }}
                >
                  {item.date.split('-').slice(1).join('/')}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default LineChart;