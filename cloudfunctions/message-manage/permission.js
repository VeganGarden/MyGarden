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
    console.error('Token验证失败:', error)
    return null
  }
}

module.exports = {
  verifyToken,
}

