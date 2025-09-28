// pages/index/index.js
Page({
  data: {
    status: {
      aiService: false,
      environment: false
    },
    testMessage: '',
    testResponse: '',
    testing: false
  },

  onLoad() {
    this.checkServiceStatus()
  },

  onShow() {
    this.checkServiceStatus()
  },

  // 检查服务状态
  checkServiceStatus() {
    // 测试云函数连接
    wx.cloud.callFunction({
      name: 'ai-service',
      data: {
        action: 'status',
        data: {}
      }
    }).then(res => {
      this.setData({
        'status.aiService': true,
        'status.environment': true
      })
    }).catch(err => {
      console.error('服务状态检查失败:', err)
      this.setData({
        'status.aiService': false,
        'status.environment': false
      })
    })
  },

  // 跳转到聊天页面
  goToChat() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    })
  },

  // 跳转到分析页面
  goToAnalyze() {
    wx.navigateTo({
      url: '/pages/analyze/analyze'
    })
  },

  // 测试输入处理
  onTestInput(e) {
    this.setData({
      testMessage: e.detail.value
    })
  },

  // 快速测试
  quickTest() {
    if (!this.data.testMessage.trim()) {
      wx.showToast({
        title: '请输入测试消息',
        icon: 'none'
      })
      return
    }

    this.setData({ testing: true })

    wx.cloud.callFunction({
      name: 'ai-service',
      data: {
        action: 'chat',
        data: {
          message: this.data.testMessage
        }
      }
    }).then(res => {
      console.log('测试响应:', res)
      this.setData({
        testResponse: res.result.data.response,
        testing: false
      })
    }).catch(err => {
      console.error('测试失败:', err)
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      })
      this.setData({ testing: false })
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: 'MyGarden AI服务 - 智能对话与数据分析',
      path: '/pages/index/index'
    }
  }
})