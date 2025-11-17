#!/usr/bin/env node

/**
 * 消息管理系统初始化脚本
 * 自动执行数据库集合创建和事件规则初始化
 * 
 * 使用方法：
 * node scripts/init-message-system.js <env-id>
 */

const { execSync } = require('child_process');
const path = require('path');

// 获取环境 ID
const envId = process.argv[2];

if (!envId) {
  console.error('❌ 错误: 请提供云开发环境 ID');
  console.log('用法: node scripts/init-message-system.js <env-id>');
  process.exit(1);
}

console.log('========================================');
console.log('消息管理系统初始化脚本');
console.log('环境 ID:', envId);
console.log('========================================\n');

// 检查 tcb CLI
try {
  execSync('tcb --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ 错误: 未安装 CloudBase CLI');
  console.log('请先安装: npm install -g @cloudbase/cli');
  process.exit(1);
}

// 步骤 1: 确保 database 云函数已部署
console.log('[步骤 1] 检查 database 云函数...');
try {
  const result = execSync(`tcb fn list --env ${envId}`, { encoding: 'utf-8' });
  if (!result.includes('database')) {
    console.log('⚠️  database 云函数未部署，正在部署...');
    const dbPath = path.join(__dirname, '../cloudfunctions/database');
    execSync('npm install', { cwd: dbPath, stdio: 'inherit' });
    execSync(`tcb fn deploy database --env ${envId}`, { cwd: dbPath, stdio: 'inherit' });
    console.log('✅ database 云函数部署成功\n');
  } else {
    console.log('✅ database 云函数已部署\n');
  }
} catch (error) {
  console.error('❌ 检查 database 云函数失败:', error.message);
  process.exit(1);
}

// 步骤 2: 创建数据库集合
console.log('[步骤 2] 创建数据库集合（3个）...');
try {
  const params = JSON.stringify({ action: 'initMessageCollections' });
  const result = execSync(
    `tcb fn invoke database --env ${envId} --params '${params}'`,
    { encoding: 'utf-8' }
  );
  console.log('执行结果:', result);
  const parsed = JSON.parse(result);
  if (parsed.code === 0) {
    console.log('✅ 数据库集合创建成功\n');
  } else {
    console.error('❌ 数据库集合创建失败:', parsed.message);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ 创建数据库集合失败:', error.message);
  console.log('请检查：');
  console.log('1. 环境 ID 是否正确');
  console.log('2. 是否已登录 CloudBase CLI (tcb login)');
  console.log('3. database 云函数是否已部署');
  process.exit(1);
}

// 步骤 3: 初始化事件规则
console.log('[步骤 3] 初始化事件规则（3个）...');
try {
  const params = JSON.stringify({ action: 'initMessageEventRules' });
  const result = execSync(
    `tcb fn invoke database --env ${envId} --params '${params}'`,
    { encoding: 'utf-8' }
  );
  console.log('执行结果:', result);
  const parsed = JSON.parse(result);
  if (parsed.code === 0) {
    console.log('✅ 事件规则初始化成功\n');
  } else {
    console.error('❌ 事件规则初始化失败:', parsed.message);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ 初始化事件规则失败:', error.message);
  process.exit(1);
}

console.log('========================================');
console.log('✅ 数据库初始化完成！');
console.log('========================================\n');
console.log('⚠️  下一步：');
console.log('1. 请在云开发控制台手动创建 7 个数据库索引');
console.log('2. 参考文档: Docs/消息管理/数据库索引创建指南.md');
console.log('3. 索引创建完成后，继续执行云函数部署');
console.log('');

