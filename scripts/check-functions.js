#!/usr/bin/env node

/**
 * 检查所有云函数的状态
 * 列出已配置但未部署的云函数
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 从 cloudbaserc.json 读取配置的云函数
const cloudbaserc = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'cloudbaserc.json'), 'utf8')
)

const configuredFunctions = cloudbaserc.functions.map(f => f.name)

// 检查云函数目录
const functionsDir = path.join(process.cwd(), 'cloudfunctions')
const existingFunctions = fs.readdirSync(functionsDir).filter(item => {
  const itemPath = path.join(functionsDir, item)
  return fs.statSync(itemPath).isDirectory() && item !== 'node_modules'
})

console.log('==========================================')
console.log('云函数状态检查')
console.log('==========================================\n')

console.log(`已配置的云函数 (${configuredFunctions.length} 个):`)
configuredFunctions.forEach(name => {
  const exists = existingFunctions.includes(name)
  const hasPackageJson = fs.existsSync(
    path.join(functionsDir, name, 'package.json')
  )
  const status = exists && hasPackageJson ? '✅' : '❌'
  console.log(`  ${status} ${name}`)
  if (!exists) {
    console.log(`      ⚠️  目录不存在`)
  } else if (!hasPackageJson) {
    console.log(`      ⚠️  缺少 package.json`)
  }
})

console.log(`\n实际存在的云函数目录 (${existingFunctions.length} 个):`)
existingFunctions.forEach(name => {
  const isConfigured = configuredFunctions.includes(name)
  const status = isConfigured ? '✅' : '⚠️ '
  console.log(`  ${status} ${name}`)
  if (!isConfigured) {
    console.log(`      未在 cloudbaserc.json 中配置`)
  }
})

// 检查未配置的云函数
const unconfigured = existingFunctions.filter(
  name => !configuredFunctions.includes(name)
)

if (unconfigured.length > 0) {
  console.log(`\n⚠️  未配置的云函数 (${unconfigured.length} 个):`)
  unconfigured.forEach(name => {
    console.log(`  - ${name}`)
  })
  console.log('\n建议: 将这些云函数添加到 cloudbaserc.json')
}

// 检查未存在的云函数
const missing = configuredFunctions.filter(
  name => !existingFunctions.includes(name)
)

if (missing.length > 0) {
  console.log(`\n❌ 配置但目录不存在的云函数 (${missing.length} 个):`)
  missing.forEach(name => {
    console.log(`  - ${name}`)
  })
  console.log('\n建议: 创建这些云函数目录或从 cloudbaserc.json 中移除')
}

console.log('\n==========================================')
console.log('检查完成')
console.log('==========================================')

