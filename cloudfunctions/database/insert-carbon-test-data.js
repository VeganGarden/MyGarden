const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/**
 * 为 orange 租户的餐厅插入菜单碳足迹和订单碳足迹示例数据
 */
exports.main = async (event) => {
  const { tenantId = 'b487119d691c1961007bd4bd7e97de78' } = event

  try {
    console.log('开始为 orange 租户插入碳足迹示例数据...')
    console.log('租户ID:', tenantId)

    // 1. 查找 orange 租户下的餐厅
    const restaurantsResult = await db
      .collection('restaurants')
      .where({
        tenantId: tenantId,
      })
      .get()

    if (!restaurantsResult.data || restaurantsResult.data.length === 0) {
      return {
        code: 404,
        message: '未找到该租户下的餐厅',
      }
    }

    const restaurants = restaurantsResult.data
    console.log(`找到 ${restaurants.length} 家餐厅`)

    const results = {
      menuItems: 0,
      orders: 0,
      restaurants: [],
    }

    // 2. 为每家餐厅插入数据
    for (const restaurant of restaurants) {
      const restaurantId = restaurant._id || restaurant.id
      const restaurantName = restaurant.name || '未知餐厅'

      console.log(`\n处理餐厅: ${restaurantName} (${restaurantId})`)

      // 2.1 插入菜单碳足迹数据
      const menuItems = generateMenuItems(restaurantId, restaurantName)
      let menuCount = 0

      for (const menuItem of menuItems) {
        try {
          // 尝试插入到 restaurant_menu_items 集合
          await db.collection('restaurant_menu_items').add({
            data: menuItem,
          })
          menuCount++
        } catch (error) {
          console.log(`插入菜单项失败，尝试其他集合:`, error.message)
          // 如果失败，尝试插入到 menu_items 集合
          try {
            await db.collection('menu_items').add({
              data: menuItem,
            })
            menuCount++
          } catch (err) {
            console.error(`插入菜单项到 menu_items 也失败:`, err.message)
          }
        }
      }

      // 2.2 插入订单碳足迹数据
      const orders = generateOrders(restaurantId, restaurantName)
      let orderCount = 0

      for (const order of orders) {
        try {
          await db.collection('restaurant_orders').add({
            data: order,
          })
          orderCount++
        } catch (error) {
          console.error(`插入订单失败:`, error.message)
        }
      }

      results.menuItems += menuCount
      results.orders += orderCount
      results.restaurants.push({
        name: restaurantName,
        id: restaurantId,
        menuItems: menuCount,
        orders: orderCount,
      })

      console.log(`  ✓ 菜单项: ${menuCount} 条`)
      console.log(`  ✓ 订单: ${orderCount} 条`)
    }

    return {
      code: 0,
      message: '碳足迹示例数据插入成功',
      data: results,
    }
  } catch (error) {
    console.error('插入碳足迹示例数据失败:', error)
    return {
      code: 500,
      message: '插入失败',
      error: error.message,
    }
  }
}

/**
 * 生成菜单项数据
 */
function generateMenuItems(restaurantId, restaurantName) {
  const dishes = [
    {
      name: '素炒时蔬',
      carbonFootprint: 0.15,
      carbonLevel: 'ultra_low',
      carbonScore: 95,
      ingredients: '小白菜、胡萝卜、豆芽、蒜',
    },
    {
      name: '清蒸豆腐',
      carbonFootprint: 0.25,
      carbonLevel: 'low',
      carbonScore: 88,
      ingredients: '嫩豆腐、香菇、葱花',
    },
    {
      name: '素三鲜饺子',
      carbonFootprint: 0.45,
      carbonLevel: 'low',
      carbonScore: 82,
      ingredients: '面粉、韭菜、鸡蛋、虾皮',
    },
    {
      name: '麻婆豆腐',
      carbonFootprint: 0.65,
      carbonLevel: 'medium',
      carbonScore: 75,
      ingredients: '豆腐、豆瓣酱、花椒、辣椒',
    },
    {
      name: '素炒面',
      carbonFootprint: 0.55,
      carbonLevel: 'medium',
      carbonScore: 78,
      ingredients: '面条、青菜、豆芽、胡萝卜丝',
    },
    {
      name: '素包子',
      carbonFootprint: 0.35,
      carbonLevel: 'low',
      carbonScore: 85,
      ingredients: '面粉、白菜、香菇、粉丝',
    },
    {
      name: '素汤',
      carbonFootprint: 0.18,
      carbonLevel: 'ultra_low',
      carbonScore: 92,
      ingredients: '冬瓜、海带、豆腐',
    },
    {
      name: '素炒饭',
      carbonFootprint: 0.48,
      carbonLevel: 'medium',
      carbonScore: 80,
      ingredients: '米饭、鸡蛋、胡萝卜、青豆',
    },
    {
      name: '凉拌黄瓜',
      carbonFootprint: 0.12,
      carbonLevel: 'ultra_low',
      carbonScore: 96,
      ingredients: '黄瓜、蒜、醋、香油',
    },
    {
      name: '素春卷',
      carbonFootprint: 0.42,
      carbonLevel: 'low',
      carbonScore: 83,
      ingredients: '春卷皮、豆芽、胡萝卜、香菇',
    },
  ]

  return dishes.map((dish, index) => ({
    restaurantId: restaurantId,
    name: dish.name,
    dishName: dish.name,
    carbonFootprint: dish.carbonFootprint,
    carbon_footprint: dish.carbonFootprint,
    carbonLevel: dish.carbonLevel,
    carbon_level: dish.carbonLevel,
    carbonScore: dish.carbonScore,
    carbon_score: dish.carbonScore,
    ingredients: dish.ingredients,
    ingredient_list: dish.ingredients,
    status: 'published',
    createdAt: new Date(Date.now() - (dishes.length - index) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }))
}

/**
 * 生成订单数据
 */
function generateOrders(restaurantId, restaurantName) {
  const orders = []
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // 生成最近30天的订单
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    // 每天生成1-5个订单
    const orderCount = Math.floor(Math.random() * 5) + 1

    for (let j = 0; j < orderCount; j++) {
      const orderAmount = Math.floor(Math.random() * 200) + 30 // 30-230元
      const totalCarbon = (orderAmount / 100) * (0.3 + Math.random() * 0.4) // 0.3-0.7 kg CO₂e per 100元
      const carbonReduction = totalCarbon * (0.15 + Math.random() * 0.25) // 15-40% 减排

      const orderNo = `ORD${dateStr.replace(/-/g, '')}${String(j + 1).padStart(3, '0')}`

      orders.push({
        restaurantId: restaurantId,
        orderNo: orderNo,
        order_no: orderNo,
        orderDate: dateStr,
        order_date: dateStr,
        totalCarbon: parseFloat(totalCarbon.toFixed(2)),
        total_carbon: parseFloat(totalCarbon.toFixed(2)),
        carbonReduction: parseFloat(carbonReduction.toFixed(2)),
        carbon_reduction: parseFloat(carbonReduction.toFixed(2)),
        orderAmount: orderAmount,
        order_amount: orderAmount,
        totalAmount: orderAmount,
        status: ['pending', 'completed', 'cancelled'][Math.floor(Math.random() * 3)],
        createdAt: new Date(date.getTime() + j * 60000).toISOString(),
        createTime: new Date(date.getTime() + j * 60000).toISOString(),
      })
    }
  }

  return orders
}



