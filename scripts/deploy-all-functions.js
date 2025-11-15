#!/usr/bin/env node

/**
 * 部署所有云函数到腾讯云开发
 * 
 * 使用方法:
 * 1. 确保已安装云开发CLI: npm install -g @cloudbase/cli
 * 2. 确保已登录: tcb login
 * 3. 运行: node scripts/deploy-all-functions.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 云函数列表
const FUNCTIONS = [
  'login',
  'user',
  'garden',
  'carbon',
  'database',
  'data-import',
  'meat-data-import',
  'recipe-data-import',
  'plant-templates',
  'practitioners',
  'wisdom',
  'practitioner-data-import',
  'recipe',
  'ingredient',
  'tenant',
  'order-sync',
  'restaurant-order-sync',
  'restaurant-recommend',
  'product-recommend',
  'product-data-import',
  'carbon-baseline-query',
  'carbon-baseline-manage',
  'carbon-baseline-init',
]

// 检查命令是否存在
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// 执行命令
function execCommand(command, cwd = process.cwd()) {
  try {
    execSync(command, { 
      cwd,
      stdio: 'inherit',
      encoding: 'utf8'
    })
    return true
  } catch (error) {
    console.error(`执行失败: ${command}`)
    return false
  }
}

// 主函数
async function deployAllFunctions() {
  console.log('==========================================')
  console.log('开始部署所有云函数到腾讯云开发')
  console.log('==========================================\n')

  // 检查云开发CLI
  if (!commandExists('tcb')) {
    console.error('❌ 未安装腾讯云开发CLI')
    console.log('请先安装: npm install -g @cloudbase/cli')
    process.exit(1)
  }

  // 检查是否已登录
  try {
    execSync('tcb login:check', { stdio: 'ignore' })
  } catch {
    console.error('⚠️  未登录云开发，请先登录:')
    console.log('   tcb login')
    process.exit(1)
  }

  const results = {
    success: [],
    failed: [],
  }

  // 部署每个云函数
  for (const funcName of FUNCTIONS) {
    const funcPath = path.join(process.cwd(), 'cloudfunctions', funcName)
    
    console.log('\n----------------------------------------')
    console.log(`正在部署: ${funcName}`)
    console.log('----------------------------------------')

    if (!fs.existsSync(funcPath)) {
      console.log(`⚠️  目录不存在: ${funcPath}`)
      results.failed.push({ name: funcName, reason: '目录不存在' })
      continue
    }

    // 检查是否有package.json
    const packageJsonPath = path.join(funcPath, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      console.log('安装依赖...')
      if (!execCommand('npm install --production', funcPath)) {
        results.failed.push({ name: funcName, reason: '依赖安装失败' })
        continue
      }
    }

    // 部署云函数
    console.log(`部署云函数: ${funcName}`)
    if (execCommand(`tcb fn deploy ${funcName} --force`, process.cwd())) {
      console.log(`✅ ${funcName} 部署成功`)
      results.success.push(funcName)
    } else {
      console.log(`❌ ${funcName} 部署失败`)
      results.failed.push({ name: funcName, reason: '部署失败' })
    }
  }

  // 输出结果
  console.log('\n==========================================')
  console.log('部署完成')
  console.log('==========================================')
  console.log(`✅ 成功: ${results.success.length} 个`)
  console.log(`❌ 失败: ${results.failed.length} 个`)

  if (results.success.length > 0) {
    console.log('\n成功部署的云函数:')
    results.success.forEach(name => console.log(`  ✅ ${name}`))
  }

  if (results.failed.length > 0) {
    console.log('\n失败的云函数:')
    results.failed.forEach(({ name, reason }) => {
      console.log(`  ❌ ${name} - ${reason}`)
    })
  }

  console.log('\n提示: 如果部署失败，请检查:')
  console.log('  1. 云开发环境ID是否正确 (cloudbaserc.json)')
  console.log('  2. 是否已登录云开发 (tcb login)')
  console.log('  3. 云函数代码是否有语法错误')
  console.log('  4. 依赖是否安装成功')

  return results
}

// 运行
if (require.main === module) {
  deployAllFunctions()
    .then((results) => {
      const exitCode = results.failed.length === 0 ? 0 : 1
      process.exit(exitCode)
    })
    .catch((error) => {
      console.error('部署过程出错:', error)
      process.exit(1)
    })
}

module.exports = { deployAllFunctions }

