/**
 * 碳排放因子管理云函数
 * 
 * 功能：
 * 1. 创建因子
 * 2. 更新因子
 * 3. 归档因子
 * 4. 激活因子
 * 5. 查询因子列表
 * 6. 批量导入因子
 * 
 * 调用示例：
 * wx.cloud.callFunction({
 *   name: 'carbon-factor-manage',
 *   data: {
 *     action: 'create',
 *     factor: { ... }
 *   }
 * })
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 生成因子ID
 * 使用Base64编码处理中文名称，确保唯一性
 */
function generateFactorId(name, category, subCategory, region, year) {
  let namePart = "";
  if (name) {
    const hasChinese = /[\u4e00-\u9fa5]/.test(name);
    if (hasChinese) {
      // 中文名称使用Base64编码（取前8个字符，去掉等号）
      const base64Name = Buffer.from(name, 'utf8').toString('base64').replace(/[=+/]/g, '').substring(0, 8);
      namePart = base64Name.toLowerCase();
    } else {
      // 英文名称直接转换
      namePart = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    }
  }
  
  const categoryPart = category || "general";
  const subCategoryPart = subCategory
    ? `_${subCategory.toLowerCase().replace(/\s+/g, "_")}`
    : "";
  const regionPart = region ? `_${region.toLowerCase()}` : "";
  const yearPart = year ? `_${year}` : "";

  return `ef_${namePart}${subCategoryPart}${regionPart}${yearPart}`;
}

/**
 * 验证因子数据
 */
function validateFactor(factor) {
  const errors = [];
  
  if (!factor.name) {
    errors.push('name 必填');
  }
  if (!factor.category) {
    errors.push('category 必填');
  }
  if (!factor.subCategory) {
    errors.push('subCategory 必填');
  }
  if (!factor.factorValue && factor.factorValue !== 0) {
    errors.push('factorValue 必填');
  }
  if (!factor.unit) {
    errors.push('unit 必填');
  }
  if (!factor.region) {
    errors.push('region 必填');
  }
  if (!factor.source) {
    errors.push('source 必填');
  }
  if (!factor.year) {
    errors.push('year 必填');
  }
  if (!factor.version) {
    errors.push('version 必填');
  }
  if (!factor.boundary) {
    errors.push('boundary 必填');
  }
  
  if (factor.factorValue !== undefined && factor.factorValue < 0) {
    errors.push('factorValue 必须 >= 0');
  }
  
  if (factor.year !== undefined && (factor.year < 2000 || factor.year > 2100)) {
    errors.push('year 必须在 2000-2100 之间');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 检查权限（仅管理员可操作）
 * @param {string} openid - 用户OpenID
 * @returns {Promise<boolean>} 是否有权限
 */
async function checkPermission(openid) {
  // TODO: 实现权限检查逻辑
  // 查询用户权限表，检查是否为管理员
  // 暂时允许所有操作，生产环境需要添加权限验证
  return true;
}

/**
 * 创建因子（需要审核）
 */
async function createFactor(factor, openid, user, token) {
  // 验证数据
  const validation = validateFactor(factor);
  if (!validation.valid) {
    return {
      code: 1,
      success: false,
      error: '数据验证失败',
      errors: validation.errors,
      message: validation.errors.join('; ')
    };
  }
  
  // 生成factorId
  const factorId = factor.factorId || generateFactorId(
    factor.name,
    factor.category,
    factor.subCategory,
    factor.region,
    factor.year
  );
  
  // 检查是否已存在
  const existing = await db.collection('carbon_emission_factors')
    .where({
      factorId: factorId,
      status: 'active'
    })
    .get();
  
  if (existing.data.length > 0) {
    return {
      code: 1,
      success: false,
      error: '因子已存在',
      factorId,
      message: '该因子ID已存在'
    };
  }
  
  // 创建审核申请
  try {
    const approvalData = {
      action: 'createRequest',
      businessType: 'carbon_factor',
      operationType: 'create',
      title: `创建因子：${factor.name}`,
      description: `申请创建新的碳排放因子：${factor.name} (${factorId})`,
      newData: factor,
      currentData: null
    };
    
    // 传递token给approval-manage云函数
    if (token) {
      approvalData.token = token;
    }
    
    const approvalResult = await cloud.callFunction({
      name: 'approval-manage',
      data: approvalData
    });
    
    if (approvalResult.result && approvalResult.result.success) {
      return {
        code: 0,
        success: true,
        data: {
          requestId: approvalResult.result.data.requestId,
          factorId,
          approvalRequired: true
        },
        message: '审核申请已提交，请等待审核'
      };
    } else {
      throw new Error(approvalResult.result?.error || '创建审核申请失败');
    }
  } catch (error) {
    console.error('创建审核申请失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '创建审核申请失败',
      message: error.message || '创建审核申请失败'
    };
  }
}

/**
 * 执行已审核通过的创建操作
 */
async function executeApprovedCreate(factor) {
  // 验证数据
  const validation = validateFactor(factor);
  if (!validation.valid) {
    return {
      code: 1,
      success: false,
      error: '数据验证失败',
      errors: validation.errors,
      message: validation.errors.join('; ')
    };
  }
  
  // 生成factorId
  const factorId = factor.factorId || generateFactorId(
    factor.name,
    factor.category,
    factor.subCategory,
    factor.region,
    factor.year
  );
  
  // 检查是否已存在
  const existing = await db.collection('carbon_emission_factors')
    .where({
      factorId: factorId,
      status: 'active'
    })
    .get();
  
  if (existing.data.length > 0) {
    return {
      code: 1,
      success: false,
      error: '因子已存在',
      factorId,
      message: '该因子ID已存在'
    };
  }
  
  // 添加元数据
  const now = new Date();
  const factorData = {
    ...factor,
    factorId,
    alias: factor.alias || [],
    status: factor.status || 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system'
  };
  
  // 插入数据库
  try {
    const result = await db.collection('carbon_emission_factors').add({
      data: factorData
    });
    return {
      code: 0,
      success: true,
      data: {
        _id: result._id,
        factorId
      },
      message: '创建成功'
    };
  } catch (error) {
    console.error('创建因子失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '创建失败',
      message: error.message || '创建失败'
    };
  }
}

/**
 * 获取因子详情
 */
async function getFactor(factorId) {
  try {
    const result = await db.collection('carbon_emission_factors')
      .where({
        factorId: factorId
      })
      .get();
    
    if (result.data.length === 0) {
      return {
        code: 1,
        success: false,
        error: '因子不存在',
        message: '因子不存在'
      };
    }
    
    return {
      code: 0,
      success: true,
      data: result.data[0],
      message: '查询成功'
    };
  } catch (error) {
    console.error('查询因子失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '查询失败',
      message: error.message || '查询失败'
    };
  }
}

/**
 * 更新因子（需要审核）
 */
async function updateFactor(factorId, updates, openid, user, token) {
  // 查找现有因子
  const existing = await db.collection('carbon_emission_factors')
    .where({
      factorId: factorId
    })
    .get();
  
  if (existing.data.length === 0) {
    return {
      code: 1,
      success: false,
      error: '因子不存在',
      message: '因子不存在'
    };
  }
  
  const currentFactor = existing.data[0];
  const newFactorData = { ...currentFactor, ...updates };
  
  // 创建审核申请
  try {
    const approvalData = {
      action: 'createRequest',
      businessType: 'carbon_factor',
      businessId: factorId,
      operationType: 'update',
      title: `更新因子：${currentFactor.name || factorId}`,
      description: `申请更新碳排放因子：${currentFactor.name || factorId}`,
      currentData: currentFactor,
      newData: newFactorData
    };
    
    // 传递token给approval-manage云函数
    if (token) {
      approvalData.token = token;
    }
    
    const approvalResult = await cloud.callFunction({
      name: 'approval-manage',
      data: approvalData
    });
    
    if (approvalResult.result && approvalResult.result.success) {
      return {
        code: 0,
        success: true,
        data: {
          requestId: approvalResult.result.data.requestId,
          factorId,
          approvalRequired: true
        },
        message: '审核申请已提交，请等待审核'
      };
    } else {
      throw new Error(approvalResult.result?.error || '创建审核申请失败');
    }
  } catch (error) {
    console.error('创建审核申请失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '创建审核申请失败',
      message: error.message || '创建审核申请失败'
    };
  }
}

/**
 * 执行已审核通过的更新操作
 */
async function executeApprovedUpdate(factorId, updates) {
  // 查找现有因子
  const existing = await db.collection('carbon_emission_factors')
    .where({
      factorId: factorId
    })
    .get();
  
  if (existing.data.length === 0) {
    return {
      code: 1,
      success: false,
      error: '因子不存在',
      message: '因子不存在'
    };
  }
  
  // 如果更新了会影响factorId的字段，需要验证新factorId是否已存在
  if (updates.name || updates.category || updates.subCategory || updates.region || updates.year) {
    const newFactorId = generateFactorId(
      updates.name || existing.data[0].name,
      updates.category || existing.data[0].category,
      updates.subCategory || existing.data[0].subCategory,
      updates.region || existing.data[0].region,
      updates.year || existing.data[0].year
    );
    
    if (newFactorId !== factorId) {
      const duplicate = await db.collection('carbon_emission_factors')
        .where({
          factorId: newFactorId,
          status: 'active'
        })
        .get();
      
      if (duplicate.data.length > 0) {
        return {
          code: 1,
          success: false,
          error: '因子ID冲突',
          message: '更新后的因子ID已存在'
        };
      }
      
      updates.factorId = newFactorId;
    }
  }
  
  // 更新数据
  const updateData = {
    ...updates,
    updatedAt: new Date(),
    updatedBy: 'system'
  };
  
  try {
    await db.collection('carbon_emission_factors')
      .doc(existing.data[0]._id)
      .update({
        data: updateData
      });
    
    return {
      code: 0,
      success: true,
      data: {
        factorId: updateData.factorId || factorId
      },
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新因子失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '更新失败',
      message: error.message || '更新失败'
    };
  }
}

/**
 * 归档因子
 */
async function archiveFactor(factorId, openid, user, token) {
  // 查找现有因子
  const existing = await db.collection('carbon_emission_factors')
    .where({
      factorId: factorId,
      status: 'active'
    })
    .get();
  
  if (existing.data.length === 0) {
    return {
      code: 1,
      success: false,
      error: '因子不存在或已归档',
      message: '因子不存在或已归档'
    };
  }
  
  try {
    await db.collection('carbon_emission_factors')
      .doc(existing.data[0]._id)
      .update({
        data: {
          status: 'archived',
          updatedAt: new Date(),
          updatedBy: openid || 'system'
        }
      });
    
    return {
      code: 0,
      success: true,
      message: '归档成功'
    };
  } catch (error) {
    console.error('归档因子失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '归档失败',
      message: error.message || '归档失败'
    };
  }
}

/**
 * 激活因子
 */
async function activateFactor(factorId, openid) {
  // 查找现有因子
  const existing = await db.collection('carbon_emission_factors')
    .where({
      factorId: factorId
    })
    .get();
  
  if (existing.data.length === 0) {
    return {
      code: 1,
      success: false,
      error: '因子不存在',
      message: '因子不存在'
    };
  }
  
  try {
    await db.collection('carbon_emission_factors')
      .doc(existing.data[0]._id)
      .update({
        data: {
          status: 'active',
          updatedAt: new Date(),
          updatedBy: openid || 'system'
        }
      });
    
    return {
      code: 0,
      success: true,
      message: '激活成功'
    };
  } catch (error) {
    console.error('激活因子失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '激活失败',
      message: error.message || '激活失败'
    };
  }
}

/**
 * 获取因子列表
 */
async function listFactors(params) {
  const { 
    category, 
    subCategory, 
    source, 
    year, 
    region, 
    status, 
    keyword,
    page = 1, 
    pageSize = 20 
  } = params;
  
  try {
    // 构建基础查询条件
    const baseQuery = {};
    if (category) baseQuery.category = category;
    if (subCategory) baseQuery.subCategory = subCategory;
    if (source) baseQuery.source = source;
    if (year) baseQuery.year = year;
    if (region) baseQuery.region = region;
    if (status) baseQuery.status = status;
    
    let queryBuilder;
    
    // 如果有关键词，需要组合搜索条件
    if (keyword && keyword.trim()) {
      const keywordTrimmed = keyword.trim();
      // 使用or查询搜索名称、别名或factorId
      const keywordConditions = _.or([
        { name: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { factorId: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { alias: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) }
      ]);
      
      // 如果有其他筛选条件，需要组合查询
      if (Object.keys(baseQuery).length > 0) {
        // 组合条件：基础条件 AND (关键词条件)
        queryBuilder = db.collection('carbon_emission_factors').where(
          _.and([
            baseQuery,
            keywordConditions
          ])
        );
      } else {
        // 只有关键词条件
        queryBuilder = db.collection('carbon_emission_factors').where(keywordConditions);
      }
    } else {
      // 没有关键词，只使用基础查询条件
      queryBuilder = db.collection('carbon_emission_factors').where(baseQuery);
    }
    
    // 执行查询
    const result = await queryBuilder
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    
    // 统计总数（使用相同的查询条件）
    let countQueryBuilder;
    if (keyword && keyword.trim()) {
      const keywordTrimmed = keyword.trim();
      const keywordConditions = _.or([
        { name: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { factorId: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) },
        { alias: db.RegExp({ regexp: keywordTrimmed, options: 'i' }) }
      ]);
      
      if (Object.keys(baseQuery).length > 0) {
        countQueryBuilder = db.collection('carbon_emission_factors').where(
          _.and([
            baseQuery,
            keywordConditions
          ])
        );
      } else {
        countQueryBuilder = db.collection('carbon_emission_factors').where(keywordConditions);
      }
    } else {
      countQueryBuilder = db.collection('carbon_emission_factors').where(baseQuery);
    }
    
    const countResult = await countQueryBuilder.count();
    const total = countResult.total;
    
    return {
      code: 0,
      success: true,
      data: result.data,
      total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      message: '查询成功'
    };
  } catch (error) {
    console.error('查询因子列表失败:', error);
    return {
      code: 1,
      success: false,
      error: error.message || '查询失败',
      message: error.message || '查询失败',
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0
      }
    };
  }
}

/**
 * 批量导入因子
 */
async function batchImportFactors(factors, openid) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  const now = new Date();
  
  for (let i = 0; i < factors.length; i++) {
    const factor = factors[i];
    
    try {
      // 验证数据
      const validation = validateFactor(factor);
      if (!validation.valid) {
        results.failed++;
        results.errors.push({
          index: i + 1,
          factorId: factor.factorId || 'unknown',
          error: validation.errors.join('; ')
        });
        continue;
      }
      
      // 生成factorId
      const factorId = factor.factorId || generateFactorId(
        factor.name,
        factor.category,
        factor.subCategory,
        factor.region,
        factor.year
      );
      
      // 检查是否已存在
      const existing = await db.collection('carbon_emission_factors')
        .where({
          factorId: factorId
        })
        .get();
      
      if (existing.data.length > 0) {
        results.skipped++;
        continue;
      }
      
      // 插入数据
      const factorData = {
        ...factor,
        factorId,
        alias: factor.alias || [],
        status: factor.status || 'draft',
        createdAt: now,
        updatedAt: now,
        createdBy: openid || 'system',
        updatedBy: openid || 'system'
      };
      
      await db.collection('carbon_emission_factors').add({
        data: factorData
      });
      
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        index: i + 1,
        factorId: factor.factorId || factor.name || 'unknown',
        error: error.message || '导入失败'
      });
    }
  }
  
  return {
    code: 0,
    success: true,
    ...results,
    message: `导入完成：成功 ${results.success}，失败 ${results.failed}，跳过 ${results.skipped}`
  };
}

/**
 * 初始化示例数据
 * @deprecated 此功能已弃用，数据已通过initFactorDataFromJSON完成初始化
 * 保留此函数仅为向后兼容，不建议使用
 */
async function initSampleData(openid) {
  // 注意：此函数已弃用，数据应通过initFactorDataFromJSON导入
  // 先确保集合存在（使用 createCollection 方法）
  try {
    await db.createCollection('carbon_emission_factors');
  } catch (error) {
    // 如果集合已存在，继续执行
    if (!error.message || !error.message.includes('already exists')) {
      // 静默处理，继续尝试插入数据
    }
  }
  
  const sampleFactors = [
    {
      name: "大米",
      alias: ["稻米", "白米", "rice"],
      category: "ingredient",
      subCategory: "grain",
      factorValue: 3.2,
      unit: "kgCO2e/kg",
      uncertainty: 15,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-gate",
      status: "active",
      notes: "中国大米平均排放因子"
    },
    {
      name: "小麦",
      alias: ["wheat", "麦子"],
      category: "ingredient",
      subCategory: "grain",
      factorValue: 1.8,
      unit: "kgCO2e/kg",
      uncertainty: 12,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-gate",
      status: "active"
    },
    {
      name: "牛肉",
      alias: ["beef", "黄牛肉", "牛腩"],
      category: "ingredient",
      subCategory: "meat",
      factorValue: 27.5,
      unit: "kgCO2e/kg",
      uncertainty: 20,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-farm",
      status: "active",
      notes: "中国牛肉平均排放因子"
    },
    {
      name: "猪肉",
      alias: ["pork", "猪肉"],
      category: "ingredient",
      subCategory: "meat",
      factorValue: 12.1,
      unit: "kgCO2e/kg",
      uncertainty: 18,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-farm",
      status: "active"
    },
    {
      name: "鸡肉",
      alias: ["chicken", "鸡"],
      category: "ingredient",
      subCategory: "meat",
      factorValue: 6.9,
      unit: "kgCO2e/kg",
      uncertainty: 15,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-farm",
      status: "active"
    },
    {
      name: "土豆",
      alias: ["potato", "马铃薯", "洋芋"],
      category: "ingredient",
      subCategory: "vegetable",
      factorValue: 0.3,
      unit: "kgCO2e/kg",
      uncertainty: 10,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-gate",
      status: "active"
    },
    {
      name: "番茄",
      alias: ["tomato", "西红柿"],
      category: "ingredient",
      subCategory: "vegetable",
      factorValue: 2.2,
      unit: "kgCO2e/kg",
      uncertainty: 12,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-gate",
      status: "active"
    },
    {
      name: "生菜",
      alias: ["lettuce", "莴苣"],
      category: "ingredient",
      subCategory: "vegetable",
      factorValue: 0.8,
      unit: "kgCO2e/kg",
      uncertainty: 10,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-gate",
      status: "active"
    },
    {
      name: "电力",
      alias: ["electricity", "电"],
      category: "energy",
      subCategory: "electricity",
      factorValue: 0.5810,
      unit: "kgCO2e/kWh",
      uncertainty: 5,
      region: "national_average",
      source: "CLCD",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-gate",
      status: "active",
      notes: "中国电网平均排放因子（2024年）"
    },
    {
      name: "天然气",
      alias: ["natural gas", "天然气"],
      category: "energy",
      subCategory: "gas",
      factorValue: 2.16,
      unit: "kgCO2e/m³",
      uncertainty: 3,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-gate",
      status: "active"
    },
    {
      name: "自来水",
      alias: ["water", "水"],
      category: "material",
      subCategory: "water",
      factorValue: 0.0003,
      unit: "kgCO2e/kg",
      uncertainty: 20,
      region: "national_average",
      source: "IPCC",
      year: 2024,
      version: "v1.0",
      boundary: "cradle-to-gate",
      status: "active",
      notes: "自来水处理排放因子"
    }
  ];
  
  // 直接插入数据，不检查已存在
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  const now = new Date();
  
  for (let i = 0; i < sampleFactors.length; i++) {
    const factor = sampleFactors[i];
    
    try {
      // 验证数据
      const validation = validateFactor(factor);
      if (!validation.valid) {
        results.failed++;
        results.errors.push({
          index: i + 1,
          name: factor.name,
          error: validation.errors.join('; ')
        });
        continue;
      }
      
      // 生成factorId
      const factorId = generateFactorId(
        factor.name,
        factor.category,
        factor.subCategory,
        factor.region,
        factor.year
      );
      
      // 准备数据
      const factorData = {
        ...factor,
        factorId,
        alias: factor.alias || [],
        status: factor.status || 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: openid || 'system',
        updatedBy: openid || 'system'
      };
      
      // 直接插入（如果已存在会失败，但不会报错）
      try {
        await db.collection('carbon_emission_factors').add({
          data: factorData
        });
        results.success++;
      } catch (addError) {
        // 如果是重复数据错误，跳过
        if (addError.errCode === -502002 || addError.message.includes('duplicate')) {
          results.skipped++;
        } else {
          throw addError;
        }
      }
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        index: i + 1,
        name: factor.name,
        error: error.message || '导入失败'
      });
    }
  }
  
  return {
    code: 0,
    success: true,
    ...results,
    message: `导入完成：成功 ${results.success}，失败 ${results.failed}，跳过 ${results.skipped}`
  };
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action, ...params } = event;
  const { OPENID } = cloud.getWXContext();
  
  try {
    // 权限检查（除查询和初始化示例数据外都需要权限）
    if (action !== 'list' && action !== 'get' && action !== 'initSampleData') {
      const hasPermission = await checkPermission(OPENID);
      if (!hasPermission) {
        return {
          code: 403,
          success: false,
          error: '权限不足',
          message: '只有管理员可以执行此操作'
        };
      }
    }
    
    // 获取用户信息（用于审核流程）
    let user = null;
    
    // 对于需要权限的操作，先检查token
    if (action === 'update' || action === 'create' || action === 'archive') {
      // 确保event中有token（从params中获取，因为前端通过payload.token传递）
      // 云开发SDK会将data中的内容直接作为event的属性，所以token在params.token中
      if (!event.token) {
        event.token = params.token || event.data?.token || '';
      }
      
      // 如果event.token为空，但params.token存在，则使用params.token
      if (!event.token && params.token) {
        event.token = params.token;
      }
      
      // 检查是否有token
      if (!event.token) {
        return {
          code: 401,
          success: false,
          error: '未授权访问，请先登录',
          message: '未授权访问，请先登录'
        };
      }
      
      try {
        const { checkPermission } = require('./permission');
        // 因子库管理需要 carbon:maintain 权限
        // 允许有 carbon:maintain 权限的角色（如碳核算专员）操作因子库
        user = await checkPermission(event, context, 'carbon:maintain');
      } catch (err) {
        // 处理错误对象（可能是 { code, message } 格式）
        const errorCode = err.code || 401;
        const errorMessage = err.message || '未授权访问，请先登录';
        
        return {
          code: errorCode,
          success: false,
          error: errorMessage,
          message: errorMessage
        };
      }
    } else {
      // 对于不需要权限的操作，尝试获取用户信息（但不强制）
      try {
        if (!event.token && params.token) {
          event.token = params.token;
        }
        if (!event.token && event.data && event.data.token) {
          event.token = event.data.token;
        }
        if (event.token) {
          const { checkPermission } = require('./permission');
          user = await checkPermission(event, context);
        }
      } catch (err) {
        // 静默处理，不影响查询操作
      }
    }

    switch (action) {
      case 'create':
        return await createFactor(params.factor, OPENID, user, event.token);
      
      case 'executeApprovedCreate':
        // 执行已审核通过的创建操作（由审核系统调用）
        return await executeApprovedCreate(params.factor);
        
      case 'update':
        return await updateFactor(params.factorId, params.factor, OPENID, user, event.token);
      
      case 'executeApprovedUpdate':
        // 执行已审核通过的更新操作（由审核系统调用）
        return await executeApprovedUpdate(params.factorId, params.factor);
        
      case 'get':
        return await getFactor(params.factorId);
        
      case 'archive':
        return await archiveFactor(params.factorId, OPENID, user, event.token);
      
      case 'executeApprovedArchive':
        // 执行已审核通过的归档操作（由审核系统调用）
        return await executeApprovedArchive(params.factorId);
        
      case 'activate':
        return await activateFactor(params.factorId, OPENID);
        
      case 'list':
        return await listFactors(params);
        
      case 'batchImport':
        return await batchImportFactors(params.factors, OPENID);
        
      case 'initSampleData':
        // @deprecated 已弃用，建议使用initFactorDataFromJSON
        return await initSampleData(OPENID);
        
      default:
        return {
          code: 400,
          success: false,
          error: '未知的 action 参数',
          message: '支持的 action: create, update, get, archive, activate, list, batchImport, executeApprovedCreate, executeApprovedUpdate, executeApprovedArchive'
        };
    }
  } catch (error) {
    console.error('因子管理失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '操作失败',
      message: error.message || '操作失败',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

