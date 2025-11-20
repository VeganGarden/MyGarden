/**
 * 批量生成证书PDF云函数
 * 
 * 功能: 为所有现有证书生成PDF文件
 * 
 * 调用方式:
 * tcb fn invoke trace-certificate-generate-all --params '{"action":"generateAll","tenantId":"default"}'
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 为所有证书生成PDF
 */
async function generateAllCertificates(tenantId = 'default', forceRegenerate = false) {
  try {
    // 查询所有证书
    const certificatesResult = await db.collection('certificates')
      .where({
        tenantId: tenantId,
        isDeleted: false,
        format: 'pdf'
      })
      .get()

    const certificates = certificatesResult.data
    const results = []

    // 为每个证书生成PDF
    for (const cert of certificates) {
      try {
        // 如果已经有真实的PDF URL（不是示例URL），且不强制重新生成，则跳过
        if (!forceRegenerate && cert.certificateUrl && 
            !cert.certificateUrl.includes('example.com') && 
            !cert.certificateUrl.includes('your-domain.com')) {
          results.push({
            certificateId: cert.certificateId,
            certificateNumber: cert.certificateNumber,
            success: true,
            skipped: true,
            reason: '已有PDF文件'
          })
          continue
        }

        // 调用证书生成云函数
        const certResult = await cloud.callFunction({
          name: 'trace-certificate',
          data: {
            action: 'generate',
            traceId: cert.traceId,
            tenantId: tenantId,
            templateId: cert.templateId || 'default',
            format: 'pdf'
          }
        })

        if (certResult.result && certResult.result.code === 0) {
          // 更新证书的PDF URL
          await db.collection('certificates')
            .where({
              certificateId: cert.certificateId,
              tenantId: tenantId
            })
            .update({
              data: {
                certificateUrl: certResult.result.data.certificateUrl,
                qrCode: certResult.result.data.qrCode,
                updatedAt: new Date()
              }
            })

          results.push({
            certificateId: cert.certificateId,
            certificateNumber: cert.certificateNumber,
            success: true,
            certificateUrl: certResult.result.data.certificateUrl
          })
        } else {
          results.push({
            certificateId: cert.certificateId,
            certificateNumber: cert.certificateNumber,
            success: false,
            error: certResult.result?.message || '生成失败'
          })
        }
      } catch (error) {
        results.push({
          certificateId: cert.certificateId,
          certificateNumber: cert.certificateNumber,
          success: false,
          error: error.message
        })
      }
    }

    return {
      code: 0,
      message: '批量生成完成',
      total: certificates.length,
      results: results
    }
  } catch (error) {
    return {
      code: 500,
      message: '批量生成失败',
      error: error.message
    }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action = 'generateAll', tenantId = 'default', forceRegenerate = false } = event

  try {
    switch (action) {
      case 'generateAll':
        return await generateAllCertificates(tenantId, forceRegenerate)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['generateAll']
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

