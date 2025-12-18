const jwt = require('jsonwebtoken')

// JWT密钥（应与admin-auth云函数保持一致）
const JWT_SECRET = process.env.JWT_SECRET || 'climate-restaurant-secret-key-change-in-production'

async function verifyToken(token, db) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const userResult = await db.collection('admin_users').doc(decoded.userId).get()
    if (!userResult.data || userResult.data.status !== 'active') {
      return null
    }
    return { ...decoded, ...userResult.data }
  } catch (error) {
    console.error('Token验证失败:', error)
    return null
  }
}

async function checkPermission(event, context, requiredPermission = null, resourceScope = 'self') {
  const cloud = require('wx-server-sdk')
  const db = cloud.database()
  // 兼容 Node.js 10，不使用可选链操作符
  // 获取Token（支持多种方式传递token）
  // 前端通过 cloudbase.ts 将 token 放在 payload.token 中，即 event.token
  // 但也要检查 event.data.token（因为某些情况下 token 可能在 data 中）
  const headerAuth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || ''
  const eventToken = event.token || (event.data && event.data.token) || ''
  const authHeader = headerAuth || eventToken || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    console.log('[checkPermission] Token为空，event.keys:', Object.keys(event), 'event.token:', event.token, 'event.data:', event.data)
    throw { code: 401, message: '未授权访问，请先登录' }
  }
  const user = await verifyToken(token, db)
  if (!user) throw { code: 401, message: 'Token无效或已过期' }
  if (user.status !== 'active') throw { code: 403, message: '用户已被禁用' }

  const roleResult = await db.collection('role_configs').where({ roleCode: user.role, status: 'active' }).get()
  if (roleResult.data.length === 0) throw { code: 500, message: '角色配置不存在' }
  const roleConfig = roleResult.data[0]

  if (requiredPermission && !roleConfig.permissions.includes(requiredPermission)) {
    await db.collection('audit_logs').add({
      data: {
        userId: user._id,
        username: user.username,
        role: user.role,
        action: 'unauthorized_access',
        resource: requiredPermission,
        resourceId: '',
        description: `尝试访问无权限资源: ${requiredPermission}`,
        ip: context.requestIp || '',
        userAgent: context.userAgent || '',
        tenantId: user.tenantId || null,
        status: 'failed',
        errorMessage: '无权限访问',
        createdAt: new Date(),
      },
    })
    throw { code: 403, message: '无权限访问此资源' }
  }

  return { ...user, permissions: roleConfig.permissions || [], moduleAccess: roleConfig.moduleAccess || {} }
}

module.exports = {
  verifyToken,
  checkPermission,
}


