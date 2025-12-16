#!/usr/bin/env node

/**
 * 修复因子库中的重复条目
 * 使用方法: 
 *   node scripts/fix-duplicate-factors.js          # 预览模式（不实际删除）
 *   node scripts/fix-duplicate-factors.js --exec   # 执行模式（实际删除）
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_ID = 'my-garden-app-env-4e0h762923be2f'; // 替换为你的环境ID

// 检查是否为执行模式
const isExecMode = process.argv.includes('--exec');

console.log('========================================');
console.log('修复因子库重复条目');
console.log('========================================\n');

console.log(`📋 环境ID: ${ENV_ID}`);
console.log(`📋 执行模式: ${isExecMode ? '执行模式（将实际删除数据）' : '预览模式（不会删除数据）'}\n`);

// 构造调用参数
const params = {
  action: 'fixDuplicateFactors',
  dryRun: !isExecMode
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
  
  console.log('\n✅ 修复完成');
  
  if (!isExecMode) {
    console.log('\n💡 提示：这是预览模式，没有实际删除数据');
    console.log('💡 如需执行删除，请运行: node scripts/fix-duplicate-factors.js --exec');
  }
} catch (error) {
  console.error('\n❌ 修复失败');
  console.error('错误:', error.message);
  process.exit(1);
}

