const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * 云函数部署脚本
 */
async function deployCloudFunctions() {
  console.log('🚀 开始部署云函数...')
  
  try {
    // 检查是否安装了 cloudbase-cli
    const hasCloudbaseCLI = await checkCloudbaseCLI()
    if (!hasCloudbaseCLI) {
      console.log('📦 正在安装 cloudbase-cli...')
      await installCloudbaseCLI()
    }
    
    // 部署云函数
    console.log('📤 部署云函数到腾讯云开发环境...')
    
    const functions = ['login', 'user', 'garden', 'carbon', 'database']
    
    for (const funcName of functions) {
      console.log(`🔧 部署云函数: ${funcName}`)
      
      await execCommand(`cloudbase functions:deploy ${funcName} -e ${process.env.CLOUDBASE_ENVID || 'my-garden-app-env'}`)
    }
    
    console.log('✅ 云函数部署完成！')
    
    // 初始化数据库
    console.log('🗄️ 初始化数据库...')
    await execCommand('node scripts/init-database.js')
    
    console.log('🎉 部署流程全部完成！')
    
  } catch (error) {
    console.error('❌ 部署失败:', error)
    process.exit(1)
  }
}

/**
 * 检查是否安装了 cloudbase-cli
 */
function checkCloudbaseCLI() {
  return new Promise((resolve) => {
    exec('cloudbase --version', (error) => {
      resolve(!error)
    })
  })
}

/**
 * 安装 cloudbase-cli
 */
function installCloudbaseCLI() {
  return new Promise((resolve, reject) => {
    exec('npm install -g @cloudbase/cli', (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      console.log(stdout)
      resolve()
    })
  })
}

/**
 * 执行命令
 */
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      console.log(stdout)
      if (stderr) {
        console.error(stderr)
      }
      resolve()
    })
  })
}

// 如果是直接运行此脚本
if (require.main === module) {
  deployCloudFunctions().catch(console.error)
}

module.exports = deployCloudFunctions