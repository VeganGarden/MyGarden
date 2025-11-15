/**
 * 溯源证书生成云函数
 * 
 * 功能:
 * 1. 生成溯源证书（PDF）
 * 2. 查询证书
 * 3. 通过编号查询证书
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 生成证书编号
 */
function generateCertificateNumber() {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `CERT-${year}${month}${day}-${random}`
}

/**
 * 生成证书（使用PDF生成库）
 * 
 * 注意：需要安装 pdfkit 依赖
 * npm install pdfkit
 */
async function generateCertificate(traceId, tenantId, templateId, format) {
  try {
    // 获取溯源链信息
    const traceChainResult = await db.collection('trace_chains')
      .where({
        traceId: traceId,
        tenantId: tenantId,
        isDeleted: false
      })
      .get()

    if (traceChainResult.data.length === 0) {
      return {
        code: 404,
        message: '溯源链不存在'
      }
    }

    const traceChain = traceChainResult.data[0]

    // 获取节点信息
    const nodesResult = await db.collection('trace_nodes')
      .where({
        traceId: traceId,
        tenantId: tenantId,
        isDeleted: false
      })
      .orderBy('timestamp', 'asc')
      .get()

    const certificateNumber = generateCertificateNumber()
    const now = new Date()

    // 生成证书数据
    const certificateData = {
      certificateNumber: certificateNumber,
      traceId: traceId,
      menuItemName: traceChain.menuItemName,
      trustScore: traceChain.trustScore,
      nodeCount: traceChain.nodeCount,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + 365 * 24 * 3600 * 1000) // 1年有效期
    }

    // 生成PDF证书
    let certificateUrl = ''
    let qrCode = ''

    try {
      const PDFDocument = require('pdfkit')
      const fs = require('fs')
      const path = require('path')
      const https = require('https')
      const { promisify } = require('util')
      const stream = require('stream')
      const pipeline = promisify(stream.pipeline)

      // 使用中文字体 - 优先使用打包的字体文件
      let fontPath = null
      
      // 优先使用本地打包的字体文件
      const localFontPath = path.join(__dirname, 'fonts', 'SourceHanSansSC-Regular.otf')
      if (fs.existsSync(localFontPath)) {
        fontPath = localFontPath
        console.log('使用本地打包的字体文件')
      } else {
        // 如果本地没有，尝试从/tmp读取（可能之前下载过）
        const tmpFontPath = '/tmp/fonts/SourceHanSansSC-Regular.otf'
        if (fs.existsSync(tmpFontPath)) {
          fontPath = tmpFontPath
          console.log('使用临时目录的字体文件')
        } else {
          console.warn('未找到中文字体文件，中文将显示为乱码')
          fontPath = null
        }
      }

      // 创建PDF文档
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      })

      // 注册中文字体（如果可用）
      if (fontPath && fs.existsSync(fontPath)) {
        doc.registerFont('Chinese', fontPath)
      }

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const margin = 40
      const contentWidth = pageWidth - margin * 2

      // ========== 背景装饰 ==========
      // 绘制渐变背景（浅绿色到白色）
      const gradient = doc.linearGradient(margin, margin, pageWidth - margin, pageHeight - margin)
      gradient.stop(0, '#f0fdf4')
      gradient.stop(1, '#ffffff')
      doc.rect(margin, margin, contentWidth, pageHeight - margin * 2)
        .fill(gradient)

      // 绘制装饰性边框（双层）
      // 外层边框（粗）
      doc.lineWidth(3)
      doc.strokeColor('#22c55e')
      doc.rect(margin + 5, margin + 5, contentWidth - 10, pageHeight - margin * 2 - 10)
        .stroke()

      // 内层边框（细）
      doc.lineWidth(1)
      doc.strokeColor('#86efac')
      doc.rect(margin + 15, margin + 15, contentWidth - 30, pageHeight - margin * 2 - 30)
        .stroke()

      // 绘制装饰性角标
      const cornerSize = 20
      doc.lineWidth(2)
      doc.strokeColor('#22c55e')
      // 左上角
      doc.moveTo(margin + 15, margin + 15 + cornerSize)
        .lineTo(margin + 15, margin + 15)
        .lineTo(margin + 15 + cornerSize, margin + 15)
        .stroke()
      // 右上角
      doc.moveTo(pageWidth - margin - 15 - cornerSize, margin + 15)
        .lineTo(pageWidth - margin - 15, margin + 15)
        .lineTo(pageWidth - margin - 15, margin + 15 + cornerSize)
        .stroke()
      // 左下角
      doc.moveTo(margin + 15, pageHeight - margin - 15 - cornerSize)
        .lineTo(margin + 15, pageHeight - margin - 15)
        .lineTo(margin + 15 + cornerSize, pageHeight - margin - 15)
        .stroke()
      // 右下角
      doc.moveTo(pageWidth - margin - 15 - cornerSize, pageHeight - margin - 15)
        .lineTo(pageWidth - margin - 15, pageHeight - margin - 15)
        .lineTo(pageWidth - margin - 15, pageHeight - margin - 15 - cornerSize)
        .stroke()

      // ========== 标题区域 ==========
      let yPosition = margin + 40

      // 绘制标题背景装饰
      doc.rect(margin + 20, yPosition - 10, contentWidth - 40, 60)
        .fillColor('#dcfce7')
        .fillOpacity(0.3)
        .fill()
        .fillOpacity(1.0)
        .fillColor('#000000')

      // 主标题 - 大号加粗
      doc.fontSize(36)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica-Bold')
      }
      doc.fillColor('#166534')
      doc.text('溯源证书', margin + 20, yPosition, { 
        align: 'center', 
        width: contentWidth - 40 
      })
      yPosition += 50

      // 副标题装饰线
      doc.lineWidth(1)
      doc.strokeColor('#86efac')
      doc.moveTo(margin + 60, yPosition)
        .lineTo(pageWidth - margin - 60, yPosition)
        .stroke()
      yPosition += 25

      // 证书编号 - 优雅显示
      doc.fontSize(12)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica')
      }
      doc.fillColor('#666666')
      doc.text(`证书编号：${certificateNumber}`, margin + 20, yPosition, {
        align: 'center',
        width: contentWidth - 40
      })
      yPosition += 35

      // ========== 菜品信息区域 ==========
      // 区域标题背景
      doc.rect(margin + 30, yPosition - 5, contentWidth - 60, 30)
        .fillColor('#22c55e')
        .fillOpacity(0.1)
        .fill()
        .fillOpacity(1.0)
        .fillColor('#000000')

      doc.fontSize(18)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica-Bold')
      }
      doc.fillColor('#166534')
      doc.text('菜品信息', margin + 40, yPosition)
      yPosition += 35

      // 菜品名称 - 突出显示
      doc.fontSize(16)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica-Bold')
      }
      doc.fillColor('#000000')
      const labelText = '菜品名称：'
      doc.text(labelText, margin + 40, yPosition)
      const dishNameX = margin + 40 + doc.widthOfString(labelText) + 10
      doc.fillColor('#22c55e')
      doc.text(traceChain.menuItemName || '未知菜品', dishNameX, yPosition)
      yPosition += 40

      // ========== 溯源链信息区域 ==========
      // 区域标题背景
      doc.rect(margin + 30, yPosition - 5, contentWidth - 60, 30)
        .fillColor('#22c55e')
        .fillOpacity(0.1)
        .fill()
        .fillOpacity(1.0)
        .fillColor('#000000')

      doc.fontSize(18)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica-Bold')
      }
      doc.fillColor('#166534')
      doc.text('溯源链信息', margin + 40, yPosition)
      yPosition += 35

      // 信息项 - 使用更好的排版
      doc.fontSize(13)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica')
      }
      doc.fillColor('#333333')
      
      // 溯源链ID
      const traceIdLabel = '溯源链ID：'
      doc.text(traceIdLabel, margin + 50, yPosition)
      doc.fillColor('#666666')
      doc.text(traceId, margin + 50 + doc.widthOfString(traceIdLabel) + 5, yPosition)
      yPosition += 22

      // 节点数量
      doc.fillColor('#333333')
      const nodeCountLabel = '节点数量：'
      doc.text(nodeCountLabel, margin + 50, yPosition)
      doc.fillColor('#22c55e')
      doc.text(`${traceChain.nodeCount}个`, margin + 50 + doc.widthOfString(nodeCountLabel) + 5, yPosition)
      yPosition += 22

      // 信任度评分 - 突出显示
      doc.fillColor('#333333')
      const trustScoreLabel = '信任度评分：'
      doc.text(trustScoreLabel, margin + 50, yPosition)
      // 计算标签宽度（使用当前13号字体）
      const labelWidth = doc.widthOfString(trustScoreLabel)
      // 切换到更大的字体显示分数
      doc.fontSize(16)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica-Bold')
      }
      doc.fillColor('#22c55e')
      doc.text(`${traceChain.trustScore}分`, margin + 50 + labelWidth + 5, yPosition - 2)
      yPosition += 40

      // ========== 溯源节点列表 ==========
      if (nodesResult.data && nodesResult.data.length > 0) {
        // 区域标题
        doc.rect(margin + 30, yPosition - 5, contentWidth - 60, 30)
          .fillColor('#22c55e', 0.1)
          .fill()
          .fillColor('#000000')

        doc.fontSize(18)
        if (fontPath && fs.existsSync(fontPath)) {
          doc.font('Chinese')
        } else {
          doc.font('Helvetica-Bold')
        }
        doc.fillColor('#166534')
        doc.text('溯源节点', margin + 40, yPosition)
        yPosition += 35

        // 节点列表 - 使用卡片式设计
        nodesResult.data.forEach((node, index) => {
          // 检查是否需要换页
          if (yPosition > pageHeight - margin - 100) {
            doc.addPage()
            // 在新页面重新绘制背景和边框
            doc.rect(margin, margin, contentWidth, pageHeight - margin * 2)
              .fill(gradient)
            doc.lineWidth(3)
            doc.strokeColor('#22c55e')
            doc.rect(margin + 5, margin + 5, contentWidth - 10, pageHeight - margin * 2 - 10)
              .stroke()
            doc.lineWidth(1)
            doc.strokeColor('#86efac')
            doc.rect(margin + 15, margin + 15, contentWidth - 30, pageHeight - margin * 2 - 30)
              .stroke()
            yPosition = margin + 40
          }

          // 节点卡片背景（增加高度以容纳类型标签）
          doc.rect(margin + 40, yPosition - 5, contentWidth - 80, 60)
            .fillColor('#f0fdf4')
            .fillOpacity(0.5)
            .fill()
            .fillOpacity(1.0)
            .fillColor('#000000')

          // 节点编号和名称
          doc.fontSize(14)
          if (fontPath && fs.existsSync(fontPath)) {
            doc.font('Chinese')
          } else {
            doc.font('Helvetica-Bold')
          }
          doc.fillColor('#166534')
          const nodeNameText = `${index + 1}. ${node.nodeName}`
          doc.text(nodeNameText, margin + 50, yPosition)
          
          // 节点类型标签 - 放在下一行，避免重叠
          yPosition += 16
          const nodeTypeText = `类型：${node.nodeType}`
          doc.fontSize(10)
          if (fontPath && fs.existsSync(fontPath)) {
            doc.font('Chinese')
          } else {
            doc.font('Helvetica')
          }
          doc.fillColor('#22c55e')
          doc.text(nodeTypeText, margin + 50, yPosition)
          
          yPosition += 14

          // 时间信息
          doc.fontSize(11)
          if (fontPath && fs.existsSync(fontPath)) {
            doc.font('Chinese')
          } else {
            doc.font('Helvetica')
          }
          doc.fillColor('#666666')
          const timeText = `时间：${new Date(node.timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}`
          doc.text(timeText, margin + 50, yPosition)
          yPosition += 16

          // 地点信息
          if (node.location && node.location.address) {
            doc.text(`地点：${node.location.address}`, margin + 50, yPosition)
            yPosition += 16
          }

          yPosition += 8
        })
      }

      // ========== 证书有效期区域 ==========
      yPosition += 20
      
      // 绘制分隔线
      doc.lineWidth(1)
      doc.strokeColor('#dcfce7')
      doc.moveTo(margin + 60, yPosition)
        .lineTo(pageWidth - margin - 60, yPosition)
        .stroke()
      yPosition += 25

      // 有效期信息 - 居中显示
      doc.fontSize(11)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica')
      }
      doc.fillColor('#666666')
      const genTime = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      const expTime = certificateData.expiresAt.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(`生成时间：${genTime}`, margin + 20, yPosition, {
        align: 'center',
        width: contentWidth - 40
      })
      yPosition += 18
      doc.text(`有效期至：${expTime}`, margin + 20, yPosition, {
        align: 'center',
        width: contentWidth - 40
      })

      // ========== 页脚 ==========
      const footerY = pageHeight - margin - 30
      doc.fontSize(9)
      if (fontPath && fs.existsSync(fontPath)) {
        doc.font('Chinese')
      } else {
        doc.font('Helvetica')
      }
      doc.fillColor('#999999')
      doc.text('本证书由供应链溯源系统自动生成，具有法律效力', margin + 20, footerY, {
        align: 'center',
        width: contentWidth - 40
      })

      // 保存PDF到临时文件
      const tempPath = `/tmp/certificate-${certificateNumber}.pdf`
      const writeStream = fs.createWriteStream(tempPath)
      doc.pipe(writeStream)
      doc.end()

      // 等待PDF生成完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })

      // 读取PDF文件内容
      const pdfBuffer = fs.readFileSync(tempPath)

      // 上传到云存储
      const cloudPath = `certificates/${certificateNumber}.pdf`
      
      const uploadResult = await cloud.uploadFile({
        cloudPath: cloudPath,
        fileContent: pdfBuffer
      })

      // 获取文件访问URL
      const fileList = await cloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      })

      if (fileList.fileList && fileList.fileList.length > 0) {
        certificateUrl = fileList.fileList[0].tempFileURL
      } else {
        certificateUrl = uploadResult.fileID
      }

      // 生成二维码
      qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(certificateUrl)}`

      // 清理临时文件
      try {
        fs.unlinkSync(tempPath)
      } catch (cleanupError) {
        console.warn('清理临时文件失败:', cleanupError.message)
      }
    } catch (pdfError) {
      console.error('PDF生成失败:', pdfError)
      // PDF生成失败，使用占位符URL
      certificateUrl = `https://your-domain.com/certificates/${certificateNumber}.pdf`
      qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(certificateUrl)}`
    }

    // 保存证书记录
    const certificate = {
      tenantId: tenantId,
      certificateId: `CERT-${Date.now()}`,
      certificateNumber: certificateNumber,
      traceId: traceId,
      templateId: templateId || 'default',
      format: format || 'pdf',
      certificateUrl: certificateUrl,
      qrCode: qrCode,
      certificateData: certificateData,
      status: 'active',
      createdAt: now,
      createdBy: 'system'
    }

    // 保存到数据库
    try {
      await db.collection('certificates').add({ data: certificate })
    } catch (error) {
      // 如果集合不存在，先创建（这里只是记录，实际需要在初始化时创建）
      console.warn('certificates集合可能不存在，请先初始化:', error.message)
    }

    return {
      code: 0,
      message: '证书生成成功',
      data: {
        certificateId: certificate.certificateId,
        certificateNumber: certificateNumber,
        certificateUrl: certificateUrl,
        qrCode: qrCode
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '证书生成失败',
      error: error.message
    }
  }
}

/**
 * 查询证书
 */
async function getCertificate(certificateId, tenantId) {
  try {
    const result = await db.collection('certificates')
      .where({
        certificateId: certificateId,
        tenantId: tenantId,
        isDeleted: false
      })
      .get()

    if (result.data.length === 0) {
      return {
        code: 404,
        message: '证书不存在'
      }
    }

    return {
      code: 0,
      data: result.data[0]
    }
  } catch (error) {
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}

/**
 * 通过编号查询证书
 */
async function queryByNumber(certificateNumber) {
  try {
    const result = await db.collection('certificates')
      .where({
        certificateNumber: certificateNumber,
        isDeleted: false
      })
      .get()

    if (result.data.length === 0) {
      return {
        code: 404,
        message: '证书不存在'
      }
    }

    return {
      code: 0,
      data: result.data[0]
    }
  } catch (error) {
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}

/**
 * 查询证书列表
 */
async function listCertificates(params) {
  try {
    const {
      tenantId,
      page = 1,
      pageSize = 20,
      status,
      keyword,
      traceId
    } = params

    let query = db.collection('certificates').where({
      tenantId: tenantId,
      isDeleted: false
    })

    if (status) {
      query = query.where({ status: status })
    }

    if (traceId) {
      query = query.where({ traceId: traceId })
    }

    if (keyword) {
      query = query.where(_.or([
        { certificateNumber: db.RegExp({ regexp: keyword, options: 'i' }) },
        { menuItemName: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]))
    }

    const countResult = await query.count()
    const total = countResult.total

    const skip = (page - 1) * pageSize
    const result = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: result.data,
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '查询失败',
      error: error.message,
      data: [],
      total: 0
    }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  try {
    const { action } = event

    switch (action) {
      case 'generate':
        return await generateCertificate(event.traceId, event.tenantId, event.templateId, event.format)
      case 'get':
        return await getCertificate(event.certificateId, event.tenantId)
      case 'list':
        return await listCertificates(event)
      case 'queryByNumber':
        return await queryByNumber(event.certificateNumber)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['generate', 'get', 'list', 'queryByNumber']
        }
    }
  } catch (error) {
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}

