# SPA 路由配置说明

## 问题说明

当直接访问路由（如 `/login`）或刷新页面时，会收到 404 错误，因为服务器上不存在该路径的文件。

## 解决方案

### 方法一：在腾讯云控制台配置（推荐）

1. 登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入您的环境：`my-garden-app-env-4e0h762923be2f`
3. 点击左侧菜单「静态网站托管」
4. 点击「基础配置」或「错误页面配置」
5. 配置错误页面：
   - **错误文档**：设置为 `index.html`
   - **状态码**：选择 `404`
   - **重定向地址**：`/index.html`

这样配置后，所有 404 请求都会自动重定向到 `index.html`，React Router 可以正常处理路由。

### 方法二：使用 CloudBase CLI 配置

```bash
# 配置错误页面重定向（需要 CloudBase CLI 2.x+）
tcb hosting:config set -e my-garden-app-env-4e0h762923be2f \
  --error-page 404:/index.html
```

### 方法三：通过云 API 配置

可以通过腾讯云 API 或 SDK 来配置错误页面重定向规则。

## 验证配置

配置完成后，测试以下场景：

1. ✅ 访问根路径：`https://your-domain.tcloudbaseapp.com/`
2. ✅ 直接访问路由：`https://your-domain.tcloudbaseapp.com/login`
3. ✅ 刷新页面：在 `/dashboard` 页面刷新，应该正常显示
4. ✅ 静态资源：`/assets/*` 和 `/static/*` 应该正常加载

## 注意事项

- 确保静态资源路径（如 `/assets/`、`/static/`）不会被重定向
- 配置后可能需要等待几分钟生效
- 清除浏览器缓存后再测试

## 当前配置状态

如果仍然遇到 404 错误，请按照「方法一」在控制台手动配置错误页面重定向。



