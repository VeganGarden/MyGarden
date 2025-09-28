#!/bin/bash

echo "开始部署 MyGarden 腾讯云开发项目..."

# 检查是否已登录
echo "检查登录状态..."
tcb whoami

if [ $? -ne 0 ]; then
    echo "请先登录腾讯云开发：tcb login"
    exit 1
fi

# 安装依赖
echo "安装项目依赖..."
npm install

# 部署云函数
echo "部署云函数..."
tcb framework deploy

# 验证部署
echo "验证部署状态..."
tcb env list

echo "部署完成！"
echo "AI服务已部署到腾讯云开发平台"
echo "访问地址：https://your-env-id.service.tcloudbase.com/ai-service"