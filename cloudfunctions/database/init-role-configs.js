const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 初始化或修复角色配置
 * 确保所有系统角色都有对应的配置
 */
exports.main = async () => {
  const db = cloud.database()
  const _ = db.command

  console.log('========================================')
  console.log('开始初始化/修复角色配置...')
  console.log('========================================\n')

  try {
    // 定义所有系统角色配置
    const roleConfigs = [
      {
        roleCode: 'restaurant_admin',
        roleName: '餐厅管理员',
        roleNameEn: 'Restaurant Manager',
        description: '气候餐厅平台租户，管理自己的餐厅',
        permissions: [
          'certification:apply',
          'certification:view',
          'carbon:view',
          'carbon:maintain', // 允许餐厅管理员维护因子库
          'traceability:view',
          'traceability:manage',
          'operation:view',
          'operation:manage',
          'report:view',
          'recipe:view',
          'recipe:manage',
        ],
        moduleAccess: {
          certification: { canView: true, canCreate: true, canUpdate: false, canDelete: false, scope: 'self' },
          carbon: { canView: true, canCreate: false, canUpdate: false, canDelete: false, scope: 'self' },
          traceability: { canView: true, canCreate: true, canUpdate: true, canDelete: true, scope: 'self' },
          operation: { canView: true, canCreate: true, canUpdate: true, canDelete: true, scope: 'self' },
          report: { canView: true, canCreate: false, canUpdate: false, canDelete: false, scope: 'self' },
          recipe: { canView: true, canCreate: true, canUpdate: true, canDelete: true, scope: 'self' },
        },
        isSystemRole: true,
        status: 'active',
      },
      {
        roleCode: 'platform_operator',
        roleName: '平台运营',
        roleNameEn: 'Platform Operations',
        description: '平台运营人员，审核认证、管理运营活动',
        permissions: [
          'certification:review',
          'certification:view',
          'certification:manage',
          'carbon:view',
          'traceability:view',
          'operation:view',
          'report:view',
          'report:export',
          'report:esg',
          'recipe:view',
          'platform:manage',
        ],
        moduleAccess: {
          certification: { canView: true, canCreate: false, canUpdate: true, canDelete: false, scope: 'all' },
          carbon: { canView: true, canCreate: false, canUpdate: false, canDelete: false, scope: 'all' },
          traceability: { canView: true, canCreate: false, canUpdate: false, canDelete: false, scope: 'all' },
          operation: { canView: true, canCreate: false, canUpdate: true, canDelete: false, scope: 'all' },
          report: { canView: true, canCreate: true, canUpdate: true, canDelete: false, scope: 'all' },
          recipe: { canView: true, canCreate: false, canUpdate: false, canDelete: false, scope: 'all' },
          platform: { canView: true, canCreate: true, canUpdate: true, canDelete: false, scope: 'all' },
        },
        isSystemRole: true,
        status: 'active',
      },
      {
        roleCode: 'carbon_specialist',
        roleName: '碳核算专员',
        roleNameEn: 'Carbon Accounting Specialist',
        description: '碳核算专业人员，维护碳系数和模型',
        permissions: [
          'carbon:view',
          'carbon:maintain',
          'carbon:export',
          'carbon:baseline:manage',
          'report:view',
          'report:export',
        ],
        moduleAccess: {
          carbon: { canView: true, canCreate: true, canUpdate: true, canDelete: true, scope: 'all' },
          report: { canView: true, canCreate: true, canUpdate: true, canDelete: false, scope: 'all' },
        },
        isSystemRole: true,
        status: 'active',
      },
      {
        roleCode: 'government_partner',
        roleName: '政府/外部合作方',
        roleNameEn: 'Government/External Partner',
        description: '政府机构或外部合作方，查看标准化报表和监管数据',
        permissions: [
          'carbon:view',
          'carbon:export',
          'traceability:view',
          'report:view',
          'report:export',
          'report:esg',
          'report:api',
        ],
        moduleAccess: {
          carbon: { canView: true, canCreate: false, canUpdate: false, canDelete: false, scope: 'tenant' },
          traceability: { canView: true, canCreate: false, canUpdate: false, canDelete: false, scope: 'tenant' },
          report: { canView: true, canCreate: false, canUpdate: false, canDelete: false, scope: 'tenant' },
        },
        isSystemRole: true,
        status: 'active',
      },
      {
        roleCode: 'system_admin',
        roleName: '系统管理员',
        roleNameEn: 'Platform System Administrator',
        description: '平台系统管理员，负责系统配置和用户管理',
        permissions: [
          'system:manage',
          'system:user:manage',
          'system:role:manage',
        ],
        moduleAccess: {
          system: { canView: true, canCreate: true, canUpdate: true, canDelete: true, scope: 'all' },
        },
        isSystemRole: true,
        status: 'active',
      },
    ]

    let created = 0
    let updated = 0

    for (const role of roleConfigs) {
      const existing = await db.collection('role_configs')
        .where({ roleCode: role.roleCode })
        .get()
      
      if (existing.data.length === 0) {
        await db.collection('role_configs').add({
          data: {
            ...role,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        })
        console.log(`  ✓ 创建角色配置: ${role.roleName} (${role.roleCode})`)
        created++
      } else {
        // 更新现有角色配置，确保状态为active
        await db.collection('role_configs').doc(existing.data[0]._id).update({
          data: {
            ...role,
            status: 'active', // 确保状态为active
            updatedAt: new Date(),
          }
        })
        console.log(`  ⚠ 更新角色配置: ${role.roleName} (${role.roleCode})`)
        updated++
      }
    }

    console.log('\n========================================')
    console.log('✅ 角色配置初始化/修复完成！')
    console.log('========================================')
    console.log(`\n📋 统计:`)
    console.log(`  - 创建: ${created} 个角色配置`)
    console.log(`  - 更新: ${updated} 个角色配置`)
    console.log('========================================\n')

    return {
      code: 0,
      message: '角色配置初始化/修复成功',
      created,
      updated,
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

