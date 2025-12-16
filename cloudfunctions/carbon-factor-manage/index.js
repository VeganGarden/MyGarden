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
 */
function generateFactorId(name, category, subCategory, region, year) {
  // 将名称转换为小写，替换空格为下划线
  const namePart = (name || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const categoryPart = category || 'general';
  const subCategoryPart = subCategory ? `_${subCategory.toLowerCase().replace(/\s+/g, '_')}` : '';
  const regionPart = region ? `_${region.toLowerCase()}` : '';
  const yearPart = year ? `_${year}` : '';
  
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
 */
async function checkPermission(openid) {
  // TODO: 实现权限检查逻辑
  // 这里简化处理，实际应该查询用户权限表
  // 暂时允许所有操作，生产环境需要添加权限验证
  return true;
}

/**
 * 创建因子
 */
async function createFactor(factor, openid) {
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
    status: factor.status || 'draft',
    createdAt: now,
    updatedAt: now,
    createdBy: openid || 'system',
    updatedBy: openid || 'system'
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
 * 更新因子
 */
async function updateFactor(factorId, updates, openid) {
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
    updatedBy: openid || 'system'
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
async function archiveFactor(factorId, openid) {
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
  
  const query = {};
  
  if (category) query.category = category;
  if (subCategory) query.subCategory = subCategory;
  if (source) query.source = source;
  if (year) query.year = year;
  if (region) query.region = region;
  if (status) query.status = status;
  
  // 关键词搜索（名称或别名）
  if (keyword) {
    query._complex = {
      $or: [
        { name: new RegExp(keyword, 'i') },
        { alias: new RegExp(keyword, 'i') },
        { factorId: new RegExp(keyword, 'i') }
      ]
    };
  }
  
  try {
    let queryBuilder = db.collection('carbon_emission_factors').where(query);
    
    // 关键词搜索需要使用更复杂的方式
    if (keyword && !query._complex) {
      // 如果关键词存在但没有使用_complex，则使用or查询
      queryBuilder = db.collection('carbon_emission_factors').where(
        _.or([
          { name: db.RegExp({ regexp: keyword, options: 'i' }) },
          { factorId: db.RegExp({ regexp: keyword, options: 'i' }) },
          { alias: db.RegExp({ regexp: keyword, options: 'i' }) }
        ])
      );
    }
    
    const result = await queryBuilder
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    
    // 如果没有关键词，使用原始query统计总数
    const countQuery = keyword ? {} : query;
    const countResult = await db.collection('carbon_emission_factors')
      .where(countQuery)
      .count();
    
    // 如果有关键词，需要单独统计
    let total = countResult.total;
    if (keyword) {
      // 关键词搜索时，使用结果数量作为总数（简化处理）
      total = result.data.length;
    }
    
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
 */
async function initSampleData(openid) {
  // 先确保集合存在（使用 createCollection 方法）
  try {
    await db.createCollection('carbon_emission_factors');
    console.log('✅ carbon_emission_factors 集合创建成功');
  } catch (error) {
    // 如果集合已存在，继续执行
    if (error.message && error.message.includes('already exists')) {
      console.log('ℹ️  carbon_emission_factors 集合已存在');
    } else {
      console.log('⚠️  集合创建检查失败:', error.message);
      // 继续尝试插入数据，如果集合存在应该能成功
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
      region: "CN",
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
    
    switch (action) {
      case 'create':
        return await createFactor(params.factor, OPENID);
        
      case 'update':
        return await updateFactor(params.factorId, params.factor, OPENID);
        
      case 'get':
        return await getFactor(params.factorId);
        
      case 'archive':
        return await archiveFactor(params.factorId, OPENID);
        
      case 'activate':
        return await activateFactor(params.factorId, OPENID);
        
      case 'list':
        return await listFactors(params);
        
      case 'batchImport':
        return await batchImportFactors(params.factors, OPENID);
        
      case 'initSampleData':
        return await initSampleData(OPENID);
        
      default:
        return {
          code: 400,
          success: false,
          error: '未知的 action 参数',
          message: '支持的 action: create, update, get, archive, activate, list, batchImport, initSampleData'
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

