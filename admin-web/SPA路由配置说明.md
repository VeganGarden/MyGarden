# SPA 路由配置说明

## 问题描述

当用户直接访问 SPA（单页应用）的路由（如 `/login`）时，腾讯云静态网站托管会尝试查找对应的文件，如果找不到，会返回 404 错误。

## 解决方案

### 方案一：在腾讯云控制台配置错误页面（推荐）

1. 登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入您的环境：`my-garden-app-env-4e0h762923be2f`
3. 点击左侧菜单「静态网站托管」
4. 点击「基础配置」
5. 找到「错误页面」配置项
6. 将「错误页面」设置为：`index.html`
7. 保存配置

这样，所有 404 请求都会自动返回 `index.html`，React Router 就能正确处理路由了。

### 方案二：使用 404.html（已部署）

项目已经包含 `404.html` 文件，它会自动重定向到 `index.html`。但腾讯云静态网站托管可能不会自动使用它，所以**强烈建议使用方案一**。

## 验证配置

配置完成后，请测试以下场景：

1. ✅ 直接访问首页：`https://your-domain.tcloudbaseapp.com/`
2. ✅ 直接访问登录页：`https://your-domain.tcloudbaseapp.com/login`
3. ✅ 直接访问其他路由：`https://your-domain.tcloudbaseapp.com/dashboard`
4. ✅ 刷新页面：在任意路由刷新页面，应该不会出现 404

## 注意事项

- 配置错误页面为 `index.html` 后，所有 404 请求都会返回 `index.html`
- 这不会影响真正的静态资源（如 CSS、JS、图片），因为它们有正确的路径
- 如果遇到问题，请检查控制台配置是否正确保存

## 相关文档

- [腾讯云静态网站托管文档](https://cloud.tencent.com/document/product/876/40270)
- [DEPLOY.md](./DEPLOY.md) - 完整部署指南
