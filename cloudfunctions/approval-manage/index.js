/**
 * 审核流程管理云函数
 * 
 * 功能：
 * 1. 创建审核申请
 * 2. 查询审核申请
 * 3. 审核操作（通过/拒绝/退回）
 * 4. 获取待审核列表
 * 5. 审核配置管理
 * 
 * 调用示例：
 * wx.cloud.callFunction({
 *   name: 'approval-manage',
 *   data: {
 *     action: 'createRequest',
 *     request: { ... }
 *   }
 * })
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const { checkPermission } = require('./permission');
const { addAudit } = require('./audit');

/**
 * 生成审核申请ID
 */
function generateRequestId(businessType, operationType) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${businessType}_${operationType}_${timestamp}_${random}`;
}

/**
 * 获取审核配置
 */
async function getApprovalConfig(businessType, operationType) {
  try {
    const result = await db.collection('approval_configs')
      .where({
        businessType,
        operationType,
        status: 'active'
      })
      .get();
    
    if (result.data.length === 0) {
      return null;
    }
    
    return result.data[0];
  } catch (error) {
    console.error('获取审核配置失败:', error);
    return null;
  }
}

/**
 * 创建审核申请
 */
async function createRequest(data, user) {
  const {
    businessType,
    businessId,
    operationType,
    title,
    description,
    currentData,
    newData
  } = data;

  // 验证必填字段
  if (!businessType || !operationType || !title) {
    return {
      code: 400,
      success: false,
      error: '业务类型、操作类型和标题不能为空'
    };
  }

  // 获取审核配置
  const config = await getApprovalConfig(businessType, operationType);
  if (!config) {
    return {
      code: 404,
      success: false,
      error: '未找到对应的审核配置'
    };
  }

  // 如果是自动审核，直接执行操作
  if (config.autoApprove) {
    // 这里应该调用业务模块执行操作
    // 暂时返回成功，实际应该调用对应的业务函数
    return {
      code: 0,
      success: true,
      data: {
        requestId: generateRequestId(businessType, operationType),
        status: 'approved',
        autoApproved: true
      },
      message: '自动审核通过'
    };
  }

  const requestId = generateRequestId(businessType, operationType);
  const now = new Date();

  const requestData = {
    requestId,
    businessType,
    businessId: businessId || null,
    operationType,
    configId: config.configId,
    title,
    description: description || '',
    requestData: {
      currentData: currentData || null,
      newData: newData || null
    },
    currentData: currentData || null,
    newData: newData || null,
    status: 'pending',
    currentNodeIndex: 0,
    submitterId: user._id || user.userId,
    submitterName: user.username || user.name || '未知用户',
    submittedAt: now,
    createdAt: now,
    updatedAt: now
  };

  try {
    // 创建审核申请
    const result = await db.collection('approval_requests').add({
      data: requestData
    });

    // 通知第一个审核节点的审核人
    if (config.nodes && config.nodes.length > 0 && config.nodes[0].notifyOnCreate) {
      await notifyApprovers(requestId, config.nodes[0], title);
    }

    // 记录审计日志
    await addAudit(db, {
      userId: user._id || user.userId,
      username: user.username || user.name,
      role: user.role,
      module: 'approval',
      action: 'createRequest',
      resource: 'approval_request',
      resourceId: requestId,
      description: `创建审核申请：${title}`,
      status: 'success'
    });

    return {
      code: 0,
      success: true,
      data: {
        _id: result._id,
        requestId
      },
      message: '审核申请创建成功'
    };
  } catch (error) {
    console.error('创建审核申请失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '创建审核申请失败'
    };
  }
}

/**
 * 通知审核人
 */
async function notifyApprovers(requestId, node, title) {
  try {
    // 根据节点类型获取审核人列表
    let approverIds = [];
    
    if (node.approverType === 'role') {
      // 根据角色查询用户
      const usersResult = await db.collection('admin_users')
        .where({
          role: node.approverValue,
          status: 'active'
        })
        .get();
      
      approverIds = usersResult.data.map(u => u._id);
    } else if (node.approverType === 'user') {
      approverIds = [node.approverValue];
    }

    // 发送消息通知
    if (approverIds.length > 0) {
      await cloud.callFunction({
        name: 'message-manage',
        data: {
          action: 'createMessage',
          data: {
            title: '新的审核申请',
            content: `您有新的审核申请需要处理：${title}`,
            type: 'approval',
            priority: 'high',
            targetType: 'users',
            targetUsers: approverIds,
            eventType: 'approval_request_created',
            relatedEntityId: requestId,
            relatedEntityType: 'approval_request',
            link: `/system/approval-request/${requestId}`
          }
        }
      });
    }
  } catch (error) {
    console.error('通知审核人失败:', error);
    // 通知失败不影响审核流程
  }
}

/**
 * 获取审核申请详情
 */
async function getRequest(requestId) {
  try {
    const result = await db.collection('approval_requests')
      .where({
        requestId
      })
      .get();
    
    if (result.data.length === 0) {
      return {
        code: 404,
        success: false,
        error: '审核申请不存在'
      };
    }

    const request = result.data[0];

    // 获取审核记录
    const recordsResult = await db.collection('approval_records')
      .where({
        requestId
      })
      .orderBy('reviewedAt', 'desc')
      .get();

    return {
      code: 0,
      success: true,
      data: {
        ...request,
        records: recordsResult.data
      },
      message: '查询成功'
    };
  } catch (error) {
    console.error('查询审核申请失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '查询失败'
    };
  }
}

/**
 * 查询审核申请列表
 */
async function listRequests(params, user) {
  const {
    businessType,
    operationType,
    status,
    submitterId,
    page = 1,
    pageSize = 20
  } = params;

  const query = {};

  if (businessType) query.businessType = businessType;
  if (operationType) query.operationType = operationType;
  if (status) query.status = status;
  if (submitterId) query.submitterId = submitterId;

  // 如果不是系统管理员，只能查看自己提交的或待自己审核的
  if (user.role !== 'system_admin' && user.role !== 'platform_operator') {
    // 这里应该查询待审核列表，暂时简化处理
    // 实际应该根据审核节点查询
  }

  try {
    const result = await db.collection('approval_requests')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const countResult = await db.collection('approval_requests')
      .where(query)
      .count();

    return {
      code: 0,
      success: true,
      data: result.data,
      pagination: {
        page,
        pageSize,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / pageSize)
      },
      message: '查询成功'
    };
  } catch (error) {
    console.error('查询审核申请列表失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '查询失败',
      data: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0
      }
    };
  }
}

/**
 * 获取我的待审核列表
 */
async function getMyPendingApprovals(user) {
  try {
    // 获取用户角色
    const userResult = await db.collection('admin_users')
      .doc(user._id || user.userId)
      .get();

    if (!userResult.data) {
      return {
        code: 404,
        success: false,
        error: '用户不存在'
      };
    }

    const userRole = userResult.data.role;
    const userId = userResult.data._id;

    // 查找状态为pending或approving的申请
    const requestsResult = await db.collection('approval_requests')
      .where(
        _.or([
          { status: 'pending' },
          { status: 'approving' }
        ])
      )
      .orderBy('createdAt', 'desc')
      .get();

    // 过滤出当前用户可以审核的申请
    const pendingRequests = [];
    
    for (const request of requestsResult.data) {
      // 获取审核配置
      const config = await getApprovalConfig(request.businessType, request.operationType);
      if (!config || !config.nodes) continue;

      const currentNode = config.nodes[request.currentNodeIndex];
      if (!currentNode) continue;

      // 检查当前用户是否可以审核
      let canApprove = false;
      if (currentNode.approverType === 'role' && currentNode.approverValue === userRole) {
        canApprove = true;
      } else if (currentNode.approverType === 'user' && currentNode.approverValue === userId) {
        canApprove = true;
      }

      // 检查是否已经有该节点的审核记录
      if (canApprove) {
        const recordResult = await db.collection('approval_records')
          .where({
            requestId: request.requestId,
            nodeId: currentNode.nodeId,
            approverId: userId
          })
          .get();
        
        if (recordResult.data.length === 0) {
          pendingRequests.push(request);
        }
      }
    }

    return {
      code: 0,
      success: true,
      data: pendingRequests,
      message: '查询成功'
    };
  } catch (error) {
    console.error('获取待审核列表失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '查询失败',
      data: []
    };
  }
}

/**
 * 执行审核操作（通过/拒绝/退回）
 */
async function processApproval(requestId, action, comment, user) {
  const validActions = ['approve', 'reject', 'return'];
  if (!validActions.includes(action)) {
    return {
      code: 400,
      success: false,
      error: '无效的审核操作'
    };
  }

  try {
    // 获取审核申请
    const requestResult = await db.collection('approval_requests')
      .where({
        requestId
      })
      .get();

    if (requestResult.data.length === 0) {
      return {
        code: 404,
        success: false,
        error: '审核申请不存在'
      };
    }

    const request = requestResult.data[0];

    // 检查申请状态
    if (request.status !== 'pending' && request.status !== 'approving') {
      return {
        code: 400,
        success: false,
        error: '审核申请状态不允许此操作'
      };
    }

    // 获取审核配置
    const config = await getApprovalConfig(request.businessType, request.operationType);
    if (!config || !config.nodes) {
      return {
        code: 404,
        success: false,
        error: '审核配置不存在'
      };
    }

    const currentNode = config.nodes[request.currentNodeIndex];
    if (!currentNode) {
      return {
        code: 400,
        success: false,
        error: '当前审核节点不存在'
      };
    }

    // 检查用户是否有权限审核
    const userResult = await db.collection('admin_users')
      .doc(user._id || user.userId)
      .get();

    if (!userResult.data) {
      return {
        code: 404,
        success: false,
        error: '用户不存在'
      };
    }

    const userRole = userResult.data.role;
    const userId = userResult.data._id;

    let canApprove = false;
    if (currentNode.approverType === 'role' && currentNode.approverValue === userRole) {
      canApprove = true;
    } else if (currentNode.approverType === 'user' && currentNode.approverValue === userId) {
      canApprove = true;
    }

    if (!canApprove) {
      return {
        code: 403,
        success: false,
        error: '您没有权限审核此申请'
      };
    }

    const now = new Date();

    // 创建审核记录
    const recordData = {
      requestId,
      nodeId: currentNode.nodeId,
      nodeName: currentNode.nodeName,
      approverId: userId,
      approverName: userResult.data.username || userResult.data.name,
      approverRole: userRole,
      action,
      comment: comment || '',
      dataSnapshot: {
        currentData: request.currentData,
        newData: request.newData
      },
      reviewedAt: now,
      createdAt: now
    };

    await db.collection('approval_records').add({
      data: recordData
    });

    // 更新审核申请状态
    let newStatus = request.status;
    let currentNodeIndex = request.currentNodeIndex;

    if (action === 'reject') {
      // 拒绝：直接结束
      newStatus = 'rejected';
    } else if (action === 'return') {
      // 退回：回到提交状态
      newStatus = 'pending';
      currentNodeIndex = 0;
    } else if (action === 'approve') {
      // 通过：检查是否还有下一个节点
      if (request.currentNodeIndex < config.nodes.length - 1) {
        // 进入下一个节点
        currentNodeIndex = request.currentNodeIndex + 1;
        newStatus = 'approving';
        
        // 通知下一个节点的审核人
        const nextNode = config.nodes[currentNodeIndex];
        if (nextNode && nextNode.notifyOnCreate) {
          await notifyApprovers(requestId, nextNode, request.title);
        }
      } else {
        // 所有节点都通过，执行操作
        newStatus = 'approved';
        await executeApprovedOperation(request);
      }
    }

    await db.collection('approval_requests')
      .doc(request._id)
      .update({
        data: {
          status: newStatus,
          currentNodeIndex,
          updatedAt: now,
          completedAt: action === 'reject' || action === 'approved' ? now : null,
          completedBy: action === 'reject' || action === 'approved' ? userId : null
        }
      });

    // 发送通知
    await sendApprovalNotification(requestId, action, request, userResult.data);

    // 记录审计日志
    await addAudit(db, {
      userId,
      username: userResult.data.username || userResult.data.name,
      role: userRole,
      module: 'approval',
      action: `approval_${action}`,
      resource: 'approval_request',
      resourceId: requestId,
      description: `审核${action === 'approve' ? '通过' : action === 'reject' ? '拒绝' : '退回'}申请：${request.title}`,
      status: 'success'
    });

    return {
      code: 0,
      success: true,
      data: {
        requestId,
        status: newStatus
      },
      message: `审核${action === 'approve' ? '通过' : action === 'reject' ? '拒绝' : '退回'}成功`
    };
  } catch (error) {
    console.error('处理审核失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '处理审核失败'
    };
  }
}

/**
 * 执行已审核通过的操作
 */
async function executeApprovedOperation(request) {
  try {
    const { businessType, businessId, operationType, newData, currentData } = request;

    if (businessType === 'carbon_factor') {
      // 调用因子库管理云函数
      if (operationType === 'create') {
        const result = await cloud.callFunction({
          name: 'carbon-factor-manage',
          data: {
            action: 'executeApprovedCreate',
            factor: newData
          }
        });
        if (result.result && result.result.code !== 0) {
          throw new Error(result.result.error || '执行创建操作失败');
        }
      } else if (operationType === 'update' && businessId) {
        const result = await cloud.callFunction({
          name: 'carbon-factor-manage',
          data: {
            action: 'executeApprovedUpdate',
            factorId: businessId,
            factor: newData
          }
        });
        if (result.result && result.result.code !== 0) {
          throw new Error(result.result.error || '执行更新操作失败');
        }
      } else if (operationType === 'archive' && businessId) {
        const result = await cloud.callFunction({
          name: 'carbon-factor-manage',
          data: {
            action: 'executeApprovedArchive',
            factorId: businessId
          }
        });
        if (result.result && result.result.code !== 0) {
          throw new Error(result.result.error || '执行归档操作失败');
        }
      }
    } else if (businessType === 'carbon_baseline') {
      // 调用基准值管理云函数
      if (operationType === 'create') {
        const result = await cloud.callFunction({
          name: 'carbon-baseline-manage',
          data: {
            action: 'executeApprovedCreate',
            baseline: newData
          }
        });
        if (result.result && !result.result.success) {
          throw new Error(result.result.error || '执行创建操作失败');
        }
      } else if (operationType === 'update' && businessId) {
        const result = await cloud.callFunction({
          name: 'carbon-baseline-manage',
          data: {
            action: 'executeApprovedUpdate',
            baselineId: businessId,
            updates: newData
          }
        });
        if (result.result && !result.result.success) {
          throw new Error(result.result.error || '执行更新操作失败');
        }
      } else if (operationType === 'archive' && businessId) {
        const result = await cloud.callFunction({
          name: 'carbon-baseline-manage',
          data: {
            action: 'executeApprovedArchive',
            baselineId: businessId
          }
        });
        if (result.result && !result.result.success) {
          throw new Error(result.result.error || '执行归档操作失败');
        }
      }
    }
  } catch (error) {
    console.error('执行审核通过的操作失败:', error);
    throw error;
  }
}

/**
 * 发送审核通知
 */
async function sendApprovalNotification(requestId, action, request, approver) {
  try {
    const actionText = {
      approve: '通过',
      reject: '拒绝',
      return: '退回'
    }[action] || '处理';

    const eventTypeMap = {
      approve: 'approval_request_approved',
      reject: 'approval_request_rejected',
      return: 'approval_request_returned'
    };

    await cloud.callFunction({
      name: 'message-manage',
      data: {
        action: 'createMessage',
        data: {
          title: `审核申请已${actionText}`,
          content: `您的审核申请"${request.title}"已被${approver.username || approver.name}${actionText}`,
          type: 'approval',
          priority: 'normal',
          targetType: 'user',
          targetUsers: [request.submitterId],
          eventType: eventTypeMap[action],
          relatedEntityId: requestId,
          relatedEntityType: 'approval_request',
          link: `/system/approval-request/${requestId}`
        }
      }
    });
  } catch (error) {
    console.error('发送审核通知失败:', error);
    // 通知失败不影响审核流程
  }
}

/**
 * 取消审核申请
 */
async function cancelRequest(requestId, user) {
  try {
    const requestResult = await db.collection('approval_requests')
      .where({
        requestId
      })
      .get();

    if (requestResult.data.length === 0) {
      return {
        code: 404,
        success: false,
        error: '审核申请不存在'
      };
    }

    const request = requestResult.data[0];

    // 只能取消自己提交的申请
    if (request.submitterId !== (user._id || user.userId)) {
      return {
        code: 403,
        success: false,
        error: '只能取消自己提交的申请'
      };
    }

    // 只能取消待审核或审核中的申请
    if (request.status !== 'pending' && request.status !== 'approving') {
      return {
        code: 400,
        success: false,
        error: '当前状态不允许取消'
      };
    }

    await db.collection('approval_requests')
      .doc(request._id)
      .update({
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      });

    // 记录审计日志
    await addAudit(db, {
      userId: user._id || user.userId,
      username: user.username || user.name,
      role: user.role,
      module: 'approval',
      action: 'cancelRequest',
      resource: 'approval_request',
      resourceId: requestId,
      description: `取消审核申请：${request.title}`,
      status: 'success'
    });

    return {
      code: 0,
      success: true,
      message: '取消成功'
    };
  } catch (error) {
    console.error('取消审核申请失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '取消失败'
    };
  }
}

/**
 * 获取审核配置
 */
async function getConfig(configId) {
  try {
    const result = await db.collection('approval_configs')
      .where({
        configId
      })
      .get();

    if (result.data.length === 0) {
      return {
        code: 404,
        success: false,
        error: '审核配置不存在'
      };
    }

    return {
      code: 0,
      success: true,
      data: result.data[0],
      message: '查询成功'
    };
  } catch (error) {
    console.error('查询审核配置失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '查询失败'
    };
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action, ...params } = event;

  try {
    // 大部分操作需要权限验证
    let user = null;
    if (action !== 'getConfig') {
      try {
        // 确保token被正确传递到checkPermission
        // 前端通过 cloudbase.ts 将 token 放在 data.token 中，即 event.token
        // 为了兼容性，也检查 params.token 和 event.data.token
        if (!event.token && params.token) {
          event.token = params.token
        } else if (!event.token && event.data && event.data.token) {
          event.token = event.data.token
        }
        user = await checkPermission(event, context);
      } catch (err) {
        // 如果是401错误，直接返回，不要包装成对象
        if (err.code === 401) {
          return {
            code: 401,
            success: false,
            error: err.message || '未授权访问，请先登录'
          };
        }
        return {
          code: err.code || 403,
          success: false,
          error: err.message || '权限验证失败'
        };
      }
    }

    switch (action) {
      case 'createRequest':
        return await createRequest(params, user);
      
      case 'getRequest':
        return await getRequest(params.requestId);
      
      case 'listRequests':
        return await listRequests(params, user);
      
      case 'getMyPendingApprovals':
        return await getMyPendingApprovals(user);
      
      case 'approve':
        return await processApproval(params.requestId, 'approve', params.comment, user);
      
      case 'reject':
        return await processApproval(params.requestId, 'reject', params.comment, user);
      
      case 'return':
        return await processApproval(params.requestId, 'return', params.comment, user);
      
      case 'cancel':
        return await cancelRequest(params.requestId, user);
      
      case 'getConfig':
        return await getConfig(params.configId);
      
      default:
        return {
          code: 400,
          success: false,
          error: '未知的 action 参数',
          message: '支持的 action: createRequest, getRequest, listRequests, getMyPendingApprovals, approve, reject, return, cancel, getConfig'
        };
    }
  } catch (error) {
    console.error('审核管理失败:', error);
    return {
      code: 500,
      success: false,
      error: error.message || '操作失败',
      message: error.message || '操作失败'
    };
  }
};

