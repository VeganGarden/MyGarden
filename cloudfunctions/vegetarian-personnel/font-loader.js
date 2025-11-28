/**
 * 中文字体加载工具
 * 用于在云函数中加载 SourceHanSansCN-Regular.ttf 字体文件
 * 
 * 使用方法:
 * const { loadChineseFont, chineseFont, chineseBoldFont } = require('./font-loader')
 * const hasChineseFont = loadChineseFont(doc) // doc 是 PDFDocument 实例
 * doc.font(hasChineseFont ? chineseFont : 'Helvetica')
 */

const fs = require('fs')
const path = require('path')

/**
 * 尝试加载中文字体到 PDFDocument
 * @param {PDFDocument} doc PDFDocument 实例
 * @returns {boolean} 是否成功加载中文字体
 */
function loadChineseFont(doc) {
  try {
    // 尝试多个可能的字体路径
    const possiblePaths = [
      path.join(process.cwd(), 'fonts', 'SourceHanSansCN-Regular.ttf'),
      path.join(__dirname || process.cwd(), 'fonts', 'SourceHanSansCN-Regular.ttf'),
      path.join(__dirname, '..', 'fonts', 'SourceHanSansCN-Regular.ttf'),
      '/var/user/fonts/SourceHanSansCN-Regular.ttf'
    ]
    
    let actualFontPath = null
    for (const fontPath of possiblePaths) {
      if (fs.existsSync(fontPath)) {
        actualFontPath = fontPath
        break
      }
    }
    
    if (actualFontPath) {
      try {
        doc.registerFont('Chinese', actualFontPath)
        // 中文字体加载成功
        return true
      } catch (fontErr) {
        console.warn('注册中文字体失败，将使用默认字体:', fontErr.message)
        console.warn('字体路径:', actualFontPath)
        return false
      }
    } else {
      console.warn('中文字体文件未找到，将使用默认字体（中文可能显示为乱码）')
      console.warn('尝试的路径:', possiblePaths)
      return false
    }
  } catch (err) {
    console.warn('中文字体加载失败，将使用默认字体:', err.message)
    return false
  }
}

/**
 * 获取中文字体名称（如果已加载）
 * @param {boolean} hasChineseFont 是否已加载中文字体
 * @returns {string} 字体名称
 */
function getChineseFont(hasChineseFont) {
  return hasChineseFont ? 'Chinese' : 'Helvetica'
}

/**
 * 获取中文粗体字体名称（如果已加载）
 * @param {boolean} hasChineseFont 是否已加载中文字体
 * @returns {string} 字体名称
 */
function getChineseBoldFont(hasChineseFont) {
  return hasChineseFont ? 'Chinese' : 'Helvetica-Bold'
}

module.exports = {
  loadChineseFont,
  getChineseFont,
  getChineseBoldFont
}

