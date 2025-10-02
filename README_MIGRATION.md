# MyGarden项目迁移指南

## 🚀 快速迁移步骤

### 当前电脑操作（准备阶段）

1. **运行迁移准备脚本**
   ```bash
   ./migration-prepare.sh
   ```

2. **提交代码到Git**
   ```bash
   git add .
   git commit -m "准备迁移到新电脑"
   git push
   ```

### 新电脑操作（设置阶段）

1. **克隆项目**
   ```bash
   git clone [你的仓库地址] MyGarden
   cd MyGarden
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **安装云函数依赖**
   ```bash
   cd cloudfunctions/login && npm install
   cd ../user && npm install
   cd ../garden && npm install  
   cd ../carbon && npm install
   cd ../..
   ```

4. **配置环境**
   - 创建 `.env` 文件（参考 `.env.example`）
   - 配置微信开发者工具中的AppID

5. **启动开发**
   ```bash
   npm run dev:weapp
   ```

## 📁 项目结构说明

```
MyGarden/
├── src/              # 源代码
├── cloudfunctions/   # 云函数
├── config/          # 配置文件
├── assets/          # 静态资源
├── Docs/            # 文档
├── package.json     # 依赖配置
└── 其他配置文件
```

## ⚠️ 注意事项

- **Node.js版本**：确保新电脑安装兼容的Node.js版本（推荐LTS）
- **环境变量**：需要重新配置敏感信息
- **云函数**：可能需要重新部署到新的云环境
- **微信AppID**：检查是否需要更新小程序配置

## 🔧 故障排除

### 构建失败
```bash
# 清理缓存重新安装
rm -rf node_modules
npm cache clean --force
npm install
```

### 云函数问题
```bash
# 重新安装云函数依赖
cd cloudfunctions/[函数名] && rm -rf node_modules && npm install
```

## 📞 支持文档

- 详细检查清单：`Docs/项目迁移检查清单.md`
- 迁移准备脚本：`migration-prepare.sh`

---

**迁移完成！现在可以在新电脑上继续开发MyGarden项目了。**