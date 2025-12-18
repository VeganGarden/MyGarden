/**
 * 初始化审核配置脚本
 * 为因子库和基准值创建审核配置
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 审核配置数据
 */
const approvalConfigs = [
  // 因子库创建审核配置
  {
    configId: 'carbon_factor_create',
    businessType: 'carbon_factor',
    operationType: 'create',
    name: '因子库创建审核',
    description: '因子库创建操作需要审核',
    flowType: 'sequential',
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '碳核算专员审核',
        nodeType: 'role',
        approverType: 'role',
        approverValue: 'carbon_specialist',
        order: 1,
        required: true,
        timeout: 24,
        notifyOnCreate: true,
        notifyOnTimeout: true
      }
    ],
    autoApprove: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    updatedBy: 'system'
  },
  // 因子库更新审核配置
  {
    configId: 'carbon_factor_update',
    businessType: 'carbon_factor',
    operationType: 'update',
    name: '因子库更新审核',
    description: '因子库更新操作需要审核',
    flowType: 'sequential',
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '碳核算专员审核',
        nodeType: 'role',
        approverType: 'role',
        approverValue: 'carbon_specialist',
        order: 1,
        required: true,
        timeout: 24,
        notifyOnCreate: true,
        notifyOnTimeout: true
      }
    ],
    autoApprove: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    updatedBy: 'system'
  },
  // 因子库归档审核配置
  {
    configId: 'carbon_factor_archive',
    businessType: 'carbon_factor',
    operationType: 'archive',
    name: '因子库归档审核',
    description: '因子库归档操作需要审核',
    flowType: 'sequential',
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '碳核算专员审核',
        nodeType: 'role',
        approverType: 'role',
        approverValue: 'carbon_specialist',
        order: 1,
        required: true,
        timeout: 24,
        notifyOnCreate: true,
        notifyOnTimeout: true
      }
    ],
    autoApprove: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    updatedBy: 'system'
  },
  // 基准值创建审核配置
  {
    configId: 'carbon_baseline_create',
    businessType: 'carbon_baseline',
    operationType: 'create',
    name: '基准值创建审核',
    description: '基准值创建操作需要审核',
    flowType: 'sequential',
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '碳核算专员审核',
        nodeType: 'role',
        approverType: 'role',
        approverValue: 'carbon_specialist',
        order: 1,
        required: true,
        timeout: 24,
        notifyOnCreate: true,
        notifyOnTimeout: true
      }
    ],
    autoApprove: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    updatedBy: 'system'
  },
  // 基准值更新审核配置
  {
    configId: 'carbon_baseline_update',
    businessType: 'carbon_baseline',
    operationType: 'update',
    name: '基准值更新审核',
    description: '基准值更新操作需要审核',
    flowType: 'sequential',
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '碳核算专员审核',
        nodeType: 'role',
        approverType: 'role',
        approverValue: 'carbon_specialist',
        order: 1,
        required: true,
        timeout: 24,
        notifyOnCreate: true,
        notifyOnTimeout: true
      }
    ],
    autoApprove: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    updatedBy: 'system'
  },
  // 基准值归档审核配置
  {
    configId: 'carbon_baseline_archive',
    businessType: 'carbon_baseline',
    operationType: 'archive',
    name: '基准值归档审核',
    description: '基准值归档操作需要审核',
    flowType: 'sequential',
    nodes: [
      {
        nodeId: 'node_1',
        nodeName: '碳核算专员审核',
        nodeType: 'role',
        approverType: 'role',
        approverValue: 'carbon_specialist',
        order: 1,
        required: true,
        timeout: 24,
        notifyOnCreate: true,
        notifyOnTimeout: true
      }
    ],
    autoApprove: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    updatedBy: 'system'
  }
];

/**
 * 主函数
 */
async function initApprovalConfigs() {
  console.log('========================================');
  console.log('开始初始化审核配置...');
  console.log('========================================\n');

  const results = [];

  for (const config of approvalConfigs) {
    try {
      // 检查配置是否已存在
      const existing = await db.collection('approval_configs')
        .where({
          configId: config.configId
        })
        .get();

      if (existing.data.length > 0) {
        console.log(`⚠  ${config.configId} 配置已存在，跳过插入`);
        results.push({
          configId: config.configId,
          status: 'exists',
          message: '配置已存在'
        });
        continue;
      }

      // 插入配置
      await db.collection('approval_configs').add({
        data: config
      });

      console.log(`✓ ${config.configId} 配置插入成功`);
      results.push({
        configId: config.configId,
        status: 'success',
        message: '插入成功'
      });
    } catch (error) {
      console.error(`✗ ${config.configId} 配置插入失败:`, error.message);
      results.push({
        configId: config.configId,
        status: 'failed',
        message: error.message
      });
    }
  }

  console.log('\n========================================');
  console.log('✅ 审核配置初始化完成！');
  console.log('========================================\n');

  const successCount = results.filter(r => r.status === 'success').length;
  const existsCount = results.filter(r => r.status === 'exists').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  console.log(`成功插入: ${successCount} 个配置`);
  console.log(`已存在: ${existsCount} 个配置`);
  console.log(`失败: ${failedCount} 个配置`);
  console.log('========================================\n');

  return {
    code: 0,
    message: '审核配置初始化完成',
    results,
    summary: {
      total: approvalConfigs.length,
      success: successCount,
      exists: existsCount,
      failed: failedCount
    }
  };
}

// 如果直接运行此脚本
if (require.main === module) {
  initApprovalConfigs()
    .then(result => {
      console.log('\n执行结果:', JSON.stringify(result, null, 2));
      process.exit(result.code || 0);
    })
    .catch(error => {
      console.error('执行失败:', error);
      process.exit(1);
    });
}

module.exports = { initApprovalConfigs };

