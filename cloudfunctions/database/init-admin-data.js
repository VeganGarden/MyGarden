const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const crypto = require('crypto')

/**
 * 密码加密
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * 初始化管理后台角色和权限数据
 */
exports.main = async () => {
  const db = cloud.database()
  const _ = db.command

  console.log('========================================')
  console.log('开始初始化管理后台角色和权限数据...')
  console.log('========================================\n')

  try {
    // 1. 插入权限定义数据
    console.log('[1/3] 插入权限定义数据...')
    const permissions = [
      // 餐厅认证权限
      { permissionCode: 'certification:apply', permissionName: '认证申请', module: 'certification', resource: 'certification', action: 'create', description: '提交气候餐厅认证申请', category: 'menu', sort: 1 },
      { permissionCode: 'certification:review', permissionName: '认证审核', module: 'certification', resource: 'certification', action: 'update', description: '审核认证申请', category: 'menu', sort: 2 },
      { permissionCode: 'certification:view', permissionName: '查看认证', module: 'certification', resource: 'certification', action: 'view', description: '查看认证信息和进度', category: 'menu', sort: 3 },
      { permissionCode: 'certification:manage', permissionName: '管理认证', module: 'certification', resource: 'certification', action: 'update', description: '管理认证和证书', category: 'menu', sort: 4 },
      
      // 碳足迹核算权限
      { permissionCode: 'carbon:view', permissionName: '查看碳数据', module: 'carbon', resource: 'carbon', action: 'view', description: '查看碳足迹数据', category: 'menu', sort: 10 },
      { permissionCode: 'carbon:maintain', permissionName: '维护碳数据', module: 'carbon', resource: 'carbon', action: 'update', description: '维护碳足迹数据和模型', category: 'menu', sort: 11 },
      { permissionCode: 'carbon:export', permissionName: '导出碳数据', module: 'carbon', resource: 'carbon', action: 'export', description: '导出碳足迹报表', category: 'button', sort: 12 },
      { permissionCode: 'carbon:baseline:manage', permissionName: '管理基准值', module: 'carbon', resource: 'baseline', action: 'manage', description: '管理碳足迹基准值数据库', category: 'menu', sort: 13 },
      
      // 供应链溯源权限
      { permissionCode: 'traceability:view', permissionName: '查看溯源', module: 'traceability', resource: 'traceability', action: 'view', description: '查看供应链溯源信息', category: 'menu', sort: 20 },
      { permissionCode: 'traceability:manage', permissionName: '管理溯源', module: 'traceability', resource: 'traceability', action: 'manage', description: '管理供应商和溯源链', category: 'menu', sort: 21 },
      
      // 餐厅运营权限
      { permissionCode: 'operation:view', permissionName: '查看运营', module: 'operation', resource: 'operation', action: 'view', description: '查看餐厅运营数据', category: 'menu', sort: 30 },
      { permissionCode: 'operation:manage', permissionName: '管理运营', module: 'operation', resource: 'operation', action: 'manage', description: '管理订单、优惠券等运营功能', category: 'menu', sort: 31 },
      
      // 报表与生态权限
      { permissionCode: 'report:view', permissionName: '查看报表', module: 'report', resource: 'report', action: 'view', description: '查看各类报表', category: 'menu', sort: 40 },
      { permissionCode: 'report:export', permissionName: '导出报表', module: 'report', resource: 'report', action: 'export', description: '导出报表数据', category: 'button', sort: 41 },
      { permissionCode: 'report:esg', permissionName: 'ESG报告', module: 'report', resource: 'esg', action: 'export', description: '生成ESG报告', category: 'menu', sort: 42 },
      { permissionCode: 'report:api', permissionName: 'API访问', module: 'report', resource: 'api', action: 'access', description: '通过API访问数据', category: 'api', sort: 43 },
      
      // 菜谱管理权限
      { permissionCode: 'recipe:view', permissionName: '查看菜谱', module: 'recipe', resource: 'recipe', action: 'view', description: '查看菜谱列表', category: 'menu', sort: 50 },
      { permissionCode: 'recipe:manage', permissionName: '管理菜谱', module: 'recipe', resource: 'recipe', action: 'manage', description: '创建和管理菜谱', category: 'menu', sort: 51 },
      
      // 平台管理权限
      { permissionCode: 'platform:manage', permissionName: '平台管理', module: 'platform', resource: 'platform', action: 'manage', description: '管理平台级数据和配置', category: 'menu', sort: 60 },
      
      // 系统管理权限
      { permissionCode: 'system:manage', permissionName: '系统管理', module: 'system', resource: 'system', action: 'manage', description: '系统管理功能', category: 'menu', sort: 70 },
      { permissionCode: 'system:user:manage', permissionName: '用户管理', module: 'system', resource: 'user', action: 'manage', description: '管理后台用户', category: 'menu', sort: 71 },
      { permissionCode: 'system:role:manage', permissionName: '角色管理', module: 'system', resource: 'role', action: 'manage', description: '管理角色和权限', category: 'menu', sort: 72 },
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
        console.log(`  ✓ 插入权限: ${perm.permissionName}`)
      } else {
        console.log(`  ⚠ 权限已存在: ${perm.permissionName}`)
      }
    }

    // 2. 插入角色配置数据
    console.log('\n[2/3] 插入角色配置数据...')

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
        console.log(`  ✓ 插入角色: ${role.roleName}`)
      } else {
        // 更新现有角色配置
        await db.collection('role_configs').doc(existing.data[0]._id).update({
          data: {
            ...role,
            updatedAt: new Date(),
          }
        })
        console.log(`  ⚠ 更新角色: ${role.roleName}`)
      }
    }

    // 3. 创建默认系统管理员账号（如果不存在）
    console.log('\n[3/3] 创建默认系统管理员账号...')
    const defaultAdmin = {
      username: 'admin',
      password: hashPassword('admin123'), // 默认密码：admin123（生产环境必须修改）
      name: '系统管理员',
      email: 'admin@example.com',
      role: 'system_admin',
      tenantId: null,
      restaurantIds: [],
      permissions: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const adminExists = await db.collection('admin_users')
      .where({ username: 'admin' })
      .get()

    if (adminExists.data.length === 0) {
      await db.collection('admin_users').add({
        data: defaultAdmin
      })
      console.log('  ✓ 创建默认管理员账号: admin / admin123')
      console.log('  ⚠ 警告：生产环境必须立即修改默认密码！')
    } else {
      console.log('  ⚠ 默认管理员账号已存在')
    }

    console.log('\n========================================')
    console.log('✅ 角色和权限数据初始化完成！')
    console.log('========================================')
    console.log('\n📋 已创建:')
    console.log(`  - ${permissions.length} 个权限定义`)
    console.log(`  - ${roleConfigs.length} 个角色配置`)
    console.log('  - 1 个默认系统管理员账号')
    console.log('\n📝 默认管理员账号:')
    console.log('  用户名: admin')
    console.log('  密码: admin123')
    console.log('  ⚠️  请在生产环境修改默认密码！')
    console.log('========================================\n')

    return {
      code: 0,
      message: '数据初始化成功',
      permissions: permissions.length,
      roles: roleConfigs.length,
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

