const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 初始化管理后台相关数据库集合
 * 包括：admin_users, role_configs, permissions, audit_logs
 */
exports.main = async () => {
  const db = cloud.database()
  const _ = db.command

  console.log('========================================')
  console.log('开始初始化管理后台数据库集合...')
  console.log('========================================\n')

  try {
    // 辅助函数：检查集合是否已存在
    const isCollectionExists = (error) => {
      return error.errCode === -1 || 
             error.errCode === -501001 || 
             (error.message && error.message.includes('exist')) ||
             (error.message && error.message.includes('Table exist'))
    }

    // 1. 创建 admin_users 集合
    console.log('[1/4] 创建 admin_users 集合...')
    try {
      await db.createCollection('admin_users')
      console.log('  ✓ admin_users 集合创建成功')
    } catch (error) {
      if (isCollectionExists(error)) {
        console.log('  ⚠ admin_users 集合已存在，跳过创建')
      } else {
        throw error
      }
    }

    // 2. 创建 role_configs 集合
    console.log('[2/4] 创建 role_configs 集合...')
    try {
      await db.createCollection('role_configs')
      console.log('  ✓ role_configs 集合创建成功')
    } catch (error) {
      if (isCollectionExists(error)) {
        console.log('  ⚠ role_configs 集合已存在，跳过创建')
      } else {
        throw error
      }
    }

    // 3. 创建 permissions 集合
    console.log('[3/4] 创建 permissions 集合...')
    try {
      await db.createCollection('permissions')
      console.log('  ✓ permissions 集合创建成功')
    } catch (error) {
      if (isCollectionExists(error)) {
        console.log('  ⚠ permissions 集合已存在，跳过创建')
      } else {
        throw error
      }
    }

    // 4. 创建 audit_logs 集合
    console.log('[4/4] 创建 audit_logs 集合...')
    try {
      await db.createCollection('audit_logs')
      console.log('  ✓ audit_logs 集合创建成功')
    } catch (error) {
      if (isCollectionExists(error)) {
        console.log('  ⚠ audit_logs 集合已存在，跳过创建')
      } else {
        throw error
      }
    }

    console.log('\n========================================')
    console.log('✅ 管理后台数据库集合初始化完成！')
    console.log('========================================')
    console.log('\n📋 下一步：')
    console.log('1. 在云开发控制台手动创建索引（参考文档）')
    console.log('2. 运行 init-admin-data.js 初始化角色和权限数据')
    console.log('3. 创建测试管理员账号')
    console.log('========================================\n')

    return {
      code: 0,
      message: '集合初始化成功',
      collections: ['admin_users', 'role_configs', 'permissions', 'audit_logs']
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

