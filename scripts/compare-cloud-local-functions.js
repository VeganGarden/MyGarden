/**
 * 对比云端和本地云函数的一致性
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// 读取 cloudbaserc.json
const cloudbaserc = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../cloudbaserc.json'), 'utf8')
)

const configuredFunctions = cloudbaserc.functions.map(f => f.name)
const functionsDir = path.join(__dirname, '../cloudfunctions')

console.log('========================================')
console.log('云端与本地云函数一致性检查')
console.log('========================================\n')

console.log('⚠️  注意：此脚本只能检查本地文件')
console.log('   要检查云端代码，需要：')
console.log('   1. 在云函数控制台手动下载代码对比')
console.log('   2. 或使用 tcb functions:download 命令下载\n')

console.log('========================================')
console.log('本地云函数检查')
console.log('========================================\n')

const results = []

configuredFunctions.forEach(funcName => {
  const funcDir = path.join(functionsDir, funcName)
  const indexPath = path.join(funcDir, 'index.js')
  
  const result = {
    name: funcName,
    localExists: fs.existsSync(funcDir),
    hasIndex: fs.existsSync(indexPath),
    hasPackageJson: fs.existsSync(path.join(funcDir, 'package.json')),
    hasNodeModules: fs.existsSync(path.join(funcDir, 'node_modules')),
  }
  
  if (result.hasIndex) {
    try {
      const indexContent = fs.readFileSync(indexPath, 'utf8')
      result.indexSize = indexContent.length
      result.indexHash = crypto.createHash('md5').update(indexContent).digest('hex').substring(0, 8)
      result.lastModified = fs.statSync(indexPath).mtime.toISOString().split('T')[0]
    } catch (error) {
      result.error = error.message
    }
  }
  
  results.push(result)
})

// 显示结果
console.log('已配置的云函数状态:')
console.log('========================================')
results.forEach((result, index) => {
  const status = result.localExists && result.hasIndex ? '✅' : '❌'
  console.log(`${index + 1}. ${status} ${result.name}`)
  if (result.localExists) {
    console.log(`   目录存在: ✅`)
    console.log(`   index.js: ${result.hasIndex ? '✅' : '❌'}`)
    console.log(`   package.json: ${result.hasPackageJson ? '✅' : '❌'}`)
    console.log(`   node_modules: ${result.hasNodeModules ? '✅' : '❌'}`)
    if (result.hasIndex) {
      console.log(`   文件大小: ${result.indexSize} 字节`)
      console.log(`   文件哈希: ${result.indexHash}`)
      console.log(`   最后修改: ${result.lastModified}`)
    }
    if (result.error) {
      console.log(`   ⚠️  错误: ${result.error}`)
    }
  } else {
    console.log(`   ⚠️  本地目录不存在`)
  }
  console.log('')
})

console.log('========================================')
console.log('检查 tenant 云函数（最近更新的）')
console.log('========================================\n')

const tenantResult = results.find(r => r.name === 'tenant')
if (tenantResult && tenantResult.hasIndex) {
  const tenantDir = path.join(functionsDir, 'tenant')
  const indexFile = path.join(tenantDir, 'index.js')
  const content = fs.readFileSync(indexFile, 'utf8')
  
  // 检查是否包含新添加的函数
  const hasListAllRestaurants = content.includes('listAllRestaurants')
  const hasUpdateRestaurantStatus = content.includes('updateRestaurantStatus')
  const hasUpdateRestaurantCertification = content.includes('updateRestaurantCertification')
  const hasRequirePlatformAdmin = content.includes('requirePlatformAdmin')
  
  console.log('tenant 云函数新功能检查:')
  console.log(`  listAllRestaurants: ${hasListAllRestaurants ? '✅' : '❌'}`)
  console.log(`  updateRestaurantStatus: ${hasUpdateRestaurantStatus ? '✅' : '❌'}`)
  console.log(`  updateRestaurantCertification: ${hasUpdateRestaurantCertification ? '✅' : '❌'}`)
  console.log(`  requirePlatformAdmin: ${hasRequirePlatformAdmin ? '✅' : '❌'}`)
  
  if (hasListAllRestaurants && hasUpdateRestaurantStatus && hasUpdateRestaurantCertification && hasRequirePlatformAdmin) {
    console.log('\n✅ tenant 云函数包含所有新功能')
  } else {
    console.log('\n⚠️  tenant 云函数可能未包含所有新功能')
  }
}

console.log('\n========================================')
console.log('云端代码检查方法')
console.log('========================================\n')

console.log('方法1：在云函数控制台检查')
console.log('1. 访问: https://console.cloud.tencent.com/tcb')
console.log('2. 选择环境: my-garden-app-env-4e0h762923be2f')
console.log('3. 进入「云函数」管理')
console.log('4. 点击每个云函数，查看代码')
console.log('5. 对比本地代码\n')

console.log('方法2：下载云端代码对比')
console.log('使用命令下载云端代码:')
console.log('  tcb functions:download <function-name> --envId my-garden-app-env-4e0h762923be2f')
console.log('然后对比下载的代码和本地代码\n')

console.log('方法3：检查部署时间')
console.log('在云函数控制台查看每个函数的「更新时间」')
console.log('对比本地文件的「最后修改时间」\n')

console.log('========================================\n')

