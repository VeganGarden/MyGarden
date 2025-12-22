/**
 * 平台配置管理云函数（统一入口）
 * 
 * 功能：
 * 1. 区域配置管理（因子区域、基准值区域）
 * 2. 计算参数配置管理（食材损耗率、默认能源因子、标准工时模型等）
 * 3. 其他平台配置管理（未来扩展）
 * 
 * 权限要求：
 * - 查询：platform_operator, system_admin（部分查询允许匿名）
 * - 更新：platform_operator, system_admin（需要 operation:manage 权限）
 * 
 * 调用示例：
 * wx.cloud.callFunction({
 *   name: 'platform-config-manage',
 *   data: {
 *     action: 'region.list',
 *     configType: 'factor_region'
 *   }
 * })
 * 
 * wx.cloud.callFunction({
 *   name: 'platform-config-manage',
 *   data: {
 *     action: 'calculation.list',
 *     configType: 'waste_rate'
 *   }
 * })
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const { handleRegionConfig } = require('./handlers/region-config');
const { handleCalculationConfig } = require('./handlers/calculation-config');
const { createErrorResponse } = require('./utils/error-handler');

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action } = event;

  try {
    // 解析 action，格式：{type}.{operation}
    // 例如：region.list, region.create, calculation.update
    const parts = action.split('.');
    
    if (parts.length < 2) {
      return createErrorResponse(400, `无效的 action 格式: ${action}。格式应为: {type}.{operation}，如 region.list, calculation.update`);
    }

    const [type, operation] = parts;
    const newEvent = {
      ...event,
      action: operation
    };

    // 路由到对应的 handler
    switch (type) {
      case 'region':
        return await handleRegionConfig(newEvent, context);
      
      case 'calculation':
        return await handleCalculationConfig(newEvent, context);
      
      // 未来扩展：系统配置、业务规则配置等
      // case 'system':
      //   return await handleSystemConfig(newEvent, context);
      
      default:
        return createErrorResponse(400, `未知的配置类型: ${type}。支持的类型: region, calculation`);
    }
  } catch (error) {
    console.error('平台配置管理失败:', error);
    return createErrorResponse(500, error.message || '操作失败', error);
  }
};

