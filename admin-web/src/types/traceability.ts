/**
 * 供应链溯源系统类型定义
 */

// 供应商类型
export enum SupplierType {
  FARM = 'farm',              // 农场
  PROCESSOR = 'processor',      // 加工商
  DISTRIBUTOR = 'distributor',  // 分销商
  OTHER = 'other'               // 其他
}

// 供应商审核状态
export enum SupplierAuditStatus {
  PENDING = 'pending',          // 待审核
  APPROVED = 'approved',         // 已通过
  REJECTED = 'rejected'         // 已拒绝
}

// 合作状态
export enum CooperationStatus {
  PENDING = 'pending',          // 待合作
  ACTIVE = 'active',            // 合作中
  SUSPENDED = 'suspended',     // 已暂停
  TERMINATED = 'terminated'     // 已终止
}

// 风险等级
export enum RiskLevel {
  LOW = 'low',                  // 低风险
  MEDIUM = 'medium',            // 中风险
  HIGH = 'high'                 // 高风险
}

// 认证类型
export enum CertificationType {
  ORGANIC = 'organic',          // 有机认证
  GREEN = 'green',              // 绿色认证
  FAIR_TRADE = 'fair_trade',    // 公平贸易
  OTHER = 'other'              // 其他
}

// 库存状态
export enum InventoryStatus {
  IN_STOCK = 'in_stock',        // 有库存
  LOW_STOCK = 'low_stock',      // 库存不足
  OUT_OF_STOCK = 'out_of_stock', // 缺货
  EXPIRED = 'expired'           // 已过期
}

// 节点类型
export enum NodeType {
  SUPPLIER = 'supplier',        // 供应商
  PROCESSOR = 'processor',      // 加工
  TRANSPORT = 'transport',      // 运输
  RESTAURANT = 'restaurant',    // 餐厅
  OTHER = 'other'              // 其他
}

// 溯源链状态
export enum TraceChainStatus {
  DRAFT = 'draft',             // 草稿
  ACTIVE = 'active',           // 活跃
  ARCHIVED = 'archived',       // 已归档
  EXPIRED = 'expired'          // 已过期
}

// 验证状态
export enum VerificationStatus {
  PENDING = 'pending',         // 待验证
  VERIFIED = 'verified',       // 已验证
  REJECTED = 'rejected'        // 已拒绝
}

// 供应商接口
export interface Supplier {
  _id?: string
  tenantId: string
  supplierId: string
  name: string
  type: SupplierType
  legalName?: string
  registrationNumber?: string
  contact: {
    phone?: string
    email?: string
    address?: {
      province?: string
      city?: string
      district?: string
      detail?: string
      latitude?: number
      longitude?: number
    }
  }
  certifications: Array<{
    type: CertificationType
    name: string
    certificateNumber: string
    issuer: string
    issueDate: Date | string
    expiryDate: Date | string
    certificateUrl?: string
    status: 'valid' | 'expired' | 'revoked'
  }>
  businessInfo: {
    establishedDate?: Date | string
    businessScope?: string
    annualCapacity?: number
    mainProducts?: string[]
    qualityRating?: number
    riskLevel: RiskLevel
  }
  cooperation: {
    restaurantIds: string[]
    startDate?: Date | string
    lastOrderDate?: Date | string
    totalOrders: number
    totalAmount: number
    status: CooperationStatus
  }
  audit: {
    status: SupplierAuditStatus
    submittedAt: Date | string
    reviewedAt?: Date | string
    reviewedBy?: string
    reviewComments?: string
    version: number
  }
  createdAt?: Date | string
  createdBy?: string
  updatedAt?: Date | string
  updatedBy?: string
  version?: number
  isDeleted?: boolean
}

// 食材批次接口
export interface IngredientLot {
  _id?: string
  tenantId: string
  lotId: string
  ingredientId: string
  ingredientName: string
  ingredientCategory?: string
  supplierId: string
  supplierName: string
  batchNumber: string
  harvestDate: Date | string
  productionDate?: Date | string
  expiryDate?: Date | string
  quantity: number
  unit: string
  origin?: {
    province?: string
    city?: string
    district?: string
    farmName?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  quality?: {
    inspectionDate?: Date | string
    inspector?: string
    inspectionResult: 'pass' | 'fail' | 'pending'
    inspectionReport?: string
    testItems?: Array<{
      item: string
      standard: string
      actual: string
      result: 'pass' | 'fail'
    }>
  }
  logistics?: {
    transportMode?: string
    transportCompany?: string
    departureDate?: Date | string
    arrivalDate?: Date | string
    departureLocation?: string
    arrivalLocation?: string
    carbonFootprint?: number
  }
  inventory: {
    restaurantId?: string
    currentStock: number
    unit: string
    location?: string
    lastUsedDate?: Date | string
    status: InventoryStatus
  }
  usageRecords?: Array<{
    menuItemId: string
    menuItemName: string
    quantity: number
    usedDate: Date | string
    orderId?: string
  }>
  createdAt?: Date | string
  createdBy?: string
  updatedAt?: Date | string
  updatedBy?: string
  version?: number
  isDeleted?: boolean
}

// 溯源节点接口
export interface TraceNode {
  _id?: string
  tenantId: string
  nodeId: string
  traceId: string
  nodeType: NodeType
  nodeOrder: number
  nodeName: string
  nodeDescription?: string
  entityType?: string
  entityId?: string
  timestamp: Date | string
  duration?: number
  location?: {
    name?: string
    address?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
    region?: string
  }
  operation?: {
    type?: string
    description?: string
    operator?: string
    operatorId?: string
  }
  evidence?: Array<{
    type: 'photo' | 'video' | 'document' | 'certificate'
    url: string
    description?: string
    uploadedAt: Date | string
    uploadedBy?: string
  }>
  certifications?: Array<{
    type: string
    name: string
    certificateNumber: string
    issuer: string
    expiryDate?: Date | string
  }>
  carbonFootprint?: {
    value: number
    breakdown?: {
      energy?: number
      transport?: number
      other?: number
    }
  }
  quality?: {
    inspectionResult?: string
    inspectionDate?: Date | string
    inspector?: string
  }
  status?: 'active' | 'archived'
  isVerified?: boolean
  verifiedAt?: Date | string
  verifiedBy?: string
  createdAt?: Date | string
  createdBy?: string
  updatedAt?: Date | string
  updatedBy?: string
  version?: number
  isDeleted?: boolean
}

// 溯源链接口
export interface TraceChain {
  _id?: string
  tenantId: string
  traceId: string
  menuItemId: string
  menuItemName: string
  lotId: string
  restaurantId?: string
  chainType?: 'full' | 'partial' | 'simplified'
  traceabilityLevel?: 'complete' | 'partial' | 'minimal'
  nodeCount: number
  nodeIds: string[]
  trustScore: number
  trustScoreFactors: {
    completeness: number
    certification: number
    verification: number
    timeliness: number
  }
  carbonFootprint: {
    total: number
    breakdown: {
      production: number
      transport: number
      processing: number
      storage: number
      other: number
    }
  }
  status: TraceChainStatus
  verificationStatus: VerificationStatus
  verifiedAt?: Date | string
  verifiedBy?: string
  share?: {
    qrCode?: string
    shareUrl?: string
    shareCount?: number
    viewCount?: number
  }
  createdAt?: Date | string
  createdBy?: string
  updatedAt?: Date | string
  updatedBy?: string
  version?: number
  isDeleted?: boolean
}

// 查询参数
export interface SupplierQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  type?: SupplierType
  status?: SupplierAuditStatus
  riskLevel?: RiskLevel
  tenantId?: string
  restaurantId?: string // 按餐厅筛选（从Header的RestaurantSwitcher获取）
}

export interface IngredientLotQueryParams {
  page?: number
  pageSize?: number
  ingredientId?: string
  supplierId?: string
  status?: InventoryStatus
  harvestDateStart?: Date | string
  harvestDateEnd?: Date | string
  tenantId?: string
}

export interface TraceChainQueryParams {
  keyword?: string
  page?: number
  pageSize?: number
  menuItemId?: string
  lotId?: string
  status?: TraceChainStatus
  verificationStatus?: VerificationStatus
  tenantId?: string
}

// 表单数据
export interface SupplierFormData {
  name: string
  type: SupplierType
  legalName?: string
  registrationNumber?: string
  contact: Supplier['contact']
  certifications?: Supplier['certifications']
  businessInfo: Supplier['businessInfo']
  cooperation?: {
    restaurantIds: string[]
  }
}

export interface IngredientLotFormData {
  ingredientId: string
  supplierId: string
  batchNumber: string
  harvestDate: Date | string
  productionDate?: Date | string
  expiryDate?: Date | string
  quantity: number
  unit: string
  origin?: IngredientLot['origin']
  quality?: IngredientLot['quality']
  logistics?: IngredientLot['logistics']
  restaurantId?: string
}

export interface TraceChainFormData {
  menuItemId: string
  lotId: string
  restaurantId?: string
  chainType?: 'full' | 'partial' | 'simplified'
  nodes: Array<{
    nodeType: NodeType
    nodeOrder: number
    nodeName: string
    timestamp: Date | string
    entityId?: string
    location?: TraceNode['location']
    operation?: TraceNode['operation']
    evidence?: TraceNode['evidence']
    carbonFootprint?: number
  }>
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

