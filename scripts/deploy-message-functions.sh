#!/bin/bash

# 消息管理云函数部署脚本

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 获取环境 ID
if [ -z "$1" ]; then
    echo -e "${RED}错误: 请提供云开发环境 ID${NC}"
    echo "用法: ./deploy-message-functions.sh <env-id>"
    exit 1
fi

ENV_ID=$1

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}消息管理云函数部署脚本${NC}"
echo -e "${GREEN}环境 ID: ${ENV_ID}${NC}"
echo -e "${GREEN}========================================${NC}\n"

# 检查 CloudBase CLI
if ! command -v tcb &> /dev/null; then
    echo -e "${RED}错误: 未安装 CloudBase CLI${NC}"
    echo "请先安装: npm install -g @cloudbase/cli"
    exit 1
fi

# 获取项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

# 部署 message-manage
echo -e "${YELLOW}[1/3] 部署 message-manage 云函数...${NC}"
cd cloudfunctions/message-manage
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi
tcb fn deploy message-manage --env $ENV_ID
echo -e "${GREEN}✓ message-manage 部署成功${NC}\n"
cd ../..

# 部署 message-event
echo -e "${YELLOW}[2/3] 部署 message-event 云函数...${NC}"
cd cloudfunctions/message-event
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi
tcb fn deploy message-event --env $ENV_ID
echo -e "${GREEN}✓ message-event 部署成功${NC}\n"
cd ../..

# 部署 message-push
echo -e "${YELLOW}[3/3] 部署 message-push 云函数...${NC}"
cd cloudfunctions/message-push
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi
tcb fn deploy message-push --env $ENV_ID
echo -e "${GREEN}✓ message-push 部署成功${NC}\n"
cd ../..

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 所有云函数部署完成！${NC}"
echo -e "${GREEN}========================================${NC}\n"

