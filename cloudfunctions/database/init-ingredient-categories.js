const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 初始化食材类别集合
 * 创建 ingredient_categories 集合并初始化默认类别数据
 */
exports.main = async (event) => {
  const results = [];
  
  console.log('========================================');
  console.log('开始初始化食材类别集合...');
  console.log('========================================\n');

  try {
    // 1. 创建 ingredient_categories 集合
    console.log('[1/2] 创建 ingredient_categories 集合...');
    try {
      await db.createCollection('ingredient_categories');
      results.push({
        collection: 'ingredient_categories',
        status: 'success',
        message: '集合创建成功'
      });
      console.log('✅ ingredient_categories 集合创建成功');
    } catch (error) {
      if (error.errCode === -1) {
        // 集合已存在
        results.push({
          collection: 'ingredient_categories',
          status: 'skipped',
          message: '集合已存在，跳过'
        });
        console.log('⚠️  ingredient_categories 集合已存在，跳过');
      } else {
        throw error;
      }
    }

    // 2. 初始化默认类别数据
    console.log('[2/2] 初始化默认类别数据...');
    const categoriesCollection = db.collection('ingredient_categories');
    
    // 默认类别数据（基于现有代码中的硬编码类别）
    const defaultCategories = [
      {
        categoryCode: 'vegetables',
        categoryName: '蔬菜类',
        categoryNameEn: 'Vegetables',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 1,
        mapping: {
          factorSubCategory: 'vegetable',
          keywords: ['菜', '叶', '根', '茎', '笋', '萝卜', '白菜', '菠菜', '韭菜', '芹菜', '葱', '姜', '蒜', '辣椒', '黄瓜', '茄子', '豆角', '冬瓜', '南瓜', '丝瓜', '苦瓜', '番茄', '土豆', '红薯', '芋头', '莲藕', '胡萝卜', '白萝卜']
        },
        description: '蔬菜类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'beans',
        categoryName: '豆制品',
        categoryNameEn: 'Beans & Bean Products',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 2,
        mapping: {
          factorSubCategory: 'bean_product',
          keywords: ['豆', '豆腐', '豆浆', '豆皮', '豆干', '腐竹', '豆芽', '绿豆', '红豆', '黑豆', '黄豆', '扁豆', '蚕豆']
        },
        description: '豆制品食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'grains',
        categoryName: '谷物类',
        categoryNameEn: 'Grains',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 3,
        mapping: {
          factorSubCategory: 'grain',
          keywords: ['米', '面', '粉', '麦', '玉米', '小麦', '大麦', '燕麦', '荞麦', '高粱', '小米', '大米', '糯米', '黑米', '糙米', '面粉', '淀粉']
        },
        description: '谷物类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'fruits',
        categoryName: '水果类',
        categoryNameEn: 'Fruits',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 4,
        mapping: {
          factorSubCategory: 'fruit',
          keywords: ['果', '苹果', '梨', '桃', '李', '杏', '枣', '葡萄', '草莓', '蓝莓', '樱桃', '橙', '桔', '柠檬', '香蕉', '西瓜', '哈密瓜', '甜瓜']
        },
        description: '水果类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'nuts',
        categoryName: '坚果类',
        categoryNameEn: 'Nuts',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 5,
        mapping: {
          factorSubCategory: 'nut',
          keywords: ['坚果', '核桃', '杏仁', '花生', '瓜子', '松子', '腰果', '开心果', '榛子', '夏威夷果']
        },
        description: '坚果类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'mushrooms',
        categoryName: '菌菇类',
        categoryNameEn: 'Mushrooms',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 6,
        mapping: {
          factorSubCategory: 'mushroom',
          keywords: ['菇', '菌', '蘑菇', '香菇', '金针菇', '平菇', '杏鲍菇', '木耳', '银耳']
        },
        description: '菌菇类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'spices',
        categoryName: '调料类',
        categoryNameEn: 'Spices',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 7,
        mapping: {
          factorSubCategory: 'spice',
          keywords: ['胡椒', '花椒', '八角', '桂皮', '香叶', '孜然', '茴香', '香菜', '芝麻', '香油']
        },
        description: '调料类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'seafood',
        categoryName: '海鲜类',
        categoryNameEn: 'Seafood',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 8,
        mapping: {
          factorSubCategory: 'seafood',
          keywords: ['鱼', '虾', '蟹', '贝', '海带', '紫菜', '海参', '鱿鱼', '章鱼']
        },
        description: '海鲜类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'dairy',
        categoryName: '乳制品',
        categoryNameEn: 'Dairy',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 9,
        mapping: {
          factorSubCategory: 'dairy',
          keywords: ['奶', '乳', '酸奶', '奶酪', '黄油']
        },
        description: '乳制品食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'others',
        categoryName: '其他',
        categoryNameEn: 'Others',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 10,
        mapping: {
          factorSubCategory: 'other',
          keywords: []
        },
        description: '其他类别食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const category of defaultCategories) {
      try {
        // 检查是否已存在
        const existing = await categoriesCollection.where({
          categoryCode: category.categoryCode
        }).get();

        if (existing.data && existing.data.length > 0) {
          // 已存在，跳过
          skippedCount++;
          console.log(`⚠️  类别 ${category.categoryCode} 已存在，跳过`);
        } else {
          // 插入新数据
          await categoriesCollection.add({
            data: category
          });
          insertedCount++;
          console.log(`✅ 类别 ${category.categoryCode} 初始化成功`);
        }
      } catch (error) {
        console.error(`❌ 初始化类别 ${category.categoryCode} 失败:`, error);
        throw error;
      }
    }

    results.push({
      step: 'initDefaultCategories',
      status: 'success',
      message: `成功初始化 ${insertedCount} 个类别，跳过 ${skippedCount} 个已存在的类别`
    });

    console.log('\n========================================');
    console.log('食材类别集合初始化完成');
    console.log(`- 创建集合: ${results[0].status === 'success' ? '成功' : '已存在'}`);
    console.log(`- 初始化类别: ${insertedCount} 个新类别，${skippedCount} 个已存在`);
    console.log('========================================\n');

    // 返回结果
    return {
      code: 0,
      message: '食材类别集合初始化成功',
      summary: {
        collectionStatus: results[0].status,
        insertedCount: insertedCount,
        skippedCount: skippedCount,
        totalCategories: defaultCategories.length,
        results: results
      }
    };

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    return {
      code: 500,
      message: '食材类别集合初始化失败',
      error: error.message,
      results: results
    };
  }
};

