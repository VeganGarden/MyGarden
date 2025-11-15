/**
 * 供应链溯源数据库初始化云函数
 * 
 * 功能:
 * 1. 创建供应链溯源相关集合
 * 2. 清理不完整数据
 * 3. 数据完整性检查
 * 
 * 调用方式:
 * tcb fn invoke traceability-init --params '{"action":"init"}'
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 创建集合
 */
async function createCollection(collectionName) {
  try {
    await db.createCollection(collectionName)
    return { success: true, message: `${collectionName} 集合创建成功` }
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      return { success: true, message: `${collectionName} 集合已存在` }
    }
    return {
      success: false,
      error: error.message || '集合创建失败',
      errCode: error.errCode
    }
  }
}

/**
 * 创建所有集合
 */
async function createAllCollections() {
  const collections = [
    'suppliers',
    'ingredient_lots',
    'trace_chains',
    'trace_nodes',
    'certificates'
  ]

  const results = []
  for (const collectionName of collections) {
    const result = await createCollection(collectionName)
    results.push({
      collection: collectionName,
      ...result
    })
  }

  return results
}

/**
 * 检查数据完整性
 */
async function checkDataIntegrity() {
  const collections = [
    'suppliers',
    'ingredient_lots',
    'trace_chains',
    'trace_nodes',
    'certificates'
  ]

  const results = {}
  for (const collectionName of collections) {
    try {
      const countResult = await db.collection(collectionName).count()
      results[collectionName] = {
        exists: true,
        count: countResult.total
      }
    } catch (error) {
      if (error.errCode === -502005) {
        results[collectionName] = {
          exists: false,
          count: 0,
          error: '集合不存在'
        }
      } else {
        results[collectionName] = {
          exists: false,
          count: 0,
          error: error.message
        }
      }
    }
  }

  return results
}

/**
 * 完整初始化
 */
async function fullInit() {
  const collectionResults = await createAllCollections()
  const integrityResults = await checkDataIntegrity()

  return {
    code: 0,
    message: '初始化完成',
    results: {
      collections: collectionResults,
      integrity: integrityResults
    }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action = 'init' } = event

  try {
    switch (action) {
      case 'init':
        return await fullInit()
      case 'check':
        return {
          code: 0,
          data: await checkDataIntegrity()
        }
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['init', 'check']
        }
    }
  } catch (error) {
    return {
      code: 500,
      message: '初始化失败',
      error: error.message
    }
  }
}

