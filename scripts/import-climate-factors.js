#!/usr/bin/env node

/**
 * 导入气候餐厅因子数据到数据库
 * 使用方法: node scripts/import-climate-factors.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FACTORS_FILE = path.join(PROJECT_ROOT, 'cloudfunctions/database/climate-restaurant-factors.json');

console.log('========================================');
console.log('导入气候餐厅因子数据');
console.log('========================================\n');

// 检查文件是否存在
if (!fs.existsSync(FACTORS_FILE)) {
  console.error(`❌ 错误: 因子数据文件不存在: ${FACTORS_FILE}`);
  process.exit(1);
}

console.log(`📄 读取因子数据文件: ${FACTORS_FILE}`);
const factors = JSON.parse(fs.readFileSync(FACTORS_FILE, 'utf8'));
console.log(`   因子数量: ${factors.length}\n`);

// 构造调用参数
const params = {
  action: 'initFactorDataFromJSON',
  factors: factors,
  skipDuplicates: true,
  dryRun: false
};

console.log('🚀 调用云函数导入数据...\n');

try {
  const paramsStr = JSON.stringify(params);
  const command = `tcb fn invoke database --params '${paramsStr.replace(/'/g, "'\\''")}'`;
  
  const output = execSync(command, {
    encoding: 'utf8',
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });
  
  console.log('\n✅ 导入完成');
} catch (error) {
  console.error('\n❌ 导入失败');
  console.error('错误:', error.message);
  process.exit(1);
}

