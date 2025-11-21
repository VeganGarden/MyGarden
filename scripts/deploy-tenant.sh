#!/bin/bash

# 部署 tenant 云函数脚本

echo "=========================================="
echo "开始部署 tenant 云函数"
echo "=========================================="

# 环境ID
ENV_ID="my-garden-app-env-4e0h762923be2f"

# 确保在项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

# 检查依赖
echo ""
echo "检查依赖..."
if [ ! -d "cloudfunctions/tenant/node_modules" ]; then
    echo "安装依赖..."
    cd cloudfunctions/tenant
    npm install
    cd "$PROJECT_ROOT"
fi

# 部署云函数（从项目根目录执行）
echo ""
echo "部署云函数..."
tcb fn deploy tenant --envId $ENV_ID --force

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 部署成功！"
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "❌ 部署失败！"
    echo "=========================================="
    exit 1
fi

