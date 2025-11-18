#!/bin/bash

# 为"素开心"和"素欢乐"餐厅插入测试数据
# 
# 使用方法：
# chmod +x scripts/insert-restaurant-test-data.sh
# ./scripts/insert-restaurant-test-data.sh

echo "=========================================="
echo "开始为餐厅插入测试数据..."
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

echo "📦 调用云函数插入测试数据..."
echo ""

# 调用云函数
tcb fn invoke database \
  --params '{"action":"insertRestaurantTestData"}' \
  --envId "$ENV_ID"

echo ""
echo "=========================================="
echo "执行完成！"
echo "=========================================="
echo ""
echo "💡 提示："
echo "  - 可以在云开发控制台查看插入的数据"
echo "  - 数据库集合：restaurant_orders, restaurant_reviews, restaurant_campaigns, restaurant_behavior_metrics"
echo "  - 详细说明请查看：cloudfunctions/database/插入餐厅测试数据-使用指南.md"
echo ""

