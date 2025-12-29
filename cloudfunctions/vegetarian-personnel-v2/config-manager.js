/**
 * 配置管理模块
 * 用于从 vegetarian_carbon_configs 集合获取配置参数
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 获取配置参数值
 * @param {string} parameterName - 参数名称
 * @param {*} defaultValue - 默认值
 * @returns {Promise<*>} 参数值
 */
async function getConfigValue(parameterName, defaultValue = null) {
  try {
    const result = await db.collection('vegetarian_carbon_configs')
      .where({
        configType: 'calculation_rule',
        parameterName: parameterName,
        status: 'active'
      })
      .get()
    
    if (result.data.length > 0) {
      return result.data[0].parameterValue
    }
    return defaultValue
  } catch (error) {
    console.error(`获取配置参数失败: ${parameterName}`, error)
    return defaultValue
  }
}

/**
 * 获取素食类型减碳系数
 * @param {string} vegetarianType - 素食类型：pure/ovo_lacto/flexible/other
 * @returns {Promise<number>} 减碳系数
 */
async function getVegetarianCoefficient(vegetarianType) {
  try {
    const result = await db.collection('vegetarian_carbon_configs')
      .where({
        configType: 'vegetarian_coefficient',
        vegetarianType: vegetarianType,
        status: 'active'
      })
      .get()
    
    if (result.data.length > 0) {
      return result.data[0].parameterValue
    }
    // 默认值：如果未找到配置，返回1.0（纯素基准值）
    console.warn(`未找到素食类型系数配置: ${vegetarianType}，使用默认值 1.0`)
    return 1.0
  } catch (error) {
    console.error(`获取素食类型系数失败: ${vegetarianType}`, error)
    return 1.0
  }
}

/**
 * 获取年限增长系数
 * @param {number} vegetarianYears - 素食年限（年）
 * @returns {Promise<number>} 年限增长系数
 */
async function getYearsGrowthCoefficient(vegetarianYears) {
  try {
    // 查询所有有效的年限增长系数配置
    const configs = await db.collection('vegetarian_carbon_configs')
      .where({
        configType: 'years_growth_coefficient',
        status: 'active'
      })
      .orderBy('minYears', 'asc')
      .get()
    
    if (configs.data.length === 0) {
      // 如果没有配置，使用默认值
      console.warn('未找到年限增长系数配置，使用默认值 1.0')
      return getDefaultYearsGrowthCoefficient(vegetarianYears)
    }
    
    // 查找对应的增长系数（按年限范围匹配）
    for (const config of configs.data) {
      if (vegetarianYears >= config.minYears) {
        // 如果配置有 maxYears，需要检查是否小于 maxYears
        if (config.maxYears === null || config.maxYears === undefined) {
          // 10年以上（无上限）
          return config.parameterValue
        } else if (vegetarianYears < config.maxYears) {
          return config.parameterValue
        }
      }
    }
    
    // 如果没找到匹配的，返回最后一个（最高年限的系数）
    return configs.data[configs.data.length - 1].parameterValue
  } catch (error) {
    console.error(`获取年限增长系数失败: ${vegetarianYears}年`, error)
    return getDefaultYearsGrowthCoefficient(vegetarianYears)
  }
}

/**
 * 默认年限增长系数（硬编码，作为回退）
 * @param {number} vegetarianYears - 素食年限
 * @returns {number} 默认增长系数
 */
function getDefaultYearsGrowthCoefficient(vegetarianYears) {
  if (vegetarianYears < 1) {
    return 1.0
  } else if (vegetarianYears < 3) {
    return 1.2
  } else if (vegetarianYears < 5) {
    return 1.5
  } else if (vegetarianYears < 10) {
    return 2.0
  } else {
    return 2.5
  }
}

module.exports = {
  getConfigValue,
  getVegetarianCoefficient,
  getYearsGrowthCoefficient
}

