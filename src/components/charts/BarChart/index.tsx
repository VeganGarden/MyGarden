import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
  showValues?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  title, 
  height = 200, 
  showValues = true 
}) => {
  if (!data || data.length === 0) {
    return (
      <View className="bar-chart">
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
    <View className="bar-chart">
      {title && <Text className="chart-title">{title}</Text>}
      <View className="chart-container" style={{ height: `${height}px` }}>
        <View className="chart-grid">
          {/* Y轴刻度 */}
          <View className="y-axis">
            <Text className="y-label">{maxValue.toFixed(0)}kg</Text>
            <Text className="y-label">{Math.round((maxValue + minValue) / 2)}kg</Text>
            <Text className="y-label">{minValue.toFixed(0)}kg</Text>
          </View>
          
          {/* 图表内容 */}
          <View className="chart-content">
            {/* 网格线 */}
            <View className="grid-line" style={{ top: '0%' }} />
            <View className="grid-line" style={{ top: '50%' }} />
            <View className="grid-line" style={{ top: '100%' }} />
            
            {/* 柱状图 */}
            <View className="bars-container">
              {data.map((item, index) => (
                <View key={index} className="bar-item">
                  <View
                    className="bar"
                    style={{
                      height: `${((item.value - minValue) / range) * 80}%`,
                      backgroundColor: item.color || '#22c55e',
                      minHeight: '20px'
                    }}
                  >
                    {showValues && (
                      <Text className="bar-value">{item.value}kg</Text>
                    )}
                  </View>
                  <Text className="bar-label">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default BarChart;