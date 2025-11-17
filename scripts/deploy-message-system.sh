#!/bin/bash

# 消息管理系统部署脚本
# 用于快速部署消息管理 MVP 版本

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取环境 ID
if [ -z "$1" ]; then
    echo -e "${RED}错误: 请提供云开发环境 ID${NC}"
    echo "用法: ./deploy-message-system.sh <env-id>"
    exit 1
fi

ENV_ID=$1

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}消息管理系统部署脚本${NC}"
echo -e "${GREEN}环境 ID: ${ENV_ID}${NC}"
echo -e "${GREEN}========================================${NC}\n"

# 检查 CloudBase CLI
if ! command -v tcb &> /dev/null; then
    echo -e "${RED}错误: 未安装 CloudBase CLI${NC}"
    echo "请先安装: npm install -g @cloudbase/cli"
    exit 1
fi

# 步骤 1: 部署 database 云函数（如果未部署）
echo -e "${YELLOW}[步骤 1] 检查 database 云函数...${NC}"
if ! tcb fn list --env $ENV_ID | grep -q "database"; then
    echo -e "${YELLOW}database 云函数未部署，正在部署...${NC}"
    cd cloudfunctions/database
    npm install
    tcb fn deploy database --env $ENV_ID
    cd ../..
else
    echo -e "${GREEN}✓ database 云函数已部署${NC}"
fi

# 步骤 2: 创建数据库集合
echo -e "\n${YELLOW}[步骤 2] 创建数据库集合...${NC}"
echo "正在调用 database 云函数创建集合..."
echo -e "${YELLOW}请在云开发控制台手动执行以下操作：${NC}"
echo "1. 进入「云函数」→ database 云函数 → 「测试」"
echo "2. 输入参数: {\"action\": \"initMessageCollections\"}"
echo "3. 点击「运行测试」"
echo -e "${GREEN}等待您完成集合创建后，按 Enter 继续...${NC}"
read

# 步骤 3: 创建数据库索引
echo -e "\n${YELLOW}[步骤 3] 创建数据库索引...${NC}"
echo -e "${YELLOW}⚠️  重要：索引需要在云开发控制台手动创建${NC}"
echo "请参考文档: Docs/消息管理/数据库索引创建指南.md"
echo "需要创建 7 个索引："
echo "  - messages 集合: 5 个索引"
echo "  - user_messages 集合: 2 个索引（1 个唯一索引）"
echo "  - message_event_rules 集合: 1 个索引"
echo -e "${GREEN}等待您完成索引创建后，按 Enter 继续...${NC}"
read

# 步骤 4: 初始化事件规则
echo -e "\n${YELLOW}[步骤 4] 初始化事件规则...${NC}"
echo "正在调用 database 云函数初始化事件规则..."
echo -e "${YELLOW}请在云开发控制台手动执行以下操作：${NC}"
echo "1. 进入「云函数」→ database 云函数 → 「测试」"
echo "2. 输入参数: {\"action\": \"initMessageEventRules\"}"
echo "3. 点击「运行测试」"
echo -e "${GREEN}等待您完成事件规则初始化后，按 Enter 继续...${NC}"
read

# 步骤 5: 部署云函数
echo -e "\n${YELLOW}[步骤 5] 部署消息管理云函数...${NC}"

# 5.1 部署 message-manage
echo -e "${YELLOW}[5.1] 部署 message-manage 云函数...${NC}"
cd cloudfunctions/message-manage
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi
tcb fn deploy message-manage --env $ENV_ID
echo -e "${GREEN}✓ message-manage 部署成功${NC}"
cd ../..

# 5.2 部署 message-event
echo -e "\n${YELLOW}[5.2] 部署 message-event 云函数...${NC}"
cd cloudfunctions/message-event
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi
tcb fn deploy message-event --env $ENV_ID
echo -e "${GREEN}✓ message-event 部署成功${NC}"
cd ../..

# 5.3 部署 message-push
echo -e "\n${YELLOW}[5.3] 部署 message-push 云函数...${NC}"
cd cloudfunctions/message-push
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi
tcb fn deploy message-push --env $ENV_ID
echo -e "${GREEN}✓ message-push 部署成功${NC}"
cd ../..

# 步骤 6: 配置定时触发器
echo -e "\n${YELLOW}[步骤 6] 配置定时触发器...${NC}"
echo -e "${YELLOW}请在云开发控制台手动配置定时触发器：${NC}"
echo "1. 进入「云函数」→ message-event 云函数 → 「触发器」"
echo "2. 点击「创建触发器」"
echo "3. 选择「定时触发器」"
echo "4. Cron 表达式: 0 * * * *"
echo "5. 触发参数:"
echo '   {"action": "checkAuditTasks", "data": {"threshold": 10}}'
echo -e "${GREEN}等待您完成触发器配置后，按 Enter 继续...${NC}"
read

# 步骤 7: 功能测试
echo -e "\n${YELLOW}[步骤 7] 功能测试...${NC}"
echo -e "${YELLOW}请参考文档进行功能测试：${NC}"
echo "文档: Docs/消息管理/功能测试脚本.md"
echo -e "${GREEN}等待您完成功能测试后，按 Enter 继续...${NC}"
read

# 完成
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}下一步：${NC}"
echo "1. 验证所有功能是否正常工作"
echo "2. 查看部署文档: Docs/消息管理/上线部署指南.md"
echo "3. 如有问题，查看相关文档进行排查"
echo ""

