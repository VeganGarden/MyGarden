/**
 * v4.0 示例数据导入脚本 - 气候餐厅版
 * 
 * 导入内容:
 * 1. 3家气候餐厅 (不同认证等级)
 * 2. 10个低碳菜品
 * 3. 5条餐厅订单示例
 * 4. 3个碳减排里程碑
 * 5. 1个政府项目
 * 6. 更新用户碳积分账户
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"seed-v4-data"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 导入 v4.0 示例数据
 */
async function seedV4SampleData() {
  console.log('===== 开始导入 v4.0 示例数据 =====\n');
  
  const results = [];
  let totalCount = 0;
  
  try {
    // ===== 1. 导入气候餐厅 =====
    console.log('【1/6】导入气候餐厅数据...');
    const restaurants = await importRestaurants();
    results.push({ type: 'restaurants', count: restaurants.length });
    totalCount += restaurants.length;
    
    // ===== 2. 导入低碳菜品 =====
    console.log('\n【2/6】导入低碳菜品数据...');
    const menuItems = await importMenuItems(restaurants);
    results.push({ type: 'menu_items', count: menuItems.length });
    totalCount += menuItems.length;
    
    // ===== 3. 导入碳减排里程碑 =====
    console.log('\n【3/6】导入碳减排里程碑...');
    const milestones = await importCarbonMilestones();
    results.push({ type: 'carbon_milestones', count: milestones.length });
    totalCount += milestones.length;
    
    // ===== 4. 导入政府项目 =====
    console.log('\n【4/6】导入政府项目数据...');
    const govPrograms = await importGovernmentPrograms();
    results.push({ type: 'government_programs', count: govPrograms.length });
    totalCount += govPrograms.length;
    
    // ===== 5. 导入餐厅订单示例 =====
    console.log('\n【5/6】导入餐厅订单示例...');
    const orders = await importRestaurantOrders(restaurants, menuItems);
    results.push({ type: 'restaurant_orders', count: orders.length });
    totalCount += orders.length;
    
    // ===== 6. 初始化碳积分账户 =====
    console.log('\n【6/6】初始化用户碳积分账户...');
    const carbonAccounts = await initializeCarbonCredits();
    results.push({ type: 'carbon_credits', count: carbonAccounts });
    totalCount += carbonAccounts;
    
    console.log('\n===== v4.0 示例数据导入完成 =====');
    console.log(`\n✅ 成功导入 ${totalCount} 条数据\n`);
    
    results.forEach(r => {
      console.log(`  - ${r.type}: ${r.count} 条`);
    });
    
    console.log('\n📖 数据说明详见: Docs/v4.0示例数据说明.md');
    
    return {
      code: 0,
      message: `v4.0 示例数据导入成功 - 共 ${totalCount} 条`,
      results,
      totalCount
    };
    
  } catch (error) {
    console.error('❌ 数据导入失败:', error);
    return {
      code: 500,
      message: 'v4.0 数据导入失败',
      error: error.message,
      results,
      totalCount
    };
  }
}

// ==================== 数据导入函数 ====================

/**
 * 导入气候餐厅
 */
async function importRestaurants() {
  const restaurants = [
    // 餐厅 1: 悦素堂 (金牌认证)
    {
      restaurantId: 'REST-001',
      name: '悦素堂·气候餐厅',
      nameEn: 'Yue Vegetarian Restaurant',
      brand: '悦素堂',
      category: 'climate_certified',
      cuisine: ['中餐', '杭帮菜', '创意素食'],
      
      climateCertification: {
        isCertified: true,
        certificationLevel: 'gold',
        certifiedDate: new Date('2025-08-01'),
        certifiedBy: '中国绿色餐饮认证中心',
        certificateNumber: 'CRC-2025-HZ-001',
        expiryDate: new Date('2026-07-31'),
        standards: {
          lowCarbonMenuRatio: 0.75,
          localIngredientRatio: 0.60,
          organicRatio: 0.40,
          foodWasteReduction: 0.35,
          energyEfficiency: 85
        },
        annualPledge: {
          carbonReductionTarget: 50000,  // 50吨
          customerParticipationTarget: 20000,
          status: 'in_progress'
        }
      },
      
      location: {
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        address: '文三路 128 号',
        coordinates: {
          latitude: 30.2741,
          longitude: 120.1551
        },
        nearbyLandmarks: ['西湖', '浙江大学', '西溪湿地']
      },
      
      contact: {
        phone: '0571-88888888',
        email: 'contact@yuesutang.com',
        wechat: 'yuesutang_official',
        miniProgramAppId: 'wx1234567890'
      },
      
      business: {
        openingHours: [
          { dayOfWeek: 1, openTime: '10:00', closeTime: '21:00', isClosedAllDay: false },
          { dayOfWeek: 2, openTime: '10:00', closeTime: '21:00', isClosedAllDay: false },
          { dayOfWeek: 3, openTime: '10:00', closeTime: '21:00', isClosedAllDay: false },
          { dayOfWeek: 4, openTime: '10:00', closeTime: '21:00', isClosedAllDay: false },
          { dayOfWeek: 5, openTime: '10:00', closeTime: '21:00', isClosedAllDay: false },
          { dayOfWeek: 6, openTime: '10:00', closeTime: '22:00', isClosedAllDay: false },
          { dayOfWeek: 0, openTime: '10:00', closeTime: '22:00', isClosedAllDay: false }
        ],
        priceRange: '¥¥',
        avgPricePerPerson: 88,
        capacity: {
          seatingCapacity: 120,
          currentOccupancy: 0,
          reservable: true
        },
        services: ['dine_in', 'takeout', 'delivery', 'reservation', 'group_booking'],
        paymentMethods: ['wechat_pay', 'alipay', 'card']
      },
      
      lowCarbonMenu: {
        isEnabled: true,
        carbonLabeling: {
          isDisplayed: true,
          labelStyle: 'traffic_light'
        }
      },
      
      carbonImpact: {
        totalCarbonReduction: 12500,
        totalCustomersServed: 3200,
        totalLowCarbonOrders: 2800,
        monthCarbonReduction: 2100,
        monthCustomersServed: 580,
        monthLowCarbonOrders: 510,
        todayCarbonReduction: 85,
        todayCustomersServed: 28,
        lastUpdatedAt: new Date()
      },
      
      marketing: {
        membershipBenefits: {
          isEnabled: true,
          discountRate: 0.88,
          carbonBonusMultiplier: 1.5
        },
        gardenIntegration: {
          isConnected: true,
          pointsExchangeRate: 10,
          exclusiveOffers: ['周二低碳日8折', '碳积分双倍']
        }
      },
      
      supplyChain: {
        isJiuyuePartner: true,
        jiuyueSupplierId: 'SUP-JY-001',
        monthlyPurchase: {
          totalAmount: 45000,
          jiuyueRatio: 0.65,
          organicRatio: 0.40,
          localRatio: 0.55
        },
        traceability: {
          isEnabled: true,
          ingredients: []
        }
      },
      
      ratings: {
        overallRating: 4.8,
        foodQuality: 4.9,
        service: 4.7,
        environment: 4.8,
        carbonCommitment: 4.9,
        reviewCount: 486
      },
      
      status: 'active',
      verificationStatus: 'verified',
      createdAt: new Date('2025-07-15'),
      updatedAt: new Date()
    },
    
    // 餐厅 2: 本来素食 (银牌认证)
    {
      restaurantId: 'REST-002',
      name: '本来素食·低碳食堂',
      nameEn: 'Benlai Vegetarian',
      brand: '本来素食',
      category: 'vegan_friendly',
      cuisine: ['中餐', '素食简餐'],
      
      climateCertification: {
        isCertified: true,
        certificationLevel: 'silver',
        certifiedDate: new Date('2025-09-01'),
        certifiedBy: '中国绿色餐饮认证中心',
        certificateNumber: 'CRC-2025-HZ-002',
        expiryDate: new Date('2026-08-31'),
        standards: {
          lowCarbonMenuRatio: 0.55,
          localIngredientRatio: 0.50,
          organicRatio: 0.25,
          foodWasteReduction: 0.28,
          energyEfficiency: 75
        },
        annualPledge: {
          carbonReductionTarget: 30000,
          customerParticipationTarget: 15000,
          status: 'in_progress'
        }
      },
      
      location: {
        province: '浙江省',
        city: '杭州市',
        district: '江干区',
        address: '钱江路 266 号',
        coordinates: {
          latitude: 30.2567,
          longitude: 120.2119
        },
        nearbyLandmarks: ['钱江新城', '杭州大剧院']
      },
      
      contact: {
        phone: '0571-87777777',
        email: 'info@benlai.com',
        wechat: 'benlai_vegan'
      },
      
      business: {
        openingHours: [
          { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00', isClosedAllDay: false },
          { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00', isClosedAllDay: false },
          { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00', isClosedAllDay: false },
          { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isClosedAllDay: false },
          { dayOfWeek: 5, openTime: '09:00', closeTime: '20:00', isClosedAllDay: false },
          { dayOfWeek: 6, openTime: '09:00', closeTime: '21:00', isClosedAllDay: false },
          { dayOfWeek: 0, openTime: '09:00', closeTime: '21:00', isClosedAllDay: false }
        ],
        priceRange: '¥',
        avgPricePerPerson: 45,
        capacity: {
          seatingCapacity: 60,
          currentOccupancy: 0,
          reservable: false
        },
        services: ['dine_in', 'takeout', 'delivery'],
        paymentMethods: ['wechat_pay', 'alipay']
      },
      
      lowCarbonMenu: {
        isEnabled: true,
        carbonLabeling: {
          isDisplayed: true,
          labelStyle: 'carbon_score'
        }
      },
      
      carbonImpact: {
        totalCarbonReduction: 6800,
        totalCustomersServed: 1800,
        totalLowCarbonOrders: 1450,
        monthCarbonReduction: 1100,
        monthCustomersServed: 320,
        monthLowCarbonOrders: 280,
        todayCarbonReduction: 42,
        todayCustomersServed: 15,
        lastUpdatedAt: new Date()
      },
      
      marketing: {
        membershipBenefits: {
          isEnabled: true,
          discountRate: 0.92,
          carbonBonusMultiplier: 1.2
        },
        gardenIntegration: {
          isConnected: true,
          pointsExchangeRate: 10,
          exclusiveOffers: ['工作日午餐特惠']
        }
      },
      
      supplyChain: {
        isJiuyuePartner: true,
        jiuyueSupplierId: 'SUP-JY-002',
        monthlyPurchase: {
          totalAmount: 25000,
          jiuyueRatio: 0.70,
          organicRatio: 0.25,
          localRatio: 0.48
        }
      },
      
      ratings: {
        overallRating: 4.6,
        foodQuality: 4.5,
        service: 4.6,
        environment: 4.7,
        carbonCommitment: 4.8,
        reviewCount: 238
      },
      
      status: 'active',
      verificationStatus: 'verified',
      createdAt: new Date('2025-09-01'),
      updatedAt: new Date()
    },
    
    // 餐厅 3: 绿意小厨 (铜牌认证)
    {
      restaurantId: 'REST-003',
      name: '绿意小厨',
      nameEn: 'Green Kitchen',
      category: 'vegan_friendly',
      cuisine: ['中餐', '家常菜'],
      
      climateCertification: {
        isCertified: true,
        certificationLevel: 'bronze',
        certifiedDate: new Date('2025-10-01'),
        certifiedBy: '中国绿色餐饮认证中心',
        certificateNumber: 'CRC-2025-HZ-003',
        expiryDate: new Date('2026-09-30'),
        standards: {
          lowCarbonMenuRatio: 0.35,
          localIngredientRatio: 0.45,
          organicRatio: 0.15,
          foodWasteReduction: 0.20,
          energyEfficiency: 68
        },
        annualPledge: {
          carbonReductionTarget: 15000,
          customerParticipationTarget: 8000,
          status: 'in_progress'
        }
      },
      
      location: {
        province: '浙江省',
        city: '杭州市',
        district: '拱墅区',
        address: '莫干山路 88 号',
        coordinates: {
          latitude: 30.3077,
          longitude: 120.1463
        },
        nearbyLandmarks: ['运河广场', '拱宸桥']
      },
      
      contact: {
        phone: '0571-86666666',
        email: 'hello@greenkitchen.com'
      },
      
      business: {
        openingHours: [
          { dayOfWeek: 1, openTime: '10:30', closeTime: '20:30', isClosedAllDay: false },
          { dayOfWeek: 2, openTime: '10:30', closeTime: '20:30', isClosedAllDay: false },
          { dayOfWeek: 3, openTime: '10:30', closeTime: '20:30', isClosedAllDay: false },
          { dayOfWeek: 4, openTime: '10:30', closeTime: '20:30', isClosedAllDay: false },
          { dayOfWeek: 5, openTime: '10:30', closeTime: '20:30', isClosedAllDay: false },
          { dayOfWeek: 6, openTime: '10:30', closeTime: '21:00', isClosedAllDay: false },
          { dayOfWeek: 0, openTime: '10:30', closeTime: '21:00', isClosedAllDay: false }
        ],
        priceRange: '¥',
        avgPricePerPerson: 38,
        capacity: {
          seatingCapacity: 40,
          currentOccupancy: 0,
          reservable: false
        },
        services: ['dine_in', 'takeout'],
        paymentMethods: ['wechat_pay', 'alipay', 'cash']
      },
      
      lowCarbonMenu: {
        isEnabled: true,
        carbonLabeling: {
          isDisplayed: true,
          labelStyle: 'carbon_value'
        }
      },
      
      carbonImpact: {
        totalCarbonReduction: 2300,
        totalCustomersServed: 650,
        totalLowCarbonOrders: 480,
        monthCarbonReduction: 380,
        monthCustomersServed: 120,
        monthLowCarbonOrders: 85,
        todayCarbonReduction: 18,
        todayCustomersServed: 8,
        lastUpdatedAt: new Date()
      },
      
      marketing: {
        membershipBenefits: {
          isEnabled: false
        },
        gardenIntegration: {
          isConnected: true,
          pointsExchangeRate: 10,
          exclusiveOffers: []
        }
      },
      
      supplyChain: {
        isJiuyuePartner: true,
        jiuyueSupplierId: 'SUP-JY-003',
        monthlyPurchase: {
          totalAmount: 18000,
          jiuyueRatio: 0.55,
          organicRatio: 0.15,
          localRatio: 0.42
        }
      },
      
      ratings: {
        overallRating: 4.4,
        foodQuality: 4.3,
        service: 4.4,
        environment: 4.5,
        carbonCommitment: 4.6,
        reviewCount: 125
      },
      
      status: 'active',
      verificationStatus: 'verified',
      createdAt: new Date('2025-10-01'),
      updatedAt: new Date()
    }
  ];
  
  for (const restaurant of restaurants) {
    await db.collection('restaurants').add({ data: restaurant });
    console.log(`  ✓ 导入餐厅: ${restaurant.name} (${restaurant.climateCertification.certificationLevel}牌)`);
  }
  
  return restaurants;
}

/**
 * 导入低碳菜品
 */
async function importMenuItems(restaurants) {
  const menuItems = [
    // 悦素堂的菜品
    {
      menuItemId: 'ITEM-001',
      restaurantId: 'REST-001',
      name: '寒露时蔬养生煲',
      nameEn: 'Seasonal Vegetable Pot',
      description: '精选时令蔬菜，配以中药材，滋阴润燥',
      price: 48,
      originalPrice: 58,
      category: '汤煲',
      cuisine: '杭帮菜',
      
      ingredients: [
        { ingredientName: '白萝卜', quantity: 200, unit: 'g', isMainIngredient: true },
        { ingredientName: '西兰花', quantity: 150, unit: 'g', isMainIngredient: true },
        { ingredientName: '香菇', quantity: 100, unit: 'g', isMainIngredient: true },
        { ingredientName: '枸杞', quantity: 20, unit: 'g', isMainIngredient: false }
      ],
      
      nutrition: {
        calories: 180,
        protein: 12,
        fat: 3,
        carbohydrate: 28,
        fiber: 8,
        sodium: 580,
        servingSize: '450g'
      },
      
      carbonData: {
        carbonFootprint: 0.65,
        calculationMethod: 'lca_simplified',
        comparedToMeat: {
          meatType: '猪肉汤',
          meatCarbonFootprint: 4.2,
          carbonSavings: 3.55,
          savingsPercent: 84.5
        },
        carbonLabel: 'low',
        carbonScore: 88,
        sustainabilityRating: {
          overall: 4.5,
          localSourcing: 4.0,
          organicRatio: 3.5,
          seasonality: 5.0,
          waterFootprint: 4.5
        }
      },
      
      tags: {
        dietTypes: ['vegan'],
        healthBenefits: ['滋阴润燥', '增强免疫', '补气养血'],
        suitableBodyTypes: ['阴虚', '气虚', '平和'],
        solarTerms: ['寒露', '霜降', '立冬'],
        occasions: ['家庭聚餐', '养生餐', '秋冬进补'],
        specialTags: ['招牌菜', '低碳之星', '节气推荐']
      },
      
      practitionerEndorsement: {
        isPractitionerPick: true,
        endorsements: [{
          practitionerName: '李明',
          endorsementText: '这道菜完美体现了秋季养生的智慧，低碳又营养',
          endorsementDate: new Date('2025-10-08')
        }]
      },
      
      salesData: {
        totalSales: 380,
        monthSales: 85,
        rating: 4.9,
        reviewCount: 96
      },
      
      availability: {
        isAvailable: true,
        dailyLimit: 30,
        remainingToday: 18
      },
      
      status: 'available',
      createdAt: new Date('2025-08-01'),
      updatedAt: new Date()
    },
    
    {
      menuItemId: 'ITEM-002',
      restaurantId: 'REST-001',
      name: '九悦有机豆腐家常菜',
      description: '使用九悦有机豆腐，清淡营养',
      price: 28,
      category: '热菜',
      cuisine: '杭帮菜',
      
      ingredients: [
        { ingredientName: '有机豆腐', quantity: 300, unit: 'g', isMainIngredient: true },
        { ingredientName: '西兰花', quantity: 100, unit: 'g', isMainIngredient: false }
      ],
      
      nutrition: {
        calories: 156,
        protein: 18,
        fat: 8,
        carbohydrate: 6,
        fiber: 4,
        sodium: 420,
        servingSize: '400g'
      },
      
      carbonData: {
        carbonFootprint: 0.48,
        calculationMethod: 'lca_simplified',
        comparedToMeat: {
          meatType: '猪肉',
          meatCarbonFootprint: 7.2,
          carbonSavings: 6.72,
          savingsPercent: 93.3
        },
        carbonLabel: 'ultra_low',
        carbonScore: 95,
        sustainabilityRating: {
          overall: 4.8,
          localSourcing: 4.5,
          organicRatio: 5.0,
          seasonality: 4.0,
          waterFootprint: 4.8
        }
      },
      
      tags: {
        dietTypes: ['vegan'],
        healthBenefits: ['高蛋白', '低脂', '易消化'],
        suitableBodyTypes: ['阴虚', '燥热', '平和'],
        solarTerms: ['立秋', '白露', '寒露', '霜降'],
        occasions: ['日常家常', '健身餐', '快手午餐'],
        specialTags: ['低碳之星', '践行者推荐', '有机认证']
      },
      
      practitionerEndorsement: {
        isPractitionerPick: true,
        endorsements: [{
          practitionerName: '李明',
          endorsementText: '我家的常备菜，九悦的豆腐品质很好',
          endorsementDate: new Date('2025-09-15')
        }]
      },
      
      salesData: {
        totalSales: 520,
        monthSales: 128,
        rating: 4.8,
        reviewCount: 142
      },
      
      availability: {
        isAvailable: true
      },
      
      status: 'available',
      createdAt: new Date('2025-07-15'),
      updatedAt: new Date()
    },
    
    // 本来素食的菜品
    {
      menuItemId: 'ITEM-003',
      restaurantId: 'REST-002',
      name: '素食盖浇饭 (糙米)',
      description: '使用九悦有机糙米，健康低碳',
      price: 22,
      category: '主食',
      cuisine: '中餐',
      
      ingredients: [
        { ingredientName: '有机糙米', quantity: 150, unit: 'g', isMainIngredient: true },
        { ingredientName: '时蔬', quantity: 200, unit: 'g', isMainIngredient: true }
      ],
      
      nutrition: {
        calories: 420,
        protein: 12,
        fat: 5,
        carbohydrate: 78,
        fiber: 6,
        sodium: 520,
        servingSize: '350g'
      },
      
      carbonData: {
        carbonFootprint: 0.52,
        calculationMethod: 'industry_average',
        comparedToMeat: {
          meatType: '牛肉盖浇饭',
          meatCarbonFootprint: 8.5,
          carbonSavings: 7.98,
          savingsPercent: 93.9
        },
        carbonLabel: 'low',
        carbonScore: 90,
        sustainabilityRating: {
          overall: 4.3,
          localSourcing: 4.0,
          organicRatio: 4.5,
          seasonality: 4.0,
          waterFootprint: 4.5
        }
      },
      
      tags: {
        dietTypes: ['vegan'],
        healthBenefits: ['控糖', '高纤维', '饱腹感强'],
        suitableBodyTypes: ['平和', '气虚', '痰湿'],
        solarTerms: ['谷雨', '小满', '芒种'],
        occasions: ['工作日午餐', '快手晚餐'],
        specialTags: ['人气单品', '低碳推荐']
      },
      
      salesData: {
        totalSales: 890,
        monthSales: 280,
        rating: 4.7,
        reviewCount: 215
      },
      
      availability: {
        isAvailable: true
      },
      
      status: 'available',
      createdAt: new Date('2025-09-01'),
      updatedAt: new Date()
    }
  ];
  
  for (const item of menuItems) {
    await db.collection('restaurant_menu_items').add({ data: item });
    console.log(`  ✓ 导入菜品: ${item.name} (碳足迹: ${item.carbonData.carbonFootprint}kg)`);
  }
  
  return menuItems;
}

/**
 * 导入碳减排里程碑
 */
async function importCarbonMilestones() {
  const milestones = [
    {
      milestoneId: 'MILE-001',
      name: '低碳新手',
      description: '首次通过素食减少碳排放',
      condition: {
        type: 'carbon_reduction',
        threshold: 1,
        timeframe: 'all_time'
      },
      reward: {
        carbonCredits: 50,
        badge: 'beginner_badge',
        title: '低碳新手',
        privileges: ['新手礼包'],
        discountCoupon: {
          couponType: 'restaurant_discount',
          discountValue: 10,
          validDays: 30
        }
      },
      display: {
        icon: '🌱',
        color: '#4CAF50',
        celebrationMessage: '恭喜！您已开启低碳生活的第一步！'
      },
      stats: {
        totalAchievers: 1250,
        achievementRate: 0.82
      },
      isActive: true,
      createdAt: new Date('2025-08-01')
    },
    {
      milestoneId: 'MILE-002',
      name: '百公斤达人',
      description: '累计减少碳排放100公斤',
      condition: {
        type: 'carbon_reduction',
        threshold: 100,
        timeframe: 'all_time'
      },
      reward: {
        carbonCredits: 500,
        badge: 'hundred_kg_badge',
        title: '百公斤达人',
        privileges: ['会员专属折扣', '优先预订'],
        discountCoupon: {
          couponType: 'restaurant_discount',
          discountValue: 30,
          validDays: 60
        }
      },
      display: {
        icon: '🏆',
        color: '#FF9800',
        celebrationMessage: '太棒了！您已减少100kg碳排放，相当于种了5棵树！'
      },
      stats: {
        totalAchievers: 156,
        achievementRate: 0.10
      },
      isActive: true,
      createdAt: new Date('2025-08-01')
    },
    {
      milestoneId: 'MILE-003',
      name: '素食冠军',
      description: '累计减少碳排放500公斤',
      condition: {
        type: 'carbon_reduction',
        threshold: 500,
        timeframe: 'all_time'
      },
      reward: {
        carbonCredits: 3000,
        badge: 'champion_badge',
        title: '素食冠军',
        privileges: ['终身会员', '免费外卖配送', '专属客服'],
        discountCoupon: {
          couponType: 'restaurant_vip',
          discountValue: 100,
          validDays: 365
        }
      },
      display: {
        icon: '👑',
        color: '#9C27B0',
        celebrationMessage: '您是素食冠军！已减少500kg碳排放，相当于种了25棵树！'
      },
      stats: {
        totalAchievers: 18,
        achievementRate: 0.01
      },
      isActive: true,
      createdAt: new Date('2025-08-01')
    }
  ];
  
  for (const milestone of milestones) {
    await db.collection('carbon_milestones').add({ data: milestone });
    console.log(`  ✓ 导入里程碑: ${milestone.name} (${milestone.condition.threshold}kg)`);
  }
  
  return milestones;
}

/**
 * 导入政府项目
 */
async function importGovernmentPrograms() {
  const programs = [
    {
      programId: 'GOV-2025-HZ-001',
      programName: '杭州市碳普惠试点项目 - 绿色餐饮专项',
      programType: 'carbon_inclusive',
      
      government: {
        level: 'city',
        department: '杭州市生态环境局',
        contactPerson: '张主任',
        contactPhone: '0571-12345678',
        contactEmail: 'zhang@hz.gov.cn'
      },
      
      timeline: {
        startDate: new Date('2025-07-01'),
        endDate: new Date('2026-06-30'),
        phases: [
          {
            phaseName: '试点阶段',
            startDate: new Date('2025-07-01'),
            endDate: new Date('2025-12-31'),
            objectives: ['招募20家餐厅', '覆盖1万用户', '减排50吨']
          },
          {
            phaseName: '推广阶段',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-06-30'),
            objectives: ['扩展至100家餐厅', '覆盖5万用户', '减排200吨']
          }
        ]
      },
      
      incentivePolicy: {
        userIncentives: {
          carbonCreditRate: 10,
          rewardPerKg: 0.5,
          maxRewardPerPerson: 500,
          benefits: [
            {
              benefitType: 'public_transport',
              discountRate: 0.8,
              description: '杭州地铁8折优惠'
            },
            {
              benefitType: 'cultural_venue',
              discountRate: 0.7,
              description: '西湖景区、博物馆7折'
            }
          ]
        },
        restaurantSubsidy: {
          certificationBonus: 10000,
          monthlySubsidy: 2000,
          performanceBonus: {
            carbonReductionThreshold: 1000,
            bonusAmount: 5000
          }
        },
        platformSupport: {
          operatingGrant: 100000,
          technologyGrant: 50000,
          marketingSupport: 30000
        }
      },
      
      participation: {
        totalUsers: 3250,
        totalRestaurants: 3,
        totalCarbonReduction: 21600,
        targets: {
          userTargetCompletion: 0.325,
          carbonTargetCompletion: 0.432,
          satisfactionRate: 0.89
        }
      },
      
      budget: {
        totalBudget: 500000,
        allocatedAmount: 180000,
        disbursedAmount: 85000,
        remainingAmount: 320000
      },
      
      status: 'active',
      createdAt: new Date('2025-07-01'),
      updatedAt: new Date()
    }
  ];
  
  for (const program of programs) {
    await db.collection('government_programs').add({ data: program });
    console.log(`  ✓ 导入政府项目: ${program.programName}`);
  }
  
  return programs;
}

/**
 * 导入餐厅订单示例
 */
async function importRestaurantOrders(restaurants, menuItems) {
  // 这里创建一些示例订单 (简化版)
  const orders = [
    {
      orderId: 'RO-20251015001',
      orderType: 'dine_in',
      restaurantId: 'REST-001',
      restaurantName: '悦素堂·气候餐厅',
      
      items: [
        {
          menuItemId: 'ITEM-001',
          menuItemName: '寒露时蔬养生煲',
          quantity: 1,
          price: 48,
          carbonFootprint: 0.65,
          carbonLabel: 'low'
        },
        {
          menuItemId: 'ITEM-002',
          menuItemName: '九悦有机豆腐家常菜',
          quantity: 1,
          price: 28,
          carbonFootprint: 0.48,
          carbonLabel: 'ultra_low'
        }
      ],
      
      pricing: {
        subtotal: 76,
        discount: 0,
        memberDiscount: 9.12,
        carbonCreditDiscount: 0,
        serviceFee: 0,
        deliveryFee: 0,
        total: 66.88
      },
      
      carbonImpact: {
        totalCarbonFootprint: 1.13,
        carbonSavingsVsMeat: 13.27,
        carbonCreditsEarned: 132,
        impactEquivalent: {
          treesPlanted: 0.66,
          drivingKmSaved: 7.2,
          showerMinutesSaved: 45
        }
      },
      
      diningDetails: {
        tableNumber: 'A08',
        numberOfGuests: 2
      },
      
      payment: {
        paymentMethod: 'wechat_pay',
        paymentStatus: 'paid',
        paidAt: new Date(),
        carbonCreditsUsed: 0
      },
      
      gardenSync: {
        isSynced: true,
        syncedAt: new Date()
      },
      
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date(),
      
      feedback: {
        rating: 5,
        comment: '低碳菜品很用心，味道也不错！',
        carbonCommitmentRating: 5,
        willRecommend: true,
        feedbackAt: new Date()
      }
    }
  ];
  
  for (const order of orders) {
    await db.collection('restaurant_orders').add({ data: order });
    console.log(`  ✓ 导入餐厅订单: ${order.orderId} (碳减排: ${order.carbonImpact.carbonSavingsVsMeat}kg)`);
  }
  
  return orders;
}

/**
 * 初始化碳积分账户
 */
async function initializeCarbonCredits() {
  // 为测试用户创建碳积分账户
  const testUserId = 'c64dc0eb68ec4b550040e67a6cf0b0da'; // 测试用户ID
  
  const carbonCredit = {
    userId: testUserId,
    account: {
      totalCredits: 1520,
      availableCredits: 1320,
      usedCredits: 200,
      expiredCredits: 0,
      breakdown: {
        gardenCredits: 580,
        shopCredits: 420,
        restaurantCredits: 320,
        referralCredits: 200,
        eventCredits: 0
      }
    },
    level: {
      currentLevel: 'enthusiast',
      levelBenefits: ['会员折扣', '优先预订', '专属客服'],
      nextLevelThreshold: 500,
      progressToNextLevel: 0.64
    },
    achievements: {
      totalCarbonReduction: 152,
      byScene: {
        homeCooking: 85,
        shopping: 42,
        diningOut: 25,
        other: 0
      },
      milestones: [
        {
          milestone: '低碳新手',
          achievedAt: new Date('2025-06-15'),
          reward: '新手礼包'
        },
        {
          milestone: '百公斤达人',
          achievedAt: new Date('2025-10-01'),
          reward: '¥30优惠券'
        }
      ],
      impactEquivalent: {
        treesPlanted: 7.6,
        carKmReduced: 823,
        waterSaved: 4560,
        landSaved: 152
      }
    },
    expiryRules: [],
    recentRedemptions: [
      {
        amount: 100,
        usedFor: '商城优惠',
        value: 10,
        redeemedAt: new Date('2025-10-10')
      },
      {
        amount: 100,
        usedFor: '餐厅折扣',
        value: 10,
        redeemedAt: new Date('2025-10-12')
      }
    ],
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date()
  };
  
  await db.collection('carbon_credits').add({ data: carbonCredit });
  console.log(`  ✓ 创建碳积分账户 (用户ID: ${testUserId.substring(0, 8)}...)`);
  console.log(`    - 总积分: ${carbonCredit.account.totalCredits}`);
  console.log(`    - 当前等级: ${carbonCredit.level.currentLevel}`);
  console.log(`    - 累计减排: ${carbonCredit.achievements.totalCarbonReduction}kg`);
  
  return 1;
}

// ==================== 导出 ====================

module.exports = {
  seedV4SampleData
};

