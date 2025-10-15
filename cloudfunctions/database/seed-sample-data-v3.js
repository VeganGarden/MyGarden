/**
 * v3.0 示例数据导入脚本
 * 
 * 功能: 为 v3.0 新集合导入测试数据
 * - 商品数据 (products + inventory)
 * - 优惠券数据 (coupons)
 * - 营销活动 (promotions)
 * - 业务规则 (business_rules)
 * - 测试订单 (更新现有 orders 用户字段)
 * 
 * 执行: tcb fn invoke database --params '{"action":"seed-v3-data"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function seedV3SampleData() {
  console.log('===== 开始导入 v3.0 示例数据 =====\n');
  
  const results = {
    products: 0,
    inventory: 0,
    coupons: 0,
    promotions: 0,
    businessRules: 0,
    userUpdates: 0
  };
  
  try {
    // 1. 导入商品数据
    console.log('--- 1. 导入商品数据 ---');
    results.products = await importProducts();
    
    // 2. 导入库存数据
    console.log('\n--- 2. 导入库存数据 ---');
    results.inventory = await importInventory();
    
    // 3. 导入优惠券
    console.log('\n--- 3. 导入优惠券 ---');
    results.coupons = await importCoupons();
    
    // 4. 导入营销活动
    console.log('\n--- 4. 导入营销活动 ---');
    results.promotions = await importPromotions();
    
    // 5. 导入业务规则
    console.log('\n--- 5. 导入业务规则 ---');
    results.businessRules = await importBusinessRules();
    
    // 6. 更新测试用户数据
    console.log('\n--- 6. 更新测试用户数据 ---');
    results.userUpdates = await updateTestUsers();
    
    console.log('\n===== v3.0 示例数据导入完成 =====');
    
    return {
      code: 0,
      message: 'v3.0 示例数据导入成功',
      results,
      summary: {
        total: Object.values(results).reduce((sum, count) => sum + count, 0)
      }
    };
    
  } catch (error) {
    console.error('导入失败:', error);
    return {
      code: 500,
      message: '导入失败',
      error: error.message,
      results
    };
  }
}

/**
 * 导入商品数据
 */
async function importProducts() {
  const products = [
    {
      productId: 'JY-001',
      name: '九悦有机豆腐',
      nameEn: 'Organic Tofu',
      category: '生鲜',
      subcategory: '豆制品',
      brand: '九悦自营',
      description: '精选东北非转基因黄豆，传统工艺制作，口感细腻，豆香浓郁。富含优质植物蛋白，适合各种烹饪方式。',
      highlights: ['有机认证', '非转基因', '当日新鲜', '高蛋白'],
      certifications: ['有机认证', '非转基因'],
      specs: [
        {
          specId: 'spec-500g',
          name: '500g装',
          price: 12.8,
          marketPrice: 15.8,
          stock: 500,
          unit: '盒',
          barcode: '6901234567890'
        }
      ],
      linkedData: {
        ingredientId: null, // 需要后续关联
        usedInRecipes: [],
        carbonFootprint: 1.2,
        carbonCalculationMethod: 'FAO标准',
        certifiedByPractitioners: [
          {
            practitionerId: null,
            practitionerName: '李明',
            certificationLevel: 'gold',
            testimonial: '豆腐是我10年素食的主要蛋白质来源，九悦的豆腐口感细腻，豆香味浓，非常推荐！每周至少吃5次。',
            videoUrl: '',
            certifiedAt: new Date('2025-10-01')
          }
        ],
        tcmProperties: {
          nature: '凉',
          suitableBodyTypes: ['阴虚', '燥热', '平和'],
          bestSeasons: ['夏', '秋']
        }
      },
      recommendTags: {
        scenarios: ['快手早餐', '健身餐', '日常家常', '减肥餐'],
        healthNeeds: ['高蛋白', '低脂', '低碳水'],
        dietTypes: ['pure_vegan', 'lacto_ovo'],
        bodyTypes: ['阴虚', '燥热', '平和'],
        solarTerms: ['立秋', '白露', '寒露', '霜降']
      },
      media: {
        mainImage: 'https://example.com/tofu-main.jpg',
        detailImages: ['https://example.com/tofu-1.jpg', 'https://example.com/tofu-2.jpg'],
        videos: [],
        practitionerCookingVideos: []
      },
      salesData: {
        totalSales: 1250,
        monthSales: 180,
        rating: 4.8,
        reviewCount: 86,
        favorites: 230,
        viewCount: 3500
      },
      shipping: {
        weight: 500,
        volume: { length: 15, width: 10, height: 5 },
        freeShippingThreshold: 99,
        deliveryTime: '当日达'
      },
      status: 'on_sale',
      stockAlert: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      onShelfAt: new Date()
    },
    {
      productId: 'JY-002',
      name: '九悦有机糙米',
      nameEn: 'Organic Brown Rice',
      category: '干货',
      subcategory: '谷物',
      brand: '九悦自营',
      description: '东北五常有机糙米，富含膳食纤维，低GI值，适合控糖人群。保留胚芽和糠层，营养完整。',
      highlights: ['有机认证', '低GI', '富含纤维', '完整营养'],
      certifications: ['有机认证'],
      specs: [
        {
          specId: 'spec-2kg',
          name: '2kg装',
          price: 38.8,
          marketPrice: 48.8,
          stock: 300,
          unit: '袋',
          barcode: '6901234567891'
        },
        {
          specId: 'spec-5kg',
          name: '5kg装',
          price: 88.0,
          marketPrice: 108.0,
          stock: 150,
          unit: '袋',
          barcode: '6901234567892'
        }
      ],
      linkedData: {
        ingredientId: null,
        usedInRecipes: [],
        carbonFootprint: 0.8,
        carbonCalculationMethod: 'FAO标准',
        certifiedByPractitioners: [
          {
            practitionerId: null,
            practitionerName: '王芳',
            certificationLevel: 'silver',
            testimonial: '糙米是我的主食首选，营养丰富，饱腹感强，控糖效果好。九悦的糙米品质稳定。',
            videoUrl: '',
            certifiedAt: new Date('2025-09-15')
          }
        ],
        tcmProperties: {
          nature: '平',
          suitableBodyTypes: ['平和', '气虚', '痰湿'],
          bestSeasons: ['春', '夏', '秋', '冬']
        }
      },
      recommendTags: {
        scenarios: ['日常主食', '健身餐', '控糖饮食', '减肥餐'],
        healthNeeds: ['控糖', '高纤维', '饱腹感', '缓释能量'],
        dietTypes: ['pure_vegan', 'lacto_ovo'],
        bodyTypes: ['平和', '气虚', '痰湿', '湿热'],
        solarTerms: ['谷雨', '小满', '芒种', '立秋']
      },
      media: {
        mainImage: 'https://example.com/rice-main.jpg',
        detailImages: ['https://example.com/rice-1.jpg'],
        videos: [],
        practitionerCookingVideos: []
      },
      salesData: {
        totalSales: 2150,
        monthSales: 320,
        rating: 4.9,
        reviewCount: 156,
        favorites: 480,
        viewCount: 6800
      },
      shipping: {
        weight: 2000,
        volume: { length: 30, width: 20, height: 8 },
        freeShippingThreshold: 99,
        deliveryTime: '次日达'
      },
      status: 'on_sale',
      stockAlert: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      onShelfAt: new Date()
    },
    {
      productId: 'JY-003',
      name: '九悦新鲜西兰花',
      nameEn: 'Fresh Broccoli',
      category: '生鲜',
      subcategory: '蔬菜',
      brand: '九悦自营',
      description: '新鲜西兰花，富含维生素C和蛋白质，营养价值极高，被誉为"蔬菜之冠"。',
      highlights: ['新鲜', '高蛋白', '富含维C', '抗氧化'],
      certifications: [],
      specs: [
        {
          specId: 'spec-500g',
          name: '500g装',
          price: 9.9,
          marketPrice: 12.9,
          stock: 150,
          unit: '份',
          barcode: '6901234567893'
        }
      ],
      linkedData: {
        ingredientId: null,
        usedInRecipes: [],
        carbonFootprint: 0.4,
        carbonCalculationMethod: 'FAO标准',
        certifiedByPractitioners: [],
        tcmProperties: {
          nature: '平',
          suitableBodyTypes: ['平和', '气虚', '阳虚'],
          bestSeasons: ['春', '秋']
        }
      },
      recommendTags: {
        scenarios: ['健身餐', '减肥餐', '日常蔬菜', '儿童营养'],
        healthNeeds: ['高蛋白', '维生素C', '抗氧化', '增强免疫'],
        dietTypes: ['pure_vegan', 'lacto_ovo'],
        bodyTypes: ['平和', '气虚', '阳虚', '血虚'],
        solarTerms: ['立春', '清明', '立秋', '霜降']
      },
      media: {
        mainImage: 'https://example.com/broccoli-main.jpg',
        detailImages: [],
        videos: [],
        practitionerCookingVideos: []
      },
      salesData: {
        totalSales: 890,
        monthSales: 120,
        rating: 4.7,
        reviewCount: 45,
        favorites: 180,
        viewCount: 1200
      },
      shipping: {
        weight: 500,
        volume: { length: 20, width: 15, height: 10 },
        freeShippingThreshold: 99,
        deliveryTime: '当日达'
      },
      status: 'on_sale',
      stockAlert: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      onShelfAt: new Date()
    },
    {
      productId: 'JY-004',
      name: '九悦黑芝麻核桃粉',
      nameEn: 'Black Sesame Walnut Powder',
      category: '即食',
      subcategory: '冲调品',
      brand: '九悦自营',
      description: '精选黑芝麻和核桃，低温烘焙研磨，保留营养。补肾养发，健脑益智，方便冲调。',
      highlights: ['补肾养发', '健脑益智', '方便速食', '零添加'],
      certifications: [],
      specs: [
        {
          specId: 'spec-500g',
          name: '500g罐装',
          price: 58.0,
          marketPrice: 78.0,
          stock: 200,
          unit: '罐',
          barcode: '6901234567894'
        }
      ],
      linkedData: {
        ingredientId: null,
        usedInRecipes: [],
        carbonFootprint: 0.6,
        carbonCalculationMethod: '估算',
        certifiedByPractitioners: [
          {
            practitionerId: null,
            practitionerName: '张强',
            certificationLevel: 'diamond',
            testimonial: '素食6年，每天早餐必备。补肾效果明显，头发变浓密，精力充沛。配合豆浆更好。',
            videoUrl: '',
            certifiedAt: new Date('2025-09-20')
          }
        ],
        tcmProperties: {
          nature: '温',
          suitableBodyTypes: ['阳虚', '气虚', '血虚'],
          bestSeasons: ['秋', '冬']
        }
      },
      recommendTags: {
        scenarios: ['快手早餐', '加餐零食', '孕妇营养', '老人保健'],
        healthNeeds: ['补肾', '养发', '健脑', '补血'],
        dietTypes: ['pure_vegan'],
        bodyTypes: ['阳虚', '气虚', '血虚', '平和'],
        solarTerms: ['立秋', '寒露', '立冬', '大雪', '小寒']
      },
      media: {
        mainImage: 'https://example.com/sesame-powder-main.jpg',
        detailImages: ['https://example.com/sesame-1.jpg'],
        videos: [],
        practitionerCookingVideos: []
      },
      salesData: {
        totalSales: 650,
        monthSales: 95,
        rating: 4.9,
        reviewCount: 78,
        favorites: 320,
        viewCount: 2100
      },
      shipping: {
        weight: 500,
        volume: { length: 12, width: 12, height: 15 },
        freeShippingThreshold: 99,
        deliveryTime: '次日达'
      },
      status: 'on_sale',
      stockAlert: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      onShelfAt: new Date()
    },
    {
      productId: 'JY-005',
      name: '九悦素食酱油',
      nameEn: 'Vegetarian Soy Sauce',
      category: '调味料',
      subcategory: '酱油',
      brand: '九悦自营',
      description: '零添加酿造酱油，不含动物成分，适合严格素食者。古法酿造，酱香浓郁。',
      highlights: ['零添加', '纯素认证', '古法酿造', '酱香浓郁'],
      certifications: ['纯素认证'],
      specs: [
        {
          specId: 'spec-500ml',
          name: '500ml装',
          price: 18.8,
          marketPrice: 25.8,
          stock: 400,
          unit: '瓶',
          barcode: '6901234567895'
        }
      ],
      linkedData: {
        ingredientId: null,
        usedInRecipes: [],
        carbonFootprint: 0.3,
        carbonCalculationMethod: '估算',
        certifiedByPractitioners: [],
        tcmProperties: {
          nature: '平',
          suitableBodyTypes: ['平和', '气虚', '阴虚', '阳虚'],
          bestSeasons: ['春', '夏', '秋', '冬']
        }
      },
      recommendTags: {
        scenarios: ['日常烹饪', '凉拌菜', '炒菜', '蘸料'],
        healthNeeds: ['零添加', '纯素'],
        dietTypes: ['pure_vegan'],
        bodyTypes: ['平和', '气虚', '阴虚', '阳虚', '痰湿', '湿热'],
        solarTerms: [] // 四季皆宜
      },
      media: {
        mainImage: 'https://example.com/soy-sauce-main.jpg',
        detailImages: [],
        videos: [],
        practitionerCookingVideos: []
      },
      salesData: {
        totalSales: 1580,
        monthSales: 215,
        rating: 4.8,
        reviewCount: 124,
        favorites: 410,
        viewCount: 4200
      },
      shipping: {
        weight: 550,
        volume: { length: 8, width: 8, height: 20 },
        freeShippingThreshold: 99,
        deliveryTime: '次日达'
      },
      status: 'on_sale',
      stockAlert: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      onShelfAt: new Date()
    },
    {
      productId: 'JY-006',
      name: '九悦有机香菇',
      nameEn: 'Organic Shiitake Mushroom',
      category: '干货',
      subcategory: '菌菇',
      brand: '九悦自营',
      description: '有机栽培香菇，肉厚味浓，富含多糖和维生素D。提升免疫力，增鲜提味。',
      highlights: ['有机认证', '富含多糖', '增强免疫', '鲜味浓郁'],
      certifications: ['有机认证'],
      specs: [
        {
          specId: 'spec-250g',
          name: '250g装',
          price: 32.8,
          marketPrice: 42.8,
          stock: 180,
          unit: '袋',
          barcode: '6901234567896'
        }
      ],
      linkedData: {
        ingredientId: null,
        usedInRecipes: [],
        carbonFootprint: 0.5,
        carbonCalculationMethod: '估算',
        certifiedByPractitioners: [],
        tcmProperties: {
          nature: '平',
          suitableBodyTypes: ['平和', '气虚', '阳虚'],
          bestSeasons: ['秋', '冬', '春']
        }
      },
      recommendTags: {
        scenarios: ['炖汤', '炒菜', '火锅', '养生餐'],
        healthNeeds: ['增强免疫', '补气', '鲜味'],
        dietTypes: ['pure_vegan', 'lacto_ovo'],
        bodyTypes: ['平和', '气虚', '阳虚'],
        solarTerms: ['立秋', '霜降', '立冬', '大寒']
      },
      media: {
        mainImage: 'https://example.com/mushroom-main.jpg',
        detailImages: [],
        videos: [],
        practitionerCookingVideos: []
      },
      salesData: {
        totalSales: 560,
        monthSales: 85,
        rating: 4.9,
        reviewCount: 67,
        favorites: 195,
        viewCount: 1850
      },
      shipping: {
        weight: 250,
        volume: { length: 20, width: 15, height: 5 },
        freeShippingThreshold: 99,
        deliveryTime: '次日达'
      },
      status: 'on_sale',
      stockAlert: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      onShelfAt: new Date()
    }
  ];
  
  let count = 0;
  for (const product of products) {
    try {
      // 检查是否已存在
      const existing = await db.collection('products')
        .where({ productId: product.productId })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  商品 ${product.productId} 已存在，跳过`);
        continue;
      }
      
      await db.collection('products').add({ data: product });
      console.log(`  ✓ ${product.productId} - ${product.name}`);
      count++;
    } catch (error) {
      console.error(`  ✗ ${product.productId} 导入失败:`, error.message);
    }
  }
  
  console.log(`\n导入商品: ${count}/${products.length}`);
  return count;
}

/**
 * 导入库存数据
 */
async function importInventory() {
  const inventoryData = [
    {
      productId: 'JY-001',
      specId: 'spec-500g',
      stock: { available: 500, locked: 0, inbound: 100, damaged: 0, total: 600 },
      alert: { minStock: 50, maxStock: 1000, reorderPoint: 100, isLowStock: false, isOutOfStock: false },
      smartRestock: {
        upcomingSolarTermDemand: { solarTerm: '立秋', predictedSales: 200, suggestedRestock: 150 },
        targetUserCount: 1000,
        conversionRate: 0.05,
        avgPurchaseQuantity: 2
      },
      supplier: { supplierId: 'SUP-001', supplierName: '九悦供应链', leadTime: 3, minOrderQuantity: 100 },
      updatedAt: new Date()
    },
    {
      productId: 'JY-002',
      specId: 'spec-2kg',
      stock: { available: 300, locked: 0, inbound: 0, damaged: 0, total: 300 },
      alert: { minStock: 100, maxStock: 500, reorderPoint: 150, isLowStock: false, isOutOfStock: false },
      smartRestock: {
        upcomingSolarTermDemand: { solarTerm: '谷雨', predictedSales: 150, suggestedRestock: 100 },
        targetUserCount: 800,
        conversionRate: 0.06,
        avgPurchaseQuantity: 1
      },
      supplier: { supplierId: 'SUP-001', supplierName: '九悦供应链', leadTime: 5, minOrderQuantity: 50 },
      updatedAt: new Date()
    },
    {
      productId: 'JY-002',
      specId: 'spec-5kg',
      stock: { available: 150, locked: 0, inbound: 0, damaged: 0, total: 150 },
      alert: { minStock: 50, maxStock: 300, reorderPoint: 80, isLowStock: false, isOutOfStock: false },
      smartRestock: {
        upcomingSolarTermDemand: { solarTerm: '谷雨', predictedSales: 80, suggestedRestock: 50 },
        targetUserCount: 500,
        conversionRate: 0.04,
        avgPurchaseQuantity: 1
      },
      supplier: { supplierId: 'SUP-001', supplierName: '九悦供应链', leadTime: 5, minOrderQuantity: 50 },
      updatedAt: new Date()
    },
    {
      productId: 'JY-003',
      specId: 'spec-500g',
      stock: { available: 150, locked: 0, inbound: 50, damaged: 0, total: 200 },
      alert: { minStock: 30, maxStock: 300, reorderPoint: 50, isLowStock: false, isOutOfStock: false },
      smartRestock: {
        upcomingSolarTermDemand: { solarTerm: '立春', predictedSales: 100, suggestedRestock: 80 },
        targetUserCount: 600,
        conversionRate: 0.05,
        avgPurchaseQuantity: 2
      },
      supplier: { supplierId: 'SUP-002', supplierName: '生鲜直供', leadTime: 1, minOrderQuantity: 50 },
      updatedAt: new Date()
    },
    {
      productId: 'JY-004',
      specId: 'spec-500g',
      stock: { available: 200, locked: 0, inbound: 0, damaged: 0, total: 200 },
      alert: { minStock: 50, maxStock: 400, reorderPoint: 80, isLowStock: false, isOutOfStock: false },
      smartRestock: {
        upcomingSolarTermDemand: { solarTerm: '立冬', predictedSales: 120, suggestedRestock: 100 },
        targetUserCount: 700,
        conversionRate: 0.06,
        avgPurchaseQuantity: 1
      },
      supplier: { supplierId: 'SUP-001', supplierName: '九悦供应链', leadTime: 7, minOrderQuantity: 50 },
      updatedAt: new Date()
    },
    {
      productId: 'JY-005',
      specId: 'spec-500ml',
      stock: { available: 400, locked: 0, inbound: 0, damaged: 0, total: 400 },
      alert: { minStock: 100, maxStock: 800, reorderPoint: 150, isLowStock: false, isOutOfStock: false },
      smartRestock: {
        upcomingSolarTermDemand: { solarTerm: null, predictedSales: 100, suggestedRestock: 50 },
        targetUserCount: 1200,
        conversionRate: 0.08,
        avgPurchaseQuantity: 2
      },
      supplier: { supplierId: 'SUP-003', supplierName: '调味品供应商', leadTime: 10, minOrderQuantity: 100 },
      updatedAt: new Date()
    },
    {
      productId: 'JY-006',
      specId: 'spec-250g',
      stock: { available: 180, locked: 0, inbound: 0, damaged: 0, total: 180 },
      alert: { minStock: 50, maxStock: 300, reorderPoint: 80, isLowStock: false, isOutOfStock: false },
      smartRestock: {
        upcomingSolarTermDemand: { solarTerm: '立冬', predictedSales: 90, suggestedRestock: 70 },
        targetUserCount: 550,
        conversionRate: 0.05,
        avgPurchaseQuantity: 1
      },
      supplier: { supplierId: 'SUP-001', supplierName: '九悦供应链', leadTime: 7, minOrderQuantity: 50 },
      updatedAt: new Date()
    }
  ];
  
  let count = 0;
  for (const inv of inventoryData) {
    try {
      // 检查是否已存在
      const existing = await db.collection('inventory')
        .where({
          productId: inv.productId,
          specId: inv.specId
        })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  库存 ${inv.productId}-${inv.specId} 已存在，跳过`);
        continue;
      }
      
      await db.collection('inventory').add({ data: inv });
      console.log(`  ✓ ${inv.productId} - ${inv.specId}`);
      count++;
    } catch (error) {
      console.error(`  ✗ ${inv.productId}-${inv.specId} 导入失败:`, error.message);
    }
  }
  
  console.log(`\n导入库存: ${count}/${inventoryData.length}`);
  return count;
}

/**
 * 导入优惠券
 */
async function importCoupons() {
  const coupons = [
    {
      couponId: 'COUP-001',
      name: '新用户专享券',
      type: 'discount',
      value: 20,
      minPurchase: 99,
      applicableProducts: [],
      applicableCategories: ['生鲜', '干货'],
      issueRules: {
        totalIssue: 1000,
        perUserLimit: 1,
        issueChannel: 'new_user',
        gardenTriggers: []
      },
      validDays: 30,
      startTime: new Date('2025-10-15'),
      endTime: new Date('2025-12-31'),
      usage: { issued: 50, used: 12, expired: 0 },
      status: 'active',
      createdAt: new Date()
    },
    {
      couponId: 'COUP-002',
      name: '碳减排达人奖励券',
      type: 'discount',
      value: 30,
      minPurchase: 199,
      applicableProducts: [],
      applicableCategories: [],
      issueRules: {
        totalIssue: 500,
        perUserLimit: 1,
        issueChannel: 'garden_reward',
        gardenTriggers: [
          {
            triggerType: 'carbon_milestone',
            triggerCondition: { carbonReduction: 100 }, // 累计减排100kg
            couponReward: 'COUP-002'
          }
        ]
      },
      validDays: 60,
      startTime: new Date('2025-10-15'),
      endTime: new Date('2026-01-31'),
      usage: { issued: 25, used: 8, expired: 0 },
      status: 'active',
      createdAt: new Date()
    },
    {
      couponId: 'COUP-003',
      name: '立秋养生节优惠',
      type: 'discount',
      value: 50,
      minPurchase: 299,
      applicableProducts: [],
      applicableCategories: ['干货', '即食'],
      issueRules: {
        totalIssue: 2000,
        perUserLimit: 2,
        issueChannel: 'promotion',
        gardenTriggers: []
      },
      validDays: 15,
      startTime: new Date('2025-08-07'),
      endTime: new Date('2025-08-22'),
      usage: { issued: 450, used: 180, expired: 50 },
      status: 'ended',
      createdAt: new Date('2025-08-01')
    }
  ];
  
  let count = 0;
  for (const coupon of coupons) {
    try {
      const existing = await db.collection('coupons')
        .where({ couponId: coupon.couponId })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  优惠券 ${coupon.couponId} 已存在，跳过`);
        continue;
      }
      
      await db.collection('coupons').add({ data: coupon });
      console.log(`  ✓ ${coupon.couponId} - ${coupon.name}`);
      count++;
    } catch (error) {
      console.error(`  ✗ ${coupon.couponId} 导入失败:`, error.message);
    }
  }
  
  console.log(`\n导入优惠券: ${count}/${coupons.length}`);
  return count;
}

/**
 * 导入营销活动
 */
async function importPromotions() {
  const promotions = [
    {
      promotionId: 'PROMO-001',
      name: '立秋养生节',
      type: 'bundle',
      description: '立秋时节，养肝润燥。温性食材组合优惠。',
      startTime: new Date('2025-08-07'),
      endTime: new Date('2025-08-22'),
      rules: {
        targetProducts: [],
        targetCategories: ['干货', '即食'],
        targetUserGroups: ['all'],
        minPurchaseAmount: 299,
        minQuantity: 3,
        discountType: 'percent',
        discountValue: 15,
        maxDiscount: 80,
        giftProducts: []
      },
      gardenTargeting: {
        minCarbonReduction: 0,
        carbonBonusMultiplier: 1.5,
        targetBodyTypes: ['阳虚', '气虚', '血虚'],
        targetSolarTerms: ['立秋', '处暑', '白露'],
        practitionerOnly: false,
        minVeganYears: 0
      },
      performance: {
        participantCount: 286,
        orderCount: 178,
        revenue: 53400,
        roi: 3.2
      },
      status: 'ended',
      createdAt: new Date('2025-08-01'),
      updatedAt: new Date('2025-08-23')
    },
    {
      promotionId: 'PROMO-002',
      name: '寒露滋补季',
      type: 'discount',
      description: '寒露时节，滋阴润燥。阴虚体质专享优惠。',
      startTime: new Date('2025-10-08'),
      endTime: new Date('2025-10-23'),
      rules: {
        targetProducts: [],
        targetCategories: ['即食', '干货'],
        targetUserGroups: ['vip', 'body_type_yinxu'],
        minPurchaseAmount: 199,
        minQuantity: 2,
        discountType: 'fixed',
        discountValue: 40,
        maxDiscount: 40,
        giftProducts: []
      },
      gardenTargeting: {
        minCarbonReduction: 10,
        carbonBonusMultiplier: 2.0,
        targetBodyTypes: ['阴虚', '燥热'],
        targetSolarTerms: ['寒露', '霜降'],
        practitionerOnly: false,
        minVeganYears: 0
      },
      performance: {
        participantCount: 128,
        orderCount: 95,
        revenue: 18900,
        roi: 2.8
      },
      status: 'active',
      createdAt: new Date('2025-10-01'),
      updatedAt: new Date()
    },
    {
      promotionId: 'PROMO-003',
      name: '践行者专享优惠',
      type: 'free_shipping',
      description: '感谢践行者的贡献，专享包邮优惠。',
      startTime: new Date('2025-10-01'),
      endTime: new Date('2025-12-31'),
      rules: {
        targetProducts: [],
        targetCategories: [],
        targetUserGroups: ['practitioner'],
        minPurchaseAmount: 59,
        minQuantity: 1,
        discountType: 'free_shipping',
        discountValue: 0,
        maxDiscount: 15,
        giftProducts: []
      },
      gardenTargeting: {
        minCarbonReduction: 0,
        carbonBonusMultiplier: 1.0,
        targetBodyTypes: [],
        targetSolarTerms: [],
        practitionerOnly: true,
        minVeganYears: 1
      },
      performance: {
        participantCount: 15,
        orderCount: 32,
        revenue: 8600,
        roi: 4.5
      },
      status: 'active',
      createdAt: new Date('2025-10-01'),
      updatedAt: new Date()
    }
  ];
  
  let count = 0;
  for (const promo of promotions) {
    try {
      const existing = await db.collection('promotions')
        .where({ promotionId: promo.promotionId })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  活动 ${promo.promotionId} 已存在，跳过`);
        continue;
      }
      
      await db.collection('promotions').add({ data: promo });
      console.log(`  ✓ ${promo.promotionId} - ${promo.name}`);
      count++;
    } catch (error) {
      console.error(`  ✗ ${promo.promotionId} 导入失败:`, error.message);
    }
  }
  
  console.log(`\n导入营销活动: ${count}/${promotions.length}`);
  return count;
}

/**
 * 导入业务规则
 */
async function importBusinessRules() {
  const rules = [
    {
      ruleId: 'RULE-POINTS-001',
      name: '积分转换规则',
      category: 'points',
      description: '花园积分和商城积分的转换规则',
      rules: {
        pointsConversion: {
          gardenCarbonToPoints: 10,     // 1kg碳减排 = 10积分
          shopSpendToPoints: 0.1,       // 1元消费 = 0.1积分
          pointsToDiscount: 0.01,       // 1积分 = 0.01元
          maxPointsUsage: 1000          // 单次最多使用1000积分
        },
        recommendation: {
          bodyTypeMatching: true,
          solarTermMatching: true,
          practitionerBoost: 1.5,
          personalHistoryWeight: 0.3
        },
        marketing: {
          newUserDiscount: 20,
          referralReward: 30,
          carbonMilestoneReward: {
            '50kg': 'COUP-002',
            '100kg': 'COUP-002',
            '200kg': 'COUP-SPECIAL'
          },
          seasonalPromotionBoost: 1.2
        }
      },
      effectiveFrom: new Date('2025-10-15'),
      effectiveUntil: new Date('2026-12-31'),
      status: 'active',
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      ruleId: 'RULE-RECOMMEND-001',
      name: '商品推荐规则',
      category: 'recommendation',
      description: '基于体质、节气、践行者的商品推荐规则',
      rules: {
        pointsConversion: null,
        recommendation: {
          bodyTypeMatching: true,
          solarTermMatching: true,
          practitionerBoost: 2.0,
          personalHistoryWeight: 0.4
        },
        marketing: null
      },
      effectiveFrom: new Date('2025-10-15'),
      effectiveUntil: null,
      status: 'active',
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  let count = 0;
  for (const rule of rules) {
    try {
      const existing = await db.collection('business_rules')
        .where({ ruleId: rule.ruleId })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  规则 ${rule.ruleId} 已存在，跳过`);
        continue;
      }
      
      await db.collection('business_rules').add({ data: rule });
      console.log(`  ✓ ${rule.ruleId} - ${rule.name}`);
      count++;
    } catch (error) {
      console.error(`  ✗ ${rule.ruleId} 导入失败:`, error.message);
    }
  }
  
  console.log(`\n导入业务规则: ${count}/${rules.length}`);
  return count;
}

/**
 * 更新测试用户数据
 */
async function updateTestUsers() {
  try {
    // 获取现有用户
    const users = await db.collection('users').limit(5).get();
    
    if (users.data.length === 0) {
      console.log('  没有找到用户，跳过更新');
      return 0;
    }
    
    let count = 0;
    for (const user of users.data) {
      try {
        // 更新用户的v3.0字段，添加测试数据
        await db.collection('users').doc(user._id).update({
          data: {
            'ecommerce.customerLevel': 'potential',
            'ecommerce.rfm.recency': 7,
            'ecommerce.rfm.frequency': 3,
            'ecommerce.rfm.monetary': 256,
            'ecommerce.purchasePreferences.topCategories': ['生鲜', '干货'],
            'ecommerce.purchasePreferences.avgOrderValue': 85,
            'ecommerce.vipLevel': 'normal',
            'pointsSystem.gardenPoints': user.points || 0,
            'pointsSystem.shopPoints': 50,
            'pointsSystem.totalPoints': (user.points || 0) + 50,
            'jiuyue.dietaryNeeds.veganType': 'pure_vegan',
            'jiuyue.dietaryNeeds.healthGoals': ['高蛋白', '控糖'],
            'jiuyue.purchaseScenarios': ['日常代餐', '健身餐']
          }
        });
        
        console.log(`  ✓ 更新用户 ${user._id}`);
        count++;
      } catch (error) {
        console.error(`  ✗ 更新用户 ${user._id} 失败:`, error.message);
      }
    }
    
    console.log(`\n更新用户: ${count}/${users.data.length}`);
    return count;
    
  } catch (error) {
    console.error('更新用户失败:', error);
    return 0;
  }
}

module.exports = {
  seedV3SampleData
};

