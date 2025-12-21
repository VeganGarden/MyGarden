const jwt = require('jsonwebtoken')

// JWT密钥（应与admin-auth云函数保持一致）
const JWT_SECRET = process.env.JWT_SECRET || 'climate-restaurant-secret-key-change-in-production'

/**
 * 验证Token并返回用户信息
 * @param {string} token JWT Token
 * @param {object} db 数据库实例
 * @returns {Promise<object|null>} 用户信息或null
 */
async function verifyToken(token, db) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    // 从数据库获取最新用户信息（确保权限是最新的）
    const userResult = await db.collection('admin_users')
      .doc(decoded.userId)
      .get()

    if (!userResult.data || userResult.data.status !== 'active') {
      return null
    }

    return {
      ...decoded,
      ...userResult.data,
    }
  } catch (error) {
    // Token验证失败，静默返回null
    return null
  }
}

/**
 * 权限验证中间件
 * @param {object} event 云函数事件对象
 * @param {object} context 云函数上下文
 * @param {string} requiredPermission 所需权限（可选）
 * @param {string} resourceScope 资源范围: self, tenant, all (默认: self)
 * @returns {Promise<object>} 用户信息（包含权限上下文）
 */
async function checkPermission(event, context, requiredPermission = null, resourceScope = 'self') {
  const cloud = require('wx-server-sdk')
  const db = cloud.database()

  // 1. 获取Token（支持多种方式传递token）
  // 前端通过 cloudbase.ts 将 token 放在 payload.token 中，即 event.token
  const headerAuth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || ''
  const eventToken = event.token || (event.data && event.data.token) || ''
  const authHeader = headerAuth || eventToken || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    throw { code: 401, message: '未授权访问，请先登录' }
  }

  // 2. 验证Token
  const user = await verifyToken(token, db)
  if (!user) {
    throw { code: 401, message: 'Token无效或已过期' }
  }

  // 3. 检查用户状态
  if (user.status !== 'active') {
    throw { code: 403, message: '用户已被禁用' }
  }

  // 4. 获取角色配置
  const roleResult = await db.collection('role_configs')
    .where({ roleCode: user.role, status: 'active' })
    .get()

  if (roleResult.data.length === 0) {
    throw { code: 500, message: '角色配置不存在' }
  }

  const roleConfig = roleResult.data[0]

  // 5. 检查权限（如果需要）
  if (requiredPermission && !roleConfig.permissions.includes(requiredPermission)) {
    // 记录权限拒绝日志
    await db.collection('audit_logs').add({
      data: {
        userId: user._id,
        username: user.username,
        role: user.role,
        action: 'unauthorized_access',
        resource: requiredPermission,
        resourceId: '',
        description: `尝试访问无权限资源: ${requiredPermission}，用户角色: ${user.role}，拥有权限: ${roleConfig.permissions.join(', ')}`,
        ip: context.requestIp || '',
        userAgent: context.userAgent || '',
        tenantId: user.tenantId || null,
        status: 'failed',
        errorMessage: '无权限访问',
        createdAt: new Date(),
      },
    })

    throw {
      code: 403,
      message: `无权限访问此资源。需要权限: ${requiredPermission}，用户角色: ${user.role}，拥有权限: ${roleConfig.permissions.join(', ')}`
    }
  }

  // 6. 返回用户信息（包含权限上下文）
  return {
    ...user,
    permissions: roleConfig.permissions || [],
    moduleAccess: roleConfig.moduleAccess || {}
  }
}

module.exports = {
  verifyToken,
  checkPermission,
}

