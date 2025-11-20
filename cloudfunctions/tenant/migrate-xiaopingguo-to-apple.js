/**
 * 将"小苹果"租户的菜谱数据迁移到"apple"账号
 * 
 * 此脚本用于：
 * 1. 查找"素开心"和"素欢乐"餐厅（可能已经转移到"apple"租户）
 * 2. 查找这些餐厅下的所有菜谱数据
 * 3. 将菜谱数据转移到"apple"租户
 * 4. 更新菜谱的 tenantId 和 restaurantId
 * 
 * 使用方法：
 * 在云开发控制台 -> 云函数 -> tenant -> 在线编辑
 * 调用云函数，action 设置为 "migrateXiaopingguoToApple"
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

/**
 * 迁移"小苹果"租户的菜谱数据到"apple"账号
 */
async function migrateXiaopingguoToApple() {
  try {
    console.log('===== 开始迁移"小苹果"租户的菜谱数据到"apple"账号 =====\n')

    const targetTenantId = 'tenant_apple'
    // 需要迁移的餐厅名称
    const restaurantNames = ['素开心', '素欢乐']
    // 可能的旧餐厅ID
    const oldRestaurantIds = ['restaurant_sukuaixin', 'restaurant_suhuanle']

    // 1. 查找或确认目标租户"apple"
    console.log('[1/5] 查找目标租户"apple"...')
    let targetTenant = null
    try {
      const targetTenantResult = await db.collection('tenants').doc(targetTenantId).get()
      if (targetTenantResult.data) {
        targetTenant = targetTenantResult.data
        console.log('✅ 目标租户已存在:', targetTenant.name)
      }
    } catch (error) {
      // 租户不存在
    }

    if (!targetTenant) {
      return {
        success: false,
        message: '未找到"apple"租户，请先创建该租户',
        error: '目标租户不存在'
      }
    }

    // 2. 查找所有名为"素开心"和"素欢乐"的餐厅（不管在哪个租户下）
    console.log('\n[2/5] 查找餐厅（所有租户）...')
    
    // 先尝试通过旧餐厅ID查找
    const restaurantsById = []
    for (const oldId of oldRestaurantIds) {
      try {
        const restaurant = await db.collection('restaurants').doc(oldId).get()
        if (restaurant.data) {
          restaurantsById.push(restaurant.data)
          console.log(`✅ 找到餐厅（通过ID）: ${oldId} - ${restaurant.data.name}`)
        }
      } catch (error) {
        // 餐厅不存在
      }
    }
    
    // 通过名称查找所有匹配的餐厅
    const restaurantsByName = await db.collection('restaurants')
      .where({
        name: _.in(restaurantNames)
      })
      .get()
    
    // 合并结果，去重
    const allRestaurants = []
    const restaurantIdSet = new Set()
    
    for (const restaurant of restaurantsById) {
      if (!restaurantIdSet.has(restaurant._id)) {
        allRestaurants.push(restaurant)
        restaurantIdSet.add(restaurant._id)
      }
    }
    
    for (const restaurant of restaurantsByName.data || []) {
      if (!restaurantIdSet.has(restaurant._id)) {
        allRestaurants.push(restaurant)
        restaurantIdSet.add(restaurant._id)
      }
    }
    
    if (allRestaurants.length === 0) {
      return {
        success: false,
        message: '未找到"素开心"和"素欢乐"餐厅',
        error: '餐厅不存在'
      }
    }

    console.log(`✅ 找到 ${allRestaurants.length} 个餐厅:`)
    const restaurantNameToId = {}
    const restaurantIdToName = {}
    
    for (const restaurant of allRestaurants) {
      console.log(`  - ${restaurant.name} (ID: ${restaurant._id}, 租户: ${restaurant.tenantId || '未知'})`)
      restaurantNameToId[restaurant.name] = restaurant._id
      restaurantIdToName[restaurant._id] = restaurant.name
    }

    // 3. 将餐厅转移到"apple"租户（如果还没有）
    console.log('\n[3/5] 确保餐厅在"apple"租户下...')
    const targetRestaurants = []
    const restaurantMapping = {}
    
    for (const restaurant of allRestaurants) {
      // 如果餐厅不在目标租户下，更新它
      if (restaurant.tenantId !== targetTenantId) {
        console.log(`  更新餐厅 ${restaurant.name} 的租户: ${restaurant.tenantId} -> ${targetTenantId}`)
        try {
          await db.collection('restaurants').doc(restaurant._id).update({
            data: {
              tenantId: targetTenantId,
              updatedAt: new Date(),
            }
          })
          console.log(`  ✅ 已更新餐厅租户: ${restaurant.name}`)
        } catch (error) {
          console.error(`  ❌ 更新餐厅租户失败: ${error.message}`)
        }
      }
      
      targetRestaurants.push(restaurant)
      
      // 建立映射：旧餐厅ID -> 新餐厅ID（如果ID不同，使用当前ID）
      if (restaurant.name === '素开心' && oldRestaurantIds.includes('restaurant_sukuaixin')) {
        restaurantMapping['restaurant_sukuaixin'] = restaurant._id
        console.log(`✅ 映射: restaurant_sukuaixin -> ${restaurant._id} (素开心)`)
      }
      if (restaurant.name === '素欢乐' && oldRestaurantIds.includes('restaurant_suhuanle')) {
        restaurantMapping['restaurant_suhuanle'] = restaurant._id
        console.log(`✅ 映射: restaurant_suhuanle -> ${restaurant._id} (素欢乐)`)
      }
    }

    if (Object.keys(restaurantMapping).length === 0) {
      // 如果无法通过旧ID映射，直接使用当前餐厅ID
      for (const restaurant of targetRestaurants) {
        if (restaurant.name === '素开心') {
          restaurantMapping['restaurant_sukuaixin'] = restaurant._id
        }
        if (restaurant.name === '素欢乐') {
          restaurantMapping['restaurant_suhuanle'] = restaurant._id
        }
      }
    }

    // 4. 迁移菜谱数据
    console.log('\n[4/5] 迁移菜谱数据...')
    const migrationSummary = {
      recipes: { total: 0, migrated: 0, failed: 0 },
      otherCollections: {}
    }

    // 迁移 recipes 集合中的菜谱
    const pageSize = 100
    let totalRecipes = 0
    let migratedRecipes = 0
    let failedRecipes = 0

    // 使用 Set 来去重，避免重复处理
    const processedRecipeIds = new Set()

    // 通过旧餐厅ID查询菜谱（因为菜谱可能还关联着旧的餐厅ID）
    const sourceRestaurantIds = Object.keys(restaurantMapping)
    console.log(`  查询关联旧餐厅ID的菜谱: ${sourceRestaurantIds.join(', ')}`)
    
    for (const sourceRestaurantId of sourceRestaurantIds) {
      const targetRestaurantId = restaurantMapping[sourceRestaurantId]
      console.log(`\n  处理餐厅: ${sourceRestaurantId} -> ${targetRestaurantId}`)
      
      let skip = 0
      let hasMore = true
      
      while (hasMore) {
        // 查询关联该旧餐厅ID的菜谱
        const recipesByRestaurant = await db.collection('recipes')
          .where({ restaurantId: sourceRestaurantId })
          .skip(skip)
          .limit(pageSize)
          .get()

        const recipeList = recipesByRestaurant.data || []
        if (recipeList.length === 0) {
          hasMore = false
          break
        }

        console.log(`    找到 ${recipeList.length} 条菜谱记录`)

        for (const recipe of recipeList) {
          if (processedRecipeIds.has(recipe._id)) {
            console.log(`    跳过已处理的菜谱: ${recipe._id}`)
            continue
          }
          processedRecipeIds.add(recipe._id)
          totalRecipes++

          try {
            const updateData = {
              tenantId: targetTenantId,
              restaurantId: targetRestaurantId,
              updatedAt: new Date(),
            }

            await db.collection('recipes').doc(recipe._id).update({
              data: updateData,
            })
            migratedRecipes++
            console.log(`    ✅ 迁移菜谱: ${recipe.name || recipe._id}`)
          } catch (error) {
            console.error(`    ❌ 迁移菜谱失败 ${recipe._id}:`, error.message)
            failedRecipes++
          }
        }

        skip += pageSize
        hasMore = recipeList.length === pageSize
      }
    }

    // 也查询通过 tenantId 关联的菜谱（处理可能使用旧租户ID的情况）
    const sourceTenantId = 'tenant_xiaopingguo'
    console.log(`\n  查询关联旧租户ID的菜谱: ${sourceTenantId}`)
    let skip = 0
    let hasMore = true
    
    while (hasMore) {
      const recipesByTenant = await db.collection('recipes')
        .where({ tenantId: sourceTenantId })
        .skip(skip)
        .limit(pageSize)
        .get()

      const recipeList = recipesByTenant.data || []
      if (recipeList.length === 0) {
        hasMore = false
        break
      }

      console.log(`    找到 ${recipeList.length} 条菜谱记录`)

      for (const recipe of recipeList) {
        if (processedRecipeIds.has(recipe._id)) {
          console.log(`    跳过已处理的菜谱: ${recipe._id}`)
          continue
        }
        processedRecipeIds.add(recipe._id)
        totalRecipes++

        try {
          const updateData = {
            tenantId: targetTenantId,
            updatedAt: new Date(),
          }

          // 如果菜谱有 restaurantId，尝试映射到新餐厅ID
          if (recipe.restaurantId && restaurantMapping[recipe.restaurantId]) {
            updateData.restaurantId = restaurantMapping[recipe.restaurantId]
          } else if (recipe.restaurantId) {
            // 如果餐厅ID不在映射中，根据餐厅名称或ID查找
            const targetRestaurant = targetRestaurants.find(
              r => r.name === recipe.restaurantId || r._id === recipe.restaurantId
            )
            if (targetRestaurant) {
              updateData.restaurantId = targetRestaurant._id
            }
          }

          await db.collection('recipes').doc(recipe._id).update({
            data: updateData,
          })
          migratedRecipes++
          console.log(`    ✅ 迁移菜谱: ${recipe.name || recipe._id}`)
        } catch (error) {
          console.error(`    ❌ 迁移菜谱失败 ${recipe._id}:`, error.message)
          failedRecipes++
        }
      }

      skip += pageSize
      hasMore = recipeList.length === pageSize
    }

    migrationSummary.recipes = {
      total: totalRecipes,
      migrated: migratedRecipes,
      failed: failedRecipes
    }

    console.log(`\n✅ 菜谱迁移完成: 总计 ${totalRecipes} 条，成功 ${migratedRecipes} 条，失败 ${failedRecipes} 条`)

    // 5. 完成迁移（不删除数据，因为餐厅已经转移）
    console.log('\n[5/5] 迁移完成')
    console.log('\n===== 迁移完成 =====')
    console.log(`\n✅ 目标租户ID: ${targetTenantId}`)
    console.log(`✅ 目标餐厅数量: ${targetRestaurants.length}`)
    console.log(`✅ 迁移菜谱数量: ${migratedRecipes}/${totalRecipes}`)
    console.log('\n📝 注意: 餐厅数据已转移到"apple"租户')

    return {
      success: true,
      message: '迁移完成',
      data: {
        targetTenantId,
        targetRestaurantIds: targetRestaurants.map(r => r._id),
        restaurantMapping,
        migrationSummary,
      },
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    return {
      success: false,
      message: '迁移失败',
      error: error.message || '未知错误',
    }
  }
}

// 如果作为云函数调用
exports.main = async (event, context) => {
  return await migrateXiaopingguoToApple()
}

// 如果直接运行（用于测试）
if (require.main === module) {
  migrateXiaopingguoToApple()
    .then((result) => {
      console.log('\n执行结果:', JSON.stringify(result, null, 2))
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('执行失败:', error)
      process.exit(1)
    })
}

