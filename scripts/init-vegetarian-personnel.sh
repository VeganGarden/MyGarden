#!/bin/bash

# 素食人员管理模块数据库初始化脚本
# 
# 使用方法：
# chmod +x scripts/init-vegetarian-personnel.sh
# ./scripts/init-vegetarian-personnel.sh

set -e

echo "=========================================="
echo "素食人员管理模块 - 数据库初始化"
echo "=========================================="
echo ""

# 检查是否安装了 tcb-cli
if ! command -v tcb &> /dev/null; then
    echo "❌ 错误: 未安装 tcb-cli"
    echo "请先安装: npm install -g @cloudbase/cli"
    exit 1
fi

# 环境ID
ENV_ID="my-garden-app-env-4e0h762923be2f"

# 检查是否已登录
echo "检查云开发登录状态..."
if ! tcb login:check &> /dev/null; then
    echo "⚠️  未登录云开发，请先登录:"
    echo "   tcb login"
    exit 1
fi
echo "✅ 已登录云开发"
echo ""

# 1. 初始化数据库集合
echo "1. 初始化数据库集合..."
echo "   调用 database 云函数的 initVegetarianPersonnelCollections action..."
tcb fn invoke database \
  --params '{"action":"initVegetarianPersonnelCollections"}' \
  --envId "$ENV_ID" || {
    echo "⚠️  集合初始化失败，请检查云函数日志"
    exit 1
  }
echo "✅ 数据库集合初始化完成"
echo ""

# 2. 初始化权限配置
echo "2. 初始化权限配置..."
echo "   调用 database 云函数的 initVegetarianPersonnelPermissions action..."
tcb fn invoke database \
  --params '{"action":"initVegetarianPersonnelPermissions"}' \
  --envId "$ENV_ID" || {
    echo "⚠️  权限初始化失败，请检查云函数日志"
    exit 1
  }
echo "✅ 权限配置初始化完成"
echo ""

echo "=========================================="
echo "✅ 数据库初始化完成！"
echo "=========================================="
echo ""
echo "📋 下一步："
echo "1. 在云开发控制台手动创建索引（参考索引配置表.csv）"
echo "2. 验证集合是否创建成功"
echo "3. 验证权限配置是否正确"
echo ""
echo "💡 提示："
echo "  - 集合已创建：restaurant_staff, restaurant_customers, vegetarian_personnel_stats"
echo "  - 权限已配置：vegetarianPersonnel:view, vegetarianPersonnel:manage"
echo "  - 详细说明请查看：Docs/项目策划方案/素食人员/权限配置指南.md"
echo ""

