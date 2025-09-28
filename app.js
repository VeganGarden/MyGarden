// app.js
App({
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'xiaoshidashi-4gng7p8p862e8878',
      traceUser: true
    })
    
    // 检查登录状态
    this.checkLoginStatus()
  },

  onShow() {
    console.log('MyGarden AI服务启动')
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    }
  },

  // 登录方法
  login(callback) {
    wx.cloud.callFunction({
      name: 'ai-service',
      data: {
        action: 'login',
        data: {}
      }
    }).then(res => {
      this.globalData.isLoggedIn = true
      if (callback) callback(res)
    }).catch(err => {
      console.error('登录失败:', err)
      if (callback) callback(null, err)
    })
  },

  // 获取用户信息
  getUserInfo(callback) {
    if (this.globalData.userInfo) {
      callback(this.globalData.userInfo)
    } else {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          this.globalData.userInfo = res.userInfo
          wx.setStorageSync('userInfo', res.userInfo)
          callback(res.userInfo)
        }
      })
    }
  }
})