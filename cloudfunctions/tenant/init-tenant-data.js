/**
 * 初始化租户和餐厅数据脚本
 * 用于在数据库中创建"小苹果"租户及其两家餐厅
 * 
 * 使用方法：
 * 1. 在云开发控制台 -> 云函数 -> tenant -> 在线编辑
 * 2. 复制此文件内容到云函数中
 * 3. 或者通过云函数调用此初始化逻辑
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/**
 * 初始化小苹果租户数据
 */
async function initTenantData() {
  try {
    // 1. 创建或更新租户
    const tenantId = 'tenant_xiaopingguo'
    const tenantData = {
      _id: tenantId,
      name: '小苹果',
      contactName: '小苹果',
      contactPhone: '13800138000',
      contactEmail: 'xiaopingguo@example.com',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // 检查租户是否已存在
    try {
      const tenantCheck = await db.collection('tenants').doc(tenantId).get()
      if (tenantCheck.data) {
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
        console.log('租户已更新:', tenantId)
      } else {
        // 创建新租户（使用doc().set()来指定_id）
        await db.collection('tenants').doc(tenantId).set({
          data: {
            ...tenantData,
            _id: tenantId,
          },
        })
        console.log('租户已创建:', tenantId)
      }
    } catch (error) {
      // 如果文档不存在，创建新租户
      await db.collection('tenants').doc(tenantId).set({
        data: {
          ...tenantData,
          _id: tenantId,
        },
      })
      console.log('租户已创建:', tenantId)
    }

    // 2. 创建餐厅：素开心
    const restaurant1Id = 'restaurant_sukuaixin'
    const restaurant1Data = {
      _id: restaurant1Id,
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

    try {
      const restaurant1Check = await db.collection('restaurants').doc(restaurant1Id).get()
      if (restaurant1Check.data) {
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
        console.log('餐厅已更新:', restaurant1Id)
      } else {
        await db.collection('restaurants').doc(restaurant1Id).set({
          data: {
            ...restaurant1Data,
            _id: restaurant1Id,
          },
        })
        console.log('餐厅已创建:', restaurant1Id)
      }
    } catch (error) {
      await db.collection('restaurants').doc(restaurant1Id).set({
        data: {
          ...restaurant1Data,
          _id: restaurant1Id,
        },
      })
      console.log('餐厅已创建:', restaurant1Id)
    }

    // 3. 创建餐厅：素欢乐
    const restaurant2Id = 'restaurant_suhuanle'
    const restaurant2Data = {
      _id: restaurant2Id,
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

    try {
      const restaurant2Check = await db.collection('restaurants').doc(restaurant2Id).get()
      if (restaurant2Check.data) {
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
        console.log('餐厅已更新:', restaurant2Id)
      } else {
        await db.collection('restaurants').doc(restaurant2Id).set({
          data: {
            ...restaurant2Data,
            _id: restaurant2Id,
          },
        })
        console.log('餐厅已创建:', restaurant2Id)
      }
    } catch (error) {
      await db.collection('restaurants').doc(restaurant2Id).set({
        data: {
          ...restaurant2Data,
          _id: restaurant2Id,
        },
      })
      console.log('餐厅已创建:', restaurant2Id)
    }

    return {
      success: true,
      message: '租户和餐厅数据初始化成功',
      data: {
        tenantId,
        restaurants: [restaurant1Id, restaurant2Id],
      },
    }
  } catch (error) {
    console.error('初始化失败:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// 如果作为云函数调用
exports.main = async (event, context) => {
  return await initTenantData()
}

// 如果直接运行（用于测试）
if (require.main === module) {
  initTenantData()
    .then((result) => {
      console.log('初始化结果:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('初始化失败:', error)
      process.exit(1)
    })
}

