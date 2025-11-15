/**
 * 供应链溯源测试数据生成云函数
 * 
 * 功能:
 * 1. 生成供应商测试数据
 * 2. 生成食材批次测试数据
 * 3. 生成溯源链测试数据
 * 4. 生成溯源节点测试数据
 * 5. 生成证书测试数据
 * 
 * 调用方式:
 * tcb fn invoke traceability-test-data --params '{"action":"generate"}'
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 生成供应商ID
 */
function generateSupplierId(index) {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `SUP-${dateStr}-${String(index).padStart(4, '0')}`
}

/**
 * 生成批次ID
 */
function generateLotId(index) {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `LOT-${dateStr}-${String(index).padStart(4, '0')}`
}

/**
 * 生成溯源链ID
 */
function generateTraceId(index) {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `TRACE-${dateStr}-${String(index).padStart(4, '0')}`
}

/**
 * 生成节点ID
 */
function generateNodeId(index) {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `NODE-${dateStr}-${String(index).padStart(4, '0')}`
}

/**
 * 生成证书编号
 */
function generateCertificateNumber(index) {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `CERT-${year}${month}${day}-${String(index).padStart(4, '0')}`
}

/**
 * 生成供应商测试数据
 */
async function generateSuppliers(tenantId = 'default') {
  const suppliers = [
    {
      tenantId: tenantId,
      supplierId: generateSupplierId(1),
      name: '绿色有机农场',
      type: 'farm',
      legalName: '绿色有机农场有限公司',
      registrationNumber: '91310000MA12345678',
      contact: {
        name: '张经理',
        phone: '13800138001',
        email: 'zhang@greenfarm.com',
        address: {
          province: '上海市',
          city: '上海市',
          district: '浦东新区',
          detail: '张江高科技园区科苑路123号'
        }
      },
      certifications: [
        {
          type: 'organic',
          name: '有机认证',
          issuer: '中国有机产品认证中心',
          issueDate: '2024-01-01',
          expiryDate: '2025-12-31',
          certificateUrl: 'https://example.com/cert1.pdf',
          status: 'valid'
        }
      ],
      businessInfo: {
        establishedDate: '2020-01-01',
        businessScope: '有机蔬菜种植、销售',
        annualCapacity: 500000,
        mainProducts: ['有机白菜', '有机萝卜', '有机菠菜'],
        qualityRating: 95,
        riskLevel: 'low'
      },
      cooperation: {
        restaurantIds: [],
        startDate: null,
        lastOrderDate: null,
        totalOrders: 0,
        totalAmount: 0,
        status: 'pending'
      },
      audit: {
        status: 'approved',
        submittedAt: new Date('2024-01-01'),
        reviewedAt: new Date('2024-01-05'),
        reviewedBy: 'admin',
        reviewComments: '审核通过',
        version: 1
      },
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      version: 1,
      isDeleted: false
    },
    {
      tenantId: tenantId,
      supplierId: generateSupplierId(2),
      name: '优质豆制品加工厂',
      type: 'processor',
      legalName: '优质豆制品加工厂有限公司',
      registrationNumber: '91310000MA23456789',
      contact: {
        name: '李经理',
        phone: '13800138002',
        email: 'li@tofu.com',
        address: {
          province: '江苏省',
          city: '苏州市',
          district: '工业园区',
          detail: '工业园区星海街456号'
        }
      },
      certifications: [
        {
          type: 'food_safety',
          name: '食品安全认证',
          issuer: '国家食品安全认证中心',
          issueDate: '2024-03-01',
          expiryDate: '2025-12-31',
          certificateUrl: 'https://example.com/cert2.pdf',
          status: 'valid'
        }
      ],
      businessInfo: {
        establishedDate: '2018-06-01',
        businessScope: '豆制品加工、销售',
        annualCapacity: 300000,
        mainProducts: ['有机豆腐', '有机豆浆', '有机豆干'],
        qualityRating: 92,
        riskLevel: 'low'
      },
      cooperation: {
        restaurantIds: [],
        startDate: null,
        lastOrderDate: null,
        totalOrders: 0,
        totalAmount: 0,
        status: 'pending'
      },
      audit: {
        status: 'approved',
        submittedAt: new Date('2024-02-01'),
        reviewedAt: new Date('2024-02-10'),
        reviewedBy: 'admin',
        reviewComments: '审核通过',
        version: 1
      },
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      version: 1,
      isDeleted: false
    },
    {
      tenantId: tenantId,
      supplierId: generateSupplierId(3),
      name: '新鲜果蔬配送中心',
      type: 'distributor',
      legalName: '新鲜果蔬配送中心有限公司',
      registrationNumber: '91310000MA34567890',
      contact: {
        name: '王经理',
        phone: '13800138003',
        email: 'wang@fresh.com',
        address: {
          province: '浙江省',
          city: '杭州市',
          district: '余杭区',
          detail: '余杭区文一西路789号'
        }
      },
      certifications: [],
      businessInfo: {
        establishedDate: '2019-03-01',
        businessScope: '果蔬配送、仓储',
        annualCapacity: 800000,
        mainProducts: ['新鲜蔬菜', '新鲜水果'],
        qualityRating: 88,
        riskLevel: 'medium'
      },
      cooperation: {
        restaurantIds: [],
        startDate: null,
        lastOrderDate: null,
        totalOrders: 0,
        totalAmount: 0,
        status: 'pending'
      },
      audit: {
        status: 'pending',
        submittedAt: new Date(),
        version: 1
      },
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      version: 1,
      isDeleted: false
    }
  ]

  const results = []
  for (const supplier of suppliers) {
    try {
      await db.collection('suppliers').add({ data: supplier })
      results.push({ supplierId: supplier.supplierId, success: true })
    } catch (error) {
      results.push({ supplierId: supplier.supplierId, success: false, error: error.message })
    }
  }

  return results
}

/**
 * 生成食材批次测试数据
 */
async function generateIngredientLots(tenantId = 'default') {
  const lots = [
    {
      tenantId: tenantId,
      lotId: generateLotId(1),
      ingredientId: 'ING-001',
      ingredientName: '有机白菜',
      ingredientCategory: 'vegetable',
      supplierId: generateSupplierId(1),
      supplierName: '绿色有机农场',
      batchNumber: 'BATCH-20250117-001',
      harvestDate: new Date('2025-01-10'),
      productionDate: new Date('2025-01-10'),
      expiryDate: new Date('2025-01-25'),
      quantity: 1000,
      unit: 'kg',
      quality: {
        grade: 'A',
        testResults: {
          pesticideResidue: '合格',
          heavyMetals: '合格',
          microorganisms: '合格'
        },
        testDate: new Date('2025-01-11'),
        testBy: '第三方检测机构'
      },
      inventory: {
        restaurantId: 'REST-001',
        restaurantName: '测试餐厅',
        quantity: 500,
        unit: 'kg',
        location: '冷库A区',
        lastUpdated: new Date()
      },
      status: 'in_stock',
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      isDeleted: false
    },
    {
      tenantId: tenantId,
      lotId: generateLotId(2),
      ingredientId: 'ING-002',
      ingredientName: '有机豆腐',
      ingredientCategory: 'processed',
      supplierId: generateSupplierId(2),
      supplierName: '优质豆制品加工厂',
      batchNumber: 'BATCH-20250117-002',
      harvestDate: null,
      productionDate: new Date('2025-01-15'),
      expiryDate: new Date('2025-01-22'),
      quantity: 500,
      unit: 'kg',
      quality: {
        grade: 'A',
        testResults: {
          foodSafety: '合格',
          nutrition: '合格'
        },
        testDate: new Date('2025-01-16'),
        testBy: '第三方检测机构'
      },
      inventory: {
        restaurantId: 'REST-001',
        restaurantName: '测试餐厅',
        quantity: 300,
        unit: 'kg',
        location: '冷库B区',
        lastUpdated: new Date()
      },
      status: 'in_stock',
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      isDeleted: false
    },
    {
      tenantId: tenantId,
      lotId: generateLotId(3),
      ingredientId: 'ING-003',
      ingredientName: '新鲜菠菜',
      ingredientCategory: 'vegetable',
      supplierId: generateSupplierId(1),
      supplierName: '绿色有机农场',
      batchNumber: 'BATCH-20250117-003',
      harvestDate: new Date('2025-01-12'),
      productionDate: new Date('2025-01-12'),
      expiryDate: new Date('2025-01-20'),
      quantity: 800,
      unit: 'kg',
      quality: {
        grade: 'A',
        testResults: {
          pesticideResidue: '合格',
          heavyMetals: '合格'
        },
        testDate: new Date('2025-01-13'),
        testBy: '第三方检测机构'
      },
      inventory: {
        restaurantId: 'REST-001',
        restaurantName: '测试餐厅',
        quantity: 400,
        unit: 'kg',
        location: '冷库A区',
        lastUpdated: new Date()
      },
      status: 'in_stock',
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      isDeleted: false
    }
  ]

  const results = []
  for (const lot of lots) {
    try {
      await db.collection('ingredient_lots').add({ data: lot })
      results.push({ lotId: lot.lotId, success: true })
    } catch (error) {
      results.push({ lotId: lot.lotId, success: false, error: error.message })
    }
  }

  return results
}

/**
 * 生成溯源链和节点测试数据
 */
async function generateTraceChains(tenantId = 'default') {
  const traceChains = [
    {
      tenantId: tenantId,
      traceId: generateTraceId(1),
      menuItemId: 'MENU-001',
      menuItemName: '有机白菜汤',
      lotId: generateLotId(1),
      restaurantId: 'REST-001',
      restaurantName: '测试餐厅',
      chainType: 'full',
      status: 'active',
      verificationStatus: 'verified',
      trustScore: 92,
      trustScoreFactors: {
        completeness: 95,
        certification: 90,
        verification: 95,
        timeliness: 88
      },
      carbonFootprint: 0.5,
      share: {
        shareUrl: `https://example.com/trace/${generateTraceId(1)}`,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://example.com/trace/${generateTraceId(1)}`)}`,
        viewCount: 0,
        expireAt: new Date(Date.now() + 365 * 24 * 3600 * 1000)
      },
      nodeCount: 4,
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      isDeleted: false
    },
    {
      tenantId: tenantId,
      traceId: generateTraceId(2),
      menuItemId: 'MENU-002',
      menuItemName: '有机豆腐炒菜',
      lotId: generateLotId(2),
      restaurantId: 'REST-001',
      restaurantName: '测试餐厅',
      chainType: 'full',
      status: 'active',
      verificationStatus: 'verified',
      trustScore: 88,
      trustScoreFactors: {
        completeness: 85,
        certification: 90,
        verification: 90,
        timeliness: 85
      },
      carbonFootprint: 0.6,
      share: {
        shareUrl: `https://example.com/trace/${generateTraceId(2)}`,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://example.com/trace/${generateTraceId(2)}`)}`,
        viewCount: 0,
        expireAt: new Date(Date.now() + 365 * 24 * 3600 * 1000)
      },
      nodeCount: 3,
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      isDeleted: false
    }
  ]

  const traceNodes = [
    // 溯源链1的节点
    {
      tenantId: tenantId,
      traceId: generateTraceId(1),
      nodeId: generateNodeId(1),
      nodeType: 'supplier',
      nodeOrder: 1,
      nodeName: '绿色有机农场',
      timestamp: new Date('2025-01-10T08:00:00'),
      entityId: generateSupplierId(1),
      entityName: '绿色有机农场',
      location: {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        address: '张江高科技园区科苑路123号',
        coordinates: { lat: 31.2000, lng: 121.6000 }
      },
      operation: {
        type: 'harvest',
        description: '有机白菜收获',
        operator: '张经理',
        quantity: 1000,
        unit: 'kg'
      },
      evidence: [
        {
          type: 'photo',
          url: 'https://example.com/evidence/harvest1.jpg',
          description: '收获现场照片'
        }
      ],
      certifications: ['有机认证'],
      isVerified: true,
      verifiedBy: 'system',
      verifiedAt: new Date('2025-01-10T09:00:00'),
      carbonFootprint: 0.1,
      createdAt: new Date(),
      isDeleted: false
    },
    {
      tenantId: tenantId,
      traceId: generateTraceId(1),
      nodeId: generateNodeId(2),
      nodeType: 'transport',
      nodeOrder: 2,
      nodeName: '冷链运输',
      timestamp: new Date('2025-01-10T14:00:00'),
      entityId: 'TRANS-001',
      entityName: '绿色物流公司',
      location: {
        province: '上海市',
        city: '上海市',
        district: '浦东新区',
        address: '物流园区',
        coordinates: { lat: 31.2100, lng: 121.6100 }
      },
      operation: {
        type: 'transport',
        description: '冷链运输至餐厅',
        operator: '李司机',
        vehicle: '沪A12345',
        distance: 50,
        unit: 'km'
      },
      evidence: [
        {
          type: 'document',
          url: 'https://example.com/evidence/transport1.pdf',
          description: '运输单据'
        }
      ],
      certifications: [],
      isVerified: true,
      verifiedBy: 'system',
      verifiedAt: new Date('2025-01-10T15:00:00'),
      carbonFootprint: 0.2,
      createdAt: new Date(),
      isDeleted: false
    },
    {
      tenantId: tenantId,
      traceId: generateTraceId(1),
      nodeId: generateNodeId(3),
      nodeType: 'restaurant',
      nodeOrder: 3,
      nodeName: '测试餐厅',
      timestamp: new Date('2025-01-10T16:00:00'),
      entityId: 'REST-001',
      entityName: '测试餐厅',
      location: {
        province: '上海市',
        city: '上海市',
        district: '黄浦区',
        address: '南京东路100号',
        coordinates: { lat: 31.2300, lng: 121.4800 }
      },
      operation: {
        type: 'receive',
        description: '接收食材',
        operator: '王厨师',
        quantity: 500,
        unit: 'kg'
      },
      evidence: [
        {
          type: 'document',
          url: 'https://example.com/evidence/receive1.pdf',
          description: '收货单据'
        }
      ],
      certifications: [],
      isVerified: true,
      verifiedBy: 'system',
      verifiedAt: new Date('2025-01-10T17:00:00'),
      carbonFootprint: 0.1,
      createdAt: new Date(),
      isDeleted: false
    },
    {
      tenantId: tenantId,
      traceId: generateTraceId(1),
      nodeId: generateNodeId(4),
      nodeType: 'restaurant',
      nodeOrder: 4,
      nodeName: '测试餐厅',
      timestamp: new Date('2025-01-11T12:00:00'),
      entityId: 'REST-001',
      entityName: '测试餐厅',
      location: {
        province: '上海市',
        city: '上海市',
        district: '黄浦区',
        address: '南京东路100号',
        coordinates: { lat: 31.2300, lng: 121.4800 }
      },
      operation: {
        type: 'cook',
        description: '制作有机白菜汤',
        operator: '王厨师',
        menuItemId: 'MENU-001',
        menuItemName: '有机白菜汤',
        quantity: 10,
        unit: '份'
      },
      evidence: [
        {
          type: 'photo',
          url: 'https://example.com/evidence/cook1.jpg',
          description: '制作过程照片'
        }
      ],
      certifications: [],
      isVerified: true,
      verifiedBy: 'system',
      verifiedAt: new Date('2025-01-11T12:30:00'),
      carbonFootprint: 0.1,
      createdAt: new Date(),
      isDeleted: false
    },
    // 溯源链2的节点
    {
      tenantId: tenantId,
      traceId: generateTraceId(2),
      nodeId: generateNodeId(5),
      nodeType: 'supplier',
      nodeOrder: 1,
      nodeName: '优质豆制品加工厂',
      timestamp: new Date('2025-01-15T08:00:00'),
      entityId: generateSupplierId(2),
      entityName: '优质豆制品加工厂',
      location: {
        province: '江苏省',
        city: '苏州市',
        district: '工业园区',
        address: '工业园区星海街456号',
        coordinates: { lat: 31.3000, lng: 120.6000 }
      },
      operation: {
        type: 'produce',
        description: '生产有机豆腐',
        operator: '李经理',
        quantity: 500,
        unit: 'kg'
      },
      evidence: [
        {
          type: 'document',
          url: 'https://example.com/evidence/produce1.pdf',
          description: '生产记录'
        }
      ],
      certifications: ['食品安全认证'],
      isVerified: true,
      verifiedBy: 'system',
      verifiedAt: new Date('2025-01-15T09:00:00'),
      carbonFootprint: 0.2,
      createdAt: new Date(),
      isDeleted: false
    },
    {
      tenantId: tenantId,
      traceId: generateTraceId(2),
      nodeId: generateNodeId(6),
      nodeType: 'transport',
      nodeOrder: 2,
      nodeName: '冷链运输',
      timestamp: new Date('2025-01-15T14:00:00'),
      entityId: 'TRANS-001',
      entityName: '绿色物流公司',
      location: {
        province: '江苏省',
        city: '苏州市',
        district: '工业园区',
        address: '物流园区',
        coordinates: { lat: 31.3100, lng: 120.6100 }
      },
      operation: {
        type: 'transport',
        description: '冷链运输至餐厅',
        operator: '李司机',
        vehicle: '沪A12345',
        distance: 120,
        unit: 'km'
      },
      evidence: [
        {
          type: 'document',
          url: 'https://example.com/evidence/transport2.pdf',
          description: '运输单据'
        }
      ],
      certifications: [],
      isVerified: true,
      verifiedBy: 'system',
      verifiedAt: new Date('2025-01-15T15:00:00'),
      carbonFootprint: 0.3,
      createdAt: new Date(),
      isDeleted: false
    },
    {
      tenantId: tenantId,
      traceId: generateTraceId(2),
      nodeId: generateNodeId(7),
      nodeType: 'restaurant',
      nodeOrder: 3,
      nodeName: '测试餐厅',
      timestamp: new Date('2025-01-16T12:00:00'),
      entityId: 'REST-001',
      entityName: '测试餐厅',
      location: {
        province: '上海市',
        city: '上海市',
        district: '黄浦区',
        address: '南京东路100号',
        coordinates: { lat: 31.2300, lng: 121.4800 }
      },
      operation: {
        type: 'cook',
        description: '制作有机豆腐炒菜',
        operator: '王厨师',
        menuItemId: 'MENU-002',
        menuItemName: '有机豆腐炒菜',
        quantity: 15,
        unit: '份'
      },
      evidence: [
        {
          type: 'photo',
          url: 'https://example.com/evidence/cook2.jpg',
          description: '制作过程照片'
        }
      ],
      certifications: [],
      isVerified: true,
      verifiedBy: 'system',
      verifiedAt: new Date('2025-01-16T12:30:00'),
      carbonFootprint: 0.1,
      createdAt: new Date(),
      isDeleted: false
    }
  ]

  const chainResults = []
  for (const chain of traceChains) {
    try {
      await db.collection('trace_chains').add({ data: chain })
      chainResults.push({ traceId: chain.traceId, success: true })
    } catch (error) {
      chainResults.push({ traceId: chain.traceId, success: false, error: error.message })
    }
  }

  const nodeResults = []
  for (const node of traceNodes) {
    try {
      await db.collection('trace_nodes').add({ data: node })
      nodeResults.push({ nodeId: node.nodeId, success: true })
    } catch (error) {
      nodeResults.push({ nodeId: node.nodeId, success: false, error: error.message })
    }
  }

  return {
    chains: chainResults,
    nodes: nodeResults
  }
}

/**
 * 生成证书测试数据（调用证书生成云函数生成实际PDF）
 */
async function generateCertificates(tenantId = 'default') {
  // 先查询现有的溯源链，以便生成更多证书
  let traceChains = []
  try {
    const traceResult = await db.collection('trace_chains')
      .where({
        tenantId: tenantId,
        isDeleted: false
      })
      .limit(10)
      .get()
    traceChains = traceResult.data
  } catch (error) {
    console.warn('查询溯源链失败，使用默认值:', error.message)
  }

  // 如果没有溯源链，使用默认的溯源链ID
  if (traceChains.length === 0) {
    traceChains = [
      { traceId: generateTraceId(1), menuItemName: '有机白菜汤', trustScore: 92, nodeCount: 4 },
      { traceId: generateTraceId(2), menuItemName: '有机豆腐炒菜', trustScore: 88, nodeCount: 3 }
    ]
  }

  const results = []
  
  // 为每个溯源链生成证书（调用证书生成云函数）
  for (let i = 0; i < traceChains.length; i++) {
    const chain = traceChains[i]
    try {
      // 调用证书生成云函数生成实际PDF
      const certResult = await cloud.callFunction({
        name: 'trace-certificate',
        data: {
          action: 'generate',
          traceId: chain.traceId,
          tenantId: tenantId,
          templateId: 'default',
          format: 'pdf'
        }
      })

      if (certResult.result && certResult.result.code === 0) {
        results.push({
          certificateId: certResult.result.data.certificateId,
          certificateNumber: certResult.result.data.certificateNumber,
          success: true,
          hasPdf: !!certResult.result.data.certificateUrl
        })
      } else {
        results.push({
          traceId: chain.traceId,
          success: false,
          error: certResult.result?.message || '证书生成失败'
        })
      }
    } catch (error) {
      results.push({
        traceId: chain.traceId,
        success: false,
        error: error.message
      })
    }
  }

  // 为第一个溯源链生成一个高级证书
  if (traceChains.length > 0) {
    try {
      const premiumResult = await cloud.callFunction({
        name: 'trace-certificate',
        data: {
          action: 'generate',
          traceId: traceChains[0].traceId,
          tenantId: tenantId,
          templateId: 'premium',
          format: 'pdf'
        }
      })

      if (premiumResult.result && premiumResult.result.code === 0) {
        results.push({
          certificateId: premiumResult.result.data.certificateId,
          certificateNumber: premiumResult.result.data.certificateNumber,
          success: true,
          hasPdf: !!premiumResult.result.data.certificateUrl,
          type: 'premium'
        })
      }
    } catch (error) {
      console.warn('生成高级证书失败:', error.message)
    }
  }

  return results
}

/**
 * 生成所有测试数据
 */
async function generateAllTestData(tenantId = 'default') {
  const results = {
    suppliers: [],
    ingredientLots: [],
    traceChains: { chains: [], nodes: [] },
    certificates: []
  }

  try {
    results.suppliers = await generateSuppliers(tenantId)
    results.ingredientLots = await generateIngredientLots(tenantId)
    results.traceChains = await generateTraceChains(tenantId)
    results.certificates = await generateCertificates(tenantId)

    return {
      code: 0,
      message: '测试数据生成完成',
      results: results
    }
  } catch (error) {
    return {
      code: 500,
      message: '生成测试数据失败',
      error: error.message,
      results: results
    }
  }
}

/**
 * 清理测试数据
 */
async function cleanTestData(tenantId = 'default') {
  const collections = ['suppliers', 'ingredient_lots', 'trace_chains', 'trace_nodes', 'certificates']
  const results = {}

  for (const collectionName of collections) {
    try {
      const result = await db.collection(collectionName)
        .where({
          tenantId: tenantId,
          createdBy: 'system'
        })
        .remove()
      results[collectionName] = {
        success: true,
        deleted: result.stats.removed || 0
      }
    } catch (error) {
      results[collectionName] = {
        success: false,
        error: error.message
      }
    }
  }

  return {
    code: 0,
    message: '测试数据清理完成',
    results: results
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action = 'generate', tenantId = 'default' } = event

  try {
    switch (action) {
      case 'generate':
        return await generateAllTestData(tenantId)
      case 'clean':
        return await cleanTestData(tenantId)
      default:
        return {
          code: 400,
          message: '未知的 action 参数',
          supportedActions: ['generate', 'clean']
        }
    }
  } catch (error) {
    return {
      code: 500,
      message: '操作失败',
      error: error.message
    }
  }
}

