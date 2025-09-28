// pages/analyze/analyze.js
Page({
  data: {
    status: {
      online: true
    },
    selectedFile: null,
    analysisTypes: ['趋势分析', '统计分析', '异常检测', '预测分析'],
    selectedTypeIndex: 0,
    dataRanges: ['全部数据', '最近100条', '最近500条', '自定义范围'],
    selectedRangeIndex: 0,
    analyzing: false,
    analysisResult: null,
    error: null
  },

  onLoad() {
    this.checkServiceStatus()
  },

  // 检查服务状态
  checkServiceStatus() {
    wx.cloud.callFunction({
      name: 'ai-service',
      data: {
        action: 'status',
        data: {}
      }
    }).then(res => {
      this.setData({
        'status.online': true
      })
    }).catch(err => {
      console.error('服务状态检查失败:', err)
      this.setData({
        'status.online': false
      })
    })
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  },

  // 选择文件
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'json', 'xlsx', 'xls'],
      success: (res) => {
        const file = res.tempFiles[0]
        this.setData({
          selectedFile: {
            name: file.name,
            size: file.size,
            path: file.path
          },
          analysisResult: null,
          error: null
        })
      },
      fail: (err) => {
        console.error('选择文件失败:', err)
        wx.showToast({
          title: '选择文件失败',
          icon: 'error'
        })
      }
    })
  },

  // 移除文件
  removeFile() {
    this.setData({
      selectedFile: null,
      analysisResult: null,
      error: null
    })
  },

  // 分析类型改变
  onTypeChange(e) {
    this.setData({
      selectedTypeIndex: parseInt(e.detail.value)
    })
  },

  // 数据范围改变
  onRangeChange(e) {
    this.setData({
      selectedRangeIndex: parseInt(e.detail.value)
    })
  },

  // 开始分析
  startAnalysis() {
    if (!this.data.selectedFile) {
      wx.showToast({
        title: '请先选择文件',
        icon: 'none'
      })
      return
    }

    this.setData({
      analyzing: true,
      analysisResult: null,
      error: null
    })

    // 读取文件内容
    wx.getFileSystemManager().readFile({
      filePath: this.data.selectedFile.path,
      encoding: 'utf8',
      success: (res) => {
        const fileContent = res.data
        
        // 调用AI分析服务
        wx.cloud.callFunction({
          name: 'ai-service',
          data: {
            action: 'analyze',
            data: {
              fileType: this.getFileType(this.data.selectedFile.name),
              content: fileContent,
              analysisType: this.data.analysisTypes[this.data.selectedTypeIndex],
              dataRange: this.data.dataRanges[this.data.selectedRangeIndex]
            }
          }
        }).then(cloudRes => {
          console.log('分析结果:', cloudRes)
          this.setData({
            analysisResult: cloudRes.result.data,
            analyzing: false
          })
        }).catch(err => {
          console.error('分析失败:', err)
          this.setData({
            error: '分析服务暂时不可用，请稍后重试',
            analyzing: false
          })
        })
      },
      fail: (err) => {
        console.error('读取文件失败:', err)
        this.setData({
          error: '文件读取失败，请检查文件格式',
          analyzing: false
        })
      }
    })
  },

  // 获取文件类型
  getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase()
    if (ext === 'csv') return 'csv'
    if (ext === 'json') return 'json'
    if (ext === 'xlsx' || ext === 'xls') return 'excel'
    return 'text'
  },

  // 下载分析报告
  downloadReport() {
    if (!this.data.analysisResult) return

    const report = this.generateReport()
    const filePath = wx.env.USER_DATA_PATH + '/analysis_report.txt'
    
    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: report,
      encoding: 'utf8',
      success: () => {
        wx.openDocument({
          filePath: filePath,
          success: () => {
            wx.showToast({
              title: '报告已生成',
              icon: 'success'
            })
          }
        })
      },
      fail: (err) => {
        console.error('生成报告失败:', err)
        wx.showToast({
          title: '生成报告失败',
          icon: 'error'
        })
      }
    })
  },

  // 生成分析报告
  generateReport() {
    const result = this.data.analysisResult
    let report = `数据分析报告\n`
    report += `生成时间: ${new Date().toLocaleString()}\n\n`
    
    report += `数据概览:\n`
    report += `- 数据行数: ${result.stats?.rowCount || 0}\n`
    report += `- 字段数量: ${result.stats?.columnCount || 0}\n`
    report += `- 数据完整性: ${result.stats?.completeness || '0%'}\n\n`
    
    report += `关键洞察:\n`
    result.insights?.forEach((insight, index) => {
      report += `${index + 1}. ${insight}\n`
    })
    
    report += `\n建议:\n`
    result.recommendations?.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`
    })
    
    return report
  },

  onShareAppMessage() {
    return {
      title: '数据分析服务 - MyGarden',
      path: '/pages/analyze/analyze'
    }
  }
})