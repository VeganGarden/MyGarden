// 测试脚本：初始化一餐饭基准值集合
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

async function testInit() {
  try {
    const result = await cloud.callFunction({
      name: 'database',
      data: {
        action: 'initMealSetBaselinesCollection'
      }
    });
    console.log('初始化结果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

testInit();
