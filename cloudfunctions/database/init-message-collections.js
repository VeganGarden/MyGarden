const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 消息管理数据库集合初始化脚本
 * 创建3个核心集合：
 * 1. messages - 消息主表
 * 2. user_messages - 用户消息关联表
 * 3. message_event_rules - 事件规则表
 * 
 * 注意：腾讯云开发的MongoDB不支持通过代码创建索引
 * 索引需要在控制台手动创建
 */
exports.main = async (event) => {
  const results = [];
  
  console.log('========================================');
  console.log('开始初始化消息管理数据库集合...');
  console.log('========================================\n');

  try {
    // 1. 创建messages集合
    console.log('[1/3] 创建messages集合...');
    const result1 = await createCollection('messages');
    results.push(result1);

    // 2. 创建user_messages集合
    console.log('[2/3] 创建user_messages集合...');
    const result2 = await createCollection('user_messages');
    results.push(result2);

    // 3. 创建message_event_rules集合
    console.log('[3/3] 创建message_event_rules集合...');
    const result3 = await createCollection('message_event_rules');
    results.push(result3);

    const successCount = results.filter(r => r.success).length;

    console.log('========================================\n');
    console.log('✅ 消息管理集合创建完成！');
    console.log(`成功: ${successCount}/3`);
    console.log('========================================\n');
    console.log('⚠️  重要提示：');
    console.log('索引需要在云开发控制台手动创建');
    console.log('请参考文档：Docs/消息管理/平台消息管理策划方案-MVP精简版.md');
    console.log('========================================\n');

    return {
      code: 0,
      message: '消息管理数据库集合创建成功',
      summary: {
        totalCollections: 3,
        successfulCollections: successCount,
        failedCollections: 3 - successCount,
        collections: results
      },
      nextSteps: {
        action: '手动创建索引',
        guide: 'Docs/消息管理/平台消息管理策划方案-MVP精简版.md',
        indexes: [
          {
            collection: 'messages',
            indexes: [
              { name: 'type_status_createdAt_index', fields: ['type', 'status', 'createdAt'], direction: [-1] },
              { name: 'targetUsers_index', fields: ['targetUsers'], type: 'array' },
              { name: 'targetRoles_index', fields: ['targetRoles'], type: 'array' },
              { name: 'eventType_createdAt_index', fields: ['eventType', 'createdAt'], direction: [-1] }
            ]
          },
          {
            collection: 'user_messages',
            indexes: [
              { name: 'userId_status_createdAt_index', fields: ['userId', 'status', 'createdAt'], direction: [-1] },
              { name: 'messageId_userId_index', fields: ['messageId', 'userId'], unique: true }
            ]
          },
          {
            collection: 'message_event_rules',
            indexes: [
              { name: 'eventType_enabled_index', fields: ['eventType', 'enabled'] }
            ]
          }
        ]
      }
    };

  } catch (error) {
    console.error('❌ 消息管理数据库初始化失败:', error);
    return {
      code: 500,
      message: '消息管理数据库初始化失败',
      error: error.message,
      results
    };
  }
};

/**
 * 创建单个集合的通用函数
 */
async function createCollection(collectionName) {
  try {
    // 使用 db.createCollection() 创建集合
    await db.createCollection(collectionName);
    console.log(`  ✓ ${collectionName} 集合创建成功`);
    return {
      collection: collectionName,
      success: true,
      message: '集合创建成功',
      action: 'created'
    };
  } catch (error) {
    // 如果集合已存在，不算错误
    if (error.errCode === -501001 || 
        error.errCode === -1 ||
        (error.message && error.message.includes('exist')) ||
        (error.message && error.message.includes('Table exist'))) {
      console.log(`  ⚠ ${collectionName} 集合已存在，跳过创建`);
      return {
        collection: collectionName,
        success: true,
        message: '集合已存在',
        action: 'skipped'
      };
    }
    
    console.error(`  ❌ ${collectionName} 集合创建失败:`, error.message);
    return {
      collection: collectionName,
      success: false,
      message: error.message,
      error: error.toString()
    };
  }
}

