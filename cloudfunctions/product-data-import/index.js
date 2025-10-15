/**
 * 商品数据导入云函数 - v3.0
 * 
 * 功能: 导入九悦素供的商品数据到 products 集合
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 引入示例数据
const sampleProducts = require('./sample-products.json');

exports.main = async (event, context) => {
  const { products = sampleProducts, mode = 'sample' } = event;
  
  console.log(`开始导入商品数据 - 模式: ${mode}, 数量: ${products.length}`);
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  try {
    for (const product of products) {
      try {
        // 检查商品是否已存在
        const existing = await db.collection('products')
          .where({ productId: product.productId })
          .get();
        
        if (existing.data.length > 0) {
          console.log(`商品 ${product.productId} 已存在,跳过`);
          results.push({
            productId: product.productId,
            status: 'skipped',
            message: '商品已存在'
          });
          continue;
        }
        
        // 添加时间戳
        const productData = {
          ...product,
          createdAt: new Date(),
          updatedAt: new Date(),
          onShelfAt: new Date()
        };
        
        // 插入数据
        await db.collection('products').add({
          data: productData
        });
        
        console.log(`✓ 商品 ${product.productId} 导入成功`);
        successCount++;
        
        results.push({
          productId: product.productId,
          name: product.name,
          status: 'success',
          message: '导入成功'
        });
        
      } catch (error) {
        console.error(`✗ 商品 ${product.productId} 导入失败:`, error.message);
        failCount++;
        
        results.push({
          productId: product.productId,
          status: 'failed',
          message: error.message
        });
      }
    }
    
    // 同步更新库存表
    console.log('\n同步创建库存记录...');
    await syncInventory(products.filter((p, i) => results[i].status === 'success'));
    
    console.log(`\n导入完成: 成功 ${successCount}, 失败 ${failCount}`);
    
    return {
      code: 0,
      message: '商品数据导入完成',
      summary: {
        total: products.length,
        success: successCount,
        failed: failCount
      },
      results
    };
    
  } catch (error) {
    console.error('导入失败:', error);
    return {
      code: 500,
      message: '导入失败',
      error: error.message,
      results
    };
  }
};

/**
 * 同步创建库存记录
 */
async function syncInventory(products) {
  for (const product of products) {
    try {
      for (const spec of product.specs) {
        await db.collection('inventory').add({
          data: {
            productId: product.productId,
            specId: spec.specId,
            stock: {
              available: spec.stock,
              locked: 0,
              inbound: 0,
              damaged: 0,
              total: spec.stock
            },
            alert: {
              minStock: 50,
              maxStock: 1000,
              reorderPoint: 100,
              isLowStock: spec.stock < 100,
              isOutOfStock: spec.stock === 0
            },
            smartRestock: {
              upcomingSolarTermDemand: {
                solarTerm: null,
                predictedSales: 0,
                suggestedRestock: 0
              },
              targetUserCount: 0,
              conversionRate: 0.05,
              avgPurchaseQuantity: 1
            },
            supplier: {
              supplierId: 'SUPPLIER-001',
              supplierName: '九悦供应链',
              leadTime: 3,
              minOrderQuantity: 100
            },
            updatedAt: new Date()
          }
        });
      }
      
      console.log(`✓ 商品 ${product.productId} 库存创建成功`);
      
    } catch (error) {
      console.error(`✗ 商品 ${product.productId} 库存创建失败:`, error.message);
    }
  }
}

