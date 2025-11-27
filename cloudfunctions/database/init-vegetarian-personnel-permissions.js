/**
 * 素食人员管理权限初始化脚本
 * 
 * 用于在权限系统中添加素食人员管理相关的权限定义
 * 并在角色配置中为相应角色分配这些权限
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  try {
    console.log('========================================')
    console.log('开始初始化素食人员管理权限...')
    console.log('========================================\n')

    // 1. 添加权限定义
    console.log('[1/2] 添加权限定义...')
    const permissions = [
      {
        permissionCode: 'vegetarianPersonnel:view',
        permissionName: '查看素食人员',
        module: 'vegetarianPersonnel',
        resource: 'vegetarianPersonnel',
        action: 'view',
        description: '查看餐厅员工和客户的素食情况数据',
        category: 'menu',
        sort: 35,
      },
      {
        permissionCode: 'vegetarianPersonnel:manage',
        permissionName: '管理素食人员',
        module: 'vegetarianPersonnel',
        resource: 'vegetarianPersonnel',
        action: 'manage',
        description: '管理餐厅员工和客户的素食情况数据',
        category: 'menu',
        sort: 36,
      },
    ]

    for (const perm of permissions) {
      const existing = await db.collection('permissions')
        .where({ permissionCode: perm.permissionCode })
        .get()
      
      if (existing.data.length === 0) {
        await db.collection('permissions').add({
          data: {
            ...perm,
            createdAt: new Date(),
          }
        })
        console.log(`  ✓ 添加权限: ${perm.permissionName} (${perm.permissionCode})`)
      } else {
        console.log(`  ⚠ 权限已存在: ${perm.permissionName} (${perm.permissionCode})`)
      }
    }

    // 2. 更新角色配置，为相应角色添加权限
    console.log('\n[2/2] 更新角色配置...')
    
    // 需要添加权限的角色列表
    const roleUpdates = [
      {
        roleCode: 'restaurant_admin',
        permissions: ['vegetarianPersonnel:view', 'vegetarianPersonnel:manage'],
        moduleAccess: {
          vegetarianPersonnel: {
            canView: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            scope: 'self' // 只能管理自己租户的数据
          }
        },
        description: '餐厅管理员 - 管理自己餐厅的素食人员数据'
      },
      {
        roleCode: 'platform_operator',
        permissions: ['vegetarianPersonnel:view'], // 平台运营只查看，不管理
        moduleAccess: {
          vegetarianPersonnel: {
            canView: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            scope: 'all' // 可以查看所有租户的数据
          }
        },
        description: '平台运营 - 查看所有餐厅的素食人员数据'
      },
    ]

    for (const roleUpdate of roleUpdates) {
      const roleResult = await db.collection('role_configs')
        .where({ roleCode: roleUpdate.roleCode })
        .get()
      
      if (roleResult.data.length > 0) {
        const role = roleResult.data[0]
        const currentPermissions = role.permissions || []
        const currentModuleAccess = role.moduleAccess || {}
        
        // 合并权限（去重）
        const updatedPermissions = [...new Set([...currentPermissions, ...roleUpdate.permissions])]
        
        // 合并模块访问权限
        const updatedModuleAccess = {
          ...currentModuleAccess,
          ...roleUpdate.moduleAccess,
        }
        
        // 更新角色配置
        await db.collection('role_configs').doc(role._id).update({
          data: {
            permissions: updatedPermissions,
            moduleAccess: updatedModuleAccess,
            updatedAt: new Date(),
          }
        })
        
        console.log(`  ✓ 更新角色: ${roleUpdate.roleCode}`)
        console.log(`    - 添加权限: ${roleUpdate.permissions.join(', ')}`)
        console.log(`    - 说明: ${roleUpdate.description}`)
      } else {
        console.log(`  ⚠ 角色不存在: ${roleUpdate.roleCode}`)
      }
    }

    console.log('\n========================================')
    console.log('✅ 素食人员管理权限初始化完成！')
    console.log('========================================')
    console.log('\n📋 已添加:')
    console.log(`  - ${permissions.length} 个权限定义`)
    console.log(`  - ${roleUpdates.length} 个角色配置更新`)
    console.log('========================================\n')

    return {
      code: 0,
      message: '素食人员管理权限初始化成功',
      permissions: permissions.length,
      roles: roleUpdates.length,
    }
  } catch (error) {
    console.error('❌ 初始化失败:', error)
    return {
      code: 500,
      message: '素食人员管理权限初始化失败',
      error: error.message,
    }
  }
}

