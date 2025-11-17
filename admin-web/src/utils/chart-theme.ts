/**
 * 图表主题配置
 * 统一图表样式，使用品牌色
 */

// 获取计算后的样式值
const getComputedStyle = (element: HTMLElement) => {
  return window.getComputedStyle(element)
}

/**
 * 获取品牌色图表配置
 * 用于 ECharts、Ant Design Charts 等
 */
export const getBrandChartTheme = () => {
  const root = document.documentElement
  const computedStyle = getComputedStyle(root)

  const brandPrimary = computedStyle.getPropertyValue('--brand-primary').trim() || '#22c55e'
  const brandSecondary = computedStyle.getPropertyValue('--brand-secondary').trim() || '#10b981'
  const brandAccent = computedStyle.getPropertyValue('--brand-accent').trim() || '#34d399'
  const textPrimary = computedStyle.getPropertyValue('--text-primary').trim() || 'rgba(0, 0, 0, 0.85)'
  const textSecondary = computedStyle.getPropertyValue('--text-secondary').trim() || 'rgba(0, 0, 0, 0.65)'
  const bgContainer = computedStyle.getPropertyValue('--bg-container').trim() || '#ffffff'
  const borderColor = computedStyle.getPropertyValue('--border-color-split').trim() || '#f0f0f0'

  return {
    // 颜色配置
    color: [
      brandPrimary,
      brandSecondary,
      brandAccent,
      '#86efac', // brand-light
      '#166534', // brand-dark
      '#52c41a', // success
      '#faad14', // warning
      '#f5222d', // error
    ],

    // 文本样式
    textStyle: {
      color: textPrimary,
      fontSize: 12,
      fontFamily: 'var(--font-family-base)',
    },

    // 标题样式
    title: {
      textStyle: {
        color: textPrimary,
        fontSize: 16,
        fontWeight: 600,
      },
      subtextStyle: {
        color: textSecondary,
        fontSize: 12,
      },
    },

    // 图例样式
    legend: {
      textStyle: {
        color: textPrimary,
        fontSize: 12,
      },
      itemGap: 16,
    },

    // 网格样式
    grid: {
      borderColor: borderColor,
      borderWidth: 1,
    },

    // 坐标轴样式
    xAxis: {
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
      axisLabel: {
        color: textSecondary,
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
          type: 'dashed',
        },
      },
    },

    yAxis: {
      axisLine: {
        lineStyle: {
          color: borderColor,
        },
      },
      axisLabel: {
        color: textSecondary,
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
          type: 'dashed',
        },
      },
    },

    // 工具提示样式
    tooltip: {
      backgroundColor: bgContainer,
      borderColor: borderColor,
      textStyle: {
        color: textPrimary,
        fontSize: 12,
      },
    },
  }
}

/**
 * ECharts 主题配置
 */
export const echartsTheme = {
  color: ['#22c55e', '#10b981', '#34d399', '#86efac', '#166534'],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'var(--font-family-base)',
  },
}

/**
 * Ant Design Charts 配置
 */
export const antChartsConfig = {
  theme: {
    colors10: ['#22c55e', '#10b981', '#34d399', '#86efac', '#166534'],
    colors20: [
      '#22c55e',
      '#10b981',
      '#34d399',
      '#86efac',
      '#166534',
      '#52c41a',
      '#faad14',
      '#f5222d',
    ],
  },
}

