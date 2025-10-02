#!/bin/bash

# MyGarden项目迁移准备脚本
echo "开始准备MyGarden项目迁移..."

# 1. 清理构建产物
echo "清理构建产物..."
rm -rf dist/
rm -rf .swc/
rm -rf .build/

# 2. 清理依赖包（在新电脑重新安装）
echo "清理node_modules..."
rm -rf node_modules/

# 3. 清理云函数依赖包
echo "清理云函数依赖包..."
find cloudfunctions -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# 4. 清理压缩包
echo "清理压缩包..."
rm -f *.zip
rm -f *.tar.gz

# 5. 清理系统文件
echo "清理系统文件..."
find . -name ".DS_Store" -delete
find . -name "Thumbs.db" -delete

# 6. 检查git状态
echo "检查git状态..."
git status

echo ""
echo "迁移准备完成！"
echo "现在可以安全地拷贝项目文件夹到新电脑。"
echo ""
echo "在新电脑上的操作步骤："
echo "1. git clone [仓库地址] MyGarden"
echo "2. cd MyGarden"
echo "3. npm install"
echo "4. npm run dev:weapp"