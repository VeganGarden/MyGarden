# 气候餐厅管理后台 - Web版

基于 React + Ant Design + TypeScript 开发的气候餐厅管理后台系统。

## 技术栈

- **框架**: React 18.x + TypeScript
- **UI组件库**: Ant Design 5.x
- **状态管理**: Redux Toolkit
- **路由**: React Router 6.x
- **构建工具**: Vite 5.x
- **图表库**: ECharts + Ant Design Charts

## 项目结构

```
admin-web/
├── src/
│   ├── pages/           # 页面组件
│   │   ├── Login.tsx    # 登录页
│   │   ├── Dashboard.tsx # 数据看板
│   │   └── recipe/      # 菜谱管理
│   ├── components/      # 通用组件
│   ├── layouts/         # 布局组件
│   ├── store/           # Redux状态管理
│   │   ├── slices/      # Redux切片
│   │   └── index.ts     # Store配置
│   ├── services/        # API服务
│   ├── utils/           # 工具函数
│   └── types/           # TypeScript类型定义
├── package.json
└── vite.config.ts
```

## 快速开始

### 1. 安装依赖

```bash
cd admin-web
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写实际配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
VITE_CLOUDBASE_ENVID=my-garden-app-env-4e0h762923be2f
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_API_BASE_URL=https://my-garden-app-env-4e0h762923be2f.ap-shanghai.app.tcloudbase.com
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
```

## 功能模块

### 已实现功能

- ✅ 用户登录（模拟登录）
- ✅ 数据看板（基础框架）
- ✅ 菜谱管理
  - ✅ 菜谱列表（搜索、分页）
  - ✅ 创建菜谱
  - ✅ 编辑菜谱
  - ✅ 删除菜谱
  - ✅ 碳足迹计算
  - ✅ 碳标签显示

### 待开发功能

- ⏳ 认证管理模块
- ⏳ 订单管理模块
- ⏳ 溯源管理模块
- ⏳ 数据报表模块
- ⏳ 权限管理
- ⏳ 真实的用户认证系统

## 云函数调用

### 重要说明

Web后台需要通过HTTP方式调用云函数，有两种方案：

#### 方案A：配置HTTP触发器（推荐）

1. 在腾讯云开发控制台为每个云函数开启HTTP触发器
2. 获取HTTP触发器URL
3. 配置 `VITE_API_BASE_URL` 环境变量

#### 方案B：使用腾讯云开发Web SDK

```bash
npm install @cloudbase/js-sdk
```

然后在 `src/services/cloudbase.ts` 中使用Web SDK调用云函数。

## 开发注意事项

1. **认证系统**: 当前使用模拟登录，需要实现真实的认证系统
2. **云函数调用**: 需要配置HTTP触发器或使用Web SDK
3. **权限控制**: 需要实现基于角色的权限控制
4. **数据验证**: 需要完善前后端数据验证

## 与小程序的关系

- Web后台和小程序共享同一套云函数和数据库
- 通过 `tenantId` 实现多租户数据隔离
- Web后台提供完整的管理功能，小程序提供移动端查看功能

## License

MIT

