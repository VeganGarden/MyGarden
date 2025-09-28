# MyGarden 腾讯云开发项目

## 项目概述
这是一个基于腾讯云开发的AI服务项目，提供AI聊天和数据分析功能。

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 登录腾讯云开发
```bash
npm run login
```

### 3. 本地开发
```bash
npm run dev
```

### 4. 部署到云端
```bash
npm run deploy
```

## 项目结构
```
MyGarden/
├── functions/           # 云函数目录
│   └── ai-service/      # AI服务云函数
├── cloudbaserc.json     # 云开发配置文件
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## AI规则说明
- **ai-service**: 提供AI聊天和数据分析功能
- 支持自定义AI模型集成
- 可扩展其他AI服务