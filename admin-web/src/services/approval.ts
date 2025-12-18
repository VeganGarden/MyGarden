/**
 * 审核流程API服务
 */
import type {
  ApprovalConfig,
  ApprovalRequest,
  ApprovalRequestQueryParams,
  CreateApprovalRequestParams
} from '@/types/approval'
import { callCloudFunction } from './cloudbase'

/**
 * 创建审核申请
 */
export async function createApprovalRequest(params: CreateApprovalRequestParams) {
  const result = await callCloudFunction('approval-manage', {
    action: 'createRequest',
    ...params,
  })
  
  if (result.code === 0) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.message || result.error }
  }
}

/**
 * 获取审核申请详情
 */
export async function getApprovalRequest(requestId: string) {
  const result = await callCloudFunction('approval-manage', {
    action: 'getRequest',
    requestId,
  })
  
  if (result.code === 0) {
    return { success: true, data: result.data as ApprovalRequest }
  } else {
    return { success: false, error: result.message || result.error }
  }
}

/**
 * 查询审核申请列表
 */
export async function listApprovalRequests(params: ApprovalRequestQueryParams) {
  const result = await callCloudFunction('approval-manage', {
    action: 'listRequests',
    ...params,
  })
  
  if (result.code === 0) {
    return {
      success: true,
      data: result.data as ApprovalRequest[],
      pagination: result.pagination,
    }
  } else {
    return { success: false, error: result.message || result.error, data: [], pagination: null }
  }
}

/**
 * 获取我的待审核列表
 */
export async function getMyPendingApprovals() {
  const result = await callCloudFunction('approval-manage', {
    action: 'getMyPendingApprovals',
  })
  
  if (result.code === 0) {
    return { success: true, data: result.data as ApprovalRequest[] }
  } else {
    return { success: false, error: result.message || result.error, data: [] }
  }
}

/**
 * 审核通过
 */
export async function approveRequest(requestId: string, comment?: string) {
  const result = await callCloudFunction('approval-manage', {
    action: 'approve',
    requestId,
    comment,
  })
  
  if (result.code === 0) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.message || result.error }
  }
}

/**
 * 审核拒绝
 */
export async function rejectRequest(requestId: string, comment?: string) {
  const result = await callCloudFunction('approval-manage', {
    action: 'reject',
    requestId,
    comment,
  })
  
  if (result.code === 0) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.message || result.error }
  }
}

/**
 * 退回申请
 */
export async function returnRequest(requestId: string, comment?: string) {
  const result = await callCloudFunction('approval-manage', {
    action: 'return',
    requestId,
    comment,
  })
  
  if (result.code === 0) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.message || result.error }
  }
}

/**
 * 取消申请
 */
export async function cancelRequest(requestId: string) {
  const result = await callCloudFunction('approval-manage', {
    action: 'cancel',
    requestId,
  })
  
  if (result.code === 0) {
    return { success: true }
  } else {
    return { success: false, error: result.message || result.error }
  }
}

/**
 * 获取审核配置
 */
export async function getApprovalConfig(configId: string) {
  const result = await callCloudFunction('approval-manage', {
    action: 'getConfig',
    configId,
  })
  
  if (result.code === 0) {
    return { success: true, data: result.data as ApprovalConfig }
  } else {
    return { success: false, error: result.message || result.error }
  }
}

// 导出API对象
export const approvalAPI = {
  createRequest: createApprovalRequest,
  getRequest: getApprovalRequest,
  listRequests: listApprovalRequests,
  getMyPendingApprovals,
  approve: approveRequest,
  reject: rejectRequest,
  return: returnRequest,
  cancel: cancelRequest,
  getConfig: getApprovalConfig,
}

