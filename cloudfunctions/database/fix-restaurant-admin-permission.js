const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 修复餐厅管理员权限：添加 carbon:maintain 权限
 */
exports.main = async () => {
  const db = cloud.database()
  const _ = db.command

  console.log('========================================')
  console.log('开始修复餐厅管理员权限...')
  console.log('========================================\n')

  try {
    // 查询餐厅管理员角色配置
    const roleResult = await db.collection('role_configs')
      .where({ roleCode: 'restaurant_admin' })
      .get()

    if (roleResult.data.length === 0) {
      console.error('❌ 未找到餐厅管理员角色配置')
      return {
        code: 404,
        message: '未找到餐厅管理员角色配置'
      }
    }

    const roleConfig = roleResult.data[0]
    console.log('当前权限列表:', roleConfig.permissions)

    // 检查是否已有 carbon:maintain 权限
    if (roleConfig.permissions.includes('carbon:maintain')) {
      console.log('✅ 餐厅管理员已有 carbon:maintain 权限')
      return {
        code: 0,
        message: '权限已存在，无需更新'
      }
    }

    // 添加 carbon:maintain 权限
    const updatedPermissions = [...roleConfig.permissions, 'carbon:maintain']
    
    await db.collection('role_configs').doc(roleConfig._id).update({
      data: {
        permissions: updatedPermissions,
        updatedAt: new Date(),
      }
    })

    console.log('✅ 成功添加 carbon:maintain 权限')
    console.log('更新后的权限列表:', updatedPermissions)

    console.log('\n========================================')
    console.log('✅ 权限修复完成！')
    console.log('========================================\n')

    return {
      code: 0,
      message: '权限修复成功',
      oldPermissions: roleConfig.permissions,
      newPermissions: updatedPermissions
    }
  } catch (error) {
    console.error('❌ 修复失败:', error)
    return {
      code: 500,
      message: '修复失败',
      error: error.message
    }
  }
}

