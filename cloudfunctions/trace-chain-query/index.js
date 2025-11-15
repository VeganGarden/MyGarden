/**
 * 溯源链查询云函数
 * 
 * 功能:
 * 1. 查询溯源链详情
 * 2. 通过菜品查询溯源链
 * 3. 生成分享链接
 * 4. 生成二维码
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 获取溯源链详情
 */
async function getTraceChain(traceId, tenantId) {
  try {
    // 获取溯源链主记录
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

    // 获取所有节点（按时间排序）
    const nodesResult = await db.collection('trace_nodes')
      .where({
        traceId: traceId,
        tenantId: tenantId,
        isDeleted: false
      })
      .orderBy('timestamp', 'asc')
      .get()

    const nodes = nodesResult.data

    // 生成时间轴数据
    const timeline = nodes.map(node => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeName: node.nodeName,
      timestamp: node.timestamp,
      location: node.location,
      operation: node.operation
    }))

    return {
      code: 0,
      data: {
        traceId: traceChain.traceId,
        menuItemName: traceChain.menuItemName,
        chain: {
          nodes: nodes,
          timeline: timeline,
          trustScore: traceChain.trustScore,
          trustScoreFactors: traceChain.trustScoreFactors,
          carbonFootprint: traceChain.carbonFootprint
        },
        share: traceChain.share
      }
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
 * 通过菜品查询溯源链
 */
async function queryByMenuItem(menuItemId, tenantId, date) {
  try {
    let query = db.collection('trace_chains').where({
      menuItemId: menuItemId,
      tenantId: tenantId,
      status: 'active',
      isDeleted: false
    })

    if (date) {
      const queryDate = new Date(date)
      query = query.where({
        createdAt: db.command.lte(queryDate)
      })
    }

    const result = await query
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    if (result.data.length === 0) {
      return {
        code: 404,
        message: '未找到溯源链'
      }
    }

    return await getTraceChain(result.data[0].traceId, tenantId)
  } catch (error) {
    return {
      code: 500,
      message: '查询失败',
      error: error.message
    }
  }
}

/**
 * 生成分享链接
 */
async function generateShare(traceId, tenantId) {
  try {
    const shareUrl = `https://your-domain.com/traceability/trace/${traceId}`
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`

    const result = await db.collection('trace_chains')
      .where({
        traceId: traceId,
        tenantId: tenantId,
        isDeleted: false
      })
      .update({
        data: {
          'share.shareUrl': shareUrl,
          'share.qrCode': qrCode,
          updatedAt: new Date()
        }
      })

    if (result.stats.updated === 0) {
      return {
        code: 404,
        message: '溯源链不存在'
      }
    }

    return {
      code: 0,
      data: {
        qrCode: qrCode,
        shareUrl: shareUrl,
        expireAt: new Date(Date.now() + 365 * 24 * 3600 * 1000) // 1年后过期
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '生成失败',
      error: error.message
    }
  }
}

/**
 * 更新查看次数
 */
async function incrementViewCount(traceId) {
  try {
    await db.collection('trace_chains')
      .where({ traceId: traceId })
      .update({
        data: {
          'share.viewCount': db.command.inc(1),
          updatedAt: new Date()
        }
      })

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
 * 查询溯源链列表
 */
async function listTraceChains(params) {
  try {
    const {
      tenantId,
      page = 1,
      pageSize = 20,
      status,
      verificationStatus,
      keyword,
      menuItemId
    } = params

    let query = db.collection('trace_chains').where({
      tenantId: tenantId,
      isDeleted: false
    })

    if (status) {
      query = query.where({ status: status })
    }

    if (verificationStatus) {
      query = query.where({ verificationStatus: verificationStatus })
    }

    if (menuItemId) {
      query = query.where({ menuItemId: menuItemId })
    }

    if (keyword) {
      query = query.where(_.or([
        { menuItemName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { traceId: db.RegExp({ regexp: keyword, options: 'i' }) }
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
      case 'get':
        return await getTraceChain(event.traceId, event.tenantId)
      case 'list':
        return await listTraceChains(event)
      case 'queryByMenuItem':
        return await queryByMenuItem(event.menuItemId, event.tenantId, event.date)
      case 'generateShare':
        return await generateShare(event.traceId, event.tenantId)
      case 'incrementView':
        return await incrementViewCount(event.traceId)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['get', 'list', 'queryByMenuItem', 'generateShare', 'incrementView']
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

