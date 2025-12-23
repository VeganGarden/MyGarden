/**
 * 菜单碳足迹计算常量配置
 * 统一管理所有硬编码默认值
 */

// 默认基准值（kg CO₂e）
const DEFAULT_BASELINES = {
  meat_simple: 5.0,  // 肉食简餐
  meat_full: 7.5     // 肉食正餐
};

// 默认损耗率（比例，如0.2表示20%）
const DEFAULT_WASTE_RATES = {
  vegetables: 0.20,
  vegetable: 0.20,
  leafy: 0.20,
  meat: 0.05,
  seafood: 0.15,
  grains: 0.0,
  grain: 0.0,
  nuts: 0.0,
  spices: 0.0,
  others: 0.10,
  other: 0.10,
  default: 0.10
};

// 默认能源因子
const DEFAULT_ENERGY_FACTORS = {
  electric: 0.5703,  // 2022年全国电网平均排放因子 (kg CO₂e/kWh)
  gas: 2.16          // IPCC 天然气因子 (kg CO₂e/m³)
};

// 标准工时模型（分钟）
const STANDARD_COOKING_TIMES = {
  raw: 0,
  steamed: 15,
  boiled: 20,
  stir_fried: 5,
  fried: 8,
  baked: 45
};

// 标准功率模型（kW）
const STANDARD_COOKING_POWERS = {
  raw: 0,
  steamed: 2.0,
  boiled: 1.5,
  stir_fried: 3.0,
  fried: 5.0,
  baked: 4.0
};

// 默认区域代码
const DEFAULT_REGIONS = {
  factorRegion: 'CN',              // 因子区域（国家级别）
  baselineRegion: 'national_average' // 基准值区域
};

// 计算级别默认值
const DEFAULT_CALCULATION_LEVEL = 'L2';

// 餐食类型默认值
const DEFAULT_MEAL_TYPE = 'meat_simple';

// 能源类型默认值
const DEFAULT_ENERGY_TYPE = 'electric';

// 基准值不确定性默认比例（10%）
const DEFAULT_BASELINE_UNCERTAINTY_RATIO = 0.1;

// 计算结果合理性验证阈值
const VALIDATION_THRESHOLDS = {
  maxCarbonFootprint: 100,  // 单道菜最大碳足迹（kg CO₂e）
  sumTolerance: 0.01        // 各部分之和与总值的允许误差（kg CO₂e）
};

// 缓存TTL（毫秒）
const CACHE_TTL = {
  config: 5 * 60 * 1000,      // 配置缓存5分钟
  factor: 5 * 60 * 1000       // 因子匹配缓存5分钟
};

// 缓存清理阈值
const CACHE_CLEANUP_THRESHOLD = 1000; // 当缓存大小超过1000时清理

// 有效枚举值
const VALID_ENUMS = {
  mealTypes: ['meat_simple', 'meat_full'],
  energyTypes: ['electric', 'gas', 'mixed'],
  calculationLevels: ['L1', 'L2', 'L3'],
  units: ['g', '克', 'kg', '千克', 'ml', '毫升', 'l', '升']
};

// 烹饪时间范围
const COOKING_TIME_RANGE = {
  min: 0,
  max: 999
};

module.exports = {
  DEFAULT_BASELINES,
  DEFAULT_WASTE_RATES,
  DEFAULT_ENERGY_FACTORS,
  STANDARD_COOKING_TIMES,
  STANDARD_COOKING_POWERS,
  DEFAULT_REGIONS,
  DEFAULT_CALCULATION_LEVEL,
  DEFAULT_MEAL_TYPE,
  DEFAULT_ENERGY_TYPE,
  DEFAULT_BASELINE_UNCERTAINTY_RATIO,
  VALIDATION_THRESHOLDS,
  CACHE_TTL,
  CACHE_CLEANUP_THRESHOLD,
  VALID_ENUMS,
  COOKING_TIME_RANGE
};

