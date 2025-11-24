/**
 * 批量迁移脚本：将所有供应商关联到"素喜悦"餐厅
 * 
 * 使用方法：
 * 1. 确保已登录 tcb CLI: tcb login
 * 2. 运行脚本: node scripts/migrate-suppliers-to-restaurant.js
 * 
 * 或者通过云开发控制台调用：
 * - 云函数: supplier-manage
 * - Action: batchAssociateRestaurant
 * - 参数: { "action": "batchAssociateRestaurant", "restaurantId": "caed3c76691d1262007f0bc3128b940d" }
 */

const { execSync } = require('child_process');
const path = require('path');

const RESTAURANT_ID = 'caed3c76691d1262007f0bc3128b940d';
const ENV_ID = 'my-garden-app-env-4e0h762923be2f';

console.log('========================================');
console.log('批量迁移：将所有供应商关联到"素喜悦"餐厅');
console.log('========================================\n');
console.log(`餐厅ID: ${RESTAURANT_ID}`);
console.log(`环境ID: ${ENV_ID}\n`);

try {
  // 构建调用参数（bypassAuth用于绕过权限检查，仅用于数据迁移）
  const eventData = JSON.stringify({
    action: 'batchAssociateRestaurant',
    restaurantId: RESTAURANT_ID,
    bypassAuth: true  // 绕过权限检查，仅用于一次性数据迁移
  });

  console.log('正在调用云函数...\n');
  
  // 调用云函数
  const result = execSync(
    `tcb fn invoke supplier-manage -e ${ENV_ID} --params '${eventData}'`,
    { 
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..')
    }
  );

  console.log('调用结果:');
  console.log(result);
  
  // 尝试解析JSON结果
  try {
    const lines = result.split('\n');
    const jsonLine = lines.find(line => line.trim().startsWith('{'));
    if (jsonLine) {
      const parsed = JSON.parse(jsonLine);
      console.log('\n迁移统计:');
      console.log(`- 总供应商数: ${parsed.data?.total || 0}`);
      console.log(`- 已更新: ${parsed.data?.updated || 0}`);
      console.log(`- 已跳过: ${parsed.data?.skipped || 0}`);
      if (parsed.data?.errors && parsed.data.errors.length > 0) {
        console.log(`- 错误数: ${parsed.data.errors.length}`);
        console.log('错误详情:', parsed.data.errors);
      }
    }
  } catch (e) {
    // 如果无法解析JSON，直接输出原始结果
  }
  
} catch (error) {
  console.error('调用失败:', error.message);
  console.error('\n请确保:');
  console.error('1. 已安装并配置 tcb CLI');
  console.error('2. 已登录: tcb login');
  console.error('3. 云函数已部署: tcb fn deploy supplier-manage');
  console.error('\n或者通过云开发控制台手动调用:');
  console.error(`- 云函数: supplier-manage`);
  console.error(`- Action: batchAssociateRestaurant`);
  console.error(`- 参数: ${JSON.stringify({ action: 'batchAssociateRestaurant', restaurantId: RESTAURANT_ID }, null, 2)}`);
  process.exit(1);
}

