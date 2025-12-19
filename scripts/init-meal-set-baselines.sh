#!/bin/bash

# 一餐饭基准值数据库初始化脚本
# 
# 功能：
# 1. 初始化 meal_set_baselines 集合
# 2. 生成示例数据（可选）
#
# 使用方法：
# ./scripts/init-meal-set-baselines.sh [--with-sample-data]

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}一餐饭基准值数据库初始化${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查是否安装了云开发CLI
if ! command -v tcb &> /dev/null; then
  echo -e "${RED}❌ 未安装腾讯云开发CLI${NC}"
  echo "请先安装: npm install -g @cloudbase/cli"
  exit 1
fi

# 检查是否已登录
if ! tcb login:check &> /dev/null; then
  echo -e "${YELLOW}⚠️  未登录云开发，请先登录:${NC}"
  echo "   tcb login"
  exit 1
fi

# Step 1: 初始化集合和索引
echo -e "${GREEN}[步骤 1/2] 初始化集合和索引...${NC}"
echo ""

tcb fn invoke database --params '{"action":"initMealSetBaselinesCollection"}'

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ 集合初始化完成${NC}"
else
  echo -e "${RED}❌ 集合初始化失败${NC}"
  exit 1
fi

echo ""

# Step 2: 生成示例数据（可选）
if [[ "$1" == "--with-sample-data" ]]; then
  echo -e "${GREEN}[步骤 2/2] 生成示例数据...${NC}"
  echo ""
  
  tcb fn invoke database --params '{"action":"initMealSetBaselineSampleData"}'
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 示例数据生成完成${NC}"
  else
    echo -e "${YELLOW}⚠️  示例数据生成失败（可能已存在数据）${NC}"
  fi
else
  echo -e "${YELLOW}[步骤 2/2] 跳过示例数据生成${NC}"
  echo "如需生成示例数据，请运行: $0 --with-sample-data"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}初始化完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo "1. 如果索引创建失败，需要在控制台手动创建索引"
echo "2. 参考：Docs/一餐饭基准值数据库初始化指南.md"
echo "3. 索引配置：参考索引配置表中的 meal_set_baselines 相关索引"
echo ""

