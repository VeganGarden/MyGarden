#!/bin/bash

# 部署审核流程相关云函数
# 使用方法: ./scripts/deploy-approval-functions.sh

set -e

echo "=========================================="
echo "开始部署审核流程相关云函数"
echo "=========================================="
echo ""

# 需要部署的云函数列表
FUNCTIONS=(
  "approval-manage"
  "carbon-factor-manage"
  "carbon-baseline-manage"
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
    if tcb functions:deploy "$func" --force; then
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

