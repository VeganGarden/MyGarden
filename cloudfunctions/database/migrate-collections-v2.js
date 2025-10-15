const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 数据迁移脚本 v2.0
 * 
 * 功能：为现有集合添加新字段
 * - ingredients: 添加践行者证言、中医属性、实践智慧等
 * - recipes: 添加认证信息、实践数据、中医智慧等
 * - users: 添加体质信息、践行者标识、导师关系等
 * 
 * 执行方式：
 * - action: 'preview' - 预览将要执行的操作（不修改数据）
 * - action: 'migrate' - 执行迁移
 * - action: 'rollback' - 回滚（删除新增字段）
 */

exports.main = async (event) => {
  const { action = 'preview', collection = 'all' } = event;
  
  console.log('========================================');
  console.log(`数据迁移 v2.0 - ${action.toUpperCase()}`);
  console.log('========================================\n');

  const results = {
    action,
    timestamp: new Date(),
    collections: []
  };

  try {
    // 迁移 ingredients 集合
    if (collection === 'all' || collection === 'ingredients') {
      console.log('[1/3] 处理 ingredients 集合...');
      const ingredientsResult = await migrateIngredients(action);
      results.collections.push(ingredientsResult);
    }

    // 迁移 recipes 集合
    if (collection === 'all' || collection === 'recipes') {
      console.log('[2/3] 处理 recipes 集合...');
      const recipesResult = await migrateRecipes(action);
      results.collections.push(recipesResult);
    }

    // 迁移 users 集合
    if (collection === 'all' || collection === 'users') {
      console.log('[3/3] 处理 users 集合...');
      const usersResult = await migrateUsers(action);
      results.collections.push(usersResult);
    }

    console.log('\n========================================');
    console.log('✅ 数据迁移完成');
    console.log('========================================\n');

    return {
      code: 0,
      message: `数据迁移${action === 'preview' ? '预览' : '执行'}成功`,
      ...results
    };

  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    return {
      code: 500,
      message: '数据迁移失败',
      error: error.message,
      ...results
    };
  }
};

/**
 * 迁移 ingredients 集合
 */
async function migrateIngredients(action) {
  const collectionName = 'ingredients';
  
  try {
    // 获取集合中的文档数量
    const countResult = await db.collection(collectionName).count();
    const totalDocs = countResult.total;
    
    console.log(`  📊 ${collectionName}: 共 ${totalDocs} 条记录`);
    
    if (action === 'preview') {
      console.log('  🔍 预览模式：将添加以下字段：');
      console.log('    - practitionerTestimonials: [] (践行者证言)');
      console.log('    - tcmProperties: {} (中医属性)');
      console.log('    - practiceWisdom: {} (实践智慧)');
      console.log('    - therapeuticEffects: [] (食疗功效)');
      console.log('    - culturalStory: {} (文化故事)');
      console.log('    - sustainability: {} (可持续性)');
      
      return {
        collection: collectionName,
        action: 'preview',
        totalDocs,
        newFields: 6,
        status: 'preview_complete'
      };
    }
    
    if (action === 'migrate') {
      console.log('  🔄 开始迁移...');
      
      // 批量更新：为所有文档添加新字段
      const updateResult = await db.collection(collectionName)
        .where({})
        .update({
          data: {
            practitionerTestimonials: [],
            tcmProperties: {
              nature: '',
              flavor: '',
              meridian: [],
              function: [],
              suitableFor: [],
              avoidFor: [],
              bestSeasons: [],
              solarTerms: []
            },
            practiceWisdom: {
              usageStats: {
                averageFrequency: '',
                topUses: [],
                popularRecipes: []
              },
              purchasingTips: [],
              storageTips: [],
              cookingTips: [],
              commonMistakes: [],
              bestCombinations: []
            },
            therapeuticEffects: [],
            culturalStory: {
              origin: '',
              history: '',
              culturalSignificance: '',
              traditions: []
            },
            sustainability: {
              localProduction: false,
              seasonalAvailability: [],
              waterFootprint: 0,
              landUse: 0
            }
          }
        });
      
      console.log(`  ✅ 迁移完成: ${updateResult.stats.updated} 条记录已更新`);
      
      return {
        collection: collectionName,
        action: 'migrate',
        totalDocs,
        updatedDocs: updateResult.stats.updated,
        status: 'success'
      };
    }
    
    if (action === 'rollback') {
      console.log('  ⚠️  回滚操作：删除新增字段...');
      
      const updateResult = await db.collection(collectionName)
        .where({})
        .update({
          data: {
            practitionerTestimonials: _.remove(),
            tcmProperties: _.remove(),
            practiceWisdom: _.remove(),
            therapeuticEffects: _.remove(),
            culturalStory: _.remove(),
            sustainability: _.remove()
          }
        });
      
      console.log(`  ✅ 回滚完成: ${updateResult.stats.updated} 条记录已回滚`);
      
      return {
        collection: collectionName,
        action: 'rollback',
        totalDocs,
        rolledBackDocs: updateResult.stats.updated,
        status: 'success'
      };
    }
    
  } catch (error) {
    console.error(`  ❌ ${collectionName} 迁移失败:`, error.message);
    return {
      collection: collectionName,
      action,
      status: 'failed',
      error: error.message
    };
  }
}

/**
 * 迁移 recipes 集合
 */
async function migrateRecipes(action) {
  const collectionName = 'recipes';
  
  try {
    const countResult = await db.collection(collectionName).count();
    const totalDocs = countResult.total;
    
    console.log(`  📊 ${collectionName}: 共 ${totalDocs} 条记录`);
    
    if (action === 'preview') {
      console.log('  🔍 预览模式：将添加以下字段：');
      console.log('    - recipeId: "" (食谱唯一ID)');
      console.log('    - nameEn: "" (英文名)');
      console.log('    - cuisine: "" (菜系)');
      console.log('    - difficulty: "" (难度)');
      console.log('    - prepTime, cookTime, totalTime (时间)');
      console.log('    - servings: 0 (份数)');
      console.log('    - cookingSteps: [] (详细步骤)');
      console.log('    - nutrition: {} (营养数据)');
      console.log('    - carbonFootprint: {} (碳足迹详情)');
      console.log('    - certification: {} (践行者认证)');
      console.log('    - practiceData: {} (实践数据)');
      console.log('    - tcmWisdom: {} (中医智慧)');
      console.log('    - scenarios: {} (适用场景)');
      console.log('    - media: {} (媒体资源)');
      console.log('    - social: {} (社交数据)');
      
      return {
        collection: collectionName,
        action: 'preview',
        totalDocs,
        newFields: 15,
        status: 'preview_complete'
      };
    }
    
    if (action === 'migrate') {
      console.log('  🔄 开始迁移...');
      
      const updateResult = await db.collection(collectionName)
        .where({})
        .update({
          data: {
            recipeId: '',
            nameEn: '',
            cuisine: '',
            difficulty: 'medium',
            prepTime: 0,
            cookTime: 0,
            totalTime: 0,
            servings: 2,
            cookingSteps: [],
            nutrition: {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              vitamins: {}
            },
            carbonFootprint: {
              total: 0,
              perServing: 0,
              breakdown: [],
              comparisonToMeat: {
                meatVersion: '',
                meatCarbon: 0,
                savingsPercent: 0,
                equivalentTo: ''
              }
            },
            certification: {
              isCertified: false,
              certifiedBy: [],
              originalCreator: null,
              creationStory: '',
              evolutionHistory: []
            },
            practiceData: {
              totalAttempts: 0,
              successCount: 0,
              failureReasons: [],
              userRatings: {
                taste: 0,
                difficulty: 0,
                nutrition: 0,
                speed: 0,
                avgRating: 0,
                ratingCount: 0
              },
              topReviews: []
            },
            tcmWisdom: {
              suitableBodyTypes: [],
              avoidBodyTypes: [],
              bestSolarTerms: [],
              solarTermReason: '',
              healthBenefits: [],
              tcmPrinciple: '',
              contraindications: []
            },
            scenarios: {
              bestFor: [],
              occasions: [],
              targetAudience: []
            },
            tags: [],
            media: {
              coverImage: '',
              stepImages: [],
              videoTutorial: '',
              shortVideo: '',
              voiceGuide: ''
            },
            social: {
              views: 0,
              likes: 0,
              collections: 0,
              shares: 0,
              comments: 0
            },
            source: 'official',
            creatorId: null,
            status: 'published',
            publishedAt: new Date()
          }
        });
      
      console.log(`  ✅ 迁移完成: ${updateResult.stats.updated} 条记录已更新`);
      
      return {
        collection: collectionName,
        action: 'migrate',
        totalDocs,
        updatedDocs: updateResult.stats.updated,
        status: 'success'
      };
    }
    
    if (action === 'rollback') {
      console.log('  ⚠️  回滚操作：删除新增字段...');
      
      const fieldsToRemove = [
        'recipeId', 'nameEn', 'cuisine', 'difficulty',
        'prepTime', 'cookTime', 'totalTime', 'servings',
        'cookingSteps', 'nutrition', 'carbonFootprint',
        'certification', 'practiceData', 'tcmWisdom',
        'scenarios', 'tags', 'media', 'social',
        'source', 'creatorId', 'status', 'publishedAt'
      ];
      
      const removeData = {};
      fieldsToRemove.forEach(field => {
        removeData[field] = _.remove();
      });
      
      const updateResult = await db.collection(collectionName)
        .where({})
        .update({ data: removeData });
      
      console.log(`  ✅ 回滚完成: ${updateResult.stats.updated} 条记录已回滚`);
      
      return {
        collection: collectionName,
        action: 'rollback',
        totalDocs,
        rolledBackDocs: updateResult.stats.updated,
        status: 'success'
      };
    }
    
  } catch (error) {
    console.error(`  ❌ ${collectionName} 迁移失败:`, error.message);
    return {
      collection: collectionName,
      action,
      status: 'failed',
      error: error.message
    };
  }
}

/**
 * 迁移 users 集合
 */
async function migrateUsers(action) {
  const collectionName = 'users';
  
  try {
    const countResult = await db.collection(collectionName).count();
    const totalDocs = countResult.total;
    
    console.log(`  📊 ${collectionName}: 共 ${totalDocs} 条记录`);
    
    if (action === 'preview') {
      console.log('  🔍 预览模式：将添加以下字段：');
      console.log('    - bodyType: "" (体质类型)');
      console.log('    - isPractitioner: false (是否践行者)');
      console.log('    - practitionerProfile: {} (践行者信息)');
      console.log('    - mentorship: {} (导师关系)');
      console.log('    - stats.veganDays (素食天数)');
      console.log('    - stats.wisdomContributions (智慧贡献)');
      console.log('    - stats.certifications (认证数量)');
      
      return {
        collection: collectionName,
        action: 'preview',
        totalDocs,
        newFields: 7,
        status: 'preview_complete'
      };
    }
    
    if (action === 'migrate') {
      console.log('  🔄 开始迁移...');
      
      const updateResult = await db.collection(collectionName)
        .where({})
        .update({
          data: {
            bodyType: '',
            isPractitioner: false,
            practitionerProfile: {
              practitionerId: null,
              certificationLevel: '',
              canBeMentor: false,
              specialties: []
            },
            mentorship: {
              hasMentor: false,
              mentorId: null,
              isMentor: false,
              menteeCount: 0
            },
            'stats.veganDays': 0,
            'stats.wisdomContributions': 0,
            'stats.certifications': 0
          }
        });
      
      console.log(`  ✅ 迁移完成: ${updateResult.stats.updated} 条记录已更新`);
      
      return {
        collection: collectionName,
        action: 'migrate',
        totalDocs,
        updatedDocs: updateResult.stats.updated,
        status: 'success'
      };
    }
    
    if (action === 'rollback') {
      console.log('  ⚠️  回滚操作：删除新增字段...');
      
      const updateResult = await db.collection(collectionName)
        .where({})
        .update({
          data: {
            bodyType: _.remove(),
            isPractitioner: _.remove(),
            practitionerProfile: _.remove(),
            mentorship: _.remove(),
            'stats.veganDays': _.remove(),
            'stats.wisdomContributions': _.remove(),
            'stats.certifications': _.remove()
          }
        });
      
      console.log(`  ✅ 回滚完成: ${updateResult.stats.updated} 条记录已回滚`);
      
      return {
        collection: collectionName,
        action: 'rollback',
        totalDocs,
        rolledBackDocs: updateResult.stats.updated,
        status: 'success'
      };
    }
    
  } catch (error) {
    console.error(`  ❌ ${collectionName} 迁移失败:`, error.message);
    return {
      collection: collectionName,
      action,
      status: 'failed',
      error: error.message
    };
  }
}

// 支持本地测试
if (require.main === module) {
  // 默认预览模式
  exports.main({ action: 'preview' }).then(result => {
    console.log('\n最终结果:', JSON.stringify(result, null, 2));
    console.log('\n💡 提示：');
    console.log('  预览模式完成。如需执行迁移，请使用:');
    console.log('  { action: "migrate" }');
    process.exit(0);
  }).catch(err => {
    console.error('\n执行失败:', err);
    process.exit(1);
  });
}

