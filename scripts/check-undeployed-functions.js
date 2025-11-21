/**
 * 检查未部署的云函数
 */

const fs = require('fs')
const path = require('path')

// 读取 cloudbaserc.json
const cloudbaserc = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../cloudbaserc.json'), 'utf8')
)

// 获取所有配置的云函数名称
const configuredFunctions = cloudbaserc.functions.map(f => f.name)

// 获取所有云函数目录
const functionsDir = path.join(__dirname, '../cloudfunctions')
const allDirs = fs.readdirSync(functionsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  .filter(name => {
    // 排除 node_modules 和 common 等非云函数目录
    return !['node_modules', 'common'].includes(name)
  })

// 找出未配置的云函数
const undeployedFunctions = allDirs.filter(dir => !configuredFunctions.includes(dir))

console.log('========================================')
console.log('云函数部署状态检查')
console.log('========================================\n')

console.log(`总云函数目录数: ${allDirs.length}`)
console.log(`已配置的云函数数: ${configuredFunctions.length}`)
console.log(`未配置的云函数数: ${undeployedFunctions.length}\n`)

if (undeployedFunctions.length > 0) {
  console.log('⚠️  未在 cloudbaserc.json 中配置的云函数:')
  console.log('========================================')
  undeployedFunctions.forEach((func, index) => {
    const hasIndex = fs.existsSync(path.join(functionsDir, func, 'index.js'))
    const status = hasIndex ? '✅ 有代码' : '❌ 无代码'
    console.log(`${index + 1}. ${func} - ${status}`)
  })
  console.log('========================================\n')
  
  console.log('建议:')
  console.log('1. 如果这些云函数需要部署，请添加到 cloudbaserc.json')
  console.log('2. 如果不需要部署，可以忽略')
  console.log('3. 使用以下命令部署单个云函数:')
  console.log('   tcb fn deploy <function-name> --envId my-garden-app-env-4e0h762923be2f --force\n')
} else {
  console.log('✅ 所有云函数目录都已配置\n')
}

// 检查是否有配置但目录不存在的
const missingDirs = configuredFunctions.filter(name => !allDirs.includes(name))
if (missingDirs.length > 0) {
  console.log('⚠️  配置中存在但目录不存在的云函数:')
  missingDirs.forEach(name => {
    console.log(`   - ${name}`)
  })
  console.log('')
}

console.log('========================================')
console.log('已配置的云函数列表:')
console.log('========================================')
configuredFunctions.forEach((name, index) => {
  const exists = allDirs.includes(name)
  const status = exists ? '✅' : '❌'
  console.log(`${index + 1}. ${status} ${name}`)
})
console.log('========================================\n')

