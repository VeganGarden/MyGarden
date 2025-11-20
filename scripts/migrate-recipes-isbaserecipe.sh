#!/bin/bash

# 食谱 isBaseRecipe 字段迁移脚本

ENV_ID="my-garden-app-env-4e0h762923be2f"

echo "================================"
echo "食谱 isBaseRecipe 字段迁移"
echo "================================"
echo ""

echo "正在调用 database 云函数执行迁移..."
echo ""

# 调用云函数
tcb fn invoke database \
  --envId $ENV_ID \
  --params '{"action":"migrate-recipes-add-isbaserecipe"}' \
  2>&1

echo ""
echo "================================"
echo "迁移完成"
echo "================================"
echo ""
echo "请检查返回结果，确认迁移是否成功"
echo "如果 updated 数量大于 0，说明迁移成功"

