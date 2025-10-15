const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 践行者数据导入云函数
 * 
 * 功能：
 * 1. 批量导入践行者档案
 * 2. 创建践行者认证关系
 * 3. 生成智慧语录
 * 
 * 使用方式：
 * - action: 'import_practitioners' - 导入践行者档案
 * - action: 'import_certifications' - 导入认证关系
 * - action: 'import_quotes' - 导入智慧语录
 * - action: 'import_all' - 全部导入
 */

exports.main = async (event) => {
  const { action = 'import_all', data = null } = event;
  
  console.log('========================================');
  console.log('践行者数据导入');
  console.log('========================================\n');

  const results = {
    action,
    timestamp: new Date(),
    imported: []
  };

  try {
    if (action === 'import_practitioners' || action === 'import_all') {
      console.log('[1] 导入践行者档案...');
      const practitionersData = data?.practitioners || getSamplePractitioners();
      const importResult = await importPractitioners(practitionersData);
      results.imported.push(importResult);
    }

    if (action === 'import_certifications' || action === 'import_all') {
      console.log('[2] 导入认证关系...');
      const certificationsData = data?.certifications || [];
      const importResult = await importCertifications(certificationsData);
      results.imported.push(importResult);
    }

    if (action === 'import_quotes' || action === 'import_all') {
      console.log('[3] 导入智慧语录...');
      const quotesData = data?.quotes || getSampleQuotes();
      const importResult = await importQuotes(quotesData);
      results.imported.push(importResult);
    }

    console.log('\n========================================');
    console.log('✅ 数据导入完成');
    console.log('========================================\n');

    return {
      code: 0,
      message: '数据导入成功',
      ...results
    };

  } catch (error) {
    console.error('❌ 数据导入失败:', error);
    return {
      code: 500,
      message: '数据导入失败',
      error: error.message,
      ...results
    };
  }
};

/**
 * 导入践行者档案
 */
async function importPractitioners(practitionersData) {
  const successIds = [];
  const errors = [];
  
  for (let i = 0; i < practitionersData.length; i++) {
    const practitioner = practitionersData[i];
    
    try {
      // 检查是否已存在
      const existing = await db.collection('practitioners')
        .where({ practitionerId: practitioner.practitionerId })
        .get();
      
      if (existing.data.length > 0) {
        console.log(`  ℹ️  [${i + 1}/${practitionersData.length}] ${practitioner.profile.realName}: 已存在，跳过`);
        continue;
      }
      
      // 插入数据
      const result = await db.collection('practitioners').add({
        data: {
          ...practitioner,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`  ✅ [${i + 1}/${practitionersData.length}] ${practitioner.profile.realName}: 导入成功`);
      successIds.push(result._id);
      
    } catch (error) {
      console.log(`  ❌ [${i + 1}/${practitionersData.length}] ${practitioner.profile.realName}: 导入失败 - ${error.message}`);
      errors.push({
        practitioner: practitioner.profile.realName,
        error: error.message
      });
    }
  }
  
  return {
    collection: 'practitioners',
    total: practitionersData.length,
    success: successIds.length,
    failed: errors.length,
    successIds,
    errors
  };
}

/**
 * 导入认证关系
 */
async function importCertifications(certificationsData) {
  const successIds = [];
  const errors = [];
  
  for (let i = 0; i < certificationsData.length; i++) {
    const cert = certificationsData[i];
    
    try {
      // 计算权重
      const weight = calculateCertificationWeight(cert);
      
      const result = await db.collection('practitioner_certifications').add({
        data: {
          ...cert,
          weight,
          helpfulCount: 0,
          status: 'active',
          approvedBy: 'admin',
          approvedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`  ✅ [${i + 1}/${certificationsData.length}] 认证导入成功`);
      successIds.push(result._id);
      
    } catch (error) {
      console.log(`  ❌ [${i + 1}/${certificationsData.length}] 认证导入失败 - ${error.message}`);
      errors.push({ index: i, error: error.message });
    }
  }
  
  return {
    collection: 'practitioner_certifications',
    total: certificationsData.length,
    success: successIds.length,
    failed: errors.length,
    successIds,
    errors
  };
}

/**
 * 导入智慧语录
 */
async function importQuotes(quotesData) {
  const successIds = [];
  const errors = [];
  
  for (let i = 0; i < quotesData.length; i++) {
    const quote = quotesData[i];
    
    try {
      const result = await db.collection('wisdom_quotes').add({
        data: {
          ...quote,
          views: 0,
          likes: 0,
          shares: 0,
          usageInDatabase: 0,
          featured: false,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`  ✅ [${i + 1}/${quotesData.length}] "${quote.quote.substring(0, 20)}..." 导入成功`);
      successIds.push(result._id);
      
    } catch (error) {
      console.log(`  ❌ [${i + 1}/${quotesData.length}] 语录导入失败 - ${error.message}`);
      errors.push({ index: i, error: error.message });
    }
  }
  
  return {
    collection: 'wisdom_quotes',
    total: quotesData.length,
    success: successIds.length,
    failed: errors.length,
    successIds,
    errors
  };
}

/**
 * 计算认证权重
 */
function calculateCertificationWeight(cert) {
  let weight = 0;
  
  // 认证等级权重
  const levelWeights = {
    'bronze': 1,
    'silver': 2,
    'gold': 3,
    'diamond': 5,
    'legend': 10
  };
  weight += (levelWeights[cert.certificationLevel] || 1) * 10;
  
  // 经验年限权重
  weight += (cert.certification?.experienceYears || 0) * 2;
  
  // 有视频加权
  if (cert.videoUrl) {
    weight += 5;
  }
  
  return weight;
}

/**
 * 示例数据：践行者档案
 */
function getSamplePractitioners() {
  return [
    {
      practitionerId: 'practitioner_001',
      profile: {
        realName: '李明（示例）',
        age: 35,
        gender: 'male',
        occupation: 'IT工程师',
        location: '北京',
        avatar: '',
        isPublic: true
      },
      veganJourney: {
        startDate: new Date('2015-02-01'),
        veganYears: 10,
        veganType: 'pure_vegan',
        story: {
          trigger: '2015年春节，看到屠宰场视频，当晚失眠，第二天开始吃素，至今10年从未动摇。',
          process: '前3个月最难，每天想吃肉，但想到那个眼神就忍住了。第4个月身体开始适应，第6个月家人也减少吃肉，现在全家都是弹性素食者。',
          challenges: [
            '第3天特别想吃肉',
            '家人担心营养不够',
            '朋友聚会尴尬'
          ],
          solutions: [
            '去素食餐厅吃大餐',
            '定期体检给家人看',
            '提前和餐厅沟通预订素菜'
          ],
          keyMoments: [
            {
              day: 3,
              event: '最想放弃，去素食餐厅吃大餐',
              feeling: '发现素食也能很满足',
              impact: '信心大增，坚持下来了'
            },
            {
              day: 90,
              event: '体检血脂正常',
              feeling: '数据证明素食有效',
              impact: '家人开始支持'
            }
          ]
        }
      },
      practices: {
        dailyMeals: {
          breakfast: '豆浆+全麦面包+水果',
          lunch: '公司食堂素菜+糙米饭',
          dinner: '自己做，麻婆豆腐是招牌',
          snacks: '坚果、水果'
        },
        topIngredients: [],
        topRecipes: [],
        seasonalAdjustments: {
          spring: '春笋、豆芽、韭菜为主',
          summer: '清淡为主，凉拌菜',
          autumn: '滋阴润燥，百合、银耳',
          winter: '温补，核桃、板栗'
        }
      },
      healthChanges: {
        medicalReports: [],
        subjectiveChanges: {
          energy: { before: 6, after: 9 },
          sleep: { before: '经常失眠', after: '睡眠质量明显改善' },
          skin: { before: '痘痘多', after: '皮肤光滑' },
          digestion: { before: '一般', after: '很好' },
          mood: { before: '易烦躁', after: '平和' },
          sports: { before: '不运动', after: '每周跑步3次' }
        },
        diseaseImprovements: []
      },
      uniqueWisdom: {
        corePhilosophy: '素食不是限制，而是自由',
        goldenRules: [
          '循序渐进，不要急',
          '吃饱吃好，不要饿',
          '科学监测，定期体检'
        ],
        uniqueSecrets: [
          '盐水泡豆腐10分钟去豆腥味',
          '节气饮食，立春吃韭菜'
        ],
        adviceToNewcomers: '前3个月是适应期，坚持过去就是新世界',
        deepThoughts: '素食让我理解了天人合一，人不是自然的主宰，而是一部分',
        futureVision: '希望更多人了解素食，一起为地球减负'
      },
      certification: {
        level: 'diamond',
        certifiedAt: new Date(),
        certifiedBy: 'admin',
        canBeMentor: true,
        specialties: ['中餐', '营养搭配', '转素指导'],
        mentoredCount: 0
      },
      contributions: {
        recipesShared: 10,
        questionsAnswered: 50,
        articlesWritten: 5,
        videosRecorded: 3
      },
      media: {
        profileVideo: '',
        cookingVideos: [],
        photos: [],
        voiceRecords: []
      },
      status: 'active'
    }
  ];
}

/**
 * 示例数据：智慧语录
 */
function getSampleQuotes() {
  return [
    {
      quoteId: 'quote_001',
      quote: '素食的前3个月是身体适应期，前3年是观念稳定期，3年后就是生活方式了。',
      quoteEn: 'The first 3 months of veganism is physical adaptation, the first 3 years is mindset stabilization, and after 3 years it becomes a way of life.',
      practitionerId: 'practitioner_001',
      practitionerName: '李明',
      veganYears: 10,
      category: 'philosophy',
      tags: ['坚持', '阶段', '生活方式'],
      context: '李明在10年素食经历中总结出的规律，帮助很多新人理解转素的过程',
      relatedStory: '',
      applicableScenes: ['转素初期', '想放弃时'],
      relatedIngredients: [],
      relatedRecipes: [],
      relatedWisdom: [],
      audioUrl: '',
      imageUrl: ''
    },
    {
      quoteId: 'quote_002',
      quote: '身体会告诉你答案。',
      quoteEn: 'Your body will tell you the answer.',
      practitionerId: 'practitioner_001',
      practitionerName: '李明',
      veganYears: 10,
      category: 'health',
      tags: ['健康', '倾听身体'],
      context: '强调关注身体感受，而不是盲从理论',
      relatedStory: '',
      applicableScenes: ['营养搭配', '食材选择'],
      relatedIngredients: [],
      relatedRecipes: [],
      relatedWisdom: [],
      audioUrl: '',
      imageUrl: ''
    },
    {
      quoteId: 'quote_003',
      quote: '素食不是限制，而是自由。',
      quoteEn: 'Veganism is not a restriction, but freedom.',
      practitionerId: 'practitioner_001',
      practitionerName: '李明',
      veganYears: 10,
      category: 'philosophy',
      tags: ['自由', '心态', '哲学'],
      context: '从限制的视角转换到自由的视角，是素食成功的关键',
      relatedStory: '',
      applicableScenes: ['遇到质疑', '自我怀疑'],
      relatedIngredients: [],
      relatedRecipes: [],
      relatedWisdom: [],
      audioUrl: '',
      imageUrl: ''
    }
  ];
}

