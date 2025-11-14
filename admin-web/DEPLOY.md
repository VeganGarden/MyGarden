# 气候餐厅管理后台 - Web 应用部署指南

## 📋 部署方式概览

针对基于 **Vite + React + TypeScript** 的 SPA 应用，以下是推荐的部署方式：

| 部署方式                          | 推荐指数   | 适用场景         | 成本           | 难度 |
| --------------------------------- | ---------- | ---------------- | -------------- | ---- |
| **腾讯云静态网站托管** ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 已使用腾讯云开发 | 低             | 简单 |
| **腾讯云 COS + CDN**              | ⭐⭐⭐⭐   | 需要更多控制     | 中             | 中等 |
| **传统服务器（Nginx）**           | ⭐⭐⭐     | 自有服务器       | 中高           | 中等 |
| **Vercel/Netlify**                | ⭐⭐⭐     | 快速部署         | 低（免费额度） | 简单 |

---

## 🎯 推荐方案：腾讯云静态网站托管

### 为什么推荐？

✅ **与现有架构完美集成**：您已经在使用腾讯云开发，静态网站托管是同一生态  
✅ **零配置 CDN 加速**：自动配置全球 CDN，访问速度快  
✅ **成本低**：静态网站托管价格低廉，适合中小型项目  
✅ **管理方便**：在同一个控制台管理云函数和静态网站  
✅ **支持自定义域名**：可以绑定自己的域名  
✅ **自动 HTTPS**：自动配置 SSL 证书

### 部署步骤

#### 1. 构建生产版本

```bash
cd admin-web

# 安装依赖（如果还没安装）
npm install

# 构建生产版本
npm run build
```

构建完成后，会在 `admin-web/dist` 目录生成静态文件。

#### 2. 安装并登录 CloudBase CLI

```bash
# 安装 CloudBase CLI（如果还没安装）
npm install -g @cloudbase/cli

# 登录腾讯云
tcb login
```

#### 3. 初始化静态网站托管

```bash
# 在项目根目录执行
tcb hosting:deploy admin-web/dist -e my-garden-app-env-4e0h762923be2f
```

#### 4. 配置环境变量（可选）

如果需要区分开发/生产环境，可以在构建时设置环境变量：

```bash
# 创建 .env.production 文件
cat > admin-web/.env.production << EOF
VITE_CLOUDBASE_ENVID=my-garden-app-env-4e0h762923be2f
VITE_CLOUDBASE_REGION=ap-shanghai
EOF

# 构建时自动使用生产环境变量
npm run build
```

#### 5. 配置自定义域名（可选）

1. 登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入"静态网站托管" → "域名管理"
3. 添加自定义域名并配置 DNS 解析

#### 6. 自动化部署脚本

创建 `admin-web/deploy.sh`：

```bash
#!/bin/bash

echo "🚀 开始部署气候餐厅管理后台..."

# 进入项目目录
cd "$(dirname "$0")"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建生产版本
echo "🔨 构建生产版本..."
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
  echo "❌ 构建失败：dist 目录不存在"
  exit 1
fi

# 部署到腾讯云静态网站托管
echo "📤 部署到腾讯云..."
tcb hosting:deploy dist -e my-garden-app-env-4e0h762923be2f

echo "✅ 部署完成！"
echo "🌐 访问地址：https://your-env-id.tcloudbaseapp.com"
```

使用方式：

```bash
chmod +x admin-web/deploy.sh
./admin-web/deploy.sh
```

---

## 方案二：腾讯云 COS + CDN

### 适用场景

- 需要更多存储控制
- 需要独立的 CDN 配置
- 需要与其他 COS 资源统一管理

### 部署步骤

#### 1. 创建 COS 存储桶

1. 登录 [腾讯云 COS 控制台](https://console.cloud.tencent.com/cos)
2. 创建存储桶，选择：
   - **地域**：华东地区（上海）
   - **访问权限**：公有读私有写
   - **静态网站**：开启

#### 2. 配置静态网站

在存储桶的"基础配置" → "静态网站"中：

- **索引文档**：`index.html`
- **错误文档**：`index.html`（SPA 路由需要）

#### 3. 上传文件

```bash
# 安装 COS CLI
npm install -g coscmd

# 配置 COS
coscmd config -a <SecretId> -s <SecretKey> -b <BucketName> -r <Region>

# 上传构建文件
cd admin-web
npm run build
coscmd upload -rs dist/ /
```

#### 4. 配置 CDN 加速

1. 在 [CDN 控制台](https://console.cloud.tencent.com/cdn) 创建加速域名
2. 源站选择 COS 存储桶
3. 配置 HTTPS 证书
4. 配置缓存规则

---

## 方案三：传统服务器（Nginx）

### 适用场景

- 已有自有服务器
- 需要完全控制
- 需要与后端 API 部署在同一服务器

### 部署步骤

#### 1. 构建应用

```bash
cd admin-web
npm run build
```

#### 2. 上传到服务器

```bash
# 使用 scp 上传
scp -r dist/* user@your-server:/var/www/admin-web/

# 或使用 rsync
rsync -avz dist/ user@your-server:/var/www/admin-web/
```

#### 3. 配置 Nginx

创建 `/etc/nginx/sites-available/admin-web`：

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    root /var/www/admin-web;
    index index.html;

    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/admin-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. 配置 HTTPS（使用 Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d admin.yourdomain.com
```

---

## 方案四：Vercel / Netlify

### 适用场景

- 快速部署和预览
- 需要自动 CI/CD
- 个人项目或小团队

### Vercel 部署

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 部署

```bash
cd admin-web
vercel
```

#### 3. 配置环境变量

在 Vercel 控制台设置：

- `VITE_CLOUDBASE_ENVID`
- `VITE_CLOUDBASE_REGION`

#### 4. 自动部署

连接 GitHub 仓库后，每次 push 到 main 分支会自动部署。

### Netlify 部署

#### 1. 创建 `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 2. 部署

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录
netlify login

# 部署
cd admin-web
netlify deploy --prod
```

---

## 🔧 构建优化配置

### Vite 生产构建优化

在 `vite.config.ts` 中添加生产优化：

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 生产构建优化
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false, // 生产环境关闭sourcemap
    minify: "terser", // 使用terser压缩
    terserOptions: {
      compress: {
        drop_console: true, // 移除console
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // 代码分割
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "antd-vendor": ["antd", "@ant-design/icons"],
          "cloudbase-vendor": ["@cloudbase/js-sdk"],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // chunk大小警告阈值
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      "/api": {
        target: "https://api.cloudbase.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

---

## 📝 环境变量配置

### 开发环境

创建 `admin-web/.env.development`：

```env
VITE_CLOUDBASE_ENVID=my-garden-app-env-4e0h762923be2f
VITE_CLOUDBASE_REGION=ap-shanghai
```

### 生产环境

创建 `admin-web/.env.production`：

```env
VITE_CLOUDBASE_ENVID=my-garden-app-env-4e0h762923be2f
VITE_CLOUDBASE_REGION=ap-shanghai
```

**注意**：环境变量必须以 `VITE_` 开头才能在代码中访问。

---

## 🚀 CI/CD 自动化部署

### GitHub Actions 示例

创建 `.github/workflows/deploy-admin-web.yml`：

```yaml
name: Deploy Admin Web

on:
  push:
    branches:
      - main
    paths:
      - "admin-web/**"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: |
          cd admin-web
          npm ci

      - name: Build
        run: |
          cd admin-web
          npm run build
        env:
          VITE_CLOUDBASE_ENVID: ${{ secrets.CLOUDBASE_ENVID }}
          VITE_CLOUDBASE_REGION: ${{ secrets.CLOUDBASE_REGION }}

      - name: Deploy to CloudBase
        run: |
          npm install -g @cloudbase/cli
          tcb login --keyId ${{ secrets.TCB_SECRET_ID }} --key ${{ secrets.TCB_SECRET_KEY }}
          cd admin-web
          tcb hosting:deploy dist -e ${{ secrets.CLOUDBASE_ENVID }}
```

在 GitHub 仓库设置中添加 Secrets：

- `TCB_SECRET_ID`
- `TCB_SECRET_KEY`
- `CLOUDBASE_ENVID`
- `CLOUDBASE_REGION`

---

## ✅ 部署检查清单

### 部署前

- [ ] 代码已通过测试
- [ ] 环境变量已正确配置
- [ ] 构建成功无错误
- [ ] 静态资源路径正确

### 部署后

- [ ] 网站可以正常访问
- [ ] 云函数调用正常
- [ ] 路由跳转正常（SPA 路由）
- [ ] 静态资源加载正常
- [ ] HTTPS 证书有效
- [ ] 控制台无错误

---

## 🐛 常见问题

### 1. SPA 路由 404 错误

**问题**：刷新页面或直接访问路由时出现 404

**解决**：

- 腾讯云静态网站托管：在控制台配置"错误页面"为 `index.html`
- Nginx：配置 `try_files $uri $uri/ /index.html;`
- COS：配置静态网站的错误文档为 `index.html`

### 2. 静态资源 404

**问题**：图片、CSS、JS 文件加载失败

**解决**：

- 检查 `vite.config.ts` 中的 `base` 配置
- 确保资源路径使用相对路径
- 检查 CDN 配置是否正确

### 3. 环境变量未生效

**问题**：生产环境变量未正确加载

**解决**：

- 确保环境变量以 `VITE_` 开头
- 重新构建应用
- 检查部署平台的环境变量配置

### 4. 云函数调用失败

**问题**：部署后无法调用云函数

**解决**：

- 检查云开发环境 ID 是否正确
- 确认匿名登录是否成功
- 检查网络请求是否被 CORS 阻止

---

## 📊 成本对比

### 腾讯云静态网站托管

- **存储费用**：0.004 元/GB/天
- **流量费用**：0.18 元/GB（国内）
- **请求费用**：0.01 元/万次
- **预估月成本**：50-200 元（中小型项目）

### 腾讯云 COS + CDN

- **存储费用**：0.118 元/GB/月
- **CDN 流量**：0.15 元/GB 起
- **预估月成本**：100-500 元

### 传统服务器

- **服务器费用**：100-500 元/月
- **带宽费用**：按需计费
- **预估月成本**：200-1000 元

---

## 🎯 最终推荐

**对于您的项目，强烈推荐使用「腾讯云静态网站托管」**，原因：

1. ✅ **无缝集成**：与现有腾讯云开发环境完美配合
2. ✅ **成本最低**：适合中小型管理后台
3. ✅ **部署简单**：一条命令完成部署
4. ✅ **自动 CDN**：无需额外配置
5. ✅ **管理方便**：统一控制台管理

---

## 📚 相关文档

- [腾讯云静态网站托管文档](https://cloud.tencent.com/document/product/876/40270)
- [CloudBase CLI 文档](https://cloud.tencent.com/document/product/876/41339)
- [Vite 部署指南](https://cn.vitejs.dev/guide/static-deploy.html)

---

## 💡 下一步

1. 按照「推荐方案」完成首次部署
2. 配置自定义域名（如需要）
3. 设置 CI/CD 自动化部署
4. 配置监控和告警

如有问题，请参考项目文档或联系开发团队。

