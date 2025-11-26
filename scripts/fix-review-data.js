/**
 * 修复审核数据脚本
 * 清理 systemEvaluation 阶段的人工审核记录
 * 
 * 使用方法：
 * node scripts/fix-review-data.js [applicationId]
 * 
 * 如果不提供 applicationId，将修复所有申请
 */

const cloud = require('@cloudbase/node-sdk')

// 初始化云开发环境
const app = cloud.init({
  env: 'my-garden-app-env-4e0h762923be2f', // 替换为你的环境ID
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
})

async function fixReviewData(applicationId) {
  try {
    console.log('开始修复审核数据...')
    if (applicationId) {
      console.log(`修复指定申请: ${applicationId}`)
    } else {
      console.log('修复所有申请...')
    }

    const result = await app.callFunction({
      name: 'restaurant-certification',
      data: {
        action: 'fixReviewData',
        data: {
          applicationId: applicationId || undefined
        }
      }
    })

    if (result.result && result.result.code === 0) {
      console.log('✅ 数据修复成功！')
      console.log(`修复了 ${result.result.data.fixedCount} 个申请`)
      
      if (result.result.data.results && result.result.data.results.length > 0) {
        console.log('\n修复详情:')
        result.result.data.results.forEach((item, index) => {
          console.log(`  ${index + 1}. 申请编号: ${item.applicationNumber}`)
          console.log(`     移除了 ${item.removedCount} 条 systemEvaluation 审核记录`)
          console.log(`     剩余 ${item.remainingCount} 条审核记录`)
        })
      }
    } else {
      console.error('❌ 数据修复失败:', result.result?.message || '未知错误')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message)
    process.exit(1)
  }
}

// 从命令行参数获取 applicationId
const applicationId = process.argv[2]

fixReviewData(applicationId)

