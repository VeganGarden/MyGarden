#!/usr/bin/env node

/**
 * 从现有食材集合初始化因子数据
 * 使用方法: node scripts/init-factors-from-ingredients.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PARAMS_FILE = path.join(PROJECT_ROOT, 'cloudbaserc.json');

console.log('========================================');
console.log('从现有食材集合初始化因子数据');
console.log('========================================\n');

// 读取环境ID
let envId = 'my-garden-app-env-4e0h762923be2f';
if (fs.existsSync(PARAMS_FILE)) {
  const config = JSON.parse(fs.readFileSync(PARAMS_FILE, 'utf8'));
  if (config.envId) {
    envId = config.envId;
  }
}

const params = {
  action: 'initFactorsFromExistingIngredients'
};

console.log(`📋 环境ID: ${envId}`);
console.log(`📋 执行操作: ${params.action}\n`);
console.log('🚀 调用云函数...\n');

try {
  const paramsStr = JSON.stringify(params);
  const command = `tcb fn invoke database --params '${paramsStr.replace(/'/g, "'\\''")}' --envId ${envId}`;
  
  const output = execSync(command, {
    encoding: 'utf8',
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });
  
  console.log('\n✅ 执行完成');
} catch (error) {
  console.error('\n❌ 执行失败');
  console.error('错误:', error.message);
  process.exit(1);
}

