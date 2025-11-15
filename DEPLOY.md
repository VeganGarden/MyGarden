# 云函数部署快速指南

## 🚀 快速部署

### 前置要求

1. **安装云开发CLI**
   ```bash
   npm install -g @cloudbase/cli
   ```

2. **登录云开发**
   ```bash
   tcb login
   ```

3. **检查登录状态**
   ```bash
   tcb login:check
   ```

### 一键部署所有云函数

```bash
# 方法1：使用 npm 脚本（推荐）
npm run deploy:functions

# 方法2：直接运行脚本
node scripts/deploy-all-functions.js

# 方法3：使用 Shell 脚本
./scripts/deploy-all-functions.sh
```

### 检查云函数状态

```bash
node scripts/check-functions.js
```

## 📋 需要部署的云函数列表

共 **20** 个云函数：

### 核心功能（8个）
- ✅ login - 登录认证
- ✅ user - 用户管理
- ✅ tenant - 租户和餐厅管理 ⭐ **新增**
- ✅ garden - 花园管理
- ✅ carbon - 碳足迹计算
- ✅ database - 数据库管理
- ✅ recipe - 菜谱管理
- ✅ ingredient - 食材管理

### 数据导入（5个）
- ✅ data-import - 数据导入
- ✅ meat-data-import - 肉类数据导入
- ✅ recipe-data-import - 菜谱数据导入
- ✅ practitioner-data-import - 践行者数据导入
- ✅ product-data-import - 产品数据导入

### 业务功能（7个）
- ✅ order-sync - 订单同步
- ✅ restaurant-order-sync - 餐厅订单同步
- ✅ restaurant-recommend - 餐厅推荐
- ✅ product-recommend - 产品推荐
- ✅ practitioners - 践行者管理
- ✅ wisdom - 智慧内容
- ✅ plant-templates - 植物模板

## 🔧 单个云函数部署

```bash
# 部署指定云函数
npm run deploy:function <function-name>

# 例如：部署 tenant 云函数
npm run deploy:function tenant
```

## 📝 部署配置

所有云函数配置在 `cloudbaserc.json` 中：

- **环境ID**: `my-garden-app-env-4e0h762923be2f`
- **区域**: `ap-shanghai`
- **运行时**: `Nodejs16.13`
- **超时**: 5-60秒
- **内存**: 128-256MB

## ✅ 部署后验证

### 1. 在控制台检查

登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)：
- 进入"云函数"页面
- 确认所有20个云函数都已部署

### 2. 测试关键云函数

**测试 tenant 云函数（添加小苹果租户）**：
```json
{
  "action": "addXiaopingguo"
}
```

**测试 user 云函数**：
```json
{
  "action": "getProfile",
  "data": {
    "userId": "test_user"
  }
}
```

### 3. 查看日志

在云开发控制台 → 云函数 → 日志，检查是否有错误。

## 🐛 常见问题

### 问题1：tcb 命令不存在

**解决**：
```bash
npm install -g @cloudbase/cli
```

### 问题2：未登录

**解决**：
```bash
tcb login
```

### 问题3：部署失败 - 权限不足

**解决**：
- 确认已登录：`tcb login:check`
- 检查是否有该环境的部署权限
- 联系管理员分配权限

### 问题4：依赖安装失败

**解决**：
```bash
# 进入云函数目录
cd cloudfunctions/<function-name>

# 手动安装依赖
npm install --production

# 返回项目根目录
cd ../..

# 重新部署
tcb fn deploy <function-name> --force
```

## 📚 详细文档

- 完整部署指南：`Docs/云函数部署指南.md`
- 租户管理：`cloudfunctions/tenant/README.md`

## ⚡ 快速命令参考

```bash
# 检查云函数状态
node scripts/check-functions.js

# 部署所有云函数
npm run deploy:functions

# 部署单个云函数
tcb fn deploy tenant --force

# 查看云函数列表
tcb fn list

# 查看云函数日志
tcb fn log tenant
```

