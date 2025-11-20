#!/bin/bash

# 为所有食材添加初始碳系数
# 使用方法: ./scripts/migrate-ingredients-carbon-coefficient.sh

set -e

ENV_ID=${CLOUDBASE_ENVID:-my-garden-app-env-4e0h762923be2f}

echo "=========================================="
echo "为所有食材添加初始碳系数"
echo "=========================================="
echo ""
echo "环境ID: $ENV_ID"
echo ""

# 调用云函数执行迁移
tcb fn invoke database \
  -e $ENV_ID \
  --params '{"action":"migrate-ingredients-add-carbon-coefficient"}'

echo ""
echo "✅ 迁移完成！"
echo ""
echo "说明："
echo "  - 根据食材分类设置默认碳系数"
echo "  - 只更新没有碳系数的食材"
echo "  - 已存在的碳系数不会被覆盖"

