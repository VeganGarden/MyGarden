const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const crypto = require('crypto')
const jwt = require('jsonwebtoken')

// JWT密钥（生产环境应从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'climate-restaurant-secret-key-change-in-production'
const JWT_EXPIRES_IN = 7200 // 2小时

/**
 * 密码加密（使用bcrypt或sha256）
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * 验证密码
 */
function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword
}

/**
 * 生成JWT Token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * 验证JWT Token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

/**
 * 管理后台登录/认证云函数
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const db = cloud.database()

  try {
    switch (action) {
      case 'login': {
        // 登录
        const { username, password } = data

        if (!username || !password) {
          return {
            code: 400,
            message: '用户名和密码不能为空'
          }
        }

        // 查询用户
        const userResult = await db.collection('admin_users')
          .where({
            username: username,
            status: 'active'
          })
          .get()

        if (userResult.data.length === 0) {
          return {
            code: 401,
            message: '用户名或密码错误'
          }
        }

        const user = userResult.data[0]

        // 验证密码
        if (!verifyPassword(password, user.password)) {
          return {
            code: 401,
            message: '用户名或密码错误'
          }
        }

        // 获取角色配置和权限
        const roleResult = await db.collection('role_configs')
          .where({
            roleCode: user.role,
            status: 'active'
          })
          .get()

        if (roleResult.data.length === 0) {
          return {
            code: 500,
            message: '角色配置不存在，请联系管理员'
          }
        }

        const roleConfig = roleResult.data[0]

        // 更新最后登录信息
        await db.collection('admin_users').doc(user._id).update({
          data: {
            lastLoginAt: new Date(),
            lastLoginIp: context.requestIp || '',
            updatedAt: new Date(),
          }
        })

        // 记录登录日志
        await db.collection('audit_logs').add({
          data: {
            userId: user._id,
            username: user.username,
            role: user.role,
            action: 'login',
            resource: 'system',
            module: 'system',
            description: '用户登录',
            ip: context.requestIp || '',
            userAgent: context.userAgent || '',
            tenantId: user.tenantId || null,
            status: 'success',
            createdAt: new Date(),
          }
        })

        // 生成JWT Token
        const tokenPayload = {
          userId: user._id,
          username: user.username,
          role: user.role,
          tenantId: user.tenantId || null,
          permissions: roleConfig.permissions || [],
        }

        const token = generateToken(tokenPayload)

        // 返回用户信息和Token
        return {
          code: 0,
          message: '登录成功',
          data: {
            token,
            user: {
              id: user._id,
              username: user.username,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              roleName: roleConfig.roleName,
              tenantId: user.tenantId || null,
              restaurantIds: user.restaurantIds || [],
              permissions: roleConfig.permissions || [],
              status: user.status,
            },
            expiresIn: JWT_EXPIRES_IN,
          }
        }
      }

      case 'verifyToken': {
        // 验证Token
        const { token } = data

        if (!token) {
          return {
            code: 401,
            message: 'Token不能为空'
          }
        }

        const decoded = verifyToken(token)

        if (!decoded) {
          return {
            code: 401,
            message: 'Token无效或已过期'
          }
        }

        // 从数据库获取最新用户信息
        const userResult = await db.collection('admin_users')
          .doc(decoded.userId)
          .get()

        if (!userResult.data || userResult.data.status !== 'active') {
          return {
            code: 401,
            message: '用户不存在或已被禁用'
          }
        }

        const user = userResult.data

        // 获取角色配置
        const roleResult = await db.collection('role_configs')
          .where({
            roleCode: user.role,
            status: 'active'
          })
          .get()

        if (roleResult.data.length === 0) {
          return {
            code: 500,
            message: '角色配置不存在'
          }
        }

        const roleConfig = roleResult.data[0]

        return {
          code: 0,
          data: {
            user: {
              id: user._id,
              username: user.username,
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              roleName: roleConfig.roleName,
              tenantId: user.tenantId || null,
              restaurantIds: user.restaurantIds || [],
              permissions: roleConfig.permissions || [],
              status: user.status,
            }
          }
        }
      }

      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('认证操作失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试',
      error: error.message
    }
  }
}

