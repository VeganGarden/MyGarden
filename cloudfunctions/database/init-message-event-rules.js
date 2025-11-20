const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化消息事件规则
 * 创建默认的事件规则配置
 */
exports.main = async (event) => {
  const results = [];
  
  console.log('========================================');
  console.log('开始初始化消息事件规则...');
  console.log('========================================\n');

  try {
    // 1. 租户认证申请事件规则
    console.log('[1/3] 创建租户认证申请事件规则...');
    const result1 = await createEventRule({
      eventType: 'tenant_cert_apply',
      eventName: '租户认证申请',
      targetRoles: ['platform_operator', 'system_admin'],
      enabled: true,
      priority: 'important'
    });
    results.push(result1);

    // 2. 餐厅认证申请事件规则
    console.log('[2/3] 创建餐厅认证申请事件规则...');
    const result2 = await createEventRule({
      eventType: 'restaurant_cert_apply',
      eventName: '餐厅认证申请',
      targetRoles: ['platform_operator', 'system_admin'],
      enabled: true,
      priority: 'important'
    });
    results.push(result2);

    // 3. 待审核任务阈值事件规则
    console.log('[3/3] 创建待审核任务阈值事件规则...');
    const result3 = await createEventRule({
      eventType: 'audit_task_threshold',
      eventName: '待审核任务提醒',
      targetRoles: ['platform_operator', 'system_admin'],
      enabled: true,
      priority: 'normal'
    });
    results.push(result3);

    const successCount = results.filter(r => r.success).length;

    console.log('========================================\n');
    console.log('✅ 消息事件规则初始化完成！');
    console.log(`成功: ${successCount}/3`);
    console.log('========================================\n');

    return {
      code: 0,
      message: '消息事件规则初始化成功',
      summary: {
        totalRules: 3,
        successfulRules: successCount,
        failedRules: 3 - successCount,
        rules: results
      }
    };

  } catch (error) {
    console.error('❌ 消息事件规则初始化失败:', error);
    return {
      code: 500,
      message: '消息事件规则初始化失败',
      error: error.message,
      results
    };
  }
};

/**
 * 创建事件规则
 */
async function createEventRule(ruleData) {
  try {
    const { eventType, eventName, targetRoles, enabled, priority } = ruleData;

    // 检查规则是否已存在
    const existingRule = await db.collection('message_event_rules')
      .where({
        eventType: eventType
      })
      .get();

    if (existingRule.data.length > 0) {
      // 更新现有规则
      await db.collection('message_event_rules')
        .doc(existingRule.data[0]._id)
        .update({
          data: {
            eventName,
            targetRoles,
            enabled,
            priority,
            updatedAt: new Date()
          }
        });

      return {
        eventType,
        success: true,
        message: '规则已更新',
        action: 'updated'
      };
    } else {
      // 创建新规则
      const result = await db.collection('message_event_rules').add({
        data: {
          eventType,
          eventName,
          targetRoles,
          enabled,
          priority,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return {
        eventType,
        success: true,
        message: '规则创建成功',
        action: 'created',
        ruleId: result._id
      };
    }
  } catch (error) {
    console.error(`创建事件规则 ${ruleData.eventType} 失败:`, error);
    return {
      eventType: ruleData.eventType,
      success: false,
      message: error.message,
      error: error.toString()
    };
  }
}

