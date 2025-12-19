#!/bin/bash

# 部署本次更新修改的云函数
# 使用方法: ./scripts/deploy-updated-functions.sh

set -e

echo "=========================================="
echo "开始部署更新的云函数"
echo "=========================================="
echo ""

# 本次更新修改的云函数列表
UPDATED_FUNCTIONS=(
  "restaurant-menu-carbon"  # 修复了碳足迹计算中的食材格式转换问题，添加了详细日志
  "recipe"                  # 添加了权限检查，防止餐厅管理员创建基础菜谱
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

# 确保在项目根目录执行
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

for func in "${UPDATED_FUNCTIONS[@]}"; do
  echo ""
  echo "----------------------------------------"
  echo "正在部署: $func"
  echo "----------------------------------------"
  
  if [ -d "cloudfunctions/$func" ]; then
    # 进入云函数目录安装依赖
    cd "cloudfunctions/$func"
    
    # 安装依赖（如果存在package.json）
    if [ -f "package.json" ]; then
      echo "📦 安装依赖..."
      npm install --production --silent 2>/dev/null || npm install --production
    fi
    
    # 返回项目根目录执行部署命令（需要在根目录才能找到 cloudbaserc.json）
    cd "$PROJECT_ROOT"
    
    # 部署云函数
    echo "🚀 部署云函数..."
    if tcb fn deploy "$func" --force; then
      echo "✅ $func 部署成功"
      ((SUCCESS_COUNT++))
    else
      echo "❌ $func 部署失败"
      ((FAILED_COUNT++))
      FAILED_FUNCTIONS+=("$func")
    fi
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
  exit 1
fi

echo ""
echo "✨ 所有云函数部署成功！"
echo ""
echo "📝 本次更新内容："
echo "  1. restaurant-menu-carbon: 修复了食材格式转换问题，添加了详细的计算过程日志"
echo "  2. recipe: 添加了权限检查，防止餐厅管理员创建基础菜谱"
echo ""
echo "💡 提示: 部署后可以在云开发控制台查看云函数日志，验证功能是否正常"

