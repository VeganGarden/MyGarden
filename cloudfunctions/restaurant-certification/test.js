/**
 * 气候餐厅认证功能测试脚本
 * 
 * 测试内容:
 * 1. 提交认证申请
 * 2. 系统自动评估
 * 3. 获取认证状态
 * 4. 生成证书
 * 
 * 执行方式:
 * node test.js
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

// 测试数据
const TEST_DATA = {
  restaurantId: 'test_restaurant_id', // 需要替换为实际餐厅ID
  tenantId: 'test_tenant_id', // 需要替换为实际租户ID
  basicInfo: {
    restaurantName: '测试餐厅',
    address: '测试地址',
    contactPhone: '13800138000',
    contactEmail: 'test@example.com',
    legalPerson: '测试法人',
    businessLicense: 'test_file_id'
  },
  menuInfo: {
    menuItems: [
      {
        name: '素炒时蔬',
        ingredients: ['小白菜', '胡萝卜', '豆芽'],
        quantity: 200,
        unit: 'g',
        cookingMethod: 'steamed',
        carbonLevel: 'ultra_low'
      },
      {
        name: '清蒸豆腐',
        ingredients: ['嫩豆腐', '香菇'],
        quantity: 150,
        unit: 'g',
        cookingMethod: 'steamed',
        carbonLevel: 'low'
      },
      {
        name: '素三鲜饺子',
        ingredients: ['面粉', '韭菜', '鸡蛋'],
        quantity: 300,
        unit: 'g',
        cookingMethod: 'boiled',
        carbonLevel: 'low'
      }
    ]
  },
  supplyChainInfo: {
    suppliers: [
      {
        name: '测试供应商',
        contact: '13800138001',
        certifications: ['有机认证']
      }
    ],
    localIngredientRatio: 35, // 35% 本地食材
    traceabilityInfo: '可追溯'
  },
  operationData: {
    energyUsage: '已建立能源使用台账，使用绿色能源',
    wasteReduction: '20', // 20% 浪费减少
    socialInitiatives: ['顾客教育', '员工培训', '公益活动']
  },
  documents: [
    {
      type: 'businessLicense',
      fileId: 'test_file_id_1',
      fileName: '营业执照.pdf'
    }
  ]
}

/**
 * 调用云函数
 */
async function callFunction(functionName, data) {
  try {
    const result = await cloud.callFunction({
      name: functionName,
      data: data
    })
    return result.result
  } catch (error) {
    console.error(`调用 ${functionName} 失败:`, error)
    throw error
  }
}

/**
 * 测试1: 提交认证申请
 */
async function testApply() {
  console.log('\n========================================')
  console.log('测试1: 提交认证申请')
  console.log('========================================\n')

  try {
    const result = await callFunction('restaurant-certification', {
      action: 'apply',
      data: TEST_DATA
    })

    if (result.code === 0) {
      console.log('✅ 认证申请提交成功')
      console.log('申请ID:', result.data.applicationId)
      console.log('申请编号:', result.data.applicationNumber)
      return result.data.applicationId
    } else {
      console.error('❌ 认证申请提交失败:', result.message)
      return null
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return null
  }
}

/**
 * 测试2: 系统自动评估
 */
async function testSystemEvaluate(applicationId) {
  console.log('\n========================================')
  console.log('测试2: 系统自动评估')
  console.log('========================================\n')

  if (!applicationId) {
    console.log('⚠️  跳过测试（缺少申请ID）')
    return null
  }

  try {
    const result = await callFunction('restaurant-certification', {
      action: 'systemEvaluate',
      data: {
        applicationId: applicationId
      }
    })

    if (result.code === 0) {
      console.log('✅ 系统评估完成')
      console.log('总分:', result.data.totalScore)
      console.log('是否通过:', result.data.passed ? '是' : '否')
      console.log('\n各维度得分:')
      Object.keys(result.data.standards).forEach(key => {
        const standard = result.data.standards[key]
        console.log(`  ${key}: ${standard.score.toFixed(2)}分 (${standard.passed ? '通过' : '未通过'})`)
      })
      console.log('\n改进建议:')
      result.data.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`)
      })
      return result.data
    } else {
      console.error('❌ 系统评估失败:', result.message)
      return null
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return null
  }
}

/**
 * 测试3: 获取认证状态
 */
async function testGetStatus(restaurantId) {
  console.log('\n========================================')
  console.log('测试3: 获取认证状态')
  console.log('========================================\n')

  try {
    const result = await callFunction('restaurant-certification', {
      action: 'getStatus',
      data: {
        restaurantId: restaurantId
      }
    })

    if (result.code === 0) {
      console.log('✅ 获取认证状态成功')
      console.log('当前状态:', result.data.status)
      console.log('当前阶段:', result.data.currentStage)
      console.log('\n阶段列表:')
      result.data.stages.forEach((stage, index) => {
        console.log(`  ${index + 1}. ${stage.stageName} - ${stage.status} (${stage.result || 'N/A'})`)
      })
      return result.data
    } else {
      console.error('❌ 获取状态失败:', result.message)
      return null
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return null
  }
}

/**
 * 测试4: 生成证书
 */
async function testGenerateCertificate(applicationId) {
  console.log('\n========================================')
  console.log('测试4: 生成证书')
  console.log('========================================\n')

  if (!applicationId) {
    console.log('⚠️  跳过测试（缺少申请ID）')
    return null
  }

  try {
    const result = await callFunction('restaurant-certification', {
      action: 'generateCertificate',
      data: {
        applicationId: applicationId
      }
    })

    if (result.code === 0) {
      console.log('✅ 证书生成成功')
      console.log('证书ID:', result.data.certificateId)
      console.log('证书编号:', result.data.certificateNumber)
      console.log('证书文件:', result.data.certificateFile)
      console.log('分享链接:', result.data.shareLink)
      return result.data
    } else {
      console.error('❌ 证书生成失败:', result.message)
      return null
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return null
  }
}

/**
 * 测试5: 文件上传
 */
async function testUploadFile() {
  console.log('\n========================================')
  console.log('测试5: 文件上传')
  console.log('========================================\n')

  try {
    // 创建一个简单的测试文件（base64编码的1x1像素PNG）
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const result = await callFunction('restaurant-certification', {
      action: 'uploadFile',
      data: {
        base64: testImageBase64,
        fileName: 'test.png',
        fileType: 'image/png',
        documentType: 'businessLicense'
      }
    })

    if (result.code === 0) {
      console.log('✅ 文件上传成功')
      console.log('文件ID:', result.data.fileID)
      console.log('文件URL:', result.data.url)
      return result.data
    } else {
      console.error('❌ 文件上传失败:', result.message)
      return null
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return null
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('========================================')
  console.log('气候餐厅认证功能测试')
  console.log('========================================\n')

  const results = {
    apply: null,
    systemEvaluate: null,
    getStatus: null,
    generateCertificate: null,
    uploadFile: null
  }

  try {
    // 测试1: 提交认证申请
    const applicationId = await testApply()
    results.apply = applicationId

    // 等待一下，确保数据已写入
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 测试2: 系统自动评估
    results.systemEvaluate = await testSystemEvaluate(applicationId)

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 测试3: 获取认证状态
    results.getStatus = await testGetStatus(TEST_DATA.restaurantId)

    // 测试5: 文件上传
    results.uploadFile = await testUploadFile()

    // 测试4: 生成证书（需要先通过审核，这里仅测试接口）
    // results.generateCertificate = await testGenerateCertificate(applicationId)

    console.log('\n========================================')
    console.log('测试总结')
    console.log('========================================\n')
    console.log('✅ 提交认证申请:', results.apply ? '通过' : '失败')
    console.log('✅ 系统自动评估:', results.systemEvaluate ? '通过' : '失败')
    console.log('✅ 获取认证状态:', results.getStatus ? '通过' : '失败')
    console.log('✅ 文件上传:', results.uploadFile ? '通过' : '失败')
    console.log('⏸️  生成证书:', '需要先通过审核（跳过）')

    const successCount = Object.values(results).filter(r => r !== null).length
    console.log(`\n总计: ${successCount}/4 个测试通过`)

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { runTests }

