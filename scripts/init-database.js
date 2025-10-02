const path = require('path')
const cloud = require(path.join(__dirname, '../cloudfunctions/node_modules/wx-server-sdk'))

/**
 * 数据库初始化脚本
 * 用于在云开发环境中创建必要的集合和索引
 */
async function initDatabase() {
  try {
    // 初始化云开发环境
    cloud.init({
      env: cloud.DYNAMIC_CURRENT_ENV
    })
    
    const db = cloud.database()
    
    console.log('开始初始化数据库...')
    
    // 创建用户集合
    try {
      await db.createCollection('users')
      console.log('✅ 用户集合创建成功')
      
      // 创建用户集合索引
      await db.collection('users').createIndex({
        name: 'openid_index',
        key: {
          openid: 1
        },
        unique: true
      })
      console.log('✅ 用户集合索引创建成功')
    } catch (error) {
      console.log('ℹ️ 用户集合可能已存在')
    }
    
    // 创建花园集合
    try {
      await db.createCollection('gardens')
      console.log('✅ 花园集合创建成功')
      
      // 创建花园集合索引
      await db.collection('gardens').createIndex({
        name: 'userid_index',
        key: {
          userId: 1
        },
        unique: true
      })
      console.log('✅ 花园集合索引创建成功')
    } catch (error) {
      console.log('ℹ️ 花园集合可能已存在')
    }
    
    // 创建餐食记录集合
    try {
      await db.createCollection('meals')
      console.log('✅ 餐食记录集合创建成功')
      
      // 创建餐食记录集合索引
      await db.collection('meals').createIndex({
        name: 'user_date_index',
        key: {
          userId: 1,
          recordedAt: -1
        }
      })
      console.log('✅ 餐食记录集合索引创建成功')
    } catch (error) {
      console.log('ℹ️ 餐食记录集合可能已存在')
    }
    
    // 创建碳足迹统计集合
    try {
      await db.createCollection('carbon_stats')
      console.log('✅ 碳足迹统计集合创建成功')
      
      // 创建碳足迹统计集合索引
      await db.collection('carbon_stats').createIndex({
        name: 'user_period_index',
        key: {
          userId: 1,
          period: 1
        },
        unique: true
      })
      console.log('✅ 碳足迹统计集合索引创建成功')
    } catch (error) {
      console.log('ℹ️ 碳足迹统计集合可能已存在')
    }
    
    console.log('🎉 数据库初始化完成！')
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}

// 如果是直接运行此脚本
if (require.main === module) {
  initDatabase().catch(console.error)
}

module.exports = initDatabase