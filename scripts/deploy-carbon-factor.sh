#!/bin/bash

# 部署碳排放因子管理相关云函数
# 使用方法: ./scripts/deploy-carbon-factor.sh

set -e

echo "=========================================="
echo "开始部署碳排放因子管理云函数"
echo "=========================================="
echo ""

# 检查是否已登录
if ! cloudbase login --check 2>/dev/null; then
    echo "⚠️  未检测到登录状态，请先登录："
    echo "   cloudbase login"
    echo "   或"
    echo "   tcb login"
    exit 1
fi

# 部署 carbon-factor-manage 云函数
echo "📦 部署 carbon-factor-manage 云函数..."
cd cloudfunctions/carbon-factor-manage
if [ ! -d "node_modules" ]; then
    echo "   安装依赖..."
    npm install
fi
cd ../..
tcb fn deploy carbon-factor-manage --force || {
    echo "❌ carbon-factor-manage 部署失败"
    exit 1
}
echo "✅ carbon-factor-manage 部署成功"
echo ""

# 部署 database 云函数（更新了initCarbonFactorCollections支持）
echo "📦 部署 database 云函数（更新）..."
cd cloudfunctions/database
if [ ! -d "node_modules" ]; then
    echo "   安装依赖..."
    npm install
fi
cd ../..
tcb fn deploy database --force || {
    echo "❌ database 部署失败"
    exit 1
}
echo "✅ database 部署成功"
echo ""

echo "=========================================="
echo "✅ 所有云函数部署完成！"
echo "=========================================="
echo ""
echo "📋 下一步："
echo "1. 初始化数据库集合："
echo "   tcb fn invoke database --params '{\"action\":\"initCarbonFactorCollections\"}'"
echo ""
echo "2. 测试因子管理功能（可在前端页面测试）"

