#!/bin/bash

###############################################################################
# 数据库升级 v2.0 - 一键部署脚本
#
# 使用方法：
# chmod +x deploy-database-upgrade.sh
# ./deploy-database-upgrade.sh
###############################################################################

echo "========================================"
echo "数据库升级 v2.0 - 自动部署脚本"
echo "========================================"
echo ""

# 切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 当前目录: $(pwd)"
echo ""

# 检查 tcb CLI
if ! command -v tcb &> /dev/null; then
    echo "❌ 未安装 tcb CLI"
    echo "请先安装: npm install -g @cloudbase/cli"
    exit 1
fi

echo "✅ tcb CLI 已安装: $(tcb --version | head -n 1)"
echo ""

# 检查登录状态
echo "🔐 检查登录状态..."
if ! tcb env list &> /dev/null; then
    echo "❌ 未登录，请先执行: tcb login"
    exit 1
fi

echo "✅ 已登录"
echo ""

# 步骤1：部署 database 云函数
echo "========================================"
echo "步骤 1/5: 部署 database 云函数"
echo "========================================"

cd cloudfunctions/database
echo "📦 部署 database 云函数..."
tcb fn deploy database --force

if [ $? -eq 0 ]; then
    echo "✅ database 云函数部署成功"
else
    echo "❌ database 云函数部署失败"
    exit 1
fi

cd ../..
echo ""

# 步骤2：创建 v2.0 新集合
echo "========================================"
echo "步骤 2/5: 创建 v2.0 新集合"
echo "========================================"

echo "🔧 执行创建新集合..."
tcb fn invoke database --params '{"action":"init-v2"}'

echo ""
read -p "✋ 请确认7个新集合创建成功后，按回车继续..."
echo ""

# 步骤3：迁移现有集合（预览）
echo "========================================"
echo "步骤 3/5: 预览集合迁移"
echo "========================================"

echo "👀 预览模式（不修改数据）..."
tcb fn invoke database --params '{"action":"migrate-v2","params":{"action":"preview","collection":"all"}}'

echo ""
read -p "✋ 请确认预览结果正确后，按回车继续执行迁移..."
echo ""

# 步骤4：执行迁移
echo "========================================"
echo "步骤 4/5: 执行集合迁移"
echo "========================================"

echo "🔄 正在迁移现有集合..."
tcb fn invoke database --params '{"action":"migrate-v2","params":{"action":"migrate","collection":"all"}}'

echo ""
echo "✅ 迁移完成"
echo ""

# 步骤5：测试验证
echo "========================================"
echo "步骤 5/5: 测试验证"
echo "========================================"

echo "🧪 运行测试..."
tcb fn invoke database --params '{"action":"test-upgrade"}'

echo ""

# 查看最终状态
echo "========================================"
echo "查看数据库最终状态"
echo "========================================"

tcb fn invoke database --params '{"action":"get-status"}'

echo ""
echo "========================================"
echo "✅ 数据库升级完成！"
echo "========================================"
echo ""
echo "📋 下一步工作："
echo "1. 在云开发控制台创建索引（参考：Docs/数据库索引配置v2.0.md）"
echo "2. 部署新云函数（practitioners, wisdom, practitioner-data-import）"
echo "3. 开始录入践行者数据"
echo ""
echo "🎉 恭喜！技术升级已完成！"
echo ""



