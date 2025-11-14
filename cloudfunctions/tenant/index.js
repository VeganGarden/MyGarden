const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/**
 * 租户和餐厅管理云函数
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'getTenant':
        // 获取租户信息
        return await getTenant(data.tenantId)

      case 'getRestaurants':
        // 获取租户下的餐厅列表
        return await getRestaurants(data.tenantId, data.restaurantId)

      case 'createTenant':
        // 创建租户
        return await createTenant(data)

      case 'createRestaurant':
        // 创建餐厅
        return await createRestaurant(data)

      case 'updateRestaurant':
        // 更新餐厅信息
        return await updateRestaurant(data.restaurantId, data)

      case 'getRestaurantData':
        // 根据restaurantId获取餐厅相关数据（菜单、订单等）
        return await getRestaurantData(data)

      case 'init':
        // 初始化租户和餐厅数据
        const initScript = require('./init-tenant-data')
        return await initScript.main(event, context)

      case 'addXiaopingguo':
        // 添加"小苹果"租户
        const addScript = require('./add-xiaopingguo-tenant')
        return await addScript.main(event, context)

      default:
        return {
          success: false,
          error: '未知操作',
        }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      error: error.message || '操作失败',
    }
  }
}

/**
 * 获取租户信息
 */
async function getTenant(tenantId) {
  const result = await db.collection('tenants').doc(tenantId).get()
  if (result.data) {
    // 获取该租户下的所有餐厅
    const restaurants = await db
      .collection('restaurants')
      .where({
        tenantId: tenantId,
      })
      .get()

    return {
      success: true,
      data: {
        ...result.data,
        restaurants: restaurants.data || [],
      },
    }
  }
  return {
    success: false,
    error: '租户不存在',
  }
}

/**
 * 获取餐厅列表
 */
async function getRestaurants(tenantId, restaurantId) {
  let query = db.collection('restaurants').where({
    tenantId: tenantId,
  })

  if (restaurantId) {
    query = query.where({
      _id: restaurantId,
    })
  }

  const result = await query.get()
  return {
    success: true,
    data: result.data || [],
  }
}

/**
 * 创建租户
 */
async function createTenant(data) {
  const tenantData = {
    name: data.name,
    contactName: data.contactName || '',
    contactPhone: data.contactPhone || '',
    contactEmail: data.contactEmail || '',
    status: 'active',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }

  const result = await db.collection('tenants').add({
    data: tenantData,
  })

  return {
    success: true,
    data: {
      _id: result._id,
      ...tenantData,
    },
  }
}

/**
 * 创建餐厅
 */
async function createRestaurant(data) {
  const restaurantData = {
    tenantId: data.tenantId,
    name: data.name,
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    status: 'active',
    certificationLevel: null,
    certificationStatus: 'none',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }

  const result = await db.collection('restaurants').add({
    data: restaurantData,
  })

  return {
    success: true,
    data: {
      _id: result._id,
      ...restaurantData,
    },
  }
}

/**
 * 更新餐厅信息
 */
async function updateRestaurant(restaurantId, data) {
  const updateData = {
    ...data,
    updatedAt: db.serverDate(),
  }
  delete updateData.restaurantId

  await db.collection('restaurants').doc(restaurantId).update({
    data: updateData,
  })

  const result = await db.collection('restaurants').doc(restaurantId).get()
  return {
    success: true,
    data: result.data,
  }
}

/**
 * 根据restaurantId获取餐厅相关数据
 */
async function getRestaurantData(data) {
  const { restaurantId, dataType, startDate, endDate, page = 1, pageSize = 20 } = data

  if (!restaurantId) {
    return {
      success: false,
      error: 'restaurantId不能为空',
    }
  }

  const result = {
    restaurantId,
    data: {},
  }

  // 根据数据类型返回不同的数据
  switch (dataType) {
    case 'menu':
      // 获取菜单数据
      const menuQuery = db.collection('menu_items').where({
        restaurantId: restaurantId,
      })
      if (startDate || endDate) {
        // 可以添加日期筛选
      }
      const menuResult = await menuQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      result.data.menu = menuResult.data || []
      break

    case 'order':
      // 获取订单数据
      const orderQuery = db.collection('orders').where({
        restaurantId: restaurantId,
      })
      if (startDate) {
        orderQuery.where({
          orderDate: db.command.gte(startDate),
        })
      }
      if (endDate) {
        orderQuery.where({
          orderDate: db.command.lte(endDate),
        })
      }
      const orderResult = await orderQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      result.data.orders = orderResult.data || []
      break

    case 'recipe':
      // 获取菜谱数据
      const recipeQuery = db.collection('recipes').where({
        restaurantId: restaurantId,
      })
      const recipeResult = await recipeQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      result.data.recipes = recipeResult.data || []
      break

    case 'carbon':
      // 获取碳足迹数据
      const carbonQuery = db.collection('carbon_footprints').where({
        restaurantId: restaurantId,
      })
      if (startDate || endDate) {
        // 可以添加日期筛选
      }
      const carbonResult = await carbonQuery
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      result.data.carbon = carbonResult.data || []
      break

    case 'all':
      // 获取所有类型的数据
      const [menuRes, orderRes, recipeRes, carbonRes] = await Promise.all([
        db.collection('menu_items').where({ restaurantId: restaurantId }).get(),
        db.collection('orders').where({ restaurantId: restaurantId }).get(),
        db.collection('recipes').where({ restaurantId: restaurantId }).get(),
        db.collection('carbon_footprints').where({ restaurantId: restaurantId }).get(),
      ])
      result.data = {
        menu: menuRes.data || [],
        orders: orderRes.data || [],
        recipes: recipeRes.data || [],
        carbon: carbonRes.data || [],
      }
      break

    default:
      return {
        success: false,
        error: '不支持的数据类型',
      }
  }

  return {
    success: true,
    data: result.data,
  }
}

