const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const categoryUtils = require('./category-utils');

/**
 * 获取类别列表
 */
async function listCategories(event) {
  const { status, keyword, page = 1, pageSize = 20 } = event.data || event || {};

  const categoriesCollection = db.collection('ingredient_categories');
  let query = categoriesCollection;

  // 状态筛选
  if (status) {
    query = query.where({
      status: status
    });
  } else {
    // 默认只显示活跃的
    query = query.where({
      status: 'active'
    });
  }

  // 关键词搜索（类别代码或名称）
  if (keyword) {
    query = query.where(
      _.or([
        { categoryCode: db.RegExp({ regexp: keyword, options: 'i' }) },
        { categoryName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { categoryNameEn: db.RegExp({ regexp: keyword, options: 'i' }) }
      ])
    );
  }

  try {
    // 获取总数
    const countResult = await query.count();
    const total = countResult.total;

    // 获取分页数据
    const result = await query
      .orderBy('sortOrder', 'asc')
      .orderBy('categoryCode', 'asc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      message: '获取类别列表成功',
      data: {
        list: result.data || [],
        pagination: {
          current: page,
          pageSize: pageSize,
          total: total
        }
      }
    };
  } catch (error) {
    console.error('获取类别列表失败:', error);
    return {
      code: 500,
      message: '获取类别列表失败',
      error: error.message
    };
  }
}

/**
 * 获取类别详情
 */
async function getCategory(event) {
  const { categoryCode } = event.data || event || {};

  if (!categoryCode) {
    return {
      code: 400,
      message: '缺少参数: categoryCode'
    };
  }

  try {
    const categoriesCollection = db.collection('ingredient_categories');
    const result = await categoriesCollection
      .where({
        categoryCode: categoryCode
      })
      .get();

    if (result.data && result.data.length > 0) {
      return {
        code: 0,
        message: '获取类别详情成功',
        data: result.data[0]
      };
    } else {
      return {
        code: 404,
        message: '类别不存在'
      };
    }
  } catch (error) {
    console.error('获取类别详情失败:', error);
    return {
      code: 500,
      message: '获取类别详情失败',
      error: error.message
    };
  }
}

/**
 * 创建类别
 */
async function createCategory(event, userInfo) {
  const { data } = event;
  const {
    categoryCode,
    categoryName,
    categoryNameEn,
    parentCategoryCode,
    level = 1,
    sortOrder,
    mapping,
    description,
    status = 'active'
  } = data || {};

  if (!categoryCode || !categoryName) {
    return {
      code: 400,
      message: '缺少必填参数: categoryCode, categoryName'
    };
  }

  // 验证categoryCode格式（只能包含字母、数字、下划线）
  if (!/^[a-zA-Z0-9_]+$/.test(categoryCode)) {
    return {
      code: 400,
      message: '类别代码格式不正确，只能包含字母、数字和下划线'
    };
  }

  try {
    const categoriesCollection = db.collection('ingredient_categories');

    // 检查是否已存在
    const existing = await categoriesCollection
      .where({
        categoryCode: categoryCode
      })
      .get();

    if (existing.data && existing.data.length > 0) {
      return {
        code: 409,
        message: '类别代码已存在'
      };
    }

    // 创建新类别
    const now = new Date();
    const categoryData = {
      categoryCode,
      categoryName,
      categoryNameEn: categoryNameEn || '',
      parentCategoryCode: parentCategoryCode || null,
      level: level || 1,
      sortOrder: sortOrder || 999,
      mapping: mapping || {
        factorSubCategory: categoryCode,
        keywords: []
      },
      description: description || '',
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: (userInfo && userInfo.openId) ? userInfo.openId : 'system',
      updatedBy: (userInfo && userInfo.openId) ? userInfo.openId : 'system'
    };

    await categoriesCollection.add({
      data: categoryData
    });

    // 清除缓存
    categoryUtils.clearCategoryCache();

    return {
      code: 0,
      message: '创建类别成功',
      data: categoryData
    };
  } catch (error) {
    console.error('创建类别失败:', error);
    return {
      code: 500,
      message: '创建类别失败',
      error: error.message
    };
  }
}

/**
 * 更新类别
 */
async function updateCategory(event, userInfo) {
  const { data } = event;
  const { categoryCode } = data || {};

  if (!categoryCode) {
    return {
      code: 400,
      message: '缺少参数: categoryCode'
    };
  }

  // categoryCode不能修改，从更新数据中移除
  const updateData = { ...data };
  delete updateData.categoryCode;

  // 准备更新字段
  const updateFields = {};
  const allowedFields = [
    'categoryName',
    'categoryNameEn',
    'parentCategoryCode',
    'level',
    'sortOrder',
    'mapping',
    'description',
    'status'
  ];

  for (const field of allowedFields) {
    if (updateData.hasOwnProperty(field)) {
      updateFields[field] = updateData[field];
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return {
      code: 400,
      message: '没有要更新的字段'
    };
  }

  // 添加更新时间
  updateFields.updatedAt = new Date();
  if (userInfo && userInfo.openId) {
    updateFields.updatedBy = userInfo.openId;
  }

  try {
    const categoriesCollection = db.collection('ingredient_categories');
    const result = await categoriesCollection
      .where({
        categoryCode: categoryCode
      })
      .update({
        data: updateFields
      });

    if (result.stats.updated > 0) {
      // 清除缓存
      categoryUtils.clearCategoryCache();

      return {
        code: 0,
        message: '更新类别成功',
        data: updateFields
      };
    } else {
      return {
        code: 404,
        message: '类别不存在'
      };
    }
  } catch (error) {
    console.error('更新类别失败:', error);
    return {
      code: 500,
      message: '更新类别失败',
      error: error.message
    };
  }
}

/**
 * 删除类别（软删除，设置为deprecated）
 */
async function deleteCategory(event, userInfo) {
  const { categoryCode } = event.data || event || {};

  if (!categoryCode) {
    return {
      code: 400,
      message: '缺少参数: categoryCode'
    };
  }

  // 不允许删除默认类别
  const defaultCategories = ['vegetables', 'beans', 'grains', 'fruits', 'nuts', 'mushrooms', 'spices', 'seafood', 'dairy', 'others'];
  if (defaultCategories.includes(categoryCode)) {
    return {
      code: 403,
      message: '不允许删除默认类别'
    };
  }

  try {
    const categoriesCollection = db.collection('ingredient_categories');
    const result = await categoriesCollection
      .where({
        categoryCode: categoryCode
      })
      .update({
        data: {
          status: 'deprecated',
          updatedAt: new Date(),
          updatedBy: (userInfo && userInfo.openId) ? userInfo.openId : 'system'
        }
      });

    if (result.stats.updated > 0) {
      // 清除缓存
      categoryUtils.clearCategoryCache();

      return {
        code: 0,
        message: '删除类别成功（已设置为废弃状态）'
      };
    } else {
      return {
        code: 404,
        message: '类别不存在'
      };
    }
  } catch (error) {
    console.error('删除类别失败:', error);
    return {
      code: 500,
      message: '删除类别失败',
      error: error.message
    };
  }
}

/**
 * 获取类别的关键词列表
 */
async function getCategoryKeywords(event) {
  const { categoryCode } = event.data || event || {};

  if (!categoryCode) {
    return {
      code: 400,
      message: '缺少参数: categoryCode'
    };
  }

  try {
    const category = await categoryUtils.getCategoryByCode(categoryCode);
    if (!category) {
      return {
        code: 404,
        message: '类别不存在'
      };
    }

    const keywords = (category.mapping && category.mapping.keywords) ? category.mapping.keywords : [];

    return {
      code: 0,
      message: '获取关键词列表成功',
      data: {
        categoryCode: categoryCode,
        keywords: keywords
      }
    };
  } catch (error) {
    console.error('获取关键词列表失败:', error);
    return {
      code: 500,
      message: '获取关键词列表失败',
      error: error.message
    };
  }
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryKeywords
};

