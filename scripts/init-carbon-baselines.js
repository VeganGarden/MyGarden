/**
 * 碳足迹基准值数据库初始化脚本
 * 
 * 功能：
 * 1. 创建 carbon_baselines 集合
 * 2. 创建索引
 * 3. 导入初始基准值数据（示例）
 * 
 * 使用方法：
 * node scripts/init-carbon-baselines.js
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloud.init({
  env: process.env.TCB_ENV || 'your-env-id',
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();

/**
 * 创建索引
 */
async function createIndexes() {
  console.log('开始创建索引...');
  
  try {
    // 主查询索引
    await db.collection('carbon_baselines').createIndex({
      'category.mealType': 1,
      'category.region': 1,
      'category.energyType': 1,
      'status': 1
    }, { name: 'idx_main_query' });
    
    // 版本查询索引
    await db.collection('carbon_baselines').createIndex({
      'version': 1,
      'status': 1
    }, { name: 'idx_version' });
    
    // 时间范围查询索引
    await db.collection('carbon_baselines').createIndex({
      'effectiveDate': 1,
      'expiryDate': 1
    }, { name: 'idx_date_range' });
    
    // 唯一性索引
    await db.collection('carbon_baselines').createIndex({
      'baselineId': 1
    }, { unique: true, name: 'idx_baseline_id' });
    
    console.log('✅ 索引创建成功');
  } catch (error) {
    console.error('❌ 索引创建失败:', error);
    throw error;
  }
}

/**
 * 生成基准值ID
 */
function generateBaselineId(category) {
  const { mealType, region, energyType, city, restaurantType } = category;
  const parts = [
    mealType,
    region,
    energyType,
    city || 'default',
    restaurantType || 'default'
  ];
  return parts.join('_');
}

/**
 * 导入初始基准值数据（示例数据）
 * 
 * 注意：这是示例数据，实际使用时需要替换为真实数据
 */
async function importInitialData() {
  console.log('开始导入初始基准值数据...');
  
  // 生成完整的24条基准值数据
  const { generateAllBaselines } = require('./generate-baselines-data');
  const initialBaselines = generateAllBaselines();
  
  // 旧的手动定义数据（已废弃，保留作为参考）
  const oldBaselines = [
    // 华东区域 - 肉食简餐 - 全电厨房
    {
      category: {
        mealType: 'meat_simple',
        region: 'east_china',
        energyType: 'electric'
      },
      carbonFootprint: {
        value: 5.0,
        uncertainty: 0.5,
        confidenceInterval: {
          lower: 4.5,
          upper: 5.5
        },
        unit: 'kg CO₂e'
      },
      breakdown: {
        ingredients: 3.5,
        cookingEnergy: 1.2,
        packaging: 0.2,
        other: 0.1
      },
      source: {
        type: 'industry_statistics',
        organization: '中国餐饮协会',
        report: '2024年度餐饮行业碳足迹报告（示例）',
        year: 2024,
        methodology: '基于行业统计数据估算'
      },
      version: '2024.01',
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2024-12-31'),
      status: 'active',
      notes: '示例数据，需替换为真实数据',
      usageCount: 0
    },
    // 华东区域 - 肉食简餐 - 燃气厨房
    {
      category: {
        mealType: 'meat_simple',
        region: 'east_china',
        energyType: 'gas'
      },
      carbonFootprint: {
        value: 5.2,
        uncertainty: 0.5,
        confidenceInterval: {
          lower: 4.7,
          upper: 5.7
        },
        unit: 'kg CO₂e'
      },
      breakdown: {
        ingredients: 3.5,
        cookingEnergy: 1.4,
        packaging: 0.2,
        other: 0.1
      },
      source: {
        type: 'industry_statistics',
        organization: '中国餐饮协会',
        report: '2024年度餐饮行业碳足迹报告（示例）',
        year: 2024,
        methodology: '基于行业统计数据估算'
      },
      version: '2024.01',
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2024-12-31'),
      status: 'active',
      notes: '示例数据，需替换为真实数据',
      usageCount: 0
    },
    // 华东区域 - 肉食正餐 - 全电厨房
    {
      category: {
        mealType: 'meat_full',
        region: 'east_china',
        energyType: 'electric'
      },
      carbonFootprint: {
        value: 7.5,
        uncertainty: 0.8,
        confidenceInterval: {
          lower: 6.7,
          upper: 8.3
        },
        unit: 'kg CO₂e'
      },
      breakdown: {
        ingredients: 5.5,
        cookingEnergy: 1.6,
        packaging: 0.3,
        other: 0.1
      },
      source: {
        type: 'industry_statistics',
        organization: '中国餐饮协会',
        report: '2024年度餐饮行业碳足迹报告（示例）',
        year: 2024,
        methodology: '基于行业统计数据估算'
      },
      version: '2024.01',
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2024-12-31'),
      status: 'active',
      notes: '示例数据，需替换为真实数据',
      usageCount: 0
    },
    // 华东区域 - 肉食正餐 - 燃气厨房
    {
      category: {
        mealType: 'meat_full',
        region: 'east_china',
        energyType: 'gas'
      },
      carbonFootprint: {
        value: 7.8,
        uncertainty: 0.8,
        confidenceInterval: {
          lower: 7.0,
          upper: 8.6
        },
        unit: 'kg CO₂e'
      },
      breakdown: {
        ingredients: 5.5,
        cookingEnergy: 1.8,
        packaging: 0.3,
        other: 0.2
      },
      source: {
        type: 'industry_statistics',
        organization: '中国餐饮协会',
        report: '2024年度餐饮行业碳足迹报告（示例）',
        year: 2024,
        methodology: '基于行业统计数据估算'
      },
      version: '2024.01',
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2024-12-31'),
      status: 'active',
      notes: '示例数据，需替换为真实数据',
      usageCount: 0
    }
  ];
  
  // 使用生成的完整数据
  // initialBaselines 已通过 generateAllBaselines() 生成
  
  try {
    // 为每条数据生成 baselineId 和添加时间戳
    const now = new Date();
    const baselines = initialBaselines.map(baseline => ({
      ...baseline,
      baselineId: generateBaselineId(baseline.category),
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system'
    }));
    
    // 批量插入数据
    for (const baseline of baselines) {
      try {
        await db.collection('carbon_baselines').add(baseline);
        console.log(`✅ 导入基准值: ${baseline.baselineId}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  基准值已存在: ${baseline.baselineId}`);
        } else {
          console.error(`❌ 导入失败: ${baseline.baselineId}`, error);
        }
      }
    }
    
    console.log('✅ 初始数据导入完成');
  } catch (error) {
    console.error('❌ 数据导入失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('碳足迹基准值数据库初始化');
  console.log('========================================\n');
  
  try {
    // 1. 创建索引
    await createIndexes();
    console.log('');
    
    // 2. 导入初始数据
    await importInitialData();
    console.log('');
    
    console.log('========================================');
    console.log('✅ 初始化完成');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  createIndexes,
  importInitialData,
  generateBaselineId
};

