/**
 * 收银系统适配器工厂
 * 
 * 功能：
 * 1. 根据收银系统类型返回对应的适配器
 * 2. 管理适配器实例
 */

// 引入各种收银系统适配器
const StandardAdapter = require('./standard-adapter');
// const KRYAdapter = require('./kry-adapter'); // 客如云适配器（待实现）
// const E2FAdapter = require('./e2f-adapter'); // 二维火适配器（待实现）
// const MeituanAdapter = require('./meituan-adapter'); // 美团收银适配器（待实现）

/**
 * 获取适配器实例
 * @param {string} posSystem - 收银系统类型
 * @returns {Object} 适配器实例
 */
function getAdapter(posSystem) {
  // 默认使用标准适配器
  if (!posSystem || posSystem === 'standard') {
    return new StandardAdapter();
  }

  // 根据收银系统类型返回对应适配器
  switch (posSystem.toLowerCase()) {
    case 'kry':
    case 'keruyun':
      // return new KRYAdapter();
      // 暂时使用标准适配器
      return new StandardAdapter();

    case 'e2f':
    case 'erweihuo':
      // return new E2FAdapter();
      // 暂时使用标准适配器
      return new StandardAdapter();

    case 'meituan':
      // return new MeituanAdapter();
      // 暂时使用标准适配器
      return new StandardAdapter();

    default:
      // 未知类型使用标准适配器
      console.warn(`未知的收银系统类型: ${posSystem}，使用标准适配器`);
      return new StandardAdapter();
  }
}

/**
 * 支持的收银系统列表
 * @returns {Array} 支持的收银系统类型列表
 */
function getSupportedPOSSystems() {
  return [
    { value: 'standard', label: '标准适配器' },
    { value: 'kry', label: '客如云' },
    { value: 'e2f', label: '二维火' },
    { value: 'meituan', label: '美团收银' }
  ];
}

module.exports = {
  getAdapter,
  getSupportedPOSSystems
};

