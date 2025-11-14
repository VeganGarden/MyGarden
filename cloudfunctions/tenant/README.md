# 租户和餐厅管理云函数

## 功能说明

此云函数用于管理租户和餐厅数据，支持：

- 租户信息管理
- 餐厅信息管理
- 根据 restaurantId 获取餐厅相关数据（菜单、订单、菜谱、碳足迹等）

## 初始化数据

### 方法 1：添加"小苹果"租户（推荐）

在云开发控制台执行以下操作：

1. 部署 `tenant` 云函数
2. 在云函数测试中调用：

```json
{
  "action": "addXiaopingguo"
}
```

这将创建：

- 租户：`tenant_xiaopingguo`（小苹果）
- 餐厅 1：`restaurant_sukuaixin`（素开心 - 金牌认证）
- 餐厅 2：`restaurant_suhuanle`（素欢乐 - 银牌认证）

**详细执行指南**：请查看 `添加小苹果租户-执行指南.md`

### 方法 2：通过云函数调用初始化（通用）

在云开发控制台执行以下操作：

1. 部署 `tenant` 云函数
2. 在云函数测试中调用：

```json
{
  "action": "init"
}
```

### 方法 2：使用初始化脚本

运行 `init-tenant-data.js` 脚本：

```bash
cd cloudfunctions/tenant
node init-tenant-data.js
```

### 方法 4：手动创建数据

在云开发控制台的数据库中，手动创建以下集合和数据：

#### 1. 创建 `tenants` 集合

```json
{
  "_id": "tenant_xiaopingguo",
  "name": "小苹果",
  "contactName": "小苹果",
  "contactPhone": "13800138000",
  "contactEmail": "xiaopingguo@example.com",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. 创建 `restaurants` 集合

**餐厅 1：素开心**

```json
{
  "_id": "restaurant_sukuaixin",
  "tenantId": "tenant_xiaopingguo",
  "name": "素开心",
  "address": "上海市虹桥区XX路123号",
  "phone": "021-12345678",
  "email": "sukuaixin@example.com",
  "status": "active",
  "certificationLevel": "gold",
  "certificationStatus": "certified",
  "createdAt": "2024-01-15T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

**餐厅 2：素欢乐**

```json
{
  "_id": "restaurant_suhuanle",
  "tenantId": "tenant_xiaopingguo",
  "name": "素欢乐",
  "address": "上海市浦东新区XX街456号",
  "phone": "021-87654321",
  "email": "suhuanle@example.com",
  "status": "active",
  "certificationLevel": "silver",
  "certificationStatus": "certified",
  "createdAt": "2024-02-20T00:00:00.000Z",
  "updatedAt": "2024-02-20T00:00:00.000Z"
}
```

## API 使用说明

### 1. 获取租户信息

```javascript
{
  "action": "getTenant",
  "data": {
    "tenantId": "tenant_xiaopingguo"
  }
}
```

### 2. 获取餐厅列表

```javascript
{
  "action": "getRestaurants",
  "data": {
    "tenantId": "tenant_xiaopingguo",
    "restaurantId": "restaurant_sukuaixin" // 可选，获取特定餐厅
  }
}
```

### 3. 根据 restaurantId 获取数据

```javascript
{
  "action": "getRestaurantData",
  "data": {
    "restaurantId": "restaurant_sukuaixin",
    "dataType": "menu", // menu | order | recipe | carbon | all
    "page": 1,
    "pageSize": 20
  }
}
```

## 数据库集合

### tenants 集合

| 字段         | 类型   | 说明                  |
| ------------ | ------ | --------------------- |
| \_id         | String | 租户 ID               |
| name         | String | 租户名称              |
| contactName  | String | 联系人姓名            |
| contactPhone | String | 联系电话              |
| contactEmail | String | 联系邮箱              |
| status       | String | 状态：active/inactive |
| createdAt    | Date   | 创建时间              |
| updatedAt    | Date   | 更新时间              |

### restaurants 集合

| 字段                | 类型   | 说明                                      |
| ------------------- | ------ | ----------------------------------------- |
| \_id                | String | 餐厅 ID                                   |
| tenantId            | String | 所属租户 ID                               |
| name                | String | 餐厅名称                                  |
| address             | String | 餐厅地址                                  |
| phone               | String | 联系电话                                  |
| email               | String | 联系邮箱                                  |
| status              | String | 状态：active/inactive/pending             |
| certificationLevel  | String | 认证等级：bronze/silver/gold/platinum     |
| certificationStatus | String | 认证状态：none/applying/certified/expired |
| createdAt           | Date   | 创建时间                                  |
| updatedAt           | Date   | 更新时间                                  |

## 注意事项

1. 确保在云开发控制台中创建了 `tenants` 和 `restaurants` 集合
2. 建议为这些集合创建索引以提高查询性能
3. 初始化数据后，前端应用即可正常使用租户和餐厅功能
