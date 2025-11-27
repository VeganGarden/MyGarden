#!/bin/bash

# 素食人员管理模块测试数据插入脚本
# 
# 使用方法：
# chmod +x scripts/insert-vegetarian-personnel-test-data.sh
# ./scripts/insert-vegetarian-personnel-test-data.sh [staffCount] [customerCount] [restaurantId] [tenantId]
#
# 参数说明：
#   staffCount (可选): 要插入的员工数量，默认 10
#   customerCount (可选): 要插入的客户数量，默认 20
#   restaurantId (可选): 指定餐厅ID，如果不提供则查找"素开心"和"素欢乐"餐厅
#   tenantId (可选): 指定租户ID，如果不提供则从餐厅数据中获取

set -e

echo "=========================================="
echo "素食人员管理模块 - 插入测试数据"
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

# 参数
STAFF_COUNT=${1:-10}
CUSTOMER_COUNT=${2:-20}
RESTAURANT_ID=${3:-""}
TENANT_ID=${4:-""}

echo "📋 配置："
echo "   - 环境ID: $ENV_ID"
echo "   - 员工数量: $STAFF_COUNT"
echo "   - 客户数量: $CUSTOMER_COUNT"
if [ -n "$RESTAURANT_ID" ]; then
    echo "   - 餐厅ID: $RESTAURANT_ID"
fi
if [ -n "$TENANT_ID" ]; then
    echo "   - 租户ID: $TENANT_ID"
fi
echo ""

# 构建参数JSON
PARAMS="{\"staffCount\":$STAFF_COUNT,\"customerCount\":$CUSTOMER_COUNT"
if [ -n "$RESTAURANT_ID" ]; then
    PARAMS="$PARAMS,\"restaurantId\":\"$RESTAURANT_ID\""
fi
if [ -n "$TENANT_ID" ]; then
    PARAMS="$PARAMS,\"tenantId\":\"$TENANT_ID\""
fi
PARAMS="$PARAMS}"

echo "📦 调用云函数插入测试数据..."
echo ""

# 调用云函数
tcb fn invoke database \
  --params "$PARAMS" \
  --envId "$ENV_ID"

echo ""
echo "=========================================="
echo "执行完成！"
echo "=========================================="
echo ""
echo "💡 提示："
echo "  - 可以在云开发控制台查看插入的数据"
echo "  - 数据库集合：restaurant_staff, restaurant_customers"
echo "  - 如果需要插入更多数据，可以重新运行此脚本"
echo ""

