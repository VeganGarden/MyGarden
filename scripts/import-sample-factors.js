/**
 * 导入示例因子数据到数据库
 * 
 * 使用方法:
 * node scripts/import-sample-factors.js
 * 
 * 或者通过云函数调用:
 * tcb fn invoke carbon-factor-manage --params '{"action":"batchImport","factors":[...]}'
 */

const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成因子ID
 */
function generateFactorId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `FACTOR_${timestamp}_${random}`;
}

/**
 * 导入示例数据
 */
async function importSampleFactors() {
  try {
    // 读取示例数据文件
    const sampleDataPath = path.join(__dirname, '../cloudfunctions/carbon-factor-manage/sample-factors.json');
    const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
    
    console.log(`📦 准备导入 ${sampleData.length} 条因子数据...\n`);
    
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    const now = new Date();
    const OPENID = 'system'; // 系统导入
    
    // 逐个导入
    for (let i = 0; i < sampleData.length; i++) {
      const factor = sampleData[i];
      
      try {
        // 检查是否已存在（根据名称和区域）
        const existing = await db.collection('carbon_emission_factors')
          .where({
            name: factor.name,
            region: factor.region || 'CN'
          })
          .get();
        
        if (existing.data.length > 0) {
          console.log(`⏭️  [${i + 1}/${sampleData.length}] 跳过 "${factor.name}" (已存在)`);
          results.skipped++;
          continue;
        }
        
        // 生成因子ID
        const factorId = generateFactorId();
        
        // 准备数据
        const factorData = {
          factorId,
          name: factor.name,
          alias: factor.alias || [],
          category: factor.category,
          subCategory: factor.subCategory,
          factorValue: factor.factorValue,
          unit: factor.unit,
          uncertainty: factor.uncertainty,
          region: factor.region || 'CN',
          source: factor.source,
          year: factor.year || new Date().getFullYear(),
          version: factor.version || 'v1.0',
          boundary: factor.boundary || 'cradle-to-gate',
          status: factor.status || 'active',
          notes: factor.notes || '',
          createdAt: now,
          updatedAt: now,
          createdBy: OPENID,
          updatedBy: OPENID
        };
        
        // 插入数据
        await db.collection('carbon_emission_factors').add({
          data: factorData
        });
        
        console.log(`✅ [${i + 1}/${sampleData.length}] 导入成功: "${factor.name}" (${factorId})`);
        results.success++;
        
      } catch (error) {
        console.error(`❌ [${i + 1}/${sampleData.length}] 导入失败 "${factor.name}":`, error.message);
        results.failed++;
        results.errors.push({
          index: i + 1,
          name: factor.name,
          error: error.message
        });
      }
    }
    
    console.log('\n========================================');
    console.log('📊 导入结果汇总:');
    console.log(`   ✅ 成功: ${results.success}`);
    console.log(`   ❌ 失败: ${results.failed}`);
    console.log(`   ⏭️  跳过: ${results.skipped}`);
    console.log('========================================\n');
    
    if (results.errors.length > 0) {
      console.log('错误详情:');
      results.errors.forEach(err => {
        console.log(`   - [${err.index}] ${err.name}: ${err.error}`);
      });
      console.log('');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  }
}

// 执行导入
if (require.main === module) {
  importSampleFactors()
    .then(() => {
      console.log('✅ 导入完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 导入失败:', error);
      process.exit(1);
    });
}

module.exports = { importSampleFactors };

