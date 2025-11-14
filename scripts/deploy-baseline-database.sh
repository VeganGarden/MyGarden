#!/bin/bash

# 碳足迹基准值数据库部署脚本
# 使用方法: ./scripts/deploy-baseline-database.sh

set -e

echo "=========================================="
echo "碳足迹基准值数据库部署"
echo "=========================================="
echo ""
echo "ℹ️  说明："
echo "   - 云函数部署不需要 SecretId/SecretKey（使用 tcb login）"
echo "   - 数据库初始化需要 SecretId/SecretKey（本地脚本访问数据库）"
echo "   详见：Docs/项目策划方案/碳足迹计算/为什么需要TCB_SECRET配置说明.md"
echo ""

# 加载 .env 文件（如果存在）
if [ -f .env ]; then
    echo "📋 加载 .env 文件..."
    export $(grep -v '^#' .env | xargs)
    echo "✅ .env 文件加载完成"
    echo ""
fi

# 如果 TCB_ENV 未设置，尝试使用 CLOUDBASE_ENVID
if [ -z "$TCB_ENV" ] && [ -n "$CLOUDBASE_ENVID" ]; then
    export TCB_ENV="$CLOUDBASE_ENVID"
    echo "ℹ️  使用 CLOUDBASE_ENVID 作为 TCB_ENV: $TCB_ENV"
    echo ""
fi

# 检查环境变量
if [ -z "$TCB_ENV" ]; then
    echo "❌ 错误: 未设置 TCB_ENV 或 CLOUDBASE_ENVID 环境变量"
    echo "   请在 .env 文件中设置 TCB_ENV 或 CLOUDBASE_ENVID"
    exit 1
fi

if [ -z "$TCB_SECRET_ID" ] || [ "$TCB_SECRET_ID" = "your-secret-id-here" ]; then
    echo "❌ 错误: 未设置 TCB_SECRET_ID 环境变量或使用默认值"
    echo "   请在 .env 文件中设置正确的 TCB_SECRET_ID"
    echo "   获取方式: https://console.cloud.tencent.com/cam/capi"
    exit 1
fi

if [ -z "$TCB_SECRET_KEY" ] || [ "$TCB_SECRET_KEY" = "your-secret-key-here" ]; then
    echo "❌ 错误: 未设置 TCB_SECRET_KEY 环境变量或使用默认值"
    echo "   请在 .env 文件中设置正确的 TCB_SECRET_KEY"
    echo "   获取方式: https://console.cloud.tencent.com/cam/capi"
    exit 1
fi

echo "✅ 环境变量检查通过"
echo "   TCB_ENV: $TCB_ENV"
echo "   TCB_SECRET_ID: ${TCB_SECRET_ID:0:10}..."
echo ""

# 1. 安装依赖
echo "1. 安装依赖..."
cd cloudfunctions/carbon-baseline-query
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ../carbon-baseline-manage
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ../..
echo "✅ 依赖安装完成"
echo ""

# 2. 初始化数据库
echo "2. 初始化数据库..."
node scripts/init-carbon-baselines.js
echo "✅ 数据库初始化完成"
echo ""

# 3. 部署云函数
echo "3. 部署云函数..."
echo "   - 部署 carbon-baseline-query..."
tcb fn deploy carbon-baseline-query || echo "⚠️  部署失败，请检查云函数配置"
echo "   - 部署 carbon-baseline-manage..."
tcb fn deploy carbon-baseline-manage || echo "⚠️  部署失败，请检查云函数配置"
echo "✅ 云函数部署完成"
echo ""

# 4. 运行测试
echo "4. 运行功能测试..."
node scripts/test-baseline-query.js
echo "✅ 测试完成"
echo ""

echo "=========================================="
echo "✅ 部署完成"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 检查云函数运行状态"
echo "2. 验证数据完整性"
echo "3. 执行性能测试"
echo ""

