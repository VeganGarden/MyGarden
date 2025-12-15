#!/bin/bash

# 气候餐厅管理后台 - 快速部署脚本
# 使用腾讯云静态网站托管

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
ENV_ID="${CLOUDBASE_ENVID:-my-garden-app-env-4e0h762923be2f}"
REGION="${CLOUDBASE_REGION:-ap-shanghai}"

echo -e "${BLUE}🚀 气候餐厅管理后台 - 部署脚本${NC}"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ 错误：请在 admin-web 目录下运行此脚本${NC}"
  exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ 错误：未安装 Node.js，请先安装 Node.js${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"

# 检查 CloudBase CLI
if ! command -v tcb &> /dev/null; then
  echo -e "${YELLOW}⚠️  未安装 CloudBase CLI，正在安装...${NC}"
  npm install -g @cloudbase/cli
  echo -e "${GREEN}✅ CloudBase CLI 安装完成${NC}"
fi

# 检查登录状态
echo -e "${BLUE}📋 检查登录状态...${NC}"
if ! tcb login:check &> /dev/null; then
  echo -e "${YELLOW}⚠️  未登录，请先登录腾讯云${NC}"
  echo -e "${BLUE}正在打开登录页面...${NC}"
  tcb login
fi

# 安装依赖
echo ""
echo -e "${BLUE}📦 安装依赖...${NC}"
if [ ! -d "node_modules" ]; then
  npm install
else
  npm install --silent
fi
echo -e "${GREEN}✅ 依赖安装完成${NC}"

# 构建生产版本
echo ""
echo -e "${BLUE}🔨 构建生产版本...${NC}"
npm run build

# 检查构建结果
if [ ! -d "dist" ]; then
  echo -e "${RED}❌ 构建失败：dist 目录不存在${NC}"
  exit 1
fi

if [ -z "$(ls -A dist)" ]; then
  echo -e "${RED}❌ 构建失败：dist 目录为空${NC}"
  exit 1
fi

# 确保 404.html 被复制到 dist 目录（用于 SPA 路由支持）
if [ -f "public/404.html" ]; then
  cp public/404.html dist/404.html
  echo -e "${GREEN}✅ 已复制 404.html 到 dist 目录${NC}"
fi

echo -e "${GREEN}✅ 构建完成${NC}"

# 部署到腾讯云
echo ""
echo -e "${BLUE}📤 部署到腾讯云静态网站托管...${NC}"
echo -e "${YELLOW}环境ID: ${ENV_ID}${NC}"
echo -e "${YELLOW}区域: ${REGION}${NC}"
echo ""

# 使用新的CLI命令进行部署
tcb hosting deploy dist -e "${ENV_ID}"

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo -e "${BLUE}🌐 访问地址：${NC}"
echo -e "${GREEN}https://${ENV_ID}.tcloudbaseapp.com${NC}"
echo ""
echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo -e "  - 部署后需要配置SPA路由支持，否则直接访问路由（如/login）会返回404"
echo -e "  - 请按照以下步骤配置错误页面重定向："
echo -e ""
echo -e "${BLUE}配置SPA路由步骤：${NC}"
echo -e "  1. 访问腾讯云开发控制台：${GREEN}https://console.cloud.tencent.com/tcb${NC}"
echo -e "  2. 选择环境：${GREEN}${ENV_ID}${NC}"
echo -e "  3. 进入「静态网站托管」→ 「基础配置」"
echo -e "  4. 找到「错误页面」配置，设置："
echo -e "     - 错误文档：${GREEN}index.html${NC}"
echo -e "     - 状态码：${GREEN}404${NC}"
echo -e "  5. 保存配置（可能需要几分钟生效）"
echo -e ""
echo -e "${BLUE}💡 其他提示：${NC}"
echo -e "  - 如需配置自定义域名，请访问腾讯云开发控制台"
echo -e "  - 详细配置说明请查看：${GREEN}ROUTING_CONFIG.md${NC}"
echo ""


