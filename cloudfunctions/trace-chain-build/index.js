/**
 * 溯源链构建云函数
 * 
 * 功能:
 * 1. 构建溯源链
 * 2. 验证溯源链
 * 3. 更新溯源链
 * 4. 计算信任度评分
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 生成溯源链ID
 */
function generateTraceId() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `TRACE-${dateStr}-${random}`
}

/**
 * 生成节点ID
 */
function generateNodeId() {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `NODE-${dateStr}-${random}`
}

/**
 * 计算信任度评分
 */
function calculateTrustScore(traceChain, nodes) {
  let completeness = 0
  let certification = 0
  let verification = 0
  let timeliness = 0

  // 完整性评分（节点数量、证据完整性）
  const expectedNodeTypes = ['supplier', 'processor', 'transport', 'restaurant']
  const actualNodeTypes = nodes.map(n => n.nodeType)
  const nodeTypeCoverage = expectedNodeTypes.filter(type => actualNodeTypes.includes(type)).length / expectedNodeTypes.length
  const evidenceCount = nodes.reduce((sum, n) => sum + (n.evidence?.length || 0), 0)
  const evidenceScore = Math.min(evidenceCount / nodes.length, 1) * 0.5
  completeness = (nodeTypeCoverage * 0.5 + evidenceScore) * 100

  // 认证评分（认证证书数量）
  const certificationCount = nodes.reduce((sum, n) => sum + (n.certifications?.length || 0), 0)
  certification = Math.min(certificationCount / nodes.length * 2, 1) * 100

  // 验证评分（已验证节点比例）
  const verifiedCount = nodes.filter(n => n.isVerified).length
  verification = (verifiedCount / nodes.length) * 100

  // 时效性评分（时间间隔合理性）
  if (nodes.length > 1) {
    const sortedNodes = nodes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    let timeScore = 1
    for (let i = 1; i < sortedNodes.length; i++) {
      const timeDiff = new Date(sortedNodes[i].timestamp) - new Date(sortedNodes[i - 1].timestamp)
      // 时间间隔应在合理范围内（1小时到30天）
      if (timeDiff < 3600000 || timeDiff > 2592000000) {
        timeScore -= 0.1
      }
    }
    timeliness = Math.max(timeScore, 0) * 100
  } else {
    timeliness = 50
  }

  // 综合评分（加权平均）
  const trustScore = Math.round(
    completeness * 0.4 +
    certification * 0.3 +
    verification * 0.2 +
    timeliness * 0.1
  )

  return {
    trustScore: Math.max(0, Math.min(100, trustScore)),
    trustScoreFactors: {
      completeness: Math.round(completeness),
      certification: Math.round(certification),
      verification: Math.round(verification),
      timeliness: Math.round(timeliness)
    }
  }
}

/**
 * 构建溯源链
 */
async function buildTraceChain(traceChainData) {
  try {
    const now = new Date()
    const traceId = generateTraceId()

    // 创建节点
    const nodeIds = []
    const nodes = []

    for (const nodeData of traceChainData.nodes) {
      const nodeId = generateNodeId()
      nodeIds.push(nodeId)

      const node = {
        tenantId: traceChainData.tenantId,
        nodeId: nodeId,
        traceId: traceId,
        nodeType: nodeData.nodeType,
        nodeOrder: nodeData.nodeOrder,
        nodeName: nodeData.nodeName || '',
        nodeDescription: nodeData.nodeDescription || '',
        entityType: nodeData.entityType || '',
        entityId: nodeData.entityId || '',
        timestamp: new Date(nodeData.timestamp),
        duration: nodeData.duration || 0,
        location: nodeData.location || {},
        operation: nodeData.operation || {},
        evidence: nodeData.evidence || [],
        certifications: nodeData.certifications || [],
        carbonFootprint: nodeData.carbonFootprint || { value: 0 },
        quality: nodeData.quality || {},
        status: 'active',
        isVerified: nodeData.isVerified || false,
        verifiedAt: nodeData.verifiedAt ? new Date(nodeData.verifiedAt) : null,
        verifiedBy: nodeData.verifiedBy || '',
        createdAt: now,
        createdBy: traceChainData.createdBy || 'system',
        updatedAt: now,
        updatedBy: traceChainData.updatedBy || 'system',
        version: 1,
        isDeleted: false
      }

      nodes.push(node)

      // 插入节点
      await db.collection('trace_nodes').add({ data: node })
    }

    // 计算信任度评分
    const trustScoreResult = calculateTrustScore(traceChainData, nodes)

    // 计算总碳足迹
    const totalCarbonFootprint = nodes.reduce((sum, n) => sum + (n.carbonFootprint?.value || 0), 0)
    const carbonBreakdown = {
      production: nodes.filter(n => n.nodeType === 'supplier' || n.nodeType === 'processor')
        .reduce((sum, n) => sum + (n.carbonFootprint?.value || 0), 0),
      transport: nodes.filter(n => n.nodeType === 'transport')
        .reduce((sum, n) => sum + (n.carbonFootprint?.value || 0), 0),
      processing: nodes.filter(n => n.nodeType === 'processor')
        .reduce((sum, n) => sum + (n.carbonFootprint?.value || 0), 0),
      storage: 0,
      other: nodes.filter(n => !['supplier', 'processor', 'transport', 'restaurant'].includes(n.nodeType))
        .reduce((sum, n) => sum + (n.carbonFootprint?.value || 0), 0)
    }

    // 获取菜品名称（冗余字段）
    let menuItemName = traceChainData.menuItemName || ''
    if (traceChainData.menuItemId && !menuItemName) {
      const menuItemResult = await db.collection('restaurant_menu_items')
        .doc(traceChainData.menuItemId)
        .get()
      if (menuItemResult.data) {
        menuItemName = menuItemResult.data.name || ''
      }
    }

    // 创建溯源链
    const traceChain = {
      tenantId: traceChainData.tenantId,
      traceId: traceId,
      menuItemId: traceChainData.menuItemId,
      menuItemName: menuItemName,
      lotId: traceChainData.lotId,
      restaurantId: traceChainData.restaurantId,
      chainType: traceChainData.chainType || 'full',
      traceabilityLevel: nodes.length >= 4 ? 'complete' : nodes.length >= 2 ? 'partial' : 'minimal',
      nodeCount: nodes.length,
      nodeIds: nodeIds,
      trustScore: trustScoreResult.trustScore,
      trustScoreFactors: trustScoreResult.trustScoreFactors,
      carbonFootprint: {
        total: totalCarbonFootprint,
        breakdown: carbonBreakdown
      },
      status: 'draft',
      verificationStatus: 'pending',
      verifiedAt: null,
      verifiedBy: '',
      share: {
        qrCode: '',
        shareUrl: '',
        shareCount: 0,
        viewCount: 0
      },
      createdAt: now,
      createdBy: traceChainData.createdBy || 'system',
      updatedAt: now,
      updatedBy: traceChainData.updatedBy || 'system',
      version: 1,
      isDeleted: false
    }

    const result = await db.collection('trace_chains').add({ data: traceChain })

    return {
      code: 0,
      message: '构建成功',
      data: {
        _id: result._id,
        traceId: traceId,
        trustScore: trustScoreResult.trustScore,
        nodeCount: nodes.length
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '构建失败',
      error: error.message
    }
  }
}

/**
 * 验证溯源链
 */
async function verifyTraceChain(traceId, tenantId, verificationData) {
  try {
    const now = new Date()

    const updateFields = {
      verificationStatus: verificationData.verificationResult,
      verifiedAt: now,
      verifiedBy: verificationData.verifiedBy,
      status: verificationData.verificationResult === 'verified' ? 'active' : 'draft',
      updatedAt: now
    }

    const result = await db.collection('trace_chains')
      .where({
        traceId: traceId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: updateFields
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '溯源链不存在'
      }
    }

    // 如果验证通过，更新所有节点的验证状态
    if (verificationData.verificationResult === 'verified') {
      const traceChainResult = await db.collection('trace_chains')
        .where({ traceId: traceId, tenantId: tenantId })
        .get()

      if (traceChainResult.data.length > 0) {
        const nodeIds = traceChainResult.data[0].nodeIds || []
        for (const nodeId of nodeIds) {
          await db.collection('trace_nodes')
            .where({ nodeId: nodeId, tenantId: tenantId })
            .update({
              data: {
                isVerified: true,
                verifiedAt: now,
                verifiedBy: verificationData.verifiedBy
              }
            })
        }
      }
    }

    return {
      code: 0,
      message: '验证成功'
    }
  } catch (error) {
    return {
      code: 500,
      message: '验证失败',
      error: error.message
    }
  }
}

/**
 * 更新溯源链
 */
async function updateTraceChain(traceId, tenantId, updateData) {
  try {
    const now = new Date()

    // 如果更新了节点，需要重新计算信任度评分
    if (updateData.nodes && updateData.nodes.length > 0) {
      const trustScoreResult = calculateTrustScore({}, updateData.nodes)
      updateData.trustScore = trustScoreResult.trustScore
      updateData.trustScoreFactors = trustScoreResult.trustScoreFactors
      updateData.nodeCount = updateData.nodes.length
    }

    const updateFields = {
      ...updateData,
      updatedAt: now,
      version: _.inc(1)
    }

    const result = await db.collection('trace_chains')
      .where({
        traceId: traceId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: updateFields
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '溯源链不存在'
      }
    }

    return {
      code: 0,
      message: '更新成功'
    }
  } catch (error) {
    return {
      code: 500,
      message: '更新失败',
      error: error.message
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
      case 'build':
        return await buildTraceChain(event.traceChain)
      case 'verify':
        return await verifyTraceChain(event.traceId, event.tenantId, event.verification)
      case 'update':
        return await updateTraceChain(event.traceId, event.tenantId, event.traceChain)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['build', 'verify', 'update']
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

