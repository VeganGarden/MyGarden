// pages/chat/chat.js
Page({
  data: {
    messages: [],
    inputMessage: '',
    sending: false,
    scrollTop: 0,
    autoFocus: true,
    status: {
      online: true
    }
  },

  onLoad() {
    this.loadChatHistory()
  },

  // 加载聊天历史
  loadChatHistory() {
    const history = wx.getStorageSync('chatHistory') || []
    this.setData({
      messages: history
    })
    this.scrollToBottom()
  },

  // 保存聊天记录
  saveChatHistory() {
    wx.setStorageSync('chatHistory', this.data.messages)
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  },

  // 输入处理
  onInput(e) {
    this.setData({
      inputMessage: e.detail.value
    })
  },

  // 发送消息
  sendMessage() {
    const message = this.data.inputMessage.trim()
    if (!message || this.data.sending) return

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      time: this.formatTime(new Date())
    }

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputMessage: '',
      sending: true
    })

    this.scrollToBottom()
    this.saveChatHistory()

    // 调用AI服务
    wx.cloud.callFunction({
      name: 'ai-service',
      data: {
        action: 'chat',
        data: {
          message: message,
          history: this.data.messages.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      }
    }).then(res => {
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.result.data.response,
        time: this.formatTime(new Date())
      }

      this.setData({
        messages: [...this.data.messages, aiMessage],
        sending: false
      })

      this.scrollToBottom()
      this.saveChatHistory()
    }).catch(err => {
      console.error('AI响应失败:', err)
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉，AI服务暂时不可用，请稍后重试。',
        time: this.formatTime(new Date())
      }

      this.setData({
        messages: [...this.data.messages, errorMessage],
        sending: false
      })

      this.scrollToBottom()
      this.saveChatHistory()
    })
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      this.setData({
        scrollTop: 99999
      })
    }, 100)
  },

  // 格式化时间
  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  // 清空聊天记录
  clearChat() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有聊天记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: []
          })
          wx.removeStorageSync('chatHistory')
          wx.showToast({
            title: '聊天记录已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: 'AI聊天助手 - MyGarden',
      path: '/pages/chat/chat'
    }
  }
})