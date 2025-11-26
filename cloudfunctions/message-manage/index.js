const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 消息管理云函数
 * 功能：消息的CRUD操作
 * 
 * 支持的 actions:
 * - createMessage: 创建消息
 * - getUserMessages: 获取用户消息列表
 * - markAsRead: 标记已读
 * - sendMessage: 发送消息
 * - getMessage: 获取消息详情
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'createMessage':
        return await createMessage(data, wxContext);
      
      case 'getUserMessages':
        return await getUserMessages(data, wxContext);
      
      case 'markAsRead':
        return await markAsRead(data, wxContext);
      
      case 'sendMessage':
        return await sendMessage(data, wxContext);
      
      case 'getMessage':
        return await getMessage(data, wxContext);
      
      case 'markAllAsRead':
        return await markAllAsRead(data, wxContext);
      
      default:
        return {
          code: 400,
          message: '未知的操作类型',
          action
        };
    }
  } catch (error) {
    console.error('消息管理操作失败:', error);
    return {
      code: 500,
      message: '操作失败，请重试',
      error: error.message
    };
  }
};

/**
 * 创建消息
 */
async function createMessage(data, wxContext) {
  const {
    title,
    content,
    type = 'system',
    priority = 'normal',
    sendType = 'immediate',
    scheduledTime,
    eventType,
    targetType = 'all',
    targetUsers = [],
    targetRoles = [],
    link,
    relatedEntityId,
    relatedEntityType
  } = data;

  // 验证必填字段
  if (!title || !content) {
    return {
      code: 400,
      message: '标题和内容不能为空'
    };
  }

  const messageData = {
    title,
    content,
    type,
    priority,
    status: sendType === 'immediate' ? 'pending' : 'draft',
    sendType,
    direction: 'platform_to_user', // 默认平台→用户，业务事件触发时为 system_to_operator
    targetType,
    targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
    targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
    creatorId: wxContext.OPENID || 'system',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 可选字段
  if (scheduledTime) messageData.scheduledTime = new Date(scheduledTime);
  if (eventType) messageData.eventType = eventType;
  if (link) messageData.link = link;
  if (relatedEntityId) messageData.relatedEntityId = relatedEntityId;
  if (relatedEntityType) messageData.relatedEntityType = relatedEntityType;

  try {
    const result = await db.collection('messages').add({ data: messageData });

    // 如果是立即发送，触发发送流程
    if (sendType === 'immediate') {
      // 异步调用message-push云函数发送消息
      cloud.callFunction({
        name: 'message-push',
        data: {
          action: 'pushMessage',
          data: {
            messageId: result._id,
            targetType,
            targetUsers,
            targetRoles
          }
        }
      }).catch(err => {
        console.error('触发消息推送失败:', err);
      });
    }

    return {
      code: 0,
      message: '消息创建成功',
      data: {
        messageId: result._id
      }
    };
  } catch (error) {
    console.error('创建消息失败:', error);
    return {
      code: 500,
      message: '创建消息失败',
      error: error.message
    };
  }
}

/**
 * 获取用户消息列表
 */
async function getUserMessages(data, wxContext) {
  const { userId, status, page = 1, pageSize = 20 } = data;
  const targetUserId = userId || wxContext.OPENID;

  if (!targetUserId) {
    return {
      code: 400,
      message: '用户ID不能为空'
    };
  }

  try {
    // 构建查询条件（MongoDB 不支持链式 where，需要合并条件）
    const queryCondition = {
      userId: targetUserId
    };

    if (status) {
      queryCondition.status = status;
    }

    // 分页查询
    const skip = (page - 1) * pageSize;
    const result = await db.collection('user_messages')
      .where(queryCondition)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 获取消息详情
    const messageIds = result.data.map(item => item.messageId);
    const messagesResult = await db.collection('messages')
      .where({
        _id: _.in(messageIds)
      })
      .get();

    // 合并数据
    const messages = result.data.map(userMsg => {
      const message = messagesResult.data.find(msg => msg._id === userMsg.messageId);
      return {
        ...userMsg,
        message: message || null
      };
    });

    // 获取总数
    const countResult = await db.collection('user_messages')
      .where({
        userId: targetUserId,
        ...(status ? { status } : {})
      })
      .count();

    return {
      code: 0,
      message: '获取成功',
      data: {
        messages,
        total: countResult.total,
        page,
        pageSize
      }
    };
  } catch (error) {
    console.error('获取用户消息失败:', error);
    return {
      code: 500,
      message: '获取消息失败',
      error: error.message
    };
  }
}

/**
 * 标记消息为已读
 */
async function markAsRead(data, wxContext) {
  const { userMessageId, messageId, userId } = data;
  const targetUserId = userId || wxContext.OPENID;

  if (!targetUserId) {
    return {
      code: 400,
      message: '用户ID不能为空'
    };
  }

  try {
    // 构建查询条件（MongoDB 不支持链式 where，需要合并条件）
    const queryCondition = {
      userId: targetUserId
    };

    if (userMessageId) {
      queryCondition._id = userMessageId;
    } else if (messageId) {
      queryCondition.messageId = messageId;
    } else {
      return {
        code: 400,
        message: 'userMessageId或messageId不能为空'
      };
    }

    const result = await db.collection('user_messages')
      .where(queryCondition)
      .update({
        data: {
          status: 'read',
          readAt: new Date()
        }
      });

    return {
      code: 0,
      message: '标记已读成功',
      data: {
        updated: result.stats.updated
      }
    };
  } catch (error) {
    console.error('标记已读失败:', error);
    return {
      code: 500,
      message: '标记已读失败',
      error: error.message
    };
  }
}

/**
 * 发送消息
 */
async function sendMessage(data, wxContext) {
  const { messageId } = data;

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

    const message = messageResult.data;

    // 更新消息状态
    await db.collection('messages').doc(messageId).update({
      data: {
        status: 'sent',
        sentAt: new Date()
      }
    });

    // 调用message-push云函数发送消息
    const pushResult = await cloud.callFunction({
      name: 'message-push',
      data: {
        action: 'pushMessage',
        data: {
          messageId,
          targetType: message.targetType,
          targetUsers: message.targetUsers,
          targetRoles: message.targetRoles
        }
      }
    });

    return {
      code: 0,
      message: '消息发送成功',
      data: pushResult.result
    };
  } catch (error) {
    console.error('发送消息失败:', error);
    return {
      code: 500,
      message: '发送消息失败',
      error: error.message
    };
  }
}

/**
 * 批量标记全部为已读
 */
async function markAllAsRead(data, wxContext) {
  const { userId } = data;
  const targetUserId = userId || wxContext.OPENID;

  if (!targetUserId) {
    return {
      code: 400,
      message: '用户ID不能为空'
    };
  }

  try {
    const result = await db.collection('user_messages')
      .where({
        userId: targetUserId,
        status: 'sent'
      })
      .update({
        data: {
          status: 'read',
          readAt: new Date()
        }
      });

    return {
      code: 0,
      message: '全部标记为已读成功',
      data: {
        updated: result.stats.updated
      }
    };
  } catch (error) {
    console.error('批量标记已读失败:', error);
    return {
      code: 500,
      message: '批量标记已读失败',
      error: error.message
    };
  }
}

/**
 * 获取消息详情
 */
async function getMessage(data, wxContext) {
  const { messageId } = data;

  if (!messageId) {
    return {
      code: 400,
      message: '消息ID不能为空'
    };
  }

  try {
    const result = await db.collection('messages').doc(messageId).get();

    if (!result.data) {
      return {
        code: 404,
        message: '消息不存在'
      };
    }

    return {
      code: 0,
      message: '获取成功',
      data: result.data
    };
  } catch (error) {
    console.error('获取消息详情失败:', error);
    return {
      code: 500,
      message: '获取消息详情失败',
      error: error.message
    };
  }
}

