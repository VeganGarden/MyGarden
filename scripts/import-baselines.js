/**
 * 碳足迹基准值数据导入工具
 * 
 * 功能：
 * 1. 从Excel/CSV文件导入基准值数据
 * 2. 数据验证和清洗
 * 3. 批量导入数据库
 * 
 * 使用方法：
 * node scripts/import-baselines.js <file_path>
 * 
 * 文件格式（CSV）：
 * mealType,region,energyType,city,restaurantType,value,uncertainty,lower,upper,ingredients,cookingEnergy,packaging,other,sourceType,organization,report,year,methodology,version,effectiveDate,expiryDate,notes
 */

const cloud = require('@cloudbase/node-sdk');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 初始化云开发
const app = cloud.init({
  env: process.env.TCB_ENV || 'your-env-id',
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();

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
 * 验证基准值数据
 */
function validateBaseline(baseline) {
  const errors = [];
  
  // 必填字段检查
  if (!baseline.category.mealType) errors.push('mealType 必填');
  if (!baseline.category.region) errors.push('region 必填');
  if (!baseline.category.energyType) errors.push('energyType 必填');
  if (!baseline.carbonFootprint.value) errors.push('value 必填');
  
  // 数值范围检查
  if (baseline.carbonFootprint.value < 0) {
    errors.push('value 必须 >= 0');
  }
  
  if (baseline.category.mealType === 'meat_simple') {
    if (baseline.carbonFootprint.value < 3.0 || baseline.carbonFootprint.value > 7.0) {
      errors.push('肉食简餐基准值应在 3.0-7.0 kg CO₂e 范围内');
    }
  } else if (baseline.category.mealType === 'meat_full') {
    if (baseline.carbonFootprint.value < 5.0 || baseline.carbonFootprint.value > 10.0) {
      errors.push('肉食正餐基准值应在 5.0-10.0 kg CO₂e 范围内');
    }
  }
  
  // 一致性检查
  if (baseline.breakdown) {
    const total = (baseline.breakdown.ingredients || 0) +
                  (baseline.breakdown.cookingEnergy || 0) +
                  (baseline.breakdown.packaging || 0) +
                  (baseline.breakdown.other || 0);
    if (Math.abs(total - baseline.carbonFootprint.value) > 0.5) {
      errors.push(`分解数据总和 (${total}) 与总值 (${baseline.carbonFootprint.value}) 差异过大`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 从CSV文件读取数据
 */
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // 转换CSV行数据为基准值对象
        const baseline = {
          category: {
            mealType: row.mealType,
            region: row.region,
            energyType: row.energyType,
            city: row.city || undefined,
            restaurantType: row.restaurantType || undefined
          },
          carbonFootprint: {
            value: parseFloat(row.value),
            uncertainty: parseFloat(row.uncertainty) || 0,
            confidenceInterval: {
              lower: parseFloat(row.lower) || parseFloat(row.value) - (parseFloat(row.uncertainty) || 0),
              upper: parseFloat(row.upper) || parseFloat(row.value) + (parseFloat(row.uncertainty) || 0)
            },
            unit: 'kg CO₂e'
          },
          breakdown: row.ingredients ? {
            ingredients: parseFloat(row.ingredients) || 0,
            cookingEnergy: parseFloat(row.cookingEnergy) || 0,
            packaging: parseFloat(row.packaging) || 0,
            other: parseFloat(row.other) || 0
          } : undefined,
          source: {
            type: row.sourceType || 'industry_statistics',
            organization: row.organization || '',
            report: row.report || '',
            year: parseInt(row.year) || new Date().getFullYear(),
            methodology: row.methodology || ''
          },
          version: row.version || '2024.01',
          effectiveDate: row.effectiveDate ? new Date(row.effectiveDate) : new Date('2024-01-01'),
          expiryDate: row.expiryDate ? new Date(row.expiryDate) : new Date('2024-12-31'),
          status: 'active',
          notes: row.notes || '',
          usageCount: 0
        };
        
        results.push(baseline);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * 导入基准值数据
 */
async function importBaselines(baselines) {
  const now = new Date();
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (const baseline of baselines) {
    try {
      // 生成baselineId
      const baselineId = generateBaselineId(baseline.category);
      
      // 验证数据
      const validation = validateBaseline(baseline);
      if (!validation.valid) {
        errorCount++;
        errors.push({
          baselineId,
          errors: validation.errors
        });
        console.error(`❌ 验证失败: ${baselineId}`, validation.errors);
        continue;
      }
      
      // 添加元数据
      const baselineData = {
        ...baseline,
        baselineId,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system'
      };
      
      // 检查是否已存在
      const existing = await db.collection('carbon_baselines')
        .where({
          baselineId: baselineId,
          status: 'active'
        })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`⚠️  基准值已存在: ${baselineId}，跳过导入`);
        continue;
      }
      
      // 插入数据库
      await db.collection('carbon_baselines').add(baselineData);
      successCount++;
      console.log(`✅ 导入成功: ${baselineId}`);
    } catch (error) {
      errorCount++;
      errors.push({
        baselineId: baseline.baselineId || 'unknown',
        error: error.message
      });
      console.error(`❌ 导入失败:`, error);
    }
  }
  
  return {
    successCount,
    errorCount,
    errors
  };
}

/**
 * 主函数
 */
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('❌ 请提供CSV文件路径');
    console.log('使用方法: node scripts/import-baselines.js <file_path>');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }
  
  console.log('========================================');
  console.log('碳足迹基准值数据导入');
  console.log('========================================\n');
  console.log(`文件路径: ${filePath}\n`);
  
  try {
    // 1. 读取CSV文件
    console.log('正在读取CSV文件...');
    const baselines = await readCSV(filePath);
    console.log(`✅ 读取到 ${baselines.length} 条数据\n`);
    
    // 2. 导入数据
    console.log('开始导入数据...\n');
    const result = await importBaselines(baselines);
    
    // 3. 输出结果
    console.log('\n========================================');
    console.log('导入完成');
    console.log('========================================');
    console.log(`成功: ${result.successCount} 条`);
    console.log(`失败: ${result.errorCount} 条`);
    
    if (result.errors.length > 0) {
      console.log('\n错误详情:');
      result.errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.baselineId || 'unknown'}:`, err.errors || err.error);
      });
    }
    
    console.log('\n========================================');
  } catch (error) {
    console.error('\n❌ 导入失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  readCSV,
  validateBaseline,
  importBaselines,
  generateBaselineId
};

