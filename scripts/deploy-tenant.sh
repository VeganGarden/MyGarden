#!/bin/bash

# 部署 tenant 云函数脚本

echo "=========================================="
echo "开始部署 tenant 云函数"
echo "=========================================="

# 环境ID
ENV_ID="my-garden-app-env-4e0h762923be2f"

# 进入 tenant 目录
cd cloudfunctions/tenant

# 检查依赖
echo ""
echo "检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 部署云函数
echo ""
echo "部署云函数..."
tcb fn deploy tenant --envId $ENV_ID

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

