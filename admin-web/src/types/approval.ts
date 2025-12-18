/**
 * 审核流程相关类型定义
 */

// 业务类型
export enum BusinessType {
  CARBON_FACTOR = 'carbon_factor',      // 因子库
  CARBON_BASELINE = 'carbon_baseline',  // 基准值
}

// 操作类型
export enum OperationType {
  CREATE = 'create',     // 创建
  UPDATE = 'update',     // 更新
  DELETE = 'delete',     // 删除
  ARCHIVE = 'archive',   // 归档
}

// 审核状态
export enum ApprovalStatus {
  PENDING = 'pending',      // 待审核
  APPROVING = 'approving',  // 审核中
  APPROVED = 'approved',    // 已通过
  REJECTED = 'rejected',    // 已拒绝
  CANCELLED = 'cancelled',  // 已取消
  EXPIRED = 'expired',      // 已过期
}

// 审核操作
export enum ApprovalAction {
  APPROVE = 'approve',  // 通过
  REJECT = 'reject',    // 拒绝
  RETURN = 'return',    // 退回
  DELEGATE = 'delegate', // 委托
}

// 流程类型
export enum FlowType {
  SINGLE = 'single',        // 单级审核
  PARALLEL = 'parallel',    // 并行审核
  SEQUENTIAL = 'sequential', // 顺序审核
}

// 节点类型
export enum NodeType {
  ROLE = 'role',   // 角色
  USER = 'user',   // 用户
  CONDITION = 'condition', // 条件
}

// 审核节点
export interface ApprovalNode {
  nodeId: string              // 节点ID
  nodeName: string            // 节点名称
  nodeType: NodeType          // 节点类型
  approverType: string        // 审核人类型
  approverValue: string       // 审核人值（角色代码或用户ID）
  order: number               // 节点顺序
  required: boolean           // 是否必需
  timeout?: number            // 超时时间（小时）
  notifyOnCreate?: boolean    // 创建时是否通知
  notifyOnTimeout?: boolean   // 超时时是否通知
}

// 审核配置
export interface ApprovalConfig {
  _id?: string
  configId: string            // 配置ID
  businessType: BusinessType  // 业务类型
  operationType: OperationType // 操作类型
  name: string                // 配置名称
  description?: string        // 配置描述
  flowType: FlowType          // 流程类型
  nodes: ApprovalNode[]       // 审核节点列表
  autoApprove?: boolean       // 是否自动通过
  status: string              // 状态
  createdAt?: Date | string
  updatedAt?: Date | string
  createdBy?: string
  updatedBy?: string
}

// 审核申请
export interface ApprovalRequest {
  _id?: string
  requestId: string                    // 申请ID
  businessType: BusinessType           // 业务类型
  businessId?: string                  // 业务对象ID
  operationType: OperationType         // 操作类型
  configId: string                     // 使用的审核配置ID
  title: string                        // 申请标题
  description?: string                 // 申请描述
  requestData?: {                      // 申请数据
    currentData?: any
    newData?: any
  }
  currentData?: any                    // 当前数据快照
  newData?: any                        // 新数据快照
  status: ApprovalStatus               // 状态
  currentNodeIndex: number             // 当前审核节点索引
  submitterId: string                  // 提交人ID
  submitterName: string                // 提交人姓名
  submittedAt: Date | string           // 提交时间
  completedAt?: Date | string          // 完成时间
  completedBy?: string                 // 完成人
  createdAt?: Date | string
  updatedAt?: Date | string
  records?: ApprovalRecord[]           // 审核记录列表
}

// 审核记录
export interface ApprovalRecord {
  _id?: string
  requestId: string                    // 关联的申请ID
  nodeId: string                       // 审核节点ID
  nodeName: string                     // 节点名称
  approverId: string                   // 审核人ID
  approverName: string                 // 审核人姓名
  approverRole: string                 // 审核人角色
  action: ApprovalAction               // 审核操作
  comment?: string                     // 审核意见
  delegatedTo?: string                 // 委托给
  dataSnapshot?: any                   // 审核时的数据快照
  reviewedAt: Date | string            // 审核时间
  createdAt?: Date | string
}

// 查询参数
export interface ApprovalRequestQueryParams {
  businessType?: BusinessType
  operationType?: OperationType
  status?: ApprovalStatus
  submitterId?: string
  page?: number
  pageSize?: number
}

// 创建审核申请参数
export interface CreateApprovalRequestParams {
  businessType: BusinessType
  businessId?: string
  operationType: OperationType
  title: string
  description?: string
  currentData?: any
  newData: any
}

// 审核操作参数
export interface ProcessApprovalParams {
  requestId: string
  action: ApprovalAction
  comment?: string
}

