const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 用户信息管理云函数
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const db = cloud.database()
  const userCollection = db.collection('users')

  try {
    switch (action) {
      case 'getProfile':
        // 获取用户信息
        const userResult = await userCollection.doc(data.userId).get()
        if (!userResult.data) {
          return {
            code: 404,
            message: '用户不存在'
          }
        }
        return {
          code: 0,
          data: userResult.data
        }

      case 'updateProfile':
        // 更新用户信息
        const updateData = {
          'profile.nickname': data.nickname,
          'profile.avatar': data.avatar,
          'profile.bio': data.bio,
          updatedAt: new Date()
        }
        
        await userCollection.doc(data.userId).update({
          data: updateData
        })
        
        return {
          code: 0,
          message: '用户信息更新成功'
        }

      case 'updatePreferences':
        // 更新用户偏好设置
        const preferenceData = {
          'preferences.dietType': data.dietType,
          'preferences.notifications': data.notifications,
          'preferences.privacy': data.privacy,
          updatedAt: new Date()
        }
        
        await userCollection.doc(data.userId).update({
          data: preferenceData
        })
        
        return {
          code: 0,
          message: '偏好设置更新成功'
        }

      default:
        return {
          code: 400,
          message: '未知的操作类型'
        }
    }
  } catch (error) {
    console.error('用户操作失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试'
    }
  }
}