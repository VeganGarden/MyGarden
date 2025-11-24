const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command // 腾讯云开发数据库命令对象
const { checkPermission } = require('./permission')

async function requireSystemAdmin(event, context) {
  try {
    const user = await checkPermission(event, context)
    if (user && user.role === 'system_admin') {
      return { ok: true, user }
    }
    return { ok: false, error: { code: 403, message: '仅系统管理员可操作' } }
  } catch (err) {
    return { ok: false, error: err }
  }
}

async function requireAuth(event, context) {
  try {
    const user = await checkPermission(event, context)
    return { ok: true, user }
  } catch (err) {
    return { ok: false, error: err }
  }
}

async function requirePlatformAdmin(event, context) {
  try {
    const user = await checkPermission(event, context)
    // 平台运营和系统管理员都可以进行平台管理操作
    if (user && (user.role === 'platform_operator' || user.role === 'system_admin')) {
      return { ok: true, user }
    }
    return { ok: false, error: { code: 403, message: '仅平台管理员可操作' } }
  } catch (err) {
    return { ok: false, error: err }
  }
}
/**
 * 租户和餐厅管理云函数
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const { addAudit } = require('./audit')

  try {
    switch (action) {
      case 'getTenant':
        // 获取租户信息
        return await getTenant(data.tenantId)
      
      case 'getAllTenants':
        // 获取所有租户列表（平台管理员）
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await getAllTenants()
        }

      case 'getRestaurants':
        // 获取租户下的餐厅列表
        return await getRestaurants(data.tenantId, data.restaurantId)

      case 'createTenant':
        // 创建租户
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await createTenant(data)
        }

      case 'updateTenant':
        // 更新租户信息（平台管理员）
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await updateTenant(data.tenantId, data, gate.user, context)
        }

      case 'updateTenantStatus':
        // 更新租户状态（平台管理员）
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await updateTenantStatus(data.tenantId, data.status, gate.user, context)
        }

      case 'deleteTenant':
        // 删除租户（平台管理员）
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await deleteTenant(data.tenantId, gate.user, context)
        }

      case 'updateTenantConfig':
        // 更新租户配置（平台管理员）
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await updateTenantConfig(data.tenantId, data.config, gate.user, context)
        }

      case 'createRestaurant':
        // 创建餐厅
        return await createRestaurant(data)

      case 'updateRestaurant':
        // 更新餐厅信息
        return await updateRestaurant(data.restaurantId, data)

      case 'getRestaurantData':
        // 根据restaurantId获取餐厅相关数据（菜单、订单等）
        return await getRestaurantData(data)

      case 'getBehaviorMetrics':
        // 获取行为统计数据
        return await getBehaviorMetrics(data)
      
      case 'generateBehaviorSnapshot':
        // 生成行为指标快照
        return await generateBehaviorSnapshot(data)

      // 优惠券管理
      case 'listCoupons':
        return await listCoupons(data)
      case 'getCouponDetail':
        return await getCouponDetail(data.couponId)
      case 'createCoupon':
        return await createCoupon(data)
      case 'updateCoupon':
        return await updateCoupon(data.id, data.data)
      case 'deleteCoupon':
        return await deleteCoupon(data.id)
      case 'distributeCoupon':
        return await distributeCoupon(data)
      case 'getCouponStats':
        return await getCouponStats(data)
      case 'analyzeCouponEffect':
        return await analyzeCouponEffect(data)

      // 用户评价
      case 'listReviews':
        return await listReviews(data)
      case 'getReviewDetail':
        return await getReviewDetail(data.reviewId)
      case 'replyReview':
        return await replyReview(data.reviewId, data.reply)
      case 'getReviewStats':
        return await getReviewStats(data)
      case 'analyzeReviews':
        return await analyzeReviews(data)

      // 订单管理
      case 'listOrders':
        return await listOrders(data)
      case 'getOrder':
        return await getOrder(data.orderId)
      case 'updateOrderStatus':
        return await updateOrderStatus(data.orderId, data.status)

      // 订单碳统计
      case 'getOrderCarbonStats':
        return await getOrderCarbonStats(data)

      // 碳报告
      case 'generateCarbonReport':
        return await generateCarbonReport(data)

      // 菜单管理
      case 'getMenuList':
        return await getMenuList(data)
      
      case 'createMenuItemFromRecipe':
        // 从基础菜谱创建餐厅菜单项
        {
          const gate = await requireAuth(event, context)
          if (!gate.ok) return gate.error
          return await createMenuItemFromRecipe(data, gate.user, context)
        }

      case 'getAddedBaseRecipeIds':
        // 查询已添加到菜单的基础菜谱ID列表
        {
          const gate = await requireAuth(event, context)
          if (!gate.ok) return gate.error
          return await getAddedBaseRecipeIds(data)
        }

      case 'removeRecipeFromMenu':
        // 从餐厅菜单中移出基础菜谱
        {
          const gate = await requireAuth(event, context)
          if (!gate.ok) return gate.error
          return await removeRecipeFromMenu(data, gate.user, context)
        }

      case 'updateMenuItem':
        // 更新餐厅菜单项
        {
          const gate = await requireAuth(event, context)
          if (!gate.ok) return gate.error
          return await updateMenuItem(data, gate.user, context)
        }

      case 'getDashboard':
        // 获取数据看板统计数据
        {
          const gate = await requireAuth(event, context)
          if (!gate.ok) return gate.error
          return await getDashboard(data, gate.user)
        }
      
      case 'getDashboardData':
        // 获取数据看板数据（扩展版，包含关键指标、趋势数据、图表数据）
        {
          const gate = await requireAuth(event, context)
          if (!gate.ok) return gate.error
          return await getDashboardData(data, gate.user)
        }

      case 'init':
        // 初始化租户和餐厅数据
        const initScript = require('./init-tenant-data')
        return await initScript.main(event, context)

      // 入驻申请：创建/列表/审批/驳回
      case 'applyForOnboarding':
        return await applyForOnboarding(data)
      case 'listOnboardingApplications':
        return await listOnboardingApplications(data || {})
      case 'approveOnboardingApplication':
        return await approveOnboardingApplication(data.applicationId, data)
      case 'rejectOnboardingApplication':
        return await rejectOnboardingApplication(data.applicationId, data.reason)

      // 管理员账号管理（仅后台邀请/创建）
      case 'createAdminUser':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await createAdminUser(data, context)
        }
      case 'listAdminUsers':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await listAdminUsers(data || {})
        }
      case 'updateAdminUserStatus':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await updateAdminUserStatus(data.userId, data.status, context)
        }
      case 'resetAdminUserPassword':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await resetAdminUserPassword(data.userId, context)
        }
      case 'softDeleteAdminUser':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await softDeleteAdminUser(data.userId, context)
        }

      // 迁移餐厅归属到指定租户
      case 'transferRestaurants':
        return await transferRestaurants(data)
      case 'transferAllRestaurantData':
        return await transferAllRestaurantData(data)
      
      // 系统域：角色、审计、监控、备份
      case 'listRoleConfigs':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await listRoleConfigs(data || {})
        }
      case 'updateRoleStatus':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await updateRoleStatus(data.roleCode, data.status)
        }
      case 'createRoleConfig': {
        const gate = await requireSystemAdmin(event, context)
        if (!gate.ok) return gate.error
        return await createRoleConfig(data || {})
      }
      case 'updateRolePermissions': {
        const gate = await requireSystemAdmin(event, context)
        if (!gate.ok) return gate.error
        return await updateRolePermissions(data.roleCode, data.permissions || [], data.moduleAccess || {})
      }
      case 'listPermissions': {
        const gate = await requireSystemAdmin(event, context)
        if (!gate.ok) return gate.error
        return await listPermissions()
      }
      case 'getAuditLogs':
        // 获取操作日志（平台管理员）
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await getAuditLogs(data || {})
        }
      case 'getSystemMetrics':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await getSystemMetrics()
        }
      case 'runBackupExport':
        {
          const gate = await requireSystemAdmin(event, context)
          if (!gate.ok) return gate.error
          return await runBackupExport(data || {})
        }
      // 个人资料（任何已登录用户）
      case 'updateProfile': {
        const gate = await requireAuth(event, context)
        if (!gate.ok) return gate.error
        return await updateProfile(gate.user, data || {}, context)
      }
      case 'updatePassword': {
        const gate = await requireAuth(event, context)
        if (!gate.ok) return gate.error
        return await updatePassword(gate.user, data || {}, context)
      }
      case 'uploadAvatar': {
        const gate = await requireAuth(event, context)
        if (!gate.ok) return gate.error
        return await uploadAvatar(gate.user, data || {}, context)
      }

      // 平台管理：餐厅列表管理（仅平台管理员）
      case 'listAllRestaurants':
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await listAllRestaurants(data || {}, gate.user)
        }
      case 'updateRestaurantStatus':
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await updateRestaurantStatus(data.restaurantId, data.status, gate.user, context)
        }
      case 'updateRestaurantCertification':
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await updateRestaurantCertification(data.restaurantId, data.certificationLevel, gate.user, context)
        }
      // 平台管理：跨租户数据查看（仅平台管理员）
      case 'getCrossTenantData':
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await getCrossTenantData(data || {}, gate.user)
        }
      // 平台管理：平台级统计报表（仅平台管理员）
      case 'getPlatformStatistics':
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await getPlatformStatistics(data || {}, gate.user)
        }
      case 'getTopRestaurants':
        {
          const gate = await requirePlatformAdmin(event, context)
          if (!gate.ok) return gate.error
          return await getTopRestaurants(data || {}, gate.user)
        }

      case 'addXiaopingguo':
        // 添加"小苹果"租户
        const addScript = require('./add-xiaopingguo-tenant')
        return await addScript.main(event, context)

      case 'migrateXiaopingguoToApple':
        // 将"小苹果"租户的菜谱数据迁移到"apple"账号
        const migrateScript = require('./migrate-xiaopingguo-to-apple')
        return await migrateScript.main(event, context)

      default:
        return {
          success: false,
          error: '未知操作',
        }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      error: error.message || '操作失败',
    }
  }
}

/**
 * 创建入驻申请
 */
async function applyForOnboarding(data) {
  const appData = {
    desiredUsername: data.desiredUsername || '',
    organizationName: data.organizationName,
    contactName: data.contactName,
    contactPhone: data.contactPhone,
    contactEmail: data.contactEmail || '',
    city: data.city || '',
    restaurantCount: data.restaurantCount || 1,
    note: data.note || '',
    status: 'pending',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }
  const res = await db.collection('tenant_applications').add({ data: appData })
  
  // 触发租户认证申请消息通知
  try {
    await cloud.callFunction({
      name: 'message-event',
      data: {
        action: 'handleTenantCertApply',
        data: {
          tenantId: res._id, // 使用申请ID作为tenantId
          tenantName: data.organizationName,
          applyTime: new Date(),
        },
      },
    })
  } catch (error) {
    // 消息通知失败不影响申请提交，仅记录日志
    console.error('触发租户认证申请消息失败:', error)
  }
  
  return { code: 0, message: '申请已提交', data: { _id: res._id } }
}

/**
 * 查询入驻申请列表
 */
async function listOnboardingApplications(params) {
  try {
    let query = db.collection('tenant_applications')
    if (params.status) {
      query = query.where({ status: params.status })
    }
    if (params.keyword) {
      // 简单关键字匹配 organizationName 或 contactName
      query = query.where({
        organizationName: db.RegExp({ regexp: params.keyword, options: 'i' }),
      })
    }
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { code: 0, data: { list: result.data || [], page, pageSize } }
  } catch (error) {
    // 集合不存在时自动创建一次，返回空列表
    if (error && (error.errCode === -502005 || String(error.errMsg || '').includes('not exist'))) {
      try {
        await db.createCollection('tenant_applications')
      } catch (_) {}
      return { code: 0, data: { list: [], page: 1, pageSize: 20 } }
    }
    throw error
  }
}

/**
 * 审批通过：可选创建账号与租户
 */
async function approveOnboardingApplication(applicationId, options = {}) {
  if (!applicationId) return { code: 400, message: 'applicationId 不能为空' }

  const appDoc = await db.collection('tenant_applications').doc(applicationId).get()
  if (!appDoc.data) return { code: 404, message: '申请不存在' }
  if (appDoc.data.status !== 'pending') return { code: 400, message: '该申请已处理' }

  // 更新状态为已通过
  await db.collection('tenant_applications').doc(applicationId).update({
    data: { status: 'approved', updatedAt: db.serverDate() },
  })

  let created = {}
  if (options.createAccount) {
    // 1) 创建租户
    const tenantRes = await db.collection('tenants').add({
      data: {
        name: appDoc.data.organizationName,
        contactName: appDoc.data.contactName,
        contactPhone: appDoc.data.contactPhone,
        contactEmail: appDoc.data.contactEmail || '',
        status: 'active',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    // 2) 创建管理员账号（初始用户名/密码）
    const crypto = require('crypto')
    const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex')
    // 优先使用申请时的期望账户名（若未被占用且格式合法），否则回退默认
    let username = appDoc.data.desiredUsername || ''
    const usernameValid = /^[a-zA-Z][a-zA-Z0-9_\-]{3,20}$/.test(username)
    if (username && usernameValid) {
      const exists = await db.collection('admin_users').where({ username }).get()
      if (exists.data && exists.data.length > 0) {
        username = '' // 被占用，回退默认
      }
    } else {
      username = ''
    }
    if (!username) {
      username = `admin_${String(tenantRes._id).slice(0, 6)}`
    }
    const defaultPassword = 'admin123'
    const adminRes = await db.collection('admin_users').add({
      data: {
        username,
        password: hashPassword(defaultPassword),
        name: appDoc.data.contactName,
        email: appDoc.data.contactEmail || '',
        phone: appDoc.data.contactPhone || '',
        role: 'restaurant_admin',
        tenantId: tenantRes._id,
        restaurantIds: [],
        permissions: [],
        status: 'active',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    created = {
      tenantId: tenantRes._id,
      adminUserId: adminRes._id,
      username,
      password: defaultPassword, // 前端提示尽快修改
    }
  }

  return { code: 0, message: '审批通过', data: created }
}

/**
 * 驳回入驻申请
 */
async function rejectOnboardingApplication(applicationId, reason = '') {
  if (!applicationId) return { code: 400, message: 'applicationId 不能为空' }
  const appDoc = await db.collection('tenant_applications').doc(applicationId).get()
  if (!appDoc.data) return { code: 404, message: '申请不存在' }
  if (appDoc.data.status !== 'pending') return { code: 400, message: '该申请已处理' }

  await db.collection('tenant_applications').doc(applicationId).update({
    data: { status: 'rejected', rejectReason: reason || '', updatedAt: db.serverDate() },
  })
  return { code: 0, message: '已驳回' }
}

/**
 * 仅后台邀请/创建管理员账号
 * 允许角色：system_admin / platform_operator / carbon_specialist
 * 不允许：restaurant_admin（走入驻申请流程）
 */
const ALLOWED_ADMIN_ROLES = new Set(['system_admin', 'platform_operator', 'carbon_specialist'])
async function createAdminUser(data, context) {
  const { username, password, name, email, phone, role } = data || {}
  if (!username || !password || !role) {
    return { code: 400, message: 'username、password、role 为必填' }
  }
  if (!ALLOWED_ADMIN_ROLES.has(role)) {
    return { code: 400, message: '该角色不支持自助创建，请选择受控角色' }
  }
  // 检查用户名是否存在
  const exists = await db.collection('admin_users').where({ username }).get()
  if (exists.data && exists.data.length > 0) {
    return { code: 409, message: '用户名已存在' }
  }
  const crypto = require('crypto')
  const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex')
  const doc = {
    username,
    password: hashPassword(password),
    name: name || '',
    email: email || '',
    phone: phone || '',
    role,
    tenantId: null,
    restaurantIds: [],
    permissions: [],
    status: 'active',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }
  const res = await db.collection('admin_users').add({ data: doc })
  // 审计
  try {
    const { addAudit } = require('../common/audit')
    await addAudit(db, {
      module: 'platform',
      action: 'createAdminUser',
      resource: 'admin_users',
      description: `创建业务账号: ${username} (${role})`,
      status: 'success',
      ip: context.requestIp || '',
      userAgent: context.userAgent || '',
    })
  } catch (_) {}
  return { code: 0, message: '创建成功', data: { _id: res._id } }
}

/**
 * 管理员账号列表（仅受控角色）
 */
async function listAdminUsers(params = {}) {
  const { role, status, keyword, page = 1, pageSize = 20 } = params
  const condition = {}
  if (role) condition.role = role
  if (status) condition.status = status
  if (keyword) {
    condition.username = db.RegExp({ regexp: keyword, options: 'i' })
  }
  const query = Object.keys(condition).length > 0
    ? db.collection('admin_users').where(condition)
    : db.collection('admin_users')
  const res = await query
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  const list = res.data || []
  // 附加租户/餐厅数量信息（便于前端展示）
  const withExtras = []
  for (const u of list) {
    let restaurantCount = 0
    try {
      if (u.tenantId) {
        const c = await db.collection('restaurants').where({ tenantId: u.tenantId }).count()
        restaurantCount = c.total || 0
      }
    } catch (_) {}
    withExtras.push({ ...u, restaurantCount })
  }
  return { code: 0, data: { list: withExtras, page, pageSize } }
}

/**
 * 更新管理员账号状态
 */
async function updateAdminUserStatus(userId, status, context) {
  if (!userId || !status) return { code: 400, message: 'userId 与 status 不能为空' }
  await db.collection('admin_users').doc(userId).update({
    data: { status, updatedAt: db.serverDate() },
  })
  try {
    const { addAudit } = require('../common/audit')
    await addAudit(db, {
      module: 'platform',
      action: 'updateAdminUserStatus',
      resource: 'admin_users',
      description: `更新管理员状态: ${userId} -> ${status}`,
      status: 'success',
      ip: context.requestIp || '',
    })
  } catch (_) {}
  return { code: 0, message: '更新成功' }
}

/**
 * 重置管理员账号密码（返回新密码，前端提示尽快修改）
 */
async function resetAdminUserPassword(userId, context) {
  if (!userId) return { code: 400, message: 'userId 不能为空' }
  const crypto = require('crypto')
  const newPwd = 'Adm' + Math.random().toString(36).slice(2, 8)
  const hash = crypto.createHash('sha256').update(newPwd).digest('hex')
  await db.collection('admin_users').doc(userId).update({
    data: { password: hash, updatedAt: db.serverDate() },
  })
  try {
    const { addAudit } = require('../common/audit')
    await addAudit(db, {
      module: 'platform',
      action: 'resetAdminUserPassword',
      resource: 'admin_users',
      description: `重置管理员密码: ${userId}`,
      status: 'success',
      ip: context.requestIp || '',
    })
  } catch (_) {}
  return { code: 0, message: '重置成功', data: { password: newPwd } }
}

/**
 * 软删除管理员账号（置 status=deleted）
 */
async function softDeleteAdminUser(userId, context) {
  if (!userId) return { code: 400, message: 'userId 不能为空' }
  await db.collection('admin_users').doc(userId).update({
    data: { status: 'deleted', updatedAt: db.serverDate() },
  })
  try {
    const { addAudit } = require('./audit')
    await addAudit(db, {
      module: 'platform',
      action: 'softDeleteAdminUser',
      resource: 'admin_users',
      description: `软删除管理员: ${userId}`,
      status: 'success',
      ip: context.requestIp || '',
    })
  } catch (_) {}
  return { code: 0, message: '已删除（软删除）' }
}

/**
 * 更新当前用户的个人资料
 */
async function updateProfile(currentUser, payload, context) {
  const { name, email, phone, avatarUrl } = payload || {}
  const updates = {}
  if (name !== undefined) updates.name = name
  if (email !== undefined) updates.email = email
  if (phone !== undefined) updates.phone = phone
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl
  updates.updatedAt = db.serverDate()
  await db.collection('admin_users').doc(currentUser._id).update({ data: updates })
  try {
    const { addAudit } = require('./audit')
    await addAudit(db, {
      module: 'system',
      action: 'updateProfile',
      resource: 'admin_users',
      description: `更新个人资料`,
      status: 'success',
      ip: context.requestIp || '',
    })
  } catch (_) {}
  return { code: 0, message: '资料已更新' }
}

/**
 * 更新当前用户密码
 */
async function updatePassword(currentUser, payload, context) {
  const { oldPassword, newPassword } = payload || {}
  if (!oldPassword || !newPassword) return { code: 400, message: '缺少参数' }
  const crypto = require('crypto')
  const oldHash = crypto.createHash('sha256').update(oldPassword).digest('hex')
  if (oldHash !== currentUser.password) {
    return { code: 400, message: '原密码不正确' }
  }
  const newHash = crypto.createHash('sha256').update(newPassword).digest('hex')
  await db.collection('admin_users').doc(currentUser._id).update({
    data: { password: newHash, updatedAt: db.serverDate() },
  })
  try {
    const { addAudit } = require('./audit')
    await addAudit(db, {
      module: 'system',
      action: 'updatePassword',
      resource: 'admin_users',
      description: `更新密码`,
      status: 'success',
      ip: context.requestIp || '',
    })
  } catch (_) {}
  return { code: 0, message: '密码已更新' }
}

/**
 * 头像上传（前端传 base64，后端写云存储）
 */
async function uploadAvatar(currentUser, payload, context) {
  const { base64, ext = 'jpg' } = payload || {}
  if (!base64) return { code: 400, message: '缺少图片数据' }
  // base64 可能带 data URL 头
  const content = base64.includes(',') ? base64.split(',')[1] : base64
  const buffer = Buffer.from(content, 'base64')
  const cloudPath = `avatars/${currentUser._id || 'u'}/${Date.now()}.${ext.replace('.', '')}`
  try {
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: buffer,
    })
    const fileID = uploadRes.fileID
    let tempUrl = fileID
    try {
      const urlRes = await cloud.getTempFileURL({ fileList: [fileID] })
      tempUrl = urlRes?.fileList?.[0]?.tempFileURL || fileID
    } catch (_) {}
    return { code: 0, data: { fileID, url: tempUrl, cloudPath } }
  } catch (e) {
    return { code: 500, message: '上传失败', error: String(e && e.message ? e.message : e) }
  }
}
/**
 * 角色配置列表
 */
async function listRoleConfigs(params = {}) {
  let query = db.collection('role_configs')
  if (params.status) {
    query = query.where({ status: params.status })
  }
  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const result = await query
    .orderBy('roleCode', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  return { code: 0, data: { list: result.data || [], page, pageSize } }
}

async function updateRoleStatus(roleCode, status) {
  if (!roleCode || !status) return { code: 400, message: 'roleCode 与 status 不能为空' }
  const res = await db.collection('role_configs').where({ roleCode }).get()
  if (!res.data || res.data.length === 0) return { code: 404, message: '角色不存在' }
  await db.collection('role_configs').doc(res.data[0]._id).update({
    data: { status, updatedAt: db.serverDate() },
  })
  return { code: 0, message: '更新成功' }
}

async function createRoleConfig(payload) {
  const { roleCode, roleName, description = '', permissions = [], moduleAccess = {}, status = 'active' } = payload || {}
  if (!roleCode || !roleName) return { code: 400, message: 'roleCode 与 roleName 不能为空' }
  // 唯一性
  const exist = await db.collection('role_configs').where({ roleCode }).count()
  if (exist.total > 0) return { code: 409, message: '角色代码已存在' }
  const doc = {
    roleCode,
    roleName,
    description,
    permissions,
    moduleAccess,
    status,
    isSystemRole: false,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }
  const res = await db.collection('role_configs').add({ data: doc })
  return { code: 0, message: '创建成功', data: { _id: res._id } }
}

async function updateRolePermissions(roleCode, permissions = [], moduleAccess = {}) {
  if (!roleCode) return { code: 400, message: 'roleCode 不能为空' }
  const res = await db.collection('role_configs').where({ roleCode }).get()
  if (!res.data || res.data.length === 0) return { code: 404, message: '角色不存在' }
  await db.collection('role_configs').doc(res.data[0]._id).update({
    data: { permissions, moduleAccess, updatedAt: db.serverDate() },
  })
  return { code: 0, message: '权限已更新' }
}

async function listPermissions() {
  const res = await db.collection('permissions').orderBy('module', 'asc').orderBy('sort', 'asc').get()
  const all = res.data || []
  const grouped = {}
  for (const p of all) {
    if (!grouped[p.module]) grouped[p.module] = []
    grouped[p.module].push({
      key: p.permissionCode,
      title: `${p.permissionName} (${p.permissionCode})`,
      code: p.permissionCode,
      name: p.permissionName,
      resource: p.resource,
      action: p.action,
      category: p.category,
    })
  }
  const tree = Object.keys(grouped).map((m) => ({
    key: m,
    title: m,
    children: grouped[m],
  }))
  return { code: 0, data: { list: all, tree } }
}
/**
 * 审计日志列表
 */
/**
 * 获取操作日志（平台管理员）
 */
async function getAuditLogs(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    username,
    action,
    status,
    module,
    tenantId,
    resource,
    startDate,
    endDate,
    keyword,
  } = params

  try {
    const _ = db.command
    let query = db.collection('audit_logs')

    // 构建查询条件
    const whereConditions = {}

    if (username) {
      whereConditions.username = db.RegExp({
        regexp: username,
        options: 'i',
      })
    }
    if (action) {
      whereConditions.action = action
    }
    if (status) {
      whereConditions.status = status
    }
    if (module) {
      whereConditions.module = module
    }
    if (tenantId) {
      whereConditions.tenantId = tenantId
    }
    if (resource) {
      whereConditions.resource = db.RegExp({
        regexp: resource,
        options: 'i',
      })
    }

    // 时间范围筛选
    if (startDate || endDate) {
      whereConditions.createdAt = {}
      if (startDate) {
        whereConditions.createdAt = _.gte(new Date(startDate))
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        whereConditions.createdAt = whereConditions.createdAt
          ? _.and(whereConditions.createdAt, _.lte(endDateTime))
          : _.lte(endDateTime)
      }
    }

    // 关键词搜索（搜索描述）
    if (keyword) {
      whereConditions.description = db.RegExp({
        regexp: keyword,
        options: 'i',
      })
    }

    // 应用查询条件
    if (Object.keys(whereConditions).length > 0) {
      query = query.where(whereConditions)
    }

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total || 0

    // 获取列表数据
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      message: '获取成功',
      data: {
        list: result.data || [],
        total,
        page,
        pageSize,
      },
    }
  } catch (error) {
    console.error('获取操作日志失败:', error)
    return {
      code: -1,
      message: error.message || '获取操作日志失败',
      data: {
        list: [],
        total: 0,
        page,
        pageSize,
      },
    }
  }
}

/**
 * 系统指标
 */
async function getSystemMetrics() {
  const metrics = {}
  const meta = {
    // 系统与平台
    admin_users: { domain: '系统与平台', description: '后台管理用户' },
    role_configs: { domain: '系统与平台', description: '角色配置' },
    permissions: { domain: '系统与平台', description: '权限定义' },
    audit_logs: { domain: '系统与平台', description: '审计日志' },
    platform_configs: { domain: '系统与平台', description: '平台配置' },
    business_rules: { domain: '系统与平台', description: '业务规则库' },
    sync_tasks: { domain: '系统与平台', description: '同步任务' },
    tenant_applications: { domain: '系统与平台', description: '入驻申请' },
    // 租户与组织
    tenants: { domain: '租户与组织', description: '租户主档' },
    staff_accounts: { domain: '租户与组织', description: '租户协作者账号' },
    restaurant_profiles: { domain: '租户与组织', description: '餐厅档案版本' },
    // 餐厅域
    restaurants: { domain: '餐厅域', description: '餐厅基础信息' },
    restaurant_menus: { domain: '餐厅域', description: '餐厅菜单配置' },
    restaurant_menu_items: { domain: '餐厅域', description: '菜单菜品条目' },
    restaurant_orders: { domain: '餐厅域', description: '餐厅订单' },
    restaurant_reservations: { domain: '餐厅域', description: '餐厅预订' },
    restaurant_members: { domain: '餐厅域', description: '餐厅会员' },
    restaurant_campaigns: { domain: '餐厅域', description: '餐厅营销活动' },
    restaurant_reviews: { domain: '餐厅域', description: '餐厅评价' },
    restaurant_operation_ledgers: { domain: '运营监测', description: '运营与能源台账' },
    restaurant_behavior_metrics: { domain: '运营监测', description: '行为指标快照' },
    // 认证域
    certification_applications: { domain: '认证域', description: '认证申请' },
    certification_stages: { domain: '认证域', description: '认证阶段' },
    assessment_items: { domain: '认证域', description: '评估项结果' },
    certification_badges: { domain: '认证域', description: '认证证书' },
    certification_documents: { domain: '认证域', description: '认证资料' },
    // 菜单与碳核算
    recipe_versions: { domain: '菜单与碳核算', description: '菜品配方版本' },
    carbon_factors: { domain: '菜单与碳核算', description: '碳排系数主数据' },
    carbon_assessments: { domain: '菜单与碳核算', description: '碳核算结果' },
    // 供应链溯源
    suppliers: { domain: '供应链溯源', description: '供应商主体' },
    ingredient_lots: { domain: '供应链溯源', description: '食材批次' },
    trace_chains: { domain: '供应链溯源', description: '溯源链主记录' },
    trace_nodes: { domain: '供应链溯源', description: '溯源节点事件' },
    // 用户行为
    points_accounts: { domain: '用户行为', description: '多币种积分账户' },
    behavior_records: { domain: '用户行为', description: '低碳行为流水' },
    feedback_records: { domain: '用户行为', description: '用户评价记录' },
    // 碳普惠
    carbon_credits: { domain: '碳普惠', description: '碳积分账户' },
    carbon_transactions: { domain: '碳普惠', description: '碳积分交易' },
    carbon_exchange_records: { domain: '碳普惠', description: '碳交易所对接' },
    carbon_milestones: { domain: '碳普惠', description: '碳减排里程碑' },
    // 监管与合作
    government_programs: { domain: '监管与合作', description: '政府激励项目' },
    public_participation: { domain: '监管与合作', description: '公众参与记录' },
    esg_reports: { domain: '监管与合作', description: 'ESG 报告归档' },
    // 分析与报表
    kpi_definitions: { domain: '分析与报表', description: '指标字典定义' },
    data_snapshots: { domain: '分析与报表', description: '数据快照' },
    report_templates: { domain: '分析与报表', description: '报表模板' },
    regulatory_exports: { domain: '分析与报表', description: '对外报送记录' },
    data_dashboard: { domain: '分析与报表', description: '数据看板' },
    // 公共配置
    dictionary_entries: { domain: '公共配置', description: '通用字典条目' },
    strategy_rules: { domain: '公共配置', description: '策略与规则' },
    task_schedules: { domain: '公共配置', description: '系统任务调度' },
    // 用户与社区
    users: { domain: '用户与社区', description: '用户基础档案' },
    user_sessions: { domain: '用户与社区', description: '用户会话记录' },
    friends: { domain: '用户与社区', description: '好友关系' },
    posts: { domain: '用户与社区', description: '用户动态' },
    user_profiles_extended: { domain: '用户与社区', description: '用户扩展档案' },
    // 交易与饮食记录
    orders: { domain: '交易', description: '平台订单' },
    meals: { domain: '饮食记录', description: '餐食记录' },
    daily_stats: { domain: '饮食记录', description: '每日统计' },
    gardens: { domain: '饮食记录', description: '个人花园' },
    // 基础数据
    ingredients: { domain: '饮食记录', description: '食材基础库' },
    recipes: { domain: '饮食记录', description: '食谱基础库' },
    plant_templates: { domain: '饮食记录', description: '植物模板' },
    meat_products: { domain: '饮食记录', description: '肉类碳足迹库' },
    // 践行者与内容
    practitioners: { domain: '践行者与内容', description: '践行者档案' },
    practitioner_certifications: { domain: '践行者与内容', description: '践行者认证' },
    tcm_wisdom: { domain: '践行者与内容', description: '中医智慧' },
    wisdom_quotes: { domain: '践行者与内容', description: '语录' },
    mentorship: { domain: '践行者与内容', description: '导师学员关系' },
    knowledge_graph: { domain: '践行者与内容', description: '知识图谱' },
    // 电商域
    products: { domain: '电商', description: '商品主档' },
    shopping_cart: { domain: '电商', description: '购物车条目' },
    product_reviews: { domain: '电商', description: '商品评价' },
    inventory: { domain: '电商', description: '库存记录' },
    promotions: { domain: '电商', description: '营销活动' },
    coupons: { domain: '电商', description: '优惠券定义' },
    user_coupons: { domain: '电商', description: '用户优惠券' },
  }
  // 集合清单（来源：Docs/数据库集合总览.csv，结合项目新增集合）
  const collections = [
    // 系统与平台
    'admin_users','role_configs','permissions','audit_logs','platform_configs','business_rules','sync_tasks','tenant_applications',
    // 租户与组织
    'tenants','staff_accounts','restaurant_profiles',
    // 餐厅域
    'restaurants','restaurant_menus','restaurant_menu_items','restaurant_orders','restaurant_reservations','restaurant_members','restaurant_campaigns','restaurant_reviews',
    // 运营监测
    'restaurant_operation_ledgers','restaurant_behavior_metrics',
    // 认证域
    'certification_applications','certification_stages','assessment_items','certification_badges','certification_documents',
    // 菜单与碳核算
    'recipe_versions','carbon_factors','carbon_assessments',
    // 供应链溯源
    'suppliers','ingredient_lots','trace_chains','trace_nodes',
    // 用户行为
    'points_accounts','behavior_records','feedback_records',
    // 碳普惠
    'carbon_credits','carbon_transactions','carbon_exchange_records','carbon_milestones',
    // 监管与合作
    'government_programs','public_participation','esg_reports',
    // 分析与报表
    'kpi_definitions','data_snapshots','report_templates','regulatory_exports','data_dashboard',
    // 公共配置
    'dictionary_entries','strategy_rules','task_schedules',
    // 用户与社区
    'users','user_sessions','friends','posts','user_profiles_extended',
    // 交易与饮食记录
    'orders','meals','daily_stats','gardens',
    // 基础食材/菜谱等
    'ingredients','recipes','plant_templates','meat_products',
    // 践行者与内容
    'practitioners','practitioner_certifications','tcm_wisdom','wisdom_quotes','mentorship','knowledge_graph',
    // 电商域
    'products','shopping_cart','product_reviews','inventory','promotions','coupons','user_coupons',
  ]
  for (const c of collections) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const count = await db.collection(c).count()
      metrics[c] = count.total
    } catch {
      metrics[c] = 0
    }
  }
  const list = collections.map((c) => ({
    collection: c,
    count: metrics[c] || 0,
    domain: meta[c]?.domain || '未知',
    description: meta[c]?.description || '',
  }))
  return { code: 0, data: { list, map: metrics } }
}

/**
 * 备份导出占位：返回建议导出集合与下一步指引
 */
async function runBackupExport(params = {}) {
  // 这里可后续接入导出到存储/CI流水线，目前返回指引
  return {
    code: 0,
    message: '备份任务已受理（占位），请在控制台使用导出或扩展为存储导出',
    data: {
      recommendedCollections: [
        'admin_users',
        'role_configs',
        'permissions',
        'audit_logs',
        'tenants',
        'restaurants',
        'recipes',
        'orders',
      ],
    },
  }
}

/**
 * 将一组餐厅迁移到目标租户
 * 入参：
 *  - restaurantIds: string[] 必填
 *  - toTenantId?: string 与 toTenantName 二选一
 *  - toTenantName?: string
 */
async function transferRestaurants(params = {}) {
  const { restaurantIds = [], toTenantId, toTenantName } = params
  if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
    return { code: 400, message: 'restaurantIds 不能为空' }
  }

  // 获取目标租户ID
  let targetTenantId = toTenantId || ''
  if (!targetTenantId && toTenantName) {
    const res = await db.collection('tenants').where({ name: toTenantName }).get()
    if (res.data && res.data.length > 0) {
      targetTenantId = res.data[0]._id
    }
  }
  if (!targetTenantId) {
    return { code: 404, message: '未找到目标租户，请提供 toTenantId 或正确的 toTenantName' }
  }

  // 校验租户存在
  try {
    const t = await db.collection('tenants').doc(targetTenantId).get()
    if (!t.data) {
      return { code: 404, message: '目标租户不存在' }
    }
  } catch {
    return { code: 404, message: '目标租户不存在' }
  }

  const ok = []
  const fail = []
  for (const rid of restaurantIds) {
    try {
      await db.collection('restaurants').doc(rid).update({
        data: { tenantId: targetTenantId, updatedAt: db.serverDate() },
      })
      ok.push(rid)
    } catch (e) {
      fail.push({ id: rid, error: e?.message || '更新失败' })
    }
  }

  return { code: 0, message: '迁移完成', data: { toTenantId: targetTenantId, ok, fail } }
}

/**
 * 迁移指定餐厅的全部关联数据到目标租户
 * 入参：
 *  - restaurantIds: string[] 必填
 *  - toTenantId?: string 与 toTenantName 二选一
 *  - toTenantName?: string
 * 说明：
 *  - 将以下集合中 restaurantId 属于列表的记录，其 tenantId 统一更新为目标租户
 *  - 若集合不存在将跳过
 */
async function transferAllRestaurantData(params = {}) {
  const { restaurantIds = [], toTenantId, toTenantName } = params
  if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
    return { code: 400, message: 'restaurantIds 不能为空' }
  }

  // 获取目标租户ID
  let targetTenantId = toTenantId || ''
  if (!targetTenantId && toTenantName) {
    const res = await db.collection('tenants').where({ name: toTenantName }).get()
    if (res.data && res.data.length > 0) {
      targetTenantId = res.data[0]._id
    }
  }
  if (!targetTenantId) {
    return { code: 404, message: '未找到目标租户，请提供 toTenantId 或正确的 toTenantName' }
  }

  // 确认租户存在
  try {
    const t = await db.collection('tenants').doc(targetTenantId).get()
    if (!t.data) return { code: 404, message: '目标租户不存在' }
  } catch {
    return { code: 404, message: '目标租户不存在' }
  }

  // 需要迁移的集合（包含 restaurantId，且应带 tenantId 字段）
  const collectionsWithRestaurantId = [
    'menu_items',
    'orders',
    'recipes',
    'carbon_footprints',
    // v4 餐厅域
    'restaurant_orders',
    'restaurant_menu_items',
    'restaurant_menus',
    'restaurant_reservations',
    'restaurant_members',
    'restaurant_campaigns',
    'restaurant_reviews',
    // 运营与监测
    'restaurant_operation_ledgers',
    'restaurant_behavior_metrics',
  ]

  const summary = []

  // 通用批处理更新：逐条读取以规避批量更新限制
  const updateCollectionByRestaurantIds = async (col) => {
    try {
      const where = {
        restaurantId: db.command.in(restaurantIds),
      }
      const pageSize = 100
      let skip = 0
      let totalUpdated = 0
      // 计数
      let hasMore = true
      while (hasMore) {
        const batch = await db.collection(col).where(where).skip(skip).limit(pageSize).get()
        const list = batch.data || []
        if (list.length === 0) {
          hasMore = false
          break
        }
        for (const doc of list) {
          try {
            await db.collection(col).doc(doc._id).update({
              data: { tenantId: targetTenantId, updatedAt: db.serverDate() },
            })
            totalUpdated += 1
          } catch (_) {}
        }
        skip += pageSize
        hasMore = list.length === pageSize
      }
      summary.push({ collection: col, updated: totalUpdated })
    } catch (error) {
      // 集合不存在或查询失败，跳过
      summary.push({ collection: col, updated: 0, skipped: true })
    }
  }

  // 执行更新
  for (const col of collectionsWithRestaurantId) {
    // eslint-disable-next-line no-await-in-loop
    await updateCollectionByRestaurantIds(col)
  }

  // 最后校验 restaurants 本身是否已迁移（冪等）
  try {
    for (const rid of restaurantIds) {
      // eslint-disable-next-line no-await-in-loop
      await db.collection('restaurants').doc(rid).update({
        data: { tenantId: targetTenantId, updatedAt: db.serverDate() },
      })
    }
  } catch (_) {}

  return { code: 0, message: '关联数据迁移完成', data: { toTenantId: targetTenantId, summary } }
}

/**
 * 获取所有租户列表（平台管理员）
 */
async function getAllTenants() {
  try {
    const result = await db.collection('tenants').get()
    return {
      code: 0,
      message: '获取成功',
      data: result.data || [],
    }
  } catch (error) {
    console.error('获取租户列表失败:', error)
    return {
      code: -1,
      message: error.message || '获取租户列表失败',
      data: [],
    }
  }
}

/**
 * 获取租户信息
 */
async function getTenant(tenantId) {
  const result = await db.collection('tenants').doc(tenantId).get()
  if (result.data) {
    // 获取该租户下的所有餐厅
    const restaurants = await db
      .collection('restaurants')
      .where({
        tenantId: tenantId,
      })
      .get()

    return {
      code: 0,
      message: '获取成功',
      data: {
        ...result.data,
        restaurants: restaurants.data || [],
      },
    }
  }
  return {
    code: 404,
    message: '租户不存在',
  }
}

/**
 * 获取餐厅列表
 */
async function getRestaurants(tenantId, restaurantId) {
  if (!tenantId) {
    return {
      code: 400,
      message: 'tenantId不能为空',
      data: [],
    }
  }

  let query = db.collection('restaurants').where({
    tenantId: tenantId,
  })

  if (restaurantId) {
    query = query.where({
      _id: restaurantId,
    })
  }

  const result = await query.get()
  return {
    code: 0,
    message: '获取成功',
    data: result.data || [],
  }
}

/**
 * 创建租户
 */
async function createTenant(data) {
  const tenantData = {
    name: data.name,
    contactName: data.contactName || '',
    contactPhone: data.contactPhone || '',
    contactEmail: data.contactEmail || '',
    status: 'active',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }

  const result = await db.collection('tenants').add({
    data: tenantData,
  })

  return {
    success: true,
    data: {
      _id: result._id,
      ...tenantData,
    },
  }
}

/**
 * 更新租户信息（平台管理员）
 */
async function updateTenant(tenantId, data, user, context) {
  if (!tenantId) {
    return {
      code: 400,
      message: 'tenantId不能为空',
    }
  }

  try {
    // 检查租户是否存在
    const tenantDoc = await db.collection('tenants').doc(tenantId).get()
    if (!tenantDoc.data) {
      return {
        code: 404,
        message: '租户不存在',
      }
    }

    // 构建更新数据
    const updateData = {
      updatedAt: db.serverDate(),
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.contactName !== undefined) updateData.contactName = data.contactName
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail

    // 更新租户
    await db.collection('tenants').doc(tenantId).update({
      data: updateData,
    })

    // 记录审计日志
    const { addAudit } = require('./audit')
    await addAudit({
      action: 'updateTenant',
      userId: user._id,
      userName: user.name || user.username,
      targetType: 'tenant',
      targetId: tenantId,
      targetName: data.name || tenantDoc.data.name,
      details: updateData,
      context,
    })

    return {
      code: 0,
      message: '更新成功',
      data: {
        tenantId,
        ...updateData,
      },
    }
  } catch (error) {
    console.error('更新租户失败:', error)
    return {
      code: -1,
      message: error.message || '更新租户失败',
    }
  }
}

/**
 * 更新租户状态（平台管理员）
 */
async function updateTenantStatus(tenantId, status, user, context) {
  if (!tenantId) {
    return {
      code: 400,
      message: 'tenantId不能为空',
    }
  }

  if (!['active', 'suspended', 'inactive'].includes(status)) {
    return {
      code: 400,
      message: '状态值无效，必须是 active、suspended 或 inactive',
    }
  }

  try {
    // 检查租户是否存在
    const tenantDoc = await db.collection('tenants').doc(tenantId).get()
    if (!tenantDoc.data) {
      return {
        code: 404,
        message: '租户不存在',
      }
    }

    // 更新租户状态
    await db.collection('tenants').doc(tenantId).update({
      data: {
        status,
        updatedAt: db.serverDate(),
      },
    })

    // 记录审计日志
    const { addAudit } = require('./audit')
    await addAudit({
      action: 'updateTenantStatus',
      userId: user._id,
      userName: user.name || user.username,
      targetType: 'tenant',
      targetId: tenantId,
      targetName: tenantDoc.data.name,
      details: { status, oldStatus: tenantDoc.data.status },
      context,
    })

    return {
      code: 0,
      message: '状态更新成功',
      data: {
        tenantId,
        status,
      },
    }
  } catch (error) {
    console.error('更新租户状态失败:', error)
    return {
      code: -1,
      message: error.message || '更新租户状态失败',
    }
  }
}

/**
 * 删除租户（平台管理员）
 */
async function deleteTenant(tenantId, user, context) {
  if (!tenantId) {
    return {
      code: 400,
      message: 'tenantId不能为空',
    }
  }

  try {
    // 检查租户是否存在
    const tenantDoc = await db.collection('tenants').doc(tenantId).get()
    if (!tenantDoc.data) {
      return {
        code: 404,
        message: '租户不存在',
      }
    }

    // 检查是否有关联数据
    const restaurantsResult = await db
      .collection('restaurants')
      .where({ tenantId })
      .count()

    const restaurantCount = restaurantsResult.total || 0

    if (restaurantCount > 0) {
      return {
        code: 400,
        message: `无法删除租户，该租户下还有 ${restaurantCount} 个餐厅，请先处理关联数据`,
      }
    }

    // 检查是否有订单数据
    const ordersResult = await db
      .collection('orders')
      .where({ tenantId })
      .count()

    const orderCount = ordersResult.total || 0

    if (orderCount > 0) {
      return {
        code: 400,
        message: `无法删除租户，该租户下还有 ${orderCount} 个订单，请先处理关联数据`,
      }
    }

    // 执行删除（软删除：标记为已删除）
    await db.collection('tenants').doc(tenantId).update({
      data: {
        status: 'deleted',
        deletedAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    // 记录审计日志
    const { addAudit } = require('./audit')
    await addAudit({
      action: 'deleteTenant',
      userId: user._id,
      userName: user.name || user.username,
      targetType: 'tenant',
      targetId: tenantId,
      targetName: tenantDoc.data.name,
      details: { softDelete: true },
      context,
    })

    return {
      code: 0,
      message: '租户已删除',
      data: {
        tenantId,
      },
    }
  } catch (error) {
    console.error('删除租户失败:', error)
    return {
      code: -1,
      message: error.message || '删除租户失败',
    }
  }
}

/**
 * 更新租户配置（平台管理员）
 */
async function updateTenantConfig(tenantId, config, user, context) {
  if (!tenantId) {
    return {
      code: 400,
      message: 'tenantId不能为空',
    }
  }

  try {
    // 检查租户是否存在
    const tenantDoc = await db.collection('tenants').doc(tenantId).get()
    if (!tenantDoc.data) {
      return {
        code: 404,
        message: '租户不存在',
      }
    }

    // 构建配置数据
    const configData = {
      ...config,
      updatedAt: db.serverDate(),
    }

    // 更新租户配置
    await db.collection('tenants').doc(tenantId).update({
      data: {
        config: configData,
        updatedAt: db.serverDate(),
      },
    })

    // 记录审计日志
    const { addAudit } = require('./audit')
    await addAudit({
      action: 'updateTenantConfig',
      userId: user._id,
      userName: user.name || user.username,
      targetType: 'tenant',
      targetId: tenantId,
      targetName: tenantDoc.data.name,
      details: { config: configData },
      context,
    })

    return {
      code: 0,
      message: '配置更新成功',
      data: {
        tenantId,
        config: configData,
      },
    }
  } catch (error) {
    console.error('更新租户配置失败:', error)
    return {
      code: -1,
      message: error.message || '更新租户配置失败',
    }
  }
}

/**
 * 创建餐厅
 */
async function createRestaurant(data) {
  const restaurantData = {
    tenantId: data.tenantId,
    name: data.name,
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    status: 'active',
    certificationLevel: null,
    certificationStatus: 'none',
    // 完整的认证字段结构
    climateCertification: {
      isCertified: false,
      certificationLevel: null,
      certifiedDate: null,
      certifiedBy: null,
      certificateNumber: null,
      expiryDate: null,
      // 五大维度评估结果
      standards: {
        lowCarbonMenuRatio: null,
        localIngredientRatio: null,
        organicRatio: null,
        foodWasteReduction: null,
        energyEfficiency: null
      },
      // 系统评估结果
      systemEvaluation: {
        score: null,
        report: null,
        evaluatedAt: null,
        evaluatedBy: null
      },
      // 人工抽检记录
      inspectionRecords: [],
      // 年度承诺
      annualPledge: {
        carbonReductionTarget: null,
        customerParticipationTarget: null,
        status: 'in_progress'
      },
      // 成长激励
      growthIncentives: {
        tasks: [],
        badges: [],
        exposurePriority: 0
      }
    },
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }

  const result = await db.collection('restaurants').add({
    data: restaurantData,
  })

  return {
    success: true,
    data: {
      _id: result._id,
      ...restaurantData,
    },
  }
}

/**
 * 更新餐厅信息
 */
async function updateRestaurant(restaurantId, data) {
  // 获取更新前的餐厅信息，用于判断认证状态变化
  const oldRestaurant = await db.collection('restaurants').doc(restaurantId).get()
  const oldCertificationStatus = oldRestaurant.data?.certificationStatus || 'none'
  
  const updateData = {
    ...data,
    updatedAt: db.serverDate(),
  }
  delete updateData.restaurantId

  await db.collection('restaurants').doc(restaurantId).update({
    data: updateData,
  })

  const result = await db.collection('restaurants').doc(restaurantId).get()
  const newRestaurant = result.data
  
  // 如果认证状态从非pending变为pending，触发餐厅认证申请消息
  const newCertificationStatus = newRestaurant?.certificationStatus || 'none'
  if (oldCertificationStatus !== 'pending' && newCertificationStatus === 'pending') {
    try {
      await cloud.callFunction({
        name: 'message-event',
        data: {
          action: 'handleRestaurantCertApply',
          data: {
            restaurantId: restaurantId,
            restaurantName: newRestaurant?.name || '',
            tenantId: newRestaurant?.tenantId || '',
            applyTime: new Date(),
          },
        },
      })
    } catch (error) {
      // 消息通知失败不影响餐厅信息更新，仅记录日志
      console.error('触发餐厅认证申请消息失败:', error)
    }
  }
  
  return {
    success: true,
    data: result.data,
  }
}

/**
 * 根据restaurantId获取餐厅相关数据
 */
async function getRestaurantData(data) {
  const { restaurantId, dataType, startDate, endDate, page = 1, pageSize = 20 } = data

  if (!restaurantId) {
    return {
      success: false,
      error: 'restaurantId不能为空',
    }
  }

  const result = {
    restaurantId,
    data: {},
  }

  // 根据数据类型返回不同的数据
  switch (dataType) {
    case 'menu':
      // 获取菜单数据
      const menuQuery = db.collection('menu_items').where({
        restaurantId: restaurantId,
      })
      if (startDate || endDate) {
        // 可以添加日期筛选
      }
      const menuResult = await menuQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      result.data.menu = menuResult.data || []
      break

    case 'order':
      // 获取订单数据
      const orderQuery = db.collection('orders').where({
        restaurantId: restaurantId,
      })
      if (startDate) {
        orderQuery.where({
          orderDate: db.command.gte(startDate),
        })
      }
      if (endDate) {
        orderQuery.where({
          orderDate: db.command.lte(endDate),
        })
      }
      const orderResult = await orderQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      result.data.orders = orderResult.data || []
      break

    case 'recipe':
      // 获取菜谱数据
      const recipeQuery = db.collection('recipes').where({
        restaurantId: restaurantId,
      })
      const recipeResult = await recipeQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      result.data.recipes = recipeResult.data || []
      break

    case 'carbon':
      // 获取碳足迹数据
      const carbonQuery = db.collection('carbon_footprints').where({
        restaurantId: restaurantId,
      })
      if (startDate || endDate) {
        // 可以添加日期筛选
      }
      const carbonResult = await carbonQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      result.data.carbon = carbonResult.data || []
      break

    case 'all':
      // 获取所有类型的数据
      const [menuRes, orderRes, recipeRes, carbonRes] = await Promise.all([
        db.collection('menu_items').where({ restaurantId: restaurantId }).get(),
        db.collection('orders').where({ restaurantId: restaurantId }).get(),
        db.collection('recipes').where({ restaurantId: restaurantId }).get(),
        db.collection('carbon_footprints').where({ restaurantId: restaurantId }).get(),
      ])
      result.data = {
        menu: menuRes.data || [],
        orders: orderRes.data || [],
        recipes: recipeRes.data || [],
        carbon: carbonRes.data || [],
      }
      break

    default:
      return {
        success: false,
        error: '不支持的数据类型',
      }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * 获取行为统计数据（扩展版 - 支持完整的行为指标统计）
 * 根据策划方案实现餐厅行为指标和顾客行为指标
 */
async function getBehaviorMetrics(data) {
  const { restaurantId, tenantId, period, startDate, endDate } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    // 1. 从订单数据计算行为指标
    const ordersResult = await db.collection('restaurant_orders')
      .where({
        restaurantId: restaurantId,
        status: db.command.in(['completed', 'processing']), // 只统计已完成或处理中的订单
      })
      .get()
    
    const orders = ordersResult.data || []
    
    // 应用日期筛选
    let filteredOrders = orders
    if (startDate || endDate) {
      filteredOrders = orders.filter((order) => {
        const orderDate = order.orderDate || order.order_date || order.createdAt || ''
        if (!orderDate) return false
        
        const dateStr = typeof orderDate === 'string' 
          ? orderDate.substring(0, 10) 
          : new Date(orderDate).toISOString().substring(0, 10)
        
        if (startDate && dateStr < startDate) return false
        if (endDate && dateStr > endDate) return false
        return true
      })
    }

    // 2. 计算餐厅行为指标
    let lowCarbonDishCount = 0 // 低碳菜品订单数
    let totalOrderCount = filteredOrders.length // 总订单数
    let localIngredientCount = 0 // 使用本地食材的订单数
    let organicIngredientCount = 0 // 使用有机食材的订单数
    let totalRevenue = 0 // 总收入（用于计算能源强度）
    let totalServiceCount = 0 // 总服务人次

    // 3. 计算顾客行为指标
    const customerMap = new Map() // 用户ID -> 订单列表
    const hourCountMap = new Map() // 小时 -> 订单数
    let totalAmount = 0 // 总消费金额
    let lowCarbonChoiceCount = 0 // 选择低碳菜品的订单数
    let smallPortionCount = 0 // 选择小份的订单数
    let noUtensilsCount = 0 // 不使用一次性餐具的订单数

    filteredOrders.forEach((order) => {
      // 餐厅行为指标计算
      const amount = order.amount || order.totalAmount || order.total_amount || order.pricing?.total || 0
      totalRevenue += amount
      totalServiceCount += order.guestCount || order.guest_count || 1

      // 检查是否为低碳菜品（通过碳足迹判断）
      const carbonFootprint = order.carbonFootprint || order.carbon_footprint || order.carbonImpact?.totalCarbonFootprint || 0
      const baselineCarbon = order.baselineCarbon || order.baseline_carbon || 0
      if (baselineCarbon > 0 && carbonFootprint < baselineCarbon * 0.7) {
        lowCarbonDishCount++
      }

      // 检查本地食材和有机食材（从订单项中判断）
      const items = order.items || []
      let hasLocalIngredient = false
      let hasOrganicIngredient = false
      items.forEach((item) => {
        if (item.isLocal || item.is_local) {
          hasLocalIngredient = true
        }
        if (item.isOrganic || item.is_organic) {
          hasOrganicIngredient = true
        }
      })
      if (hasLocalIngredient) localIngredientCount++
      if (hasOrganicIngredient) organicIngredientCount++

      // 顾客行为指标计算
      const customerId = order.customerId || order.customer_id || order.userId || order.user_id || ''
      if (customerId) {
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, [])
        }
        customerMap.get(customerId).push(order)
      }

      // 统计消费时段
      const orderDate = order.orderDate || order.order_date || order.createdAt || ''
      if (orderDate) {
        const date = new Date(orderDate)
        const hour = date.getHours()
        hourCountMap.set(hour, (hourCountMap.get(hour) || 0) + 1)
      }

      totalAmount += amount

      // 检查低碳行为选择
      if (order.lowCarbonChoice || order.low_carbon_choice) {
        lowCarbonChoiceCount++
      }
      if (order.smallPortion || order.small_portion) {
        smallPortionCount++
      }
      if (order.noUtensils || order.no_utensils) {
        noUtensilsCount++
      }
    })

    // 4. 计算餐厅行为指标
    const lowCarbonDishRatio = totalOrderCount > 0 ? lowCarbonDishCount / totalOrderCount : 0
    const localIngredientRatio = totalOrderCount > 0 ? localIngredientCount / totalOrderCount : 0
    const organicIngredientRatio = totalOrderCount > 0 ? organicIngredientCount / totalOrderCount : 0

    // 能源强度计算（需要从运营台账获取能源数据，这里先返回0）
    const energyIntensity = 0 // 需要从运营台账计算
    const energyIntensityReduction = 0 // 需要对比历史数据

    // 浪费减少指标（需要从运营台账获取，这里先返回0）
    const wasteReduction = 0
    const wasteReductionRate = 0

    // 5. 计算顾客行为指标
    const customerCount = customerMap.size
    const avgFrequency = customerCount > 0 ? totalOrderCount / customerCount : 0

    // 找出高峰时段（订单数最多的3个时段）
    const peakHours = Array.from(hourCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`)

    const avgAmount = totalOrderCount > 0 ? totalAmount / totalOrderCount : 0
    const lowCarbonChoiceRate = totalOrderCount > 0 ? lowCarbonChoiceCount / totalOrderCount : 0
    const smallPortionRate = totalOrderCount > 0 ? smallPortionCount / totalOrderCount : 0
    const noUtensilsRate = totalOrderCount > 0 ? noUtensilsCount / totalOrderCount : 0

    // 6. 获取历史快照数据
    const snapshotQuery = db.collection('restaurant_behavior_metrics').where({
      restaurantId: restaurantId,
    })

    if (startDate || endDate) {
      const dateCondition = {}
      if (startDate) {
        dateCondition.snapshotDate = db.command.gte(startDate)
      }
      if (endDate) {
        dateCondition.snapshotDate = db.command.lte(endDate)
      }
      if (Object.keys(dateCondition).length > 0) {
        snapshotQuery.where(dateCondition)
      }
    }

    if (period) {
      snapshotQuery.where({
        period: period,
      })
    }

    const snapshotsResult = await snapshotQuery
      .orderBy('snapshotDate', 'desc')
      .limit(30) // 最多返回30个快照
      .get()

    const snapshots = (snapshotsResult.data || []).map((snapshot) => ({
      metricId: snapshot._id || snapshot.metricId || '',
      snapshotDate: snapshot.snapshotDate || snapshot.snapshot_date || '',
      period: snapshot.period || 'daily',
      restaurantMetrics: snapshot.restaurantMetrics || {},
      customerMetrics: snapshot.customerMetrics || {},
    }))

    // 7. 生成图表数据（按日期分组）
    const chartDataMap = new Map()
    snapshots.forEach((snapshot) => {
      const date = snapshot.snapshotDate || ''
      const month = date.substring(0, 7) // 提取年月 YYYY-MM
      if (!chartDataMap.has(month)) {
        chartDataMap.set(month, {
          date: month,
          lowCarbonRatio: 0,
          count: 0,
        })
      }
      const chartItem = chartDataMap.get(month)
      const lowCarbonRatio = snapshot.restaurantMetrics?.lowCarbonDishRatio || 0
      chartItem.lowCarbonRatio += lowCarbonRatio
      chartItem.count += 1
    })

    const chartData = Array.from(chartDataMap.values())
      .map((item) => ({
        date: item.date,
        ratio: item.count > 0 ? item.lowCarbonRatio / item.count : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 8. 返回完整的行为指标数据
    return {
      code: 0,
      message: '获取成功',
      data: {
        // 餐厅行为指标
        restaurantMetrics: {
          lowCarbonDishRatio: lowCarbonDishRatio,
          localIngredientRatio: localIngredientRatio,
          organicIngredientRatio: organicIngredientRatio,
          energyIntensity: energyIntensity,
          energyIntensityReduction: energyIntensityReduction,
          wasteReduction: wasteReduction,
          wasteReductionRate: wasteReductionRate,
        },
        // 顾客行为指标
        customerMetrics: {
          avgFrequency: avgFrequency,
          peakHours: peakHours,
          avgAmount: avgAmount,
          lowCarbonChoiceRate: lowCarbonChoiceRate,
          smallPortionRate: smallPortionRate,
          noUtensilsRate: noUtensilsRate,
        },
        // 历史快照
        snapshots: snapshots,
        // 图表数据
        chartData: chartData,
        // 统计数据（兼容旧接口）
        statistics: {
          lowCarbonRatio: lowCarbonDishRatio,
          monthlyCarbonReduction: 0, // 需要从订单计算
          customerLowCarbonChoiceRate: lowCarbonChoiceRate,
          behaviorRecordCount: snapshots.length,
        },
      },
    }
  } catch (error) {
    console.error('获取行为统计数据失败:', error)
    return {
      code: 500,
      message: '获取行为统计数据失败',
      error: error.message,
    }
  }
}

/**
 * 生成行为指标快照
 * 根据策划方案，定期生成行为指标快照（日/周/月）
 */
async function generateBehaviorSnapshot(data) {
  const { restaurantId, tenantId, period = 'daily', snapshotDate } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    // 1. 获取当前行为指标数据
    const metricsResult = await getBehaviorMetrics({
      restaurantId,
      tenantId,
      period,
    })

    if (metricsResult.code !== 0) {
      return metricsResult
    }

    const metricsData = metricsResult.data

    // 2. 确定快照日期
    const targetDate = snapshotDate || new Date().toISOString().substring(0, 10)

    // 3. 检查是否已存在该日期的快照
    const existingSnapshot = await db.collection('restaurant_behavior_metrics')
      .where({
        restaurantId: restaurantId,
        snapshotDate: targetDate,
        period: period,
      })
      .get()

    if (existingSnapshot.data && existingSnapshot.data.length > 0) {
      // 更新现有快照
      const snapshotId = existingSnapshot.data[0]._id
      await db.collection('restaurant_behavior_metrics').doc(snapshotId).update({
        data: {
          restaurantMetrics: metricsData.restaurantMetrics || {},
          customerMetrics: metricsData.customerMetrics || {},
          updatedAt: db.serverDate(),
        },
      })

      return {
        code: 0,
        message: '快照更新成功',
        data: {
          metricId: snapshotId,
          snapshotDate: targetDate,
          period: period,
        },
      }
    } else {
      // 创建新快照
      const snapshot = {
        metricId: `metric_${restaurantId}_${targetDate}_${period}`,
        restaurantId: restaurantId,
        tenantId: tenantId || '',
        snapshotDate: targetDate,
        period: period,
        restaurantMetrics: metricsData.restaurantMetrics || {},
        customerMetrics: metricsData.customerMetrics || {},
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }

      const result = await db.collection('restaurant_behavior_metrics').add({
        data: snapshot,
      })

      return {
        code: 0,
        message: '快照生成成功',
        data: {
          metricId: result._id,
          snapshotDate: targetDate,
          period: period,
        },
      }
    }
  } catch (error) {
    console.error('生成行为指标快照失败:', error)
    return {
      code: 500,
      message: '生成行为指标快照失败',
      error: error.message,
    }
  }
}

/**
 * 获取优惠券列表
 */
async function listCoupons(data) {
  const { restaurantId, page = 1, pageSize = 20 } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    const query = db.collection('restaurant_campaigns').where({
      restaurantId: restaurantId,
    })

    const result = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .orderBy('createdAt', 'desc')
      .get()

    const coupons = result.data || []

    return {
      code: 0,
      message: '获取成功',
      data: coupons.map((coupon) => ({
        id: coupon._id || '',
        name: coupon.name || coupon.title || '',
        type: coupon.type || 'discount',
        value: coupon.value || coupon.discount || 0,
        minAmount: coupon.minAmount || coupon.min_amount || 0,
        totalCount: coupon.totalCount || coupon.total_count || 0,
        usedCount: coupon.usedCount || coupon.used_count || 0,
        validFrom: coupon.validFrom || coupon.valid_from || '',
        validTo: coupon.validTo || coupon.valid_to || '',
        status: coupon.status || 'active',
      })),
    }
  } catch (error) {
    console.error('获取优惠券列表失败:', error)
    return {
      code: 500,
      message: '获取优惠券列表失败',
      error: error.message,
    }
  }
}

/**
 * 创建优惠券
 */
async function createCoupon(data) {
  const { restaurantId, ...couponData } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    const coupon = {
      restaurantId: restaurantId,
      name: couponData.name || '',
      type: couponData.type || 'discount',
      value: couponData.value || 0,
      minAmount: couponData.minAmount || 0,
      totalCount: couponData.totalCount || 0,
      usedCount: 0,
      validFrom: couponData.validFrom || '',
      validTo: couponData.validTo || '',
      status: 'active',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }

    const result = await db.collection('restaurant_campaigns').add({
      data: coupon,
    })

    return {
      code: 0,
      message: '创建成功',
      data: {
        id: result._id,
        ...coupon,
      },
    }
  } catch (error) {
    console.error('创建优惠券失败:', error)
    return {
      code: 500,
      message: '创建优惠券失败',
      error: error.message,
    }
  }
}

/**
 * 更新优惠券
 */
async function updateCoupon(id, data) {
  if (!id) {
    return {
      code: 400,
      message: 'id 不能为空',
    }
  }

  try {
    const updateData = {
      ...data,
      updatedAt: db.serverDate(),
    }

    await db.collection('restaurant_campaigns').doc(id).update({
      data: updateData,
    })

    return {
      code: 0,
      message: '更新成功',
    }
  } catch (error) {
    console.error('更新优惠券失败:', error)
    return {
      code: 500,
      message: '更新优惠券失败',
      error: error.message,
    }
  }
}

/**
 * 删除优惠券
 */
async function deleteCoupon(id) {
  if (!id) {
    return {
      code: 400,
      message: 'id 不能为空',
    }
  }

  try {
    await db.collection('restaurant_campaigns').doc(id).remove()

    return {
      code: 0,
      message: '删除成功',
    }
  } catch (error) {
    console.error('删除优惠券失败:', error)
    return {
      code: 500,
      message: '删除优惠券失败',
      error: error.message,
    }
  }
}

/**
 * 获取优惠券详情
 */
async function getCouponDetail(couponId) {
  if (!couponId) {
    return {
      code: 400,
      message: 'couponId 不能为空',
    }
  }

  try {
    const result = await db.collection('restaurant_campaigns').doc(couponId).get()

    if (!result.data) {
      return {
        code: 404,
        message: '优惠券不存在',
      }
    }

    const coupon = result.data

    return {
      code: 0,
      message: '获取成功',
      data: {
        id: coupon._id || '',
        name: coupon.name || coupon.title || '',
        type: coupon.type || 'discount',
        value: coupon.value || coupon.discount || 0,
        minAmount: coupon.minAmount || coupon.min_amount || 0,
        totalCount: coupon.totalCount || coupon.total_count || 0,
        usedCount: coupon.usedCount || coupon.used_count || 0,
        validFrom: coupon.validFrom || coupon.valid_from || '',
        validTo: coupon.validTo || coupon.valid_to || '',
        status: coupon.status || 'active',
        description: coupon.description || '',
        rules: coupon.rules || {},
        createdAt: coupon.createdAt || '',
        updatedAt: coupon.updatedAt || '',
      },
    }
  } catch (error) {
    console.error('获取优惠券详情失败:', error)
    return {
      code: 500,
      message: '获取优惠券详情失败',
      error: error.message,
    }
  }
}

/**
 * 发放优惠券
 */
async function distributeCoupon(data) {
  const { couponId, restaurantId, userIds, distributionType, scheduledTime } = data || {}

  if (!couponId || !restaurantId) {
    return {
      code: 400,
      message: 'couponId 和 restaurantId 不能为空',
    }
  }

  try {
    // 获取优惠券信息
    const couponResult = await db.collection('restaurant_campaigns').doc(couponId).get()
    if (!couponResult.data) {
      return {
        code: 404,
        message: '优惠券不存在',
      }
    }

    const coupon = couponResult.data

    // 检查优惠券状态
    if (coupon.status !== 'active') {
      return {
        code: 400,
        message: '优惠券未激活，无法发放',
      }
    }

    // 检查有效期
    const now = new Date()
    const validFrom = new Date(coupon.validFrom || coupon.valid_from || '')
    const validTo = new Date(coupon.validTo || coupon.valid_to || '')
    if (now < validFrom || now > validTo) {
      return {
        code: 400,
        message: '优惠券不在有效期内',
      }
    }

    // 检查剩余数量
    const remainingCount = (coupon.totalCount || coupon.total_count || 0) - (coupon.usedCount || coupon.used_count || 0)
    if (remainingCount <= 0) {
      return {
        code: 400,
        message: '优惠券已发放完毕',
      }
    }

    // 根据发放类型处理
    if (distributionType === 'targeted' && userIds && userIds.length > 0) {
      // 定向发放：发放给指定用户
      const distributeCount = Math.min(userIds.length, remainingCount)
      const distributeUserIds = userIds.slice(0, distributeCount)

      // 创建用户优惠券记录
      const userCoupons = distributeUserIds.map((userId) => ({
        couponId: couponId,
        restaurantId: restaurantId,
        userId: userId,
        status: 'unused',
        distributedAt: db.serverDate(),
        expiresAt: validTo,
        createdAt: db.serverDate(),
      }))

      // 批量添加用户优惠券记录（如果存在user_coupons集合）
      // 注意：这里假设存在user_coupons集合，如果不存在需要先创建
      try {
        const batch = db.batch()
        userCoupons.forEach((uc) => {
          const docRef = db.collection('user_coupons').doc()
          batch.set(docRef, uc)
        })
        await batch.commit()
      } catch (error) {
        console.error('创建用户优惠券记录失败:', error)
        // 如果集合不存在，只更新优惠券的已发放数量
      }

      // 更新优惠券的已发放数量
      await db.collection('restaurant_campaigns').doc(couponId).update({
        data: {
          distributedCount: (coupon.distributedCount || coupon.distributed_count || 0) + distributeCount,
          updatedAt: db.serverDate(),
        },
      })

      return {
        code: 0,
        message: '发放成功',
        data: {
          distributedCount: distributeCount,
          userIds: distributeUserIds,
        },
      }
    } else if (distributionType === 'public') {
      // 公开领取：不创建具体记录，只记录发放事件
      return {
        code: 0,
        message: '公开领取模式，无需发放',
        data: {
          couponId: couponId,
          distributionType: 'public',
        },
      }
    } else {
      return {
        code: 400,
        message: '无效的发放类型',
      }
    }
  } catch (error) {
    console.error('发放优惠券失败:', error)
    return {
      code: 500,
      message: '发放优惠券失败',
      error: error.message,
    }
  }
}

/**
 * 获取优惠券统计
 */
async function getCouponStats(data) {
  const { restaurantId, couponId, startDate, endDate } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    const query = db.collection('restaurant_campaigns').where({
      restaurantId: restaurantId,
    })

    if (couponId) {
      query.where({
        _id: couponId,
      })
    }

    const result = await query.get()
    const coupons = result.data || []

    // 计算统计数据
    let totalCoupons = coupons.length
    let totalDistributed = 0
    let totalUsed = 0
    let totalRevenue = 0
    let totalCost = 0

    coupons.forEach((coupon) => {
      const distributed = coupon.distributedCount || coupon.distributed_count || 0
      const used = coupon.usedCount || coupon.used_count || 0
      totalDistributed += distributed
      totalUsed += used

      // 计算优惠券带来的收入（从订单中统计）
      // 这里简化处理，实际应该从订单数据中统计使用了该优惠券的订单收入
      const couponValue = coupon.value || coupon.discount || 0
      totalCost += used * couponValue
    })

    const usageRate = totalDistributed > 0 ? totalUsed / totalDistributed : 0
    const conversionRate = 0 // 需要从订单数据计算
    const roi = totalCost > 0 ? (totalRevenue - totalCost) / totalCost : 0

    // 按日期分组统计使用情况（需要从订单数据统计）
    const dailyStats = []

    return {
      code: 0,
      message: '获取成功',
      data: {
        totalCoupons,
        totalDistributed,
        totalUsed,
        usageRate,
        conversionRate,
        totalRevenue,
        totalCost,
        roi,
        dailyStats,
      },
    }
  } catch (error) {
    console.error('获取优惠券统计失败:', error)
    return {
      code: 500,
      message: '获取优惠券统计失败',
      error: error.message,
    }
  }
}

/**
 * 分析优惠券效果
 */
async function analyzeCouponEffect(data) {
  const { restaurantId, couponId, startDate, endDate } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    // 获取优惠券信息
    let coupon = null
    if (couponId) {
      const couponResult = await db.collection('restaurant_campaigns').doc(couponId).get()
      coupon = couponResult.data
    }

    // 从订单数据中统计使用了优惠券的订单
    const orderQuery = {
      restaurantId: restaurantId,
    }

    if (couponId) {
      orderQuery.couponId = couponId
    }

    if (startDate || endDate) {
      const dateCondition = {}
      if (startDate) {
        dateCondition.createdAt = _.gte(startDate)
      }
      if (endDate) {
        dateCondition.createdAt = _.lte(endDate)
      }
      Object.assign(orderQuery, dateCondition)
    }

    const ordersResult = await db.collection('restaurant_orders')
      .where(orderQuery)
      .field({
        'pricing.total': 1,
        'couponId': 1,
        'couponDiscount': 1,
        'createdAt': 1,
      })
      .get()

    const orders = ordersResult.data || []

    // 分析数据
    const couponOrders = orders.filter((o) => o.couponId)
    const totalOrders = orders.length
    const couponOrderCount = couponOrders.length
    const conversionRate = totalOrders > 0 ? couponOrderCount / totalOrders : 0

    // 按时间维度分析
    const timeAnalysis = {
      daily: {},
      weekly: {},
      monthly: {},
    }

    couponOrders.forEach((order) => {
      const orderDate = order.createdAt || ''
      if (!orderDate) return

      const date = new Date(orderDate)
      const dayKey = date.toISOString().substring(0, 10)
      const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`
      const monthKey = date.toISOString().substring(0, 7)

      if (!timeAnalysis.daily[dayKey]) {
        timeAnalysis.daily[dayKey] = { count: 0, revenue: 0 }
      }
      timeAnalysis.daily[dayKey].count++
      timeAnalysis.daily[dayKey].revenue += order.pricing?.total || 0

      if (!timeAnalysis.weekly[weekKey]) {
        timeAnalysis.weekly[weekKey] = { count: 0, revenue: 0 }
      }
      timeAnalysis.weekly[weekKey].count++
      timeAnalysis.weekly[weekKey].revenue += order.pricing?.total || 0

      if (!timeAnalysis.monthly[monthKey]) {
        timeAnalysis.monthly[monthKey] = { count: 0, revenue: 0 }
      }
      timeAnalysis.monthly[monthKey].count++
      timeAnalysis.monthly[monthKey].revenue += order.pricing?.total || 0
    })

    // 用户维度分析
    const userAnalysis = {
      newUsers: 0,
      returningUsers: 0,
      avgOrderValue: 0,
    }

    // 菜品维度分析（需要从订单项中统计）
    const dishAnalysis = {}

    return {
      code: 0,
      message: '分析成功',
      data: {
        coupon: coupon ? {
          id: coupon._id || '',
          name: coupon.name || coupon.title || '',
          type: coupon.type || 'discount',
        } : null,
        conversionRate,
        couponOrderCount,
        totalOrders,
        timeAnalysis,
        userAnalysis,
        dishAnalysis,
      },
    }
  } catch (error) {
    console.error('分析优惠券效果失败:', error)
    return {
      code: 500,
      message: '分析优惠券效果失败',
      error: error.message,
    }
  }
}

/**
 * 获取评价列表
 */
async function listReviews(data) {
  const { restaurantId, page = 1, pageSize = 20, startDate, endDate, rating, status, keyword } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    const query = db.collection('restaurant_reviews').where({
      restaurantId: restaurantId,
    })

    // 添加评分筛选
    if (rating) {
      query.where({
        rating: rating,
      })
    }

    // 添加状态筛选（待回复/已回复）
    if (status === 'pending') {
      query.where({
        reply: _.eq(null).or(_.eq('')),
      })
    } else if (status === 'replied') {
      query.where({
        reply: _.neq(null).and(_.neq('')),
      })
    }

    // 注意：日期和关键词筛选在内存中处理
    let result
    try {
      result = await query.orderBy('reviewDate', 'desc').get()
    } catch (error) {
      // 如果排序失败，尝试不排序
      try {
        result = await query.get()
        result.data = (result.data || []).sort((a, b) => {
          const dateA = a.reviewDate || a.review_date || a.createdAt || ''
          const dateB = b.reviewDate || b.review_date || b.createdAt || ''
          return new Date(dateB).getTime() - new Date(dateA).getTime()
        })
      } catch (err) {
        console.error('查询评价失败:', err)
        return {
          code: 500,
          message: '查询评价失败',
          error: err.message,
        }
      }
    }

    let reviews = result.data || []

    // 添加日期筛选（在内存中过滤）
    if (startDate || endDate) {
      reviews = reviews.filter((review) => {
        const reviewDate = review.reviewDate || review.review_date || review.createdAt || ''
        if (!reviewDate) return false

        const dateStr = typeof reviewDate === 'string'
          ? reviewDate.substring(0, 10)
          : new Date(reviewDate).toISOString().substring(0, 10)

        if (startDate && dateStr < startDate) return false
        if (endDate && dateStr > endDate) return false
        return true
      })
    }

    // 添加关键词搜索（在内存中过滤）
    if (keyword) {
      const keywordLower = keyword.toLowerCase()
      reviews = reviews.filter((review) => {
        const content = (review.content || review.comment || '').toLowerCase()
        const customerName = (review.customerName || review.customer_name || '').toLowerCase()
        return content.includes(keywordLower) || customerName.includes(keywordLower)
      })
    }

    // 分页处理
    const total = reviews.length
    reviews = reviews.slice((page - 1) * pageSize, page * pageSize)

    return {
      code: 0,
      message: '获取成功',
      data: reviews.map((review) => ({
        id: review._id || '',
        orderNo: review.orderNo || review.order_id || '',
        customerName: review.customerName || review.customer_name || '',
        rating: review.rating || 0,
        content: review.content || review.comment || '',
        images: review.images || [],
        carbonSatisfaction: review.carbonSatisfaction || review.carbon_satisfaction || 0,
        reviewDate: review.reviewDate || review.review_date || review.createdAt || '',
        reply: review.reply || '',
        replyDate: review.replyDate || review.reply_date || '',
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error('获取评价列表失败:', error)
    return {
      code: 500,
      message: '获取评价列表失败',
      error: error.message,
    }
  }
}

/**
 * 回复评价
 */
async function replyReview(reviewId, reply) {
  if (!reviewId) {
    return {
      code: 400,
      message: 'reviewId 不能为空',
    }
  }

  if (!reply) {
    return {
      code: 400,
      message: 'reply 不能为空',
    }
  }

  try {
    await db.collection('restaurant_reviews').doc(reviewId).update({
      data: {
        reply: reply,
        replyDate: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return {
      code: 0,
      message: '回复成功',
    }
  } catch (error) {
    console.error('回复评价失败:', error)
    return {
      code: 500,
      message: '回复评价失败',
      error: error.message,
    }
  }
}

/**
 * 获取评价详情
 */
async function getReviewDetail(reviewId) {
  if (!reviewId) {
    return {
      code: 400,
      message: 'reviewId 不能为空',
    }
  }

  try {
    const result = await db.collection('restaurant_reviews').doc(reviewId).get()

    if (!result.data) {
      return {
        code: 404,
        message: '评价不存在',
      }
    }

    const review = result.data

    // 获取关联的订单信息
    let orderInfo = null
    if (review.orderId || review.order_id) {
      try {
        const orderResult = await db.collection('restaurant_orders')
          .doc(review.orderId || review.order_id)
          .get()
        if (orderResult.data) {
          orderInfo = {
            orderNo: orderResult.data.orderNo || orderResult.data.order_no || '',
            orderDate: orderResult.data.orderDate || orderResult.data.order_date || orderResult.data.createdAt || '',
            amount: orderResult.data.amount || orderResult.data.totalAmount || orderResult.data.total_amount || 0,
            items: orderResult.data.items || [],
          }
        }
      } catch (error) {
        console.error('获取订单信息失败:', error)
      }
    }

    // 获取用户历史评价
    let userHistoryReviews = []
    if (review.userId || review.user_id) {
      try {
        const historyResult = await db.collection('restaurant_reviews')
          .where({
            userId: review.userId || review.user_id,
            restaurantId: review.restaurantId,
            _id: _.neq(reviewId),
          })
          .orderBy('reviewDate', 'desc')
          .limit(5)
          .get()
        userHistoryReviews = (historyResult.data || []).map((r) => ({
          id: r._id || '',
          rating: r.rating || 0,
          content: r.content || r.comment || '',
          reviewDate: r.reviewDate || r.review_date || r.createdAt || '',
        }))
      } catch (error) {
        console.error('获取用户历史评价失败:', error)
      }
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        id: review._id || '',
        orderNo: review.orderNo || review.order_id || '',
        customerName: review.customerName || review.customer_name || '',
        userId: review.userId || review.user_id || '',
        rating: review.rating || 0,
        content: review.content || review.comment || '',
        images: review.images || [],
        carbonSatisfaction: review.carbonSatisfaction || review.carbon_satisfaction || 0,
        reviewDate: review.reviewDate || review.review_date || review.createdAt || '',
        reply: review.reply || '',
        replyDate: review.replyDate || review.reply_date || '',
        replyHistory: review.replyHistory || [],
        orderInfo: orderInfo,
        userHistoryReviews: userHistoryReviews,
      },
    }
  } catch (error) {
    console.error('获取评价详情失败:', error)
    return {
      code: 500,
      message: '获取评价详情失败',
      error: error.message,
    }
  }
}

/**
 * 获取评价统计
 */
async function getReviewStats(data) {
  const { restaurantId, startDate, endDate } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    const query = db.collection('restaurant_reviews').where({
      restaurantId: restaurantId,
    })

    // 添加日期筛选
    if (startDate || endDate) {
      const dateCondition = {}
      if (startDate) {
        dateCondition.reviewDate = _.gte(startDate)
      }
      if (endDate) {
        dateCondition.reviewDate = _.lte(endDate)
      }
      if (Object.keys(dateCondition).length > 0) {
        query.where(dateCondition)
      }
    }

    const result = await query.get()
    const reviews = result.data || []

    // 计算统计数据
    let totalReviews = reviews.length
    let totalRating = 0
    let ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    let repliedCount = 0
    let pendingReplyCount = 0

    reviews.forEach((review) => {
      const rating = review.rating || 0
      totalRating += rating
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating] = (ratingCounts[rating] || 0) + 1
      }
      if (review.reply) {
        repliedCount++
      } else {
        pendingReplyCount++
      }
    })

    const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0
    const goodRate = totalReviews > 0 ? ((ratingCounts[5] || 0) + (ratingCounts[4] || 0)) / totalReviews : 0
    const badRate = totalReviews > 0 ? ((ratingCounts[1] || 0) + (ratingCounts[2] || 0)) / totalReviews : 0
    const neutralRate = totalReviews > 0 ? (ratingCounts[3] || 0) / totalReviews : 0
    const replyRate = totalReviews > 0 ? repliedCount / totalReviews : 0

    // 按日期分组统计趋势
    const dailyStatsMap = new Map()
    reviews.forEach((review) => {
      const reviewDate = review.reviewDate || review.review_date || review.createdAt || ''
      if (!reviewDate) return

      const dateStr = typeof reviewDate === 'string'
        ? reviewDate.substring(0, 10)
        : new Date(reviewDate).toISOString().substring(0, 10)

      if (!dailyStatsMap.has(dateStr)) {
        dailyStatsMap.set(dateStr, {
          date: dateStr,
          count: 0,
          avgRating: 0,
          totalRating: 0,
        })
      }

      const dayStat = dailyStatsMap.get(dateStr)
      dayStat.count++
      dayStat.totalRating += review.rating || 0
      dayStat.avgRating = dayStat.totalRating / dayStat.count
    })

    const trends = Array.from(dailyStatsMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))

    // 评分分布
    const distribution = [
      { rating: 5, count: ratingCounts[5] || 0, label: '5星' },
      { rating: 4, count: ratingCounts[4] || 0, label: '4星' },
      { rating: 3, count: ratingCounts[3] || 0, label: '3星' },
      { rating: 2, count: ratingCounts[2] || 0, label: '2星' },
      { rating: 1, count: ratingCounts[1] || 0, label: '1星' },
    ]

    return {
      code: 0,
      message: '获取成功',
      data: {
        totalReviews,
        avgRating,
        goodRate,
        badRate,
        neutralRate,
        replyRate,
        repliedCount,
        pendingReplyCount,
        ratingCounts,
        trends,
        distribution,
      },
    }
  } catch (error) {
    console.error('获取评价统计失败:', error)
    return {
      code: 500,
      message: '获取评价统计失败',
      error: error.message,
    }
  }
}

/**
 * 分析评价数据
 */
async function analyzeReviews(data) {
  const { restaurantId, startDate, endDate } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    const query = db.collection('restaurant_reviews').where({
      restaurantId: restaurantId,
    })

    // 添加日期筛选
    if (startDate || endDate) {
      const dateCondition = {}
      if (startDate) {
        dateCondition.reviewDate = _.gte(startDate)
      }
      if (endDate) {
        dateCondition.reviewDate = _.lte(endDate)
      }
      if (Object.keys(dateCondition).length > 0) {
        query.where(dateCondition)
      }
    }

    const result = await query.get()
    const reviews = result.data || []

    // 关键词分析（简单实现，提取高频词）
    const keywordMap = new Map()
    reviews.forEach((review) => {
      const content = (review.content || review.comment || '').toLowerCase()
      // 简单分词（按常见分隔符）
      const words = content.split(/[\s，。！？、；：,\.!?\s]+/).filter((w) => w.length > 1)
      words.forEach((word) => {
        keywordMap.set(word, (keywordMap.get(word) || 0) + 1)
      })
    })

    // 获取高频关键词（前20个）
    const topKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }))

    // 情感分析（简单实现：基于评分）
    const sentimentAnalysis = {
      positive: reviews.filter((r) => (r.rating || 0) >= 4).length,
      neutral: reviews.filter((r) => (r.rating || 0) === 3).length,
      negative: reviews.filter((r) => (r.rating || 0) <= 2).length,
    }

    // 评价主题分析（简单实现：基于关键词匹配）
    const themes = {
      dish: 0, // 菜品
      service: 0, // 服务
      environment: 0, // 环境
      price: 0, // 价格
      carbon: 0, // 碳减排
    }

    const themeKeywords = {
      dish: ['菜品', '菜', '味道', '口感', '好吃', '难吃', '食材'],
      service: ['服务', '态度', '速度', '效率', '服务员', '等待'],
      environment: ['环境', '装修', '氛围', '干净', '卫生', '舒适'],
      price: ['价格', '贵', '便宜', '划算', '性价比', '收费'],
      carbon: ['碳', '环保', '绿色', '低碳', '减排', '环境'],
    }

    reviews.forEach((review) => {
      const content = (review.content || review.comment || '').toLowerCase()
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some((kw) => content.includes(kw))) {
          themes[theme]++
        }
      })
    })

    return {
      code: 0,
      message: '分析成功',
      data: {
        topKeywords,
        sentimentAnalysis,
        themes,
        totalAnalyzed: reviews.length,
      },
    }
  } catch (error) {
    console.error('分析评价数据失败:', error)
    return {
      code: 500,
      message: '分析评价数据失败',
      error: error.message,
    }
  }
}

/**
 * 获取订单列表
 */
async function listOrders(data) {
  const { restaurantId, startDate, endDate, page = 1, pageSize = 20, status, keyword, includeStats } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    const query = db.collection('restaurant_orders').where({
      restaurantId: restaurantId,
    })

    // 添加状态筛选
    if (status) {
      query.where({
        status: status,
      })
    }

    // 注意：日期筛选在内存中处理，因为需要兼容 orderDate 和 createdAt 字段

    // 直接使用 createdAt 排序（订单数据中都有这个字段）
    let result
    try {
      result = await query.orderBy('createdAt', 'desc').get()
    } catch (error) {
      // 如果 createdAt 排序失败，尝试不排序
      try {
        result = await query.get()
        // 在内存中排序
        result.data = (result.data || []).sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })
      } catch (err) {
        console.error('查询订单失败:', err)
        return {
          code: 500,
          message: '查询订单失败',
          error: err.message,
        }
      }
    }

    let orders = result.data || []

    // 添加日期筛选（在内存中过滤，兼容 orderDate 和 createdAt）
    if (startDate || endDate) {
      orders = orders.filter((order) => {
        const orderDate = order.orderDate || order.order_date || order.createdAt || ''
        if (!orderDate) return false
        
        const dateStr = typeof orderDate === 'string' 
          ? orderDate.substring(0, 10) 
          : new Date(orderDate).toISOString().substring(0, 10)
        
        if (startDate && dateStr < startDate) return false
        if (endDate && dateStr > endDate) return false
        return true
      })
    }

    // 添加关键词搜索（订单号或客户名称）- 在内存中过滤
    if (keyword) {
      const keywordLower = keyword.toLowerCase()
      orders = orders.filter((order) => {
        const orderNo = (order.orderNo || order.order_no || order.orderId || '').toLowerCase()
        const customerName = (order.customerName || order.customer_name || order.userName || order.user_name || '').toLowerCase()
        return orderNo.includes(keywordLower) || customerName.includes(keywordLower)
      })
    }

    // 计算统计数据（如果需要）
    let stats = null
    if (includeStats) {
      const totalOrders = orders.length
      const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'completed').length
      const totalRevenue = orders
        .filter((o) => o.status === 'completed' || o.status === 'completed')
        .reduce((sum, o) => {
          const amount = o.amount || o.totalAmount || o.total_amount || o.pricing?.total || 0
          return sum + amount
        }, 0)
      const totalCarbonReduction = orders
        .filter((o) => o.status === 'completed' || o.status === 'completed')
        .reduce((sum, o) => {
          const carbon = o.carbonFootprint || o.carbon_footprint || o.carbonImpact?.totalCarbonFootprint || 0
          return sum + carbon
        }, 0)
      const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0
      const completionRate = totalOrders > 0 ? completedOrders / totalOrders : 0

      // 按日期分组统计
      const dailyStats = new Map()
      orders.forEach((order) => {
        const orderDate = order.orderDate || order.order_date || order.createdAt || ''
        if (!orderDate) return
        
        const dateStr = typeof orderDate === 'string' 
          ? orderDate.substring(0, 10) 
          : new Date(orderDate).toISOString().substring(0, 10)
        
        if (!dailyStats.has(dateStr)) {
          dailyStats.set(dateStr, {
            date: dateStr,
            orderCount: 0,
            revenue: 0,
            carbonReduction: 0,
          })
        }
        
        const dayStat = dailyStats.get(dateStr)
        dayStat.orderCount++
        
        if (order.status === 'completed' || order.status === 'completed') {
          const amount = order.amount || order.totalAmount || order.total_amount || order.pricing?.total || 0
          const carbon = order.carbonFootprint || order.carbon_footprint || order.carbonImpact?.totalCarbonFootprint || 0
          dayStat.revenue += amount
          dayStat.carbonReduction += carbon
        }
      })

      // 按状态分组统计
      const statusStats = new Map()
      orders.forEach((order) => {
        const orderStatus = order.status || 'pending'
        statusStats.set(orderStatus, (statusStats.get(orderStatus) || 0) + 1)
      })

      stats = {
        totalOrders,
        completedOrders,
        totalRevenue,
        totalCarbonReduction,
        avgOrderValue,
        completionRate,
        dailyStats: Array.from(dailyStats.values()).sort((a, b) => a.date.localeCompare(b.date)),
        statusStats: Object.fromEntries(statusStats),
      }
    }

    // 分页处理
    const total = orders.length
    const paginatedOrders = orders.slice((page - 1) * pageSize, page * pageSize)

    // 格式化订单数据
    const formattedOrders = paginatedOrders.map((order) => ({
      id: order._id || '',
      orderNo: order.orderNo || order.order_no || order.orderId || '',
      orderDate: order.orderDate || order.order_date || order.createdAt || '',
      customerName: order.customerName || order.customer_name || order.userName || order.user_name || '',
      amount: order.amount || order.totalAmount || order.total_amount || order.pricing?.total || 0,
      carbonFootprint: order.carbonFootprint || order.carbon_footprint || order.carbonImpact?.totalCarbonFootprint || 0,
      status: order.status || 'pending',
      items: order.items || [],
    }))

    return {
      code: 0,
      message: '获取成功',
      data: formattedOrders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: stats,
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    return {
      code: 500,
      message: '获取订单列表失败',
      error: error.message,
    }
  }
}

/**
 * 获取订单详情
 */
async function getOrder(orderId) {
  if (!orderId) {
    return {
      code: 400,
      message: 'orderId 不能为空',
    }
  }

  try {
    const result = await db.collection('restaurant_orders').doc(orderId).get()

    if (!result.data) {
      return {
        code: 404,
        message: '订单不存在',
      }
    }

    const order = result.data

    return {
      code: 0,
      message: '获取成功',
      data: {
        id: order._id || '',
        orderNo: order.orderNo || order.order_no || order.orderId || '',
        orderDate: order.orderDate || order.order_date || order.createdAt || '',
        customerName: order.customerName || order.customer_name || order.userName || order.user_name || '',
        amount: order.amount || order.totalAmount || order.total_amount || order.pricing?.total || 0,
        carbonFootprint: order.carbonFootprint || order.carbon_footprint || order.carbonImpact?.totalCarbonFootprint || 0,
        status: order.status || 'pending',
        items: order.items || [],
      },
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    return {
      code: 500,
      message: '获取订单详情失败',
      error: error.message,
    }
  }
}

/**
 * 更新订单状态
 */
async function updateOrderStatus(orderId, status) {
  if (!orderId) {
    return {
      code: 400,
      message: 'orderId 不能为空',
    }
  }

  if (!status) {
    return {
      code: 400,
      message: 'status 不能为空',
    }
  }

  try {
    await db.collection('restaurant_orders').doc(orderId).update({
      data: {
        status: status,
        updatedAt: db.serverDate(),
      },
    })

    return {
      code: 0,
      message: '更新成功',
    }
  } catch (error) {
    console.error('更新订单状态失败:', error)
    return {
      code: 500,
      message: '更新订单状态失败',
      error: error.message,
    }
  }
}

/**
 * 获取订单碳统计
 */
async function getOrderCarbonStats(data) {
  const { restaurantId, startDate, endDate } = data || {}
  
  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    const query = db.collection('restaurant_orders').where({
      restaurantId: restaurantId,
    })

    // 添加日期筛选
    if (startDate || endDate) {
      const dateCondition = {}
      if (startDate) {
        dateCondition.orderDate = db.command.gte(startDate)
      }
      if (endDate) {
        dateCondition.orderDate = db.command.lte(endDate)
      }
      if (Object.keys(dateCondition).length > 0) {
        query.where(dateCondition)
      }
    }

    const result = await query.orderBy('orderDate', 'desc').get()
    const orders = result.data || []

    // 计算统计数据
    let todayCarbon = 0
    let todayReduction = 0
    let totalReduction = 0
    const today = new Date().toISOString().split('T')[0]

    const chartDataMap = new Map()

    orders.forEach((order) => {
      const carbon = order.totalCarbon || order.total_carbon || 0
      const reduction = order.carbonReduction || order.carbon_reduction || 0
      const orderDate = order.orderDate || order.order_date || ''

      totalReduction += reduction

      if (orderDate === today) {
        todayCarbon += carbon
        todayReduction += reduction
      }

      // 生成图表数据
      const date = orderDate.substring(0, 10) // YYYY-MM-DD
      if (!chartDataMap.has(date)) {
        chartDataMap.set(date, {
          date: date,
          carbon: 0,
        })
      }
      const chartItem = chartDataMap.get(date)
      chartItem.carbon += carbon
    })

    const chartData = Array.from(chartDataMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))

    // 格式化详细数据
    const details = orders.map((order) => ({
      id: order._id || '',
      orderNo: order.orderNo || order.order_no || '',
      orderDate: order.orderDate || order.order_date || '',
      totalCarbon: order.totalCarbon || order.total_carbon || 0,
      carbonReduction: order.carbonReduction || order.carbon_reduction || 0,
      orderAmount: order.orderAmount || order.order_amount || 0,
      status: order.status || '',
    }))

    return {
      code: 0,
      message: '获取成功',
      data: {
        statistics: {
          todayCarbon: todayCarbon,
          todayReduction: todayReduction,
          totalReduction: totalReduction,
          totalOrders: orders.length,
        },
        chartData: chartData,
        orders: details, // 前端期望 orders 字段
        details: details, // 保持兼容性
      },
    }
  } catch (error) {
    console.error('获取订单碳统计失败:', error)
    return {
      code: 500,
      message: '获取订单碳统计失败',
      error: error.message,
    }
  }
}

/**
 * 生成碳报告
 */
async function generateCarbonReport(data) {
  const { restaurantId, type, period } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    // 解析日期范围
    let startDate = ''
    let endDate = ''
    if (period) {
      const [start, end] = period.split('_')
      startDate = start
      endDate = end
    }

    // 查询订单数据
    const query = db.collection('restaurant_orders').where({
      restaurantId: restaurantId,
    })

    if (startDate && endDate) {
      query.where({
        orderDate: db.command.gte(startDate).and(db.command.lte(endDate)),
      })
    }

    const result = await query.get()
    const orders = result.data || []

    // 根据报告类型生成数据
    if (type === 'monthly') {
      const monthlyMap = new Map()
      orders.forEach((order) => {
        const orderDate = order.orderDate || order.order_date || ''
        const month = orderDate.substring(0, 7) // YYYY-MM
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month: month,
            carbon: 0,
            reduction: 0,
          })
        }
        const item = monthlyMap.get(month)
        item.carbon += order.totalCarbon || order.total_carbon || 0
        item.reduction += order.carbonReduction || order.carbon_reduction || 0
      })

      const monthlyData = Array.from(monthlyMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))

      return {
        code: 0,
        message: '生成成功',
        data: {
          type: 'monthly',
          monthlyData: monthlyData,
        },
      }
    } else if (type === 'yearly') {
      const yearlyMap = new Map()
      orders.forEach((order) => {
        const orderDate = order.orderDate || order.order_date || ''
        const year = orderDate.substring(0, 4) // YYYY
        if (!yearlyMap.has(year)) {
          yearlyMap.set(year, {
            year: year,
            carbon: 0,
            reduction: 0,
          })
        }
        const item = yearlyMap.get(year)
        item.carbon += order.totalCarbon || order.total_carbon || 0
        item.reduction += order.carbonReduction || order.carbon_reduction || 0
      })

      const yearlyData = Array.from(yearlyMap.values())
        .sort((a, b) => a.year.localeCompare(b.year))

      return {
        code: 0,
        message: '生成成功',
        data: {
          type: 'yearly',
          yearlyData: yearlyData,
        },
      }
    } else if (type === 'esg') {
      // ESG报告数据
      let totalCarbon = 0
      let totalReduction = 0
      let totalOrders = orders.length

      orders.forEach((order) => {
        totalCarbon += order.totalCarbon || order.total_carbon || 0
        totalReduction += order.carbonReduction || order.carbon_reduction || 0
      })

      return {
        code: 0,
        message: '生成成功',
        data: {
          type: 'esg',
          esgData: {
            totalCarbon: totalCarbon,
            totalReduction: totalReduction,
            totalOrders: totalOrders,
            reductionRate: totalCarbon > 0 ? (totalReduction / totalCarbon) * 100 : 0,
          },
        },
      }
    }

    return {
      code: 400,
      message: '不支持的报告类型',
    }
  } catch (error) {
    console.error('生成碳报告失败:', error)
    return {
      code: 500,
      message: '生成碳报告失败',
      error: error.message,
    }
  }
}

/**
 * 获取菜单列表
 */
async function getMenuList(data) {
  const { restaurantId, page = 1, pageSize = 20 } = data || {}
  
  if (!restaurantId) {
    return {
      code: 400,
      message: 'restaurantId 不能为空',
    }
  }

  try {
    // 尝试从多个可能的集合中查询菜单数据
    // 1. restaurant_menu_items - 餐厅菜单项
    // 2. restaurant_menus - 餐厅菜单
    // 3. menu_items - 菜单项（通用）
    
    let menus = []
    
    // 首先尝试 restaurant_menu_items
    try {
      const menuItemsResult = await db.collection('restaurant_menu_items')
        .where({
          restaurantId: restaurantId,
        })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .orderBy('createdAt', 'desc')
        .get()
      
      if (menuItemsResult.data && menuItemsResult.data.length > 0) {
        menus = menuItemsResult.data
      }
    } catch (error) {
      // 静默处理错误，继续尝试其他集合
    }
    
    // 如果 restaurant_menu_items 没有数据，尝试 restaurant_menus
    if (menus.length === 0) {
      try {
        const menusResult = await db.collection('restaurant_menus')
          .where({
            restaurantId: restaurantId,
          })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .orderBy('createdAt', 'desc')
          .get()
        
        if (menusResult.data && menusResult.data.length > 0) {
          menus = menusResult.data
        }
      } catch (error) {
        // 静默处理错误，继续尝试其他集合
      }
    }
    
    // 如果还是没有数据，尝试 menu_items
    if (menus.length === 0) {
      try {
        const itemsResult = await db.collection('menu_items')
          .where({
            restaurantId: restaurantId,
          })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .orderBy('createdAt', 'desc')
          .get()
        
        if (itemsResult.data && itemsResult.data.length > 0) {
          menus = itemsResult.data
        }
      } catch (error) {
        // 静默处理错误
      }
    }

    // 获取总数
    let total = 0
    try {
      const countResult = await db.collection('restaurant_menu_items')
        .where({
          restaurantId: restaurantId,
        })
        .count()
      total = countResult.total || 0
    } catch (error) {
      // 如果计数失败，使用当前数据长度
      total = menus.length
    }

    // 格式化菜单数据
    const formattedMenus = menus.map((menu) => ({
      id: menu._id || '',
      _id: menu._id,
      name: menu.name || menu.dishName || menu.menuName || '',
      price: menu.price || 0,
      carbonFootprint: menu.carbonFootprint || (menu.carbonFootprint && typeof menu.carbonFootprint === 'object' ? menu.carbonFootprint.value : undefined) || menu.carbon_footprint || menu.totalCarbonFootprint || 0,
      carbonLabel: menu.carbonLabel || (menu.carbonData && menu.carbonData.carbonLabel) || menu.carbonLevel || menu.carbon_level || 'medium',
      carbonLevel: menu.carbonLevel || menu.carbon_level || 'medium',
      carbonScore: menu.carbonScore || menu.carbon_score || 0,
      ingredients: menu.ingredients || menu.ingredient_list || menu.ingredientList || [],
      status: menu.status || 'active',
      isAvailable: menu.isAvailable !== undefined ? menu.isAvailable : true,
      restaurantId: menu.restaurantId || restaurantId,
      baseRecipeId: menu.baseRecipeId || undefined,
      category: menu.category || '',
    }))

    return {
      code: 0,
      message: '获取成功',
      data: {
        menus: formattedMenus,
        menuItems: formattedMenus, // 兼容字段
        total: total,
        totalCount: total, // 兼容字段
      },
    }
  } catch (error) {
    console.error('获取菜单列表失败:', error)
    return {
      code: 500,
      message: '获取菜单列表失败',
      error: error.message,
    }
  }
}

/**
 * 从基础菜谱创建餐厅菜单项
 * @param {Object} data - 请求数据 { recipeId, restaurantId, customFields }
 * @param {Object} user - 当前用户
 * @param {Object} context - 上下文
 */
async function createMenuItemFromRecipe(data, user, context) {
  const { recipeId, restaurantId, customFields = {} } = data || {}

  if (!recipeId) {
    return {
      code: 400,
      message: '菜谱ID不能为空'
    }
  }

  if (!restaurantId) {
    return {
      code: 400,
      message: '餐厅ID不能为空'
    }
  }

  try {
    // 1. 获取基础菜谱信息
    const recipeResult = await db.collection('recipes').doc(recipeId).get()
    if (!recipeResult.data) {
      return {
        code: 404,
        message: '基础菜谱不存在'
      }
    }

    const recipe = recipeResult.data

    // 2. 验证是否为基础菜谱
    if (!recipe.isBaseRecipe) {
      return {
        code: 400,
        message: '只能从基础菜谱创建菜单项'
      }
    }

    // 3. 获取餐厅信息（用于获取地区等信息）
    const restaurantResult = await db.collection('restaurants').doc(restaurantId).get()
    if (!restaurantResult.data) {
      return {
        code: 404,
        message: '餐厅不存在'
      }
    }

    const restaurant = restaurantResult.data
    const tenantId = restaurant.tenantId || restaurantId
    const restaurantRegion = restaurant.region || 'national_average'

    // 4. 转换 ingredients 结构
    // recipes 的 ingredients 可能是简单数组或对象数组
    // restaurant_menu_items 需要详细结构：{ ingredientName, quantity, unit, isMainIngredient }
    let formattedIngredients = []
    if (Array.isArray(recipe.ingredients)) {
      formattedIngredients = recipe.ingredients.map((ing, index) => {
        if (typeof ing === 'string') {
          // 简单字符串格式
          return {
            ingredientName: ing,
            quantity: 100, // 默认值，需要餐厅填写
            unit: 'g',
            isMainIngredient: index === 0 // 第一个作为主食材
          }
        } else if (typeof ing === 'object' && ing !== null) {
          // 对象格式，尝试提取信息
          return {
            ingredientName: ing.name || ing.ingredientName || ing.ingredient || String(ing),
            quantity: ing.quantity || ing.amount || 100,
            unit: ing.unit || 'g',
            isMainIngredient: ing.isMainIngredient !== undefined ? ing.isMainIngredient : (index === 0)
          }
        } else {
          return {
            ingredientName: String(ing),
            quantity: 100,
            unit: 'g',
            isMainIngredient: index === 0
          }
        }
      })
    }

    // 5. 转换 carbonFootprint
    // recipes 的 carbonFootprint 是简单数字
    // restaurant_menu_items 需要扩展结构
    const baseCarbonFootprint = recipe.carbonFootprint || 0
    const carbonData = {
      carbonFootprint: baseCarbonFootprint,
      calculationMethod: 'lca_simplified',
      comparedToMeat: {
        meatType: '猪肉', // 默认值
        meatCarbonFootprint: 7.2, // 默认值
        carbonSavings: Math.max(0, 7.2 - baseCarbonFootprint),
        savingsPercent: baseCarbonFootprint > 0 ? Math.round((1 - baseCarbonFootprint / 7.2) * 100) : 0
      },
      carbonLabel: recipe.carbonLabel || (baseCarbonFootprint < 0.5 ? 'ultra_low' : baseCarbonFootprint < 1.0 ? 'low' : baseCarbonFootprint < 2.0 ? 'medium' : 'high'),
      carbonScore: recipe.carbonScore || (baseCarbonFootprint < 0.5 ? 95 : baseCarbonFootprint < 1.0 ? 85 : baseCarbonFootprint < 2.0 ? 70 : 50),
      sustainabilityRating: {
        overall: 4.0,
        localSourcing: 4.0,
        organicRatio: 4.0,
        seasonality: 4.0,
        waterFootprint: 4.0
      }
    }

    // 6. 构建菜单项数据
    const menuItemData = {
      // 基础信息（从菜谱复制）
      name: customFields.name || recipe.name,
      description: customFields.description || recipe.description || '',
      category: customFields.category || recipe.category || '其他',
      cuisine: customFields.cuisine || '中餐',
      cookingMethod: recipe.cookingMethod || 'steamed',
      
      // 食材信息（已转换）
      ingredients: formattedIngredients,
      
      // 价格（需要餐厅填写）
      price: customFields.price || 0,
      
      // 营养信息（需要餐厅填写，这里设置默认值）
      nutrition: customFields.nutrition || {
        calories: 0,
        protein: 0,
        fat: 0,
        carbohydrate: 0,
        fiber: 0,
        sodium: 0,
        servingSize: '1份'
      },
      
      // 碳足迹信息（已转换）
      carbonData: carbonData,
      carbonFootprint: {
        value: baseCarbonFootprint,
        baseline: baseCarbonFootprint * 1.2, // 默认基准值
        reduction: baseCarbonFootprint * 0.2, // 默认减排量
        ingredients: baseCarbonFootprint * 0.7, // 食材碳足迹占比
        cookingEnergy: baseCarbonFootprint * 0.2, // 烹饪能源占比
        packaging: baseCarbonFootprint * 0.1, // 包装占比
        other: 0
      },
      
      // 餐食类型和用能方式（需要餐厅填写，这里设置默认值）
      mealType: customFields.mealType || 'meat_simple',
      energyType: customFields.energyType || 'electric',
      restaurantRegion: restaurantRegion,
      
      // 基准值信息（初始化）
      baselineInfo: null,
      
      // 优化标识（初始化）
      optimizationFlag: {
        needsOptimization: false,
        warningMessage: null
      },
      
      // 计算时间
      calculatedAt: new Date(),
      
      // 标签（从菜谱复制，如果有）
      tags: customFields.tags || recipe.tags || {
        dietTypes: [],
        healthBenefits: [],
        suitableBodyTypes: [],
        solarTerms: [],
        occasions: [],
        specialTags: []
      },
      
      // 可用性（默认可用）
      availability: {
        isAvailable: customFields.isAvailable !== undefined ? customFields.isAvailable : true
      },
      
      // 销售数据（初始化）
      salesData: {
        totalSales: 0,
        monthSales: 0,
        rating: 0,
        reviewCount: 0
      },
      
      // 关联字段
      baseRecipeId: recipeId, // 关键：关联基础菜谱
      
      // 系统字段
      restaurantId: restaurantId,
      tenantId: tenantId,
      status: customFields.status || 'available',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // 7. 检查是否已存在相同的菜单项（基于 baseRecipeId 和 restaurantId）
    const existingItem = await db.collection('restaurant_menu_items')
      .where({
        baseRecipeId: recipeId,
        restaurantId: restaurantId
      })
      .get()

    if (existingItem.data && existingItem.data.length > 0) {
      return {
        code: 409,
        message: '该菜谱已添加到菜单中',
        data: {
          existingMenuItemId: existingItem.data[0]._id
        }
      }
    }

    // 8. 创建菜单项
    const result = await db.collection('restaurant_menu_items').add({
      data: menuItemData
    })

    console.log(`成功从基础菜谱创建菜单项: recipeId=${recipeId}, restaurantId=${restaurantId}, menuItemId=${result._id}`)

    return {
      code: 0,
      message: '菜单项创建成功',
      data: {
        _id: result._id,
        ...menuItemData
      }
    }
  } catch (error) {
    console.error('从基础菜谱创建菜单项失败:', error)
    return {
      code: 500,
      message: '创建菜单项失败',
      error: error.message
    }
  }
}

/**
 * 查询已添加到菜单的基础菜谱ID列表
 * @param {Object} data - 查询参数 { restaurantId }
 */
async function getAddedBaseRecipeIds(data) {
  const { restaurantId } = data || {}

  if (!restaurantId) {
    return {
      code: 400,
      message: '餐厅ID不能为空'
    }
  }

  try {
    // 查询 restaurant_menu_items 集合，找出所有 baseRecipeId 不为空且 restaurantId 匹配的菜单项
    const menuItemsResult = await db.collection('restaurant_menu_items')
      .where({
        restaurantId: restaurantId,
        baseRecipeId: _.neq(null) // baseRecipeId 不为空
      })
      .field({
        baseRecipeId: true,
        _id: false
      })
      .get()

    // 提取所有 baseRecipeId，去重
    const baseRecipeIds = [...new Set(
      (menuItemsResult.data || [])
        .map(item => item.baseRecipeId)
        .filter(id => id) // 过滤掉空值
    )]

    return {
      code: 0,
      message: '查询成功',
      data: {
        baseRecipeIds: baseRecipeIds
      }
    }
  } catch (error) {
    console.error('查询已添加到菜单的基础菜谱ID列表失败:', error)
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}

/**
 * 从餐厅菜单中移出基础菜谱
 * @param {Object} data - 参数 { recipeId, restaurantId }
 * @param {Object} user - 当前用户
 * @param {Object} context - 上下文
 */
async function removeRecipeFromMenu(data, user, context) {
  const { recipeId, restaurantId } = data || {}

  if (!recipeId) {
    return {
      code: 400,
      message: '菜谱ID不能为空'
    }
  }

  if (!restaurantId) {
    return {
      code: 400,
      message: '餐厅ID不能为空'
    }
  }

  try {
    // 查找对应的菜单项
    const menuItemsResult = await db.collection('restaurant_menu_items')
      .where({
        baseRecipeId: recipeId,
        restaurantId: restaurantId
      })
      .get()

    if (!menuItemsResult.data || menuItemsResult.data.length === 0) {
      return {
        code: 404,
        message: '该菜谱未添加到菜单中'
      }
    }

    // 删除所有匹配的菜单项（理论上应该只有一个）
    const deletePromises = menuItemsResult.data.map(item => 
      db.collection('restaurant_menu_items').doc(item._id).remove()
    )
    await Promise.all(deletePromises)

    // 记录操作日志
    await addAudit(db, {
      module: 'tenant',
      action: 'removeRecipeFromMenu',
      resource: 'restaurant_menu_item',
      resourceId: recipeId,
      description: `从餐厅菜单中移出基础菜谱 ${recipeId}`,
      restaurantId: restaurantId,
      status: 'success',
      ip: context.requestIp || '',
      userAgent: context.userAgent || '',
    })

    return {
      code: 0,
      message: '已成功从菜单中移出',
      data: {
        removedCount: menuItemsResult.data.length
      }
    }
  } catch (error) {
    console.error('从菜单中移出菜谱失败:', error)
    return {
      code: 500,
      message: '移出失败',
      error: error.message
    }
  }
}

/**
 * 更新餐厅菜单项
 * @param {Object} data - 参数 { menuItemId, restaurantId, updateData }
 * @param {Object} user - 当前用户
 * @param {Object} context - 上下文
 */
async function updateMenuItem(data, user, context) {
  const { menuItemId, restaurantId, updateData = {} } = data || {}

  if (!menuItemId) {
    return {
      code: 400,
      message: '菜单项ID不能为空'
    }
  }

  if (!restaurantId) {
    return {
      code: 400,
      message: '餐厅ID不能为空'
    }
  }

  try {
    // 1. 验证菜单项是否存在且属于该餐厅
    const menuItemResult = await db.collection('restaurant_menu_items').doc(menuItemId).get()
    if (!menuItemResult.data) {
      return {
        code: 404,
        message: '菜单项不存在'
      }
    }

    const menuItem = menuItemResult.data
    if (menuItem.restaurantId !== restaurantId) {
      return {
        code: 403,
        message: '无权修改其他餐厅的菜单项'
      }
    }

    // 2. 构建更新数据（只更新允许的字段）
    const allowedFields = [
      'name',
      'description',
      'price',
      'category',
      'status',
      'tags'
    ]
    
    const updateFields = {}
    
    // 更新基础字段
    if (updateData.name !== undefined) {
      updateFields.name = updateData.name
    }
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description
    }
    if (updateData.price !== undefined) {
      updateFields.price = Number(updateData.price) || 0
    }
    if (updateData.category !== undefined) {
      updateFields.category = updateData.category
    }
    if (updateData.status !== undefined) {
      updateFields.status = updateData.status
    }
    if (updateData.tags !== undefined) {
      updateFields.tags = updateData.tags
    }

    // 更新可用性（通过availability字段）
    if (updateData.isAvailable !== undefined) {
      updateFields['availability.isAvailable'] = Boolean(updateData.isAvailable)
    }

    // 更新营养信息（如果提供）
    if (updateData.nutrition !== undefined) {
      updateFields.nutrition = updateData.nutrition
    }

    // 添加更新时间
    updateFields.updatedAt = db.serverDate()

    // 3. 执行更新
    await db.collection('restaurant_menu_items').doc(menuItemId).update({
      data: updateFields
    })

    // 4. 记录操作日志
    await addAudit(db, {
      module: 'tenant',
      action: 'updateMenuItem',
      resource: 'restaurant_menu_item',
      resourceId: menuItemId,
      description: `更新餐厅菜单项 ${menuItem.name || menuItemId}`,
      restaurantId: restaurantId,
      status: 'success',
      ip: context.requestIp || '',
      userAgent: context.userAgent || '',
    })

    // 5. 获取更新后的数据
    const updatedResult = await db.collection('restaurant_menu_items').doc(menuItemId).get()

    return {
      code: 0,
      message: '更新成功',
      data: updatedResult.data
    }
  } catch (error) {
    console.error('更新菜单项失败:', error)
    return {
      code: 500,
      message: '更新失败',
      error: error.message
    }
  }
}

/**
 * 获取数据看板统计数据
 * @param {Object} data - 查询参数 { restaurantId, tenantId }
 * @param {Object} currentUser - 当前登录用户信息
 */
async function getDashboard(data, currentUser) {
  const { restaurantId, tenantId, includeTopRecipes, includeTrends, startDate, endDate } = data || {}
  const userRole = currentUser?.role || ''

  // 构建查询条件
  const recipeQuery = {}
  const orderQuery = {}
  const restaurantQuery = {}

  // 平台运营角色或系统管理员：查看所有数据，不区分租户
  const isPlatformOperator = userRole === 'platform_operator' || userRole === 'system_admin'
  
  if (isPlatformOperator) {
    // 平台运营角色：不应用任何过滤，返回全平台数据
    // recipeQuery, orderQuery, restaurantQuery 保持为空对象
  } else {
    // 其他角色（如 restaurant_admin）：根据租户/餐厅过滤数据
    
    // 如果指定了餐厅ID，只查询该餐厅的数据
    if (restaurantId) {
      recipeQuery.restaurantId = restaurantId
      orderQuery.restaurantId = restaurantId
    }

    // 如果指定了租户ID，查询该租户下的数据
    // 如果没有指定租户ID，但用户有 tenantId，使用用户的 tenantId
    const targetTenantId = tenantId || currentUser?.tenantId
    
    if (targetTenantId) {
      restaurantQuery.tenantId = targetTenantId
      // 租户下的餐厅ID列表（用于查询订单和菜谱）
      const restaurantsRes = await db
        .collection('restaurants')
        .where({ tenantId: targetTenantId })
        .field({ _id: 1 })
        .get()
      
      const restaurantIds = restaurantsRes.data.map((r) => r._id)
      
      if (restaurantIds.length > 0) {
        if (!restaurantId) {
          // 如果没有指定具体餐厅，则查询租户下所有餐厅
          // 菜谱可能使用 restaurantId 或 tenantId 字段，需要同时查询
          // 使用 _.or() 构建复合查询条件
          // 注意：recipeQuery是const，不能直接赋值，需要使用db.command.or()
          Object.assign(recipeQuery, _.or([
            { restaurantId: _.in(restaurantIds) },
            { tenantId: _.in(restaurantIds) },
            { tenantId: targetTenantId } // 也支持直接使用租户ID
          ]))
          orderQuery.restaurantId = _.in(restaurantIds)
        }
      } else {
        // 租户下没有餐厅，返回空数据
        return {
          code: 0,
          data: {
            totalRecipes: 0,
            totalCarbonReduction: 0,
            certifiedRestaurants: 0,
            activeUsers: 0,
            todayOrders: 0,
            todayRevenue: 0,
          },
        }
      }
    } else {
      // 既没有指定租户ID，用户也没有 tenantId，返回空数据
      return {
        code: 0,
        data: {
          totalRecipes: 0,
          totalCarbonReduction: 0,
          certifiedRestaurants: 0,
          activeUsers: 0,
          todayOrders: 0,
          todayRevenue: 0,
        },
      }
    }
  }

  // 1. 统计总菜谱数
  let totalRecipes = 0
  try {
    // 如果查询条件为空对象，查询所有数据
    if (Object.keys(recipeQuery).length > 0) {
      const recipesRes = await db.collection('recipes').where(recipeQuery).count()
      totalRecipes = recipesRes.total || 0
    } else {
      // 平台运营角色：查询所有菜谱
      const recipesRes = await db.collection('recipes').count()
      totalRecipes = recipesRes.total || 0
    }
  } catch (error) {
    console.error('统计菜谱数失败:', error)
    // 如果查询失败，尝试更简单的查询方式
    try {
      if (Object.keys(recipeQuery).length > 0) {
        // 如果使用复杂查询失败，尝试分别查询 restaurantId 和 tenantId
        const allRecipes = await db.collection('recipes')
          .where(_.or([
            { restaurantId: recipeQuery.restaurantId || recipeQuery.tenantId },
            { tenantId: recipeQuery.tenantId || recipeQuery.restaurantId }
          ]))
          .get()
        totalRecipes = allRecipes.data.length
      }
    } catch (fallbackError) {
      console.error('菜谱查询备用方法也失败:', fallbackError)
    }
  }

  // 2. 统计总碳减排量（从 restaurant_orders 集合）
  let totalCarbonReduction = 0
  try {
    // 如果查询条件为空对象，查询所有数据
    const ordersQueryObj = Object.keys(orderQuery).length > 0
      ? db.collection('restaurant_orders').where(orderQuery)
      : db.collection('restaurant_orders')
    const ordersRes = await ordersQueryObj
      .field({
        'carbonImpact.carbonSavingsVsMeat': 1,
      })
      .get()

    totalCarbonReduction = ordersRes.data.reduce((sum, order) => {
      const reduction = order.carbonImpact?.carbonSavingsVsMeat || 0
      return sum + reduction
    }, 0)
  } catch (error) {
    console.error('统计碳减排量失败:', error)
    // 如果 restaurant_orders 不存在，尝试从 meals 集合统计
    try {
      const mealsQuery = {}
      if (restaurantId) {
        mealsQuery['restaurant.restaurantId'] = restaurantId
      }
      const mealsRes = await db
        .collection('meals')
        .where(mealsQuery)
        .field({
          'comparedToMeat.reduction': 1,
        })
        .get()

      totalCarbonReduction = mealsRes.data.reduce((sum, meal) => {
        const reduction = meal.comparedToMeat?.reduction || 0
        return sum + reduction
      }, 0)
    } catch (mealsError) {
      console.error('从 meals 统计碳减排量失败:', mealsError)
    }
  }

  // 3. 统计认证餐厅数
  let certifiedRestaurants = 0
  try {
    // 构建查询条件：先查询所有符合条件的餐厅，然后在代码中过滤认证餐厅
    // 这样可以避免复杂的 MongoDB 查询语法问题
    let baseQuery = {}
    if (Object.keys(restaurantQuery).length > 0) {
      baseQuery = { ...restaurantQuery }
    }
    
    // 查询所有餐厅（根据租户条件）
    const allRestaurants = Object.keys(baseQuery).length > 0
      ? await db.collection('restaurants').where(baseQuery).get()
      : await db.collection('restaurants').get()
    
    // 在代码中过滤认证餐厅：certificationLevel 存在且不为空
    certifiedRestaurants = allRestaurants.data.filter(r => 
      r.certificationLevel && 
      r.certificationLevel !== null && 
      r.certificationLevel !== '' &&
      r.certificationLevel !== undefined
    ).length
  } catch (error) {
    console.error('统计认证餐厅数失败:', error)
  }

  // 4. 统计活跃用户数（最近30天有活动的用户）
  let activeUsers = 0
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // 如果指定了餐厅，查询该餐厅的订单用户
    if (restaurantId && !isPlatformOperator) {
      const activeUserIds = await db
        .collection('restaurant_orders')
        .where({
          restaurantId,
          createdAt: _.gte(thirtyDaysAgo),
        })
        .field({ userId: 1 })
        .get()
      
      const uniqueUserIds = [...new Set(activeUserIds.data.map((o) => o.userId).filter(Boolean))]
      activeUsers = uniqueUserIds.length
    } else {
      // 平台运营角色或未指定餐厅：查询所有最近30天有活动的用户
      const activeUsersRes = await db
        .collection('users')
        .where({
          lastLoginAt: _.gte(thirtyDaysAgo),
        })
        .count()
      activeUsers = activeUsersRes.total || 0
    }
  } catch (error) {
    console.error('统计活跃用户数失败:', error)
  }

  // 5. 统计今日订单数和营收
  let todayOrders = 0
  let todayRevenue = 0
  
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayOrderQuery = {
      ...orderQuery,
      createdAt: _.gte(today).and(_.lt(tomorrow)),
    }
    
    // 如果 orderQuery 为空，只使用日期条件
    const todayQueryObj = Object.keys(orderQuery).length > 0
      ? db.collection('restaurant_orders').where(todayOrderQuery)
      : db.collection('restaurant_orders').where({
          createdAt: _.gte(today).and(_.lt(tomorrow)),
        })

    const todayOrdersRes = await todayQueryObj
      .field({
        'pricing.total': 1,
      })
      .get()

    todayOrders = todayOrdersRes.data.length
    todayRevenue = todayOrdersRes.data.reduce((sum, order) => {
      const total = order.pricing?.total || 0
      return sum + total
    }, 0)
  } catch (error) {
    console.error('统计今日订单失败:', error)
  }

  // 6. 获取趋势数据（订单趋势和碳减排趋势）
  let trends = null
  if (includeTrends && startDate && endDate) {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      
      // 构建订单查询条件
      // 注意：如果orderQuery.createdAt已经是db.command对象，不能直接赋值，需要重新构建
      const trendsOrderQuery = {}
      
      // 复制orderQuery的其他字段（除了createdAt）
      Object.keys(orderQuery).forEach(key => {
        if (key !== 'createdAt') {
          trendsOrderQuery[key] = orderQuery[key]
        }
      })
      
      // 构建新的createdAt条件，结合原有的时间范围和新的日期范围
      if (orderQuery.createdAt) {
        // 如果已有createdAt条件，需要合并（这里简化处理，只使用新的日期范围）
        trendsOrderQuery.createdAt = _.gte(start).and(_.lte(end))
      } else {
        trendsOrderQuery.createdAt = _.gte(start).and(_.lte(end))
      }
      
      // 查询订单数据
      const trendsOrdersQueryObj = Object.keys(trendsOrderQuery).length > 0
        ? db.collection('restaurant_orders').where(trendsOrderQuery)
        : db.collection('restaurant_orders').where({
            createdAt: _.gte(start).and(_.lte(end))
          })
      
      const trendsOrdersRes = await trendsOrdersQueryObj
        .field({
          'createdAt': 1,
          'pricing.total': 1,
          'carbonImpact.carbonSavingsVsMeat': 1,
        })
        .get()
      
      // 按日期分组统计
      const ordersByDate = new Map()
      const revenueByDate = new Map()
      const carbonByDate = new Map()
      
      trendsOrdersRes.data.forEach(order => {
        if (order.createdAt) {
          const date = new Date(order.createdAt).toISOString().split('T')[0] // YYYY-MM-DD格式
          
          // 订单数统计
          if (!ordersByDate.has(date)) {
            ordersByDate.set(date, 0)
          }
          ordersByDate.set(date, ordersByDate.get(date) + 1)
          
          // 收入统计
          const revenue = order.pricing?.total || 0
          if (!revenueByDate.has(date)) {
            revenueByDate.set(date, 0)
          }
          revenueByDate.set(date, revenueByDate.get(date) + revenue)
          
          // 碳减排统计
          const carbonReduction = order.carbonImpact?.carbonSavingsVsMeat || 0
          if (!carbonByDate.has(date)) {
            carbonByDate.set(date, 0)
          }
          carbonByDate.set(date, carbonByDate.get(date) + carbonReduction)
        }
      })
      
      // 生成日期范围内的所有日期（填充没有订单的日期为0）
      const allDates = []
      const currentDate = new Date(start)
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0]
        allDates.push(dateStr)
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // 构建趋势数据
      trends = {
        orders: allDates.map(date => ({
          date,
          count: ordersByDate.get(date) || 0,
        })),
        revenue: allDates.map(date => ({
          date,
          amount: Math.round((revenueByDate.get(date) || 0) * 100) / 100,
        })),
        carbonReduction: allDates.map(date => ({
          date,
          amount: Math.round((carbonByDate.get(date) || 0) * 100) / 100,
        })),
      }
    } catch (error) {
      console.error('[趋势数据] 获取趋势数据失败:', error)
      trends = null
    }
  }

  // 7. 获取热门菜谱排行榜（Top 10）
  let topRecipes = []
  if (includeTopRecipes && startDate && endDate) {
    try {
      // 构建订单查询条件（用于统计菜谱订单数）
      const recipeOrderQuery = { ...orderQuery }
      
      // 如果指定了时间范围，添加时间筛选
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // 包含结束日期的整天
      
      if (recipeOrderQuery.createdAt) {
        // 如果已有时间条件，需要合并
        recipeOrderQuery.createdAt = _.and(
          recipeOrderQuery.createdAt,
          _.gte(start).and(_.lte(end))
        )
      } else {
        recipeOrderQuery.createdAt = _.gte(start).and(_.lte(end))
      }
      
      // 查询订单数据，统计每个菜谱的订单数、收入、碳减排量
      const ordersQueryObj = Object.keys(recipeOrderQuery).length > 0
        ? db.collection('restaurant_orders').where(recipeOrderQuery)
        : db.collection('restaurant_orders')
      
      const ordersRes = await ordersQueryObj
        .field({
          'items': 1,
          'pricing.total': 1,
          'carbonImpact.carbonSavingsVsMeat': 1,
        })
        .get()
      
      // 统计每个菜谱的数据
      const recipeStats = {}
      
      ordersRes.data.forEach((order) => {
        const items = order.items || []
        const orderTotal = order.pricing?.total || 0
        const carbonReduction = order.carbonImpact?.carbonSavingsVsMeat || 0
        
        items.forEach(item => {
          // 优先使用 recipeId，如果不存在，则尝试 menuItemId，最后尝试 menuItemName
          let currentRecipeId = item.recipeId || item.recipe_id || item.id || item.menuItemId || item.menuItemName
          let currentRecipeName = item.name || item.recipeName || item.recipe_name || item.menuItemName || '未知菜谱'
          
          const quantity = item.quantity || 1
          const itemPrice = item.unitPrice || item.price || (orderTotal / items.length)
          const itemCarbonReduction = item.carbonFootprint || (carbonReduction / items.length)
          
          if (currentRecipeId) {
            if (!recipeStats[currentRecipeId]) {
              recipeStats[currentRecipeId] = {
                recipeId: currentRecipeId,
                recipeName: currentRecipeName,
                orders: 0,
                revenue: 0,
                carbonReduction: 0,
              }
            }
            
            recipeStats[currentRecipeId].orders += quantity
            recipeStats[currentRecipeId].revenue += itemPrice * quantity
            recipeStats[currentRecipeId].carbonReduction += itemCarbonReduction * quantity
          }
        })
      })
      
      // 转换为数组并按订单数排序，取前10名
      topRecipes = Object.values(recipeStats)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10)
        .map((recipe) => ({
          recipeId: recipe.recipeId,
          recipeName: recipe.recipeName,
          orders: recipe.orders,
          revenue: Math.round(recipe.revenue * 100) / 100,
          carbonReduction: Math.round(recipe.carbonReduction * 100) / 100,
        }))
    } catch (error) {
      console.error('[热门菜谱] 获取热门菜谱排行榜失败:', error)
      topRecipes = []
    }
  }

  const result = {
    code: 0,
    data: {
      totalRecipes,
      totalCarbonReduction: Math.round(totalCarbonReduction * 100) / 100, // 保留2位小数
      certifiedRestaurants,
      activeUsers,
      todayOrders,
      todayRevenue: Math.round(todayRevenue * 100) / 100, // 保留2位小数
    },
  }
  
  // 如果请求了热门菜谱数据，添加到返回结果中
  if (includeTopRecipes) {
    result.data.topRecipes = topRecipes
  }
  
  // 如果请求了趋势数据，添加到返回结果中
  if (includeTrends && trends) {
    result.data.trends = trends
  }
  
  return result
}

/**
 * 获取数据看板数据（扩展版）
 * 根据策划方案，返回关键指标、趋势数据、图表数据
 */
async function getDashboardData(data, currentUser) {
  const { restaurantId, tenantId, dateRange, metrics } = data || {}
  
  try {
    // 1. 获取基础看板数据
    const dashboardResult = await getDashboard({
      restaurantId,
      tenantId,
      includeTopRecipes: true,
      includeTrends: true,
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
    }, currentUser)

    if (dashboardResult.code !== 0) {
      return dashboardResult
    }

    const baseData = dashboardResult.data

    // 2. 构建关键指标
    const keyMetrics = {
      todayOrders: baseData.todayOrders || 0,
      todayRevenue: baseData.todayRevenue || 0,
      todayCarbonReduction: 0, // 需要从订单数据计算今日碳减排
      totalRecipes: baseData.totalRecipes || 0,
      totalCarbonReduction: baseData.totalCarbonReduction || 0,
      certifiedRestaurants: baseData.certifiedRestaurants || 0,
      activeUsers: baseData.activeUsers || 0,
    }

    // 3. 计算今日碳减排（从订单数据）
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const orderQuery: any = {}
      if (restaurantId) {
        orderQuery.restaurantId = restaurantId
      }

      const todayOrdersRes = await db.collection('restaurant_orders')
        .where({
          ...orderQuery,
          createdAt: _.gte(today).and(_.lt(tomorrow)),
        })
        .field({
          'carbonImpact.carbonSavingsVsMeat': 1,
        })
        .get()

      keyMetrics.todayCarbonReduction = todayOrdersRes.data.reduce((sum, order) => {
        const reduction = order.carbonImpact?.carbonSavingsVsMeat || 0
        return sum + reduction
      }, 0)
    } catch (error) {
      console.error('计算今日碳减排失败:', error)
    }

    // 4. 构建趋势数据
    const trends = baseData.trends || []

    // 5. 构建图表数据
    const charts = []
    
    // 订单趋势图
    if (trends.length > 0) {
      charts.push({
        type: 'line',
        title: '订单趋势',
        data: trends.map((t: any) => ({
          date: t.date,
          value: t.orderCount,
          type: '订单数',
        })),
      })

      // 收入趋势图
      charts.push({
        type: 'line',
        title: '收入趋势',
        data: trends.map((t: any) => ({
          date: t.date,
          value: t.revenue,
          type: '收入',
        })),
      })

      // 碳减排趋势图
      charts.push({
        type: 'line',
        title: '碳减排趋势',
        data: trends.map((t: any) => ({
          date: t.date,
          value: t.carbonReduction,
          type: '碳减排',
        })),
      })
    }

    // 热门菜谱图表
    if (baseData.topRecipes && baseData.topRecipes.length > 0) {
      charts.push({
        type: 'bar',
        title: '热门菜谱',
        data: baseData.topRecipes.map((recipe: any) => ({
          name: recipe.recipeName,
          value: recipe.orders,
        })),
      })
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        keyMetrics,
        trends,
        charts,
        topRecipes: baseData.topRecipes || [],
      },
    }
  } catch (error) {
    console.error('获取数据看板数据失败:', error)
    return {
      code: 500,
      message: '获取数据看板数据失败',
      error: error.message,
    }
  }
}

/**
 * 平台管理：获取所有餐厅列表（跨租户）
 * 支持搜索、筛选、分页
 */
async function listAllRestaurants(params, user) {
  const {
    keyword = '',
    status = '',
    certificationLevel = '',
    tenantId = '',
    page = 1,
    pageSize = 10,
  } = params

  try {
    // 构建查询条件
    let query = db.collection('restaurants')

    // 构建where条件
    const whereConditions = {}

    // 状态筛选
    if (status) {
      whereConditions.status = status
    }

    // 租户筛选
    if (tenantId) {
      whereConditions.tenantId = tenantId
    }

    // 认证等级筛选
    if (certificationLevel) {
      whereConditions.certificationLevel = certificationLevel
    }

    // 关键词搜索（餐厅名称、负责人）
    if (keyword) {
      // 使用正则表达式进行模糊搜索
      whereConditions.name = db.RegExp({
        regexp: keyword,
        options: 'i', // 不区分大小写
      })
    }

    // 应用所有筛选条件
    if (Object.keys(whereConditions).length > 0) {
      query = query.where(whereConditions)
    } else {
      // 如果没有筛选条件，查询所有餐厅
      query = query.where({})
    }

    // 获取总数
    const countResult = await query.count()
    const total = countResult.total || 0

    // 分页查询
    const skip = (page - 1) * pageSize
    const restaurantsResult = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    const restaurants = restaurantsResult.data || []

    // 为每个餐厅聚合统计数据
    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const restaurantId = restaurant._id

        // 查询订单统计数据
        let totalOrders = 0
        let totalRevenue = 0
        let totalCarbonReduction = 0

        try {
          // 查询该餐厅的所有订单（仅获取必要字段）
          const ordersResult = await db
            .collection('restaurant_orders')
            .where({
              restaurantId: restaurantId,
            })
            .field({
              'pricing.total': true,
              'carbonFootprint.reduction': true,
            })
            .get()

          const orders = ordersResult.data || []
          totalOrders = orders.length
          totalRevenue = orders.reduce((sum, order) => {
            return sum + (order.pricing?.total || 0)
          }, 0)
          totalCarbonReduction = orders.reduce((sum, order) => {
            return sum + (order.carbonFootprint?.reduction || 0)
          }, 0)
        } catch (error) {
          console.error(`获取餐厅 ${restaurantId} 统计数据失败:`, error)
        }

        // 获取负责人信息（从租户信息中获取）
        let owner = ''
        let ownerPhone = ''
        try {
          if (restaurant.tenantId) {
            const tenantResult = await db
              .collection('tenants')
              .doc(restaurant.tenantId)
              .get()
            if (tenantResult.data) {
              owner = tenantResult.data.contactName || ''
              ownerPhone = tenantResult.data.contactPhone || ''
            }
          }
        } catch (error) {
          console.error(`获取租户信息失败:`, error)
        }

        return {
          id: restaurant._id,
          _id: restaurant._id,
          name: restaurant.name || '',
          owner: owner || restaurant.contactName || '',
          phone: restaurant.phone || ownerPhone || '',
          email: restaurant.email || '',
          address: restaurant.address || '',
          status: restaurant.status || 'inactive',
          certificationLevel: restaurant.certificationLevel || null,
          tenantId: restaurant.tenantId || '',
          createdAt: restaurant.createdAt
            ? new Date(restaurant.createdAt).toISOString().split('T')[0]
            : '',
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          carbonReduction: Math.round(totalCarbonReduction * 100) / 100,
        }
      })
    )

    return {
      code: 0,
      message: '获取成功',
      data: {
        list: restaurantsWithStats,
        total,
        page,
        pageSize,
      },
    }
  } catch (error) {
    console.error('获取餐厅列表失败:', error)
    return {
      code: -1,
      message: error.message || '获取餐厅列表失败',
      data: {
        list: [],
        total: 0,
        page,
        pageSize,
      },
    }
  }
}

/**
 * 平台管理：更新餐厅状态
 */
async function updateRestaurantStatus(restaurantId, status, user, context) {
  if (!restaurantId) {
    return {
      code: 400,
      message: '餐厅ID不能为空',
    }
  }

  const validStatuses = ['active', 'inactive', 'pending', 'suspended']
  if (!validStatuses.includes(status)) {
    return {
      code: 400,
      message: '无效的状态值',
    }
  }

  try {
    // 检查餐厅是否存在
    const restaurantResult = await db.collection('restaurants').doc(restaurantId).get()
    if (!restaurantResult.data) {
      return {
        code: 404,
        message: '餐厅不存在',
      }
    }

    const oldStatus = restaurantResult.data.status

    // 更新状态
    await db.collection('restaurants').doc(restaurantId).update({
      data: {
        status: status,
        updatedAt: db.serverDate(),
      },
    })

    // 记录审计日志
    const { addAudit } = require('./audit')
    await addAudit({
      userId: user._id,
      username: user.username,
      role: user.role,
      action: 'update_restaurant_status',
      resource: 'restaurant',
      resourceId: restaurantId,
      description: `更新餐厅状态: ${oldStatus} -> ${status}`,
      ip: context.requestIp || '',
      userAgent: context.userAgent || '',
      tenantId: restaurantResult.data.tenantId || null,
      status: 'success',
      createdAt: new Date(),
    })

    return {
      code: 0,
      message: '更新成功',
      data: {
        restaurantId,
        status,
      },
    }
  } catch (error) {
    console.error('更新餐厅状态失败:', error)
    return {
      code: -1,
      message: error.message || '更新餐厅状态失败',
    }
  }
}

/**
 * 平台管理：更新餐厅认证等级
 */
async function updateRestaurantCertification(restaurantId, certificationLevel, user, context) {
  if (!restaurantId) {
    return {
      code: 400,
      message: '餐厅ID不能为空',
    }
  }

  const validLevels = ['bronze', 'silver', 'gold', 'platinum', null]
  if (!validLevels.includes(certificationLevel)) {
    return {
      code: 400,
      message: '无效的认证等级',
    }
  }

  try {
    // 检查餐厅是否存在
    const restaurantResult = await db.collection('restaurants').doc(restaurantId).get()
    if (!restaurantResult.data) {
      return {
        code: 404,
        message: '餐厅不存在',
      }
    }

    const oldLevel = restaurantResult.data.certificationLevel

    // 更新认证等级
    const updateData = {
      certificationLevel: certificationLevel,
      updatedAt: db.serverDate(),
    }

    // 如果设置认证等级，同时更新认证状态
    if (certificationLevel) {
      updateData.certificationStatus = 'certified'
      updateData.certifiedDate = db.serverDate()
    } else {
      updateData.certificationStatus = 'none'
    }

    await db.collection('restaurants').doc(restaurantId).update({
      data: updateData,
    })

    // 记录审计日志
    const { addAudit } = require('./audit')
    await addAudit({
      userId: user._id,
      username: user.username,
      role: user.role,
      action: 'update_restaurant_certification',
      resource: 'restaurant',
      resourceId: restaurantId,
      description: `更新餐厅认证等级: ${oldLevel || '未认证'} -> ${certificationLevel || '未认证'}`,
      ip: context.requestIp || '',
      userAgent: context.userAgent || '',
      tenantId: restaurantResult.data.tenantId || null,
      status: 'success',
      createdAt: new Date(),
    })

    return {
      code: 0,
      message: '更新成功',
      data: {
        restaurantId,
        certificationLevel,
      },
    }
  } catch (error) {
    console.error('更新餐厅认证等级失败:', error)
    return {
      code: -1,
      message: error.message || '更新餐厅认证等级失败',
    }
  }
}

/**
 * 平台管理：获取跨租户数据
 * 支持多租户数据聚合、时间范围筛选、数据类型筛选
 */
async function getCrossTenantData(params, user) {
  const {
    tenantIds = [],
    dataType = 'all',
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
    groupBy = 'tenant',
  } = params

  try {
    const _ = db.command

    // 1. 获取租户列表
    let tenantsQuery = db.collection('tenants')
    if (tenantIds.length > 0) {
      tenantsQuery = tenantsQuery.where({
        _id: _.in(tenantIds),
      })
    }
    const tenantsResult = await tenantsQuery.get()
    const tenants = tenantsResult.data || []

    if (tenants.length === 0) {
      return {
        code: 0,
        message: '获取成功',
        data: {
          summary: {
            totalTenants: 0,
            totalOrders: 0,
            totalRevenue: 0,
            totalCarbonReduction: 0,
            totalUsers: 0,
          },
          tenants: [],
          trends: {
            orders: [],
            revenue: [],
            carbonReduction: [],
          },
          total: 0,
          page,
          pageSize,
        },
      }
    }

    const tenantIdList = tenants.map(t => t._id)

    // 2. 获取这些租户下的所有餐厅
    const restaurantsResult = await db
      .collection('restaurants')
      .where({
        tenantId: _.in(tenantIdList),
      })
      .get()

    const restaurants = restaurantsResult.data || []
    const restaurantIds = restaurants.map(r => r._id)

    if (restaurantIds.length === 0) {
      return {
        code: 0,
        message: '获取成功',
        data: {
          summary: {
            totalTenants: tenants.length,
            totalOrders: 0,
            totalRevenue: 0,
            totalCarbonReduction: 0,
            totalUsers: 0,
          },
          tenants: tenants.map(t => ({
            tenantId: t._id,
            tenantName: t.name || t._id,
            restaurantCount: 0,
            restaurantIds: [],
            statistics: {
              orders: { total: 0, trend: [] },
              revenue: { total: 0, trend: [] },
              carbonReduction: { total: 0, trend: [] },
              users: { total: 0, active: 0 },
            },
          })),
          trends: {
            orders: [],
            revenue: [],
            carbonReduction: [],
          },
          total: tenants.length,
          page,
          pageSize,
        },
      }
    }

    // 3. 构建订单查询条件
    const orderQuery = {
      restaurantId: _.in(restaurantIds),
    }

    if (startDate || endDate) {
      const dateCondition = {}
      if (startDate) {
        dateCondition.createdAt = _.gte(new Date(startDate))
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        dateCondition.createdAt = dateCondition.createdAt
          ? dateCondition.createdAt.and(_.lte(endDateTime))
          : _.lte(endDateTime)
      }
      orderQuery.createdAt = dateCondition.createdAt
    }

    // 4. 查询订单数据
    const ordersResult = await db
      .collection('restaurant_orders')
      .where(orderQuery)
      .field({
        restaurantId: true,
        'pricing.total': true,
        'carbonFootprint.reduction': true,
        createdAt: true,
      })
      .get()

    const orders = ordersResult.data || []

    // 5. 按租户聚合数据
    const tenantDataMap = new Map()

    tenants.forEach(tenant => {
      const tenantRestaurants = restaurants.filter(r => r.tenantId === tenant._id)
      const tenantRestaurantIds = tenantRestaurants.map(r => r._id)
      const tenantOrders = orders.filter(o => tenantRestaurantIds.includes(o.restaurantId))

      const ordersTotal = tenantOrders.length
      const revenueTotal = tenantOrders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0)
      const carbonTotal = tenantOrders.reduce((sum, o) => sum + (o.carbonFootprint?.reduction || 0), 0)

      // 计算趋势数据（按日期分组）
      const ordersByDate = new Map()
      const revenueByDate = new Map()
      const carbonByDate = new Map()

      tenantOrders.forEach(order => {
        if (order.createdAt) {
          const date = new Date(order.createdAt).toISOString().split('T')[0]
          
          ordersByDate.set(date, (ordersByDate.get(date) || 0) + 1)
          revenueByDate.set(date, (revenueByDate.get(date) || 0) + (order.pricing?.total || 0))
          carbonByDate.set(date, (carbonByDate.get(date) || 0) + (order.carbonFootprint?.reduction || 0))
        }
      })

      const ordersTrend = Array.from(ordersByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const revenueTrend = Array.from(revenueByDate.entries())
        .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const carbonTrend = Array.from(carbonByDate.entries())
        .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date))

      tenantDataMap.set(tenant._id, {
        tenantId: tenant._id,
        tenantName: tenant.name || tenant._id,
        restaurantCount: tenantRestaurants.length,
        restaurantIds: tenantRestaurantIds,
        statistics: {
          orders: {
            total: ordersTotal,
            trend: ordersTrend,
          },
          revenue: {
            total: Math.round(revenueTotal * 100) / 100,
            trend: revenueTrend,
          },
          carbonReduction: {
            total: Math.round(carbonTotal * 100) / 100,
            trend: carbonTrend,
          },
          users: {
            total: 0, // 需要单独查询用户数据
            active: 0,
          },
        },
      })
    })

    // 6. 查询用户数据（如果需要）
    if (dataType === 'all' || dataType === 'user') {
      // 获取最近30天有订单的用户
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const activeUserIds = new Set()
      orders.forEach(order => {
        if (order.userId && new Date(order.createdAt) >= thirtyDaysAgo) {
          activeUserIds.add(order.userId)
        }
      })

      // 按租户统计用户
      tenantDataMap.forEach((data, tenantId) => {
        const tenantRestaurantIds = data.restaurantIds
        const tenantUserIds = new Set()
        orders.forEach(order => {
          if (tenantRestaurantIds.includes(order.restaurantId) && order.userId) {
            tenantUserIds.add(order.userId)
          }
        })
        data.statistics.users.total = tenantUserIds.size
        data.statistics.users.active = Array.from(tenantUserIds).filter(id => activeUserIds.has(id)).length
      })
    }

    // 7. 根据数据类型筛选
    let filteredTenants = Array.from(tenantDataMap.values())
    if (dataType !== 'all') {
      filteredTenants = filteredTenants.filter(tenant => {
        switch (dataType) {
          case 'order':
            return tenant.statistics.orders.total > 0
          case 'revenue':
            return tenant.statistics.revenue.total > 0
          case 'carbon':
            return tenant.statistics.carbonReduction.total > 0
          case 'user':
            return tenant.statistics.users.total > 0
          default:
            return true
        }
      })
    }

    // 8. 计算汇总数据
    const summary = {
      totalTenants: filteredTenants.length,
      totalOrders: filteredTenants.reduce((sum, t) => sum + t.statistics.orders.total, 0),
      totalRevenue: filteredTenants.reduce((sum, t) => sum + t.statistics.revenue.total, 0),
      totalCarbonReduction: filteredTenants.reduce((sum, t) => sum + t.statistics.carbonReduction.total, 0),
      totalUsers: filteredTenants.reduce((sum, t) => sum + t.statistics.users.total, 0),
    }

    // 9. 计算整体趋势（所有租户合并）
    const allOrdersByDate = new Map()
    const allRevenueByDate = new Map()
    const allCarbonByDate = new Map()

    orders.forEach(order => {
      if (order.createdAt) {
        const date = new Date(order.createdAt).toISOString().split('T')[0]
        
        allOrdersByDate.set(date, (allOrdersByDate.get(date) || 0) + 1)
        allRevenueByDate.set(date, (allRevenueByDate.get(date) || 0) + (order.pricing?.total || 0))
        allCarbonByDate.set(date, (allCarbonByDate.get(date) || 0) + (order.carbonFootprint?.reduction || 0))
      }
    })

    const trends = {
      orders: Array.from(allOrdersByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      revenue: Array.from(allRevenueByDate.entries())
        .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      carbonReduction: Array.from(allCarbonByDate.entries())
        .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }

    // 10. 分页
    const total = filteredTenants.length
    const skip = (page - 1) * pageSize
    const paginatedTenants = filteredTenants.slice(skip, skip + pageSize)

    return {
      code: 0,
      message: '获取成功',
      data: {
        summary,
        tenants: paginatedTenants,
        trends,
        total,
        page,
        pageSize,
      },
    }
  } catch (error) {
    console.error('获取跨租户数据失败:', error)
    return {
      code: -1,
      message: error.message || '获取跨租户数据失败',
      data: {
        summary: {
          totalTenants: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalCarbonReduction: 0,
          totalUsers: 0,
        },
        tenants: [],
        trends: {
          orders: [],
          revenue: [],
          carbonReduction: [],
        },
        total: 0,
        page: 1,
        pageSize: 20,
      },
    }
  }
}

/**
 * 平台管理：获取平台统计数据
 * 统计总餐厅数、订单数、收入、碳减排、用户数等
 */
async function getPlatformStatistics(params, user) {
  const {
    startDate,
    endDate,
    period = '30days',
    includeTrends = false,
  } = params

  try {
    const _ = db.command

    // 计算时间范围
    let startDateTime = null
    let endDateTime = null

    if (startDate && endDate) {
      startDateTime = new Date(startDate)
      startDateTime.setHours(0, 0, 0, 0)
      endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
    } else {
      // 根据 period 计算
      endDateTime = new Date()
      endDateTime.setHours(23, 59, 59, 999)
      startDateTime = new Date()
      
      switch (period) {
        case '7days':
          startDateTime.setDate(startDateTime.getDate() - 7)
          break
        case '30days':
          startDateTime.setDate(startDateTime.getDate() - 30)
          break
        case '90days':
          startDateTime.setDate(startDateTime.getDate() - 90)
          break
        default:
          startDateTime.setDate(startDateTime.getDate() - 30)
      }
      startDateTime.setHours(0, 0, 0, 0)
    }

    // 1. 统计餐厅数据
    const restaurantsResult = await db.collection('restaurants').get()
    const allRestaurants = restaurantsResult.data || []
    const totalRestaurants = allRestaurants.length
    const activeRestaurants = allRestaurants.filter(r => r.status === 'active').length

    // 2. 统计订单数据
    const orderQuery = {}
    if (startDateTime && endDateTime) {
      orderQuery.createdAt = _.and(_.gte(startDateTime), _.lte(endDateTime))
    }

    const ordersResult = await db
      .collection('restaurant_orders')
      .where(orderQuery)
      .field({
        'pricing.total': true,
        'carbonFootprint.reduction': true,
        createdAt: true,
      })
      .get()

    const orders = ordersResult.data || []
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0)
    const totalCarbonReduction = orders.reduce((sum, o) => sum + (o.carbonFootprint?.reduction || 0), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const averageCarbonPerOrder = totalOrders > 0 ? totalCarbonReduction / totalOrders : 0

    // 3. 统计用户数据（最近30天有订单的用户）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeUserIds = new Set()
    orders.forEach(order => {
      if (order.userId && new Date(order.createdAt) >= thirtyDaysAgo) {
        activeUserIds.add(order.userId)
      }
    })
    const totalUsers = activeUserIds.size

    // 4. 计算趋势数据（如果需要）
    let trends = null
    if (includeTrends && startDateTime && endDateTime) {
      const ordersByDate = new Map()
      
      orders.forEach(order => {
        if (order.createdAt) {
          const date = new Date(order.createdAt).toISOString().split('T')[0]
          const existing = ordersByDate.get(date) || { count: 0, revenue: 0, carbon: 0 }
          ordersByDate.set(date, {
            count: existing.count + 1,
            revenue: existing.revenue + (order.pricing?.total || 0),
            carbon: existing.carbon + (order.carbonFootprint?.reduction || 0),
          })
        }
      })

      const dates = Array.from(ordersByDate.keys()).sort()
      trends = {
        orders: dates.map(date => ({
          date,
          count: ordersByDate.get(date).count,
        })),
        revenue: dates.map(date => ({
          date,
          amount: Math.round(ordersByDate.get(date).revenue * 100) / 100,
        })),
        carbonReduction: dates.map(date => ({
          date,
          amount: Math.round(ordersByDate.get(date).carbon * 100) / 100,
        })),
      }
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        totalRestaurants,
        activeRestaurants,
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCarbonReduction: Math.round(totalCarbonReduction * 100) / 100,
        totalUsers,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        averageCarbonPerOrder: Math.round(averageCarbonPerOrder * 100) / 100,
        trends,
      },
    }
  } catch (error) {
    console.error('获取平台统计数据失败:', error)
    return {
      code: -1,
      message: error.message || '获取平台统计数据失败',
      data: {
        totalRestaurants: 0,
        activeRestaurants: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCarbonReduction: 0,
        totalUsers: 0,
        averageOrderValue: 0,
        averageCarbonPerOrder: 0,
        trends: null,
      },
    }
  }
}

/**
 * 平台管理：获取餐厅排行榜
 * 支持按订单数、收入、碳减排排序
 */
async function getTopRestaurants(params, user) {
  const {
    sortBy = 'orders',
    limit = 10,
    startDate,
    endDate,
  } = params

  try {
    const _ = db.command

    // 计算时间范围
    let startDateTime = null
    let endDateTime = null

    if (startDate && endDate) {
      startDateTime = new Date(startDate)
      startDateTime.setHours(0, 0, 0, 0)
      endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
    }

    // 获取所有餐厅
    const restaurantsResult = await db.collection('restaurants').get()
    const restaurants = restaurantsResult.data || []

    // 获取订单数据
    const orderQuery = {}
    if (startDateTime && endDateTime) {
      orderQuery.createdAt = _.and(_.gte(startDateTime), _.lte(endDateTime))
    }

    const ordersResult = await db
      .collection('restaurant_orders')
      .where(orderQuery)
      .field({
        restaurantId: true,
        'pricing.total': true,
        'carbonFootprint.reduction': true,
      })
      .get()

    const orders = ordersResult.data || []

    // 按餐厅聚合数据
    const restaurantStats = new Map()

    restaurants.forEach(restaurant => {
      restaurantStats.set(restaurant._id, {
        restaurantId: restaurant._id,
        restaurantName: restaurant.name || restaurant._id,
        tenantId: restaurant.tenantId || '',
        certificationLevel: restaurant.certificationLevel,
        orders: 0,
        revenue: 0,
        carbonReduction: 0,
      })
    })

    orders.forEach(order => {
      if (order.restaurantId && restaurantStats.has(order.restaurantId)) {
        const stats = restaurantStats.get(order.restaurantId)
        stats.orders += 1
        stats.revenue += order.pricing?.total || 0
        stats.carbonReduction += order.carbonFootprint?.reduction || 0
      }
    })

    // 转换为数组并排序
    let sortedRestaurants = Array.from(restaurantStats.values())

    switch (sortBy) {
      case 'orders':
        sortedRestaurants.sort((a, b) => b.orders - a.orders)
        break
      case 'revenue':
        sortedRestaurants.sort((a, b) => b.revenue - a.revenue)
        break
      case 'carbonReduction':
        sortedRestaurants.sort((a, b) => b.carbonReduction - a.carbonReduction)
        break
      default:
        sortedRestaurants.sort((a, b) => b.orders - a.orders)
    }

    // 限制数量
    const topRestaurants = sortedRestaurants.slice(0, limit).map(r => ({
      restaurantId: r.restaurantId,
      restaurantName: r.restaurantName,
      tenantId: r.tenantId,
      orders: r.orders,
      revenue: Math.round(r.revenue * 100) / 100,
      carbonReduction: Math.round(r.carbonReduction * 100) / 100,
      certificationLevel: r.certificationLevel,
    }))

    return {
      code: 0,
      message: '获取成功',
      data: topRestaurants,
    }
  } catch (error) {
    console.error('获取餐厅排行榜失败:', error)
    return {
      code: -1,
      message: error.message || '获取餐厅排行榜失败',
      data: [],
    }
  }
}

