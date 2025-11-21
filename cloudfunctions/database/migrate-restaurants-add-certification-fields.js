/**
 * 为 restaurants 集合添加完整的认证字段
 * 
 * 功能: 为现有餐厅补充完整的 climateCertification 字段结构
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"migrate-restaurants-add-certification-fields"}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 主函数
 */
async function migrateRestaurantsAddCertificationFields() {
  console.log('===== 开始为 restaurants 集合添加认证字段 =====\n');
  
  try {
    // 获取所有餐厅
    const restaurants = await db.collection('restaurants')
      .get();
    
    console.log(`找到 ${restaurants.data.length} 家餐厅`);
    
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const restaurant of restaurants.data) {
      try {
        // 检查是否已有完整的 climateCertification 字段
        if (restaurant.climateCertification && 
            restaurant.climateCertification.isCertified !== undefined) {
          skipped++;
          continue;
        }
        
        // 构建完整的认证字段结构
        const climateCertification = {
          isCertified: restaurant.certificationLevel ? true : false,
          certificationLevel: restaurant.certificationLevel || null,
          certifiedDate: restaurant.certificationLevel ? (restaurant.certifiedDate || new Date()) : null,
          certifiedBy: restaurant.certifiedBy || null,
          certificateNumber: restaurant.certificateNumber || null,
          expiryDate: restaurant.expiryDate || null,
          
          // 五大维度评估结果（初始为空）
          standards: {
            lowCarbonMenuRatio: restaurant.climateCertification?.standards?.lowCarbonMenuRatio || null,
            localIngredientRatio: restaurant.climateCertification?.standards?.localIngredientRatio || null,
            organicRatio: restaurant.climateCertification?.standards?.organicRatio || null,
            foodWasteReduction: restaurant.climateCertification?.standards?.foodWasteReduction || null,
            energyEfficiency: restaurant.climateCertification?.standards?.energyEfficiency || null
          },
          
          // 系统评估结果（初始为空）
          systemEvaluation: {
            score: restaurant.climateCertification?.systemEvaluation?.score || null,
            report: restaurant.climateCertification?.systemEvaluation?.report || null,
            evaluatedAt: restaurant.climateCertification?.systemEvaluation?.evaluatedAt || null,
            evaluatedBy: restaurant.climateCertification?.systemEvaluation?.evaluatedBy || null
          },
          
          // 人工抽检记录（初始为空数组）
          inspectionRecords: restaurant.climateCertification?.inspectionRecords || [],
          
          // 年度承诺（初始为空）
          annualPledge: {
            carbonReductionTarget: restaurant.climateCertification?.annualPledge?.carbonReductionTarget || null,
            customerParticipationTarget: restaurant.climateCertification?.annualPledge?.customerParticipationTarget || null,
            status: restaurant.climateCertification?.annualPledge?.status || 'in_progress'
          },
          
          // 成长激励（初始为空）
          growthIncentives: {
            tasks: restaurant.climateCertification?.growthIncentives?.tasks || [],
            badges: restaurant.climateCertification?.growthIncentives?.badges || [],
            exposurePriority: restaurant.climateCertification?.growthIncentives?.exposurePriority || 0
          }
        };
        
        // 更新餐厅记录
        await db.collection('restaurants')
          .doc(restaurant._id)
          .update({
            data: {
              climateCertification: climateCertification,
              updatedAt: new Date()
            }
          });
        
        updated++;
        console.log(`  ✓ 更新餐厅: ${restaurant.name || restaurant._id}`);
      } catch (error) {
        failed++;
        console.error(`  ❌ 更新餐厅失败 ${restaurant._id}:`, error.message);
      }
    }
    
    console.log('\n===== 迁移完成 =====');
    console.log(`✅ 更新: ${updated} 家餐厅`);
    console.log(`ℹ️  跳过: ${skipped} 家餐厅（已有完整字段）`);
    console.log(`❌ 失败: ${failed} 家餐厅`);
    console.log('========================================\n');
    
    return {
      code: 0,
      message: '认证字段迁移成功',
      summary: {
        total: restaurants.data.length,
        updated,
        skipped,
        failed
      }
    };
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return {
      code: 500,
      message: '迁移失败',
      error: error.message
    };
  }
}

// 支持作为独立模块调用
if (require.main === module) {
  migrateRestaurantsAddCertificationFields().then(result => {
    console.log('\n最终结果:', JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('\n执行失败:', err);
  });
}

// 导出主函数
exports.main = migrateRestaurantsAddCertificationFields;

