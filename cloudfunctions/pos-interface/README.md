# 收银系统接口云函数

## 功能概述

收银系统接口云函数用于实现气候餐厅平台与收银系统之间的数据对接，支持菜单数据推送和订单数据同步。

## 主要功能

1. **菜单数据推送**: 将气候餐厅平台的菜单数据（含碳足迹信息）推送到收银系统
2. **订单数据同步**: 接收收银系统的订单数据，计算碳足迹后返回结果
3. **批量订单同步**: 支持批量订单数据同步
4. **Webhook 回调**: 支持事件通知机制

## 目录结构

```
pos-interface/
├── index.js                 # 主入口文件
├── auth.js                  # 认证模块
├── menu-sync.js             # 菜单同步处理
├── order-sync.js            # 订单同步处理
├── webhook.js               # Webhook回调处理
├── logging.js               # 日志记录模块
├── adapters/                # 适配器目录
│   ├── index.js            # 适配器工厂
│   └── standard-adapter.js # 标准适配器
├── package.json            # 依赖配置
└── README.md               # 本文档
```

## 支持的 Actions

- `pushMenu`: 推送菜单数据到收银系统
- `syncOrder`: 同步订单数据（收银系统 → 气候餐厅平台）
- `batchSyncOrders`: 批量同步订单数据
- `handleWebhook`: 处理 Webhook 回调

## 使用方法

### 调用示例

```javascript
// 推送菜单
const result = await cloud.callFunction({
  name: 'pos-interface',
  data: {
    action: 'pushMenu',
    data: {
      restaurantId: 'rest_123456',
      syncType: 'full',
      menuItemIds: [] // 可选，指定菜单项ID列表
    }
  }
});

// 同步订单
const result = await cloud.callFunction({
  name: 'pos-interface',
  data: {
    action: 'syncOrder',
    data: {
      orderId: 'POS_ORDER_001',
      restaurantId: 'rest_123456',
      orderTime: '2025-01-15T10:30:00Z',
      items: [...],
      totalAmount: 100.00
    }
  }
});
```

## 认证机制

所有接口调用都需要通过认证，使用 API Key + HMAC-SHA256 签名的方式。

详情请参考 `auth.js` 模块和 [API 接口规范文档](../../../Docs/项目策划方案/平台数据接口/API接口规范文档.md)。

## 适配器

支持多种收银系统，通过适配器模式实现。当前已实现：

- **标准适配器**: 通用接口规范

未来可扩展：

- 客如云适配器
- 二维火适配器
- 美团收银适配器

## 数据库集合

- `pos_integrations`: 收银系统接入配置
- `pos_sync_logs`: 同步操作日志
- `restaurant_orders`: 订单数据（使用现有集合）

详情请参考 [数据库设计文档](../../../Docs/项目策划方案/平台数据接口/数据库设计文档.md)。

## 日志记录

所有操作都会记录日志到 `pos_sync_logs` 集合，包括：

- 操作类型和结果
- 请求和响应数据
- 错误信息
- 执行时长

## 错误处理

- 统一的错误响应格式
- 详细的错误日志记录
- 支持重试机制（由调用方实现）

## 部署说明

1. 安装依赖：

   ```bash
   cd cloudfunctions/pos-interface
   npm install
   ```

2. 部署云函数：

   ```bash
   tcb fn deploy pos-interface --env your-env-id
   ```

3. 配置数据库集合和索引（参考数据库设计文档）

## 相关文档

- [API 接口规范文档](../../../Docs/项目策划方案/平台数据接口/API接口规范文档.md)
- [数据库设计文档](../../../Docs/项目策划方案/平台数据接口/数据库设计文档.md)
- [集成指南](../../../Docs/项目策划方案/平台数据接口/集成指南.md)

## 版本历史

- **v1.0.0** (2025-01-15): 初始版本
