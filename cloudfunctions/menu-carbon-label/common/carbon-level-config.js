/**
 * 碳等级配置读取工具函数
 * 
 * 功能：
 * 1. 从数据库读取碳等级阈值和颜色配置
 * 2. 提供碳等级判断和颜色获取功能
 * 3. 如果配置不存在，抛出明确的错误提醒
 */

const cloud = require('wx-server-sdk');
const db = cloud.database();

/**
 * 获取所有碳等级阈值配置
 * @returns {Promise<Object>} 返回阈值配置对象 { ultra_low: 0.5, low: 1.0, medium: 2.0, high: 999999 }
 * @throws {Error} 如果配置不存在，抛出包含详细信息的错误
 */
async function getCarbonLevelThresholds() {
  try {
    const result = await db.collection('carbon_calculation_configs')
      .where({
        configKey: 'carbon_level_threshold',
        configType: 'carbon_level',
        status: 'active'
      })
      .get();

    if (!result.data || result.data.length === 0) {
      throw new Error(
        '碳等级阈值配置未初始化。\n' +
        '缺少的配置项：carbon_level_threshold (configType: carbon_level)\n' +
        '修复方法：\n' +
        '1. 执行初始化脚本：tcb fn invoke database --params \'{"action":"initCarbonCalculationConfigs"}\'\n' +
        '2. 或通过管理界面创建配置：平台配置管理 -> 碳足迹计算默认参数配置 -> 碳等级配置'
      );
    }

    // 检查是否所有必需的等级都存在
    const requiredLevels = ['ultra_low', 'low', 'medium', 'high'];
    const existingLevels = result.data.map(item => item.category);
    const missingLevels = requiredLevels.filter(level => !existingLevels.includes(level));

    if (missingLevels.length > 0) {
      throw new Error(
        `碳等级阈值配置不完整。\n` +
        `缺少的等级：${missingLevels.join(', ')}\n` +
        `修复方法：\n` +
        `1. 执行初始化脚本：tcb fn invoke database --params '{"action":"initCarbonCalculationConfigs"}'\n` +
        `2. 或通过管理界面补充缺失的配置项`
      );
    }

    // 构建阈值对象
    const thresholds = {};
    for (const config of result.data) {
      thresholds[config.category] = config.value;
    }

    // 验证阈值逻辑：ultra_low < low < medium < high
    if (thresholds.ultra_low >= thresholds.low ||
        thresholds.low >= thresholds.medium ||
        thresholds.medium >= thresholds.high) {
      throw new Error(
        `碳等级阈值配置无效：阈值必须满足 ultra_low < low < medium < high 的逻辑\n` +
        `当前值：ultra_low=${thresholds.ultra_low}, low=${thresholds.low}, medium=${thresholds.medium}, high=${thresholds.high}\n` +
        `修复方法：通过管理界面调整阈值配置`
      );
    }

    return thresholds;
  } catch (error) {
    // 如果是我们抛出的错误，直接抛出
    if (error.message.includes('碳等级') || error.message.includes('配置')) {
      throw error;
    }
    // 其他错误包装后抛出
    throw new Error(
      `读取碳等级阈值配置失败：${error.message}\n` +
      `请检查数据库连接和配置数据是否存在`
    );
  }
}

/**
 * 获取所有碳等级颜色配置
 * @returns {Promise<Object>} 返回颜色配置对象 { ultra_low: '#52c41a', low: '#a0d911', medium: '#faad14', high: '#ff4d4f' }
 * @throws {Error} 如果配置不存在，抛出包含详细信息的错误
 */
async function getCarbonLevelColors() {
  try {
    const result = await db.collection('carbon_calculation_configs')
      .where({
        configKey: 'carbon_level_color',
        configType: 'carbon_level',
        status: 'active'
      })
      .get();

    if (!result.data || result.data.length === 0) {
      throw new Error(
        '碳等级颜色配置未初始化。\n' +
        '缺少的配置项：carbon_level_color (configType: carbon_level)\n' +
        '修复方法：\n' +
        '1. 执行初始化脚本：tcb fn invoke database --params \'{"action":"initCarbonCalculationConfigs"}\'\n' +
        '2. 或通过管理界面创建配置：平台配置管理 -> 碳足迹计算默认参数配置 -> 碳等级配置'
      );
    }

    // 检查是否所有必需的等级都存在
    const requiredLevels = ['ultra_low', 'low', 'medium', 'high'];
    const existingLevels = result.data.map(item => item.category);
    const missingLevels = requiredLevels.filter(level => !existingLevels.includes(level));

    if (missingLevels.length > 0) {
      throw new Error(
        `碳等级颜色配置不完整。\n` +
        `缺少的等级：${missingLevels.join(', ')}\n` +
        `修复方法：\n` +
        `1. 执行初始化脚本：tcb fn invoke database --params '{"action":"initCarbonCalculationConfigs"}'\n` +
        `2. 或通过管理界面补充缺失的配置项`
      );
    }

    // 构建颜色对象
    const colors = {};
    for (const config of result.data) {
      const colorValue = typeof config.value === 'string' ? config.value : String(config.value);
      // 验证颜色格式（十六进制）
      if (!/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
        throw new Error(
          `碳等级颜色配置格式无效：${config.category} 的颜色值 "${colorValue}" 不是有效的十六进制颜色格式\n` +
          `颜色值必须是 #RRGGBB 格式（如 #52c41a）\n` +
          `修复方法：通过管理界面修正颜色配置`
        );
      }
      colors[config.category] = colorValue;
    }

    return colors;
  } catch (error) {
    // 如果是我们抛出的错误，直接抛出
    if (error.message.includes('碳等级') || error.message.includes('配置')) {
      throw error;
    }
    // 其他错误包装后抛出
    throw new Error(
      `读取碳等级颜色配置失败：${error.message}\n` +
      `请检查数据库连接和配置数据是否存在`
    );
  }
}

/**
 * 根据碳足迹值确定碳等级
 * @param {number} carbonFootprint - 碳足迹值（kg CO₂e）
 * @param {Object} thresholds - 阈值配置对象（可选，如果不提供则从数据库读取）
 * @returns {Promise<string>} 返回碳等级：'ultra_low' | 'low' | 'medium' | 'high'
 * @throws {Error} 如果配置不存在或参数无效
 */
async function determineCarbonLevel(carbonFootprint, thresholds = null) {
  if (typeof carbonFootprint !== 'number' || isNaN(carbonFootprint) || carbonFootprint < 0) {
    throw new Error(`无效的碳足迹值：${carbonFootprint}。必须是大于等于0的数字。`);
  }

  // 如果没有提供阈值，从数据库读取
  if (!thresholds) {
    thresholds = await getCarbonLevelThresholds();
  }

  // 根据阈值判断等级
  if (carbonFootprint < thresholds.ultra_low) {
    return 'ultra_low';
  } else if (carbonFootprint < thresholds.low) {
    return 'low';
  } else if (carbonFootprint <= thresholds.medium) {
    return 'medium';
  } else {
    return 'high';
  }
}

/**
 * 获取碳等级对应的颜色
 * @param {string} level - 碳等级：'ultra_low' | 'low' | 'medium' | 'high'
 * @param {Object} colors - 颜色配置对象（可选，如果不提供则从数据库读取）
 * @returns {Promise<string>} 返回颜色值（十六进制格式，如 '#52c41a'）
 * @throws {Error} 如果配置不存在或等级无效
 */
async function getCarbonLevelColor(level, colors = null) {
  const validLevels = ['ultra_low', 'low', 'medium', 'high'];
  if (!validLevels.includes(level)) {
    throw new Error(`无效的碳等级：${level}。有效值：${validLevels.join(', ')}`);
  }

  // 如果没有提供颜色，从数据库读取
  if (!colors) {
    colors = await getCarbonLevelColors();
  }

  if (!colors[level]) {
    throw new Error(`碳等级颜色配置缺失：${level} 等级的颜色未配置`);
  }

  return colors[level];
}

/**
 * 同时获取阈值和颜色配置（优化：一次查询）
 * @returns {Promise<Object>} 返回 { thresholds: {...}, colors: {...} }
 * @throws {Error} 如果配置不存在
 */
async function getCarbonLevelConfigs() {
  try {
    const [thresholds, colors] = await Promise.all([
      getCarbonLevelThresholds(),
      getCarbonLevelColors()
    ]);

    return {
      thresholds,
      colors
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getCarbonLevelThresholds,
  getCarbonLevelColors,
  determineCarbonLevel,
  getCarbonLevelColor,
  getCarbonLevelConfigs
};



