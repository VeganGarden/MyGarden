/**
 * 生成完整的24条基准值数据
 * 
 * 6个区域 × 2种餐食类型 × 2种用能方式 = 24条
 */

const regions = [
  'north_china',      // 华北区域
  'northeast',        // 东北区域
  'east_china',       // 华东区域
  'central_china',    // 华中区域
  'northwest',        // 西北区域
  'south_china'       // 南方区域
];

const mealTypes = ['meat_simple', 'meat_full'];
const energyTypes = ['electric', 'gas'];

// 区域电网因子（用于调整基准值）
const regionFactors = {
  north_china: 0.9419,    // 以火电为主，基准值较高
  northeast: 0.7769,      // 以火电为主
  east_china: 0.7035,     // 火电+水电
  central_china: 0.5257,  // 水电+火电，基准值较低
  northwest: 0.6673,      // 火电+新能源
  south_china: 0.5271     // 水电+火电
};

// 基础基准值（华东区域，全电厨房）
const baseBaselines = {
  meat_simple: {
    electric: {
      value: 5.0,
      ingredients: 3.5,
      cookingEnergy: 1.2,
      packaging: 0.2,
      other: 0.1
    },
    gas: {
      value: 5.2,
      ingredients: 3.5,
      cookingEnergy: 1.4,
      packaging: 0.2,
      other: 0.1
    }
  },
  meat_full: {
    electric: {
      value: 7.5,
      ingredients: 5.5,
      cookingEnergy: 1.6,
      packaging: 0.3,
      other: 0.1
    },
    gas: {
      value: 7.8,
      ingredients: 5.5,
      cookingEnergy: 1.8,
      packaging: 0.3,
      other: 0.2
    }
  }
};

/**
 * 根据区域因子调整基准值
 */
function adjustBaselineByRegion(baseValue, regionFactor) {
  // 华东区域因子作为基准（0.7035）
  const baseFactor = 0.7035;
  // 调整系数：新区域因子 / 基准因子
  const adjustmentFactor = regionFactor / baseFactor;
  // 只调整烹饪能耗部分，食材部分不变
  return baseValue * (0.7 + 0.3 * adjustmentFactor); // 70%食材 + 30%能耗
}

/**
 * 生成所有基准值数据
 */
function generateAllBaselines() {
  const baselines = [];
  const now = new Date();
  
  regions.forEach(region => {
    mealTypes.forEach(mealType => {
      energyTypes.forEach(energyType => {
        const base = baseBaselines[mealType][energyType];
        const regionFactor = regionFactors[region];
        
        // 根据区域因子调整基准值
        const adjustedValue = adjustBaselineByRegion(base.value, regionFactor);
        const adjustedCookingEnergy = base.cookingEnergy * (regionFactor / 0.7035);
        
        const baseline = {
          category: {
            mealType,
            region,
            energyType
          },
          carbonFootprint: {
            value: Math.round(adjustedValue * 10) / 10, // 保留1位小数
            uncertainty: mealType === 'meat_simple' ? 0.5 : 0.8,
            confidenceInterval: {
              lower: Math.round((adjustedValue - (mealType === 'meat_simple' ? 0.5 : 0.8)) * 10) / 10,
              upper: Math.round((adjustedValue + (mealType === 'meat_simple' ? 0.5 : 0.8)) * 10) / 10
            },
            unit: 'kg CO₂e'
          },
          breakdown: {
            ingredients: base.ingredients,
            cookingEnergy: Math.round(adjustedCookingEnergy * 10) / 10,
            packaging: base.packaging,
            other: base.other
          },
          source: {
            type: 'industry_statistics',
            organization: '中国餐饮协会',
            report: '2024年度餐饮行业碳足迹报告（示例数据）',
            year: 2024,
            methodology: '基于行业统计数据估算，按区域电网因子调整'
          },
          version: '2024.01',
          effectiveDate: new Date('2024-01-01'),
          expiryDate: new Date('2024-12-31'),
          status: 'active',
          notes: `示例数据，需替换为真实数据。区域：${region}，电网因子：${regionFactor}`,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          updatedBy: 'system'
        };
        
        // 生成baselineId
        baseline.baselineId = `${mealType}_${region}_${energyType}_default_default`;
        
        baselines.push(baseline);
      });
    });
  });
  
  return baselines;
}

/**
 * 生成CSV格式数据
 */
function generateCSV(baselines) {
  const headers = [
    'mealType', 'region', 'energyType', 'city', 'restaurantType',
    'value', 'uncertainty', 'lower', 'upper',
    'ingredients', 'cookingEnergy', 'packaging', 'other',
    'sourceType', 'organization', 'report', 'year', 'methodology',
    'version', 'effectiveDate', 'expiryDate', 'notes'
  ];
  
  const rows = baselines.map(b => [
    b.category.mealType,
    b.category.region,
    b.category.energyType,
    b.category.city || '',
    b.category.restaurantType || '',
    b.carbonFootprint.value,
    b.carbonFootprint.uncertainty,
    b.carbonFootprint.confidenceInterval.lower,
    b.carbonFootprint.confidenceInterval.upper,
    b.breakdown.ingredients,
    b.breakdown.cookingEnergy,
    b.breakdown.packaging,
    b.breakdown.other,
    b.source.type,
    b.source.organization,
    b.source.report,
    b.source.year,
    b.source.methodology,
    b.version,
    b.effectiveDate.toISOString().split('T')[0],
    b.expiryDate.toISOString().split('T')[0],
    b.notes
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// 如果直接运行此脚本，输出JSON和CSV
if (require.main === module) {
  const baselines = generateAllBaselines();
  
  console.log('生成的基准值数据：');
  console.log(JSON.stringify(baselines, null, 2));
  console.log('\n\nCSV格式：');
  console.log(generateCSV(baselines));
}

module.exports = {
  generateAllBaselines,
  generateCSV
};

