# message-manage 云函数

## 功能说明

消息管理云函数，负责消息的 CRUD 操作。

## 接口说明

### createMessage - 创建消息

**参数：**

```javascript
{
  title: String,              // 消息标题（必填）
  content: String,            // 消息内容（必填）
  type: String,              // 消息类型：business/system（默认：system）
  priority: String,           // 优先级：urgent/important/normal（默认：normal）
  sendType: String,          // 发送方式：immediate/scheduled（默认：immediate）
  scheduledTime: Date,       // 定时发送时间（可选）
  targetType: String,        // 目标类型：all/specific/role（默认：all）
  targetUsers: [String],    // 目标用户ID数组（可选）
  targetRoles: [String],     // 目标角色数组（可选）
  link: String,              // 跳转链接（可选）
  relatedEntityId: String,   // 关联实体ID（可选）
  relatedEntityType: String // 关联实体类型（可选）
}
```

**返回：**

```javascript
{
  code: 0,
  message: '消息创建成功',
  data: {
    messageId: String
  }
}
```

### getUserMessages - 获取用户消息列表

**参数：**

```javascript
{
  userId: String,    // 用户ID（可选，默认使用当前用户）
  status: String,    // 状态筛选：sent/read（可选）
  page: Number,      // 页码（默认：1）
  pageSize: Number   // 每页数量（默认：20）
}
```

**返回：**

```javascript
{
  code: 0,
  message: '获取成功',
  data: {
    messages: Array,
    total: Number,
    page: Number,
    pageSize: Number
  }
}
```

### markAsRead - 标记消息为已读

**参数：**

```javascript
{
  userMessageId: String,  // 用户消息ID（可选）
  messageId: String,      // 消息ID（可选，与userMessageId二选一）
  userId: String          // 用户ID（可选，默认使用当前用户）
}
```

### sendMessage - 发送消息

**参数：**

```javascript
{
  messageId: String; // 消息ID（必填）
}
```

### getMessage - 获取消息详情

**参数：**

```javascript
{
  messageId: String; // 消息ID（必填）
}
```

## 部署方法

```bash
cd cloudfunctions/message-manage
npm install
tcb fn deploy message-manage --env your-env-id
```

## 调用示例

```javascript
// 创建消息
const result = await cloud.callFunction({
  name: "message-manage",
  data: {
    action: "createMessage",
    data: {
      title: "系统通知",
      content: "这是一条测试消息",
      type: "system",
      priority: "normal",
      targetType: "all",
    },
  },
});

// 获取用户消息
const messages = await cloud.callFunction({
  name: "message-manage",
  data: {
    action: "getUserMessages",
    data: {
      userId: "user123",
      status: "sent",
      page: 1,
      pageSize: 20,
    },
  },
});
```
