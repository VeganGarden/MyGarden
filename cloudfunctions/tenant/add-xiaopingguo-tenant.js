/**
 * 添加"小苹果"租户到数据库
 * 
 * 此脚本专门用于在现有数据库中添加"小苹果"租户及其两家餐厅
 * 如果租户已存在，会更新信息；如果不存在，会创建新租户
 * 
 * 使用方法：
 * 1. 在云开发控制台 -> 云函数 -> tenant -> 在线编辑
 * 2. 调用云函数，action 设置为 "addXiaopingguo"
 * 3. 或者直接运行此脚本（需要配置云开发环境）
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/**
 * 添加"小苹果"租户
 */
async function addXiaopingguoTenant() {
  try {
    console.log('===== 开始添加"小苹果"租户 =====\n')

    // 1. 创建或更新"小苹果"租户
    const tenantId = 'tenant_xiaopingguo'
    const tenantData = {
      name: '小苹果',
      contactName: '小苹果',
      contactPhone: '13800138000',
      contactEmail: 'xiaopingguo@example.com',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log(`[1/3] 创建/更新租户: ${tenantId}`)
    
    // 检查租户是否已存在
    try {
      const tenantDoc = await db.collection('tenants').doc(tenantId).get()
      if (tenantDoc.data) {
        // 更新现有租户
        await db.collection('tenants').doc(tenantId).update({
          data: {
            name: tenantData.name,
            contactName: tenantData.contactName,
            contactPhone: tenantData.contactPhone,
            contactEmail: tenantData.contactEmail,
            status: tenantData.status,
            updatedAt: new Date(),
          },
        })
        console.log('✅ 租户已更新:', tenantId)
      } else {
        // 创建新租户
        await db.collection('tenants').doc(tenantId).set({
          data: tenantData,
        })
        console.log('✅ 租户已创建:', tenantId)
      }
    } catch (error) {
      // 如果文档不存在，创建新租户
      await db.collection('tenants').doc(tenantId).set({
        data: tenantData,
      })
      console.log('✅ 租户已创建:', tenantId)
    }

    // 2. 创建餐厅：素开心
    const restaurant1Id = 'restaurant_sukuaixin'
    const restaurant1Data = {
      tenantId: tenantId,
      name: '素开心',
      address: '上海市虹桥区XX路123号',
      phone: '021-12345678',
      email: 'sukuaixin@example.com',
      status: 'active',
      certificationLevel: 'gold',
      certificationStatus: 'certified',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
    }

    console.log(`\n[2/3] 创建/更新餐厅: ${restaurant1Id}`)
    
    try {
      const restaurant1Doc = await db.collection('restaurants').doc(restaurant1Id).get()
      if (restaurant1Doc.data) {
        await db.collection('restaurants').doc(restaurant1Id).update({
          data: {
            name: restaurant1Data.name,
            address: restaurant1Data.address,
            phone: restaurant1Data.phone,
            email: restaurant1Data.email,
            status: restaurant1Data.status,
            certificationLevel: restaurant1Data.certificationLevel,
            certificationStatus: restaurant1Data.certificationStatus,
            updatedAt: new Date(),
          },
        })
        console.log('✅ 餐厅已更新:', restaurant1Id)
      } else {
        await db.collection('restaurants').doc(restaurant1Id).set({
          data: restaurant1Data,
        })
        console.log('✅ 餐厅已创建:', restaurant1Id)
      }
    } catch (error) {
      await db.collection('restaurants').doc(restaurant1Id).set({
        data: restaurant1Data,
      })
      console.log('✅ 餐厅已创建:', restaurant1Id)
    }

    // 3. 创建餐厅：素欢乐
    const restaurant2Id = 'restaurant_suhuanle'
    const restaurant2Data = {
      tenantId: tenantId,
      name: '素欢乐',
      address: '上海市浦东新区XX街456号',
      phone: '021-87654321',
      email: 'suhuanle@example.com',
      status: 'active',
      certificationLevel: 'silver',
      certificationStatus: 'certified',
      createdAt: new Date('2024-02-20'),
      updatedAt: new Date(),
    }

    console.log(`\n[3/3] 创建/更新餐厅: ${restaurant2Id}`)
    
    try {
      const restaurant2Doc = await db.collection('restaurants').doc(restaurant2Id).get()
      if (restaurant2Doc.data) {
        await db.collection('restaurants').doc(restaurant2Id).update({
          data: {
            name: restaurant2Data.name,
            address: restaurant2Data.address,
            phone: restaurant2Data.phone,
            email: restaurant2Data.email,
            status: restaurant2Data.status,
            certificationLevel: restaurant2Data.certificationLevel,
            certificationStatus: restaurant2Data.certificationStatus,
            updatedAt: new Date(),
          },
        })
        console.log('✅ 餐厅已更新:', restaurant2Id)
      } else {
        await db.collection('restaurants').doc(restaurant2Id).set({
          data: restaurant2Data,
        })
        console.log('✅ 餐厅已创建:', restaurant2Id)
      }
    } catch (error) {
      await db.collection('restaurants').doc(restaurant2Id).set({
        data: restaurant2Data,
      })
      console.log('✅ 餐厅已创建:', restaurant2Id)
    }

    console.log('\n===== "小苹果"租户添加完成 =====')
    console.log(`\n✅ 租户ID: ${tenantId}`)
    console.log(`✅ 餐厅1: ${restaurant1Id} (素开心 - 金牌认证)`)
    console.log(`✅ 餐厅2: ${restaurant2Id} (素欢乐 - 银牌认证)`)

    return {
      success: true,
      message: '"小苹果"租户添加成功',
      data: {
        tenantId,
        tenantName: '小苹果',
        restaurants: [
          {
            id: restaurant1Id,
            name: '素开心',
            certificationLevel: 'gold',
          },
          {
            id: restaurant2Id,
            name: '素欢乐',
            certificationLevel: 'silver',
          },
        ],
      },
    }
  } catch (error) {
    console.error('❌ 添加租户失败:', error)
    return {
      success: false,
      error: error.message || '添加租户失败',
    }
  }
}

// 如果作为云函数调用
exports.main = async (event, context) => {
  return await addXiaopingguoTenant()
}

// 如果直接运行（用于测试）
if (require.main === module) {
  addXiaopingguoTenant()
    .then((result) => {
      console.log('\n执行结果:', JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('执行失败:', error)
      process.exit(1)
    })
}

