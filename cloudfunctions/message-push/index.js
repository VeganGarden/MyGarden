const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 消息推送云函数
 * 功能：批量推送消息
 * 
 * 支持的 actions:
 * - pushMessage: 推送消息给目标用户
 * - pushToUsers: 推送给指定用户列表
 * - pushToRoles: 按角色推送
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      case 'pushMessage':
        return await pushMessage(data);
      
      case 'pushToUsers':
        return await pushToUsers(data);
      
      case 'pushToRoles':
        return await pushToRoles(data);
      
      default:
        return {
          code: 400,
          message: '未知的操作类型',
          action
        };
    }
  } catch (error) {
    console.error('消息推送失败:', error);
    return {
      code: 500,
      message: '推送失败，请重试',
      error: error.message
    };
  }
};

/**
 * 推送消息（通用接口）
 */
async function pushMessage(data) {
  const { messageId, targetType, targetUsers = [], targetRoles = [] } = data;

  if (!messageId) {
    return {
      code: 400,
      message: '消息ID不能为空'
    };
  }

  try {
    // 获取消息详情
    const messageResult = await db.collection('messages').doc(messageId).get();
    if (!messageResult.data) {
      return {
        code: 404,
        message: '消息不存在'
      };
    }

    let userIds = [];

    // 根据目标类型获取用户列表
    if (targetType === 'all') {
      // 获取所有用户（限制最多1000个，避免性能问题）
      const usersResult = await db.collection('admin_users')
        .limit(1000)
        .get();
      userIds = usersResult.data.map(user => user._id);
    } else if (targetType === 'specific' && targetUsers.length > 0) {
      userIds = targetUsers;
    } else if (targetType === 'role' && targetRoles.length > 0) {
      // 根据角色获取用户列表
      const usersResult = await db.collection('admin_users')
        .where({
          role: _.in(targetRoles)
        })
        .get();
      userIds = usersResult.data.map(user => user._id);
    }

    if (userIds.length === 0) {
      return {
        code: 400,
        message: '没有找到目标用户'
      };
    }

    // 批量创建user_messages记录
    const userMessages = userIds.map(userId => ({
      messageId,
      userId,
      status: 'sent',
      createdAt: new Date()
    }));

    // 分批插入（每批100条）
    const batchSize = 100;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < userMessages.length; i += batchSize) {
      const batch = userMessages.slice(i, i + batchSize);
      try {
        // 使用批量插入
        for (const userMsg of batch) {
          try {
            await db.collection('user_messages').add({ data: userMsg });
            successCount++;
          } catch (err) {
            // 忽略重复插入错误
            if (err.errCode !== -1) {
              console.error('插入user_message失败:', err);
              failCount++;
            } else {
              successCount++;
            }
          }
        }
      } catch (error) {
        console.error('批量插入失败:', error);
        failCount += batch.length;
      }
    }

    // 更新消息状态
    await db.collection('messages').doc(messageId).update({
      data: {
        status: 'sent',
        sentAt: new Date()
      }
    });

    return {
      code: 0,
      message: '消息推送成功',
      data: {
        total: userIds.length,
        success: successCount,
        fail: failCount
      }
    };
  } catch (error) {
    console.error('推送消息失败:', error);
    return {
      code: 500,
      message: '推送消息失败',
      error: error.message
    };
  }
}

/**
 * 推送给指定用户列表
 */
async function pushToUsers(data) {
  const { messageId, userIds } = data;

  if (!messageId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return {
      code: 400,
      message: '消息ID和用户ID列表不能为空'
    };
  }

  return await pushMessage({
    messageId,
    targetType: 'specific',
    targetUsers: userIds
  });
}

/**
 * 按角色推送
 */
async function pushToRoles(data) {
  const { messageId, roles } = data;

  if (!messageId || !roles || !Array.isArray(roles) || roles.length === 0) {
    return {
      code: 400,
      message: '消息ID和角色列表不能为空'
    };
  }

  return await pushMessage({
    messageId,
    targetType: 'role',
    targetRoles: roles
  });
}

