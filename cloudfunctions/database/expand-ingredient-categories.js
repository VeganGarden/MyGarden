const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 扩展食材类别定义
 * 添加荤食类别和更多素食类别
 */
exports.main = async (event) => {
  const results = [];
  
  console.log('========================================');
  console.log('开始扩展食材类别定义...');
  console.log('========================================\n');

  try {
    const categoriesCollection = db.collection('ingredient_categories');
    
    // 扩展的类别数据（包括荤食类别）
    const expandedCategories = [
      // 荤食类别（新增）
      {
        categoryCode: 'red_meat',
        categoryName: '红肉类',
        categoryNameEn: 'Red Meat',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 11,
        mapping: {
          factorSubCategory: 'red_meat',
          keywords: ['牛肉', '羊肉', '猪肉', '羊肉', '驴肉', '马肉', '鹿肉', '牛', '羊', '猪', '里脊', '排骨', '五花肉', '瘦肉', '肥肉', '培根', '火腿', '腊肉', '香肠', '腊肠']
        },
        description: '红肉类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'poultry',
        categoryName: '禽肉类',
        categoryNameEn: 'Poultry',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 12,
        mapping: {
          factorSubCategory: 'poultry',
          keywords: ['鸡', '鸭', '鹅', '火鸡', '鸽子', '鹌鹑', '鸡胸', '鸡腿', '鸡翅', '鸡爪', '鸭肉', '鹅肉', '鸡蛋', '鸭蛋', '鹅蛋', '鹌鹑蛋']
        },
        description: '禽肉类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'processed_meat',
        categoryName: '加工肉类',
        categoryNameEn: 'Processed Meat',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 13,
        mapping: {
          factorSubCategory: 'processed_meat',
          keywords: ['火腿', '香肠', '腊肠', '培根', '腊肉', '肉松', '肉干', '肉脯', '肉丸', '肉饼', '午餐肉', '罐头肉', '熏肉', '腌肉']
        },
        description: '加工肉类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // 补充素食类别关键词
      {
        categoryCode: 'oils',
        categoryName: '油脂类',
        categoryNameEn: 'Oils & Fats',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 14,
        mapping: {
          factorSubCategory: 'oil',
          keywords: ['油', '花生油', '菜籽油', '大豆油', '橄榄油', '芝麻油', '茶籽油', '玉米油', '葵花籽油', '猪油', '牛油', '黄油', '奶油']
        },
        description: '油脂类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'condiments',
        categoryName: '调味品类',
        categoryNameEn: 'Condiments',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 15,
        mapping: {
          factorSubCategory: 'condiment',
          keywords: ['酱油', '醋', '盐', '糖', '味精', '鸡精', '蚝油', '料酒', '豆瓣酱', '辣椒酱', '番茄酱', '甜面酱', '黄豆酱', '腐乳', '豆豉']
        },
        description: '调味品类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'herbs',
        categoryName: '香草类',
        categoryNameEn: 'Herbs',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 16,
        mapping: {
          factorSubCategory: 'herb',
          keywords: ['香菜', '葱', '蒜', '姜', '韭菜', '茴香', '薄荷', '罗勒', '迷迭香', '百里香', '欧芹', '香茅']
        },
        description: '香草类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'seaweed',
        categoryName: '海藻类',
        categoryNameEn: 'Seaweed',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 17,
        mapping: {
          factorSubCategory: 'seaweed',
          keywords: ['海带', '紫菜', '海苔', '裙带菜', '羊栖菜', '石花菜', '海藻']
        },
        description: '海藻类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'legumes',
        categoryName: '豆类',
        categoryNameEn: 'Legumes',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 18,
        mapping: {
          factorSubCategory: 'legume',
          keywords: ['绿豆', '红豆', '黑豆', '黄豆', '扁豆', '蚕豆', '芸豆', '花豆', '眉豆', '豇豆', '毛豆', '豌豆']
        },
        description: '豆类食材（干豆）',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'tubers',
        categoryName: '薯类',
        categoryNameEn: 'Tubers',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 19,
        mapping: {
          factorSubCategory: 'tuber',
          keywords: ['土豆', '红薯', '紫薯', '芋头', '山药', '莲藕', '荸荠', '菱角', '魔芋']
        },
        description: '薯类食材',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        categoryCode: 'beverages',
        categoryName: '饮品类',
        categoryNameEn: 'Beverages',
        parentCategoryCode: null,
        level: 1,
        sortOrder: 20,
        mapping: {
          factorSubCategory: 'beverage',
          keywords: ['茶', '咖啡', '果汁', '豆浆', '牛奶', '酸奶', '饮料', '水']
        },
        description: '饮品类',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const category of expandedCategories) {
      try {
        // 检查是否已存在
        const existing = await categoriesCollection.where({
          categoryCode: category.categoryCode
        }).get();

        if (existing.data && existing.data.length > 0) {
          // 已存在，更新关键词（合并）
          const existingCategory = existing.data[0];
          const existingKeywords = existingCategory.mapping?.keywords || [];
          const newKeywords = category.mapping.keywords || [];
          // 合并关键词，去重
          const mergedKeywords = [...new Set([...existingKeywords, ...newKeywords])];
          
          await categoriesCollection.doc(existingCategory._id).update({
            data: {
              mapping: {
                factorSubCategory: existingCategory.mapping?.factorSubCategory || category.mapping.factorSubCategory,
                keywords: mergedKeywords
              },
              updatedAt: new Date()
            }
          });
          
          skippedCount++;
          console.log(`⚠️  类别 ${category.categoryCode} 已存在，已更新关键词`);
        } else {
          // 插入新数据
          await categoriesCollection.add({
            data: category
          });
          insertedCount++;
          console.log(`✅ 类别 ${category.categoryCode} 添加成功`);
        }
      } catch (error) {
        console.error(`❌ 处理类别 ${category.categoryCode} 失败:`, error);
        throw error;
      }
    }

    results.push({
      step: 'expandCategories',
      status: 'success',
      message: `成功添加 ${insertedCount} 个新类别，更新 ${skippedCount} 个已存在的类别`
    });

    console.log('\n========================================');
    console.log('食材类别扩展完成');
    console.log(`- 新增类别: ${insertedCount} 个`);
    console.log(`- 更新类别: ${skippedCount} 个`);
    console.log('========================================\n');

    return {
      code: 0,
      message: '食材类别扩展成功',
      summary: {
        insertedCount: insertedCount,
        updatedCount: skippedCount,
        totalCategories: expandedCategories.length,
        results: results
      }
    };

  } catch (error) {
    console.error('❌ 扩展失败:', error);
    return {
      code: 500,
      message: '食材类别扩展失败',
      error: error.message,
      results: results
    };
  }
};

