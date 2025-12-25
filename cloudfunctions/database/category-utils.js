const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 食材类别工具模块
 * 提供类别推断、映射等功能
 */

let categoryCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取所有活跃类别（带缓存）
 */
async function getCategories() {
  const now = Date.now();
  
  // 如果缓存有效，直接返回
  if (categoryCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return categoryCache;
  }

  try {
    const categoriesCollection = db.collection('ingredient_categories');
    const result = await categoriesCollection
      .where({
        status: 'active'
      })
      .orderBy('sortOrder', 'asc')
      .get();

    categoryCache = result.data || [];
    cacheTimestamp = now;
    
    return categoryCache;
  } catch (error) {
    console.error('获取类别列表失败:', error);
    // 如果数据库查询失败，返回空数组（向后兼容，回退到硬编码）
    return [];
  }
}

/**
 * 清除类别缓存
 */
function clearCategoryCache() {
  categoryCache = null;
  cacheTimestamp = null;
}

/**
 * 根据类别代码获取类别信息
 */
async function getCategoryByCode(categoryCode) {
  const categories = await getCategories();
  return categories.find(cat => cat.categoryCode === categoryCode) || null;
}

/**
 * 根据食材名称推断类别（使用类别表中的关键词）
 * 如果数据库中没有类别数据，回退到硬编码的推断逻辑
 */
async function inferCategory(ingredientName) {
  if (!ingredientName || typeof ingredientName !== 'string') {
    return 'others';
  }

  const categories = await getCategories();
  
  // 如果类别表为空，回退到硬编码的推断逻辑（向后兼容）
  if (!categories || categories.length === 0) {
    return inferCategoryFallback(ingredientName);
  }

  // 遍历所有类别，找到匹配的关键词
  let bestMatch = null;
  let maxMatchLength = 0;

  for (const category of categories) {
    const keywords = category.mapping && category.mapping.keywords ? category.mapping.keywords : [];
    
    for (const keyword of keywords) {
      if (ingredientName.includes(keyword)) {
        // 选择匹配关键词最长的类别（更精确）
        if (keyword.length > maxMatchLength) {
          maxMatchLength = keyword.length;
          bestMatch = category.categoryCode;
        }
      }
    }
  }

  return bestMatch || 'others';
}

/**
 * 回退的类别推断逻辑（硬编码，向后兼容）
 */
function inferCategoryFallback(ingredientName) {
  const categoryKeywords = {
    'vegetables': ['菜', '叶', '根', '茎', '笋', '萝卜', '白菜', '菠菜', '韭菜', '芹菜', '葱', '姜', '蒜', '辣椒', '黄瓜', '茄子', '豆角', '冬瓜', '南瓜', '丝瓜', '苦瓜', '番茄', '土豆', '红薯', '芋头', '莲藕', '胡萝卜', '白萝卜'],
    'beans': ['豆', '豆腐', '豆浆', '豆皮', '豆干', '腐竹', '豆芽', '绿豆', '红豆', '黑豆', '黄豆', '扁豆', '蚕豆'],
    'grains': ['米', '面', '粉', '麦', '玉米', '小麦', '大麦', '燕麦', '荞麦', '高粱', '小米', '大米', '糯米', '黑米', '糙米', '面粉', '淀粉'],
    'fruits': ['果', '苹果', '梨', '桃', '李', '杏', '枣', '葡萄', '草莓', '蓝莓', '樱桃', '橙', '桔', '柠檬', '香蕉', '西瓜', '哈密瓜', '甜瓜'],
    'nuts': ['坚果', '核桃', '杏仁', '花生', '瓜子', '松子', '腰果', '开心果', '榛子', '夏威夷果'],
    'mushrooms': ['菇', '菌', '蘑菇', '香菇', '金针菇', '平菇', '杏鲍菇', '木耳', '银耳'],
    'spices': ['胡椒', '花椒', '八角', '桂皮', '香叶', '孜然', '茴香', '香菜', '芝麻', '香油'],
    'others': []
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => ingredientName.includes(keyword))) {
      return category;
    }
  }
  
  return 'others';
}

/**
 * 映射类别代码到因子库的subCategory
 * 如果数据库中没有类别数据，回退到硬编码的映射逻辑
 */
async function mapCategoryToFactorSubCategory(categoryCode) {
  const category = await getCategoryByCode(categoryCode);
  
  if (category && category.mapping && category.mapping.factorSubCategory) {
    return category.mapping.factorSubCategory;
  }

  // 回退到硬编码的映射逻辑（向后兼容）
  return mapCategoryToFactorSubCategoryFallback(categoryCode);
}

/**
 * 回退的类别映射逻辑（硬编码，向后兼容）
 */
function mapCategoryToFactorSubCategoryFallback(categoryCode) {
  const categoryMap = getFallbackCategoryMap();
  return categoryMap[categoryCode] || 'other';
}

/**
 * 获取硬编码的类别映射（作为fallback）
 * 当类别工具模块不可用时使用
 */
function getFallbackCategoryMap() {
  return {
    vegetables: 'vegetable',
    beans: 'bean_product',
    grains: 'grain',
    fruits: 'fruit',
    nuts: 'nut',
    mushrooms: 'mushroom',
    seafood: 'seafood',
    dairy: 'dairy',
    spices: 'spice',
    others: 'other'
  };
}

module.exports = {
  getCategories,
  getCategoryByCode,
  inferCategory,
  mapCategoryToFactorSubCategory,
  getFallbackCategoryMap,
  clearCategoryCache
};

