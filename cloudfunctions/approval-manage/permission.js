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
    // 静默失败，避免记录敏感信息
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

  // 4. 获取角色权限配置
  const roleResult = await db.collection('role_configs')
    .where({ roleCode: user.role, status: 'active' })
    .get()

  if (roleResult.data.length === 0) {
    throw { code: 500, message: '角色配置不存在' }
  }

  const roleConfig = roleResult.data[0]

  // 5. 检查权限
  if (requiredPermission && !roleConfig.permissions.includes(requiredPermission)) {
    // 记录无权限访问日志
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
      }
    })

    throw { code: 403, message: '无权限访问此资源' }
  }

  // 6. 返回用户信息（包含权限上下文）
  return {
    ...user,
    permissions: roleConfig.permissions || [],
    moduleAccess: roleConfig.moduleAccess || {},
  }
}

/**
 * 检查数据范围权限
 * @param {object} user 用户信息
 * @param {string} resourceId 资源ID
 * @param {string} resourceType 资源类型（如: restaurant, tenant等）
 * @param {object} db 数据库实例
 * @returns {Promise<boolean>} 是否有权限
 */
async function checkDataScope(user, resourceId, resourceType, db) {
  // 如果用户是系统管理员，可以访问所有数据
  if (user.role === 'system_admin') {
    return true
  }

  // 根据资源类型和数据范围检查
  if (resourceType === 'restaurant') {
    // 检查餐厅是否属于用户的租户或餐厅列表
    if (user.role === 'restaurant_admin') {
      return user.restaurantIds && user.restaurantIds.includes(resourceId)
    }

    if (user.tenantId) {
      // 检查餐厅是否属于该租户
      const restaurantResult = await db.collection('restaurants')
        .doc(resourceId)
        .get()

      if (restaurantResult.data && restaurantResult.data.tenantId === user.tenantId) {
        return true
      }
    }
  }

  if (resourceType === 'tenant') {
    // 检查租户权限
    if (user.role === 'restaurant_admin') {
      return user.tenantId === resourceId
    }
    // 平台运营和碳核算专员可以访问所有租户数据
    return ['platform_operator', 'carbon_specialist'].includes(user.role)
  }

  // 默认返回false（保守策略）
  return false
}

module.exports = {
  verifyToken,
  checkPermission,
  checkDataScope,
}
