const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
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

      case 'getRestaurants':
        // 获取租户下的餐厅列表
        return await getRestaurants(data.tenantId, data.restaurantId)

      case 'createTenant':
        // 创建租户
        return await createTenant(data)

      case 'createRestaurant':
        // 创建餐厅
        return await createRestaurant(data)

      case 'updateRestaurant':
        // 更新餐厅信息
        return await updateRestaurant(data.restaurantId, data)

      case 'getRestaurantData':
        // 根据restaurantId获取餐厅相关数据（菜单、订单等）
        return await getRestaurantData(data)

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
        {
          const gate = await requireSystemAdmin(event, context)
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

      case 'addXiaopingguo':
        // 添加"小苹果"租户
        const addScript = require('./add-xiaopingguo-tenant')
        return await addScript.main(event, context)

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
async function getAuditLogs(params = {}) {
  const { page = 1, pageSize = 20, username, action, status, module, tenantId } = params
  let query = db.collection('audit_logs')
  if (username) query = query.where({ username })
  if (action) query = query.where({ action })
  if (status) query = query.where({ status })
  if (module) query = query.where({ module })
  if (tenantId) query = query.where({ tenantId })
  const result = await query
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  return { code: 0, data: { list: result.data || [], page, pageSize } }
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
      success: true,
      data: {
        ...result.data,
        restaurants: restaurants.data || [],
      },
    }
  }
  return {
    success: false,
    error: '租户不存在',
  }
}

/**
 * 获取餐厅列表
 */
async function getRestaurants(tenantId, restaurantId) {
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
    success: true,
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

