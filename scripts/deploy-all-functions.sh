#!/bin/bash

# 部署所有云函数到腾讯云开发
# 使用方法: ./scripts/deploy-all-functions.sh

set -e

echo "=========================================="
echo "开始部署所有云函数到腾讯云开发"
echo "=========================================="
echo ""

# 云函数列表
FUNCTIONS=(
  "login"
  "user"
  "garden"
  "carbon"
  "database"
  "data-import"
  "meat-data-import"
  "recipe-data-import"
  "plant-templates"
  "practitioners"
  "wisdom"
  "practitioner-data-import"
  "recipe"
  "ingredient"
  "tenant"
  "order-sync"
  "restaurant-order-sync"
  "restaurant-recommend"
  "product-recommend"
  "product-data-import"
)

# 检查是否安装了云开发CLI
if ! command -v tcb &> /dev/null; then
  echo "❌ 未安装腾讯云开发CLI"
  echo "请先安装: npm install -g @cloudbase/cli"
  exit 1
fi

# 检查是否已登录
if ! tcb login:check &> /dev/null; then
  echo "⚠️  未登录云开发，请先登录:"
  echo "   tcb login"
  exit 1
fi

# 部署每个云函数
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_FUNCTIONS=()

for func in "${FUNCTIONS[@]}"; do
  echo ""
  echo "----------------------------------------"
  echo "正在部署: $func"
  echo "----------------------------------------"
  
  if [ -d "cloudfunctions/$func" ]; then
    cd "cloudfunctions/$func"
    
    # 安装依赖（如果存在package.json）
    if [ -f "package.json" ]; then
      echo "安装依赖..."
      npm install --production
    fi
    
    # 部署云函数
    if tcb fn deploy "$func" --force; then
      echo "✅ $func 部署成功"
      ((SUCCESS_COUNT++))
    else
      echo "❌ $func 部署失败"
      ((FAILED_COUNT++))
      FAILED_FUNCTIONS+=("$func")
    fi
    
    cd ../..
  else
    echo "⚠️  目录不存在: cloudfunctions/$func"
    ((FAILED_COUNT++))
    FAILED_FUNCTIONS+=("$func")
  fi
done

echo ""
echo "=========================================="
echo "部署完成"
echo "=========================================="
echo "✅ 成功: $SUCCESS_COUNT 个"
echo "❌ 失败: $FAILED_COUNT 个"

if [ ${#FAILED_FUNCTIONS[@]} -gt 0 ]; then
  echo ""
  echo "失败的云函数:"
  for func in "${FAILED_FUNCTIONS[@]}"; do
    echo "  - $func"
  done
fi

echo ""
echo "提示: 如果部署失败，请检查:"
echo "  1. 云开发环境ID是否正确 (cloudbaserc.json)"
echo "  2. 是否已登录云开发 (tcb login)"
echo "  3. 云函数代码是否有语法错误"
echo "  4. 依赖是否安装成功"


