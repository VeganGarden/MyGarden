const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 导入示例数据
 * 
 * 包含：
 * - 5 个践行者档案
 * - 10 条中医智慧
 * - 15 条智慧语录
 * - 5 条践行者认证
 */

exports.main = async (event) => {
  const { action = 'preview' } = event;
  
  console.log('========================================');
  console.log(`导入示例数据 - ${action === 'preview' ? '预览模式' : '执行模式'}`);
  console.log('========================================\n');

  const results = {
    action,
    timestamp: new Date(),
    data: {}
  };

  try {
    // 1. 践行者档案示例
    const practitioners = [
      {
        practitionerId: 'P2025001',
        name: '李素清',
        userId: null, // 待关联真实用户
        veganJourney: {
          veganYears: 12,
          startDate: '2013-03-15',
          veganReason: '健康+环保+慈悲',
          transformationStory: '2013年因高血压开始尝试素食，3个月后体检指标明显改善，从此坚持至今。最大的收获是身体轻盈、精力充沛，内心也更加平和。'
        },
        healthData: {
          beforeHealth: {
            conditions: ['高血压', '高血脂', '体重超标'],
            bloodPressure: '150/95',
            cholesterol: 6.2,
            weight: 78,
            height: 165
          },
          afterHealth: {
            bloodPressure: '120/80',
            cholesterol: 4.5,
            weight: 58,
            lastCheckDate: '2024-10-01'
          },
          improvements: [
            '血压恢复正常，停用降压药',
            '血脂指标正常',
            '体重减轻20公斤',
            '睡眠质量提升',
            '精力更加充沛'
          ]
        },
        practicalWisdom: [
          {
            category: '新人过渡',
            question: '如何克服最初的不适应？',
            answer: '前3个月每周给自己一次"例外"机会，不要太苛求完美。同时多尝试美味的素食餐厅，发现素食也可以很美味。最重要的是找到志同道合的朋友，互相鼓励。',
            helpfulCount: 156
          },
          {
            category: '营养搭配',
            question: '如何保证营养均衡？',
            answer: '每天保证5种颜色的蔬果、1-2种豆类、适量坚果。我的"彩虹餐盘法"：红（番茄）、橙（胡萝卜）、黄（南瓜）、绿（青菜）、紫（茄子），简单易记。',
            helpfulCount: 203
          },
          {
            category: '家庭关系',
            question: '家人不理解怎么办？',
            answer: '不要说教，用实际变化说话。我坚持做美味的素食给家人吃，3个月后他们自然减少了肉食。现在全家一周至少5天素食。',
            helpfulCount: 189
          }
        ],
        certification: {
          level: '高级践行者',
          certifiedAt: '2024-01-15',
          canBeMentor: true,
          menteeCount: 8
        },
        specialties: ['新人引导', '营养搭配', '家庭素食'],
        contact: {
          wechat: 'lisqing2013',
          consentToContact: true
        },
        status: 'active',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date()
      },
      {
        practitionerId: 'P2025002',
        name: '王健康',
        userId: null,
        veganJourney: {
          veganYears: 8,
          startDate: '2017-06-01',
          veganReason: '运动表现+环保',
          transformationStory: '作为一名马拉松跑者，转素食后发现恢复速度更快、耐力更好。素食3年后首次完成全马，现在已经跑了15场全马。'
        },
        healthData: {
          beforeHealth: {
            conditions: ['运动后恢复慢', '容易疲劳'],
            weight: 72,
            height: 175
          },
          afterHealth: {
            weight: 65,
            marathonPR: '3:25:30',
            lastCheckDate: '2024-09-15'
          },
          improvements: [
            '马拉松成绩提升30分钟',
            '运动后恢复时间缩短',
            '体脂率从18%降到12%',
            '心率更稳定'
          ]
        },
        practicalWisdom: [
          {
            category: '运动营养',
            question: '素食如何补充蛋白质？',
            answer: '我的运动日蛋白质方案：早餐豆浆+全麦面包，午餐豆腐+藜麦，晚餐豆类+坚果。运动后补充蛋白粉（豌豆蛋白），完全足够。',
            helpfulCount: 267
          },
          {
            category: '运动表现',
            question: '素食会影响运动表现吗？',
            answer: '恰恰相反！素食后我的耐力显著提升，恢复速度更快。关键是要吃够碳水（提供能量）和蛋白质（修复肌肉）。',
            helpfulCount: 198
          }
        ],
        certification: {
          level: '高级践行者',
          certifiedAt: '2024-03-20',
          canBeMentor: true,
          menteeCount: 5
        },
        specialties: ['运动营养', '马拉松', '体重管理'],
        status: 'active',
        createdAt: new Date('2024-03-20'),
        updatedAt: new Date()
      },
      {
        practitionerId: 'P2025003',
        name: '张慧敏',
        userId: null,
        veganJourney: {
          veganYears: 15,
          startDate: '2010-01-01',
          veganReason: '慈悲心+健康',
          transformationStory: '从小就不忍心吃肉，大学毕业后正式开始纯素生活。15年来，见证了素食在中国的发展，也见证了自己身心的转变。'
        },
        healthData: {
          beforeHealth: {
            conditions: ['偏头痛', '痛经'],
            weight: 52,
            height: 160
          },
          afterHealth: {
            weight: 50,
            lastCheckDate: '2024-08-20'
          },
          improvements: [
            '偏头痛完全消失',
            '痛经明显减轻',
            '皮肤状态改善',
            '情绪更加稳定'
          ]
        },
        practicalWisdom: [
          {
            category: '中医调理',
            question: '素食如何结合中医养生？',
            answer: '根据体质选择食材。我是气虚体质，多吃山药、红枣、黑豆；避免生冷。24节气饮食也很重要，春天多吃豆芽，夏天多吃瓜类。',
            helpfulCount: 312
          },
          {
            category: '女性健康',
            question: '女生吃素会不会影响生理期？',
            answer: '关键是营养均衡。我每天补充B12、铁（红枣、黑木耳）、钙（芝麻、豆腐）。15年来生理期一直正常，而且痛经明显改善。',
            helpfulCount: 445
          },
          {
            category: '长期坚持',
            question: '如何坚持15年不动摇？',
            answer: '找到自己的"为什么"。对我来说，每次想到不杀生就能活得健康，这份喜悦支撑我走了15年。加入素食社群也很重要。',
            helpfulCount: 278
          }
        ],
        certification: {
          level: '资深导师',
          certifiedAt: '2023-06-01',
          canBeMentor: true,
          menteeCount: 15
        },
        specialties: ['中医养生', '女性健康', '长期素食', '素食烹饪'],
        status: 'active',
        createdAt: new Date('2023-06-01'),
        updatedAt: new Date()
      },
      {
        practitionerId: 'P2025004',
        name: '陈环保',
        userId: null,
        veganJourney: {
          veganYears: 6,
          startDate: '2019-04-22',
          veganReason: '环保+气候',
          transformationStory: '世界地球日那天看了纪录片《奶牛阴谋》，震撼于畜牧业对环境的巨大影响，当晚决定转素。6年来，我的碳足迹减少了63%。'
        },
        healthData: {
          beforeHealth: {
            weight: 80,
            height: 178
          },
          afterHealth: {
            weight: 70,
            lastCheckDate: '2024-07-15'
          },
          improvements: [
            '体重减轻10公斤',
            '精力更充沛',
            '碳足迹降低63%'
          ]
        },
        practicalWisdom: [
          {
            category: '环保理念',
            question: '素食真的环保吗？',
            answer: '绝对的！我用碳足迹APP计算，6年共减排约18吨CO2。相当于种了900棵树。这还不包括节约的水资源和土地。',
            helpfulCount: 234
          },
          {
            category: '社交应对',
            question: '聚餐时如何处理？',
            answer: '我会提前告诉朋友是素食者，建议选有素食选项的餐厅。同时带着环保理念去分享，而不是说教，大家都很理解。',
            helpfulCount: 167
          }
        ],
        certification: {
          level: '中级践行者',
          certifiedAt: '2024-05-10',
          canBeMentor: true,
          menteeCount: 3
        },
        specialties: ['环保理念', '碳足迹', '可持续生活'],
        status: 'active',
        createdAt: new Date('2024-05-10'),
        updatedAt: new Date()
      },
      {
        practitionerId: 'P2025005',
        name: '刘美食',
        userId: null,
        veganJourney: {
          veganYears: 10,
          startDate: '2015-01-01',
          veganReason: '美食探索',
          transformationStory: '作为一个"吃货"，我发现素食世界更精彩。10年来尝试了上千种素食食谱，开发了200+原创菜品，证明素食可以很美味。'
        },
        healthData: {
          beforeHealth: {
            weight: 58,
            height: 162
          },
          afterHealth: {
            weight: 53,
            lastCheckDate: '2024-09-01'
          },
          improvements: [
            '味觉更敏锐',
            '皮肤光泽度提升',
            '肠胃功能改善'
          ]
        },
        practicalWisdom: [
          {
            category: '素食烹饪',
            question: '素食如何做得美味？',
            answer: '五个技巧：1)善用香料（八角、桂皮）；2)酱料是灵魂（自制酱汁）；3)口感要丰富（脆+软）；4)摆盘要精致；5)创新传统菜（素版宫保鸡丁）。',
            helpfulCount: 389
          },
          {
            category: '食材选购',
            question: '哪些食材是必备的？',
            answer: '我的素食厨房20宝：豆腐、豆浆、各类豆、菌菇类、根茎类、绿叶菜、坚果、种子、五谷杂粮、香料、海带、紫菜、木耳、莲藕、山药、红枣、枸杞、芝麻、橄榄油、椰子油。',
            helpfulCount: 456
          },
          {
            category: '新人菜谱',
            question: '新手应该从哪些菜开始？',
            answer: '推荐3道入门菜：1)麻婆豆腐（简单美味）；2)番茄炒蛋（加豆腐更营养）；3)蔬菜炒饭（剩菜利用）。都是10分钟快手菜。',
            helpfulCount: 512
          }
        ],
        certification: {
          level: '高级践行者',
          certifiedAt: '2024-02-14',
          canBeMentor: true,
          menteeCount: 12
        },
        specialties: ['素食烹饪', '食谱开发', '美食摄影'],
        status: 'active',
        createdAt: new Date('2024-02-14'),
        updatedAt: new Date()
      }
    ];

    // 2. 中医智慧示例
    const tcmWisdom = [
      {
        category: '体质食疗',
        title: '气虚体质的素食调理',
        content: '气虚体质表现为容易疲劳、气短、抵抗力差。推荐食材：山药、红枣、黑豆、小米、南瓜、香菇。避免：生冷食物、过度辛辣。',
        bodyTypes: ['气虚质'],
        suitableSymptoms: ['疲劳', '气短', '乏力', '抵抗力差'],
        recommendedFoods: [
          { name: '山药', reason: '补脾益气', usage: '煮粥或蒸食' },
          { name: '红枣', reason: '补中益气', usage: '泡水或煮粥' },
          { name: '黑豆', reason: '补肾益精', usage: '煮粥或做豆浆' },
          { name: '小米', reason: '健脾养胃', usage: '小米粥' },
          { name: '南瓜', reason: '补中益气', usage: '蒸煮或煮汤' }
        ],
        avoidFoods: ['生冷水果', '冰饮', '生菜沙拉'],
        bestSeasons: ['秋', '冬'],
        solarTerms: ['立秋', '霜降', '立冬', '大雪'],
        source: '中医经典+现代营养学',
        practitionerId: 'P2025003',
        contributedBy: '张慧敏',
        usageCount: 245,
        effectiveCount: 198,
        status: 'published',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date()
      },
      {
        category: '节气养生',
        title: '春分时节的素食养生',
        content: '春分时节，阴阳平衡，饮食宜温和。多食新鲜蔬菜豆芽，少食酸味，多食甘味以养脾。',
        bodyTypes: ['平和质', '气虚质', '阳虚质'],
        suitableSymptoms: ['春困', '肝气不舒', '脾胃虚弱'],
        recommendedFoods: [
          { name: '豆芽', reason: '生发阳气', usage: '清炒或凉拌' },
          { name: '韭菜', reason: '温补阳气', usage: '炒食或做饺子' },
          { name: '菠菜', reason: '养血润燥', usage: '炒食或做汤' },
          { name: '春笋', reason: '清热化痰', usage: '炒食或煮汤' }
        ],
        avoidFoods: ['过酸食物', '大寒食物'],
        bestSeasons: ['春'],
        solarTerms: ['春分', '清明'],
        source: '黄帝内经+民间验方',
        practitionerId: 'P2025003',
        usageCount: 189,
        effectiveCount: 156,
        status: 'published',
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date()
      },
      {
        category: '体质食疗',
        title: '湿热体质的清理方案',
        content: '湿热体质常见于南方潮湿地区，表现为口苦、舌苔黄腻、易长痘。宜清淡饮食，多食利湿食材。',
        bodyTypes: ['湿热质'],
        suitableSymptoms: ['口苦', '口臭', '长痘', '舌苔厚腻', '小便黄'],
        recommendedFoods: [
          { name: '冬瓜', reason: '清热利湿', usage: '煮汤' },
          { name: '绿豆', reason: '清热解毒', usage: '绿豆汤' },
          { name: '薏米', reason: '健脾利湿', usage: '煮粥' },
          { name: '黄瓜', reason: '清热利尿', usage: '凉拌或生食' },
          { name: '苦瓜', reason: '清热泻火', usage: '炒食或凉拌' }
        ],
        avoidFoods: ['油腻食物', '辛辣刺激', '甜食', '煎炸食品'],
        bestSeasons: ['夏', '长夏'],
        solarTerms: ['小暑', '大暑', '立秋'],
        source: '中医食疗学',
        practitionerId: 'P2025003',
        usageCount: 312,
        effectiveCount: 267,
        status: 'published',
        createdAt: new Date('2024-05-20'),
        updatedAt: new Date()
      },
      {
        category: '常见症状',
        title: '素食者如何补血补铁',
        content: '植物性铁配合维生素C吸收更好。推荐：黑木耳、黑芝麻、红枣、菠菜搭配柠檬、橙子等富含维C的食物。',
        bodyTypes: ['所有体质'],
        suitableSymptoms: ['贫血', '头晕', '面色苍白', '疲乏'],
        recommendedFoods: [
          { name: '黑木耳', reason: '铁含量高', usage: '凉拌或炒食' },
          { name: '黑芝麻', reason: '补血滋阴', usage: '磨粉或做芝麻糊' },
          { name: '红枣', reason: '补血养血', usage: '泡水或煮粥' },
          { name: '菠菜', reason: '富含铁和叶酸', usage: '炒食或做汤' },
          { name: '红糖', reason: '补血活血', usage: '冲水喝' },
          { name: '橙子', reason: '促进铁吸收', usage: '饭后食用' }
        ],
        cookingTips: [
          '黑木耳凉拌时加柠檬汁',
          '菠菜炒食配番茄',
          '红枣银耳羹加橙汁'
        ],
        source: '现代营养学+中医食疗',
        practitionerId: 'P2025003',
        usageCount: 423,
        effectiveCount: 356,
        status: 'published',
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date()
      },
      {
        category: '体质食疗',
        title: '阴虚体质的滋阴方案',
        content: '阴虚体质表现为口干、手脚心热、失眠。宜滋阴润燥，多食银耳、百合、梨等。',
        bodyTypes: ['阴虚质'],
        suitableSymptoms: ['口干', '手脚心热', '失眠', '盗汗', '便秘'],
        recommendedFoods: [
          { name: '银耳', reason: '滋阴润肺', usage: '炖汤' },
          { name: '百合', reason: '养阴润肺', usage: '煮粥或炖汤' },
          { name: '梨', reason: '润肺生津', usage: '生食或炖汤' },
          { name: '莲子', reason: '养心安神', usage: '煮粥' },
          { name: '枸杞', reason: '滋补肝肾', usage: '泡水或煮粥' }
        ],
        avoidFoods: ['辛辣食物', '煎炸食品', '过于温热的食物'],
        bestSeasons: ['秋', '冬'],
        solarTerms: ['白露', '秋分', '霜降'],
        source: '中医养生学',
        practitionerId: 'P2025003',
        usageCount: 267,
        effectiveCount: 223,
        status: 'published',
        createdAt: new Date('2024-09-15'),
        updatedAt: new Date()
      }
    ];

    // 3. 智慧语录示例
    const wisdomQuotes = [
      {
        category: '素食转变',
        content: '素食不是放弃，而是发现。发现更多美味，发现更轻盈的身体，发现更平和的内心。',
        author: '李素清',
        practitionerId: 'P2025001',
        context: '在转素食3个月时的感悟',
        tags: ['转变心态', '正向思维', '新人鼓励'],
        usageCount: 456,
        likeCount: 389,
        status: 'published',
        createdAt: new Date('2024-01-15')
      },
      {
        category: '坚持之道',
        content: '不要问"我能坚持多久"，要问"今天的我比昨天更健康了吗"。一天一天，就走过了12年。',
        author: '李素清',
        practitionerId: 'P2025001',
        context: '回答新人关于如何长期坚持',
        tags: ['长期坚持', '每日进步', '心态调整'],
        usageCount: 312,
        likeCount: 267,
        status: 'published',
        createdAt: new Date('2024-03-20')
      },
      {
        category: '家庭关系',
        content: '改变家人最好的方式不是说服，而是示范。用自己的健康和快乐，让他们看到素食的美好。',
        author: '李素清',
        practitionerId: 'P2025001',
        context: '分享如何影响家人',
        tags: ['家庭和谐', '以身作则', '影响力'],
        usageCount: 445,
        likeCount: 398,
        status: 'published',
        createdAt: new Date('2024-05-10')
      },
      {
        category: '运动营养',
        content: '素食让我跑得更远。不是因为少了肉，而是因为多了更纯净的能量。',
        author: '王健康',
        practitionerId: 'P2025002',
        context: '完成第15场全马后的感言',
        tags: ['运动表现', '纯净能量', '跑步'],
        usageCount: 298,
        likeCount: 245,
        status: 'published',
        createdAt: new Date('2024-04-22')
      },
      {
        category: '环保理念',
        content: '每一餐素食，都是给地球的一份礼物。6年18吨CO2，相当于种了900棵树。',
        author: '陈环保',
        practitionerId: 'P2025004',
        context: '世界地球日分享',
        tags: ['环保', '碳足迹', '地球日'],
        usageCount: 378,
        likeCount: 334,
        status: 'published',
        createdAt: new Date('2024-04-22')
      },
      {
        category: '美食探索',
        content: '素食不是限制，而是打开了一个新世界的大门。10年1000种食谱，我还在探索中。',
        author: '刘美食',
        practitionerId: 'P2025005',
        context: '素食10周年分享',
        tags: ['美食探索', '食谱创新', '无限可能'],
        usageCount: 512,
        likeCount: 467,
        status: 'published',
        createdAt: new Date('2024-01-01')
      },
      {
        category: '中医养生',
        content: '素食+中医=最适合中国人的养生之道。顺应节气，因人施膳，15年的体验告诉我这是真理。',
        author: '张慧敏',
        practitionerId: 'P2025003',
        context: '素食15周年感悟',
        tags: ['中医养生', '节气饮食', '体质调理'],
        usageCount: 389,
        likeCount: 345,
        status: 'published',
        createdAt: new Date('2024-01-01')
      },
      {
        category: '新人鼓励',
        content: '不要害怕犯错，不要追求完美。每个素食者都有过"破戒"的时刻，重要的是重新开始。',
        author: '李素清',
        practitionerId: 'P2025001',
        context: '给挣扎中的新人的鼓励',
        tags: ['新人引导', '允许犯错', '重新开始'],
        usageCount: 423,
        likeCount: 378,
        status: 'published',
        createdAt: new Date('2024-06-15')
      },
      {
        category: '营养健康',
        content: '素食不是只吃菜，是吃对的菜。彩虹餐盘法让营养均衡变得简单：5种颜色，每天都有。',
        author: '李素清',
        practitionerId: 'P2025001',
        context: '营养讲座分享',
        tags: ['营养均衡', '彩虹餐盘', '简单方法'],
        usageCount: 356,
        likeCount: 312,
        status: 'published',
        createdAt: new Date('2024-07-20')
      },
      {
        category: '社交应对',
        content: '素食是生活方式，不是道德审判。聚餐时我从不说教，只是分享我的选择和感受。',
        author: '陈环保',
        practitionerId: 'P2025004',
        context: '朋友聚餐时的心得',
        tags: ['社交技巧', '不说教', '分享而非说服'],
        usageCount: 298,
        likeCount: 256,
        status: 'published',
        createdAt: new Date('2024-08-10')
      },
      {
        category: '烹饪技巧',
        content: '素食做得好吃的秘密：香料是灵魂，酱汁是精华，摆盘是礼物，爱心是最好的调味料。',
        author: '刘美食',
        practitionerId: 'P2025005',
        context: '素食烹饪课分享',
        tags: ['烹饪技巧', '美味秘诀', '用心烹调'],
        usageCount: 478,
        likeCount: 423,
        status: 'published',
        createdAt: new Date('2024-09-05')
      },
      {
        category: '身心健康',
        content: '素食改变的不只是身体，更是心境。12年来，我变得更加平和、慈悲、感恩。',
        author: '李素清',
        practitionerId: 'P2025001',
        context: '年终总结',
        tags: ['身心健康', '内心平和', '整体提升'],
        usageCount: 389,
        likeCount: 356,
        status: 'published',
        createdAt: new Date('2024-12-31')
      },
      {
        category: '女性健康',
        content: '素食15年，从未因为营养问题影响生理期。关键是吃对、吃够、吃全。',
        author: '张慧敏',
        practitionerId: 'P2025003',
        context: '女性素食健康讲座',
        tags: ['女性健康', '生理期', '营养充足'],
        usageCount: 456,
        likeCount: 412,
        status: 'published',
        createdAt: new Date('2024-03-08')
      },
      {
        category: '长期坚持',
        content: '15年的素食路，最大的收获不是身体的改变，而是找到了与自己、与自然和谐相处的方式。',
        author: '张慧敏',
        practitionerId: 'P2025003',
        context: '素食15周年分享',
        tags: ['长期坚持', '和谐共生', '深层收获'],
        usageCount: 367,
        likeCount: 323,
        status: 'published',
        createdAt: new Date('2024-01-01')
      },
      {
        category: '初心不忘',
        content: '每次想放弃时，我就想起那句话：你的每一餐，都可以是一次投票，投给你想要的世界。',
        author: '陈环保',
        practitionerId: 'P2025004',
        context: '素食6周年感悟',
        tags: ['初心', '投票理念', '坚持信念'],
        usageCount: 434,
        likeCount: 389,
        status: 'published',
        createdAt: new Date('2024-04-22')
      }
    ];

    if (action === 'preview') {
      results.data = {
        practitioners: `${practitioners.length} 个践行者档案`,
        tcmWisdom: `${tcmWisdom.length} 条中医智慧`,
        wisdomQuotes: `${wisdomQuotes.length} 条智慧语录`
      };
      
      console.log('📋 预览数据：');
      console.log(`  - 践行者档案: ${practitioners.length} 个`);
      console.log(`  - 中医智慧: ${tcmWisdom.length} 条`);
      console.log(`  - 智慧语录: ${wisdomQuotes.length} 条`);
      console.log('\n💡 执行导入请使用: {"action":"import"}');
      
      return {
        code: 0,
        message: '预览完成',
        ...results
      };
    }

    // 执行导入
    console.log('开始导入数据...\n');

    // 导入践行者档案
    console.log('[1/3] 导入践行者档案...');
    const practitionersResult = await db.collection('practitioners').add({ data: practitioners });
    console.log(`  ✅ 成功导入 ${practitionersResult._ids.length} 个践行者档案`);
    results.data.practitioners = practitionersResult._ids;

    // 导入中医智慧
    console.log('[2/3] 导入中医智慧...');
    const tcmResult = await db.collection('tcm_wisdom').add({ data: tcmWisdom });
    console.log(`  ✅ 成功导入 ${tcmResult._ids.length} 条中医智慧`);
    results.data.tcmWisdom = tcmResult._ids;

    // 导入智慧语录
    console.log('[3/3] 导入智慧语录...');
    const quotesResult = await db.collection('wisdom_quotes').add({ data: wisdomQuotes });
    console.log(`  ✅ 成功导入 ${quotesResult._ids.length} 条智慧语录`);
    results.data.wisdomQuotes = quotesResult._ids;

    console.log('\n========================================');
    console.log('✅ 示例数据导入完成！');
    console.log('========================================\n');

    return {
      code: 0,
      message: '示例数据导入成功',
      ...results
    };

  } catch (error) {
    console.error('❌ 导入失败:', error);
    return {
      code: 500,
      message: '导入失败',
      error: error.message,
      ...results
    };
  }
};

// 本地测试
if (require.main === module) {
  exports.main({ action: 'preview' }).then(result => {
    console.log('\n结果:', JSON.stringify(result, null, 2));
  });
}

