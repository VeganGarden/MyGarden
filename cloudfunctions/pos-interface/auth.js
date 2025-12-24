/**
 * POS接口认证模块
 * 
 * 功能：
 * 1. API Key验证
 * 2. HMAC-SHA256签名验证
 * 3. 时间戳验证（防重放攻击）
 * 4. Nonce验证（防重放攻击）
 */

const crypto = require('crypto');

// Nonce缓存（用于防重放攻击，实际生产环境应使用Redis等）
const nonceCache = new Map();
const NONCE_CACHE_TTL = 5 * 60 * 1000; // 5分钟
const TIMESTAMP_TOLERANCE = 5 * 60; // 5分钟（秒）

/**
 * 验证API Key
 * @param {string} apiKey - API密钥
 * @param {Object} integrationConfig - 收银系统配置信息
 * @returns {Promise<Object>} { isValid: boolean, secretKey: string, error?: string }
 */
async function validateApiKey(apiKey, integrationConfig) {
  if (!apiKey) {
    return { isValid: false, error: 'API Key不能为空' };
  }

  if (!integrationConfig) {
    return { isValid: false, error: '收银系统配置不存在' };
  }

  if (integrationConfig.apiKey !== apiKey) {
    return { isValid: false, error: 'API Key无效' };
  }

  if (integrationConfig.status !== 'active') {
    return { isValid: false, error: '收银系统配置未激活' };
  }

  return {
    isValid: true,
    secretKey: integrationConfig.secretKey,
    restaurantId: integrationConfig.restaurantId,
    posSystem: integrationConfig.posSystem
  };
}

/**
 * 验证时间戳（防重放攻击）
 * @param {string|number} timestamp - 时间戳（Unix时间戳，秒级）
 * @returns {Object} { isValid: boolean, error?: string }
 */
function validateTimestamp(timestamp) {
  if (!timestamp) {
    return { isValid: false, error: '时间戳不能为空' };
  }

  const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  
  if (isNaN(timestampNum)) {
    return { isValid: false, error: '时间戳格式错误' };
  }

  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestampNum);

  if (diff > TIMESTAMP_TOLERANCE) {
    return { 
      isValid: false, 
      error: `时间戳超出允许范围，服务器时间: ${now}, 请求时间: ${timestampNum}, 差值: ${diff}秒` 
    };
  }

  return { isValid: true };
}

/**
 * 验证Nonce（防重放攻击）
 * @param {string} nonce - 随机字符串
 * @param {string|number} timestamp - 时间戳（用于确定Nonce的有效期）
 * @returns {Object} { isValid: boolean, error?: string }
 */
function validateNonce(nonce, timestamp) {
  if (!nonce) {
    return { isValid: false, error: 'Nonce不能为空' };
  }

  // 检查Nonce是否已使用过
  const cacheKey = `${timestamp}_${nonce}`;
  if (nonceCache.has(cacheKey)) {
    return { isValid: false, error: 'Nonce已使用过，可能为重放攻击' };
  }

  // 记录Nonce（标记为已使用）
  nonceCache.set(cacheKey, Date.now());

  // 清理过期的Nonce缓存
  cleanupNonceCache();

  return { isValid: true };
}

/**
 * 清理过期的Nonce缓存
 */
function cleanupNonceCache() {
  const now = Date.now();
  for (const [key, timestamp] of nonceCache.entries()) {
    if (now - timestamp > NONCE_CACHE_TTL) {
      nonceCache.delete(key);
    }
  }
}

/**
 * 生成签名
 * @param {string} method - HTTP方法
 * @param {string} path - 请求路径
 * @param {string|number} timestamp - 时间戳
 * @param {string} nonce - 随机字符串
 * @param {string} body - 请求体（JSON字符串）
 * @param {string} secretKey - 密钥
 * @returns {string} 签名的十六进制字符串
 */
function generateSignature(method, path, timestamp, nonce, body, secretKey) {
  // 构建签名字符串
  const signString = [
    method.toUpperCase(),
    path,
    String(timestamp),
    nonce,
    body || ''
  ].join('\n');

  // 生成HMAC-SHA256签名
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signString, 'utf8')
    .digest('hex');

  return signature;
}

/**
 * 验证签名
 * @param {string} method - HTTP方法
 * @param {string} path - 请求路径
 * @param {string|number} timestamp - 时间戳
 * @param {string} nonce - 随机字符串
 * @param {string} body - 请求体（JSON字符串）
 * @param {string} secretKey - 密钥
 * @param {string} providedSignature - 提供的签名
 * @returns {boolean} 签名是否有效
 */
function verifySignature(method, path, timestamp, nonce, body, secretKey, providedSignature) {
  const expectedSignature = generateSignature(method, path, timestamp, nonce, body, secretKey);
  
  // 使用常量时间比较防止时序攻击
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

/**
 * 从请求头中提取认证信息
 * @param {Object} headers - 请求头对象
 * @returns {Object} { apiKey, signature, timestamp, nonce, authToken }
 */
function extractAuthInfo(headers) {
  // 兼容不同的请求头格式（可能来自不同环境）
  const getHeader = (key) => {
    const lowerKey = key.toLowerCase();
    return headers[lowerKey] || headers[key];
  };

  return {
    apiKey: getHeader('x-api-key'),
    signature: getHeader('x-signature'),
    timestamp: getHeader('x-timestamp'),
    nonce: getHeader('x-nonce'),
    authToken: (getHeader('authorization') || '').replace(/^Bearer\s+/i, '')
  };
}

/**
 * 完整的认证验证流程
 * @param {Object} requestInfo - 请求信息
 * @param {string} requestInfo.method - HTTP方法
 * @param {string} requestInfo.path - 请求路径
 * @param {Object} requestInfo.headers - 请求头
 * @param {string} requestInfo.body - 请求体（JSON字符串）
 * @param {Object} db - 数据库实例
 * @returns {Promise<Object>} { success: boolean, error?: string, integrationConfig?: Object }
 */
async function authenticate(requestInfo, db) {
  const { method, path, headers, body } = requestInfo;

  try {
    // 1. 提取认证信息
    const authInfo = extractAuthInfo(headers);
    
    if (!authInfo.apiKey) {
      return { success: false, error: '缺少API Key' };
    }

    if (!authInfo.signature) {
      return { success: false, error: '缺少签名' };
    }

    if (!authInfo.timestamp) {
      return { success: false, error: '缺少时间戳' };
    }

    if (!authInfo.nonce) {
      return { success: false, error: '缺少Nonce' };
    }

    // 2. 验证时间戳
    const timestampValidation = validateTimestamp(authInfo.timestamp);
    if (!timestampValidation.isValid) {
      return { success: false, error: timestampValidation.error };
    }

    // 3. 查询收银系统配置
    const integrationCollection = db.collection('pos_integrations');
    const integrationResult = await integrationCollection
      .where({
        apiKey: authInfo.apiKey,
        status: 'active'
      })
      .limit(1)
      .get();

    if (integrationResult.data.length === 0) {
      return { success: false, error: 'API Key无效或收银系统未激活' };
    }

    const integrationConfig = integrationResult.data[0];

    // 4. 验证签名
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body || {});
    const isValidSignature = verifySignature(
      method,
      path,
      authInfo.timestamp,
      authInfo.nonce,
      bodyString,
      integrationConfig.secretKey,
      authInfo.signature
    );

    if (!isValidSignature) {
      return { success: false, error: '签名验证失败' };
    }

    // 5. 验证Nonce
    const nonceValidation = validateNonce(authInfo.nonce, authInfo.timestamp);
    if (!nonceValidation.isValid) {
      return { success: false, error: nonceValidation.error };
    }

    // 6. 认证成功，返回配置信息
    return {
      success: true,
      integrationConfig: {
        ...integrationConfig,
        // 不返回secretKey
        secretKey: undefined
      }
    };

  } catch (error) {
    console.error('认证过程出错:', error);
    return { success: false, error: `认证失败: ${error.message}` };
  }
}

module.exports = {
  authenticate,
  validateApiKey,
  validateTimestamp,
  validateNonce,
  generateSignature,
  verifySignature,
  extractAuthInfo
};

