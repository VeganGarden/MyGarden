const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

/**
 * 气候餐厅认证管理云函数
 * 
 * 支持的 actions:
 * - apply: 提交认证申请
 * - saveDraft: 保存草稿
 * - systemEvaluate: 系统自动评估（基于五大维度评分）
 * - getStatus: 获取认证状态
 * - getCertificate: 获取证书信息
 * - updateMaterials: 更新认证资料
 * - getMaterialHistory: 获取资料历史版本
 * - exportMaterials: 导出认证资料
 * - review: 审核操作（平台运营）
 * - generateCertificate: 生成证书
 * - createInspection: 创建抽检任务（平台运营）
 * - getInspection: 获取抽检记录
 * - updateInspection: 更新抽检记录
 * - listInspections: 获取抽检列表
 * - uploadFile: 上传文件到云存储
 * - listApplications: 获取认证申请列表（平台运营）
 */
exports.main = async (event, context) => {
  const { action, data } = event

  try {
    switch (action) {
      case 'apply':
        return await applyCertification(data)
      
      case 'saveDraft':
        return await saveDraft(data)
      
      case 'systemEvaluate':
        return await systemEvaluate(data)
      
      case 'getStatus':
        return await getStatus(data)
      
      case 'getCertificate':
        return await getCertificate(data)
      
      case 'updateMaterials':
        return await updateMaterials(data)
      
      case 'getMaterialHistory':
        return await getMaterialHistory(data)
      
      case 'exportMaterials':
        return await exportMaterials(data)
      
      case 'review':
        return await review(data)
      
      case 'generateCertificate':
        return await generateCertificate(data)
      
      case 'createInspection':
        return await createInspection(data)
      
      case 'getInspection':
        return await getInspection(data)
      
      case 'updateInspection':
        return await updateInspection(data)
      
      case 'listInspections':
        return await listInspections(data)
      
      case 'uploadFile':
        return await uploadFile(data)
      
      case 'listApplications':
        return await listApplications(data)
      
      case 'getTrialData':
        return await getTrialData(data)
      
      case 'getRestaurantMenuItems':
        return await getRestaurantMenuItems(data)
      
      default:
        return {
          code: 400,
          message: '未知的操作类型',
          action
        }
    }
  } catch (error) {
    console.error('认证管理云函数执行失败:', error)
    return {
      code: 500,
      message: '操作失败，请重试',
      error: error.message
    }
  }
}

/**
 * 生成申请编号
 * 格式: APP-YYYYMMDD-XXXX
 */
function generateApplicationId() {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `APP-${dateStr}-${random}`
}

/**
 * 生成证书编号
 * 格式: CR-YYYYMMDD-XXXX
 */
function generateCertificateId() {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `CR-${dateStr}-${random}`
}

/**
 * 提交认证申请
 */
async function applyCertification(data) {
  const { restaurantId, tenantId, basicInfo, menuInfo, supplyChainInfo, operationData, documents } = data

  if (!restaurantId || !tenantId) {
    return {
      code: 400,
      message: '餐厅ID和租户ID不能为空'
    }
  }

  try {
    // 验证餐厅是否存在
    const restaurant = await db.collection('restaurants')
      .doc(restaurantId)
      .get()

    if (!restaurant.data) {
      return {
        code: 404,
        message: '餐厅不存在'
      }
    }

    // 检查是否已有待审核的申请
    const existingApplication = await db.collection('certification_applications')
      .where({
        restaurantId: restaurantId,
        status: _.in(['draft', 'submitted', 'reviewing'])
      })
      .get()

    if (existingApplication.data && existingApplication.data.length > 0) {
      return {
        code: 400,
        message: '该餐厅已有待审核的认证申请，请先完成或取消现有申请'
      }
    }

    // 生成申请编号
    const applicationId = generateApplicationId()

    // 创建认证申请记录
    const applicationData = {
      applicationId,
      restaurantId,
      tenantId,
      status: 'submitted',
      currentStage: 'systemEvaluation',
      basicInfo: basicInfo || {},
      menuInfo: menuInfo || {},
      supplyChainInfo: supplyChainInfo || {},
      operationData: operationData || {},
      documents: documents || [],
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('certification_applications')
      .add({
        data: applicationData
      })

    // 创建系统评估阶段记录
    await db.collection('certification_stages')
      .add({
        data: {
          applicationId: result._id,
          stageType: 'systemEvaluation',
          stageName: '系统评估',
          status: 'pending',
          startTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

    // 更新餐厅认证状态
    await db.collection('restaurants')
      .doc(restaurantId)
      .update({
        data: {
          certificationStatus: 'pending',
          updatedAt: new Date()
        }
      })

    // 触发消息通知
    try {
      await cloud.callFunction({
        name: 'message-event',
        data: {
          action: 'handleRestaurantCertApply',
          data: {
            restaurantId,
            applicationId: result._id,
            restaurantName: restaurant.data.name || '未知餐厅'
          }
        }
      })
    } catch (err) {
      console.error('触发消息通知失败:', err)
      // 不影响主流程，继续执行
    }

    // 自动触发系统评估
    try {
      await systemEvaluate({
        applicationId: result._id
      })
    } catch (err) {
      console.error('自动系统评估失败:', err)
      // 不影响主流程，可以后续手动触发
    }

    return {
      code: 0,
      message: '认证申请提交成功',
      data: {
        applicationId: result._id,
        applicationNumber: applicationId,
        status: 'submitted',
        submittedAt: applicationData.submittedAt
      }
    }
  } catch (error) {
    console.error('提交认证申请失败:', error)
    return {
      code: 500,
      message: '提交失败',
      error: error.message
    }
  }
}

/**
 * 保存草稿
 */
async function saveDraft(data) {
  const { restaurantId, tenantId, draftData, draftName } = data

  if (!restaurantId || !tenantId) {
    return {
      code: 400,
      message: '餐厅ID和租户ID不能为空'
    }
  }

  try {
    // 查找是否已有草稿
    const existingDraft = await db.collection('certification_applications')
      .where({
        restaurantId,
        status: 'draft'
      })
      .get()

    let result
    if (existingDraft.data && existingDraft.data.length > 0) {
      // 更新现有草稿
      const draftId = existingDraft.data[0]._id
      await db.collection('certification_applications')
        .doc(draftId)
        .update({
          data: {
            ...draftData,
            updatedAt: new Date()
          }
        })
      result = { _id: draftId }
    } else {
      // 创建新草稿
      const applicationId = generateApplicationId()
      const draftApplication = {
        applicationId,
        restaurantId,
        tenantId,
        status: 'draft',
        currentStage: 'draft',
        ...draftData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      result = await db.collection('certification_applications')
        .add({
          data: draftApplication
        })
    }

    return {
      code: 0,
      message: '草稿保存成功',
      data: {
        draftId: result._id,
        savedAt: new Date()
      }
    }
  } catch (error) {
    console.error('保存草稿失败:', error)
    return {
      code: 500,
      message: '保存失败',
      error: error.message
    }
  }
}

/**
 * 系统自动评估
 * 基于五大维度自动评分，生成达标报告
 */
async function systemEvaluate(data) {
  const { applicationId } = data

  if (!applicationId) {
    return {
      code: 400,
      message: '申请ID不能为空'
    }
  }

  try {
    // 获取认证申请
    const application = await db.collection('certification_applications')
      .doc(applicationId)
      .get()

    if (!application.data) {
      return {
        code: 404,
        message: '认证申请不存在'
      }
    }

    const appData = application.data

    // 五大维度评估权重
    const weights = {
      lowCarbonMenuRatio: 0.40,      // 低碳菜品占比 40%
      localIngredientRatio: 0.20,     // 本地食材占比 20%
      organicRatio: 0.15,             // 有机食材占比 15%
      foodWasteReduction: 0.15,       // 食物浪费减少 15%
      energyEfficiency: 0.10          // 能源效率 10%
    }

    // 评估五大维度
    const standards = {
      lowCarbonMenuRatio: evaluateLowCarbonMenu(appData.menuInfo),
      localIngredientRatio: evaluateLocalIngredient(appData.supplyChainInfo),
      organicRatio: evaluateOrganicIngredient(appData.supplyChainInfo),
      foodWasteReduction: evaluateFoodWaste(appData.operationData),
      energyEfficiency: evaluateEnergyEfficiency(appData.operationData)
    }

    // 计算总分
    const totalScore = 
      standards.lowCarbonMenuRatio.score * weights.lowCarbonMenuRatio +
      standards.localIngredientRatio.score * weights.localIngredientRatio +
      standards.organicRatio.score * weights.organicRatio +
      standards.foodWasteReduction.score * weights.foodWasteReduction +
      standards.energyEfficiency.score * weights.energyEfficiency

    // 检查是否达标（所有达标项必须满足，且总分 >= 80）
    const allPassed = Object.values(standards).every(s => s.passed)
    const scorePassed = totalScore >= 80

    // 生成改进建议
    const recommendations = generateRecommendations(standards)

    // 生成达标报告
    const report = {
      totalScore: Math.round(totalScore * 100) / 100,
      standards,
      weights,
      allPassed,
      scorePassed,
      passed: allPassed && scorePassed,
      recommendations,
      evaluatedAt: new Date()
    }

    // 更新认证申请的系统评估结果
    await db.collection('certification_applications')
      .doc(applicationId)
      .update({
        data: {
          systemEvaluation: {
            score: report.totalScore,
            report: JSON.stringify(report),
            evaluatedAt: new Date(),
            evaluatedBy: 'system'
          },
          updatedAt: new Date()
        }
      })

    // 更新认证阶段状态
    await db.collection('certification_stages')
      .where({
        applicationId: applicationId,
        stageType: 'systemEvaluation'
      })
      .update({
        data: {
          status: 'completed',
          endTime: new Date(),
          result: report.passed ? 'pass' : 'fail',
          comment: `系统评估得分: ${report.totalScore}分，${report.passed ? '通过' : '未通过'}`,
          updatedAt: new Date()
        }
      })

    // 如果系统评估通过，自动进入资料审查阶段
    if (report.passed) {
      await db.collection('certification_applications')
        .doc(applicationId)
        .update({
          data: {
            currentStage: 'documentReview',
            updatedAt: new Date()
          }
        })

      // 创建资料审查阶段记录
      await db.collection('certification_stages')
        .add({
          data: {
            applicationId: applicationId,
            stageType: 'documentReview',
            stageName: '资料审查',
            status: 'pending',
            startTime: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
    }

    return {
      code: 0,
      message: '系统评估完成',
      data: report
    }
  } catch (error) {
    console.error('系统评估失败:', error)
    return {
      code: 500,
      message: '评估失败',
      error: error.message
    }
  }
}

/**
 * 评估低碳菜品占比
 */
function evaluateLowCarbonMenu(menuInfo) {
  if (!menuInfo || !menuInfo.menuItems || menuInfo.menuItems.length === 0) {
    return {
      score: 0,
      passed: false,
      message: '菜单信息缺失',
      value: 0,
      threshold: 40
    }
  }

  // 计算低碳菜品占比（假设有 carbonLevel 字段）
  const totalItems = menuInfo.menuItems.length
  const lowCarbonItems = menuInfo.menuItems.filter(item => {
    const level = item.carbonLevel || item.carbon_level
    return level === 'ultra_low' || level === 'low'
  }).length

  const ratio = (lowCarbonItems / totalItems) * 100

  // 达标阈值: >= 40%
  const passed = ratio >= 40
  // 评分: 40%为60分，100%为100分
  const score = Math.min(100, 60 + (ratio - 40) * (40 / 60))

  return {
    score: Math.max(0, score),
    passed,
    message: passed ? '低碳菜品占比达标' : '低碳菜品占比未达标',
    value: Math.round(ratio * 100) / 100,
    threshold: 40
  }
}

/**
 * 评估本地食材占比
 */
function evaluateLocalIngredient(supplyChainInfo) {
  if (!supplyChainInfo || supplyChainInfo.localIngredientRatio === undefined) {
    return {
      score: 0,
      passed: false,
      message: '供应链信息缺失',
      value: 0,
      threshold: 30
    }
  }

  const ratio = supplyChainInfo.localIngredientRatio || 0

  // 达标阈值: >= 30%
  const passed = ratio >= 30
  // 评分: 30%为60分，100%为100分
  const score = Math.min(100, 60 + (ratio - 30) * (40 / 70))

  return {
    score: Math.max(0, score),
    passed,
    message: passed ? '本地食材占比达标' : '本地食材占比未达标',
    value: ratio,
    threshold: 30
  }
}

/**
 * 评估有机食材占比
 */
function evaluateOrganicIngredient(supplyChainInfo) {
  if (!supplyChainInfo) {
    return {
      score: 0,
      passed: false,
      message: '供应链信息缺失',
      value: 0,
      threshold: 0
    }
  }

  // 检查是否有有机认证
  const hasOrganicCert = supplyChainInfo.suppliers && supplyChainInfo.suppliers.some(s => {
    const certs = s.certifications || []
    return certs.some(c => c.includes('有机') || c.includes('organic'))
  })

  // 如果有有机认证，给予基础分
  const score = hasOrganicCert ? 80 : 50
  const passed = hasOrganicCert

  return {
    score,
    passed,
    message: passed ? '有机食材认证达标' : '缺少有机食材认证',
    value: hasOrganicCert ? 1 : 0,
    threshold: 1
  }
}

/**
 * 评估食物浪费减少
 */
function evaluateFoodWaste(operationData) {
  if (!operationData || !operationData.wasteReduction) {
    return {
      score: 0,
      passed: false,
      message: '食物浪费数据缺失',
      value: 0,
      threshold: 15
    }
  }

  // 解析浪费减少比例
  const wasteReduction = parseFloat(operationData.wasteReduction) || 0

  // 达标阈值: >= 15%
  const passed = wasteReduction >= 15
  // 评分: 15%为60分，50%为100分
  const score = Math.min(100, 60 + (wasteReduction - 15) * (40 / 35))

  return {
    score: Math.max(0, score),
    passed,
    message: passed ? '食物浪费减少达标' : '食物浪费减少未达标',
    value: wasteReduction,
    threshold: 15
  }
}

/**
 * 评估能源效率
 */
function evaluateEnergyEfficiency(operationData) {
  if (!operationData || !operationData.energyUsage) {
    return {
      score: 0,
      passed: false,
      message: '能源使用数据缺失',
      value: 0,
      threshold: 10
    }
  }

  // 检查是否有能源使用台账
  const hasEnergyRecord = operationData.energyUsage && operationData.energyUsage.length > 0

  // 检查是否有绿色能源使用证明
  const hasGreenEnergy = operationData.energyUsage && 
    (operationData.energyUsage.includes('绿色能源') || 
     operationData.energyUsage.includes('太阳能') ||
     operationData.energyUsage.includes('风能'))

  // 如果有绿色能源，给予高分
  const score = hasGreenEnergy ? 90 : (hasEnergyRecord ? 70 : 50)
  const passed = hasEnergyRecord || hasGreenEnergy

  return {
    score,
    passed,
    message: passed ? '能源效率达标' : '能源使用数据不完整',
    value: hasGreenEnergy ? 1 : (hasEnergyRecord ? 0.5 : 0),
    threshold: 1
  }
}

/**
 * 生成改进建议
 */
function generateRecommendations(standards) {
  const recommendations = []

  if (!standards.lowCarbonMenuRatio.passed) {
    recommendations.push('增加低碳菜品比例，确保低碳及以下菜品占比达到40%以上')
  }

  if (!standards.localIngredientRatio.passed) {
    recommendations.push('提高本地食材（≤100km）或可追溯低碳食材占比，确保达到30%以上')
  }

  if (!standards.organicRatio.passed) {
    recommendations.push('引入有机食材认证，提升食材质量')
  }

  if (!standards.foodWasteReduction.passed) {
    recommendations.push('建立浪费监测流程，设定月度浪费减量目标≥15%，并提供数据记录')
  }

  if (!standards.energyEfficiency.passed) {
    recommendations.push('建立能源使用台账，年度能源强度下降≥10%或提供绿色能源使用证明')
  }

  if (recommendations.length === 0) {
    recommendations.push('所有维度均达标，继续保持！')
  }

  return recommendations
}

/**
 * 获取认证状态
 */
async function getStatus(data) {
  const { restaurantId, applicationId } = data

  if (!restaurantId && !applicationId) {
    return {
      code: 400,
      message: '餐厅ID或申请ID不能为空'
    }
  }

  try {
    let application

    if (applicationId) {
      // 根据申请ID查询
      application = await db.collection('certification_applications')
        .doc(applicationId)
        .get()
    } else {
      // 根据餐厅ID查询最新的申请
      const applications = await db.collection('certification_applications')
        .where({
          restaurantId: restaurantId
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (applications.data && applications.data.length > 0) {
        application = { data: applications.data[0] }
      }
    }

    if (!application || !application.data) {
      return {
        code: 404,
        message: '未找到认证申请'
      }
    }

    const appData = application.data

    // 获取所有阶段记录
    const stages = await db.collection('certification_stages')
      .where({
        applicationId: application.data._id
      })
      .orderBy('startTime', 'asc')
      .get()

    // 格式化阶段数据
    const formattedStages = stages.data.map(stage => ({
      stageType: stage.stageType,
      stageName: stage.stageName,
      status: stage.status,
      startTime: stage.startTime,
      endTime: stage.endTime,
      result: stage.result,
      comment: stage.comment
    }))

    // 计算预计完成时间（根据当前阶段）
    let estimatedCompletion = null
    if (appData.status === 'reviewing') {
      // 审核中，预计7-10个工作日
      const estimated = new Date()
      estimated.setDate(estimated.getDate() + 7)
      estimatedCompletion = estimated
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        status: appData.status,
        currentStage: appData.currentStage,
        stages: formattedStages,
        estimatedCompletion,
        applicationId: appData.applicationId,
        submittedAt: appData.submittedAt
      }
    }
  } catch (error) {
    console.error('获取认证状态失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 获取证书信息
 */
async function getCertificate(data) {
  const { restaurantId, certificateId } = data

  if (!restaurantId && !certificateId) {
    return {
      code: 400,
      message: '餐厅ID或证书ID不能为空'
    }
  }

  try {
    let certificate

    if (certificateId) {
      certificate = await db.collection('certification_badges')
        .doc(certificateId)
        .get()
    } else {
      const certificates = await db.collection('certification_badges')
        .where({
          restaurantId: restaurantId,
          status: 'valid'
        })
        .orderBy('issueDate', 'desc')
        .limit(1)
        .get()

      if (certificates.data && certificates.data.length > 0) {
        certificate = { data: certificates.data[0] }
      }
    }

    if (!certificate || !certificate.data) {
      return {
        code: 404,
        message: '未找到证书'
      }
    }

    const certData = certificate.data

    // 计算距离到期天数
    const now = new Date()
    const expiryDate = new Date(certData.expiryDate)
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

    return {
      code: 0,
      message: '获取成功',
      data: {
        certificateId: certData._id,
        certificateNumber: certData.certificateId,
        certLevel: certData.certLevel || 'certified',
        issueDate: certData.issueDate,
        expiryDate: certData.expiryDate,
        status: certData.status,
        certificateFile: certData.certificateFile,
        shareLink: certData.shareLink,
        renewalRecords: certData.renewalRecords || [],
        daysUntilExpiry
      }
    }
  } catch (error) {
    console.error('获取证书信息失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 更新认证资料
 */
async function updateMaterials(data) {
  const { restaurantId, materialType, materialData, changeReason } = data

  if (!restaurantId || !materialType || !materialData) {
    return {
      code: 400,
      message: '参数不完整'
    }
  }

  try {
    // 获取当前版本号
    const latestVersion = await db.collection('certification_materials')
      .where({
        restaurantId: restaurantId,
        materialType: materialType
      })
      .orderBy('version', 'desc')
      .limit(1)
      .get()

    const nextVersion = latestVersion.data && latestVersion.data.length > 0
      ? latestVersion.data[0].version + 1
      : 1

    // 将旧版本标记为非当前版本
    if (latestVersion.data && latestVersion.data.length > 0) {
      await db.collection('certification_materials')
        .where({
          restaurantId: restaurantId,
          materialType: materialType,
          isCurrent: true
        })
        .update({
          data: {
            isCurrent: false,
            updatedAt: new Date()
          }
        })
    }

    // 创建新版本
    const result = await db.collection('certification_materials')
      .add({
        data: {
          restaurantId: restaurantId,
          materialType: materialType,
          materialData: materialData,
          version: nextVersion,
          changeReason: changeReason || '',
          changedBy: data.userId || 'system',
          changedAt: new Date(),
          reviewStatus: 'pending',
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

    return {
      code: 0,
      message: '资料更新成功',
      data: {
        materialId: result._id,
        version: nextVersion,
        changedAt: new Date()
      }
    }
  } catch (error) {
    console.error('更新认证资料失败:', error)
    return {
      code: 500,
      message: '更新失败',
      error: error.message
    }
  }
}

/**
 * 获取资料历史版本
 */
async function getMaterialHistory(data) {
  const { restaurantId, materialType } = data

  if (!restaurantId || !materialType) {
    return {
      code: 400,
      message: '参数不完整'
    }
  }

  try {
    const versions = await db.collection('certification_materials')
      .where({
        restaurantId: restaurantId,
        materialType: materialType
      })
      .orderBy('version', 'desc')
      .get()

    const formattedVersions = versions.data.map(v => ({
      version: v.version,
      materialData: v.materialData,
      changedBy: v.changedBy,
      changedAt: v.changedAt,
      changeReason: v.changeReason,
      reviewStatus: v.reviewStatus,
      isCurrent: v.isCurrent
    }))

    return {
      code: 0,
      message: '获取成功',
      data: {
        versions: formattedVersions
      }
    }
  } catch (error) {
    console.error('获取资料历史版本失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 导出认证资料
 */
async function exportMaterials(data) {
  const { restaurantId, format = 'pdf', fields } = data

  if (!restaurantId) {
    return {
      code: 400,
      message: '餐厅ID不能为空'
    }
  }

  try {
    // 获取认证申请
    const applications = await db.collection('certification_applications')
      .where({
        restaurantId: restaurantId
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    if (!applications.data || applications.data.length === 0) {
      return {
        code: 404,
        message: '未找到认证申请'
      }
    }

    const application = applications.data[0]

    // 这里应该生成PDF或Excel文件
    // 由于需要文件生成库，暂时返回数据，后续实现文件生成
    const exportData = {
      applicationId: application.applicationId,
      restaurantId: application.restaurantId,
      basicInfo: application.basicInfo,
      menuInfo: application.menuInfo,
      supplyChainInfo: application.supplyChainInfo,
      operationData: application.operationData,
      systemEvaluation: application.systemEvaluation,
      exportedAt: new Date()
    }

    // TODO: 实现PDF/Excel文件生成并上传到云存储
    // 暂时返回数据
    return {
      code: 0,
      message: '导出成功（待实现文件生成）',
      data: {
        exportData,
        format,
        note: '文件生成功能待实现'
      }
    }
  } catch (error) {
    console.error('导出认证资料失败:', error)
    return {
      code: 500,
      message: '导出失败',
      error: error.message
    }
  }
}

/**
 * 审核操作（平台运营）
 */
async function review(data) {
  const { applicationId, stage, result, comment, attachments } = data

  if (!applicationId || !stage || !result) {
    return {
      code: 400,
      message: '参数不完整'
    }
  }

  try {
    // 获取认证申请
    const application = await db.collection('certification_applications')
      .doc(applicationId)
      .get()

    if (!application.data) {
      return {
        code: 404,
        message: '认证申请不存在'
      }
    }

    // 更新阶段记录
    await db.collection('certification_stages')
      .where({
        applicationId: applicationId,
        stageType: stage
      })
      .update({
        data: {
          status: 'completed',
          endTime: new Date(),
          result: result,
          comment: comment || '',
          attachments: attachments || [],
          operatorId: data.reviewerId || 'system',
          operatorName: data.reviewerName || '系统',
          updatedAt: new Date()
        }
      })

    // 更新申请状态
    let nextStage = null
    let newStatus = application.data.status

    if (result === 'approved') {
      if (stage === 'documentReview') {
        // 资料审查通过，进入现场核查或复评
        nextStage = 'onSiteInspection' // 或直接进入复评
        newStatus = 'reviewing'
      } else if (stage === 'onSiteInspection') {
        // 现场核查通过，进入复评
        nextStage = 'review'
        newStatus = 'reviewing'
      } else if (stage === 'review') {
        // 复评通过，生成证书
        newStatus = 'approved'
        // 自动生成证书
        await generateCertificate({ applicationId })
      }
    } else if (result === 'rejected') {
      newStatus = 'rejected'
    }

    // 更新申请记录
    const updateData = {
      status: newStatus,
      updatedAt: new Date()
    }

    if (nextStage) {
      updateData.currentStage = nextStage
      // 创建下一阶段记录
      await db.collection('certification_stages')
        .add({
          data: {
            applicationId: applicationId,
            stageType: nextStage,
            stageName: getStageName(nextStage),
            status: 'pending',
            startTime: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
    }

    await db.collection('certification_applications')
      .doc(applicationId)
      .update({
        data: updateData
      })

    // 添加审核记录
    await db.collection('certification_applications')
      .doc(applicationId)
      .update({
        data: {
          reviewRecords: _.push([{
            stage: stage,
            reviewerId: data.reviewerId || 'system',
            reviewerName: data.reviewerName || '系统',
            reviewResult: result,
            reviewComment: comment || '',
            reviewedAt: new Date()
          }])
        }
      })

    return {
      code: 0,
      message: '审核完成',
      data: {
        reviewId: applicationId,
        reviewedAt: new Date()
      }
    }
  } catch (error) {
    console.error('审核操作失败:', error)
    return {
      code: 500,
      message: '审核失败',
      error: error.message
    }
  }
}

/**
 * 获取阶段名称
 */
function getStageName(stageType) {
  const stageNames = {
    systemEvaluation: '系统评估',
    documentReview: '资料审查',
    onSiteInspection: '现场核查',
    review: '复评'
  }
  return stageNames[stageType] || stageType
}

/**
 * 生成证书
 */
async function generateCertificate(data) {
  const { applicationId } = data

  if (!applicationId) {
    return {
      code: 400,
      message: '申请ID不能为空'
    }
  }

  try {
    // 获取认证申请
    const application = await db.collection('certification_applications')
      .doc(applicationId)
      .get()

    if (!application.data) {
      return {
        code: 404,
        message: '认证申请不存在'
      }
    }

    const appData = application.data

    // 检查是否已生成证书
    const existingCertificate = await db.collection('certification_badges')
      .where({
        applicationId: applicationId
      })
      .get()

    if (existingCertificate.data && existingCertificate.data.length > 0) {
      return {
        code: 400,
        message: '证书已存在',
        data: {
          certificateId: existingCertificate.data[0]._id
        }
      }
    }

    // 生成证书编号
    const certificateId = generateCertificateId()

    // 计算有效期（1年）
    const issueDate = new Date()
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    // 获取餐厅信息
    const restaurant = await db.collection('restaurants')
      .doc(appData.restaurantId)
      .get()

    const restaurantName = restaurant.data?.name || '未知餐厅'

    // 生成分享链接
    const shareLink = `https://mygarden.app/cert/${certificateId}`

    // 生成二维码
    const qrCodeDataURL = await QRCode.toDataURL(shareLink)
    const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64')
    const qrCodeCloudPath = `certificates/qrcodes/${certificateId}.png`
    const qrCodeUploadRes = await cloud.uploadFile({
      cloudPath: qrCodeCloudPath,
      fileContent: qrCodeBuffer,
    })
    const qrCodeFileID = qrCodeUploadRes.fileID

    // 生成PDF证书
    const pdfBuffer = await generateCertificatePDF({
      certificateNumber: certificateId,
      restaurantName: restaurantName,
      issueDate: issueDate,
      expiryDate: expiryDate,
      qrCodeDataURL: qrCodeDataURL
    })

    // 上传PDF到云存储
    const pdfCloudPath = `certificates/pdfs/${certificateId}.pdf`
    const pdfUploadRes = await cloud.uploadFile({
      cloudPath: pdfCloudPath,
      fileContent: pdfBuffer,
    })
    const pdfFileID = pdfUploadRes.fileID

    // 创建证书记录
    const certificateData = {
      certificateId,
      restaurantId: appData.restaurantId,
      applicationId: applicationId,
      certLevel: 'certified', // 单级认证，统一为 certified
      issueDate: issueDate,
      expiryDate: expiryDate,
      issuedBy: '我的花园平台',
      status: 'valid',
      certificateFile: pdfFileID,
      certificateQRCode: qrCodeFileID,
      shareLink: shareLink,
      renewalRecords: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('certification_badges')
      .add({
        data: certificateData
      })

    // 更新餐厅认证信息
    await db.collection('restaurants')
      .doc(appData.restaurantId)
      .update({
        data: {
          certificationStatus: 'approved',
          certificationLevel: 'certified',
          'climateCertification.isCertified': true,
          'climateCertification.certificationLevel': 'certified',
          'climateCertification.certifiedDate': issueDate,
          'climateCertification.certifiedBy': '我的花园平台',
          'climateCertification.certificateNumber': certificateId,
          'climateCertification.expiryDate': expiryDate,
          updatedAt: new Date()
        }
      })

    // 更新申请状态
    await db.collection('certification_applications')
      .doc(applicationId)
      .update({
        data: {
          status: 'approved',
          approvedAt: issueDate,
          updatedAt: new Date()
        }
      })

    return {
      code: 0,
      message: '证书生成成功',
      data: {
        certificateId: result._id,
        certificateNumber: certificateId,
        certificateFile: certificateData.certificateFile,
        shareLink: certificateData.shareLink
      }
    }
  } catch (error) {
    console.error('生成证书失败:', error)
    return {
      code: 500,
      message: '生成失败',
      error: error.message
    }
  }
}

/**
 * 生成证书PDF
 */
async function generateCertificatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const { certificateNumber, restaurantName, issueDate, expiryDate, qrCodeDataURL } = data

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      })

      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // 标题
      doc.fontSize(28)
        .font('Helvetica-Bold')
        .text('气候餐厅认证证书', { align: 'center' })
        .moveDown(1)

      // 证书编号
      doc.fontSize(12)
        .font('Helvetica')
        .text(`证书编号: ${certificateNumber}`, { align: 'center' })
        .moveDown(2)

      // 正文
      doc.fontSize(16)
        .font('Helvetica')
        .text('兹证明', { align: 'center' })
        .moveDown(0.5)

      doc.fontSize(24)
        .font('Helvetica-Bold')
        .text(restaurantName, { align: 'center' })
        .moveDown(1)

      doc.fontSize(16)
        .font('Helvetica')
        .text('已通过"我的花园"平台气候餐厅认证，符合以下标准：', { align: 'center' })
        .moveDown(1)

      // 认证标准列表
      const standards = [
        '✓ 低碳菜品占比达到40%以上',
        '✓ 本地食材占比达到30%以上',
        '✓ 建立能源使用台账或使用绿色能源',
        '✓ 食物浪费减少15%以上',
        '✓ 提供社会传播与教育举措'
      ]

      doc.fontSize(14)
        .font('Helvetica')
      standards.forEach(standard => {
        doc.text(standard, { align: 'left', indent: 50 })
        doc.moveDown(0.5)
      })

      doc.moveDown(1)

      // 有效期
      doc.fontSize(14)
        .font('Helvetica')
        .text(`有效期: ${formatDate(issueDate)} 至 ${formatDate(expiryDate)}`, { align: 'center' })
        .moveDown(2)

      // 二维码
      if (qrCodeDataURL) {
        const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64')
        doc.image(qrCodeBuffer, {
          fit: [100, 100],
          align: 'center'
        })
        doc.moveDown(0.5)
        doc.fontSize(10)
          .font('Helvetica')
          .text('扫描二维码验证证书', { align: 'center' })
      }

      // 签名区域
      doc.moveDown(2)
      doc.fontSize(12)
        .font('Helvetica')
        .text('我的花园平台', { align: 'right' })
        .moveDown(0.5)
        .text(formatDate(issueDate), { align: 'right' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

/**
 * 创建抽检任务（平台运营）
 */
async function createInspection(data) {
  const { applicationId, inspectionType, inspectorId, inspectorName, riskItems, scheduledDate } = data

  if (!applicationId || !inspectionType || !inspectorId) {
    return {
      code: 400,
      message: '参数不完整'
    }
  }

  try {
    // 获取认证申请
    const application = await db.collection('certification_applications')
      .doc(applicationId)
      .get()

    if (!application.data) {
      return {
        code: 404,
        message: '认证申请不存在'
      }
    }

    const appData = application.data

    // 创建抽检记录
    const inspectionData = {
      applicationId: applicationId,
      restaurantId: appData.restaurantId,
      inspectionType: inspectionType, // remote/onSite
      inspectorId: inspectorId,
      inspectorName: inspectorName || '未知',
      riskItems: riskItems || [], // 高风险项列表
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      status: 'pending', // pending/in_progress/completed
      inspectionResult: null, // pass/fail
      inspectionReport: null,
      photos: [],
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('certification_inspections')
      .add({
        data: inspectionData
      })

    // 更新餐厅的抽检记录
    await db.collection('restaurants')
      .doc(appData.restaurantId)
      .update({
        data: {
          'climateCertification.inspectionRecords': _.push([{
            inspectionType: inspectionType,
            inspectorId: inspectorId,
            inspectionDate: inspectionData.scheduledDate,
            inspectionResult: null,
            inspectionReport: null,
            photos: []
          }]),
          updatedAt: new Date()
        }
      })

    return {
      code: 0,
      message: '抽检任务创建成功',
      data: {
        inspectionId: result._id,
        scheduledDate: inspectionData.scheduledDate
      }
    }
  } catch (error) {
    console.error('创建抽检任务失败:', error)
    return {
      code: 500,
      message: '创建失败',
      error: error.message
    }
  }
}

/**
 * 获取抽检记录
 */
async function getInspection(data) {
  const { inspectionId, applicationId } = data

  if (!inspectionId && !applicationId) {
    return {
      code: 400,
      message: '抽检ID或申请ID不能为空'
    }
  }

  try {
    let inspection

    if (inspectionId) {
      inspection = await db.collection('certification_inspections')
        .doc(inspectionId)
        .get()
    } else {
      const inspections = await db.collection('certification_inspections')
        .where({
          applicationId: applicationId
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (inspections.data && inspections.data.length > 0) {
        inspection = { data: inspections.data[0] }
      }
    }

    if (!inspection || !inspection.data) {
      return {
        code: 404,
        message: '未找到抽检记录'
      }
    }

    return {
      code: 0,
      message: '获取成功',
      data: inspection.data
    }
  } catch (error) {
    console.error('获取抽检记录失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 更新抽检记录
 */
async function updateInspection(data) {
  const { inspectionId, status, inspectionResult, inspectionReport, photos, notes } = data

  if (!inspectionId) {
    return {
      code: 400,
      message: '抽检ID不能为空'
    }
  }

  try {
    // 获取抽检记录
    const inspection = await db.collection('certification_inspections')
      .doc(inspectionId)
      .get()

    if (!inspection.data) {
      return {
        code: 404,
        message: '抽检记录不存在'
      }
    }

    const updateData = {
      updatedAt: new Date()
    }

    if (status !== undefined) updateData.status = status
    if (inspectionResult !== undefined) updateData.inspectionResult = inspectionResult
    if (inspectionReport !== undefined) updateData.inspectionReport = inspectionReport
    if (photos !== undefined) updateData.photos = photos
    if (notes !== undefined) updateData.notes = notes

    // 如果抽检完成，更新完成时间
    if (status === 'completed') {
      updateData.completedAt = new Date()
    }

    await db.collection('certification_inspections')
      .doc(inspectionId)
      .update({
        data: updateData
      })

    // 如果抽检完成，更新餐厅的抽检记录
    if (status === 'completed' && inspectionResult) {
      const inspectionData = inspection.data
      await db.collection('restaurants')
        .doc(inspectionData.restaurantId)
        .update({
          data: {
            'climateCertification.inspectionRecords': _.push([{
              inspectionType: inspectionData.inspectionType,
              inspectorId: inspectionData.inspectorId,
              inspectionDate: updateData.completedAt || new Date(),
              inspectionResult: inspectionResult,
              inspectionReport: inspectionReport,
              photos: photos || []
            }]),
            updatedAt: new Date()
          }
        })

      // 如果抽检通过，创建现场核查阶段记录（如果还没有）
      if (inspectionResult === 'pass' && inspectionData.inspectionType === 'onSite') {
        await db.collection('certification_stages')
          .where({
            applicationId: inspectionData.applicationId,
            stageType: 'onSiteInspection'
          })
          .update({
            data: {
              status: 'completed',
              endTime: new Date(),
              result: 'pass',
              comment: inspectionReport || '现场核查通过',
              updatedAt: new Date()
            }
          })
      }
    }

    return {
      code: 0,
      message: '抽检记录更新成功',
      data: {
        inspectionId: inspectionId,
        updatedAt: updateData.updatedAt
      }
    }
  } catch (error) {
    console.error('更新抽检记录失败:', error)
    return {
      code: 500,
      message: '更新失败',
      error: error.message
    }
  }
}

/**
 * 获取抽检列表
 */
async function listInspections(data) {
  const { applicationId, restaurantId, status, inspectionType, page = 1, pageSize = 20 } = data

  try {
    let query = db.collection('certification_inspections')

    // 构建查询条件
    const whereConditions = {}
    if (applicationId) whereConditions.applicationId = applicationId
    if (restaurantId) whereConditions.restaurantId = restaurantId
    if (status) whereConditions.status = status
    if (inspectionType) whereConditions.inspectionType = inspectionType

    if (Object.keys(whereConditions).length > 0) {
      query = query.where(whereConditions)
    }

    // 分页查询
    const totalResult = await query.count()
    const total = totalResult.total

    const inspections = await query
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      message: '获取成功',
      data: {
        list: inspections.data || [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    }
  } catch (error) {
    console.error('获取抽检列表失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 上传文件到云存储
 */
async function uploadFile(data) {
  const { base64, fileName, fileType, documentType } = data

  if (!base64 || !fileName) {
    return {
      code: 400,
      message: '文件数据或文件名不能为空'
    }
  }

  try {
    // 解析 base64 数据
    const content = base64.includes(',') ? base64.split(',')[1] : base64
    const buffer = Buffer.from(content, 'base64')

    // 生成云存储路径
    const timestamp = Date.now()
    const ext = fileName.split('.').pop() || 'file'
    const cloudPath = `certification/${documentType || 'documents'}/${timestamp}_${fileName}`

    // 上传到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: buffer,
    })

    const fileID = uploadRes.fileID

    // 获取临时访问URL
    let tempUrl = fileID
    try {
      const urlRes = await cloud.getTempFileURL({ fileList: [fileID] })
      tempUrl = urlRes?.fileList?.[0]?.tempFileURL || fileID
    } catch (err) {
      console.error('获取临时URL失败:', err)
    }

    return {
      code: 0,
      message: '上传成功',
      data: {
        fileID,
        url: tempUrl,
        cloudPath,
        fileName,
        fileType: fileType || ext,
        uploadedAt: new Date()
      }
    }
  } catch (error) {
    console.error('文件上传失败:', error)
    return {
      code: 500,
      message: '上传失败',
      error: error.message
    }
  }
}

/**
 * 获取认证申请列表（平台运营）
 */
async function listApplications(data) {
  const { 
    status, 
    currentStage, 
    restaurantId, 
    tenantId,
    page = 1, 
    pageSize = 20,
    startDate,
    endDate
  } = data

  try {
    let query = db.collection('certification_applications')

    // 构建查询条件
    const whereConditions = {}
    if (status) whereConditions.status = status
    if (currentStage) whereConditions.currentStage = currentStage
    if (restaurantId) whereConditions.restaurantId = restaurantId
    if (tenantId) whereConditions.tenantId = tenantId
    
    // 日期范围查询
    if (startDate || endDate) {
      if (startDate && endDate) {
        whereConditions.submittedAt = _.and(
          _.gte(new Date(startDate)),
          _.lte(new Date(endDate))
        )
      } else if (startDate) {
        whereConditions.submittedAt = _.gte(new Date(startDate))
      } else if (endDate) {
        whereConditions.submittedAt = _.lte(new Date(endDate))
      }
    }

    if (Object.keys(whereConditions).length > 0) {
      query = query.where(whereConditions)
    }

    // 分页查询
    const totalResult = await query.count()
    const total = totalResult.total

    const applications = await query
      .orderBy('submittedAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    // 获取餐厅信息
    const restaurantIds = [...new Set(applications.data.map((app) => app.restaurantId))]
    const restaurants = await Promise.all(
      restaurantIds.map(async (id) => {
        try {
          const res = await db.collection('restaurants').doc(id).get()
          return res.data ? { id, ...res.data } : null
        } catch {
          return null
        }
      })
    )
    const restaurantMap = new Map(restaurants.filter(Boolean).map((r) => [r.id, r]))

    // 格式化数据
    const formattedApplications = applications.data.map((app) => {
      const restaurant = restaurantMap.get(app.restaurantId)
      return {
        id: app._id,
        applicationId: app.applicationId,
        applicationNumber: app.applicationNumber,
        restaurantId: app.restaurantId,
        restaurantName: restaurant?.name || '未知餐厅',
        tenantId: app.tenantId,
        status: app.status,
        currentStage: app.currentStage,
        submittedAt: app.submittedAt,
        systemEvaluation: app.systemEvaluation,
        reviewRecords: app.reviewRecords || []
      }
    })

    return {
      code: 0,
      message: '获取成功',
      data: {
        list: formattedApplications,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    }
  } catch (error) {
    console.error('获取申请列表失败:', error)
    return {
      code: 500,
      message: '获取失败',
      error: error.message
    }
  }
}

/**
 * 获取试运营数据
 * 用于在认证申请时自动填充试运营期间积累的数据
 */
async function getTrialData(data) {
  const { restaurantId, tenantId } = data

  if (!restaurantId || !tenantId) {
    return {
      code: 400,
      message: '餐厅ID和租户ID不能为空'
    }
  }

  try {
    // 0. 获取餐厅信息（包含试运营期限）
    const restaurantResult = await db.collection('restaurants')
      .doc(restaurantId)
      .get()
    
    const restaurant = restaurantResult.data
    const trialStartDate = restaurant?.trialStartDate || null
    const trialEndDate = restaurant?.trialEndDate || null
    
    // 计算剩余天数
    let daysRemaining = null
    if (trialEndDate) {
      const endDate = new Date(trialEndDate)
      const now = new Date()
      const diffTime = endDate.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // 1. 获取菜单数据
    const menuItemsResult = await db.collection('restaurant_menu_items')
      .where({
        restaurantId: restaurantId,
        status: 'active'
      })
      .get()

    const menuItems = menuItemsResult.data.map(item => ({
      name: item.name || item.dishName,
      ingredients: item.ingredients ? (Array.isArray(item.ingredients) ? item.ingredients.join(',') : item.ingredients) : '',
      quantity: item.quantity || item.portion || 1,
      unit: item.unit || '份',
      cookingMethod: item.cookingMethod || 'steamed',
      carbonFootprint: item.carbonFootprint || 0,
      salesCount: item.salesCount || 0
    }))

    // 2. 获取订单数据（最近30天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const ordersResult = await db.collection('restaurant_orders')
      .where({
        restaurantId: restaurantId,
        createdAt: _.gte(thirtyDaysAgo)
      })
      .get()

    const orders = ordersResult.data || []
    const totalOrders = orders.length
    const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)

    // 计算低碳菜品占比（基于订单中的菜品）
    let lowCarbonDishCount = 0
    let totalDishCount = 0
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          totalDishCount++
          // 假设碳足迹低于阈值的为低碳菜品（阈值可配置，这里假设为2.0 kg CO2e）
          if (item.carbonFootprint && item.carbonFootprint < 2.0) {
            lowCarbonDishCount++
          }
        })
      }
    })
    const lowCarbonMenuRatio = totalDishCount > 0 ? (lowCarbonDishCount / totalDishCount * 100).toFixed(2) : 0

    // 3. 获取供应链数据（从suppliers集合或restaurant_suppliers）
    let suppliers = []
    let localIngredientRatio = 0
    try {
      const suppliersResult = await db.collection('suppliers')
        .where({
          restaurantId: restaurantId
        })
        .get()
      suppliers = suppliersResult.data.map(s => ({
        name: s.name || s.supplierName,
        address: s.address,
        distance: s.distance || 0, // 距离（km）
        isLocal: s.distance && s.distance <= 100
      }))
      
      // 计算本地食材占比（距离<=100km的供应商）
      const localSuppliers = suppliers.filter(s => s.isLocal)
      localIngredientRatio = suppliers.length > 0 ? (localSuppliers.length / suppliers.length * 100).toFixed(2) : 0
    } catch (error) {
      console.log('获取供应商数据失败:', error)
    }

    // 4. 获取运营数据（能源、浪费等，从restaurant_operation_data或相关集合）
    let energyUsage = ''
    let wasteReduction = ''
    let socialInitiatives = []
    try {
      // 这里假设有运营数据集合，实际需要根据数据库结构调整
      // const operationDataResult = await db.collection('restaurant_operation_data')
      //   .where({ restaurantId: restaurantId })
      //   .get()
      // 暂时返回空数据，后续可以根据实际数据结构补充
    } catch (error) {
      console.log('获取运营数据失败:', error)
    }

    // 5. 计算碳足迹统计
    const totalCarbonFootprint = orders.reduce((sum, order) => {
      if (order.items && Array.isArray(order.items)) {
        return sum + order.items.reduce((itemSum, item) => itemSum + (item.carbonFootprint || 0), 0)
      }
      return sum
    }, 0)

    return {
      code: 0,
      message: '获取试运营数据成功',
      data: {
        menuInfo: {
          menuItems: menuItems,
          totalDishes: menuItems.length
        },
        orderInfo: {
          totalOrders: totalOrders,
          totalAmount: totalAmount,
          lowCarbonMenuRatio: parseFloat(lowCarbonMenuRatio),
          period: '30天'
        },
        supplyChainInfo: {
          suppliers: suppliers,
          localIngredientRatio: parseFloat(localIngredientRatio),
          totalSuppliers: suppliers.length
        },
        operationData: {
          energyUsage: energyUsage,
          wasteReduction: wasteReduction,
          socialInitiatives: socialInitiatives
        },
        carbonFootprint: {
          totalCarbonFootprint: totalCarbonFootprint,
          averagePerOrder: totalOrders > 0 ? (totalCarbonFootprint / totalOrders).toFixed(2) : 0
        },
        trialPeriod: {
          startDate: trialStartDate,
          endDate: trialEndDate,
          daysRemaining: daysRemaining
        }
      }
    }
  } catch (error) {
    console.error('获取试运营数据失败:', error)
    return {
      code: 500,
      message: '获取试运营数据失败',
      error: error.message
    }
  }
}

/**
 * 获取餐厅菜单项（用于认证申请时导入）
 * 从 restaurant_menu_items 集合查询当前餐厅的所有激活菜品
 */
async function getRestaurantMenuItems(data) {
  const { restaurantId } = data

  if (!restaurantId) {
    return {
      code: 400,
      message: '餐厅ID不能为空'
    }
  }

  try {
    // 从 restaurant_menu_items 集合查询餐厅的菜单项
    const menuItemsResult = await db.collection('restaurant_menu_items')
      .where({
        restaurantId: restaurantId,
        status: 'active' // 只获取激活状态的菜品
      })
      .orderBy('createdAt', 'desc')
      .get()

    const menuItems = menuItemsResult.data.map(item => ({
      id: item._id || item.id,
      name: item.name || item.dishName || '未命名菜品',
      ingredients: item.ingredients 
        ? (Array.isArray(item.ingredients) 
          ? item.ingredients.map((ing) => typeof ing === 'string' ? ing : (ing.name || ing)).join(',')
          : item.ingredients)
        : '',
      quantity: item.quantity || item.portion || 1,
      unit: item.unit || '份',
      cookingMethod: item.cookingMethod || 'steamed',
      carbonFootprint: item.carbonFootprint || 0,
    }))

    return {
      code: 0,
      message: '获取成功',
      data: {
        menuItems: menuItems,
        total: menuItems.length
      }
    }
  } catch (error) {
    console.error('获取餐厅菜单项失败:', error)
    return {
      code: 500,
      message: '获取餐厅菜单项失败',
      error: error.message
    }
  }
}

