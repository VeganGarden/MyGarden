/**
 * 初始化餐厅运营台账测试样例数据
 * 
 * 功能:
 * 为 restaurant_operation_ledgers 集合创建测试样例数据
 * 包括: 能源使用、食物浪费、培训活动三类数据
 * 
 * 执行方式:
 * tcb fn invoke database --params '{"action":"initOperationSampleData","data":{"restaurantId":"xxx","tenantId":"xxx"}}'
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 生成随机日期（最近30天）
 */
function getRandomDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * 生成台账记录ID
 */
function generateLedgerId() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LED-${dateStr}-${random}`;
}

/**
 * 主函数
 */
async function initOperationSampleData(data) {
  console.log('===== 开始初始化餐厅运营台账测试样例数据 =====');
  
  const { restaurantId, tenantId } = data || {};
  
  if (!restaurantId || !tenantId) {
    return {
      code: 400,
      message: 'restaurantId 和 tenantId 不能为空'
    };
  }

  try {
    const sampleData = [];
    const now = new Date();

    // 1. 能源使用数据（最近30天，每天1-3条记录）
    const energyTypes = ['electricity', 'gas', 'water'];
    const energyDescriptions = {
      electricity: ['日常用电', '厨房设备用电', '照明用电', '空调用电'],
      gas: ['厨房燃气', '热水器用气'],
      water: ['日常用水', '厨房用水', '清洁用水']
    };
    const energyUnits = {
      electricity: 'kWh',
      gas: 'm³',
      water: '吨'
    };

    for (let day = 0; day < 30; day++) {
      const recordCount = Math.floor(Math.random() * 3) + 1; // 每天1-3条记录
      for (let i = 0; i < recordCount; i++) {
        const energyType = energyTypes[Math.floor(Math.random() * energyTypes.length)];
        const descriptions = energyDescriptions[energyType];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        
        // 生成合理的数值范围
        let value;
        if (energyType === 'electricity') {
          value = Math.round((Math.random() * 200 + 50) * 100) / 100; // 50-250 kWh
        } else if (energyType === 'gas') {
          value = Math.round((Math.random() * 50 + 10) * 100) / 100; // 10-60 m³
        } else {
          value = Math.round((Math.random() * 10 + 2) * 100) / 100; // 2-12 吨
        }

        sampleData.push({
          ledgerId: generateLedgerId(),
          restaurantId: restaurantId,
          tenantId: tenantId,
          type: 'energy',
          date: getRandomDate(day),
          period: 'daily',
          description: description,
          value: value,
          unit: energyUnits[energyType],
          energyType: energyType,
          wasteType: null,
          trainingType: null,
          participants: null,
          status: 'active',
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        });
      }
    }

    // 2. 食物浪费数据（最近30天，每天0-2条记录）
    const wasteTypes = ['kitchen_waste', 'expired', 'processing_loss'];
    const wasteDescriptions = {
      kitchen_waste: ['厨余垃圾', '切配边角料', '烹饪剩余'],
      expired: ['过期食材', '变质食品'],
      processing_loss: ['加工损耗', '运输损耗', '储存损耗']
    };
    const wasteUnits = 'kg';

    for (let day = 0; day < 30; day++) {
      const recordCount = Math.floor(Math.random() * 3); // 每天0-2条记录
      for (let i = 0; i < recordCount; i++) {
        const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
        const descriptions = wasteDescriptions[wasteType];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        
        // 生成合理的数值范围（kg）
        const value = Math.round((Math.random() * 50 + 5) * 100) / 100; // 5-55 kg

        sampleData.push({
          ledgerId: generateLedgerId(),
          restaurantId: restaurantId,
          tenantId: tenantId,
          type: 'waste',
          date: getRandomDate(day),
          period: 'daily',
          description: description,
          value: value,
          unit: wasteUnits,
          energyType: null,
          wasteType: wasteType,
          trainingType: null,
          participants: null,
          status: 'active',
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        });
      }
    }

    // 3. 培训活动数据（最近30天，每周1-2次）
    const trainingTypes = ['staff', 'customer', 'public'];
    const trainingDescriptions = {
      staff: ['员工食品安全培训', '员工服务技能培训', '员工环保意识培训', '员工操作规范培训'],
      customer: ['顾客低碳饮食讲座', '顾客健康饮食分享', '顾客环保知识普及'],
      public: ['社区环保宣传活动', '学校营养教育', '公开低碳生活讲座']
    };

    // 每周1-2次培训，共约8-12次
    const trainingDates = [];
    for (let week = 0; week < 4; week++) {
      const weekStart = week * 7;
      const trainingCount = Math.floor(Math.random() * 2) + 1; // 每周1-2次
      for (let i = 0; i < trainingCount; i++) {
        const dayOffset = Math.floor(Math.random() * 7);
        trainingDates.push(weekStart + dayOffset);
      }
    }

    trainingDates.forEach(dayOffset => {
      const trainingType = trainingTypes[Math.floor(Math.random() * trainingTypes.length)];
      const descriptions = trainingDescriptions[trainingType];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      // 生成参与人数
      let participants;
      if (trainingType === 'staff') {
        participants = Math.floor(Math.random() * 20 + 5); // 5-25人
      } else if (trainingType === 'customer') {
        participants = Math.floor(Math.random() * 30 + 10); // 10-40人
      } else {
        participants = Math.floor(Math.random() * 50 + 20); // 20-70人
      }

      sampleData.push({
        ledgerId: generateLedgerId(),
        restaurantId: restaurantId,
        tenantId: tenantId,
        type: 'training',
        date: getRandomDate(dayOffset),
        period: 'daily',
        description: description,
        value: participants, // 培训活动用参与人数作为value
        unit: '人',
        energyType: null,
        wasteType: null,
        trainingType: trainingType,
        participants: participants,
        status: 'active',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      });
    });

    // 批量插入数据
    console.log(`\n准备插入 ${sampleData.length} 条测试数据...`);
    console.log(`  - 能源使用: ${sampleData.filter(d => d.type === 'energy').length} 条`);
    console.log(`  - 食物浪费: ${sampleData.filter(d => d.type === 'waste').length} 条`);
    console.log(`  - 培训活动: ${sampleData.filter(d => d.type === 'training').length} 条`);

    // 分批插入，每批50条
    const batchSize = 50;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sampleData.length; i += batchSize) {
      const batch = sampleData.slice(i, i + batchSize);
      try {
        // 使用批量插入
        const batchOps = batch.map(item => ({
          insertOne: {
            document: item
          }
        }));

        // 注意：腾讯云开发可能不支持批量操作，需要逐条插入
        for (const item of batch) {
          try {
            await db.collection('restaurant_operation_ledgers').add({
              data: item
            });
            insertedCount++;
          } catch (err) {
            console.error(`插入失败 (${item.ledgerId}):`, err.message);
            errorCount++;
          }
        }
      } catch (error) {
        console.error(`批次 ${Math.floor(i / batchSize) + 1} 插入失败:`, error.message);
        errorCount += batch.length;
      }
    }

    console.log('\n===== 测试样例数据初始化完成 =====');
    console.log(`\n✅ 成功插入 ${insertedCount} 条数据`);
    if (errorCount > 0) {
      console.log(`⚠️  失败 ${errorCount} 条数据`);
    }
    console.log(`\n📊 数据分布:`);
    console.log(`   - 能源使用: ${sampleData.filter(d => d.type === 'energy').length} 条`);
    console.log(`   - 食物浪费: ${sampleData.filter(d => d.type === 'waste').length} 条`);
    console.log(`   - 培训活动: ${sampleData.filter(d => d.type === 'training').length} 条`);
    console.log(`\n📅 时间范围: 最近30天`);
    console.log(`\n🏪 餐厅ID: ${restaurantId}`);
    console.log(`🏢 租户ID: ${tenantId}\n`);

    return {
      code: 0,
      message: `测试样例数据初始化成功 - 插入 ${insertedCount} 条数据`,
      data: {
        total: sampleData.length,
        inserted: insertedCount,
        errors: errorCount,
        breakdown: {
          energy: sampleData.filter(d => d.type === 'energy').length,
          waste: sampleData.filter(d => d.type === 'waste').length,
          training: sampleData.filter(d => d.type === 'training').length
        },
        restaurantId: restaurantId,
        tenantId: tenantId
      }
    };

  } catch (error) {
    console.error('初始化失败:', error);
    return {
      code: 500,
      message: '测试样例数据初始化失败',
      error: error.message
    };
  }
}

module.exports = {
  initOperationSampleData
};

