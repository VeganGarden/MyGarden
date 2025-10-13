# 数据库初始化云函数

## ⚠️ 重要更新（v1.1）

**修复说明**: 腾讯云开发的 MongoDB 不支持通过代码创建索引，因此：

- ✅ 云函数只创建 12 个集合
- ❌ 索引需要在控制台手动创建（共 28 个）
- 📖 请参考 [数据库索引创建手册.md](../../Docs/数据库索引创建手册.md)

## 功能说明

这个云函数用于初始化"我的花园"项目的数据库，创建 12 个核心集合。

## 集合列表

| 序号     | 集合名           | 说明       | 索引数        |
| -------- | ---------------- | ---------- | ------------- |
| 1        | users            | 用户主表   | 3             |
| 2        | user_sessions    | 会话表     | 3             |
| 3        | meals            | 餐食记录表 | 4             |
| 4        | daily_stats      | 每日统计表 | 3             |
| 5        | gardens          | 花园表     | 1             |
| 6        | ingredients      | 食材库     | 3             |
| 7        | recipes          | 食谱库     | 2             |
| 8        | sync_tasks       | 同步任务表 | 4             |
| 9        | platform_configs | 平台配置表 | 1             |
| 10       | friends          | 好友关系表 | 2             |
| 11       | posts            | 动态表     | 2             |
| 12       | orders           | 订单表     | 2             |
| **总计** | **12 个集合**    |            | **28 个索引** |

## 使用方法

### 方法 1: 云开发控制台部署

1. 部署云函数到腾讯云：

```bash
cd cloudfunctions/database
tcb fn deploy database --env your-env-id
```

2. 在云开发控制台调用：
   - 打开腾讯云开发控制台
   - 进入云函数管理
   - 找到`database`函数
   - 点击"测试"，输入空对象 `{}`
   - 点击"运行测试"

### 方法 2: 命令行直接调用

```bash
# 安装依赖
npm install

# 调用云函数
tcb fn invoke database -e your-env-id
```

### 方法 3: 使用小程序端调用

```javascript
// 在小程序中调用
wx.cloud
  .callFunction({
    name: "database",
    data: {},
  })
  .then((res) => {
    console.log("数据库初始化结果:", res.result);
  })
  .catch((err) => {
    console.error("初始化失败:", err);
  });
```

## 返回格式

### 成功响应

```json
{
  "code": 0,
  "message": "数据库初始化成功",
  "summary": {
    "totalCollections": 12,
    "totalIndexes": 28,
    "collections": [
      { "collection": "users", "status": "success" },
      { "collection": "user_sessions", "status": "success" },
      ...
    ]
  }
}
```

### 失败响应

```json
{
  "code": 500,
  "message": "数据库初始化失败",
  "error": "错误详情",
  "results": [...]
}
```

## 注意事项

1. **幂等性**: 脚本可以重复执行，如果集合已存在会自动跳过
2. **索引冲突**: 如果索引已存在，可能会报错但不影响其他索引创建
3. **权限要求**: 需要数据库管理权限
4. **执行时间**: 首次执行约需要 10-30 秒
5. **数据保护**: 不会删除已存在的数据

## 索引详情

### 高频查询索引（重点优化）

- `meals.userId_mealDate_index`: 个人餐食记录查询（最高频）
- `users.openId_unique`: 用户登录查询
- `gardens.userId_unique`: 个人花园查询

### 防重复索引

- `meals.userId_source_orderId_unique`: 防止第三方订单重复同步
- `sync_tasks.platform_orderId_unique`: 防止同步任务重复
- `friends.userId_friendId_unique`: 防止好友关系重复

### TTL 自动清理索引

- `user_sessions.expiresAt_ttl`: 自动清理过期会话
- `sync_tasks.createdAt_ttl`: 30 天后自动清理同步任务

## 故障排查

### 问题 1: 集合已存在错误

**原因**: 集合之前已经创建过
**解决**: 正常情况，脚本会自动跳过并继续创建索引

### 问题 2: 索引创建失败

**原因**: 可能数据格式不符合索引要求
**解决**:

1. 检查现有数据是否符合索引约束
2. 手动删除冲突数据或索引
3. 重新运行脚本

### 问题 3: 权限不足

**原因**: 云函数没有数据库管理权限
**解决**: 在云开发控制台检查函数权限配置

## 验证方法

### 1. 检查集合是否创建成功

```javascript
// 在云函数或小程序中执行
const db = cloud.database();
const collections = await db.listCollections();
console.log("已创建的集合:", collections);
```

### 2. 检查索引是否创建成功

```javascript
// 在MongoDB shell或云开发控制台执行
db.users.getIndexes();
db.meals.getIndexes();
// ... 检查其他集合
```

### 3. 测试查询性能

```javascript
// 测试高频查询
const startTime = Date.now();
const meals = await db
  .collection("meals")
  .where({ userId: "test-user-id" })
  .orderBy("mealDate", "desc")
  .limit(10)
  .get();
const duration = Date.now() - startTime;
console.log("查询耗时:", duration, "ms"); // 应该 <50ms
```

## 下一步

数据库初始化完成后，您可以：

1. ✅ 部署其他云函数（login, user, garden, carbon 等）
2. ✅ 导入初始食材数据到 ingredients 集合
3. ✅ 配置第三方平台映射（platform_configs）
4. ✅ 开始前端开发和测试

## 相关文档

- [数据库架构设计文档](../../Docs/数据库架构设计文档-简化版.md)
- [腾讯云开发环境配置指南](../../Docs/腾讯云开发环境配置指南.md)

## 维护记录

- **v1.0.0** (2025-01-11): 初始版本，12 个集合，28 个索引
