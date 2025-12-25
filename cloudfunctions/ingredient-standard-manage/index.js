const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入标准化服务模块
const standardizer = require('./ingredient-standardizer');

/**
 * 食材标准库管理云函数
 * 
 * 功能：
 * 1. 标准名称管理（CRUD）
 * 2. 别名映射管理（增删改查）
 * 3. 同步操作（同步到因子库、同步到ingredients库）
 */
exports.main = async (event, context) => {
  const { action, subAction, data = {} } = event;
  
  // 兼容旧的调用方式（subAction直接在event中）
  const actualSubAction = subAction || action;
  const actualData = data || event;
  
  // 获取userInfo（兼容Node.js 10.15，不使用可选链）
  const userInfo = (context && context.userInfo) || event.userInfo || null;

  console.log('========================================');
  console.log(`食材标准库管理 - Action: ${actualSubAction}`);
  console.log('========================================\n');

  try {
    switch (actualSubAction) {
      // 标准名称管理
      case 'standard.list':
      case 'listStandards':
        return await listStandards({ data: actualData });
      case 'standard.get':
      case 'getStandard':
        return await getStandard({ data: actualData });
      case 'standard.create':
      case 'addStandard':
        return await addStandard({ data: actualData, userInfo: userInfo });
      case 'standard.update':
      case 'updateStandard':
        return await updateStandard({ data: actualData, userInfo: userInfo });
      case 'standard.deprecate':
      case 'deprecateStandard':
        return await deprecateStandard({ data: actualData, userInfo: userInfo });
      case 'standard.merge':
      case 'mergeStandards':
        return await mergeStandards({ data: actualData, userInfo: userInfo });
      
      // 别名管理
      case 'alias.list':
      case 'listAliases':
        return await listAliases({ data: actualData });
      case 'alias.add':
      case 'addAlias':
        return await addAlias({ data: actualData, userInfo: userInfo });
      case 'alias.remove':
      case 'removeAlias':
        return await removeAlias({ data: actualData, userInfo: userInfo });
      case 'alias.batchAdd':
      case 'batchAddAliases':
        return await batchAddAliases({ data: actualData, userInfo: userInfo });
      
      // 同步操作
      case 'sync.toFactors':
      case 'syncStandardAliasesToFactors':
        const syncFactors = require('./sync-standard-aliases-to-factors');
        return await syncFactors.main(event);
      case 'sync.toIngredients':
      case 'syncStandardNameToIngredients':
        const syncIngredients = require('./sync-standard-name-to-ingredients');
        return await syncIngredients.main(event);
      
      // 类别管理
      case 'category.list':
      case 'listCategories':
        const { listCategories } = require('./manage-categories');
        return await listCategories({ data: actualData });
      case 'category.get':
      case 'getCategory':
        const { getCategory } = require('./manage-categories');
        return await getCategory({ data: actualData });
      case 'category.create':
      case 'createCategory':
        const { createCategory } = require('./manage-categories');
        return await createCategory({ data: actualData }, userInfo);
      case 'category.update':
      case 'updateCategory':
        const { updateCategory } = require('./manage-categories');
        return await updateCategory({ data: actualData }, userInfo);
      case 'category.delete':
      case 'deleteCategory':
        const { deleteCategory } = require('./manage-categories');
        return await deleteCategory({ data: actualData }, userInfo);
      case 'category.getKeywords':
      case 'getCategoryKeywords':
        const { getCategoryKeywords } = require('./manage-categories');
        return await getCategoryKeywords({ data: actualData });
      
      default:
        return {
          code: 400,
          message: `未知的action: ${actualSubAction}`
        };
    }
  } catch (error) {
    console.error('❌ 操作失败:', error);
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    };
  }
};

/**
 * 获取标准名称列表
 */
async function listStandards(event) {
  const { keyword, category, status, page = 1, pageSize = 20 } = event.data || event || {};

  const standardsCollection = db.collection('ingredient_standards');
  let query = standardsCollection;

  // 构建查询条件
  const whereCondition = {};
  if (status) {
    whereCondition.status = status;
  }
  if (category) {
    whereCondition.category = category;
  }
  if (keyword) {
    whereCondition.standardName = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  if (Object.keys(whereCondition).length > 0) {
    query = query.where(whereCondition);
  }

  // 分页查询
  const skip = (page - 1) * pageSize;
  const result = await query
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  // 获取总数
  const countResult = await (Object.keys(whereCondition).length > 0
    ? standardsCollection.where(whereCondition).count()
    : standardsCollection.count());

  return {
    code: 0,
    message: '查询成功',
    data: {
      data: result.data,
      pagination: {
        total: countResult.total,
        page: page,
        pageSize: pageSize
      }
    }
  };
}

/**
 * 获取标准名称详情
 */
async function getStandard(event) {
  const { data: eventData = {} } = event;
  const data = eventData || event || {};
  const { standardName } = data;

  if (!standardName) {
    return {
      code: 400,
      message: '请提供standardName参数'
    };
  }

  const standardsCollection = db.collection('ingredient_standards');
  const result = await standardsCollection
    .where({
      standardName: standardName
    })
    .limit(1)
    .get();

  if (result.data.length === 0) {
    return {
      code: 404,
      message: '标准名称不存在'
    };
  }

  return {
    code: 0,
    message: '查询成功',
    data: result.data[0]
  };
}

/**
 * 添加新的标准名称
 */
async function addStandard(event) {
  const { data: eventData = {}, userInfo } = event;
  const {
    standardName,
    nameEn,
    category,
    subCategory,
    description,
    defaultUnit = 'g',
    carbonCoefficient
  } = eventData || event || {};

  if (!standardName || !category) {
    return {
      code: 400,
      message: '请提供standardName和category参数'
    };
  }

  const standardsCollection = db.collection('ingredient_standards');

  // 检查是否已存在
  const existing = await standardsCollection
    .where({
      standardName: standardName
    })
    .limit(1)
    .get();

  if (existing.data.length > 0) {
    return {
      code: 409,
      message: '标准名称已存在'
    };
  }

  const now = new Date();
  const userInfoObj = event.userInfo || event || {};
  const OPENID = (userInfoObj.openId) || 'system';

  // 创建标准名称记录
  const result = await standardsCollection.add({
    data: {
      standardName: standardName,
      nameEn: nameEn || null,
      category: category,
      subCategory: subCategory || null,
      description: description || null,
      defaultUnit: defaultUnit,
      carbonCoefficient: carbonCoefficient || null,
      status: 'active',
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: OPENID,
      updatedBy: OPENID
    }
  });

  return {
    code: 0,
    message: '标准名称创建成功',
    data: {
      _id: result._id,
      standardName: standardName
    }
  };
}

/**
 * 更新标准名称
 */
async function updateStandard(event) {
  const { data: eventData = {}, userInfo } = event;
  const data = eventData || event || {};
  const {
    oldStandardName,
    standardName: newStandardName,
    nameEn,
    category,
    subCategory,
    description,
    defaultUnit,
    carbonCoefficient,
    updateAliases
  } = data;

  if (!oldStandardName) {
    return {
      code: 400,
      message: '请提供oldStandardName参数'
    };
  }

  const standardsCollection = db.collection('ingredient_standards');
  const aliasesCollection = db.collection('ingredient_aliases');

  // 查找现有记录
  const existing = await standardsCollection
    .where({
      standardName: oldStandardName
    })
    .limit(1)
    .get();

  if (existing.data.length === 0) {
    return {
      code: 404,
      message: '标准名称不存在'
    };
  }

  const now = new Date();
  const userInfoObj = event.userInfo || event || {};
  const OPENID = (userInfoObj.openId) || 'system';

  // 如果标准名称变更，需要更新相关数据
  if (newStandardName && newStandardName !== oldStandardName) {
    // 检查新名称是否已存在
    const newNameExists = await standardsCollection
      .where({
        standardName: newStandardName
      })
      .limit(1)
      .get();

    if (newNameExists.data.length > 0) {
      return {
        code: 409,
        message: '新标准名称已存在'
      };
    }

    // 更新标准名称记录
    await standardsCollection.doc(existing.data[0]._id).update({
      data: {
        standardName: newStandardName,
        nameEn: nameEn !== undefined ? nameEn : existing.data[0].nameEn,
        category: category !== undefined ? category : existing.data[0].category,
        subCategory: subCategory !== undefined ? subCategory : existing.data[0].subCategory,
        description: description !== undefined ? description : existing.data[0].description,
        defaultUnit: defaultUnit !== undefined ? defaultUnit : existing.data[0].defaultUnit,
        carbonCoefficient: carbonCoefficient !== undefined ? carbonCoefficient : existing.data[0].carbonCoefficient,
        updatedAt: now,
        updatedBy: OPENID
      }
    });

    // 更新所有相关别名映射的standardName
    await aliasesCollection
      .where({
        standardName: oldStandardName
      })
      .update({
        data: {
          standardName: newStandardName,
          updatedAt: now
        }
      });

    // 同步到ingredients库
    const syncIngredientResult = await standardizer.syncStandardNameToIngredients(
      oldStandardName,
      newStandardName
    );

    // 如果涉及别名变更，同步到因子库
    if (updateAliases) {
      await standardizer.syncAliasesToFactors(newStandardName);
    }

    return {
      code: 0,
      message: '标准名称更新成功',
      data: {
        oldStandardName: oldStandardName,
        newStandardName: newStandardName,
        syncIngredientResult: syncIngredientResult
      }
    };
  } else {
    // 只更新其他字段
    const updateData = {
      updatedAt: now,
      updatedBy: OPENID
    };

    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (category !== undefined) updateData.category = category;
    if (subCategory !== undefined) updateData.subCategory = subCategory;
    if (description !== undefined) updateData.description = description;
    if (defaultUnit !== undefined) updateData.defaultUnit = defaultUnit;
    if (carbonCoefficient !== undefined) updateData.carbonCoefficient = carbonCoefficient;

    await standardsCollection.doc(existing.data[0]._id).update({
      data: updateData
    });

    // 如果涉及别名变更，同步到因子库
    if (updateAliases) {
      await standardizer.syncAliasesToFactors(oldStandardName);
    }

    return {
      code: 0,
      message: '标准名称更新成功'
    };
  }
}

/**
 * 废弃标准名称
 */
async function deprecateStandard(event) {
  const { data: eventData = {}, userInfo } = event;
  const data = eventData || event || {};
  const { standardName } = data;

  if (!standardName) {
    return {
      code: 400,
      message: '请提供standardName参数'
    };
  }

  const standardsCollection = db.collection('ingredient_standards');
  const aliasesCollection = db.collection('ingredient_aliases');

  // 查找现有记录
  const existing = await standardsCollection
    .where({
      standardName: standardName
    })
    .limit(1)
    .get();

  if (existing.data.length === 0) {
    return {
      code: 404,
      message: '标准名称不存在'
    };
  }

  const now = new Date();
  const userInfoObj = event.userInfo || event || {};
  const OPENID = (userInfoObj.openId) || 'system';

  // 更新标准名称状态
  await standardsCollection.doc(existing.data[0]._id).update({
    data: {
      status: 'deprecated',
      updatedAt: now,
      updatedBy: OPENID
    }
  });

  // 废弃所有相关别名
  await aliasesCollection
    .where({
      standardName: standardName
    })
    .update({
      data: {
        status: 'deprecated',
        updatedAt: now
      }
    });

  return {
    code: 0,
    message: '标准名称已废弃'
  };
}

/**
 * 合并两个标准名称
 */
async function mergeStandards(event) {
  const { data: eventData = {}, userInfo } = event;
  const data = eventData || event || {};
  const { sourceStandardName, targetStandardName } = data;

  if (!sourceStandardName || !targetStandardName) {
    return {
      code: 400,
      message: '请提供sourceStandardName和targetStandardName参数'
    };
  }

  if (sourceStandardName === targetStandardName) {
    return {
      code: 400,
      message: '源标准名称和目标标准名称不能相同'
    };
  }

  const standardsCollection = db.collection('ingredient_standards');
  const aliasesCollection = db.collection('ingredient_aliases');

  // 检查两个标准名称是否存在
  const sourceStandard = await standardsCollection
    .where({
      standardName: sourceStandardName
    })
    .limit(1)
    .get();

  const targetStandard = await standardsCollection
    .where({
      standardName: targetStandardName
    })
    .limit(1)
    .get();

  if (sourceStandard.data.length === 0) {
    return {
      code: 404,
      message: '源标准名称不存在'
    };
  }

  if (targetStandard.data.length === 0) {
    return {
      code: 404,
      message: '目标标准名称不存在'
    };
  }

  const now = new Date();
  const userInfoObj = event.userInfo || event || {};
  const OPENID = (userInfoObj.openId) || 'system';

  // 1. 更新所有相关别名映射的standardName
  await aliasesCollection
    .where({
      standardName: sourceStandardName
    })
    .update({
      data: {
        standardName: targetStandardName,
        updatedAt: now
      }
    });

  // 2. 将源标准名称的别名也添加到目标标准名称
  const sourceAliases = await aliasesCollection
    .where({
      standardName: sourceStandardName
    })
    .get();

  for (const alias of sourceAliases.data) {
    // 检查目标标准名称是否已有该别名
    const existing = await aliasesCollection
      .where({
        alias: alias.alias,
        standardName: targetStandardName
      })
      .limit(1)
      .get();

    if (existing.data.length === 0) {
      // 创建新的别名映射
      await aliasesCollection.add({
        data: {
          alias: alias.alias,
          standardName: targetStandardName,
          confidence: alias.confidence || 0.8,
          source: 'merge',
          status: 'active',
          createdAt: now,
          updatedAt: now,
          createdBy: OPENID
        }
      });
    }
  }

  // 3. 废弃源标准名称
  await standardsCollection.doc(sourceStandard.data[0]._id).update({
    data: {
      status: 'deprecated',
      updatedAt: now,
      updatedBy: OPENID
    }
  });

  // 4. 同步到ingredients库
  const syncIngredientResult = await standardizer.syncStandardNameToIngredients(
    sourceStandardName,
    targetStandardName
  );

  // 5. 同步到因子库
  const syncFactorResult = await standardizer.syncAliasesToFactors(targetStandardName);

  return {
    code: 0,
    message: '标准名称合并成功',
    data: {
      sourceStandardName: sourceStandardName,
      targetStandardName: targetStandardName,
      syncIngredientResult: syncIngredientResult,
      syncFactorResult: syncFactorResult
    }
  };
}

/**
 * 获取别名列表
 */
async function listAliases(event) {
  const { data: eventData = {} } = event;
  const data = eventData || event || {};
  const { standardName } = data;

  if (!standardName) {
    return {
      code: 400,
      message: '请提供standardName参数'
    };
  }

  const aliasesCollection = db.collection('ingredient_aliases');
  const result = await aliasesCollection
    .where({
      standardName: standardName
    })
    .orderBy('createdAt', 'desc')
    .get();

  return {
    code: 0,
    message: '查询成功',
    data: {
      data: result.data,
      list: result.data // 兼容前端
    }
  };
}

/**
 * 添加别名映射
 */
async function addAlias(event) {
  const { data: eventData = {}, userInfo } = event;
  const data = eventData || event || {};
  const { standardName, alias, confidence = 1.0, source = 'manual' } = data;

  if (!standardName || !alias) {
    return {
      code: 400,
      message: '请提供standardName和alias参数'
    };
  }

  const aliasesCollection = db.collection('ingredient_aliases');

  // 检查是否已存在
  const existing = await aliasesCollection
    .where({
      alias: alias,
      standardName: standardName
    })
    .limit(1)
    .get();

  if (existing.data.length > 0) {
    return {
      code: 409,
      message: '别名映射已存在'
    };
  }

  const now = new Date();
  const userInfoObj = event.userInfo || event || {};
  const OPENID = (userInfoObj.openId) || 'system';

  // 创建别名映射
  await aliasesCollection.add({
    data: {
      alias: alias,
      standardName: standardName,
      confidence: confidence,
      source: source,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: OPENID
    }
  });

  // 立即同步到因子库
  const syncFactorResult = await standardizer.syncAliasesToFactors(standardName);

  return {
    code: 0,
    message: '别名添加成功',
    data: {
      alias: alias,
      standardName: standardName,
      syncFactorResult: syncFactorResult
    }
  };
}

/**
 * 删除别名映射
 */
async function removeAlias(event) {
  const { data: eventData = {}, userInfo } = event;
  const data = eventData || event || {};
  const { standardName, alias } = data;

  if (!standardName || !alias) {
    return {
      code: 400,
      message: '请提供standardName和alias参数'
    };
  }

  const aliasesCollection = db.collection('ingredient_aliases');

  // 查找别名映射
  const existing = await aliasesCollection
    .where({
      alias: alias,
      standardName: standardName
    })
    .limit(1)
    .get();

  if (existing.data.length === 0) {
    return {
      code: 404,
      message: '别名映射不存在'
    };
  }

  // 删除别名映射（或标记为废弃）
  await aliasesCollection.doc(existing.data[0]._id).update({
    data: {
      status: 'deprecated',
      updatedAt: new Date()
    }
  });

  // 立即同步到因子库
  const syncFactorResult = await standardizer.syncAliasesToFactors(standardName);

  return {
    code: 0,
    message: '别名删除成功',
    data: {
      syncFactorResult: syncFactorResult
    }
  };
}

/**
 * 批量添加别名
 */
async function batchAddAliases(event) {
  const { data: eventData = {}, userInfo } = event;
  const data = eventData || event || {};
  const { standardName, aliases } = data;

  if (!standardName || !Array.isArray(aliases) || aliases.length === 0) {
    return {
      code: 400,
      message: '请提供standardName和aliases数组参数'
    };
  }

  const aliasesCollection = db.collection('ingredient_aliases');
  const now = new Date();
  const userInfoObj = event.userInfo || event || {};
  const OPENID = (userInfoObj.openId) || 'system';

  let successCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const alias of aliases) {
    const aliasName = String(alias).trim();
    if (!aliasName) continue;

    try {
      // 检查是否已存在
      const existing = await aliasesCollection
        .where({
          alias: aliasName,
          standardName: standardName
        })
        .limit(1)
        .get();

      if (existing.data.length > 0) {
        skippedCount++;
        continue;
      }

      // 创建别名映射
      await aliasesCollection.add({
        data: {
          alias: aliasName,
          standardName: standardName,
          confidence: 0.9,
          source: 'manual',
          status: 'active',
          createdAt: now,
          updatedAt: now,
          createdBy: OPENID
        }
      });

      successCount++;
    } catch (error) {
      errors.push({
        alias: aliasName,
        error: error.message
      });
    }
  }

  // 批量同步到因子库
  const syncFactorResult = await standardizer.syncAliasesToFactors(standardName);

  return {
    code: 0,
    message: '批量添加别名完成',
    data: {
      total: aliases.length,
      success: successCount,
      skipped: skippedCount,
      failed: errors.length,
      errors: errors,
      syncFactorResult: syncFactorResult
    }
  };
}

