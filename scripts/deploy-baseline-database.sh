#!/bin/bash

# 碳足迹基准值数据库部署脚本
# 使用方法: ./scripts/deploy-baseline-database.sh

set -e

echo "=========================================="
echo "碳足迹基准值数据库部署"
echo "=========================================="
echo ""

# 检查环境变量
if [ -z "$TCB_ENV" ]; then
    echo "❌ 错误: 未设置 TCB_ENV 环境变量"
    exit 1
fi

if [ -z "$TCB_SECRET_ID" ]; then
    echo "❌ 错误: 未设置 TCB_SECRET_ID 环境变量"
    exit 1
fi

if [ -z "$TCB_SECRET_KEY" ]; then
    echo "❌ 错误: 未设置 TCB_SECRET_KEY 环境变量"
    exit 1
fi

echo "✅ 环境变量检查通过"
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

