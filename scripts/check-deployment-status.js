/**
 * 检查云函数部署状态
 * 对比本地云函数和云端部署状态
 */

const fs = require('fs')
const path = require('path')

// 读取 cloudbaserc.json
const cloudbaserc = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../cloudbaserc.json'), 'utf8')
)

const configuredFunctions = cloudbaserc.functions.map(f => f.name)
const functionsDir = path.join(__dirname, '../cloudfunctions')

// 获取所有云函数目录
const allDirs = fs.readdirSync(functionsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  .filter(name => {
    return !['node_modules', 'common'].includes(name)
  })

console.log('========================================')
console.log('云函数部署状态检查')
console.log('========================================\n')

console.log('📋 已配置的云函数（cloudbaserc.json）:')
console.log('========================================')
configuredFunctions.forEach((name, index) => {
  const exists = allDirs.includes(name)
  const hasIndex = exists && fs.existsSync(path.join(functionsDir, name, 'index.js'))
  const status = hasIndex ? '✅' : '❌'
  console.log(`${index + 1}. ${status} ${name}`)
})
console.log('')

console.log('📦 本地云函数目录（但未在配置中）:')
console.log('========================================')
const undeployedInConfig = allDirs.filter(dir => !configuredFunctions.includes(dir))

if (undeployedInConfig.length > 0) {
  undeployedInConfig.forEach((name, index) => {
    const hasIndex = fs.existsSync(path.join(functionsDir, name, 'index.js'))
    const status = hasIndex ? '✅ 有代码' : '⚠️  无代码'
    console.log(`${index + 1}. ${name} - ${status}`)
  })
  console.log('')
  console.log('⚠️  这些云函数未在 cloudbaserc.json 中配置')
  console.log('   可能原因：')
  console.log('   1. 新创建的云函数，还未添加到配置')
  console.log('   2. 测试/临时云函数，不需要部署')
  console.log('   3. 已废弃的云函数')
  console.log('')
} else {
  console.log('✅ 所有云函数目录都已配置\n')
}

console.log('========================================')
console.log('部署状态分析')
console.log('========================================\n')

console.log('📊 统计信息:')
console.log(`   总云函数目录: ${allDirs.length}`)
console.log(`   已配置的云函数: ${configuredFunctions.length}`)
console.log(`   未配置的云函数: ${undeployedInConfig.length}`)
console.log('')

console.log('⚠️  重要说明:')
console.log('   此检查只能对比本地配置和目录')
console.log('   要确认云端实际部署状态，需要：')
console.log('   1. 在云函数控制台查看已部署的函数列表')
console.log('   2. 或使用命令: tcb functions:list --envId my-garden-app-env-4e0h762923be2f')
console.log('   3. 对比云端列表和本地配置列表')
console.log('')

if (undeployedInConfig.length > 0) {
  console.log('💡 建议操作:')
  console.log('========================================')
  console.log('对于未配置的云函数，请决定：')
  console.log('')
  console.log('1. 如果需要部署，添加到 cloudbaserc.json:')
  undeployedInConfig.forEach(name => {
    console.log(`   - ${name}`)
  })
  console.log('')
  console.log('2. 如果不需要部署，可以忽略')
  console.log('')
  console.log('3. 单独部署某个云函数:')
  console.log('   tcb fn deploy <function-name> --envId my-garden-app-env-4e0h762923be2f --force')
  console.log('')
}

console.log('========================================')
console.log('最近修改的云函数（可能需要重新部署）')
console.log('========================================\n')

// 检查最近修改的云函数
const recentFunctions = configuredFunctions.map(name => {
  const indexPath = path.join(functionsDir, name, 'index.js')
  if (fs.existsSync(indexPath)) {
    const stats = fs.statSync(indexPath)
    return {
      name,
      mtime: stats.mtime,
      size: stats.size,
    }
  }
  return null
}).filter(f => f !== null).sort((a, b) => b.mtime - a.mtime).slice(0, 10)

recentFunctions.forEach((func, index) => {
  const date = func.mtime.toISOString().split('T')[0]
  const time = func.mtime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  console.log(`${index + 1}. ${func.name}`)
  console.log(`   最后修改: ${date} ${time}`)
  console.log(`   文件大小: ${(func.size / 1024).toFixed(2)} KB`)
  console.log('')
})

console.log('========================================\n')

