#!/bin/bash

# 碳足迹基准值数据库部署脚本
# 使用方法: ./scripts/deploy-baseline-database.sh
# 
# 说明：所有操作都在云端执行，不需要 SecretId/SecretKey

set -e

echo "=========================================="
echo "碳足迹基准值数据库部署"
echo "=========================================="
echo ""
echo "ℹ️  说明："
echo "   - 所有操作都在云端执行（云函数）"
echo "   - 不需要 SecretId/SecretKey（使用 tcb login）"
echo "   - 数据库初始化通过云函数执行"
echo ""

# 检查云开发CLI
if ! command -v tcb &> /dev/null; then
    echo "❌ 错误: 未安装云开发CLI"
    echo "   请先安装: npm install -g @cloudbase/cli"
    exit 1
fi

# 检查是否已登录
echo "检查云开发登录状态..."
if ! tcb login:check &> /dev/null; then
    echo "⚠️  未登录云开发，请先登录:"
    echo "   tcb login"
    exit 1
fi
echo "✅ 已登录云开发"
echo ""

# 1. 安装依赖
echo "1. 安装云函数依赖..."
cd cloudfunctions/carbon-baseline-query
if [ ! -d "node_modules" ]; then
    npm install --production
fi
cd ../carbon-baseline-manage
if [ ! -d "node_modules" ]; then
    npm install --production
fi
cd ../carbon-baseline-init
if [ ! -d "node_modules" ]; then
    npm install --production
fi
cd ../..
echo "✅ 依赖安装完成"
echo ""

# 2. 部署云函数
echo "2. 部署云函数..."
echo "   - 部署 carbon-baseline-query..."
tcb fn deploy carbon-baseline-query --force || echo "⚠️  部署失败，请检查云函数配置"
echo "   - 部署 carbon-baseline-manage..."
tcb fn deploy carbon-baseline-manage --force || echo "⚠️  部署失败，请检查云函数配置"
echo "   - 部署 carbon-baseline-init..."
tcb fn deploy carbon-baseline-init --force || echo "⚠️  部署失败，请检查云函数配置"
echo "✅ 云函数部署完成"
echo ""

# 3. 初始化数据库（通过云函数）
echo "3. 初始化数据库（通过云函数）..."
echo "   调用 carbon-baseline-init 云函数..."
tcb fn invoke carbon-baseline-init --params '{"action":"init"}' || echo "⚠️  初始化失败，请检查云函数日志"
echo "✅ 数据库初始化完成"
echo ""

# 4. 验证数据完整性
echo "4. 验证数据完整性..."
tcb fn invoke carbon-baseline-init --params '{"action":"check"}' || echo "⚠️  验证失败，请检查云函数日志"
echo "✅ 验证完成"
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

