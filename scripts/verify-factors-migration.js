#!/usr/bin/env node

/**
 * 验证因子数据迁移的完整性
 * 使用方法: node scripts/verify-factors-migration.js
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_ID = 'my-garden-app-env-4e0h762923be2f'; // 替换为你的环境ID

console.log('========================================');
console.log('验证因子数据迁移完整性');
console.log('========================================\n');

console.log(`📋 环境ID: ${ENV_ID}`);
console.log(`📋 执行操作: verifyFactorsMigration\n`);

// 构造调用参数
const params = {
  action: 'verifyFactorsMigration'
};

console.log('🚀 调用云函数...\n');

try {
  const paramsStr = JSON.stringify(params);
  const command = `tcb fn invoke database --params '${paramsStr.replace(/'/g, "'\\''")}' --envId ${ENV_ID}`;
  
  const output = execSync(command, {
    encoding: 'utf8',
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });
  
  console.log('\n✅ 验证完成');
} catch (error) {
  console.error('\n❌ 验证失败');
  console.error('错误:', error.message);
  process.exit(1);
}

