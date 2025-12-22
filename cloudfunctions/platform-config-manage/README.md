# 平台配置管理云函数

## 概述

统一的平台配置管理云函数，整合了所有平台运营相关的基础配置管理功能。

## 功能模块

### 1. 区域配置管理 (`region.*`)

管理因子区域和基准值区域配置。

**支持的操作：**

- `region.list` - 查询区域配置列表
- `region.get` - 获取单个区域配置详情
- `region.create` - 创建区域配置
- `region.update` - 更新区域配置
- `region.archive` - 归档区域配置
- `region.activate` - 激活区域配置

**调用示例：**

```javascript
// 查询列表
wx.cloud.callFunction({
  name: "platform-config-manage",
  data: {
    action: "region.list",
    configType: "factor_region",
    page: 1,
    pageSize: 20,
  },
});

// 创建区域配置
wx.cloud.callFunction({
  name: "platform-config-manage",
  data: {
    action: "region.create",
    region: {
      configType: "factor_region",
      code: "CN",
      name: "中国",
      nameEn: "China",
    },
  },
});
```

### 2. 计算参数配置管理 (`calculation.*`)

管理碳足迹计算相关的默认参数配置。

**支持的操作：**

- `calculation.list` - 查询配置列表
- `calculation.get` - 获取单个配置详情
- `calculation.update` - 更新单个配置
- `calculation.batchUpdate` - 批量更新配置
- `calculation.getGroups` - 获取所有配置分组

**调用示例：**

```javascript
// 查询配置列表
wx.cloud.callFunction({
  name: "platform-config-manage",
  data: {
    action: "calculation.list",
    configType: "waste_rate",
  },
});

// 更新配置
wx.cloud.callFunction({
  name: "platform-config-manage",
  data: {
    action: "calculation.update",
    id: "config_id",
    value: 0.25,
    description: "更新后的描述",
  },
});
```

## 权限要求

- **查询操作**：允许匿名访问（部分查询）或需要 `platform_operator` / `system_admin` 角色
- **更新操作**：需要 `operation:manage` 权限，且角色必须是 `platform_operator` 或 `system_admin`

## 目录结构

```
platform-config-manage/
├── index.js                          # 主入口，路由分发
├── handlers/
│   ├── region-config.js              # 区域配置处理
│   └── calculation-config.js         # 计算参数配置处理
├── utils/
│   ├── permission.js                 # 权限检查工具
│   └── error-handler.js              # 错误处理工具
├── package.json
└── README.md
```

## 迁移说明

### 从旧云函数迁移

#### 区域配置管理

**旧调用方式：**

```javascript
callCloudFunction("region-config-manage", {
  action: "list",
  configType: "factor_region",
});
```

**新调用方式：**

```javascript
callCloudFunction("platform-config-manage", {
  action: "region.list",
  configType: "factor_region",
});
```

#### 计算参数配置管理

**旧调用方式：**

```javascript
callCloudFunction("carbon-calculation-config-manage", {
  action: "list",
  configType: "waste_rate",
});
```

**新调用方式：**

```javascript
callCloudFunction("platform-config-manage", {
  action: "calculation.list",
  configType: "waste_rate",
});
```

### 迁移说明

本云函数整合了以下已废弃云函数的功能：

- ✅ `region-config-manage` - 区域配置管理（已完全迁移）
- ✅ `carbon-calculation-config-manage` - 碳计算配置管理（已完全迁移）

> **注意**：旧云函数已删除，所有功能已迁移到 `platform-config-manage`。

## 未来扩展

可以轻松添加新的配置类型：

1. 在 `handlers/` 目录下创建新的 handler 文件
2. 在 `index.js` 中添加新的路由分支
3. 前端调用时使用新的 action 格式：`{type}.{operation}`

例如，添加系统配置管理：

```javascript
// handlers/system-config.js
module.exports = {
  handleSystemConfig
};

// index.js
case 'system':
  return await handleSystemConfig(newEvent, context);
```

## 部署

```bash
# 部署云函数
tcb fn deploy platform-config-manage --force
```

## 测试

```bash
# 测试区域配置查询
tcb fn invoke platform-config-manage --params '{"action":"region.list","configType":"factor_region"}'

# 测试计算参数配置查询
tcb fn invoke platform-config-manage --params '{"action":"calculation.getGroups"}'
```
