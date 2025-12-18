const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 初始化审核流程相关数据库集合
 * 包括：approval_configs, approval_requests, approval_records
 */
exports.main = async () => {
  const db = cloud.database()

  console.log('========================================')
  console.log('开始初始化审核流程数据库集合...')
  console.log('========================================\n')

  try {
    // 辅助函数：检查集合是否已存在
    const isCollectionExists = (error) => {
      return error.errCode === -1 || 
             error.errCode === -501001 || 
             (error.message && error.message.includes('exist')) ||
             (error.message && error.message.includes('Table exist'))
    }

    // 1. 创建 approval_configs 集合
    console.log('[1/3] 创建 approval_configs 集合...')
    try {
      await db.createCollection('approval_configs')
      console.log('  ✓ approval_configs 集合创建成功')
    } catch (error) {
      if (isCollectionExists(error)) {
        console.log('  ⚠ approval_configs 集合已存在，跳过创建')
      } else {
        throw error
      }
    }

    // 2. 创建 approval_requests 集合
    console.log('[2/3] 创建 approval_requests 集合...')
    try {
      await db.createCollection('approval_requests')
      console.log('  ✓ approval_requests 集合创建成功')
    } catch (error) {
      if (isCollectionExists(error)) {
        console.log('  ⚠ approval_requests 集合已存在，跳过创建')
      } else {
        throw error
      }
    }

    // 3. 创建 approval_records 集合
    console.log('[3/3] 创建 approval_records 集合...')
    try {
      await db.createCollection('approval_records')
      console.log('  ✓ approval_records 集合创建成功')
    } catch (error) {
      if (isCollectionExists(error)) {
        console.log('  ⚠ approval_records 集合已存在，跳过创建')
      } else {
        throw error
      }
    }

    console.log('\n========================================')
    console.log('✅ 审核流程数据库集合初始化完成！')
    console.log('========================================')
    console.log('\n📋 下一步：')
    console.log('1. 在云开发控制台手动创建索引：')
    console.log('   - approval_configs: { configId: 1 } (唯一), { businessType: 1, operationType: 1 }, { status: 1 }')
    console.log('   - approval_requests: { requestId: 1 } (唯一), { businessType: 1, businessId: 1 }, { submitterId: 1, status: 1 }, { status: 1, currentNodeIndex: 1 }, { createdAt: -1 }')
    console.log('   - approval_records: { requestId: 1 }, { approverId: 1, reviewedAt: -1 }')
    console.log('2. 运行初始化脚本创建默认审核配置')
    console.log('========================================\n')

    return {
      code: 0,
      message: '审核流程集合初始化成功',
      collections: ['approval_configs', 'approval_requests', 'approval_records']
    }
  } catch (error) {
    console.error('❌ 初始化失败:', error)
    return {
      code: 500,
      message: '初始化失败',
      error: error.message
    }
  }
}

