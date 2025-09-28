const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  const app = cloudbase.init({
    env: process.env.TCB_ENV_ID || 'xiaoshidashi-4gng7p8p862e8878'
  });

  try {
    const { action, data } = event;

    switch (action) {
      case 'chat':
        return await handleChat(data);
      
      case 'analyze':
        return await handleAnalyze(data);
      
      case 'status':
        return {
          code: 0,
          data: {
            status: 'online',
            timestamp: Date.now(),
            version: '1.0.0'
          }
        };
      
      case 'login':
        return {
          code: 0,
          data: {
            loggedIn: true,
            timestamp: Date.now()
          }
        };

      default:
        return {
          code: 404,
          data: {
            error: '未知的操作类型'
          }
        };
    }
  } catch (error) {
    console.error('云函数错误:', error);
    return {
      code: 500,
      data: {
        error: '服务内部错误',
        message: error.message
      }
    };
  }
};

// 处理聊天功能
async function handleChat(data) {
  const { message, history = [] } = data;
  
  // 模拟AI响应逻辑
  let response = `AI响应: ${message}`;
  
  // 简单的智能回复逻辑
  if (message.includes('你好') || message.includes('hello')) {
    response = '你好！我是MyGarden AI助手，很高兴为您服务！';
  } else if (message.includes('天气')) {
    response = '我目前无法获取实时天气信息，但可以帮您分析其他数据。';
  } else if (message.includes('帮助') || message.includes('help')) {
    response = '我可以帮您：\n1. 智能对话交流\n2. 数据分析服务\n3. 问题解答\n请告诉我您需要什么帮助？';
  } else if (message.includes('功能') || message.includes('feature')) {
    response = '当前支持功能：\n• AI智能对话\n• 文件数据分析\n• 趋势预测\n• 异常检测';
  }
  
  return {
    code: 0,
    data: {
      response: response,
      timestamp: Date.now(),
      messageId: generateId()
    }
  };
}

// 处理数据分析功能
async function handleAnalyze(data) {
  const { fileType, content, analysisType, dataRange } = data;
  
  // 模拟数据分析逻辑
  const stats = {
    rowCount: Math.floor(Math.random() * 1000) + 100,
    columnCount: Math.floor(Math.random() * 20) + 5,
    completeness: `${Math.floor(Math.random() * 30) + 70}%`
  };
  
  const insights = [
    '数据整体质量良好，完整性较高',
    `发现${Math.floor(Math.random() * 10)}个异常数据点`,
    '主要趋势呈现稳定增长态势',
    '关键指标相关性分析显示正向关联'
  ];
  
  const recommendations = [
    '建议定期更新数据源以保证时效性',
    '可考虑增加数据验证机制提升质量',
    '推荐使用更高级的分析算法挖掘深层价值',
    '数据可视化展示有助于更好理解分析结果'
  ];
  
  return {
    code: 0,
    data: {
      stats: stats,
      insights: insights,
      recommendations: recommendations,
      analysisType: analysisType,
      timestamp: Date.now(),
      analysisId: generateId()
    }
  };
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}