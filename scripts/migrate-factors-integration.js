#!/usr/bin/env node

/**
 * 执行因子数据整合迁移脚本
 * 使用方法: 
 *   node scripts/migrate-factors-integration.js              # 预览模式（不实际更新数据）
 *   node scripts/migrate-factors-integration.js --exec       # 执行模式（实际更新数据）
 *   node scripts/migrate-factors-integration.js --exec --remove  # 执行模式并删除原字段
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_ID = 'my-garden-app-env-4e0h762923be2f'; // 替换为你的环境ID

// 检查是否传入 --exec 参数
const dryRun = !process.argv.includes('--exec');
const removeFactorFields = process.argv.includes('--remove');

console.log('========================================');
console.log('因子数据整合迁移');
console.log('========================================\n');

console.log(`📋 环境ID: ${ENV_ID}`);
console.log(`📋 执行模式: ${dryRun ? '预览模式（不会更新数据）' : '执行模式（将实际更新数据）'}`);
console.log(`📋 删除字段: ${removeFactorFields ? '是（将删除原集合中的因子字段）' : '否（仅更新因子库）'}\n`);

// 构造调用参数
const params = {
  action: 'migrateFactorsIntegration',
  dryRun: dryRun,
  removeFactorFields: removeFactorFields
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
  
  console.log('\n✅ 迁移完成');
  if (dryRun) {
    console.log('\n💡 提示：这是预览模式，没有实际更新数据');
    console.log('💡 如需执行迁移，请运行: node scripts/migrate-factors-integration.js --exec');
    if (!removeFactorFields) {
      console.log('💡 如需同时删除原字段，请运行: node scripts/migrate-factors-integration.js --exec --remove');
    }
  }
} catch (error) {
  console.error('\n❌ 迁移失败');
  console.error('错误:', error.message);
  process.exit(1);
}

