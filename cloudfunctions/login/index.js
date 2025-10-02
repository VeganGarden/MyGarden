const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 用户登录云函数
 * @param {Object} event 事件对象
 * @param {string} event.code 微信登录code
 */
exports.main = async (event, context) => {
  try {
    const { code } = event
    
    if (!code) {
      return {
        code: 400,
        message: '缺少登录code'
      }
    }

    // 获取微信开放接口 access_token
    const authResult = await cloud.openapi.auth.getAccessToken({
      appid: process.env.WECHAT_APPID,
      secret: process.env.WECHAT_SECRET,
      code: code
    })

    if (authResult.errcode !== 0) {
      return {
        code: authResult.errcode,
        message: authResult.errmsg
      }
    }

    const { openid, session_key } = authResult

    // 查询用户是否存在
    const db = cloud.database()
    const userCollection = db.collection('users')
    
    const userResult = await userCollection.where({
      openid: openid
    }).get()

    let userData = {}
    
    if (userResult.data.length === 0) {
      // 新用户，创建用户记录
      userData = {
        openid: openid,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        profile: {
          nickname: '花园用户',
          avatar: '',
          level: 1
        },
        carbonStats: {
          totalReduction: 0,
          totalMeals: 0,
          currentStreak: 0
        }
      }
      
      const addResult = await userCollection.add({
        data: userData
      })
      
      userData._id = addResult._id
    } else {
      // 老用户，更新最后登录时间
      userData = userResult.data[0]
      await userCollection.doc(userData._id).update({
        data: {
          lastLoginAt: new Date()
        }
      })
    }

    return {
      code: 0,
      message: '登录成功',
      data: {
        userInfo: userData,
        sessionKey: session_key
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      code: 500,
      message: '登录失败，请重试'
    }
  }
}